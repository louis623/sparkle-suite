import { NextResponse } from 'next/server'
import { getPaidNicNacContext } from '@/lib/nic-nac/auth'
import { issueDanceFloorPhotoUpload } from '@/lib/services/dance-floor-photos'
import { danceFloorRouteError } from '@/lib/nic-nac/dance-floor-route-error'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function POST(request: Request) {
  try {
    const { repId, supabase } = await getPaidNicNacContext()
    const body = await request.json()
    const result = await issueDanceFloorPhotoUpload(supabase, repId, typeof body?.listingId === 'string' ? body.listingId : '')
    return NextResponse.json(result)
  } catch (error) { return danceFloorRouteError(error) }
}
