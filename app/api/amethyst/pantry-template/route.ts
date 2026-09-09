import { NextResponse } from 'next/server'
import { resolvePublicSiteVisibility, type PublicSiteVisibility } from '@/lib/public-site/visibility'

import {
  applyCustomDomainToPantryTemplateData,
  applyPublicSiteSlugToPantryTemplateData,
  buildBlingKitchenPantryTemplateData,
  buildAmethystPantryBootstrapScript,
  defaultAmethystPantryTemplateData,
  mapPublicSiteRecipeToPantryRecipe,
} from '@/lib/amethyst/pantry-template-data'
import { resolveAmethystPreviewRep } from '@/lib/amethyst/preview-rep'
import { resolveAmethystRequestCustomDomainHost } from '@/lib/amethyst/host-routing'
import { resolveAmethystRequestTarget } from '@/lib/amethyst/request-rep-target'
import { BLING_KITCHEN_PROFILE } from '@/lib/bling-kitchen/profile'
import { getSiteSettingsDashboard } from '@/lib/services/site-settings'
import { getPublicSiteRecipes } from '@/lib/services/site-recipes'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

function isBlingKitchenTarget(
  publicSiteSlug: string | null,
  email: string | null | undefined,
) {
  const slug = publicSiteSlug?.trim().toLowerCase()
  const normalizedEmail = email?.trim().toLowerCase()
  return (
    slug === BLING_KITCHEN_PROFILE.publicSiteSlug ||
    normalizedEmail === BLING_KITCHEN_PROFILE.email
  )
}

export async function GET(request: Request) {
  const target = resolveAmethystRequestTarget(request)
  const requestCustomDomain = resolveAmethystRequestCustomDomainHost(request)
  const rawRepId = target.repId ?? target.customDomain
  const targeted = target.targeted
  const publicSiteSlug = target.publicSiteSlug
  let repId = rawRepId
  let repEmail: string | null = null
  let visibility: PublicSiteVisibility | undefined
  let baseTemplateData = defaultAmethystPantryTemplateData
  let appearancePreset = defaultAmethystPantryTemplateData.appearancePreset

  try {
    const admin = createAdminClient()
    const rep = await resolveAmethystPreviewRep(admin, {
      ...(publicSiteSlug ? { publicSiteSlug } : {}),
      repId: rawRepId,
      select: 'id, email',
    })

    if (rep) {
      repId = rep.id
      repEmail = rep.email
      try {
        const settings = await getSiteSettingsDashboard(admin, rep.id)
        appearancePreset = settings.appearancePreset
        visibility = resolvePublicSiteVisibility(settings)
      } catch {
        appearancePreset = defaultAmethystPantryTemplateData.appearancePreset
      }
      const recipes = await getPublicSiteRecipes(admin, rep.id, {
        visibleOnly: true,
      })
      if (recipes.length > 0) {
        baseTemplateData = buildBlingKitchenPantryTemplateData(
          recipes.map(mapPublicSiteRecipeToPantryRecipe),
          { appearancePreset },
        )
      } else if (isBlingKitchenTarget(publicSiteSlug, rep.email)) {
        baseTemplateData = buildBlingKitchenPantryTemplateData(undefined, {
          appearancePreset,
        })
      } else {
        baseTemplateData = buildBlingKitchenPantryTemplateData([], {
          appearancePreset,
        })
      }
    } else if (!isBlingKitchenTarget(publicSiteSlug, null)) {
      baseTemplateData = buildBlingKitchenPantryTemplateData([])
    }
  } catch {
    baseTemplateData = isBlingKitchenTarget(publicSiteSlug, repEmail)
      ? defaultAmethystPantryTemplateData
      : buildBlingKitchenPantryTemplateData([])
  }

  const templateData = applyPublicSiteSlugToPantryTemplateData(
    {
      ...baseTemplateData,
      visibility,
      appearancePreset,
    },
    publicSiteSlug,
  )
  const customerTemplateData = applyCustomDomainToPantryTemplateData(
    templateData,
    requestCustomDomain,
  )

  return new NextResponse(
    buildAmethystPantryBootstrapScript(customerTemplateData, {
      publicSiteSlug,
      repId,
      targeted,
    }),
    {
      headers: {
        'content-type': 'application/javascript; charset=utf-8',
        'cache-control': 'no-store',
      },
    },
  )
}
