import { NextResponse } from 'next/server'
import { getStripe, stripeEnabled } from '@/lib/stripe/client'
import {
  getSparkleSuitePriceIds,
  getStripeConfig,
} from '@/lib/stripe/config'
import {
  buildSparkleSuiteCheckoutPricing,
  buildSparkleSuiteTestBuyerCheckoutPricing,
  getMissingSparkleSuitePriceEnv,
  type SparkleSuitePricingAssignment,
} from '@/lib/stripe/sparkle-suite-pricing'
import { getOrCreateStripeCustomer } from '@/lib/stripe/customers'
import { getAuthenticatedRep, AuthError } from '@/lib/supabase/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSelfServeAgreementVersion } from '@/lib/prelaunch/self-serve-agreement'
import { resolveCheckoutReturnOrigin } from '@/lib/stripe/return-origin'
import {
  getPendingReferralCodeForRep,
  resolveReferralCodeForCheckout,
} from '@/lib/services/sparkle-suite-referral-rewards'
import {
  isConvertibleInternalEntitlement,
  isProtectedInternalDemoAccount,
  isProtectedInternalDemoEmail,
} from '@/lib/stripe/convertible-internal-entitlement'

const STRIPE_PRICE_SETUP_ACTION =
  'Set STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, NEXT_PUBLIC_APP_URL, STRIPE_PRICE_BUILD_FEE, STRIPE_PRICE_FOUNDER_MONTHLY, and STRIPE_PRICE_STANDARD_MONTHLY before starting checkout.'

const SPARKLE_SUITE_CHECKOUT_PAYMENT_METHODS = ['card', 'link'] as const
const CHECKOUT_PRICING_ASSIGNMENT_RPC =
  'assign_sparkle_suite_checkout_pricing'

type CheckoutPricingAssignmentRpcResult = {
  pricing_tier?: unknown
  founder_sequence?: unknown
}

type ExistingCheckoutSubscriptionRow = {
  id: string
  status: string
  stripe_subscription_id: string | null
  stripe_customer_id: string | null
  stripe_livemode: boolean | null
}

type BillingRepRow = {
  email: string | null
  account_classification: string | null
  pricing_tier: 'founder' | 'standard' | null
  founder_sequence: number | null
}

type SupabaseRpcCapable = {
  rpc?: (
    functionName: string,
    args: Record<string, unknown>,
  ) => Promise<{
    data: unknown
    error: { message?: string; code?: string } | null
  }>
}

function isTestBuyerCheckoutEnabled() {
  return (
    process.env.SPARKLE_STRIPE_TEST_BUYER_MODE === 'true' ||
    process.env.SPARKLE_STRIPE_TEST_BUYER_MODE === '1'
  )
}

function canUseTestBuyerCheckout() {
  const secretKey = getStripeConfig()?.STRIPE_SECRET_KEY ?? ''
  return (
    isTestBuyerCheckoutEnabled() &&
    process.env.NODE_ENV !== 'production' &&
    secretKey.startsWith('sk_test_')
  )
}

async function countPaidSubscriptionStarts(
  admin: ReturnType<typeof createAdminClient>,
): Promise<number> {
  const { count, error } = await admin
    .from('subscriptions')
    .select('id', { count: 'exact', head: true })
    .in('status', ['active', 'trialing', 'past_due', 'cancelled', 'paused'])

  if (error) {
    throw error
  }

  return count ?? 0
}

function isMissingPricingAssignmentRpcError(
  error: { message?: string; code?: string },
) {
  const message = error.message ?? ''
  return (
    error.code === 'PGRST202' ||
    /assign_sparkle_suite_checkout_pricing|function .* does not exist|could not find the function/i.test(
      message,
    )
  )
}

function parseCheckoutPricingAssignment(
  data: unknown,
): SparkleSuitePricingAssignment {
  const row = (Array.isArray(data) ? data[0] : data) as
    | CheckoutPricingAssignmentRpcResult
    | undefined

  if (!row) {
    throw new Error('Sparkle Suite pricing assignment RPC returned no row.')
  }

  if (row.pricing_tier === 'standard') {
    return { tier: 'standard', founderSequence: null }
  }

  if (row.pricing_tier === 'founder') {
    const founderSequence =
      typeof row.founder_sequence === 'number'
        ? row.founder_sequence
        : Number.parseInt(String(row.founder_sequence ?? ''), 10)

    if (
      Number.isInteger(founderSequence) &&
      founderSequence >= 1 &&
      founderSequence <= 20
    ) {
      return { tier: 'founder', founderSequence }
    }
  }

  throw new Error('Sparkle Suite pricing assignment RPC returned invalid data.')
}

