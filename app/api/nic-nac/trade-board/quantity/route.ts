import { NextResponse } from 'next/server'
import { getPaidNicNacContext } from '@/lib/nic-nac/auth'
import { setListingQuantity } from '@/lib/services/trade-board'
import { danceFloorRouteError } from '@/lib/nic-nac/dance-floor-route-error'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function POST(request: Request) {
  try {
    const { repId, supabase } = await getPaidNicNacContext()
    const body = await request.json()
    if (!Number.isSafeInteger(body?.quantity) || body.quantity < 1 ||
        !Number.isSafeInteger(body?.expectedQuantity) || body.expectedQuantity < 0) {
      return NextResponse.json({ code: 'INVALID_QUANTITY', error: 'Quantity can be 1 to 99. Reload before saving if the quantity is unknown.' }, { status: 400 })
    }
    const result = await setListingQuantity(supabase, repId, typeof body.listingId === 'string' ? body.listingId : '', body.quantity, body.expectedQuantity)
    return NextResponse.json({ ok: true, result })
  } catch (error) { return danceFloorRouteError(error) }
}
