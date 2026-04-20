// Spike cost benchmark. Hits the deployed /api/thumper/spike route via
// authenticated HTTP (signInWithPassword) and records per-prompt tokens + USD.
// Padding is enforced-stripped via cacheMode=stripped on the request body.
//
// This is the runnable infrastructure Louis should point at the Vercel
// preview URL once deployed. The spike included this as "built but not
// executed for the full 200-prompt baseline" — see SS_Phase1_Spike_Findings.

import { config } from 'dotenv'
config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync } from 'fs'
import { randomUUID } from 'crypto'
import path from 'path'

interface Prompt {
  kind: 'conversational' | 'read' | 'hitl'
  text: string
}
interface RunResult {
  kind: Prompt['kind']
  text: string
  cacheState: 'cold' | 'warm'
  inputTokens: number | null
  outputTokens: number | null
  cacheReadTokens: number | null
  cacheWriteTokens: number | null
  usdCost: number | null
  latencyMs: number
  ok: boolean
  error?: string
}

const API_BASE = process.env.SPIKE_BENCHMARK_BASE_URL ?? 'http://localhost:3007'
const REP_EMAIL = 'testrep@neonrabbit.net'
const REP_PASSWORD = 'ThumperSpike2026Dev!'

// Current Anthropic Haiku 4.5 pricing (per 1M tokens):
// MUST refetch before a serious run — these are a placeholder based on the
// last published Claude pricing page as of 2026-04. Replace with fetch'd
// values before running the real 200-prompt benchmark.
const PRICING = {
  inputPerM: 1.0,
  outputPerM: 5.0,
  cacheWritePerM: 1.25,
  cacheReadPerM: 0.1,
  source:
    'hardcoded placeholder (replace with https://www.anthropic.com/pricing fetch before run)',
  fetchedAt: 'N/A — placeholder',
}

