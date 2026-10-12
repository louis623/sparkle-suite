import { ServiceError } from '@/lib/services/errors'
import {
  getCardQrPack,
  isCardQrPackQuantity,
  type CardQrPackQuantity,
} from '@/lib/workspace/card-qr/pricing'
import type { CardQrDesign } from '@/lib/workspace/card-qr/design'
import { cardQrStripeRuntime } from '@/lib/workspace/card-qr/access'

export const CARD_QR_STRIPE_PRODUCT = 'workspace_business_cards'

/** Test keys always; live keys only on Live with CARD_QR_STRIPE_LIVE=true. Returns whether the key is live. */
export function assertCardQrStripeTestKey(secretKey: string | undefined, env: NodeJS.ProcessEnv = process.env): boolean {
  const key = secretKey?.trim() ?? ''
  if (key.startsWith('sk_live_') && cardQrStripeRuntime(env).allowLive) return true
  if (key.startsWith('sk_live_')) {
    throw new ServiceError({
      code: 'CARD_QR_LIVE_STRIPE_BLOCKED',
      message: 'Business card checkout refused a live Stripe secret.',
      userMessage: 'Business card checkout is not available right now.',
      statusCode: 403,
    })
  }
  if (!key.startsWith('sk_test_')) {
    throw new ServiceError({
      code: 'CARD_QR_STRIPE_TEST_REQUIRED',
      message: 'Business-card checkout requires a Stripe test secret unless CARD_QR_STRIPE_LIVE=true on Live.',
      userMessage:
        'Card checkout is not set up yet. Your QR and the free flyer still work.',
      statusCode: 503,
    })
  }
  return false
}

export interface CardQrCheckoutSessionShape {
  id?: string | null
  mode?: string | null
  livemode?: boolean | null
  payment_status?: string | null
  amount_total?: number | null
  currency?: string | null
  client_reference_id?: string | null
  payment_intent?: string | { id?: string | null } | null
  metadata?: Record<string, string | null | undefined> | null
}

export function buildCardQrCheckoutMetadata(input: {
  repId: string
  quantity: CardQrPackQuantity
  destinationUrl: string
  design: CardQrDesign
  appearancePreset?: string | null
  orderId?: string | null
  orderNumber?: string | null
}) {
  const pack = getCardQrPack(input.quantity)
  return {
    ...(input.orderId ? { order_id: input.orderId } : {}),
    ...(input.orderNumber ? { order_number: input.orderNumber } : {}),
    sparkle_product: CARD_QR_STRIPE_PRODUCT,
    environment: cardQrStripeRuntime().environment,
    rep_id: input.repId,
    quantity: String(pack.quantity),
    amount_cents: String(pack.amountCents),
    destination_url: input.destinationUrl.slice(0, 450),
    template_id: input.design.templateId,
    appearance_preset: (input.appearancePreset ?? '').slice(0, 80),
    design: JSON.stringify(input.design).slice(0, 480),
  }
}

export function buildCardQrCheckoutParams(input: {
  repId: string
  email: string
  quantity: CardQrPackQuantity
  destinationUrl: string
  origin: string
  design: CardQrDesign
  appearancePreset?: string | null
  orderId?: string | null
  orderNumber?: string | null
}) {
  const pack = getCardQrPack(input.quantity)
  const origin = input.origin.replace(/\/$/, '')
  return {
    mode: 'payment' as const,
    customer_email: input.email,
    client_reference_id: input.repId,
    payment_method_types: ['card' as const],
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'usd' as const,
          unit_amount: pack.amountCents,
          product_data: {
            name: `Sparkle Suite business cards · ${pack.label}`,
            description: input.orderNumber
              ? `Order ${input.orderNumber}. All-in price: print, tax, and UPS Ground shipping.`
              : 'All-in price: print, tax, and UPS Ground shipping.',
          },
        },
      },
    ],
    success_url: `${origin}/nic-nac?section=card-qr&cardOrder=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/nic-nac?section=card-qr&cardOrder=cancelled`,
    metadata: buildCardQrCheckoutMetadata(input),
    ...(input.orderNumber
      ? {
          payment_intent_data: {
            description: `Sparkle Suite business cards ${input.orderNumber}`,
            metadata: { sparkle_product: CARD_QR_STRIPE_PRODUCT, order_number: input.orderNumber, rep_id: input.repId },
          },
        }
      : {}),
  }
}

export interface PaidCardQrOrder {
  quantity: CardQrPackQuantity
  amountCents: number
  currency: 'usd'
  checkoutSessionId: string
  paymentIntentId: string | null
  destinationUrl: string
  templateId: string
  designJson: string
}

export function readPaidCardQrOrder(
  session: CardQrCheckoutSessionShape,
  repId: string,
): PaidCardQrOrder {
  const metadata = session.metadata ?? {}
  const quantity = Number(metadata.quantity)
  if (
    metadata.sparkle_product !== CARD_QR_STRIPE_PRODUCT ||
    metadata.environment !== cardQrStripeRuntime().environment ||
    metadata.rep_id !== repId ||
    session.client_reference_id !== repId ||
    session.mode !== 'payment' ||
    (session.livemode !== false && !(session.livemode === true && cardQrStripeRuntime().allowLive)) ||
    session.payment_status !== 'paid' ||
    !isCardQrPackQuantity(quantity)
  ) {
    throw new ServiceError({
      code: 'CARD_QR_ORDER_NOT_PAID',
      message: 'Checkout session is not a paid business-card order for this rep in this environment.',
      userMessage: 'That checkout is not a paid business-card order for this workspace.',
      statusCode: 409,
    })
  }

  const pack = getCardQrPack(quantity)
  if (session.amount_total !== pack.amountCents || session.currency !== 'usd') {
    throw new ServiceError({
      code: 'CARD_QR_ORDER_AMOUNT_MISMATCH',
      message: 'Paid Checkout amount does not match the locked card price.',
      userMessage: 'The paid amount does not match the card price. No order was recorded.',
      statusCode: 409,
    })
  }

  const paymentIntent = session.payment_intent
  const paymentIntentId =
    typeof paymentIntent === 'string'
      ? paymentIntent
      : paymentIntent?.id ?? null

  return {
    quantity,
    amountCents: pack.amountCents,
    currency: 'usd',
    checkoutSessionId: session.id ?? '',
    paymentIntentId,
    destinationUrl: metadata.destination_url ?? '',
    templateId: metadata.template_id ?? 'match-site',
    designJson: metadata.design ?? '',
  }
}
