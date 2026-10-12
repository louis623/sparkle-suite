import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { parseCardQrDesign } from '@/lib/workspace/card-qr/design'
import {
  assertCardQrStripeTestKey,
  readPaidCardQrOrder,
} from '@/lib/workspace/card-qr/checkout'
import {
  cardQrErrorResponse,
  loadCardQrContext,
} from '@/lib/workspace/card-qr/context'
import { CARD_QR_FULFILLMENT_COPY } from '@/lib/workspace/card-qr/pricing'
import { recordPaidCardQrOrder } from '@/lib/workspace/card-qr/store'
import { createAdminClient } from '@/lib/supabase/admin'
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
    const order = readPaidCardQrOrder(session, context.repId)
    if (session.metadata?.order_id) {
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
    }
    // Sessions created before order numbers existed.
    let persistence: 'database' | 'unavailable' = 'unavailable'
    try {
      const saved = await recordPaidCardQrOrder(createAdminClient(), {
        repId: context.repId,
        quantity: order.quantity,
        amountCents: order.amountCents,
        checkoutSessionId: order.checkoutSessionId || sessionId,
        paymentIntentId: order.paymentIntentId,
        destinationUrl: order.destinationUrl || context.destinationUrl,
        design: parseCardQrDesign(
          (() => {
            try {
              return order.designJson
                ? JSON.parse(order.designJson)
                : { templateId: order.templateId }
            } catch {
              return { templateId: order.templateId }
            }
          })(),
        ),
      })
      persistence = saved.persistence
    } catch {
      persistence = 'unavailable'
    }

    return NextResponse.json({
      ok: true,
      quantity: order.quantity,
      amountCents: order.amountCents,
      persistence,
      message: CARD_QR_FULFILLMENT_COPY,
    })
  } catch (error) {
    return cardQrErrorResponse(error)
  }
}
