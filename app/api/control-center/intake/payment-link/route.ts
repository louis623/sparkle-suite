import { NextResponse } from 'next/server'

import {
  createOperatorPaymentLink,
  PaymentLinkError,
  resendOperatorPaymentLink,
  retryNeedsAttentionPaymentLink,
} from '@/lib/prelaunch/payment-links'
import type { SparkleSuitePricingTier } from '@/lib/stripe/sparkle-suite-pricing'
import {
  AuthError,
  getAuthenticatedOperator,
  OperatorAuthError,
} from '@/lib/supabase/operator-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function readString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function readBoolean(value: unknown) {
  return value === true || value === 'true' || value === 'on'
}

function readTier(value: unknown): SparkleSuitePricingTier | null {
  return value === 'founder' || value === 'standard' ? value : null
}

function sanitizeReturnTo(value: string) {
  if (value.startsWith('/control-center/intake') || value.startsWith('/internal/prelaunch/intake')) {
    return value
  }
  return '/control-center/intake'
}

export async function POST(request: Request) {
  try {
    const operator = await getAuthenticatedOperator()
    const form = await request.formData()
    const pricingTier = readTier(form.get('pricingTier'))
    const waiveSetupFee = readBoolean(form.get('waiveSetupFee'))
    const replaceLinkId = readString(form.get('replaceLinkId'))
    const retryLinkId = readString(form.get('retryLinkId'))
    const returnTo = sanitizeReturnTo(readString(form.get('returnTo')))
    const origin = new URL(request.url).origin
    if (retryLinkId) {
      await retryNeedsAttentionPaymentLink({
        paymentLinkId: retryLinkId,
        origin,
      })
      const redirectUrl = new URL(returnTo, request.url)
      redirectUrl.searchParams.set('paymentLink', retryLinkId)
      redirectUrl.hash = 'payment-link'
      return NextResponse.redirect(redirectUrl, 303)
    }
    if (!replaceLinkId && !pricingTier) {
      return NextResponse.json(
        { error: 'Choose founder or standard pricing.' },
        { status: 400 },
      )
    }
    const link = replaceLinkId
      ? await resendOperatorPaymentLink({
          paymentLinkId: replaceLinkId,
          operatorRepId: operator.repId,
          origin,
        })
      : await createOperatorPaymentLink({
          operatorRepId: operator.repId,
          pricingTier: pricingTier as SparkleSuitePricingTier,
          waiveSetupFee,
          origin,
        })
    const redirectUrl = new URL(returnTo, request.url)
    redirectUrl.searchParams.set('paymentLink', link.id)
    redirectUrl.hash = 'payment-link'
    return NextResponse.redirect(redirectUrl, 303)
  } catch (error) {
    if (error instanceof PaymentLinkError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    if (error instanceof AuthError) {
      return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    }
    if (error instanceof OperatorAuthError) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }
    console.error('[control-center/intake/payment-link] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create the payment link.' },
      { status: 500 },
    )
  }
}
