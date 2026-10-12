import { createHmac, timingSafeEqual } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import { AMETHYST_SKIN_CARDS } from '@/lib/amethyst/skin-cards'
import { CARD_QR_PROOF_BUCKET } from '@/lib/workspace/card-qr/proof-snapshot'
import type { CardQrShipAddress } from '@/lib/workspace/card-qr/ship-address'
import {
  cardQrApprovalEmail,
  cardQrApproverIdempotencyKey,
  cardQrPrinterEmail,
  cardQrPrinterIdempotencyKey,
  isConfirmedSendFailure,
  sendCardQrEmailViaResend,
  type CardQrEmailSender,
  type CardQrOrderEmailFacts,
} from '@/lib/workspace/card-qr/order-emails'

/** Default approver. Never the printer. */
export const CARD_QR_DEFAULT_APPROVER = 'louis@neonrabbit.net'
const LINK_DAYS = 7

export function cardQrApproverEmail(env: NodeJS.ProcessEnv = process.env) {
  return env.CARD_QR_APPROVER_EMAIL?.trim() || CARD_QR_DEFAULT_APPROVER
}

function mac(secret: string, payload: string) {
  return createHmac('sha256', secret).update(payload).digest('base64url')
}

/** token = base64url(orderId|approver|expiresUnix).hmac */
export function signCardQrApproval(input: { orderId: string; approver: string; now?: Date }, secret = process.env.CARD_QR_APPROVAL_SECRET) {
  if (!secret || secret.length < 32) return null
  const exp = Math.floor((input.now ?? new Date()).getTime() / 1000) + LINK_DAYS * 86400
  const payload = Buffer.from(`${input.orderId}|${input.approver}|${exp}`).toString('base64url')
  return `${payload}.${mac(secret, payload)}`
}

export function verifyCardQrApproval(token: string | null | undefined, secret = process.env.CARD_QR_APPROVAL_SECRET, now = new Date()):
  | { ok: true; orderId: string; approver: string }
  | { ok: false; reason: 'not_configured' | 'bad_token' | 'expired' } {
  if (!secret || secret.length < 32) return { ok: false, reason: 'not_configured' }
  const [payload, sig] = (token ?? '').split('.')
  if (!payload || !sig) return { ok: false, reason: 'bad_token' }
  const want = Buffer.from(mac(secret, payload))
  const got = Buffer.from(sig)
  if (want.length !== got.length || !timingSafeEqual(want, got)) return { ok: false, reason: 'bad_token' }
  const [orderId, approver, exp] = Buffer.from(payload, 'base64url').toString().split('|')
  if (!orderId || !approver || !exp) return { ok: false, reason: 'bad_token' }
  if (Number(exp) * 1000 < now.getTime()) return { ok: false, reason: 'expired' }
  return { ok: true, orderId, approver }
}

export function cardQrApproveUrl(orderId: string, env: NodeJS.ProcessEnv = process.env) {
  const base = (env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '')
  const token = signCardQrApproval({ orderId, approver: cardQrApproverEmail(env) }, env.CARD_QR_APPROVAL_SECRET)
  return base && token ? `${base}/api/card-qr/printer-approval?token=${encodeURIComponent(token)}` : null
}

export function cardQrThemeLabel(theme: string | null) {
  if (!theme || theme === 'site') return "Rep's site theme"
  return AMETHYST_SKIN_CARDS.find((c) => c.id === theme)?.label ?? theme
}

const COLUMNS =
  'id, order_number, rep_id, status, livemode, quantity, amount_cents, ship_address, design_theme, proof_pdf_path, printer_approved_at, printer_approved_by, printer_email_sent_at, printer_email_to, fulfillment_email_sent_at'