async function getReservedCheckoutPricingAssignment(
  admin: ReturnType<typeof createAdminClient>,
  repId: string,
): Promise<SparkleSuitePricingAssignment | null> {
  if (typeof (admin as unknown as SupabaseRpcCapable).rpc !== 'function') {
    return null
  }

  const { data, error } = await admin.rpc(CHECKOUT_PRICING_ASSIGNMENT_RPC, {
    p_rep_id: repId,
  })

  if (error) {
    if (isMissingPricingAssignmentRpcError(error)) {
      console.warn(
        '[stripe/create-checkout] Founder pricing assignment RPC is unavailable; falling back to subscription count.',
      )
      return null
    }

    throw error
  }

  return parseCheckoutPricingAssignment(data)
}

async function releaseReservedCheckoutPricingAssignment({
  admin,
  repId,
  pricingAssignment,
}: {
  admin: ReturnType<typeof createAdminClient> | null
  repId: string | null
  pricingAssignment: SparkleSuitePricingAssignment | null
}) {
  if (
    !admin ||
    !repId ||
    pricingAssignment?.tier !== 'founder' ||
    !pricingAssignment.founderSequence
  ) {
    return
  }

  if (typeof (admin as unknown as SupabaseRpcCapable).rpc !== 'function') {
    return
  }

  const { error } = await admin.rpc('release_sparkle_suite_checkout_pricing', {
    p_rep_id: repId,
    p_founder_sequence: pricingAssignment.founderSequence,
  })
  if (error) {
    console.error(
      '[stripe/create-checkout] Failed to release founder pricing reservation:',
      error,
    )
  }
}

