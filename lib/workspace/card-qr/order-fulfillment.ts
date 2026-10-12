import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import { AMETHYST_SKIN_CARDS } from '@/lib/amethyst/skin-cards'
import { CARD_QR_STRIPE_PRODUCT, type CardQrCheckoutSessionShape } from '@/lib/workspace/card-qr/checkout'
import { getCardQrPack, isCardQrPackQuantity } from '@/lib/workspace/card-qr/pricing'
import { CARD_QR_PROOF_BUCKET } from '@/lib/workspace/card-qr/proof-snapshot'
import type { CardQrShipAddress } from '@/lib/workspace/card-qr/ship-address'
import {
  cardQrFulfillmentEmail,
  cardQrRepConfirmationEmail,
  sendCardQrEmailViaResend,
  type CardQrEmailSender,
  type CardQrOrderEmailFacts,
} from '@/lib/workspace/card-qr/order-emails'

export type CardQrPaidVia = 'webhook' | 'success_page'

export type CardQrFulfillmentResult =
  | { status: 'not_card_order' }
  | { status: 'refused'; reason: string }
  | { status: 'ignored'; reason: string }
  | { status: 'already_paid'; orderNumber: string; quantity: number; amountCents: number }
  | {
      status: 'paid'
      orderNumber: string
      quantity: number
      amountCents: number
      fulfillmentEmail: 'sent' | 'failed' | 'not_configured'
      repEmail: 'sent' | 'failed'
    }

interface Deps {
  db?: SupabaseClient
  send?: CardQrEmailSender
  fulfillmentTo?: string | null
}

const ORDER_COLUMNS =
  'id, order_number, rep_id, status, quantity, amount_cents, stripe_checkout_session_id, ship_address, design_theme, proof_pdf_path'

function themeLabel(theme: string | null) {
  if (!theme || theme === 'site') return "Rep's site theme"
  return AMETHYST_SKIN_CARDS.find((c) => c.id === theme)?.label ?? theme
}

/**
 * The one place a business-card order becomes paid. Used by the Stripe webhook and the
 * success-page fallback. The pending -> paid update is conditional, so only the first caller
 * wins; only that caller writes the ledger row and sends the emails.
 */