export async function loadCardQrOrderFacts(db: SupabaseClient, orderId: string) {
  const { data: order, error } = await db.from('rep_card_print_orders').select(COLUMNS).eq('id', orderId).maybeSingle()
  if (error) throw new Error(`CARD_QR_ORDER_LOAD_FAILED: ${error.message}`)
  if (!order) return null
  const { data: rep } = await db.from('reps').select('display_name, email').eq('id', order.rep_id).maybeSingle()
  const facts: CardQrOrderEmailFacts = {
    orderNumber: order.order_number as string,
    repName: (rep?.display_name as string | undefined)?.trim() || 'Sparkle Suite rep',
    repEmail: (rep?.email as string | undefined) ?? '',
    quantity: order.quantity as number,
    amountCents: order.amount_cents as number,
    address: order.ship_address as CardQrShipAddress,
    theme: cardQrThemeLabel(order.design_theme as string | null),
  }
  return { order, facts }
}

export type CardQrPrinterApprovalResult =
  | { status: 'not_found' }
  | { status: 'not_paid' }
  | {
      status: 'approved' | 'already_approved'
      orderNumber: string
      approvedBy: string
      approvedAt: string
      printer: 'sent' | 'already_sent' | 'in_progress' | 'not_configured' | 'failed' | 'unknown'
      printerTo: string | null
    }

/**
 * Approve once, send to the printer once. Re-clicking after the printer address is configured
 * (or after a failed send) sends the packet then; it never sends twice.
 */
export async function approveCardQrOrderForPrinter(
  input: { orderId: string; approver: string; meta?: Record<string, unknown> },
  deps: { db?: SupabaseClient; send?: CardQrEmailSender; printerTo?: string | null } = {},
): Promise<CardQrPrinterApprovalResult> {
  const db = deps.db ?? createAdminClient()
  const loaded = await loadCardQrOrderFacts(db, input.orderId)
  if (!loaded) return { status: 'not_found' }
  const { order, facts } = loaded
  if (order.status !== 'paid' && order.status !== 'received') return { status: 'not_paid' }

  const now = new Date().toISOString()
  const { data: won, error } = await db
    .from('rep_card_print_orders')
    .update({ printer_approved_at: now, printer_approved_by: input.approver, printer_approval_meta: input.meta ?? {} })
    .eq('id', input.orderId)
    .is('printer_approved_at', null)
    .select('id')
  if (error) throw new Error(`CARD_QR_APPROVE_FAILED: ${error.message}`)
  const first = Boolean(won && won.length)
  const approvedBy = first ? input.approver : (order.printer_approved_by as string)
  const approvedAt = first ? now : (order.printer_approved_at as string)
  const base = { status: first ? ('approved' as const) : ('already_approved' as const), orderNumber: facts.orderNumber, approvedBy, approvedAt }

  const printerTo = (deps.printerTo !== undefined ? deps.printerTo : process.env.CARD_QR_PRINTER_EMAIL)?.trim() || null
  if (order.printer_email_sent_at) return { ...base, printer: 'already_sent', printerTo: (order.printer_email_to as string) ?? null }
  if (!printerTo) return { ...base, printer: 'not_configured', printerTo: null }

  const claimed = await claimCardQrEmail(db, input.orderId, 'printer')
  if (!claimed) return { ...base, printer: 'in_progress', printerTo }
  await db.from('rep_card_print_orders').update({ printer_email_to: printerTo }).eq('id', input.orderId)

  try {
    const { data: pdf, error: pdfError } = await db.storage.from(CARD_QR_PROOF_BUCKET).download(order.proof_pdf_path as string)
    if (pdfError || !pdf) throw new Error(`proof download failed: ${pdfError?.message ?? 'empty'}`)
    const send = deps.send ?? sendCardQrEmailViaResend
    const sent = await send({
      to: printerTo,
      idempotencyKey: cardQrPrinterIdempotencyKey(input.orderId),
      ...cardQrPrinterEmail(facts, { test: order.livemode !== true }),
      attachments: [{ filename: `${facts.orderNumber}-proof.pdf`, content: Buffer.from(await pdf.arrayBuffer()) }],
    })
    await db.from('rep_card_print_orders').update({ printer_email_status: 'sent', printer_email_sent_at: new Date().toISOString(), printer_email_id: sent.id, printer_email_error: null }).eq('id', input.orderId)
    return { ...base, printer: 'sent', printerTo }
  } catch (e) {
    const message = String(e instanceof Error ? e.message : e).slice(0, 500)
    if (isConfirmedSendFailure(e)) {
      // Confirmed nothing went out: release for retry.
      await db.from('rep_card_print_orders').update({ printer_email_status: 'failed', printer_email_error: message }).eq('id', input.orderId)
      return { ...base, printer: 'failed', printerTo }
    }
    // Unknown outcome: keep the claim; it becomes retryable after 15 minutes.
    await db.from('rep_card_print_orders').update({ printer_email_error: `unknown outcome: ${message}` }).eq('id', input.orderId)
    return { ...base, printer: 'unknown', printerTo }
  }
}

