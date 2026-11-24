import { NextResponse } from 'next/server'
import { AuthError, getAuthenticatedNicNacContext } from '@/lib/nic-nac/auth'
import { getAvailableAmethystSkinIdsForRep } from '@/lib/amethyst/skin-access'
import { repQualifiesForInternalDemo, skinsOfferedToRep, type SkinOfferRow } from '@/lib/amethyst/skin-offer'
import { isReviewerSmokeEmail } from '@/lib/reviewer-smoke/identity'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { repId, supabase } = await getAuthenticatedNicNacContext()
    const availableIds = await getAvailableAmethystSkinIdsForRep(supabase, repId)
    const admin = createAdminClient()
    const [catalog, repRow] = await Promise.all([
      admin.from('amethyst_skin_catalog').select('skin_id, visibility, owner_rep_id, allow_internal_demo'),
      admin.from('reps').select('email, status, account_classification, finder_directory_visible, custom_domain').eq('id', repId).maybeSingle(),
    ])
    if (catalog.error || repRow.error) {
      return NextResponse.json({ error: 'Unable to load customer-site themes.' }, { status: 500 })
    }
    const rep = repRow.data
    const offered = skinsOfferedToRep({
      repId,
      availableIds,
      catalog: (catalog.data ?? []) as SkinOfferRow[],
      internalDemo: repQualifiesForInternalDemo(rep),
      reviewer: isReviewerSmokeEmail(rep?.email),
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
