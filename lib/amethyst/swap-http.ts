import { isIP } from 'node:net'
import { createHmac } from 'node:crypto'

export class SwapHttpError extends Error {
  constructor(readonly status: number, message: string) { super(message) }
}

export function verifySwapOrigin(request: Request) {
  const origin = request.headers.get('origin')
  if (!origin) return
  if (origin !== new URL(request.url).origin) {
    throw new SwapHttpError(403, 'Open this Dance Floor before sending a request.')
  }
}

export async function readSwapJson(request: Request, maxBytes = 16384): Promise<Record<string, unknown>> {
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json')
    throw new SwapHttpError(415, 'Refresh the Dance Floor page before sending a swap request.')
  if (Number(request.headers.get('content-length')) > maxBytes) throw new SwapHttpError(413, 'Swap request is too large.')
  const reader = request.body?.getReader()
  if (!reader) throw new SwapHttpError(400, 'Missing swap request.')
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const {done, value} = await reader.read()
      if (done) break
      size += value.length
      if (size > maxBytes) {
        await reader.cancel()
        throw new SwapHttpError(413, 'Swap request is too large.')
      }
      chunks.push(value)
    }
  } finally { reader.releaseLock() }
  try {
    const data = JSON.parse(new TextDecoder('utf-8', {fatal:true}).decode(Buffer.concat(chunks)))
    if (!data || Array.isArray(data) || typeof data !== 'object') throw new Error()
    return data
  } catch { throw new SwapHttpError(400, 'Invalid swap request.') }
}

export function swapIpHash(request: Request) {
  // Vercel supplies this header independently of a customer's forwarding chain.
  const raw = request.headers.get('x-vercel-forwarded-for')?.trim() ?? ''
  if (!isIP(raw)) throw new SwapHttpError(503, 'We could not verify the connection. Please retry.')
  const address = isIP(raw) === 6 ? new URL('http://[' + raw + ']').hostname.slice(1,-1) : raw
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret) throw new SwapHttpError(503, 'Swap requests are temporarily unavailable.')
  return createHmac('sha256', secret).update('trade-upload-ip:v1:' + address).digest('hex')
}
