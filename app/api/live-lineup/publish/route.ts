import { createAdminClient } from '@/lib/supabase/admin'
import { claimSource, describeSource, receiveSource } from '@/lib/live-lineup/service'
import { lineupFailure, lineupJson, readLineupJson } from '@/lib/live-lineup/http'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const origins = new Set(['https://myoffice.bombparty.com', 'chrome-extension://kmodgfffflplfdlkkhadgimmobplhoih'])
function cors(request: Request, response: Response) {
  const origin = request.headers.get('origin')
  if (origin && origins.has(origin)) response.headers.set('access-control-allow-origin', origin)
  response.headers.set('vary', 'Origin')
  response.headers.set('access-control-allow-methods', 'POST, OPTIONS')
  response.headers.set('access-control-allow-headers', 'authorization, content-type')
  return response
}
export async function OPTIONS(request: Request) { return cors(request, new Response(null, { status: 204 })) }
export async function POST(request: Request) {
  try {
    const origin = request.headers.get('origin')
    if (origin && !origins.has(origin)) return cors(request, lineupJson({ error: 'invalid_origin' }, 403))
    const credential = request.headers.get('authorization')?.match(/^Bearer (sslp_[A-Za-z0-9_-]{43}|[A-Z0-9]{3}-[0-9]{4})$/)?.[1] ?? null
    if (!credential) return cors(request, lineupJson({ error: 'unauthorized' }, 401))
    // Bounded maximum accommodates 2,000 names plus 10,000 dated revelations.
    const body = await readLineupJson(request, 4_194_304) as { action?: unknown; claimId?: unknown; generation?: unknown; packet?: unknown } | null
    const db = createAdminClient()
    const result = body?.action === 'describe' ? await describeSource(db, credential)
      : body?.action === 'claim' ? await claimSource(db, credential, body.claimId, Date.now(), body.generation ?? 0)
      : body?.action === 'snapshot' ? await receiveSource(db, credential, body.packet) : null
    return cors(request, result ? lineupJson(result) : lineupJson({ error: 'invalid_payload' }, 400))
  } catch (error) { return cors(request, lineupFailure(error)) }
}
