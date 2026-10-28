import { NextResponse } from 'next/server'
import type { AmethystPreviewTemplateData } from './preview-template-data'
import { loadAmethystTradeBoardPreviewListings } from './trade-board-listings'
import { loadAmethystHomepageUpcomingShows } from './homepage-upcoming-shows'
import { buildLineupCalendar } from './lineup-calendar'
import { buildPublicLiveLineup, requestedLineupPresentation } from './public-live-lineup'
import { buildAmethystTradeBootstrapScript } from './trade-template-data'
import { buildAmethystJoinBootstrapScript } from './join-template-data'
import { applyPublicSiteSlugToTemplateData, applyCustomDomainToTemplateData } from './public-site-links'
import { resolveAmethystRequestCustomDomainHost } from './host-routing'
import { restrictPantryTemplateData, pantryRequestHost } from '@/lib/bling-kitchen/pantry-access'

/** Demo SSR only. All required content is read concurrently and shipped in HTML;
 * no delayed client template fetch and no data cache. The old APIs stay intact. */
export async function buildCustomerPageBootstrapResponse(page: 'trade' | 'join', request: Request, loaded: {
  templateData: Promise<AmethystPreviewTemplateData>; repId: string; publicSiteSlug: string;
}) {
  const target = { repId: loaded.repId, publicSiteSlug: loaded.publicSiteSlug, targeted: true }
  const [template, listings, events] = await Promise.all([
    loaded.templateData,
    loadAmethystTradeBoardPreviewListings({ ...target, ...(page === 'join' ? { limit: 8 } : {}) }),
    loadAmethystHomepageUpcomingShows(target),
  ])
  const customDomain = resolveAmethystRequestCustomDomainHost(request)
  const data = restrictPantryTemplateData(applyCustomDomainToTemplateData(
    applyPublicSiteSlugToTemplateData(template, loaded.publicSiteSlug), customDomain,
  ), { repId: loaded.repId, publicSiteSlug: loaded.publicSiteSlug, customDomain, requestHost: pantryRequestHost(request) })
  const calendar = buildLineupCalendar(data.homepage, events)
  const lineup = buildPublicLiveLineup(null, requestedLineupPresentation(request))
  const bootstrap = page === 'trade'
    ? buildAmethystTradeBootstrapScript({ ...data.trade, ...calendar, ...lineup }, listings, data.appearancePreset, target)
    : buildAmethystJoinBootstrapScript({ ...data.join, ...calendar, ...lineup }, data.appearancePreset, target, listings)
  return new NextResponse(bootstrap, { headers: {
    'content-type': 'application/javascript; charset=utf-8', 'cache-control': 'no-store', 'x-sparkle-page-data': 'ssr',
  } })
}
