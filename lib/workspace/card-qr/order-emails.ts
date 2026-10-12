import { getResendConfig, isResendEnabled } from '@/lib/resend/config'
import { cardQrShipAddressSummary, type CardQrShipAddress } from '@/lib/workspace/card-qr/ship-address'

export interface CardQrOrderEmailFacts {
  orderNumber: string
  repName: string
  repEmail: string
  quantity: number
  amountCents: number
  address: CardQrShipAddress
  theme: string
}

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`

function shipToLines(a: CardQrShipAddress) {
  return [a.name, a.street1, a.street2, `${a.city}, ${a.state} ${a.zip}`, a.phone ? `Phone: ${a.phone}` : ''].filter(Boolean)
}

function printerPacketLines(f: CardQrOrderEmailFacts) {
  return [
    `Order: ${f.orderNumber}`,
    `Rep: ${f.repName} <${f.repEmail}>`,
    `Quantity: ${f.quantity} cards`,
    `Paid: ${money(f.amountCents)} (all-in: print, tax, UPS Ground)`,
    `Theme: ${f.theme}`,
    '',
    'Ship to:',
    ...shipToLines(f.address),
    '',
    'The approved proof PDF is attached (page 1 front, page 2 back, CMYK with crop marks). Print it exactly as attached.',
  ]
}

/** To Louis, never the printer. The printer only gets the packet after he approves. */
export function cardQrApprovalEmail(f: CardQrOrderEmailFacts, approveUrl: string | null, opts: { test: boolean }) {
  const subject = `${opts.test ? '[TEST] ' : ''}APPROVAL NEEDED: ${f.orderNumber} for Amelia`
  const text = [
    `A business card order is paid${opts.test ? ' (Stripe test mode)' : ''}. Nothing has been sent to the printer yet.`,
    '',
    approveUrl
      ? `Check the attached proof, then approve to send this packet to the printer:\n${approveUrl}`
      : 'The approve link is not configured (CARD_QR_APPROVAL_SECRET missing). Do not forward this to the printer by hand without checking.',
    '',
    '---- Printer packet ----',
    ...printerPacketLines(f),
  ].join('\n')
  return { subject, text }
}

/** Printer packet, sent only after approval. */
export function cardQrPrinterEmail(f: CardQrOrderEmailFacts, opts: { test: boolean }) {
  const subject = `${opts.test ? '[TEST] ' : ''}Sparkle Suite business card order ${f.orderNumber}: ${f.quantity} cards`
  const text = ['Hi Amelia,', '', 'New business card order from Sparkle Suite. Details and the print-ready proof are below and attached.', '', ...printerPacketLines(f), '', 'Thank you!', 'Louis Chapman, Sparkle Suite'].join('\n')
  return { subject, text }
}

/** Rep confirmation. */
export function cardQrRepConfirmationEmail(f: CardQrOrderEmailFacts) {
  const first = f.repName.split(' ')[0] || 'there'
  const subject = `Your business card order ${f.orderNumber} is in`
  const text = [
    `Hi ${first},`,
    '',
    `Thanks! We received your order for ${f.quantity} business cards (${money(f.amountCents)}, all-in with print, tax and UPS Ground shipping).`,
    '',
    `Order number: ${f.orderNumber}`,
    `Ship to: ${cardQrShipAddressSummary(f.address)}`,
    '',
    'Your cards print exactly like the proof you approved. Expect them in about 14 business days.',
    '',
    'Sparkle Suite',
  ].join('\n')
  return { subject, text }
}

export type CardQrEmailSender = (input: {
  to: string
  subject: string
  text: string
  attachments?: Array<{ filename: string; content: Buffer }>
}) => Promise<{ id: string }>

/**
 * confirmed=true: we know nothing was delivered (Resend said no, or we never called it), so the
 * claim can be released for a retry. confirmed=false: outcome unknown (network/timeout), so the
 * claim stays until it goes stale (15 min) to avoid a double send.
 */
export class CardQrSendError extends Error {
  constructor(message: string, readonly confirmed: boolean) {
    super(message)
    this.name = 'CardQrSendError'
  }
}

export function isConfirmedSendFailure(e: unknown) {
  return !(e instanceof CardQrSendError) || e.confirmed
}

/** Plain Resend send with optional attachments. */
export const sendCardQrEmailViaResend: CardQrEmailSender = async (input) => {
  if (!isResendEnabled()) throw new CardQrSendError('RESEND_NOT_CONFIGURED', true)
  const config = getResendConfig()
  if (!config) throw new CardQrSendError('RESEND_NOT_CONFIGURED', true)
  let response: Response
  try {
    response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: config.RESEND_FROM_EMAIL,
        to: [input.to],
        subject: input.subject,
        text: input.text,
        ...(input.attachments?.length
          ? { attachments: input.attachments.map((a) => ({ filename: a.filename, content: a.content.toString('base64') })) }
          : {}),
      }),
    })
  } catch (e) {
    throw new CardQrSendError(`Resend unreachable: ${e instanceof Error ? e.message : String(e)}`, false)
  }
  const payload = (await response.json().catch(() => null)) as { id?: string; message?: string } | null
  if (!response.ok) throw new CardQrSendError(payload?.message ?? `Resend ${response.status}`, response.status < 500)
  if (!payload?.id) throw new CardQrSendError('Resend returned no id', false)
  return { id: payload.id }
}
