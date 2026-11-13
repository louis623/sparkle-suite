import { loadAmethystTradeBoardPreviewListings } from '@/lib/amethyst/trade-board-listings'
import { resolveAmethystRequestTarget } from '@/lib/amethyst/request-rep-target'
import { readSwapPhotoPolicy } from '@/lib/amethyst/swap-photo-policy'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  const target = resolveAmethystRequestTarget(request)
  const listings = await loadAmethystTradeBoardPreviewListings({
    ...(target.publicSiteSlug ? { publicSiteSlug: target.publicSiteSlug } : {}),
    repId: target.repId ?? target.customDomain,
    targeted: target.targeted,
  })

  return Response.json(
    new URL(request.url).searchParams.get('photoPolicy') === '1'
      ? { listings, photoPolicy: await readSwapPhotoPolicy(createAdminClient()) }
      : { listings },
    {
      headers: {
        'cache-control': 'no-store',
      },
    },
  )
}
