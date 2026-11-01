import { alertClientError } from '@/lib/monitoring/client-error-alert'

export const runtime = 'nodejs'
const MAX_BYTES = 4096

export async function POST(request: Request) {
  if (process.env.CLIENT_ERROR_ALERTS !== 'on') return new Response(null, { status: 204 })
  const origin = request.headers.get('origin')
  if (!origin || origin !== new URL(request.url).origin) return new Response(null, { status: 403 })
  if (!request.headers.get('content-type')?.startsWith('application/json')) return new Response(null, { status: 415 })
  if (Number(request.headers.get('content-length') ?? 0) > MAX_BYTES) return new Response(null, { status: 413 })
  const reader = request.body?.getReader()
  if (!reader) return new Response(null, { status: 400 })
  try {
    const chunks: Uint8Array[] = []
    let size = 0
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > MAX_BYTES) {
        await reader.cancel()
        return new Response(null, { status: 413 })
      }
      chunks.push(value)
    }
    const payload = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    if (!payload || Array.isArray(payload) || typeof payload !== 'object' || typeof payload.message !== 'string' || !payload.message.trim()) {
      return new Response(null, { status: 400 })
    }
    await alertClientError(payload)
    return new Response(null, { status: 204 })
  } catch {
    return new Response(null, { status: 400 })
  } finally {
    reader.releaseLock()
  }
}
