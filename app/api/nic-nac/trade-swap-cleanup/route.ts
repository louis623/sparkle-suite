import { danceFloorRouteError } from '@/lib/nic-nac/dance-floor-route-error'
import { NextResponse } from 'next/server'

import { AuthError, getPaidNicNacContext } from '@/lib/nic-nac/auth'
import { ServiceError } from '@/lib/services/errors'
import { getTradeSwapCleanupQueue, finishTradeSwapFollowUp } from '@/lib/services/trade-swaps'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function serviceErrorResponse(error: ServiceError) {
  return NextResponse.json(
    { code: error.code, error: error.userMessage },
    { status: error.statusCode },
  )
}

export async function GET() {
  try {
    const { repId, supabase } = await getPaidNicNacContext()
    const queue = await getTradeSwapCleanupQueue(supabase, repId)
    return NextResponse.json(queue)
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    }
    if (error instanceof ServiceError) return serviceErrorResponse(error)
    throw error
  }
}

export async function POST(request: Request) {
  try {
    const { repId, supabase } = await getPaidNicNacContext()
    const body = await request.json()
    const result = await finishTradeSwapFollowUp(supabase, repId, typeof body?.swapId === 'string' ? body.swapId : '', {
      ringSize: body?.ringSize, collectionName: body?.collectionName, material: body?.material,
    })
    return NextResponse.json({ ok: true, result })
  } catch (error) { return danceFloorRouteError(error) }
}
