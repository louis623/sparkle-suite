import { buildLineupCalendar } from '@/lib/amethyst/lineup-calendar'
import { requestedLineupPresentation } from '@/lib/amethyst/public-live-lineup'
import { NextResponse } from 'next/server'

import { loadAmethystTradeBoardPreviewListings } from '@/lib/amethyst/trade-board-listings'
import { loadAmethystHomepageUpcomingShows } from '@/lib/amethyst/homepage-upcoming-shows'
import {
  buildAmethystHomepageBootstrapScript,
  enrichAmethystHomepageFeatureData,
} from '@/lib/amethyst/homepage-template-data'
import { loadAmethystPreviewTemplateData, type AmethystPreviewTemplateData } from '@/lib/amethyst/preview-template-data'
import { resolveAmethystPreviewRep } from '@/lib/amethyst/preview-rep'
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
import { applySavedSignupDiscount, loadSavedSignupDiscount } from '@/lib/public-site/signup-discount-settings'
import { createAdminClient } from '@/lib/supabase/admin'
import type { LiveQueueSnapshot } from '@/lib/services/types'



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

async function resolveHomepageFeatureRepId(lookupTarget: {
  publicSiteSlug?: string
  repId?: string | null
}) {
  const fallbackRepId = lookupTarget.publicSiteSlug
    ? null
    : lookupTarget.repId?.trim() || null

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return fallbackRepId
  }

  try {
    const admin = createAdminClient()
    const rep = await resolveAmethystPreviewRep(admin, {
      env: process.env,
      ...lookupTarget,
      select: 'id, email',
    })
    return rep?.id ?? null
  } catch {
    return null
  }
}

function isSmokeBlingKitchenPreview(request: Request) {
  if (process.env.NEXT_PUBLIC_SPARKLE_ENVIRONMENT !== 'smoke') return false
  return new URL(request.url).searchParams.get('skinPreview') === 'bling_kitchen_hybrid'
}

export async function buildHomepageBootstrapResponse(request: Request, prefetched?: {
  templateData: AmethystPreviewTemplateData | Promise<AmethystPreviewTemplateData>
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
  // Feature identity has its own guarded resolver. Its reads can finish while
  // settings/roster/setup and calendar data are loading for this same request.
  const features = targeted
    ? resolveHomepageFeatureRepId(lookupTarget).then(featureRepId => Promise.all([
        loadAmethystTradeBoardPreviewListings({
          ...lookupTarget,
          repId: featureRepId,
          targeted: true,
          limit: 8,
        }),
        loadHomepageLiveQueueSnapshot(featureRepId),
        featureRepId ? loadSavedSignupDiscount(featureRepId) : Promise.resolve(null),
      ]).then(([tradeBoardListings, liveQueueSnapshot, savedDiscount]) => ({
        featureRepId,
        tradeBoardListings,
        liveQueueSnapshot,
        savedDiscount,
      })))
    : Promise.resolve({
        featureRepId: null as string | null,
        tradeBoardListings: [] as Awaited<ReturnType<typeof loadAmethystTradeBoardPreviewListings>>,
        liveQueueSnapshot: null as LiveQueueSnapshot | null,
        savedDiscount: null,
      })
  const [events, templateData, { featureRepId, tradeBoardListings, liveQueueSnapshot, savedDiscount }] = await Promise.all([
    loadAmethystHomepageUpcomingShows({ ...lookupTarget, targeted }),
    prefetched?.templateData ?? loadAmethystPreviewTemplateData(lookupTarget),
    features,
  ])
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

  const homepage = await applySavedSignupDiscount(
    {
      ...enrichAmethystHomepageFeatureData(customerTemplateData.homepage, {
        liveQueueSnapshot,
        lineupPresentation: requestedLineupPresentation(request),
        tradeBoardListings,
      }),
      ...buildLineupCalendar(customerTemplateData.homepage, linkedEvents),
    },
    featureRepId,
    async () => savedDiscount,
  )

  return new NextResponse(
    buildAmethystHomepageBootstrapScript(
      homepage,
      linkedEvents,
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
