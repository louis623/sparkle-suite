import { withinHomepageDataBudget } from './homepage-data-budget'
import { buildLineupCalendar } from '@/lib/amethyst/lineup-calendar'
import { requestedLineupPresentation } from '@/lib/amethyst/public-live-lineup'
import { NextResponse } from 'next/server'

import { loadAmethystTradeBoardPreviewListings } from '@/lib/amethyst/trade-board-listings'
import { loadAmethystHomepageUpcomingShows } from '@/lib/amethyst/homepage-upcoming-shows'
import {
  buildAmethystHomepageBootstrapScript,
  enrichAmethystHomepageFeatureData,
} from './legacy/homepage-template-data'
import type { AmethystPreviewTemplateData } from './preview-template-data'
import { resolveAmethystRequestCustomDomainHost } from '@/lib/amethyst/host-routing'
import {
  applyCustomDomainToHomepageEvents,
  applyCustomDomainToTemplateData,
  applyPublicSiteSlugToHomepageEvents,
  applyPublicSiteSlugToTemplateData,
} from '@/lib/amethyst/public-site-links'
import { resolveAmethystRequestTarget } from '@/lib/amethyst/request-rep-target'
import { DEFAULT_AMETHYST_APPEARANCE_PRESET } from '@/lib/amethyst/appearance-presets'
import {
  pantryRequestHost,
  restrictPantryTemplateData,
} from '@/lib/bling-kitchen/pantry-access'
import { applyBlingKitchenHomepage } from '@/lib/bling-kitchen/profile'
import { getEffectiveLiveQueueSnapshot } from '@/lib/live-lineup/service'
import { createAdminClient } from '@/lib/supabase/admin'
import type { LiveQueueSnapshot } from '@/lib/services/types'

export const dynamic = 'force-dynamic'

async function loadHomepageLiveQueueSnapshot(
  repId: string | null,
): Promise<LiveQueueSnapshot | null> {
  if (
    !repId ||
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return null
  }

  try {
    const admin = createAdminClient()
    return getEffectiveLiveQueueSnapshot(admin, repId)
  } catch {
    return null
  }
}

function isSmokeBlingKitchenPreview(request: Request) {
  if (process.env.NEXT_PUBLIC_SPARKLE_ENVIRONMENT !== 'smoke') return false
  return new URL(request.url).searchParams.get('skinPreview') === 'bling_kitchen_hybrid'
}

// V2 only: reuse the template promise and already verified route identity.
// No lineup cache: every request reads the current lineup concurrently with shows.
export async function buildHomepageBootstrapResponse(request: Request, loaded: {
  templateData: Promise<AmethystPreviewTemplateData>; repId: string;
}) {
  const target = resolveAmethystRequestTarget(request)
  const requestCustomDomain = resolveAmethystRequestCustomDomainHost(request)
  const repId = target.repId ?? target.customDomain
  const targeted = target.targeted
  const publicSiteSlug = target.publicSiteSlug
  const lookupTarget = {
    ...(publicSiteSlug ? { publicSiteSlug } : {}),
    repId,
  }
  let events: Awaited<ReturnType<typeof loadAmethystHomepageUpcomingShows>> = []
  let tradeBoardListings: Awaited<ReturnType<typeof loadAmethystTradeBoardPreviewListings>> = []
  let liveQueueSnapshot: LiveQueueSnapshot | null = null
  const pageData = Promise.all([
    loadAmethystHomepageUpcomingShows({ ...lookupTarget, targeted }).then(value => { events = value }),
    loadAmethystTradeBoardPreviewListings({ ...lookupTarget, repId: loaded.repId, targeted: true, limit: 8 }).then(value => { tradeBoardListings = value }),
    loadHomepageLiveQueueSnapshot(loaded.repId).then(value => { liveQueueSnapshot = value }),
  ])
  void pageData.catch(() => {})
  // The template is never cached. The extra budget starts only once it is ready.
  const templateData = await loaded.templateData
  const completed = await withinHomepageDataBudget(pageData)
  const deferred = completed === undefined

  const linkedTemplateData = applyPublicSiteSlugToTemplateData(
    templateData,
    publicSiteSlug,
  )
  const domainTemplateData = applyCustomDomainToTemplateData(
    linkedTemplateData,
    requestCustomDomain,
  )
  // Smoke-only design preview of Heather's BlingKitchen kitchen hero. Never on Live.
  const previewTemplateData = isSmokeBlingKitchenPreview(request)
    ? {
        ...domainTemplateData,
        homepage: applyBlingKitchenHomepage(domainTemplateData.homepage),
        appearancePreset: DEFAULT_AMETHYST_APPEARANCE_PRESET,
      }
    : domainTemplateData
  const customerTemplateData = restrictPantryTemplateData(previewTemplateData, {
    repId,
    publicSiteSlug,
    customDomain: requestCustomDomain,
    requestHost: pantryRequestHost(request),
  })
  const linkedEvents = applyCustomDomainToHomepageEvents(
    applyPublicSiteSlugToHomepageEvents(events, publicSiteSlug),
    requestCustomDomain,
  )

  return new NextResponse(
    buildAmethystHomepageBootstrapScript(
      {
        ...enrichAmethystHomepageFeatureData(customerTemplateData.homepage, {
          liveQueueSnapshot,
          lineupPresentation: requestedLineupPresentation(request),
          tradeBoardListings,
        }),
        ...buildLineupCalendar(customerTemplateData.homepage, linkedEvents),
      },
      linkedEvents,
      customerTemplateData.appearancePreset,
      { publicSiteSlug, repId, targeted },
    ) + (deferred ? `\nwindow.SPARKLE_DEFERRED_PAGE_DATA=${JSON.stringify(new URL('/api/amethyst/homepage-template' + new URL(request.url).search, request.url).pathname + new URL(request.url).search)};` : ''),
    {
      headers: {
        'content-type': 'application/javascript; charset=utf-8',
        'cache-control': 'no-store',
        'x-sparkle-page-data': deferred ? 'deferred' : 'complete',
      },
    },
  )
}
