// Memory Index Compiler — Vercel Next.js route (Node runtime, Fluid Compute).
//
// Invoked by the Postgres trigger `tg_thoughts_fire_memory_index` (via pg_net)
// on every SESSION CLOSE capture, and invokable directly with a service-role
// JWT OR X-Compile-Secret for testing.
//
// Design notes / hard rules:
//  - Fresh-context agent: the only inputs are the bundled Editorial Policy,
//    the raw `public.thoughts` table, and `memory_index_pages` metadata.
//    body_markdown is NEVER read back from memory_index_pages (R10).
//  - Concurrency: lease-row lock (not pg_try_advisory_lock) because PostgREST
//    borrows a pooled session per request and advisory locks would not
//    survive predictably across separate RPC calls.
//  - Audit ledger: one row per compile pass (UNIQUE on compile_id). Insert
//    once at pass start → UPDATE by compile_id thereafter.
//  - Coalesced skips: an in-process while-loop consumes the pending flag
//    after each pass and runs another pass under the same lock if set.
//  - The Anthropic call is bracketed by refresh_compile_lock() heartbeats.
//
// Ported from the Supabase Edge Function (supabase/functions/memory-index-compiler/)
// which was retired because its undocumented ~2min wall-clock cap could not
// accommodate a full Sonnet Memory Index compile. Vercel Fluid Compute gives
// us 300s, so MAX_OUTPUT_TOKENS is raised back to 16K per the original plan.

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { timingSafeEqual as nodeTimingSafeEqual, randomUUID } from 'node:crypto'
import { EDITORIAL_POLICY, POLICY_HASH } from './policy'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

// ---------- config / env ----------

const SUPABASE_URL      = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!
const COMPILE_SECRET    = process.env.MEMORY_INDEX_COMPILE_SECRET ?? ''

const MODEL                 = 'claude-sonnet-4-6'
// Measured Sonnet 4.6 output rate in this project: ~44 tok/s. Vercel Pro
// caps serverless functions at 300s (maxDuration below). 12K output tokens
// → ~272s generation time, leaving ~28s headroom for validation + the
// compile_memory_index_pages RPC write + lock release. 16K was the original
// target but blows the cap (~360s). Raise only after a platform move.
const MAX_OUTPUT_TOKENS     = 12_000
const CAPTURE_LIMIT_N       = 2_000
const INPUT_TOKEN_LIMIT_M   = 180_000
const LOCK_TTL_SECONDS      = 600 // ≈ 2× the Anthropic timeout
// Anthropic fetch timeout is deliberately shorter than Vercel's maxDuration
// so a genuine Anthropic hang surfaces as an HTTP error we can audit, not a
// silent function kill. 280s = 300s Vercel cap − 20s buffer for post-call work.
const ANTHROPIC_TIMEOUT_MS  = 280_000
const MAX_REPLAY_PASSES     = 10
// PostgREST enforces a project-wide 1000-row cap even with explicit .range();
// we pull the newest 1000 captures and drop untagged/out-of-window client-side.
// When the corpus grows past that cap we will switch to a SECURITY DEFINER RPC
// that returns the full tagged corpus server-side (bypassing PostgREST's cap).
const THOUGHTS_FETCH_CAP    = 1_000

// Optional recency window on top of the tag filter. Controlled by env var
// MEMORY_INDEX_COMPILE_WINDOW_DAYS. Unset or 0 → no recency filter (all
// tagged captures). Set to e.g. "7" → keep only tagged captures from the
// last 7 days. Recency is a pilot tuning knob because Sonnet has a 200K
// input ceiling; the Editorial Policy §6.5 explicitly reserves the right
// to add windowing when corpus size demands it.
const COMPILE_WINDOW_DAYS = (() => {
  const raw = process.env.MEMORY_INDEX_COMPILE_WINDOW_DAYS
  if (!raw) return 0
  const n = Number.parseInt(raw, 10)
  return Number.isFinite(n) && n > 0 ? n : 0
})()

