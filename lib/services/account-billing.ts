import type { SupabaseClient } from '@supabase/supabase-js'
import {
  getStripe,
  stripeEnabled as isStripeEnabled,
} from '@/lib/stripe/client'
import { ServiceError } from '@/lib/services/errors'
import type {
  AccountBillingDashboardResult,
  AccountBillingGrandfatheredCheckout,
  AccountBillingInvoiceSummary,
  AccountBillingPaymentMethodSummary,
  AccountBillingPricingSummary,
  AccountBillingReferralSummary,
  AccountBillingSubscriptionStatus,
} from '@/lib/services/types'
import { generateUniqueSparkleSuiteReferralCode } from '@/lib/services/sparkle-suite-referrals'
import { resolveWorkspaceAccess } from '@/lib/services/workspace-access'
import {
  FOUNDER_RATE_MONTHS,
  SPARKLE_SUITE_FOUNDER_MONTHLY_CENTS,
  SPARKLE_SUITE_SETUP_FEE_CENTS,
  SPARKLE_SUITE_STANDARD_MONTHLY_CENTS,
} from '@/lib/stripe/sparkle-suite-pricing'
import {
  isConvertibleInternalEntitlement,
  isRealStripeProviderId,
} from '@/lib/stripe/convertible-internal-entitlement'

type SubscriptionRow = {
  status: AccountBillingSubscriptionStatus
  plan_tier: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean | null
  cancelled_at: string | null
  stripe_livemode: boolean | null
  stripe_subscription_id: string | null
  stripe_customer_id: string | null
}

type RepBillingPlanRow = {
  referral_code: string | null
  pricing_tier: 'founder' | 'standard' | null
  founder_sequence: number | null
  email: string | null
  account_classification: string | null
}

type RepReferralStatusRow = {
  reward_status: string | null
}

const GRANDFATHERED_PAYMENT_LINK_ACCOUNTS = {
  '2b5a27c5-9c05-4014-8d0b-754e19815bf6': 'williams.brianna19@yahoo.com',
} as const
const GRANDFATHERED_SPARKLE_SUITE_PAYMENT_LINK =
  'https://buy.stripe.com/eVq00l4TT7Xu0nX7sod7q02'

function getGrandfatheredCheckout(
  repId: string,
  stripeCustomerId: string | null,
): AccountBillingGrandfatheredCheckout | null {
  const email = GRANDFATHERED_PAYMENT_LINK_ACCOUNTS[
    repId as keyof typeof GRANDFATHERED_PAYMENT_LINK_ACCOUNTS
  ]
  if (!email || stripeCustomerId) return null

  const url = new URL(GRANDFATHERED_SPARKLE_SUITE_PAYMENT_LINK)
  url.searchParams.set('client_reference_id', repId)
  url.searchParams.set('locked_prefilled_email', email)

  return {
    href: url.toString(),
    monthlyAmountCents: 3900,
    buildFeeCents: 0,
  }
}

function toServiceError(
  code: string,
  message: string,
  userMessage: string,
  cause: unknown,
) {
  return new ServiceError({
    code,
    message,
    userMessage,
    cause,
    statusCode: 500,
  })
}

function mapPaymentMethod(
  customer: unknown,
): AccountBillingPaymentMethodSummary | null {
  const source = customer as {
    invoice_settings?: {
      default_payment_method?: {
        card?: {
          brand?: string | null
          last4?: string | null
          exp_month?: number | null
          exp_year?: number | null
        } | null
      } | null
    } | null
  }

  const card = source.invoice_settings?.default_payment_method?.card
  if (
    !card?.brand ||
    !card.last4 ||
    !card.exp_month ||
    !card.exp_year
  ) {
    return null
  }

  return {
    brand: card.brand,
    last4: card.last4,
    expMonth: card.exp_month,
    expYear: card.exp_year,
  }
}

