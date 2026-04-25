// Memory Index Compiler — Vercel Next.js route (Node runtime, Fluid Compute).
//
// Invokable via the manual daily trigger for the 3-day cost pilot (v1.2
// Editorial Policy §0). Not yet wired to a Postgres trigger — migration
// 025 stays unattached until pilot cost data is in hand.
//
// Auth: service-role Bearer JWT OR X-Compile-Secret header.
//
// Architecture (v1.2 Editorial Policy §0.1 per-page-type pass architecture):
//  - 7 sequential LLM calls per compile, one per page_type
//    (project, person, decision, rule, concept, open_question, index).
//  - Each pass reads the FULL tagged corpus (no calendar window), then
//    filters client-side to the slice relevant to that page type.
//  - Each pass sees only metadata from EXISTING memory_index_pages for its
//    type. body_markdown is NEVER read back (R10 locked CEO call, 2026-04-23).
//  - The `index` pass is always last — it synthesizes a map page from the
//    buffered metadata of passes 1-6 only (no corpus).
//  - Pages are BUFFERED across all 7 passes. After pass 7 the entire
//    buffered array is written in a single atomic call to the existing
//    compile_memory_index_pages RPC (DELETE-ALL + INSERT). If any pass
//    completely fails to produce pages we abort the write to avoid wiping
//    the prior compile.
//
// Concurrency: lease-row lock (lease TTL 600s). The lock is refreshed
// between every pass so a long compile does not drop the lock mid-run.
// Coalesced-skip replay via consume_compile_pending under the same lock.
//
// Audit ledger: one row per compile pass on memory_index_compile_runs
// (UNIQUE on compile_id). Insert once at pass start → UPDATE by compile_id
// thereafter. Per-pass results are JSON-encoded into error_message when
// any pass failed (schema extension deferred).
//
// Per-pass MAX_OUTPUT_TOKENS = 3000: 7 passes must fit inside Vercel's 300s
// maxDuration. If a pass hits MAX_TOKENS it is logged as failed and the
// compile continues with remaining passes (v1.2 §0.1 — loud failure = page
// type has grown beyond single-call capacity and needs subdivision).

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { timingSafeEqual as nodeTimingSafeEqual, randomUUID } from 'node:crypto'
import { EDITORIAL_POLICY, POLICY_HASH } from './policy'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

// ---------- config / env ----------

const SUPABASE_URL      = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!
const GEMINI_API_KEY    = process.env.GEMINI_API_KEY!
const COMPILE_SECRET    = process.env.MEMORY_INDEX_COMPILE_SECRET ?? ''

// Per-page-type architecture (v1.2 Editorial Policy §0.1): the compiler makes
// 7 sequential LLM calls, one per page_type. Vercel Pro caps functions at
// 300s (maxDuration below). 3000 output tokens per pass gives headroom; if a
// pass exhausts the budget it's logged as failed and the compile continues
// with remaining passes (Editorial Policy §0.1: loud failure = page type has
// grown beyond single-call capacity and needs subdivision).
const MAX_OUTPUT_TOKENS_PER_PASS = 3_000
const CAPTURE_LIMIT_N       = 2_000
const INPUT_TOKEN_LIMIT_M   = 180_000
const LOCK_TTL_SECONDS      = 600 // ≈ 2× the LLM timeout
// LLM fetch timeout is deliberately shorter than Vercel's maxDuration so a
// genuine provider hang surfaces as an HTTP error we can audit, not a silent
// function kill. 280s = 300s Vercel cap − 20s buffer for post-call work.
const LLM_TIMEOUT_MS        = 280_000
const MAX_REPLAY_PASSES     = 10
// PostgREST enforces a project-wide 1000-row cap even with explicit .range();
// we pull the newest 1000 captures and drop untagged client-side. When the
// corpus grows past that cap we will switch to a SECURITY DEFINER RPC that
// returns the full tagged corpus server-side (bypassing PostgREST's cap).
const THOUGHTS_FETCH_CAP    = 1_000