// The Editorial Policy's page triggers all key off tagged capture prefixes
// (SESSION CLOSE, DECISION, CLAUDE LESSON, etc.). Untagged captures are raw
// session chatter — noise for the compiler's purposes. Filter them out so
// the token budget is spent on content the compiler actually synthesizes.
const CAPTURE_TAG_RE = new RegExp(
  '^\\s*(SESSION CLOSE|ACTIVE TASK|DECISION|MILESTONE|' +
  'CLAUDE LESSON|CLAUDE PATTERN|CLAUDE DRIFT|CLAUDE HEURISTIC|' +
  'CLAUDE ANTI-PATTERN|CLAUDE ABOUT LOUIS|PERSON NOTE|RULE REVISION|' +
  'TOOL AWARENESS|FILE SHIPPED|CO-WORK PROMPT)',
  'i',
)

const ANTHROPIC_URL        = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_COUNT_URL  = 'https://api.anthropic.com/v1/messages/count_tokens'
const ANTHROPIC_VERSION    = '2023-06-01'
const ANTHROPIC_COUNT_BETA = 'token-counting-2024-11-01'

const VALID_PAGE_TYPES = new Set([
  'project', 'person', 'decision', 'rule', 'concept', 'open_question', 'index',
])
const VALID_STATUSES = new Set([
  'current', 'potentially_stale', 'parked', 'historical',
])
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// ---------- helpers ----------