export async function claimCardQrEmail(db: SupabaseClient, orderId: string, kind: 'approver' | 'printer') {
  const { data, error } = await db.rpc('card_qr_claim_email', { p_order_id: orderId, p_kind: kind })
  if (error) throw new Error(`CARD_QR_CLAIM_FAILED: ${error.message}`)
  return data === true
}

export type CardQrApproverEmailResult = 'sent' | 'skipped' | 'failed' | 'unknown' | 'not_found'

/**
 * The APPROVAL NEEDED email to Louis (never the printer). Safe to call repeatedly: the claim
 * makes sure it is sent at most once per success. Used on payment, by the admin resend route
 * and by the daily check.
 */
export async function sendCardQrApproverEmail(
  orderId: string,
  deps: { db?: SupabaseClient; send?: CardQrEmailSender; approverTo?: string | null; approveUrl?: string | null } = {},
): Promise<CardQrApproverEmailResult> {
  const db = deps.db ?? createAdminClient()
  if (!(await claimCardQrEmail(db, orderId, 'approver'))) return 'skipped'
  const loaded = await loadCardQrOrderFacts(db, orderId)
  if (!loaded) return 'not_found'
  const { order, facts } = loaded
  const approverTo = (deps.approverTo !== undefined ? deps.approverTo : cardQrApproverEmail()) || CARD_QR_DEFAULT_APPROVER
  const approveUrl = deps.approveUrl !== undefined ? deps.approveUrl : cardQrApproveUrl(orderId)
  try {
    const { data: pdf, error: pdfError } = await db.storage.from(CARD_QR_PROOF_BUCKET).download(order.proof_pdf_path as string)
    if (pdfError || !pdf) throw new Error(`proof download failed: ${pdfError?.message ?? 'empty'}`)
    const send = deps.send ?? sendCardQrEmailViaResend
    await send({
      to: approverTo,
      idempotencyKey: cardQrApproverIdempotencyKey(orderId),
      ...cardQrApprovalEmail(facts, approveUrl, { test: order.livemode !== true }),
      attachments: [{ filename: `${facts.orderNumber}-proof.pdf`, content: Buffer.from(await pdf.arrayBuffer()) }],
    })
    await db.from('rep_card_print_orders').update({
      approver_email_status: 'sent',
      fulfillment_email_to: approverTo,
      fulfillment_email_sent_at: new Date().toISOString(),
      fulfillment_email_error: approveUrl ? null : 'approve link not configured',
    }).eq('id', orderId)
    return 'sent'
  } catch (e) {
    const message = String(e instanceof Error ? e.message : e).slice(0, 500)
    if (isConfirmedSendFailure(e)) {
      await db.from('rep_card_print_orders').update({ approver_email_status: 'failed', fulfillment_email_to: approverTo, fulfillment_email_error: message }).eq('id', orderId)
      return 'failed'
    }
    await db.from('rep_card_print_orders').update({ fulfillment_email_to: approverTo, fulfillment_email_error: `unknown outcome: ${message}` }).eq('id', orderId)
    return 'unknown'
  }
}
