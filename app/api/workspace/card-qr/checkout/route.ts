import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { parseCardQrDesign } from '@/lib/workspace/card-qr/design'
import {
  assertCardQrStripeTestKey,
  buildCardQrCheckoutParams,
} from '@/lib/workspace/card-qr/checkout'
import {
  cardQrErrorResponse,
  loadCardQrContext,
} from '@/lib/workspace/card-qr/context'
import { isCardQrPackQuantity } from '@/lib/workspace/card-qr/pricing'
import { ServiceError } from '@/lib/services/errors'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const context = await loadCardQrContext(request)
    assertCardQrStripeTestKey(process.env.STRIPE_SECRET_KEY)
    const body = await request.json().catch(() => {
      throw new SyntaxError('Invalid request payload.')
    })
    const quantity =
      body && typeof body === 'object'
        ? (body as { quantity?: unknown }).quantity
        : null
    if (!isCardQrPackQuantity(quantity)) {
      throw new ServiceError({
        code: 'CARD_QR_QUANTITY_INVALID',
        message: 'Business card quantity must be 500 or 1000.',
        userMessage: 'Choose 500 or 1,000 cards.',
        statusCode: 400,
      })
    }
    const record = body && typeof body === 'object'
      ? (body as { design?: unknown; appearancePreset?: unknown })
      : {}
    const design = parseCardQrDesign(record.design)
    const appearancePreset =
      typeof record.appearancePreset === 'string' ? record.appearancePreset : null
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
      apiVersion: '2026-03-25.dahlia',
      typescript: true,
    })
    const session = await stripe.checkout.sessions.create(
      buildCardQrCheckoutParams({
        repId: context.repId,
        email: context.rep.email,
        quantity,
        destinationUrl: context.destinationUrl,
        origin: context.origin,
        design,
        appearancePreset,
      }),
    )
    if (session.livemode || !session.url) {
      throw new ServiceError({
        code: 'CARD_QR_LIVE_STRIPE_BLOCKED',
        message: 'Refused a live or incomplete business-card Checkout session.',
        userMessage: 'Business card checkout stays on Smoke test mode.',
        statusCode: 403,
      })
    }
    return NextResponse.json({ url: session.url })
  } catch (error) {
    return cardQrErrorResponse(error)
  }
}
