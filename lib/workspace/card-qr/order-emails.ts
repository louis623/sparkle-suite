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

/** Print-shop email (Smoke: goes to CARD_QR_FULFILLMENT_EMAIL, currently Louis, not Amelia). */
export function cardQrFulfillmentEmail(f: CardQrOrderEmailFacts) {
  const subject = `[Smoke test] Business card order ${f.orderNumber}: ${f.quantity} cards for ${f.repName}`
  const text = [
    `New business card order (Smoke, Stripe test mode).`,
    '',
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
  ].join('\n')
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

/** Plain Resend send with optional attachments. Throws when Resend is not configured. */
export const sendCardQrEmailViaResend: CardQrEmailSender = async (input) => {
  if (!isResendEnabled()) throw new Error('RESEND_NOT_CONFIGURED')
  const config = getResendConfig()
  if (!config) throw new Error('RESEND_NOT_CONFIGURED')
  const response = await fetch('https://api.resend.com/emails', {
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
  const payload = (await response.json().catch(() => null)) as { id?: string; message?: string } | null
  if (!response.ok || !payload?.id) throw new Error(payload?.message ?? `Resend ${response.status}`)
  return { id: payload.id }
}