function mapInvoices(invoices: unknown[]): AccountBillingInvoiceSummary[] {
  return invoices.map((invoice) => {
    const row = invoice as {
      id: string
      created: number
      amount_paid: number | null
      currency: string | null
      status: string | null
      hosted_invoice_url: string | null
      invoice_pdf: string | null
    }

    return {
      id: row.id,
      createdAt: new Date(row.created * 1000).toISOString(),
      amountPaidCents: row.amount_paid ?? 0,
      currency: row.currency ?? 'usd',
      status: row.status,
      hostedInvoiceUrl: row.hosted_invoice_url,
      invoicePdfUrl: row.invoice_pdf,
    }
  })
}

function getAccountBillingCheckoutMode(): AccountBillingDashboardResult['checkoutMode'] {
  const mode = process.env.SPARKLE_STRIPE_TEST_BUYER_MODE
  return mode === 'true' || mode === '1' ? 'test_buyer' : 'standard'
}

function hasAccountBillingStripeEnvironment() {
  return Boolean(
    process.env.STRIPE_SECRET_KEY?.startsWith('sk_') &&
      process.env.STRIPE_WEBHOOK_SECRET?.startsWith('whsec_') &&
      process.env.NEXT_PUBLIC_APP_URL,
  )
}

function getAccountBillingReferralBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
}

function getAccountBillingStripeConfigured() {
  if (!hasAccountBillingStripeEnvironment()) return false

  try {
    return isStripeEnabled()
  } catch (cause) {
    console.warn('[account-billing] Stripe configuration unavailable:', cause)
    return false
  }
}

function buildReferralLink(code: string | null) {
  if (!code) return null
  const url = new URL('/start', getAccountBillingReferralBaseUrl())
  url.searchParams.set('ref', code)
  return url.toString()
}

function mapReferralSummary(args: {
  code: string | null
  rows: RepReferralStatusRow[]
}): AccountBillingReferralSummary {
  return args.rows.reduce(
    (summary, row) => {
      if (row.reward_status === 'pending') summary.pendingCount += 1
      if (row.reward_status === 'eligible') summary.earnedCount += 1
      if (row.reward_status === 'credited') summary.creditedCount += 1
      return summary
    },
    {
      code: args.code,
      link: buildReferralLink(args.code),
      pendingCount: 0,
      earnedCount: 0,
      creditedCount: 0,
    },
  )
}

async function ensureAccountReferralCode(
  supabase: SupabaseClient,
  repId: string,
  existingCode: string | null,
) {
  if (existingCode) return existingCode

  const referralCode = await generateUniqueSparkleSuiteReferralCode(supabase)
  const { error } = await supabase
    .from('reps')
    .update({ referral_code: referralCode })
    .eq('id', repId)

  if (error) throw error
  return referralCode
}

