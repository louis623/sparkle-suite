import { NextResponse } from 'next/server'
import { allowTradeRequest } from '@/lib/amethyst/trade-request-rate-limit'
import { readSwapJson, SwapHttpError, swapIpHash, verifySwapOrigin } from '@/lib/amethyst/swap-http'
import { resolveAmethystPreviewRep } from '@/lib/amethyst/preview-rep'
import { resolveAmethystRequestTarget } from '@/lib/amethyst/request-rep-target'
import { screenTradeRequestForListing, TRADE_REQUEST_OFFERED_FAMILY_MAX_LENGTH } from '@/lib/services/trade-requests'
import { screenTradeOffer } from '@/lib/services/trade-request-matcher'
import { createAdminClient } from '@/lib/supabase/admin'
import { ServiceError } from '@/lib/services/errors'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    verifySwapOrigin(request)
    const body = await readSwapJson(request, 4096)
    const listingId = typeof body.listingId === 'string' ? body.listingId.trim() : ''
    const offeredFamily = typeof body.offeredFamily === 'string' ? body.offeredFamily.trim() : null
    const offeredType = typeof body.offeredType === 'string' ? body.offeredType.trim() : null
    if (!listingId || listingId.length > 100 || (offeredFamily?.length ?? 0) > TRADE_REQUEST_OFFERED_FAMILY_MAX_LENGTH) {
      return NextResponse.json({ error: 'Invalid swap details.' }, { status: 400 })
    }
    const throttle = allowTradeRequest(request, listingId, 'screen', swapIpHash(request))
    if (!throttle.allowed) return NextResponse.json({error:'Try screening again shortly.'}, {status:429,headers:{'Retry-After':String(throttle.retryAfter)}})
    const admin = createAdminClient()
    const target = resolveAmethystRequestTarget(request)
    const targetRep = target.targeted
      ? await resolveAmethystPreviewRep(admin, {
          env: process.env,
          publicSiteSlug: target.publicSiteSlug,
          repId: target.repId ?? target.customDomain,
          select: 'id, email',
        })
      : null
    if (target.targeted && !targetRep?.id) return NextResponse.json({ error: 'Swap guidance unavailable.' }, { status: 503 })
    const screen = await screenTradeRequestForListing(admin, listingId, offeredFamily, offeredType, targetRep?.id)
    const alternatives: Array<{ listingId: string; designName: string; collectionName: string; typePrefix: string; photoUrl: string | null }> = []
    if (screen.screening.status === 'mismatch') {
      const { data: netRows, error: netError } = await admin.rpc('list_amethyst_public_trade_board_net_v2', {
        p_rep_id: screen.repId,
        p_limit: 100,
      })
      if (netError) throw netError
      const ids = ((netRows ?? []) as Array<{ listing_id: string }>).map((row) => row.listing_id).filter((id) => id !== listingId)
      if (ids.length > 0) {
        const { data: rows, error } = await admin.from('trade_listings')
          .select('id, listing_photo_url, manual_collection_family, manual_collection_name, manual_type_prefix, design:jewelry_designs(design_name, type_prefix, canonical_photo_url, collection:collections(name))')
          .in('id', ids)
        if (error) throw error
        for (const row of rows ?? []) {
          const design = Array.isArray(row.design) ? row.design[0] : row.design
          const collection = design?.collection as { name: string } | Array<{ name: string }> | null | undefined
          const family = row.manual_collection_family ?? (Array.isArray(collection) ? collection[0]?.name : collection?.name) ?? null
          const type = row.manual_type_prefix ?? design?.type_prefix ?? null
          if (screenTradeOffer(offeredFamily, offeredType, family, type).status !== 'likely_match') continue
          alternatives.push({
            listingId: row.id,
            designName: design?.design_name ?? row.manual_collection_name ?? 'Available dancer',
            collectionName: family ?? 'Collection to verify',
            typePrefix: type ?? '',
            photoUrl: row.listing_photo_url ?? design?.canonical_photo_url ?? null,
          })
          if (alternatives.length >= 4) break
        }
      }
    }
    return NextResponse.json({ screening: screen.screening, alternatives }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    if (error instanceof SwapHttpError) return NextResponse.json({error:error.message},{status:error.status})
    if (error instanceof ServiceError) return NextResponse.json({ code: error.code, error: error.userMessage }, { status: error.statusCode })
    console.error('[amethyst/trade-requests/screen] Error:', error)
    return NextResponse.json({ error: 'Swap guidance unavailable.' }, { status: 500 })
  }
}