export async function POST(request: Request) {
  if (!stripeEnabled()) {
    return NextResponse.json(
      {
        code: 'STRIPE_CONFIGURATION_MISSING',
        error: 'Stripe is not configured.',
        action: STRIPE_PRICE_SETUP_ACTION,
      },
      { status: 503 },
    )
  }

  let checkoutAdmin: ReturnType<typeof createAdminClient> | null = null
  let checkoutRepId: string | null = null
  let pricingAssignment: SparkleSuitePricingAssignment | null = null
  let checkoutSessionCreated = false

  try {
    const { repId, rep } = await getAuthenticatedRep()
    checkoutRepId = repId
    const body = await request.json().catch(() => ({}))
    const requestedPlanType =
      typeof body?.planType === 'string' ? body.planType.trim() : ''
    const planType = requestedPlanType || 'monthly'

    if (planType !== 'monthly') {
      return NextResponse.json(
        { error: 'Invalid planType — monthly is the only supported plan.' },
        { status: 400 },
      )
    }

    if (body?.agreementAccepted !== true) {
      return NextResponse.json(
        {
          error: 'Accept the Sparkle Suite Terms and Conditions before checkout.',
          agreementVersion: getSelfServeAgreementVersion(),
        },
        { status: 400 },
      )
    }

    if (isProtectedInternalDemoEmail(rep.email)) {
      return NextResponse.json(
        {
          code: 'INTERNAL_DEMO_CHECKOUT_BLOCKED',
          error: 'This internal demo account does not use Stripe checkout.',
        },
        { status: 403 },
      )
    }

    // Check for existing active subscription (Finding 16)
    const admin = createAdminClient()
    checkoutAdmin = admin
    const { data: billingRepData, error: billingRepError } = await admin
      .from('reps')
      .select('email, account_classification, pricing_tier, founder_sequence')
      .eq('id', repId)
      .maybeSingle()

    if (billingRepError) {
      throw billingRepError
    }

    const billingRep = billingRepData as BillingRepRow | null
    if (
      isProtectedInternalDemoAccount({
        email: billingRep?.email ?? rep.email,
        accountClassification: billingRep?.account_classification,
      })
    ) {
      return NextResponse.json(
        {
          code: 'INTERNAL_DEMO_CHECKOUT_BLOCKED',
          error: 'This internal demo account does not use Stripe checkout.',
        },
        { status: 403 },
      )
    }

    const { data: existingData, error: existingError } = await admin
      .from('subscriptions')
      .select(
        'id, status, stripe_subscription_id, stripe_customer_id, stripe_livemode',
      )
      .eq('rep_id', repId)
      .in('status', ['active', 'trialing'])
      .limit(1)
      .maybeSingle()

    if (existingError) {
      throw existingError
    }

    const existing = existingData as ExistingCheckoutSubscriptionRow | null
    let convertingInternalEntitlement = false
    if (existing) {
      convertingInternalEntitlement = isConvertibleInternalEntitlement({
        accountClassification: billingRep?.account_classification,
        email: billingRep?.email ?? rep.email,
        pricingTier: billingRep?.pricing_tier,
        founderSequence: billingRep?.founder_sequence,
        stripeSubscriptionId: existing.stripe_subscription_id,
        stripeCustomerId: existing.stripe_customer_id,
      })

      if (!convertingInternalEntitlement) {
        return NextResponse.json(
          { error: 'Active subscription already exists. Use the Customer Portal to change plans.' },
          { status: 409 }
        )
      }
    }

    const { data: workspaceTrial, error: workspaceTrialError } = await admin
      .from('workspace_trials')
      .select('id, status')
      .eq('rep_id', repId)
      .maybeSingle()

    if (workspaceTrialError) {
      throw workspaceTrialError
    }

    const isOperatorTrialConversion =
      Boolean(workspaceTrial) || convertingInternalEntitlement

    const testBuyerCheckoutEnabled = isTestBuyerCheckoutEnabled()
    if (testBuyerCheckoutEnabled && !canUseTestBuyerCheckout()) {
      return NextResponse.json(
        {
          code: 'TEST_BUYER_CHECKOUT_NOT_AVAILABLE',
          error:
            'Test buyer checkout requires a Stripe test key and cannot run in production.',
          action:
            'Use STRIPE_SECRET_KEY=sk_test_... with SPARKLE_STRIPE_TEST_BUYER_MODE=true in local development.',
        },
        { status: 400 },
      )
    }

    const priceIds = getSparkleSuitePriceIds()
    const missingPriceEnv = testBuyerCheckoutEnabled
      ? []
      : getMissingSparkleSuitePriceEnv(priceIds)
    if (missingPriceEnv.length > 0) {
      return NextResponse.json(
        {
          error: 'Sparkle Suite checkout prices are not configured.',
          missingEnv: missingPriceEnv,
          action: STRIPE_PRICE_SETUP_ACTION,
        },
        { status: 400 },
      )
    }

    pricingAssignment = testBuyerCheckoutEnabled
      ? null
      : await getReservedCheckoutPricingAssignment(admin, repId)
    const pricing = testBuyerCheckoutEnabled
      ? buildSparkleSuiteTestBuyerCheckoutPricing()
      : buildSparkleSuiteCheckoutPricing({
          pricingAssignment,
          paidSubscriptionStarts: pricingAssignment
            ? 0
            : await countPaidSubscriptionStarts(admin),
          priceIds,
        })
    if (!pricing.ok) {
      return NextResponse.json(
        {
          error: 'Sparkle Suite checkout prices are not configured.',
          missingEnv: pricing.missingEnv,
          action: STRIPE_PRICE_SETUP_ACTION,
        },
        { status: 400 },
      )
    }

    const customerId = await getOrCreateStripeCustomer(repId)
    const pendingReferralCode = await getPendingReferralCodeForRep({
      supabase: admin,
      repId,
      fallbackCode: body?.referralCode,
    })
    const resolvedReferral = await resolveReferralCodeForCheckout({
      supabase: admin,
      referredRepId: repId,
      referralCode: pendingReferralCode,
    })
    const referralMetadata: Record<string, string> = resolvedReferral
      ? {
          referrer_rep_id: resolvedReferral.referrerRepId,
          referral_code_used: resolvedReferral.referralCodeUsed,
        }
      : {}
    const agreementMetadata = {
      agreement_provider: 'clickwrap',
      agreement_version: getSelfServeAgreementVersion(),
      signwell_required: 'false',
    }
    const requiredSetupMetadata = isOperatorTrialConversion
      ? {
          first_run_setup: 'operator_trial_conversion',
          light_box_required: 'false',
        }
      : {
          first_run_setup: 'required_nic_nac',
          light_box_required: 'true',
        }

    const returnOrigin = resolveCheckoutReturnOrigin(request)
    const successUrl = isOperatorTrialConversion
      ? `${returnOrigin}/nic-nac?section=account&billing=subscription-success&session_id={CHECKOUT_SESSION_ID}`
      : `${returnOrigin}/nic-nac?onboarding=required-setup&billing=subscription-success&session_id={CHECKOUT_SESSION_ID}`
    const cancelUrl = isOperatorTrialConversion
      ? `${returnOrigin}/nic-nac?section=account&billing=subscription-cancelled`
      : `${returnOrigin}/nic-nac?onboarding=checkout-required&billing=subscription-cancelled`
    const stripe = getStripe()
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: [...SPARKLE_SUITE_CHECKOUT_PAYMENT_METHODS],
      line_items: pricing.lineItems,
      success_url: successUrl,
      cancel_url: cancelUrl,
      shipping_address_collection: { allowed_countries: ['US'] },
      phone_number_collection: { enabled: true },
      metadata: {
        rep_id: repId,
        plan_type: planType,
        ...agreementMetadata,
        ...requiredSetupMetadata,
        ...pricing.metadata,
        ...referralMetadata,
      },
      subscription_data: {
        metadata: {
          rep_id: repId,
          plan_type: planType,
          ...agreementMetadata,
          ...requiredSetupMetadata,
          ...pricing.metadata,
          ...referralMetadata,
        },
      },
    })
    checkoutSessionCreated = true

    return NextResponse.json({ sessionId: session.id, url: session.url })
  } catch (error) {
    if (!checkoutSessionCreated) {
      await releaseReservedCheckoutPricingAssignment({
        admin: checkoutAdmin,
        repId: checkoutRepId,
        pricingAssignment,
      })
    }

    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    console.error('[stripe/create-checkout] Error:', error)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