function timingSafeEqual(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false
  const ab = Buffer.from(a, 'utf8')
  const bb = Buffer.from(b, 'utf8')
  if (ab.length !== bb.length) return false
  return nodeTimingSafeEqual(ab, bb)
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

interface RequestBody {
  source_thought_id?: string | null
  validate_only?: boolean
  dry_run?: boolean
}

interface ThoughtRow {
  id: string
  content: string
  created_at: string | null
  metadata: unknown
}

interface PageMetaRow {
  slug: string
  title: string
  page_type: string
  status: string
  last_compiled_at: string | null
  last_capture_seen_at: string | null
  connected_page_slugs: string[] | null
  source_capture_ids: string[] | null
}

interface CompiledPage {
  page_type: string
  slug: string
  title: string
  body_markdown: string
  source_capture_ids: string[]
  connected_page_slugs: string[]
  status: string
  last_capture_seen_at?: string | null
}

// ---------- handler ----------

export async function POST(req: Request): Promise<Response> {
  // Auth gate: accept EITHER a service-role Bearer JWT OR a valid X-Compile-Secret.
  const authHeader = req.headers.get('authorization') ?? ''
  const bearer = authHeader.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7).trim()
    : ''
  const compileHeader = req.headers.get('x-compile-secret') ?? ''
  const serviceRoleOk = bearer.length > 0 && bearer === SERVICE_ROLE_KEY
  const compileSecretOk =
    COMPILE_SECRET.length > 0 &&
    compileHeader.length > 0 &&
    timingSafeEqual(compileHeader, COMPILE_SECRET)
  if (!serviceRoleOk && !compileSecretOk) {
    return json(401, { error: 'unauthorized' })
  }

  // Parse body.
  let body: RequestBody = {}
  try {
    if (req.headers.get('content-length') !== '0') {
      const text = await req.text()
      if (text.length > 0) body = JSON.parse(text) as RequestBody
    }
  } catch (e) {
    return json(400, { error: 'invalid_json', detail: String(e) })
  }
  const sourceThoughtId = body.source_thought_id ?? null
  const validateOnly = body.validate_only === true
  const dryRun = body.dry_run === true

  const supa: SupabaseClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const invocationId =
    `compile-${new Date().toISOString()}-${randomUUID().slice(0, 8)}`

  // --- Acquire the lease lock (held across all replay passes in this invocation).
  const { data: acquired, error: lockErr } = await supa.rpc(
    'try_acquire_compile_lock',
    { p_compile_id: invocationId, p_ttl_seconds: LOCK_TTL_SECONDS },
  )
  if (lockErr) {
    await supa.from('memory_index_compile_runs').insert({
      compile_id: invocationId,
      source_thought_id: sourceThoughtId,
      triggered_at: new Date().toISOString(),
      started_at: new Date().toISOString(),
      finished_at: new Date().toISOString(),
      status: 'failed',
      error_message: `lock_acquire_failed: ${lockErr.message}`,
      model: MODEL,
      policy_hash: POLICY_HASH,
      dry_run: dryRun,
      validate_only: validateOnly,
    })
    return json(500, { error: 'lock_acquire_failed', detail: lockErr.message })
  }
  if (!acquired) {
    await supa.rpc('mark_compile_pending')
    await supa.from('memory_index_compile_runs').insert({
      compile_id: invocationId,
      source_thought_id: sourceThoughtId,
      triggered_at: new Date().toISOString(),
      started_at: new Date().toISOString(),
      finished_at: new Date().toISOString(),
      status: 'skipped',
      error_message: 'concurrent_compile — pending flag set, will be replayed in-process',
      model: MODEL,
      policy_hash: POLICY_HASH,
      dry_run: dryRun,
      validate_only: validateOnly,
    })
    return json(200, { status: 'skipped', reason: 'concurrent_compile' })
  }

  // Wraps the full compile sequence (first pass + replay loop) plus an
  // unhandled-exception guard plus lock release. Used below either
  // synchronously (validate_only) or as a background task (dry_run / real).
  const runAllPasses = async (): Promise<Array<Record<string, unknown>>> => {
    const passSummaries: Array<Record<string, unknown>> = []
    try {
      let currentCompileId = invocationId
      let passCount = 1
      let passResult = await runCompilePass({
        supa,
        invocationId,
        currentCompileId,
        sourceThoughtId,
        validateOnly,
        dryRun,
      })
      passSummaries.push(passResult)

      // Replay loop: each iteration consumes the pending flag; if true, run
      // another pass under the same lock. No network hop, no race window.
      while (true) {
        const { data: hadPending, error: pendingErr } = await supa.rpc(
          'consume_compile_pending',
        )
        if (pendingErr) {
          console.error('consume_compile_pending failed', pendingErr)
          break
        }
        if (!hadPending) break

        passCount += 1
        if (passCount > MAX_REPLAY_PASSES) {
          console.warn('replay cap reached', { passCount })
          await supa.rpc('mark_compile_pending')
          break
        }
        currentCompileId = `${invocationId}-replay-${passCount}`
        passResult = await runCompilePass({
          supa,
          invocationId,
          currentCompileId,
          sourceThoughtId: null,
          validateOnly,
          dryRun,
        })
        passSummaries.push(passResult)
      }
    } catch (err) {
      console.error('unhandled exception in compile invocation', err)
      try {
        await supa.from('memory_index_compile_runs').upsert({
          compile_id: `${invocationId}-unhandled`,
          source_thought_id: sourceThoughtId,
          triggered_at: new Date().toISOString(),
          started_at: new Date().toISOString(),
          finished_at: new Date().toISOString(),
          status: 'failed',
          error_message: `unhandled_exception: ${String(err)}`,
          model: MODEL,
          policy_hash: POLICY_HASH,
          dry_run: dryRun,
          validate_only: validateOnly,
        }, { onConflict: 'compile_id' })
      } catch (auditErr) {
        console.error('audit write for unhandled exception failed', auditErr)
      }
    } finally {
      await supa.rpc('release_compile_lock', { p_compile_id: invocationId })
    }
    return passSummaries
  }

  // validate_only is fast (count_tokens only, ~1-3s). Run inline and return
  // full results as a plain JSON response.
  if (validateOnly) {
    const passes = await runAllPasses()
    return json(200, {
      status: 'ok',
      mode: 'validate_only',
      invocation_id: invocationId,
      passes,
    })
  }

  // dry_run and real compiles call Anthropic /v1/messages, which routinely
  // runs 30-180s. Streaming NDJSON solves two problems: keeps the client
  // connection alive past intermediate proxies that enforce idle timeouts,
  // and lets the client observe progress. 25-second heartbeat lines keep
  // the connection active.
  const { readable, writable } = new TransformStream<Uint8Array>()
  const writer = writable.getWriter()
  const enc = new TextEncoder()
  const writeLine = (obj: unknown) =>
    writer.write(enc.encode(JSON.stringify(obj) + '\n')).catch((e) =>
      console.error('stream write failed', e)
    )

  const response = new Response(readable, {
    status: 200,
    headers: {
      'content-type': 'application/x-ndjson',
      'cache-control': 'no-store',
      'x-invocation-id': invocationId,
    },
  })

  // Launch the compile + streaming in parallel with returning the response.
  // The stream stays open until writer.close(), which only happens after
  // runAllPasses resolves (or throws). maxDuration=300 keeps the function
  // resident for the full compile.
  void (async () => {
    await writeLine({
      kind: 'accepted',
      invocation_id: invocationId,
      mode: dryRun ? 'dry_run' : 'compile',
    })

    const heartbeat = setInterval(() => {
      void writeLine({ kind: 'heartbeat', t: new Date().toISOString() })
    }, 25_000)

    try {
      const passes = await runAllPasses()
      clearInterval(heartbeat)
      await writeLine({ kind: 'result', invocation_id: invocationId, passes })
    } catch (err) {
      clearInterval(heartbeat)
      await writeLine({ kind: 'error', invocation_id: invocationId, error: String(err) })
    } finally {
      clearInterval(heartbeat)
      try { await writer.close() } catch { /* already closed */ }
    }
  })()

  return response
}

