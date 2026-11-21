import { getEffectiveLiveQueueSnapshot } from '@/lib/live-lineup/service'
import { resolveAmethystPreviewRep } from '@/lib/amethyst/preview-rep'
import { createAdminClient } from '@/lib/supabase/admin'
import { homepageSmokeReview } from '@/lib/amethyst/homepage-smoke-review'
import { loadAmethystHomepageUpcomingShows, loadLineupNextShow } from '@/lib/amethyst/homepage-upcoming-shows'
import { buildLineupCalendar } from '@/lib/amethyst/lineup-calendar'
import { buildPublicLiveLineup, requestedLineupPresentation } from '@/lib/amethyst/public-live-lineup'
import { NextResponse } from 'next/server'

import { buildAmethystJoinBootstrapScript } from '@/lib/amethyst/join-template-data'
import { loadAmethystPreviewTemplateData } from '@/lib/amethyst/preview-template-data'
import { indexPublicJoinTemplate } from '@/lib/amethyst/public-join-index'
import { canServeTargetedAmethystJoinPage } from '@/lib/amethyst/join-page-access'
import { resolveAmethystRequestCustomDomainHost } from '@/lib/amethyst/host-routing'
import {
  pantryRequestHost,
  restrictPantryTemplateData,
} from '@/lib/bling-kitchen/pantry-access'
import { applyCustomDomainToTemplateData } from '@/lib/amethyst/public-site-links'
import { resolveAmethystRequestTarget } from '@/lib/amethyst/request-rep-target'
import { loadAmethystTradeBoardPreviewListings } from '@/lib/amethyst/trade-board-listings'

export const runtime = 'nodejs'
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
  if (!(await canServeTargetedAmethystJoinPage(target))) {
    return new NextResponse('Not found', {
      status: 404,
      headers: { 'cache-control': 'no-store' },
    })
  }
  const [templateData, tradeBoardListings, events, lineupSnapshot, nextShow] = await Promise.all([
    loadAmethystPreviewTemplateData(lookupTarget),
    loadAmethystTradeBoardPreviewListings({
      ...lookupTarget,
      targeted,
      limit: 8,
    }),
    loadAmethystHomepageUpcomingShows({ ...lookupTarget, targeted }),
    targeted ? Promise.resolve().then(async()=>{
      const admin = createAdminClient()
      const rep = await resolveAmethystPreviewRep(admin,{...lookupTarget,select:'id, email, public_site_slug',strict:true})
      return rep ? getEffectiveLiveQueueSnapshot(admin,rep.id) : null
    }).catch(()=>null) : null,
    targeted ? loadLineupNextShow(lookupTarget) : null,
  ])
  const customerTemplateData = restrictPantryTemplateData(
    applyCustomDomainToTemplateData(
      await indexPublicJoinTemplate(homepageSmokeReview(templateData, new URL(request.url), publicSiteSlug), { repId }),
      requestCustomDomain,
    ),
    {
      repId,
      publicSiteSlug,
      customDomain: requestCustomDomain,
      requestHost: pantryRequestHost(request),
    },
  )

  return new NextResponse(
    buildAmethystJoinBootstrapScript(
      {
        ...customerTemplateData.join,
        ...buildLineupCalendar(customerTemplateData.homepage, events),
        ...buildPublicLiveLineup(lineupSnapshot, requestedLineupPresentation(request),nextShow),
      },
      customerTemplateData.appearancePreset,
      { publicSiteSlug, repId, targeted },
      tradeBoardListings,
    ),
    {
      headers: {
        'content-type': 'application/javascript; charset=utf-8',
        'cache-control': 'no-store',
      },
    },
  )
}