export async function getAccountBillingDashboard(args: {
  supabase: SupabaseClient
  repId: string
  stripeCustomerId: string | null
}): Promise<AccountBillingDashboardResult> {
  const { data, error } = await args.supabase
    .from('subscriptions')
    .select(
      'status, plan_tier, current_period_end, cancel_at_period_end, cancelled_at, stripe_livemode, stripe_subscription_id, stripe_customer_id',
    )
    .eq('rep_id', args.repId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw toServiceError(
      'ACCOUNT_BILLING_LOOKUP_FAILED',
      'failed to load subscription row',
      "I couldn't load billing details right now.",
      error,
    )
  }

  const subscriptionRow = (data as SubscriptionRow | null) ?? null
  let referral = mapReferralSummary({ code: null, rows: [] })
  const { data: repBillingPlanData, error: repBillingPlanError } =
    await args.supabase
      .from('reps')
      .select(
        'referral_code, pricing_tier, founder_sequence, email, account_classification',
      )
      .eq('id', args.repId)
      .maybeSingle()

  if (repBillingPlanError || !repBillingPlanData) {
    throw toServiceError(
      'ACCOUNT_BILLING_PLAN_LOOKUP_FAILED',
      'failed to load the rep billing plan',
      "I couldn't load the account's pricing details right now.",
      repBillingPlanError,
    )
  }

  const repBillingPlan = repBillingPlanData as RepBillingPlanRow

  try {
    const { data: referralRows, error: referralRowsError } = await args.supabase
      .from('rep_referrals')
      .select('reward_status')
      .eq('referrer_rep_id', args.repId)

    if (referralRowsError) throw referralRowsError

    const referralCode = await ensureAccountReferralCode(
      args.supabase,
      args.repId,
      repBillingPlan?.referral_code ?? null,
    )

    referral = mapReferralSummary({
      code: referralCode,
      rows: (referralRows as RepReferralStatusRow[] | null) ?? [],
    })
  } catch (cause) {
    console.warn('[account-billing] Referral summary unavailable:', cause)
  }
  const stripeConfigured = getAccountBillingStripeConfigured()

  const pricingTier = repBillingPlan?.pricing_tier === 'founder'
    ? 'founder'
    : 'standard'
  const pricing: AccountBillingPricingSummary = {
    tier: pricingTier,
    founderSequence:
      pricingTier === 'founder' ? repBillingPlan?.founder_sequence ?? null : null,
    setupFeeCents: SPARKLE_SUITE_SETUP_FEE_CENTS,
    monthlyAmountCents:
      pricingTier === 'founder'
        ? SPARKLE_SUITE_FOUNDER_MONTHLY_CENTS
        : SPARKLE_SUITE_STANDARD_MONTHLY_CENTS,
    founderRateMonths: FOUNDER_RATE_MONTHS,
    standardMonthlyAmountCents: SPARKLE_SUITE_STANDARD_MONTHLY_CENTS,
  }

  let paymentMethod: AccountBillingPaymentMethodSummary | null = null
  let invoices: AccountBillingInvoiceSummary[] = []

  if (stripeConfigured && args.stripeCustomerId) {
    try {
      const stripe = getStripe()
      const [customer, invoiceList] = await Promise.all([
        stripe.customers.retrieve(args.stripeCustomerId, {
          expand: ['invoice_settings.default_payment_method'],
        }),
        stripe.invoices.list({
          customer: args.stripeCustomerId,
          limit: 5,
        }),
      ])

      paymentMethod = mapPaymentMethod(customer)
      invoices = mapInvoices(invoiceList.data)
    } catch (cause) {
      console.warn('[account-billing] Stripe billing details unavailable:', cause)
    }
  }

  const subscription = subscriptionRow
    ? {
        status: subscriptionRow.status,
        planType: 'monthly' as const,
        currentPeriodEnd: subscriptionRow.current_period_end,
        cancelAtPeriodEnd: subscriptionRow.cancel_at_period_end ?? false,
        cancelledAt: subscriptionRow.cancelled_at,
        livemode: subscriptionRow.stripe_livemode ?? false,
      }
    : null

  const convertingInternalEntitlement = Boolean(
    subscription &&
      subscription.status !== 'cancelled' &&
      isConvertibleInternalEntitlement({
        accountClassification: repBillingPlan.account_classification,
        email: repBillingPlan.email,
        stripeSubscriptionId: subscriptionRow?.stripe_subscription_id,
        stripeCustomerId: subscriptionRow?.stripe_customer_id,
      }),
  )
  const canManageBilling = Boolean(
    stripeConfigured &&
      isRealStripeProviderId(args.stripeCustomerId) &&
      !convertingInternalEntitlement &&
      (!subscription || subscription.status !== 'cancelled'),
  )
  const canStartSubscription =
    !subscription ||
    subscription.status === 'cancelled' ||
    convertingInternalEntitlement
  const workspaceAccess = await resolveWorkspaceAccess({
    supabase: args.supabase,
    repId: args.repId,
  })

  return {
    stripeConfigured,
    checkoutMode: getAccountBillingCheckoutMode(),
    subscription,
    paymentMethod,
    invoices,
    referral,
    workspaceAccess: {
      hasFullAccess: workspaceAccess.hasFullAccess,
      source: workspaceAccess.source,
      status: workspaceAccess.status,
      subscriptionStatus: workspaceAccess.subscriptionStatus,
      trialStartsAt: workspaceAccess.trialStartsAt,
      trialEndsAt: workspaceAccess.trialEndsAt,
    },
    pricing,
    grandfatheredCheckout: getGrandfatheredCheckout(
      args.repId,
      args.stripeCustomerId,
    ),
    canStartSubscription,
    canManageBilling,
  }
}
