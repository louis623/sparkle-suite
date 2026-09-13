import 'server-only'
import { NextResponse } from 'next/server'
import { AuthError, getPaidNicNacContext } from '@/lib/nic-nac/auth'
import { getOperatorSupportRequestContext } from '@/lib/operator-support/request-context'
import { ServiceError } from '@/lib/services/errors'
import { createAdminClient } from '@/lib/supabase/admin'
import { LineupServiceError } from './service'

export function lineupJson(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } })
}
export function lineupFailure(error: unknown) {
  if (error instanceof AuthError) return lineupJson({ error: 'unauthenticated' }, 401)
  if (error instanceof LineupServiceError) return lineupJson({ error: error.code }, error.status)
  if (error instanceof ServiceError) return lineupJson({ error: error.code }, error.statusCode)
  if (error instanceof SyntaxError) return lineupJson({ error: 'invalid_payload' }, 400)
  return lineupJson({ error: 'lineup_unavailable' }, 503)
}
export async function workspaceLineupContext(request?: Request) {
  if (request) {
    // Cookie-authenticated mutations accept same-origin requests only; no wildcard CORS.
    const origin = request.headers.get('origin')
    if (!origin || origin !== new URL(request.url).origin || request.headers.get('sec-fetch-site') === 'cross-site') throw new LineupServiceError('invalid_origin', 403)
  }
  const context = await getPaidNicNacContext()
  // Support contexts have separate capabilities/auditing. Do not silently bypass them with this admin client.
  if (getOperatorSupportRequestContext()) throw new LineupServiceError('support_scope_not_enabled', 403)
  return { repId: context.repId, db: createAdminClient() }
}
/** Streaming bound also protects chunked bodies with no trustworthy Content-Length. */
export async function readLineupJson(request: Request, maxBytes = 16_384, timeoutMs = 10_000): Promise<unknown> {
  const mediaType = request.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase()
  if (mediaType !== 'application/json') throw new LineupServiceError('json_required', 415)
  const length = Number(request.headers.get('content-length'))
  if (Number.isFinite(length) && length > maxBytes) throw new LineupServiceError('payload_too_large', 413)
  const reader = request.body?.getReader()
  if (!reader) throw new LineupServiceError('invalid_payload', 400)
  const chunks: Uint8Array[] = []
  let size = 0
  // A byte limit alone does not bound a stalled/chunk-drip request. One deadline covers the whole body.
  // Never await cancellation: an adversarial underlying stream may never settle its cancel promise.
  const cancel = () => { void reader.cancel().catch(() => {}) }
  if (request.signal.aborted) { cancel(); reader.releaseLock(); throw new LineupServiceError('request_aborted', 400) }
  let interrupt!: (error: LineupServiceError) => void
  const interrupted = new Promise<never>((_resolve, reject) => { interrupt = reject })
  const abort = () => { interrupt(new LineupServiceError('request_aborted', 400)); cancel() }
  const timer = setTimeout(() => { interrupt(new LineupServiceError('request_timeout', 408)); cancel() }, timeoutMs)
  request.signal.addEventListener('abort', abort, { once: true })
  try {
    while (true) {
      const { done, value } = await Promise.race([reader.read(), interrupted])
      if (done) break
      size += value.byteLength
      if (size > maxBytes) { cancel(); throw new LineupServiceError('payload_too_large', 413) }
      chunks.push(value)
    }
  } finally {
    clearTimeout(timer)
    request.signal.removeEventListener('abort', abort)
    reader.releaseLock()
  }
  let decoded: string
  try { decoded = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)) }
  catch { throw new LineupServiceError('invalid_payload', 400) }
  return JSON.parse(decoded)
}
