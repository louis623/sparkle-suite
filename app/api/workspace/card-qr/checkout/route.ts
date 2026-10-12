import { readCardQrProofApproval, isCompleteCardQrShipAddress } from '@/lib/workspace/card-qr/ship-address'
import { readCardQrShipAddress } from '@/lib/workspace/card-qr/ship-address-store'
import { renderCardQrCardFiles } from '@/lib/workspace/card-qr/card-files'
import { attachCardQrCheckoutSession, createPendingCardQrOrder, markCardQrCheckoutFailed, storeCardQrProofFiles } from '@/lib/workspace/card-qr/proof-snapshot'
import { readCardQrDesignTheme } from '@/lib/workspace/card-qr/design-theme'
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
    const liveKey = assertCardQrStripeTestKey(process.env.STRIPE_SECRET_KEY)
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
      ? (body as { design?: unknown; appearancePreset?: unknown; theme?: unknown; approval?: unknown })
      : {}
    const design = parseCardQrDesign(record.design)
    const override = readCardQrDesignTheme(record.theme, context.settings.appearancePreset)
    const appearancePreset = override ?? (
      typeof record.appearancePreset === 'string'
        ? record.appearancePreset
        : context.settings.appearancePreset)
    // Gate (Louis, Oct 11): a saved US address and both proof approvals, checked on the server.
    const approval = readCardQrProofApproval(record.approval)
    if (!approval.detailsConfirmed || !approval.qrScanned) {
      throw new ServiceError({
        code: 'CARD_QR_PROOF_NOT_APPROVED',
        message: 'Checkout needs both proof approvals.',
        userMessage: 'Check both proof boxes before ordering.',
        statusCode: 409,
      })
    }
    const saved = await readCardQrShipAddress(context.supabase, context.repId)
    if (!saved.address || !isCompleteCardQrShipAddress(saved.address)) {
      throw new ServiceError({
        code: 'CARD_QR_ADDRESS_REQUIRED',
        message: 'Checkout needs a saved shipping address.',
        userMessage: 'Save your shipping address before ordering.',
        statusCode: 409,
      })
    }
    // Snapshot exactly what was approved, with the same renderer as the preview and PDF.
    const files = await renderCardQrCardFiles(context, design, record.theme, 'pdf')
    if (files.status !== 'ok' || !files.pdf || !files.front || !files.back) {
      throw new ServiceError({
        code: 'CARD_QR_PROOF_RENDER_FAILED',
        message: `Proof render returned ${files.status}.`,
        userMessage:
          files.status === 'too_full' ? files.warnings[files.warnings.length - 1] ?? 'Your card is too full to print.' : 'We could not make your print proof. Nothing was charged.',
        statusCode: 422,
      })
    }
    const approvedAt = new Date().toISOString()
    const proof = await storeCardQrProofFiles(context.repId, { pdf: files.pdf, front: files.front, back: files.back })
    const order = await createPendingCardQrOrder({
      repId: context.repId,
      quantity,
      destinationUrl: context.destinationUrl,
      design,
      designTheme: override ?? 'site',
      address: saved.address,
      approval,
      approvedAt,
      proof,
      livemode: liveKey,
    })
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
      apiVersion: '2026-03-25.dahlia',
      typescript: true,
    })
    let session: Stripe.Checkout.Session
    try {
      session = await stripe.checkout.sessions.create(
        buildCardQrCheckoutParams({
          repId: context.repId,
          email: context.rep.email,
          quantity,
          destinationUrl: context.destinationUrl,
          origin: context.origin,
          design,
          appearancePreset,
          orderId: order.id,
          orderNumber: order.orderNumber,
        }),
      )
    } catch (error) {
      await markCardQrCheckoutFailed(order.id)
      throw error
    }
    if (session.livemode !== liveKey || !session.url) {
      await markCardQrCheckoutFailed(order.id)
      throw new ServiceError({
        code: 'CARD_QR_LIVE_STRIPE_BLOCKED',
        message: 'Refused a live or incomplete business-card Checkout session.',
        userMessage: 'Business card checkout is not available right now.',
        statusCode: 403,
      })
    }
    await attachCardQrCheckoutSession(order.id, session.id)
    return NextResponse.json({ url: session.url })
  } catch (error) {
    return cardQrErrorResponse(error)
  }
}
