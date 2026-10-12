import { createHash, randomUUID } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { ServiceError } from '@/lib/services/errors'
import type { CardQrDesign } from '@/lib/workspace/card-qr/design'
import type { CardQrProofApproval, CardQrShipAddress } from '@/lib/workspace/card-qr/ship-address'
import { getCardQrPack, type CardQrPackQuantity } from '@/lib/workspace/card-qr/pricing'

export const CARD_QR_PROOF_BUCKET = 'card-qr-proofs'

/** Uploads the exact approved files (service role, private bucket). */
export async function storeCardQrProofFiles(repId: string, files: { pdf: Buffer; front: Buffer; back: Buffer }) {
  const admin = createAdminClient()
  const folder = `${repId}/${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID().slice(0, 8)}`
  const paths = { pdf: `${folder}/proof.pdf`, front: `${folder}/front.png`, back: `${folder}/back.png` }
  for (const [kind, body, type] of [
    ['pdf', files.pdf, 'application/pdf'],
    ['front', files.front, 'image/png'],
    ['back', files.back, 'image/png'],
  ] as const) {
    const { error } = await admin.storage.from(CARD_QR_PROOF_BUCKET).upload(paths[kind], body, { contentType: type, upsert: false })
    if (error) {
      throw new ServiceError({ code: 'CARD_QR_PROOF_SAVE_FAILED', message: error.message, userMessage: 'Could not save your approved proof. Nothing was charged.', statusCode: 500 })
    }
  }
  return { paths, sha256: createHash('sha256').update(files.pdf).digest('hex') }
}

/**
 * Pending order row carrying the approved snapshot, created BEFORE the Stripe session so the
 * human order number can go into the session. Paid status is set once by fulfillment.
 */
export async function createPendingCardQrOrder(input: {
  repId: string
  quantity: CardQrPackQuantity
  destinationUrl: string
  design: CardQrDesign
  designTheme: string
  address: CardQrShipAddress
  approval: CardQrProofApproval
  approvedAt: string
  proof: { paths: { pdf: string; front: string; back: string }; sha256: string }
  livemode?: boolean
}) {
  const pack = getCardQrPack(input.quantity)
  const { data, error } = await createAdminClient()
    .from('rep_card_print_orders')
    .insert({
      rep_id: input.repId,
      quantity: pack.quantity,
      amount_cents: pack.amountCents,
      currency: 'usd',
      status: 'pending',
      livemode: input.livemode === true,
      destination_url: input.destinationUrl,
      design_snapshot: input.design,
      design_theme: input.designTheme,
      ship_address: input.address,
      proof_pdf_path: input.proof.paths.pdf,
      proof_front_path: input.proof.paths.front,
      proof_back_path: input.proof.paths.back,
      proof_pdf_sha256: input.proof.sha256,
      details_confirmed_at: input.approval.detailsConfirmedAt ?? input.approvedAt,
      qr_scan_confirmed_at: input.approval.qrScannedAt ?? input.approvedAt,
      proof_approved_at: input.approvedAt,
    })
    .select('id, order_number')
    .single()
  if (error || !data) {
    throw new ServiceError({ code: 'CARD_QR_PENDING_ORDER_FAILED', message: error?.message ?? 'no row', userMessage: 'Could not save your order. Nothing was charged.', statusCode: 500 })
  }
  return { id: data.id as string, orderNumber: data.order_number as string }
}

export async function attachCardQrCheckoutSession(orderId: string, sessionId: string) {
  const { error } = await createAdminClient()
    .from('rep_card_print_orders')
    .update({ stripe_checkout_session_id: sessionId })
    .eq('id', orderId)
    .eq('status', 'pending')
  if (error) {
    throw new ServiceError({ code: 'CARD_QR_PENDING_ORDER_FAILED', message: error.message, userMessage: 'Could not save your order. Nothing was charged.', statusCode: 500 })
  }
}

export async function markCardQrCheckoutFailed(orderId: string) {
  await createAdminClient().from('rep_card_print_orders').update({ status: 'checkout_failed' }).eq('id', orderId).eq('status', 'pending')
}
