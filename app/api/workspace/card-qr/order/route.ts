import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import {
  assertCardQrStripeTestKey,
  readPaidCardQrOrder,
} from '@/lib/workspace/card-qr/checkout'
import {
  cardQrErrorResponse,
  loadCardQrContext,
} from '@/lib/workspace/card-qr/context'
import { CARD_QR_FULFILLMENT_COPY } from '@/lib/workspace/card-qr/pricing'
import { fulfillPaidCardQrSession } from '@/lib/workspace/card-qr/order-fulfillment'
import { ServiceError } from '@/lib/services/errors'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const context = await loadCardQrContext(request)
    assertCardQrStripeTestKey(process.env.STRIPE_SECRET_KEY)
    const sessionId = new URL(request.url).searchParams.get('session_id')?.trim() ?? ''
    if (!sessionId.startsWith('cs_')) {
      throw new ServiceError({
        code: 'CARD_QR_ORDER_NOT_PAID',
        message: 'Missing Checkout session.',
        userMessage: 'That checkout is not a paid business-card order for this workspace.',
        statusCode: 400,
      })
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
      apiVersion: '2026-03-25.dahlia',
      typescript: true,
    })
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    readPaidCardQrOrder(session, context.repId)
    if (!session.metadata?.order_id) {
      throw new ServiceError({
        code: 'CARD_QR_ORDER_LEGACY_SESSION',
        message: 'Checkout session has no order_id (created before order numbers).',
        userMessage: 'We could not match this checkout to an order. Please contact support with your receipt.',
        statusCode: 409,
      })
    }
    // Success-page fallback: same once-only guard as the webhook. Whoever marks it paid first
    // sends the emails; the other sees already_paid.
    const result = await fulfillPaidCardQrSession(session, 'success_page')
    if (result.status !== 'paid' && result.status !== 'already_paid') {
      throw new ServiceError({
        code: 'CARD_QR_ORDER_NOT_PAID',
        message: `Fulfillment ${result.status}: ${'reason' in result ? result.reason : ''}`,
        userMessage: 'That checkout is not a paid business-card order for this workspace.',
        statusCode: 409,
      })
    }
    return NextResponse.json({
      ok: true,
      orderNumber: result.orderNumber,
      quantity: result.quantity,
      amountCents: result.amountCents,
      persistence: 'database',
      message: `${CARD_QR_FULFILLMENT_COPY} Order ${result.orderNumber}.`,
    })
  } catch (error) {
    return cardQrErrorResponse(error)
  }
}