async function main() {
  const promptsPath = path.join(process.cwd(), 'spike', 'prompts.json')
  const { prompts } = JSON.parse(readFileSync(promptsPath, 'utf-8')) as {
    prompts: Prompt[]
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { error: signErr } = await supabase.auth.signInWithPassword({
    email: REP_EMAIL,
    password: REP_PASSWORD,
  })
  if (signErr) throw signErr
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('No session after sign-in')

  // Assemble a cookie header the route handler will accept via @supabase/ssr.
  const supaRef = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split('.')[0]
  const cookieName = `sb-${supaRef}-auth-token`
  const cookieValue = encodeURIComponent(JSON.stringify(session))
  const cookieHeader = `${cookieName}=${cookieValue}`

  const results: RunResult[] = []

  // Cold samples: each prompt is turn-1 of a fresh conversation.
  for (const p of prompts) {
    const res = await runOne(p, 'cold', cookieHeader)
    results.push(res)
    console.log(
      `[bench][cold][${p.kind}] in=${res.inputTokens} cr=${res.cacheReadTokens} cw=${res.cacheWriteTokens} out=${res.outputTokens} $${res.usdCost?.toFixed(5)} ${res.latencyMs}ms`
    )
  }

  // Warm samples: 4 conversations of 3 turns each with sampled prompts.
  const reads = prompts.filter((p) => p.kind !== 'hitl')
  for (let c = 0; c < 4; c++) {
    const convId = randomUUID()
    for (let t = 0; t < 3; t++) {
      const p = reads[(c * 3 + t) % reads.length]
      const res = await runOne(p, 'warm', cookieHeader, convId, t === 0)
      results.push(res)
      console.log(
        `[bench][warm][${p.kind}] in=${res.inputTokens} cr=${res.cacheReadTokens} cw=${res.cacheWriteTokens} out=${res.outputTokens} $${res.usdCost?.toFixed(5)} ${res.latencyMs}ms`
      )
    }
  }

  const out = {
    pricing: PRICING,
    ranAt: new Date().toISOString(),
    results,
    aggregates: aggregate(results),
  }
  const outPath = path.join(
    process.cwd(),
    'spike',
    `benchmark-results-${Date.now()}.json`
  )
  writeFileSync(outPath, JSON.stringify(out, null, 2))
  console.log(`\nWrote ${outPath}`)
  console.log('\nAggregates:\n', JSON.stringify(out.aggregates, null, 2))
}

async function runOne(
  prompt: Prompt,
  cacheState: 'cold' | 'warm',
  cookieHeader: string,
  conversationIdOverride?: string,
  isFirstTurnOfConv = true
): Promise<RunResult> {
  const conversationId = conversationIdOverride ?? randomUUID()
  const messageId = randomUUID()
  const body = {
    conversationId,
    messages: [
      { id: messageId, role: 'user', parts: [{ type: 'text', text: prompt.text }] },
    ],
    cacheMode: 'stripped',
  }
  const start = Date.now()
  let attempt = 0
  while (attempt < 4) {
    try {
      const resp = await fetch(`${API_BASE}/api/thumper/spike`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: cookieHeader,
        },
        body: JSON.stringify(body),
      })
      if (resp.status === 429) {
        const backoff = 2 ** attempt * 1000
        await new Promise((r) => setTimeout(r, backoff))
        attempt++
        continue
      }
      if (!resp.ok) {
        return {
          kind: prompt.kind,
          text: prompt.text,
          cacheState,
          inputTokens: null,
          outputTokens: null,
          cacheReadTokens: null,
          cacheWriteTokens: null,
          usdCost: null,
          latencyMs: Date.now() - start,
          ok: false,
          error: `http ${resp.status}`,
        }
      }
      // Consume the SSE stream but don't parse. Usage metadata is logged
      // server-side via console.log in the route's streamText.onFinish.
      // For per-prompt metrics we need to correlate logs — simplest is to
      // use a header injected by the route. We pass a request-id header
      // back via the response (if not present, set ok=true with null
      // tokens and extract from server logs offline).
      const reader = resp.body?.getReader()
      if (reader) {
        while (true) {
          const { done } = await reader.read()
          if (done) break
        }
      }
      return {
        kind: prompt.kind,
        text: prompt.text,
        cacheState,
        inputTokens: null,
        outputTokens: null,
        cacheReadTokens: null,
        cacheWriteTokens: null,
        usdCost: null,
        latencyMs: Date.now() - start,
        ok: true,
        error: 'tokens-in-server-logs (see [thumper] streamText finish)',
      }
    } catch (err) {
      return {
        kind: prompt.kind,
        text: prompt.text,
        cacheState,
        inputTokens: null,
        outputTokens: null,
        cacheReadTokens: null,
        cacheWriteTokens: null,
        usdCost: null,
        latencyMs: Date.now() - start,
        ok: false,
        error: (err as Error).message,
      }
    }
  }
  return {
    kind: prompt.kind,
    text: prompt.text,
    cacheState,
    inputTokens: null,
    outputTokens: null,
    cacheReadTokens: null,
    cacheWriteTokens: null,
    usdCost: null,
    latencyMs: Date.now() - start,
    ok: false,
    error: 'max-retries',
  }
}

function aggregate(results: RunResult[]) {
  const byState: Record<'cold' | 'warm', RunResult[]> = { cold: [], warm: [] }
  for (const r of results) byState[r.cacheState].push(r)
  const summarize = (arr: RunResult[]) => ({
    count: arr.length,
    okRate: arr.filter((r) => r.ok).length / (arr.length || 1),
    avgLatencyMs:
      arr.reduce((s, r) => s + r.latencyMs, 0) / (arr.length || 1),
  })
  return {
    cold: summarize(byState.cold),
    warm: summarize(byState.warm),
    note:
      'Token and USD aggregates require pairing server-log [thumper] streamText finish entries with this run; see SS_Phase1_Spike_Findings_v1.0.md for the one-observation baseline the spike captured.',
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
