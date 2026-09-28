import { buildPublicLiveLineup, requestedLineupPresentation } from '@/lib/amethyst/public-live-lineup'
import { NextResponse } from 'next/server'

import { buildAmethystJoinBootstrapScript } from '@/lib/amethyst/join-template-data'
import { loadAmethystPreviewTemplateData } from '@/lib/amethyst/preview-template-data'
import { canServeTargetedAmethystJoinPage } from '@/lib/amethyst/join-page-access'
import { resolveAmethystRequestCustomDomainHost } from '@/lib/amethyst/host-routing'
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
  const [templateData, tradeBoardListings] = await Promise.all([
    loadAmethystPreviewTemplateData(lookupTarget),
    loadAmethystTradeBoardPreviewListings({
      ...lookupTarget,
      targeted,
      limit: 8,
    }),
  ])
  const customerTemplateData = applyCustomDomainToTemplateData(
    templateData,
    requestCustomDomain,
  )

  return new NextResponse(
    buildAmethystJoinBootstrapScript(
      { ...customerTemplateData.join, ...buildPublicLiveLineup(null, requestedLineupPresentation(request)) },
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
