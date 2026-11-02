import { after } from 'next/server'
import { enqueueClientError, deliverClientErrorBatch } from '@/lib/monitoring/client-error-alert'
import { clientErrorIpKey, isBuiltClientErrorSource, isClientErrorHostAllowed } from '@/lib/monitoring/client-error-guard'

export const runtime = 'nodejs'
export const maxDuration = 120
const CLIENT_ERROR_MAX_BYTES = 8192
const quiet = () => new Response(null, { status: 204 })

export async function POST(request: Request) {
  if (process.env.CLIENT_ERROR_ALERTS !== 'on') return quiet()
  const destination = new URL(request.url)
  if (request.headers.get('origin') !== destination.origin ||
      request.headers.get('sec-fetch-site') !== 'same-origin' ||
      !await isClientErrorHostAllowed(destination.hostname)) return new Response(null, { status: 403 })
  if (!request.headers.get('content-type')?.startsWith('application/json')) return new Response(null, { status: 415 })
  if (Number(request.headers.get('content-length') ?? 0) > CLIENT_ERROR_MAX_BYTES) return new Response(null, { status: 413 })
  const ipHash = clientErrorIpKey(request)
  if (!ipHash) return quiet()
  const reader = request.body?.getReader()
  if (!reader) return new Response(null, { status: 400 })
  try {
    const chunks: Uint8Array[] = []
    let size = 0
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > CLIENT_ERROR_MAX_BYTES) {
        await reader.cancel()
        return new Response(null, { status: 413 })
      }
      chunks.push(value)
    }
    const payload = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    if (!payload || Array.isArray(payload) || typeof payload !== 'object' ||
        typeof payload.message !== 'string' || !payload.message.trim() ||
        typeof payload.messageHash !== 'string' || !/^[a-f0-9]{64}$/.test(payload.messageHash)) {
      return new Response(null, { status: 400 })
    }
    const source = isBuiltClientErrorSource(payload.source, destination.origin)
    if (!source) return quiet()
    try {
      const admission = await enqueueClientError(payload, ipHash, source)
      if (admission.allowed && admission.schedule && admission.batchId) {
        after(async () => {
          try { await deliverClientErrorBatch(admission.batchId!, admission.delayMs ?? 61_000) }
          catch { console.error('[client-error] Owner alert unavailable') }
        })
      }
    } catch {
      // Missing migration/store fails closed; never bypass durable admission.
      console.error('[client-error] Monitoring admission unavailable')
    }
    return quiet()
  } catch { return new Response(null, { status: 400 }) }
  finally { reader.releaseLock() }
}