export async function fulfillPaidCardQrSession(
  session: CardQrCheckoutSessionShape,
  via: CardQrPaidVia,
  deps: Deps = {},
): Promise<CardQrFulfillmentResult> {
  const md = session.metadata ?? {}
  if (md.sparkle_product !== CARD_QR_STRIPE_PRODUCT) return { status: 'not_card_order' }
  if (session.livemode !== false || md.environment !== 'smoke') return { status: 'refused', reason: 'livemode_or_not_smoke' }
  if (session.mode !== 'payment') return { status: 'refused', reason: 'not_payment_mode' }
  if (session.payment_status !== 'paid') return { status: 'ignored', reason: 'not_paid' }
  const repId = md.rep_id ?? ''
  const orderId = md.order_id ?? ''
  const quantity = Number(md.quantity)
  if (!repId || session.client_reference_id !== repId) return { status: 'refused', reason: 'rep_mismatch' }
  if (!orderId) return { status: 'ignored', reason: 'no_order_id' }
  if (!isCardQrPackQuantity(quantity)) return { status: 'refused', reason: 'bad_quantity' }
  const pack = getCardQrPack(quantity)
  if (session.amount_total !== pack.amountCents || session.currency !== 'usd') return { status: 'refused', reason: 'amount_mismatch' }

  const db = deps.db ?? createAdminClient()
  const { data: order, error } = await db.from('rep_card_print_orders').select(ORDER_COLUMNS).eq('id', orderId).maybeSingle()
  if (error) throw new Error(`CARD_QR_ORDER_LOAD_FAILED: ${error.message}`)
  if (!order) return { status: 'refused', reason: 'order_not_found' }
  if (order.rep_id !== repId) return { status: 'refused', reason: 'order_rep_mismatch' }
  if (md.order_number && order.order_number !== md.order_number) return { status: 'refused', reason: 'order_number_mismatch' }
  if (order.stripe_checkout_session_id && order.stripe_checkout_session_id !== session.id) return { status: 'refused', reason: 'session_mismatch' }
  if (order.quantity !== quantity || order.amount_cents !== pack.amountCents) return { status: 'refused', reason: 'order_amount_mismatch' }

  const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id ?? null
  const paidAt = new Date().toISOString()
  const { data: claimed, error: claimError } = await db
    .from('rep_card_print_orders')
    .update({ status: 'paid', paid_at: paidAt, paid_via: via, stripe_payment_intent_id: paymentIntentId, stripe_checkout_session_id: session.id })
    .eq('id', orderId)
    .eq('status', 'pending')
    .select('id')
  if (claimError) throw new Error(`CARD_QR_ORDER_PAY_FAILED: ${claimError.message}`)
  const base = { orderNumber: order.order_number as string, quantity, amountCents: pack.amountCents }
  if (!claimed || claimed.length === 0) return { status: 'already_paid', ...base }

  // Cheese's ledger: money facts only.
  const { error: ledgerError } = await db.from('card_order_ledger').upsert(
    {
      order_id: orderId,
      order_number: order.order_number,
      rep_id: repId,
      paid_at: paidAt,
      amount_cents: pack.amountCents,
      currency: 'usd',
      quantity,
      livemode: false,
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: paymentIntentId,
    },
    { onConflict: 'order_id', ignoreDuplicates: true },
  )
  if (ledgerError) console.error('CARD_QR_LEDGER_FAILED', { orderNumber: order.order_number, error: ledgerError.message })

  const { data: rep } = await db.from('reps').select('display_name, email').eq('id', repId).maybeSingle()
  const facts: CardQrOrderEmailFacts = {
    ...base,
    repName: (rep?.display_name as string | undefined)?.trim() || 'Sparkle Suite rep',
    repEmail: (rep?.email as string | undefined) ?? '',
    address: order.ship_address as CardQrShipAddress,
    theme: themeLabel(order.design_theme as string | null),
  }
  const send = deps.send ?? sendCardQrEmailViaResend
  const fulfillmentTo = (deps.fulfillmentTo !== undefined ? deps.fulfillmentTo : process.env.CARD_QR_FULFILLMENT_EMAIL)?.trim() || null

  let fulfillmentEmail: 'sent' | 'failed' | 'not_configured' = 'not_configured'
  if (fulfillmentTo) {
    try {
      const { data: pdf, error: pdfError } = await db.storage.from(CARD_QR_PROOF_BUCKET).download(order.proof_pdf_path as string)
      if (pdfError || !pdf) throw new Error(`proof download failed: ${pdfError?.message ?? 'empty'}`)
      const mail = cardQrFulfillmentEmail(facts)
      await send({
        to: fulfillmentTo,
        ...mail,
        attachments: [{ filename: `${order.order_number}-proof.pdf`, content: Buffer.from(await pdf.arrayBuffer()) }],
      })
      await db.from('rep_card_print_orders').update({ fulfillment_email_to: fulfillmentTo, fulfillment_email_sent_at: new Date().toISOString(), fulfillment_email_error: null }).eq('id', orderId)
      fulfillmentEmail = 'sent'
    } catch (e) {
      fulfillmentEmail = 'failed'
      await db.from('rep_card_print_orders').update({ fulfillment_email_to: fulfillmentTo, fulfillment_email_error: String(e instanceof Error ? e.message : e).slice(0, 500) }).eq('id', orderId)
    }
  } else {
    await db.from('rep_card_print_orders').update({ fulfillment_email_error: 'CARD_QR_FULFILLMENT_EMAIL not set' }).eq('id', orderId)
  }

  let repEmail: 'sent' | 'failed' = 'failed'
  try {
    if (!facts.repEmail) throw new Error('rep has no email')
    await send({ to: facts.repEmail, ...cardQrRepConfirmationEmail(facts) })
    await db.from('rep_card_print_orders').update({ rep_email_sent_at: new Date().toISOString(), rep_email_error: null }).eq('id', orderId)
    repEmail = 'sent'
  } catch (e) {
    await db.from('rep_card_print_orders').update({ rep_email_error: String(e instanceof Error ? e.message : e).slice(0, 500) }).eq('id', orderId)
  }

  return { status: 'paid', ...base, fulfillmentEmail, repEmail }
}
