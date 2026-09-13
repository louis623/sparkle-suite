import { NextResponse } from 'next/server'

import { loadAmethystTradeBoardPreviewListings } from '@/lib/amethyst/trade-board-listings'
import { loadAmethystHomepageUpcomingShows } from '@/lib/amethyst/homepage-upcoming-shows'
import {
  buildAmethystHomepageBootstrapScript,
  enrichAmethystHomepageFeatureData,
} from '@/lib/amethyst/homepage-template-data'
import { loadAmethystPreviewTemplateData } from '@/lib/amethyst/preview-template-data'
import { resolveAmethystPreviewRep } from '@/lib/amethyst/preview-rep'
import { resolveAmethystRequestCustomDomainHost } from '@/lib/amethyst/host-routing'
import {
  applyCustomDomainToHomepageEvents,
  applyCustomDomainToTemplateData,
  applyPublicSiteSlugToHomepageEvents,
  applyPublicSiteSlugToTemplateData,
} from '@/lib/amethyst/public-site-links'
import { resolveAmethystRequestTarget } from '@/lib/amethyst/request-rep-target'
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
  const [events, templateData] = await Promise.all([
    loadAmethystHomepageUpcomingShows({ ...lookupTarget, targeted }),
    loadAmethystPreviewTemplateData(lookupTarget),
  ])
  const featureRepId = targeted
    ? await resolveHomepageFeatureRepId(lookupTarget)
    : null
  const [tradeBoardListings, liveQueueSnapshot] = targeted
    ? await Promise.all([
        loadAmethystTradeBoardPreviewListings({
          ...lookupTarget,
          repId: featureRepId,
          targeted: true,
          limit: 8,
        }),
        loadHomepageLiveQueueSnapshot(featureRepId),
      ])
    : [[], null]
  const linkedTemplateData = applyPublicSiteSlugToTemplateData(
    templateData,
    publicSiteSlug,
  )
  const customerTemplateData = applyCustomDomainToTemplateData(
    linkedTemplateData,
    requestCustomDomain,
  )
  const linkedEvents = applyCustomDomainToHomepageEvents(
    applyPublicSiteSlugToHomepageEvents(events, publicSiteSlug),
    requestCustomDomain,
  )

  return new NextResponse(
    buildAmethystHomepageBootstrapScript(
      enrichAmethystHomepageFeatureData(customerTemplateData.homepage, {
        liveQueueSnapshot,
        tradeBoardListings,
      }),
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