// ---------- one compile pass ----------

async function runCompilePass(args: {
  supa: SupabaseClient
  invocationId: string
  currentCompileId: string
  sourceThoughtId: string | null
  validateOnly: boolean
  dryRun: boolean
}) {
  const {
    supa, invocationId, currentCompileId, sourceThoughtId, validateOnly, dryRun,
  } = args

  const startedAt = new Date().toISOString()

  // Begin pass audit row.
  const { error: insErr } = await supa.from('memory_index_compile_runs').insert({
    compile_id: currentCompileId,
    source_thought_id: sourceThoughtId,
    triggered_at: startedAt,
    started_at: startedAt,
    status: 'started',
    model: MODEL,
    policy_hash: POLICY_HASH,
    dry_run: dryRun,
    validate_only: validateOnly,
  })
  if (insErr) {
    console.error('begin pass audit insert failed', insErr)
  }

  const updateAudit = async (fields: Record<string, unknown>) => {
    const { error } = await supa
      .from('memory_index_compile_runs')
      .update(fields)
      .eq('compile_id', currentCompileId)
    if (error) console.error('audit update failed', error, fields)
  }

  // --- Load corpus.
  // Fetch newest-first so we keep the most relevant captures even when the
  // PostgREST 1000-row cap truncates the tail. Then apply the tag filter and
  // optional recency window client-side, then reverse to oldest-first so the
  // model reads chronologically.
  let fetchQuery = supa
    .from('thoughts')
    .select('id, content, created_at, metadata')
    .order('created_at', { ascending: false })
    .range(0, THOUGHTS_FETCH_CAP - 1)

  if (COMPILE_WINDOW_DAYS > 0) {
    const sinceIso = new Date(
      Date.now() - COMPILE_WINDOW_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString()
    fetchQuery = fetchQuery.gte('created_at', sinceIso)
  }

  const { data: thoughtsData, error: thoughtsErr } = await fetchQuery
  if (thoughtsErr) {
    await updateAudit({
      status: 'failed',
      error_message: `thoughts_read_failed: ${thoughtsErr.message}`,
      finished_at: new Date().toISOString(),
    })
    return { compile_id: currentCompileId, status: 'failed', error_message: thoughtsErr.message }
  }
  const allThoughts = (thoughtsData ?? []) as ThoughtRow[]

  // Tag filter — the Editorial Policy's page triggers all key off tagged
  // captures. Untagged rows are raw session chatter, noise for the compiler.
  const taggedDescending = allThoughts.filter((t) => CAPTURE_TAG_RE.test(t.content))
  // Reverse to ascending (oldest-first) for the LLM.
  const thoughts = taggedDescending.slice().reverse()
  const untaggedDropped = allThoughts.length - taggedDescending.length
  console.log('corpus', {
    fetched: allThoughts.length,
    tagged_kept: thoughts.length,
    untagged_dropped: untaggedDropped,
    window_days: COMPILE_WINDOW_DAYS || 'unbounded',
    fetch_cap: THOUGHTS_FETCH_CAP,
  })

  // --- Load existing page metadata (R10: body_markdown excluded).
  const { data: pagesMetaData, error: pagesMetaErr } = await supa
    .from('memory_index_pages')
    .select(
      'slug, title, page_type, status, last_compiled_at, last_capture_seen_at, connected_page_slugs, source_capture_ids',
    )
  if (pagesMetaErr) {
    await updateAudit({
      status: 'failed',
      error_message: `pages_meta_read_failed: ${pagesMetaErr.message}`,
      finished_at: new Date().toISOString(),
    })
    return { compile_id: currentCompileId, status: 'failed', error_message: pagesMetaErr.message }
  }
  const pagesMeta = (pagesMetaData ?? []) as PageMetaRow[]

  // --- Corpus guard (N).
  if (thoughts.length > CAPTURE_LIMIT_N) {
    const msg = `Corpus has N=${thoughts.length} captures (limit ${CAPTURE_LIMIT_N}). Implement windowing/summarization/incremental — see Editorial Policy §6.5.`
    await updateAudit({
      status: 'guard_tripped',
      error_message: msg,
      corpus_captures_count: thoughts.length,
      finished_at: new Date().toISOString(),
    })
    return {
      compile_id: currentCompileId,
      status: 'guard_tripped',
      error_message: msg,
      corpus_captures_count: thoughts.length,
    }
  }

  // --- Build the user message.
  const userMessage = buildUserMessage(thoughts, pagesMeta)

  // --- Token count (M guard). Authoritative if Anthropic count endpoint works;
  // conservative 4-chars-per-token fallback otherwise.
  let corpusEstimatedTokens = 0
  try {
    const countResp = await fetch(ANTHROPIC_COUNT_URL, {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': ANTHROPIC_VERSION,
        'anthropic-beta': ANTHROPIC_COUNT_BETA,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        system: EDITORIAL_POLICY,
        messages: [{ role: 'user', content: userMessage }],
      }),
    })
    if (countResp.ok) {
      const cj = await countResp.json()
      corpusEstimatedTokens = typeof cj.input_tokens === 'number' ? cj.input_tokens : 0
    } else {
      const ct = await countResp.text().catch(() => '')
      console.warn('count_tokens endpoint non-2xx', countResp.status, ct.slice(0, 200))
    }
  } catch (e) {
    console.warn('count_tokens fetch failed', e)
  }
  if (corpusEstimatedTokens === 0) {
    corpusEstimatedTokens = Math.ceil((EDITORIAL_POLICY.length + userMessage.length) / 4)
  }

  if (corpusEstimatedTokens > INPUT_TOKEN_LIMIT_M) {
    const msg = `Estimated input ${corpusEstimatedTokens} > ${INPUT_TOKEN_LIMIT_M}. See Editorial Policy §6.5.`
    await updateAudit({
      status: 'guard_tripped',
      error_message: msg,
      corpus_captures_count: thoughts.length,
      corpus_estimated_tokens: corpusEstimatedTokens,
      finished_at: new Date().toISOString(),
    })
    return {
      compile_id: currentCompileId,
      status: 'guard_tripped',
      error_message: msg,
      corpus_captures_count: thoughts.length,
      corpus_estimated_tokens: corpusEstimatedTokens,
    }
  }

  // --- validate_only short-circuit (R12).
  if (validateOnly) {
    await updateAudit({
      status: 'completed',
      corpus_captures_count: thoughts.length,
      corpus_estimated_tokens: corpusEstimatedTokens,
      finished_at: new Date().toISOString(),
    })
    return {
      compile_id: currentCompileId,
      status: 'completed',
      corpus_captures_count: thoughts.length,
      corpus_estimated_tokens: corpusEstimatedTokens,
    }
  }

  // --- Anthropic API call, bracketed by heartbeats.
  await supa.rpc('refresh_compile_lock', {
    p_compile_id: invocationId,
    p_ttl_seconds: LOCK_TTL_SECONDS,
  })

  let response: Response
  let retriedOnce = false
  while (true) {
    try {
      response = await fetch(ANTHROPIC_URL, {
        method: 'POST',
        headers: {
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': ANTHROPIC_VERSION,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: MAX_OUTPUT_TOKENS,
          system: EDITORIAL_POLICY,
          messages: [{ role: 'user', content: userMessage }],
        }),
        signal: AbortSignal.timeout(ANTHROPIC_TIMEOUT_MS),
      })
    } catch (e) {
      const msg = `anthropic_fetch_failed: ${String(e)}`
      await updateAudit({
        status: 'failed',
        error_message: msg,
        corpus_captures_count: thoughts.length,
        corpus_estimated_tokens: corpusEstimatedTokens,
        finished_at: new Date().toISOString(),
      })
      return { compile_id: currentCompileId, status: 'failed', error_message: msg }
    }

    // Retry-once logic for transient server errors and 429s.
    if (!retriedOnce && response.status === 429) {
      retriedOnce = true
      await new Promise((r) => setTimeout(r, 5_000))
      continue
    }
    if (!retriedOnce && (response.status === 500 || response.status === 502 || response.status === 503)) {
      retriedOnce = true
      await new Promise((r) => setTimeout(r, 3_000))
      continue
    }
    break
  }

  await supa.rpc('refresh_compile_lock', {
    p_compile_id: invocationId,
    p_ttl_seconds: LOCK_TTL_SECONDS,
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    const msg = `anthropic_http_${response.status}: ${body.slice(0, 500)}`
    await updateAudit({
      status: 'failed',
      error_message: msg,
      corpus_captures_count: thoughts.length,
      corpus_estimated_tokens: corpusEstimatedTokens,
      finished_at: new Date().toISOString(),
    })
    return { compile_id: currentCompileId, status: 'failed', error_message: msg }
  }

  const apiResp = await response.json()
  const usage = apiResp?.usage ?? {}
  const inputTokens = typeof usage.input_tokens === 'number' ? usage.input_tokens : null
  const outputTokens = typeof usage.output_tokens === 'number' ? usage.output_tokens : null

  if (apiResp?.stop_reason === 'max_tokens') {
    const msg = 'Output truncated — max_tokens hit. Increase MAX_OUTPUT_TOKENS or reduce corpus.'
    await updateAudit({
      status: 'failed',
      error_message: msg,
      input_tokens: inputTokens ?? undefined,
      output_tokens: outputTokens ?? undefined,
      corpus_captures_count: thoughts.length,
      corpus_estimated_tokens: corpusEstimatedTokens,
      finished_at: new Date().toISOString(),
    })
    return { compile_id: currentCompileId, status: 'failed', error_message: msg }
  }
  if (apiResp?.stop_reason === 'refusal') {
    const msg = 'Anthropic refused the request (stop_reason=refusal).'
    await updateAudit({
      status: 'failed',
      error_message: msg,
      input_tokens: inputTokens ?? undefined,
      output_tokens: outputTokens ?? undefined,
      corpus_captures_count: thoughts.length,
      corpus_estimated_tokens: corpusEstimatedTokens,
      finished_at: new Date().toISOString(),
    })
    return { compile_id: currentCompileId, status: 'failed', error_message: msg }
  }

  // Extract text blocks.
  const textBlock = Array.isArray(apiResp?.content)
    ? apiResp.content.find((c: { type?: string }) => c?.type === 'text')
    : null
  const rawText: string = textBlock?.text ?? ''

  // Parse + validate.
  const validated = validateCompiledPages(rawText, thoughts)
  if (!validated.ok) {
    await updateAudit({
      status: 'failed',
      error_message: `validation_failed: ${validated.error}`,
      input_tokens: inputTokens ?? undefined,
      output_tokens: outputTokens ?? undefined,
      corpus_captures_count: thoughts.length,
      corpus_estimated_tokens: corpusEstimatedTokens,
      finished_at: new Date().toISOString(),
    })
    return {
      compile_id: currentCompileId,
      status: 'failed',
      error_message: `validation_failed: ${validated.error}`,
    }
  }

  // Dry-run short-circuit.
  if (dryRun) {
    await updateAudit({
      status: 'completed',
      input_tokens: inputTokens ?? undefined,
      output_tokens: outputTokens ?? undefined,
      pages_written: validated.pages.length,
      corpus_captures_count: thoughts.length,
      corpus_estimated_tokens: corpusEstimatedTokens,
      finished_at: new Date().toISOString(),
    })
    return {
      compile_id: currentCompileId,
      status: 'completed',
      pages_written: validated.pages.length,
      input_tokens: inputTokens ?? undefined,
      output_tokens: outputTokens ?? undefined,
      corpus_captures_count: thoughts.length,
      corpus_estimated_tokens: corpusEstimatedTokens,
    }
  }

  // --- Atomic write via the server-side RPC (R1).
  const { data: rpcData, error: rpcErr } = await supa.rpc(
    'compile_memory_index_pages',
    { pages_json: validated.pages },
  )
  if (rpcErr) {
    await updateAudit({
      status: 'failed',
      error_message: `rpc_write_failed: ${rpcErr.message}`,
      input_tokens: inputTokens ?? undefined,
      output_tokens: outputTokens ?? undefined,
      corpus_captures_count: thoughts.length,
      corpus_estimated_tokens: corpusEstimatedTokens,
      finished_at: new Date().toISOString(),
    })
    return { compile_id: currentCompileId, status: 'failed', error_message: rpcErr.message }
  }

  const rpcRow = Array.isArray(rpcData) ? rpcData[0] : rpcData
  const pagesWritten = typeof rpcRow?.pages_written === 'number'
    ? rpcRow.pages_written
    : validated.pages.length

  await updateAudit({
    status: 'completed',
    input_tokens: inputTokens ?? undefined,
    output_tokens: outputTokens ?? undefined,
    pages_written: pagesWritten,
    corpus_captures_count: thoughts.length,
    corpus_estimated_tokens: corpusEstimatedTokens,
    finished_at: new Date().toISOString(),
  })

  return {
    compile_id: currentCompileId,
    status: 'completed',
    pages_written: pagesWritten,
    input_tokens: inputTokens ?? undefined,
    output_tokens: outputTokens ?? undefined,
    corpus_captures_count: thoughts.length,
    corpus_estimated_tokens: corpusEstimatedTokens,
  }
}

