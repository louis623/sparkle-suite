import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import { cardQrStripeRuntime } from '@/lib/workspace/card-qr/access'
import { CARD_QR_STRIPE_PRODUCT, type CardQrCheckoutSessionShape } from '@/lib/workspace/card-qr/checkout'
import { getCardQrPack, isCardQrPackQuantity } from '@/lib/workspace/card-qr/pricing'
import {
  cardQrRepConfirmationEmail,
  sendCardQrEmailViaResend,
  type CardQrEmailSender,
} from '@/lib/workspace/card-qr/order-emails'
import { loadCardQrOrderFacts, sendCardQrApproverEmail } from '@/lib/workspace/card-qr/printer-approval'

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
      fulfillmentEmail: 'sent' | 'failed'
      repEmail: 'sent' | 'failed'
    }

interface Deps {
  db?: SupabaseClient
  send?: CardQrEmailSender
  approverTo?: string | null
  approveUrl?: string | null
}

const ORDER_COLUMNS =
  'id, order_number, rep_id, status, livemode, quantity, amount_cents, stripe_checkout_session_id, ship_address, design_theme, proof_pdf_path'


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
  const runtime = cardQrStripeRuntime()
  if (md.environment !== runtime.environment) return { status: 'refused', reason: 'wrong_environment' }
  if (session.livemode !== false && !(session.livemode === true && runtime.allowLive)) return { status: 'refused', reason: 'livemode_not_allowed' }
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
  if (Boolean(order.livemode) !== (session.livemode === true)) return { status: 'refused', reason: 'order_livemode_mismatch' }

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
      livemode: session.livemode === true,
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: paymentIntentId,
    },
    { onConflict: 'order_id', ignoreDuplicates: true },
  )
  if (ledgerError) console.error('CARD_QR_LEDGER_FAILED', { orderNumber: order.order_number, error: ledgerError.message })

  const loaded = await loadCardQrOrderFacts(db, orderId)
  if (!loaded) throw new Error('CARD_QR_ORDER_VANISHED')
  const facts = loaded.facts
  const send = deps.send ?? sendCardQrEmailViaResend
  // Never the printer: the packet goes to the approver (Louis) with a signed approve link.
  const approver = await sendCardQrApproverEmail(orderId, { db, send, approverTo: deps.approverTo, approveUrl: deps.approveUrl })
  const fulfillmentEmail: 'sent' | 'failed' = approver === 'sent' ? 'sent' : 'failed'

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
