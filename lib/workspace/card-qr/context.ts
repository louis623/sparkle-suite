import { NextResponse } from 'next/server'
import { getPaidNicNacContext, AuthError } from '@/lib/nic-nac/auth'
import { ServiceError } from '@/lib/services/errors'
import { getSiteSettingsDashboard } from '@/lib/services/site-settings'
import { resolveCheckoutReturnOrigin } from '@/lib/stripe/return-origin'
import { isCardQrSmokeRuntime } from '@/lib/workspace/card-qr/access'
import {
  buildCardQrDestinationForRep,
  isReadyCardQrDestination,
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
  const origin = resolveCheckoutReturnOrigin(request)
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
      userMessage: 'Finish the customer site address before saving a QR.',
      statusCode: 409,
    })
  }

  const settings = await getSiteSettingsDashboard(context.supabase, context.repId)

  return {
    ...context,
    origin,
    destinationUrl,
    settings,
  }
}