// ---------- user message construction ----------

function buildUserMessage(thoughts: ThoughtRow[], pagesMeta: PageMetaRow[]): string {
  // Pull only the metadata fields the Editorial Policy actually uses:
  // type, topics, people, action_items, dates_mentioned. Skip `source`
  // (internal plumbing) and anything else that might show up. Embedding
  // already lives in its own column and is never fetched.
  const corpus = thoughts.map((t) => {
    const m = (t.metadata ?? {}) as Record<string, unknown>
    return {
      id: t.id,
      created_at: t.created_at,
      type: m['type'] ?? null,
      topics: Array.isArray(m['topics']) ? m['topics'] : [],
      people: Array.isArray(m['people']) ? m['people'] : [],
      action_items: Array.isArray(m['action_items']) ? m['action_items'] : [],
      dates_mentioned: Array.isArray(m['dates_mentioned']) ? m['dates_mentioned'] : [],
      content: t.content,
    }
  })

  const existingPages = pagesMeta.map((p) => ({
    slug: p.slug,
    title: p.title,
    page_type: p.page_type,
    status: p.status,
    last_compiled_at: p.last_compiled_at,
    last_capture_seen_at: p.last_capture_seen_at,
    connected_page_slugs: p.connected_page_slugs ?? [],
    source_capture_ids: p.source_capture_ids ?? [],
  }))

  // Compact JSON (no indentation) — pretty-printing can inflate tokens 20%+.
  return [
    'You are compiling the Memory Index. Follow the system prompt (Editorial Policy) exactly.',
    '',
    '## CORPUS — tagged rows from public.thoughts, ascending by created_at',
    '```json',
    JSON.stringify(corpus),
    '```',
    '',
    '## EXISTING PAGE METADATA',
    '(metadata only — body_markdown is deliberately NOT included to prevent hallucination-laundering; rebuild pages from the corpus above and the Editorial Policy)',
    '```json',
    JSON.stringify(existingPages),
    '```',
    '',
    '## INSTRUCTIONS',
    'Compile all Memory Index pages per the Editorial Policy. Return ONLY a JSON array of page objects. Each object MUST have:',
    '  - page_type: one of project | person | decision | rule | concept | open_question | index',
    '  - slug: non-empty URL-safe string (lowercase, digits, underscores, hyphens)',
    '  - title: non-empty display title',
    '  - body_markdown: the full page content',
    '  - source_capture_ids: array of thought UUIDs taken from the CORPUS above (must match real ids)',
    '  - connected_page_slugs: array of slugs referenced via [[wiki-links]] in body_markdown',
    '  - status: one of current | potentially_stale | parked | historical',
    '  - last_capture_seen_at (optional): ISO timestamp of the newest capture reflected on this page',
    '',
    'Slugs MUST be unique across the array. Do NOT include any text outside the JSON array — no markdown fence, no prose, no headings.',
  ].join('\n')
}