// Safety net: if cumulative estimated cost across all 7 passes exceeds this,
// abort remaining passes. Gemini 2.5 Flash pricing: $0.30/M input, $2.50/M
// output. Expected cost per compile is ~$0.20; $10 ceiling is a wide margin
// kept identical across provider swaps so a regression is loudly capped.
const TOTAL_SPEND_CEILING_USD = 10
const GEMINI_INPUT_USD_PER_MTOK  = 0.30
const GEMINI_OUTPUT_USD_PER_MTOK = 2.50

// The Editorial Policy's page triggers all key off tagged capture prefixes
// (SESSION CLOSE, DECISION, CLAUDE LESSON, etc.). Untagged captures are raw
// session chatter — noise for the compiler's purposes. Filter them out so
// the token budget is spent on content the compiler actually synthesizes.
const CAPTURE_TAG_RE = new RegExp(
  '^\\s*(SESSION CLOSE|ACTIVE TASK|DECISION|MILESTONE|' +
  'CLAUDE LESSON|CLAUDE PATTERN|CLAUDE DRIFT|CLAUDE HEURISTIC|' +
  'CLAUDE ANTI-PATTERN|CLAUDE ABOUT LOUIS|PERSON NOTE|RULE REVISION|' +
  'TOOL AWARENESS|FILE SHIPPED|CO-WORK PROMPT|RESEARCH FINDINGS SUMMARY)',
  'i',
)

// Single LLM endpoint. Provider swaps live entirely inside callLLMForPass.
const GEMINI_MODEL = 'gemini-2.5-flash'
const GEMINI_URL   = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

const VALID_PAGE_TYPES = new Set([
  'project', 'person', 'decision', 'rule', 'concept', 'open_question', 'index',
])
const VALID_STATUSES = new Set([
  'current', 'potentially_stale', 'parked', 'historical',
])
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Per-page-type compilation order. `index` MUST be last because it reads
// metadata from all pages produced in passes 1–6 (Editorial Policy §0.1).
type PageType =
  | 'project' | 'person' | 'decision' | 'rule'
  | 'concept' | 'open_question' | 'index'

const PAGE_TYPE_ORDER: PageType[] = [
  'project', 'person', 'decision', 'rule', 'concept', 'open_question', 'index',
]

