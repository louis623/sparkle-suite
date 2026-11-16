import 'server-only'
import type { LineupState } from './types'

/** Fixed public endpoint; bounded response; only readiness metadata leaves this function. */
export async function verifyPublicFeed(repId: string, state: LineupState, fetchImpl: typeof fetch = fetch): Promise<'matched' | 'mismatch' | 'unknown'> {
  if (process.env.VERCEL_ENV !== 'production' || process.env.SPARKLE_ENVIRONMENT === 'smoke'
    || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(repId)) return 'unknown'
  try {
    const response = await fetchImpl(`https://www.yoursparklesuite.com/api/amethyst/live-lineup?repId=${repId}`, {
      cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(5000),
    })
    if (!response.ok || !response.body || Number(response.headers.get('content-length') ?? 0) > 1_048_576) return 'unknown'
    const reader = response.body.getReader(), chunks: Uint8Array[] = []
    let size = 0
    for (;;) {
      const next = await reader.read()
      if (next.done) break
      size += next.value.byteLength
      if (size > 1_048_576) {await reader.cancel(); return 'unknown'}
      chunks.push(next.value)
    }
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown>
    // A concurrent publish may change revision during the fetch. That is unknown, not a false mismatch.
    if (!Number.isSafeInteger(body.liveQueueRevision) || body.liveQueueRevision !== state.revision) return 'unknown'
    if (typeof body.liveQueueSourceReady !== 'boolean' || typeof body.liveQueueLastUpdated !== 'string') return 'unknown'
    return body.liveQueueSourceReady === true && ['live','empty'].includes(String(body.liveQueueState))
      && body.liveQueueLastUpdated === (state.lastReadySourceAt ?? state.lastReadyAt) ? 'matched' : 'mismatch'
  } catch {return 'unknown'}
}