// ---------- response validation ----------

function validateCompiledPages(
  rawText: string,
  thoughts: ThoughtRow[],
): { ok: true; pages: CompiledPage[] } | { ok: false; error: string } {
  const trimmed = rawText.trim()
  if (trimmed.length === 0) return { ok: false, error: 'empty_response' }

  // Allow a leading ```json fence just in case the model wraps the array.
  const unfenced = trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()

  let parsed: unknown
  try {
    parsed = JSON.parse(unfenced)
  } catch (e) {
    return { ok: false, error: `not_json: ${String(e).slice(0, 200)}` }
  }
  if (!Array.isArray(parsed)) return { ok: false, error: 'not_array' }

  const knownIds = new Set(thoughts.map((t) => t.id))
  const seenSlugs = new Set<string>()
  const out: CompiledPage[] = []

  for (let i = 0; i < parsed.length; i++) {
    const p = parsed[i] as Record<string, unknown> | null
    const loc = `page[${i}]`
    if (!p || typeof p !== 'object') return { ok: false, error: `${loc} not_object` }

    const pageType = p['page_type']
    if (typeof pageType !== 'string' || !VALID_PAGE_TYPES.has(pageType)) {
      return { ok: false, error: `${loc} invalid_page_type: ${String(pageType)}` }
    }
    const slug = p['slug']
    if (typeof slug !== 'string' || slug.length === 0) {
      return { ok: false, error: `${loc} invalid_slug` }
    }
    if (seenSlugs.has(slug)) return { ok: false, error: `${loc} duplicate_slug: ${slug}` }
    seenSlugs.add(slug)

    const title = p['title']
    if (typeof title !== 'string' || title.length === 0) {
      return { ok: false, error: `${loc} invalid_title` }
    }
    const bodyMarkdown = p['body_markdown']
    if (typeof bodyMarkdown !== 'string') {
      return { ok: false, error: `${loc} invalid_body_markdown` }
    }

    const rawSources = p['source_capture_ids']
    if (!Array.isArray(rawSources)) {
      return { ok: false, error: `${loc} source_capture_ids_not_array` }
    }
    const sources: string[] = []
    for (let j = 0; j < rawSources.length; j++) {
      const s = rawSources[j]
      if (typeof s !== 'string' || !UUID_RE.test(s)) {
        return { ok: false, error: `${loc} invalid_uuid_at_source[${j}]` }
      }
      if (!knownIds.has(s)) {
        console.warn(`${loc} source_capture_id ${s} not in corpus (ignored)`)
      }
      sources.push(s)
    }

    const rawConnected = p['connected_page_slugs']
    if (!Array.isArray(rawConnected)) {
      return { ok: false, error: `${loc} connected_page_slugs_not_array` }
    }
    const connected: string[] = []
    for (const c of rawConnected) {
      if (typeof c !== 'string') {
        return { ok: false, error: `${loc} connected_page_slug_not_string` }
      }
      connected.push(c)
    }

    const status = p['status']
    if (typeof status !== 'string' || !VALID_STATUSES.has(status)) {
      return { ok: false, error: `${loc} invalid_status: ${String(status)}` }
    }

    const lastSeen = p['last_capture_seen_at']
    const lastSeenOut =
      typeof lastSeen === 'string' && lastSeen.length > 0 ? lastSeen : null

    out.push({
      page_type: pageType,
      slug,
      title,
      body_markdown: bodyMarkdown,
      source_capture_ids: sources,
      connected_page_slugs: connected,
      status,
      last_capture_seen_at: lastSeenOut,
    })
  }

  return { ok: true, pages: out }
}
