import { getEffectiveLiveQueueSnapshot } from '@/lib/live-lineup/service'
import { resolveAmethystPreviewRep } from '@/lib/amethyst/preview-rep'
import { createAdminClient } from '@/lib/supabase/admin'
import { homepageSmokeReview } from '@/lib/amethyst/homepage-smoke-review'
import { loadAmethystHomepageUpcomingShows, loadLineupNextShow } from '@/lib/amethyst/homepage-upcoming-shows'
import { buildLineupCalendar } from '@/lib/amethyst/lineup-calendar'
import { buildPublicLiveLineup, requestedLineupPresentation } from '@/lib/amethyst/public-live-lineup'
import { NextResponse } from 'next/server'

import { loadAmethystPreviewTemplateData } from '@/lib/amethyst/preview-template-data'
import { resolveAmethystRequestCustomDomainHost } from '@/lib/amethyst/host-routing'
import {
  applyCustomDomainToTemplateData,
  applyPublicSiteSlugToTemplateData,
} from '@/lib/amethyst/public-site-links'
import { resolveAmethystRequestTarget } from '@/lib/amethyst/request-rep-target'
import { loadAmethystTradeBoardPreviewListings } from '@/lib/amethyst/trade-board-listings'
import {
  pantryRequestHost,
  restrictPantryTemplateData,
} from '@/lib/bling-kitchen/pantry-access'
import { buildAmethystTradeBootstrapScript } from '@/lib/amethyst/trade-template-data'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const target = resolveAmethystRequestTarget(request)
  const requestCustomDomain = resolveAmethystRequestCustomDomainHost(request)
  const repId = target.repId ?? target.customDomain
  const targeted = target.targeted
  const publicSiteSlug = target.publicSiteSlug
  const lookupTarget = {
    ...(publicSiteSlug ? { publicSiteSlug } : {}),
    repId,
  }
  const [listings, templateData, events, lineupSnapshot, nextShow] = await Promise.all([
    loadAmethystTradeBoardPreviewListings({ ...lookupTarget, targeted }),
    loadAmethystPreviewTemplateData(lookupTarget),
    loadAmethystHomepageUpcomingShows({ ...lookupTarget, targeted }),
    targeted ? Promise.resolve().then(async()=>{
      const admin = createAdminClient()
      const rep = await resolveAmethystPreviewRep(admin,{...lookupTarget,select:'id, email, public_site_slug',strict:true})
      return rep ? getEffectiveLiveQueueSnapshot(admin,rep.id) : null
    }).catch(()=>null) : null,
    targeted ? loadLineupNextShow(lookupTarget) : null,
  ])
  const linkedTemplateData = applyPublicSiteSlugToTemplateData(
    homepageSmokeReview(templateData, new URL(request.url), publicSiteSlug),
    publicSiteSlug,
  )
  const customerTemplateData = restrictPantryTemplateData(
    applyCustomDomainToTemplateData(linkedTemplateData, requestCustomDomain),
    {
      repId,
      publicSiteSlug,
      customDomain: requestCustomDomain,
      requestHost: pantryRequestHost(request),
    },
  )

  return new NextResponse(
    buildAmethystTradeBootstrapScript(
      {
        ...customerTemplateData.trade,
        ...buildLineupCalendar(customerTemplateData.homepage, events),
        ...buildPublicLiveLineup(lineupSnapshot, requestedLineupPresentation(request),nextShow),
      },
      listings,
      customerTemplateData.appearancePreset,
      { publicSiteSlug, repId, targeted },
    ),
    {
      headers: {
        'content-type': 'application/javascript; charset=utf-8',
        'cache-control': 'no-store',
      },
    },
  )
}