// Per-page-type corpus relevance filter (Editorial Policy §0.1 step 2).
// Values are the tag-prefix allowlist for the page type.
// `null` means "all captures" (for open_question — surface-able from any tag).
// `index` is handled specially: it never sees the corpus; it reads metadata
// from the buffered results of passes 1–6.
const PAGE_TYPE_CORPUS_FILTERS: Record<Exclude<PageType, 'index'>, string[] | null> = {
  project:       ['SESSION CLOSE', 'ACTIVE TASK', 'MILESTONE', 'DECISION'],
  person:        ['PERSON NOTE', 'CLAUDE ABOUT LOUIS', 'SESSION CLOSE'],
  decision:      ['DECISION', 'SESSION CLOSE'],
  rule:          ['CLAUDE LESSON', 'CLAUDE PATTERN', 'CLAUDE DRIFT',
                  'CLAUDE HEURISTIC', 'CLAUDE ANTI-PATTERN', 'RULE REVISION'],
  concept:       ['DECISION', 'SESSION CLOSE', 'ACTIVE TASK'],
  open_question: null,
}

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
      model: GEMINI_MODEL,
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
      model: GEMINI_MODEL,
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
          model: GEMINI_MODEL,
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

  // validate_only is fast (heuristic token estimate only, no LLM call).
  // Run inline and return full results as a plain JSON response.
  if (validateOnly) {
    const passes = await runAllPasses()
    return json(200, {
      status: 'ok',
      mode: 'validate_only',
      invocation_id: invocationId,
      passes,
    })
  }

  // dry_run and real compiles make 7 LLM calls, which routinely runs
  // 30-180s end-to-end. Streaming NDJSON solves two problems: keeps the client
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
    model: GEMINI_MODEL,
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

  // --- Load FULL tagged corpus (v1.2 §0.1 step 1 — no calendar window).
  // Fetch newest-first so we keep the most relevant captures even when the
  // PostgREST 1000-row cap truncates the tail, then apply the tag filter
  // client-side, then reverse to oldest-first for chronological reading.
  const { data: thoughtsData, error: thoughtsErr } = await supa
    .from('thoughts')
    .select('id, content, created_at, metadata')
    .order('created_at', { ascending: false })
    .range(0, THOUGHTS_FETCH_CAP - 1)
  if (thoughtsErr) {
    await updateAudit({
      status: 'failed',
      error_message: `thoughts_read_failed: ${thoughtsErr.message}`,
      finished_at: new Date().toISOString(),
    })
    return { compile_id: currentCompileId, status: 'failed', error_message: thoughtsErr.message }
  }
  const allThoughts = (thoughtsData ?? []) as ThoughtRow[]

  // Tag filter — Editorial Policy page triggers all key off tagged captures.
  const taggedDescending = allThoughts.filter((t) => CAPTURE_TAG_RE.test(t.content))
  const thoughts = taggedDescending.slice().reverse()
  const untaggedDropped = allThoughts.length - taggedDescending.length
  console.log('corpus', {
    fetched: allThoughts.length,
    tagged_kept: thoughts.length,
    untagged_dropped: untaggedDropped,
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
    const msg = `Corpus has N=${thoughts.length} captures (limit ${CAPTURE_LIMIT_N}). Implement subdivision per page type — see Editorial Policy §0.1.`
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

  // ---------- validate_only fast path ----------
  // Per-page-type split: report captures, estimated input tokens per pass.
  // No LLM call, no writes — heuristic token estimate per pass.
  if (validateOnly) {
    const perTypeValidate: Array<Record<string, unknown>> = []
    let totalEstimatedInput = 0

    for (const pageType of PAGE_TYPE_ORDER) {
      const filtered = pageType === 'index'
        ? []
        : filterCorpusByPageType(thoughts, pageType)
      const metaOfType = pageType === 'index'
        ? []
        : pagesMeta.filter((p) => p.page_type === pageType)
      const userMsg = pageType === 'index'
        ? buildIndexPageUserMessage([])
        : buildUserMessageForPageType(pageType, filtered, metaOfType)
      const systemPrompt = buildSystemPromptForPageType(pageType)

      const estimated = heuristicInputTokens(systemPrompt, userMsg)
      totalEstimatedInput += estimated

      perTypeValidate.push({
        page_type: pageType,
        captures_sent: filtered.length,
        existing_pages: metaOfType.length,
        estimated_input_tokens: estimated,
      })
    }

    await updateAudit({
      status: 'completed',
      corpus_captures_count: thoughts.length,
      corpus_estimated_tokens: totalEstimatedInput,
      finished_at: new Date().toISOString(),
    })
    return {
      compile_id: currentCompileId,
      status: 'completed',
      corpus_captures_count: thoughts.length,
      corpus_estimated_tokens: totalEstimatedInput,
      per_type: perTypeValidate,
    }
  }

  // ---------- per-page-type compilation loop ----------
  const bufferedPages: CompiledPage[] = []
  const perPassResults: Array<Record<string, unknown>> = []
  let cumulativeInputTokens = 0
  let cumulativeOutputTokens = 0
  let spendAborted = false

  for (const pageType of PAGE_TYPE_ORDER) {
    const passStart = Date.now()

    // Heartbeat the lease before every pass. A long compile can easily outlive
    // a default TTL; refreshing between passes keeps the lock alive and also
    // detects a lost lock (refresh returns false but we do not block on that).
    await supa.rpc('refresh_compile_lock', {
      p_compile_id: invocationId,
      p_ttl_seconds: LOCK_TTL_SECONDS,
    })

    if (spendAborted) {
      perPassResults.push({
        page_type: pageType,
        status: 'skipped',
        reason: `total_spend_ceiling_reached (>= $${TOTAL_SPEND_CEILING_USD})`,
      })
      continue
    }

    // Build prompt material.
    let filtered: ThoughtRow[]
    let metaOfType: PageMetaRow[]
    let userMsg: string
    const systemPrompt = buildSystemPromptForPageType(pageType)

    if (pageType === 'index') {
      filtered = []
      metaOfType = []
      userMsg = buildIndexPageUserMessage(bufferedPages)
    } else {
      filtered = filterCorpusByPageType(thoughts, pageType)
      metaOfType = pagesMeta.filter((p) => p.page_type === pageType)
      // If there are zero captures for this type, skip the pass entirely.
      if (filtered.length === 0) {
        perPassResults.push({
          page_type: pageType,
          status: 'skipped',
          reason: 'no_captures_in_filtered_corpus',
        })
        continue
      }
      userMsg = buildUserMessageForPageType(pageType, filtered, metaOfType)
    }

    // Per-pass M-guard. Skip this pass (loud), keep going with the rest.
    const estimatedInput = heuristicInputTokens(systemPrompt, userMsg)
    if (estimatedInput > INPUT_TOKEN_LIMIT_M) {
      perPassResults.push({
        page_type: pageType,
        status: 'skipped',
        reason: `estimated_input_${estimatedInput}>${INPUT_TOKEN_LIMIT_M}`,
        captures_sent: filtered.length,
      })
      continue
    }

    // Call the LLM for this pass.
    const call = await callLLMForPass(systemPrompt, userMsg, MAX_OUTPUT_TOKENS_PER_PASS)
    if (call.status === 'failed') {
      perPassResults.push({
        page_type: pageType,
        status: 'failed',
        error: call.error,
        captures_sent: filtered.length,
        estimated_input_tokens: estimatedInput,
      })
      continue
    }

    cumulativeInputTokens += call.inputTokens
    cumulativeOutputTokens += call.outputTokens

    // Refresh heartbeat after the API call (pre-validation).
    await supa.rpc('refresh_compile_lock', {
      p_compile_id: invocationId,
      p_ttl_seconds: LOCK_TTL_SECONDS,
    })

    // Validate response.
    const validated = validateCompiledPages(call.text, thoughts)
    if (!validated.ok) {
      perPassResults.push({
        page_type: pageType,
        status: 'failed',
        error: `validation_failed: ${validated.error}`,
        input_tokens: call.inputTokens,
        output_tokens: call.outputTokens,
        captures_sent: filtered.length,
      })
      continue
    }

    // Enforce that every page this pass produced is of the expected page_type.
    // (Exception: passes other than index may never produce an index page.)
    const mismatched = validated.pages.filter((p) => p.page_type !== pageType)
    if (mismatched.length > 0) {
      perPassResults.push({
        page_type: pageType,
        status: 'failed',
        error: `pass_emitted_wrong_types: ${mismatched.map((p) => p.page_type).join(',')}`,
        input_tokens: call.inputTokens,
        output_tokens: call.outputTokens,
      })
      continue
    }

    // Cross-pass slug uniqueness.
    const existingSlugs = new Set(bufferedPages.map((p) => p.slug))
    const dup = validated.pages.find((p) => existingSlugs.has(p.slug))
    if (dup) {
      perPassResults.push({
        page_type: pageType,
        status: 'failed',
        error: `duplicate_slug_across_passes: ${dup.slug}`,
        input_tokens: call.inputTokens,
        output_tokens: call.outputTokens,
      })
      continue
    }

    bufferedPages.push(...validated.pages)
    perPassResults.push({
      page_type: pageType,
      status: 'completed',
      pages_produced: validated.pages.length,
      captures_sent: filtered.length,
      input_tokens: call.inputTokens,
      output_tokens: call.outputTokens,
      estimated_input_tokens: estimatedInput,
      pass_ms: Date.now() - passStart,
    })

    // Safety net: abort remaining passes if cumulative cost exceeds ceiling.
    const spendUsd = estimateSpendUsd(cumulativeInputTokens, cumulativeOutputTokens)
    if (spendUsd >= TOTAL_SPEND_CEILING_USD) {
      spendAborted = true
    }
  }

  const anyPassFailed = perPassResults.some(
    (r) => r.status === 'failed' || r.status === 'skipped',
  )
  const anyPassCompleted = perPassResults.some((r) => r.status === 'completed')

  // ---------- dry_run short-circuit ----------
  if (dryRun) {
    await updateAudit({
      status: anyPassCompleted ? 'completed' : 'failed',
      input_tokens: cumulativeInputTokens,
      output_tokens: cumulativeOutputTokens,
      pages_written: bufferedPages.length,
      corpus_captures_count: thoughts.length,
      error_message: anyPassFailed ? JSON.stringify(perPassResults).slice(0, 2000) : undefined,
      finished_at: new Date().toISOString(),
    })
    return {
      compile_id: currentCompileId,
      status: anyPassCompleted ? 'completed' : 'failed',
      pages_buffered: bufferedPages.length,
      input_tokens: cumulativeInputTokens,
      output_tokens: cumulativeOutputTokens,
      corpus_captures_count: thoughts.length,
      estimated_cost_usd: estimateSpendUsd(cumulativeInputTokens, cumulativeOutputTokens),
      per_pass: perPassResults,
    }
  }

  // ---------- real compile: atomic write ----------
  // If NO passes produced pages, do NOT call the RPC — it would delete the
  // prior compile without replacement.
  if (bufferedPages.length === 0) {
    await updateAudit({
      status: 'failed',
      error_message: `no_pages_produced: ${JSON.stringify(perPassResults).slice(0, 1500)}`,
      input_tokens: cumulativeInputTokens,
      output_tokens: cumulativeOutputTokens,
      corpus_captures_count: thoughts.length,
      finished_at: new Date().toISOString(),
    })
    return {
      compile_id: currentCompileId,
      status: 'failed',
      error_message: 'no_pages_produced',
      per_pass: perPassResults,
    }
  }

  const { data: rpcData, error: rpcErr } = await supa.rpc(
    'compile_memory_index_pages',
    { pages_json: bufferedPages },
  )
  if (rpcErr) {
    await updateAudit({
      status: 'failed',
      error_message: `rpc_write_failed: ${rpcErr.message}`,
      input_tokens: cumulativeInputTokens,
      output_tokens: cumulativeOutputTokens,
      corpus_captures_count: thoughts.length,
      finished_at: new Date().toISOString(),
    })
    return { compile_id: currentCompileId, status: 'failed', error_message: rpcErr.message }
  }

  const rpcRow = Array.isArray(rpcData) ? rpcData[0] : rpcData
  const pagesWritten = typeof rpcRow?.pages_written === 'number'
    ? rpcRow.pages_written
    : bufferedPages.length

  await updateAudit({
    status: anyPassFailed ? 'completed' : 'completed',
    input_tokens: cumulativeInputTokens,
    output_tokens: cumulativeOutputTokens,
    pages_written: pagesWritten,
    corpus_captures_count: thoughts.length,
    error_message: anyPassFailed ? JSON.stringify(perPassResults).slice(0, 2000) : undefined,
    finished_at: new Date().toISOString(),
  })

  return {
    compile_id: currentCompileId,
    status: 'completed',
    pages_written: pagesWritten,
    input_tokens: cumulativeInputTokens,
    output_tokens: cumulativeOutputTokens,
    corpus_captures_count: thoughts.length,
    estimated_cost_usd: estimateSpendUsd(cumulativeInputTokens, cumulativeOutputTokens),
    per_pass: perPassResults,
  }
}

// ---------- per-page-type helpers ----------

// Filter the full tagged corpus to captures relevant to this page type
// (v1.2 §0.1 step 2). Matching is prefix-based: a capture is kept when its
// content starts with any of the allowed prefixes. `open_question` gets the
// full corpus (any capture can surface a recurring question). `index` never
// uses the corpus — caller handles that branch separately.
function filterCorpusByPageType(
  corpus: ThoughtRow[],
  pageType: Exclude<PageType, 'index'>,
): ThoughtRow[] {
  const allow = PAGE_TYPE_CORPUS_FILTERS[pageType]
  if (allow === null) return corpus.slice()
  const regex = new RegExp(
    `^\\s*(${allow.map((p) => p.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|')})`,
    'i',
  )
  return corpus.filter((t) => regex.test(t.content))
}

// The system prompt is the full Editorial Policy plus a single directive
// scoping THIS pass to one page type only. Per-pass targeting happens in
// both the system prompt (the directive) and the user prompt (scoped corpus
// and metadata).
function buildSystemPromptForPageType(pageType: PageType): string {
  return `${EDITORIAL_POLICY}\n\n## THIS PASS\nProduce ALL and ONLY ${pageType} pages. Every page in your output array MUST have page_type="${pageType}". Respond ONLY with a JSON array — no preamble, no markdown fences, no explanation.`
}

// User message for passes 1-6 (every type except `index`). Contract matches
// the original single-call message: CORPUS + EXISTING PAGE METADATA + INSTRUCTIONS,
// just scoped to one page type.
function buildUserMessageForPageType(
  pageType: Exclude<PageType, 'index'>,
  filteredCorpus: ThoughtRow[],
  existingMetadata: PageMetaRow[],
): string {
  const corpus = filteredCorpus.map((t) => {
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

  const existingPages = existingMetadata.map((p) => ({
    slug: p.slug,
    title: p.title,
    page_type: p.page_type,
    status: p.status,
    last_compiled_at: p.last_compiled_at,
    last_capture_seen_at: p.last_capture_seen_at,
    connected_page_slugs: p.connected_page_slugs ?? [],
    source_capture_ids: p.source_capture_ids ?? [],
  }))

  return [
    `You are the Memory Index compiler. Produce ALL ${pageType} pages from the corpus below per the Editorial Policy section for ${pageType}.`,
    '',
    `## CORPUS — tagged rows from public.thoughts, filtered for page_type=${pageType}, ascending by created_at`,
    '```json',
    JSON.stringify(corpus),
    '```',
    '',
    `## EXISTING ${pageType.toUpperCase()} PAGE METADATA`,
    '(metadata only — body_markdown is deliberately NOT included to prevent hallucination-laundering; rebuild pages from the corpus above and the Editorial Policy)',
    '```json',
    JSON.stringify(existingPages),
    '```',
    '',
    '## INSTRUCTIONS',
    `Return ONLY a JSON array of ${pageType} page objects. Each object MUST have:`,
    `  - page_type: exactly "${pageType}"`,
    '  - slug: non-empty URL-safe string (lowercase, digits, underscores, hyphens)',
    '  - title: non-empty display title',
    '  - body_markdown: the full page content per the Editorial Policy required sections for this page type',
    '  - source_capture_ids: array of thought UUIDs from the CORPUS above (must match real ids)',
    '  - connected_page_slugs: array of slugs referenced via [[wiki-links]] in body_markdown',
    '  - status: one of current | potentially_stale | parked | historical',
    '  - last_capture_seen_at (optional): ISO timestamp of the newest capture reflected on this page',
    '',
    'Slugs MUST be unique within the array. Every claim must trace to a source capture. Use [[double bracket]] links for cross-references. Preserve uncertainty and surface contradictions with ⚠️ per Editorial Policy §4. Do NOT include any text outside the JSON array.',
  ].join('\n')
}

// The `index` pass user message. No corpus. Reads metadata only from the
// buffered pages produced in passes 1-6 (v1.2 §0.1: "The index pass is
// always last because it synthesizes metadata from all other pages produced
// in the current compile").
function buildIndexPageUserMessage(bufferedPages: CompiledPage[]): string {
  const metadata = bufferedPages.map((p) => ({
    slug: p.slug,
    title: p.title,
    page_type: p.page_type,
    status: p.status,
    connected_page_slugs: p.connected_page_slugs,
    last_capture_seen_at: p.last_capture_seen_at ?? null,
  }))

  return [
    'You are the Memory Index compiler. Produce the single `index` page that maps the entire Memory Index for the current compile.',
    '',
    '## BUFFERED PAGE METADATA (from this compile, passes 1-6)',
    '(this is the ONLY input for the index pass — metadata only, no corpus and no body_markdown)',
    '```json',
    JSON.stringify(metadata),
    '```',
    '',
    '## INSTRUCTIONS',
    'Return ONLY a JSON array containing EXACTLY ONE page object with page_type="index" per the Editorial Policy §2.7 required sections. Use slug "index". The body_markdown must cross-link every referenced page via [[wiki-links]]. source_capture_ids MUST be the empty array [] (the index page derives from page metadata, not captures).',
  ].join('\n')
}

// Input-token heuristic. Used by validate_only and the per-pass M-guard.
// Gemini returns authoritative usage on every generation response, so we no
// longer call a separate count-tokens endpoint pre-flight.
function heuristicInputTokens(systemPrompt: string, userMsg: string): number {
  return Math.ceil((systemPrompt.length + userMsg.length) / 4)
}

// Cost estimator (Gemini 2.5 Flash on-demand pricing).
function estimateSpendUsd(inputTokens: number, outputTokens: number): number {
  const input = (inputTokens / 1_000_000) * GEMINI_INPUT_USD_PER_MTOK
  const output = (outputTokens / 1_000_000) * GEMINI_OUTPUT_USD_PER_MTOK
  return Math.round((input + output) * 1000) / 1000
}

// Provider abstraction: the entire LLM API contract for the compiler lives
// inside this function. Swapping providers means editing only this body.
// Returns a structured result so the orchestrator can continue with remaining
// passes on failure.
type LLMCallResult =
  | { status: 'ok'; text: string; inputTokens: number; outputTokens: number }
  | { status: 'failed'; error: string; inputTokens?: number; outputTokens?: number }

async function callLLMForPass(
  systemPrompt: string,
  userPrompt: string,
  maxOutputTokens: number,
): Promise<LLMCallResult> {
  let response: Response
  let retriedOnce = false
  while (true) {
    try {
      response = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: {
          'x-goog-api-key': GEMINI_API_KEY,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: {
            maxOutputTokens,
            // Force JSON output. Schema is enforced by the Editorial Policy
            // prompt, not a responseSchema (per spec).
            responseMimeType: 'application/json',
          },
        }),
        signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
      })
    } catch (e) {
      return { status: 'failed', error: `gemini_fetch_failed: ${String(e)}` }
    }

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

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    return {
      status: 'failed',
      error: `gemini_http_${response.status}: ${body.slice(0, 500)}`,
    }
  }

  const apiResp = await response.json()

  // Prompt-level block (safety, etc.) — Gemini may return no candidates here.
  if (apiResp?.promptFeedback?.blockReason) {
    return {
      status: 'failed',
      error: `prompt_block: ${apiResp.promptFeedback.blockReason}`,
    }
  }

  if (!Array.isArray(apiResp?.candidates) || apiResp.candidates.length === 0) {
    return { status: 'failed', error: 'no_candidates_returned' }
  }

  const cand = apiResp.candidates[0]
  const usage = apiResp?.usageMetadata ?? {}
  const inputTokens =
    typeof usage.promptTokenCount === 'number' ? usage.promptTokenCount : 0
  const outputTokens =
    typeof usage.candidatesTokenCount === 'number' ? usage.candidatesTokenCount : 0

  if (cand.finishReason && cand.finishReason !== 'STOP') {
    return {
      status: 'failed',
      error: `finish_reason=${cand.finishReason}`,
      inputTokens,
      outputTokens,
    }
  }

  const text: string =
    Array.isArray(cand?.content?.parts) && cand.content.parts[0]?.text
      ? cand.content.parts[0].text
      : ''
  if (text.length === 0) {
    return { status: 'failed', error: 'empty_text', inputTokens, outputTokens }
  }

  // Per spec: confirm parseable JSON before returning so a malformed body
  // surfaces as a pass failure here, not as a crash in validateCompiledPages.
  try {
    JSON.parse(text)
  } catch (e) {
    return {
      status: 'failed',
      error: `json_parse_failed: ${String(e).slice(0, 200)}`,
      inputTokens,
      outputTokens,
    }
  }

  return { status: 'ok', text, inputTokens, outputTokens }
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
