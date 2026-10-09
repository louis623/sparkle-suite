import { NextResponse } from 'next/server'
import { getPaidNicNacContext, AuthError } from '@/lib/nic-nac/auth'
import { ServiceError } from '@/lib/services/errors'
import { getSiteSettingsDashboard } from '@/lib/services/site-settings'
import { isCardQrSmokeRuntime } from '@/lib/workspace/card-qr/access'
import {
  buildCardQrDestinationForRep,
  isReadyCardQrDestination,
  resolveCardQrRequestOrigin,
} from '@/lib/workspace/card-qr/destination'

export function cardQrErrorResponse(error: unknown) {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }
  if (error instanceof ServiceError) {
    return NextResponse.json(
      { code: error.code, error: error.userMessage },
      { status: error.statusCode },
    )
  }
  if (error instanceof SyntaxError) {
    return NextResponse.json({ error: 'Invalid request payload.' }, { status: 400 })
  }
  throw error
}

export async function loadCardQrContext(request: Request) {
  if (!isCardQrSmokeRuntime()) {
    throw new ServiceError({
      code: 'CARD_QR_SMOKE_ONLY',
      message: 'Cards & QR is smoke-only',
      userMessage: 'Cards & QR is available on Smoke only.',
      statusCode: 404,
    })
  }

  const context = await getPaidNicNacContext()
  const origin = resolveCardQrRequestOrigin(request)
  const destinationUrl = buildCardQrDestinationForRep(
    {
      customDomain: context.rep.custom_domain,
      publicSiteSlug: context.rep.public_site_slug,
      repId: context.repId,
    },
    origin,
  )

  if (!isReadyCardQrDestination(destinationUrl) || !destinationUrl) {
    throw new ServiceError({
      code: 'CARD_QR_DESTINATION_MISSING',
      message: 'Rep has no customer site URL',
      userMessage: 'Finish the customer site address before this QR can be made.',
      statusCode: 409,
    })
  }

  const settings = await getSiteSettingsDashboard(context.supabase, context.repId)
  // The dashboard normalizes an unknown theme to Morganite. The flyer must
  // see the saved id itself and refuse it instead of that fallback.
  const savedTheme = await context.supabase
    .from('site_settings')
    .select('appearance_preset')
    .eq('rep_id', context.repId)
    .maybeSingle()
  if (savedTheme.error) {
    throw new ServiceError({
      code: 'CARD_QR_THEME_LOOKUP_FAILED',
      message: 'failed to read the saved site theme',
      userMessage: "Couldn't read this site's theme.",
      statusCode: 500,
      cause: savedTheme.error,
    })
  }
  const savedAppearancePreset = savedTheme.data?.appearance_preset
  const appearancePreset =
    typeof savedAppearancePreset === 'string' && savedAppearancePreset.trim()
      ? savedAppearancePreset
      : settings.appearancePreset

  return {
    ...context,
    origin,
    destinationUrl,
    customDomain: context.rep.custom_domain,
    settings: {
      ...settings,
      appearancePreset,
    },
  }
}
