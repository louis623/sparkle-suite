import { NextResponse } from 'next/server'
import { AuthError, getAuthenticatedNicNacContext } from '@/lib/nic-nac/auth'
import { getAvailableAmethystSkinIdsForRep } from '@/lib/amethyst/skin-access'
import { skinsOfferedToRep, type SkinOfferRow } from '@/lib/amethyst/skin-offer'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { repId, supabase } = await getAuthenticatedNicNacContext()
    const availableIds = await getAvailableAmethystSkinIdsForRep(supabase, repId)
    const catalog = await createAdminClient()
      .from('amethyst_skin_catalog')
      .select('skin_id, visibility, owner_rep_id')
    if (catalog.error) {
      return NextResponse.json({ error: 'Unable to load customer-site themes.' }, { status: 500 })
    }
    const offered = skinsOfferedToRep({
      repId,
      availableIds,
      catalog: (catalog.data ?? []) as SkinOfferRow[],
    })
    return NextResponse.json(offered)
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    }

    return NextResponse.json(
      { error: 'Unable to load customer-site themes.' },
      { status: 500 },
    )
  }
}
