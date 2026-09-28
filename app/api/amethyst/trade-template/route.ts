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
  const [listings, templateData] = await Promise.all([
    loadAmethystTradeBoardPreviewListings({ ...lookupTarget, targeted }),
    loadAmethystPreviewTemplateData(lookupTarget),
  ])
  const linkedTemplateData = applyPublicSiteSlugToTemplateData(
    templateData,
    publicSiteSlug,
  )
  const customerTemplateData = applyCustomDomainToTemplateData(
    linkedTemplateData,
    requestCustomDomain,
  )

  return new NextResponse(
    buildAmethystTradeBootstrapScript(
      { ...customerTemplateData.trade, ...buildPublicLiveLineup(null, requestedLineupPresentation(request)) },
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
