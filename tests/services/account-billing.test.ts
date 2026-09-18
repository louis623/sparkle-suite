import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/stripe/client', () => ({
  stripeEnabled: vi.fn(),
  getStripe: vi.fn(),
}))

import { getAccountBillingDashboard } from '@/lib/services/account-billing'
import { getStripe, stripeEnabled } from '@/lib/stripe/client'

const originalTestBuyerMode = process.env.SPARKLE_STRIPE_TEST_BUYER_MODE
const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL
const originalStripeSecretKey = process.env.STRIPE_SECRET_KEY
const originalStripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET

function makeSelectSingle(response: { data: unknown; error: unknown }) {
  const single = vi.fn().mockResolvedValue(response)
  const maybeSingle = vi.fn().mockResolvedValue(response)
  const limit = vi.fn(() => ({ single, maybeSingle }))
  const order = vi.fn(() => ({ limit, single, maybeSingle }))
  const eq = vi.fn(() => ({ order, limit, single, maybeSingle }))
  const select = vi.fn(() => ({ eq }))

  return {
    api: { select },
    spies: { select, eq, order, limit, single, maybeSingle },
  }
}

function makeSelectList(response: { data: unknown[]; error: unknown }) {
  const eq = vi.fn().mockResolvedValue(response)
  const select = vi.fn(() => ({ eq }))

  return {
    api: { select },
    spies: { select, eq },
  }
}

function makeAccountBillingSupabase(args: {
  subscriptionsChain: ReturnType<typeof makeSelectSingle>
  repCode?: string | null
  referralRows?: unknown[]
  repReferralCodeError?: unknown
  referralRowsError?: unknown
  pricingTier?: 'founder' | 'standard' | null
  founderSequence?: number | null
  email?: string | null
  accountClassification?: 'customer' | 'demo' | null
}) {
  const referralsChain = makeSelectList({
    data: args.referralRows ?? [],
    error: args.referralRowsError ?? null,
  })
  const repsUpdateEq = vi.fn().mockResolvedValue({ error: null })
  const repsUpdate = vi.fn(() => ({ eq: repsUpdateEq }))

  return {
    from: vi.fn((table: string) => {
      if (table === 'subscriptions') return args.subscriptionsChain.api
      if (table === 'reps') {
        return {
          select: vi.fn((columns: string) => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data:
                  columns ===
                  'referral_code, pricing_tier, founder_sequence, email, account_classification'
                    ? {
                        referral_code:
                          args.repCode === undefined ? 'SS-ABC234' : args.repCode,
                        pricing_tier: args.pricingTier ?? null,
                        founder_sequence: args.founderSequence ?? null,
                        email: args.email ?? 'rep@example.test',
                        account_classification:
                          args.accountClassification ?? 'customer',
                      }
                    : null,
                error: args.repReferralCodeError ?? null,
              }),
            })),
          })),
          update: repsUpdate,
        }
      }
      if (table === 'rep_referrals') return referralsChain.api
      if (table === 'workspace_trials') {
        return makeSelectSingle({ data: null, error: null }).api
      }
      throw new Error(`Unexpected table ${table}`)
    }),
    repsUpdate,
    repsUpdateEq,
  }
}

describe('account billing service', () => {
  beforeEach(() => {
    vi.mocked(stripeEnabled).mockReset()
    vi.mocked(getStripe).mockReset()
    delete process.env.SPARKLE_STRIPE_TEST_BUYER_MODE
    process.env.NEXT_PUBLIC_APP_URL = 'https://sparkle-suite.example'
    process.env.STRIPE_SECRET_KEY = 'sk_test_account_billing'
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_account_billing'
  })

  afterEach(() => {
    if (originalTestBuyerMode === undefined) {
      delete process.env.SPARKLE_STRIPE_TEST_BUYER_MODE
    } else {
      process.env.SPARKLE_STRIPE_TEST_BUYER_MODE = originalTestBuyerMode
    }
    if (originalAppUrl === undefined) {
      delete process.env.NEXT_PUBLIC_APP_URL
    } else {
      process.env.NEXT_PUBLIC_APP_URL = originalAppUrl
    }
    if (originalStripeSecretKey === undefined) {
      delete process.env.STRIPE_SECRET_KEY
    } else {
      process.env.STRIPE_SECRET_KEY = originalStripeSecretKey
    }
    if (originalStripeWebhookSecret === undefined) {
      delete process.env.STRIPE_WEBHOOK_SECRET
    } else {
      process.env.STRIPE_WEBHOOK_SECRET = originalStripeWebhookSecret
    }
  })

  it('returns an unsubscribed monthly-ready dashboard when no subscription exists', async () => {
    vi.mocked(stripeEnabled).mockReturnValue(false)

    const subscriptionsChain = makeSelectSingle({
      data: null,
      error: null,
    })
    const supabase = makeAccountBillingSupabase({ subscriptionsChain })

    const result = await getAccountBillingDashboard({
      supabase: supabase as never,
      repId: 'rep-1',
      stripeCustomerId: null,
    })

    expect(result).toEqual({
      stripeConfigured: false,
      checkoutMode: 'standard',
      subscription: null,
      paymentMethod: null,
      invoices: [],
      referral: {
        code: 'SS-ABC234',
        link: 'https://sparkle-suite.example/start?ref=SS-ABC234',
        pendingCount: 0,
        earnedCount: 0,
        creditedCount: 0,
      },
      workspaceAccess: {
        hasFullAccess: false,
        source: 'none',
        status: 'no_entitlement',
        subscriptionStatus: null,
        trialStartsAt: null,
        trialEndsAt: null,
      },
      pricing: {
        tier: 'standard',
        founderSequence: null,
        setupFeeCents: 4999,
        monthlyAmountCents: 7499,
        founderRateMonths: 12,
        standardMonthlyAmountCents: 7499,
      },
      grandfatheredCheckout: null,
      canStartSubscription: true,
      canManageBilling: false,
    })
  })

  it('returns subscription, payment method, and invoice history when Stripe data exists', async () => {
    vi.mocked(stripeEnabled).mockReturnValue(true)

    const subscriptionsChain = makeSelectSingle({
      data: {
        status: 'active',
        plan_tier: 'monthly',
        current_period_end: '2026-06-01T00:00:00Z',
        cancel_at_period_end: true,
        cancelled_at: null,
        stripe_livemode: false,
        stripe_subscription_id: 'sub_123',
        stripe_customer_id: 'cus_123',
      },
      error: null,
    })

    const stripeMock = {
      customers: {
        retrieve: vi.fn().mockResolvedValue({
          invoice_settings: {
            default_payment_method: {
              card: {
                brand: 'visa',
                last4: '4242',
                exp_month: 12,
                exp_year: 2028,
              },
            },
          },
        }),
      },
      invoices: {
        list: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'in_1',
              created: 1770000000,
              amount_paid: 9900,
              currency: 'usd',
              status: 'paid',
              hosted_invoice_url: 'https://stripe.test/in_1',
              invoice_pdf: 'https://stripe.test/in_1.pdf',
            },
          ],
        }),
      },
    }
    vi.mocked(getStripe).mockReturnValue(stripeMock as never)

    const supabase = makeAccountBillingSupabase({ subscriptionsChain })

    const result = await getAccountBillingDashboard({
      supabase: supabase as never,
      repId: 'rep-1',
      stripeCustomerId: 'cus_123',
    })

    expect(result.subscription).toEqual({
      status: 'active',
      planType: 'monthly',
      currentPeriodEnd: '2026-06-01T00:00:00Z',
      cancelAtPeriodEnd: true,
      cancelledAt: null,
      livemode: false,
    })
    expect(result.paymentMethod).toEqual({
      brand: 'visa',
      last4: '4242',
      expMonth: 12,
      expYear: 2028,
    })
    expect(result.invoices).toEqual([
      {
        id: 'in_1',
        createdAt: '2026-02-02T02:40:00.000Z',
        amountPaidCents: 9900,
        currency: 'usd',
        status: 'paid',
        hostedInvoiceUrl: 'https://stripe.test/in_1',
        invoicePdfUrl: 'https://stripe.test/in_1.pdf',
      },
    ])
    expect(result.canStartSubscription).toBe(false)
    expect(result.canManageBilling).toBe(true)
    expect(result.checkoutMode).toBe('standard')
  })

  it('returns the founder contract and sequence assigned to a rep', async () => {
    vi.mocked(stripeEnabled).mockReturnValue(false)
    const subscriptionsChain = makeSelectSingle({ data: null, error: null })
    const supabase = makeAccountBillingSupabase({
      subscriptionsChain,
      pricingTier: 'founder',
      founderSequence: 1,
    })

    const result = await getAccountBillingDashboard({
      supabase: supabase as never,
      repId: 'rep-founder-1',
      stripeCustomerId: null,
    })

    expect(result.pricing).toEqual({
      tier: 'founder',
      founderSequence: 1,
      setupFeeCents: 4999,
      monthlyAmountCents: 4999,
      founderRateMonths: 12,
      standardMonthlyAmountCents: 7499,
    })
  })

  it('returns Brianna\'s approved grandfathered checkout only before a Stripe customer exists', async () => {
    vi.mocked(stripeEnabled).mockReturnValue(false)

    const subscriptionsChain = makeSelectSingle({ data: null, error: null })
    const supabase = makeAccountBillingSupabase({ subscriptionsChain })

    const result = await getAccountBillingDashboard({
      supabase: supabase as never,
      repId: '2b5a27c5-9c05-4014-8d0b-754e19815bf6',
      stripeCustomerId: null,
    })

    expect(result.grandfatheredCheckout).toEqual({
      href: 'https://buy.stripe.com/eVq00l4TT7Xu0nX7sod7q02?client_reference_id=2b5a27c5-9c05-4014-8d0b-754e19815bf6&locked_prefilled_email=williams.brianna19%40yahoo.com',
      monthlyAmountCents: 3900,
      buildFeeCents: 0,
    })

    const afterPayment = await getAccountBillingDashboard({
      supabase: supabase as never,
      repId: '2b5a27c5-9c05-4014-8d0b-754e19815bf6',
      stripeCustomerId: 'cus_brianna',
    })

    expect(afterPayment.grandfatheredCheckout).toBeNull()

    const heather = await getAccountBillingDashboard({
      supabase: supabase as never,
      repId: '9a971c05-3631-443e-bcb8-4e9a26e15885',
      stripeCustomerId: null,
    })

    expect(heather.grandfatheredCheckout).toBeNull()
  })

  it('returns the rep referral code, public link, and referral status counts', async () => {
    vi.mocked(stripeEnabled).mockReturnValue(false)

    const subscriptionsChain = makeSelectSingle({
      data: null,
      error: null,
    })
    const supabase = makeAccountBillingSupabase({
      subscriptionsChain,
      repCode: 'SS-K7M4Q9',
      referralRows: [
        { reward_status: 'pending' },
        { reward_status: 'eligible' },
        { reward_status: 'credited' },
      ],
    })

    const result = await getAccountBillingDashboard({
      supabase: supabase as never,
      repId: 'rep-1',
      stripeCustomerId: null,
    })

    expect(result.referral).toEqual({
      code: 'SS-K7M4Q9',
      link: 'https://sparkle-suite.example/start?ref=SS-K7M4Q9',
      pendingCount: 1,
      earnedCount: 1,
      creditedCount: 1,
    })
  })

  it('generates and saves a referral code for older reps that do not have one yet', async () => {
    vi.mocked(stripeEnabled).mockReturnValue(false)

    const subscriptionsChain = makeSelectSingle({
      data: null,
      error: null,
    })
    const supabase = makeAccountBillingSupabase({
      subscriptionsChain,
      repCode: null,
    })

    const result = await getAccountBillingDashboard({
      supabase: supabase as never,
      repId: 'rep-legacy',
      stripeCustomerId: null,
    })

    expect(result.referral.code).toMatch(/^SS-[A-HJ-NP-Z2-9]{6}$/)
    expect(result.referral.link).toBe(
      `https://sparkle-suite.example/start?ref=${result.referral.code}`,
    )
    expect(supabase.repsUpdate).toHaveBeenCalledWith({
      referral_code: result.referral.code,
    })
    expect(supabase.repsUpdateEq).toHaveBeenCalledWith('id', 'rep-legacy')
  })

  it('keeps billing ready when referral lookup is unavailable', async () => {
    vi.mocked(stripeEnabled).mockReturnValue(false)

    const subscriptionsChain = makeSelectSingle({
      data: {
        status: 'active',
        plan_tier: 'monthly',
        current_period_end: '2026-06-01T00:00:00Z',
        cancel_at_period_end: false,
        cancelled_at: null,
        stripe_livemode: false,
        stripe_subscription_id: null,
        stripe_customer_id: null,
      },
      error: null,
    })
    const supabase = makeAccountBillingSupabase({
      subscriptionsChain,
      referralRowsError: { message: 'rep_referrals unavailable' },
      pricingTier: 'founder',
      founderSequence: 2,
      email: 'kellyygiselleee@gmail.com',
      accountClassification: 'customer',
    })

    const result = await getAccountBillingDashboard({
      supabase: supabase as never,
      repId: 'rep-1',
      stripeCustomerId: null,
    })

    expect(result.subscription?.status).toBe('active')
    expect(result.referral).toEqual({
      code: null,
      link: null,
      pendingCount: 0,
      earnedCount: 0,
      creditedCount: 0,
    })
    expect(result.canStartSubscription).toBe(true)
    expect(result.canManageBilling).toBe(false)
    expect(result.pricing?.tier).toBe('founder')
    expect(result.pricing?.founderSequence).toBe(2)
  })

  it('allows billing portal access when a Stripe customer exists before subscription activation', async () => {
    vi.mocked(stripeEnabled).mockReturnValue(true)

    const subscriptionsChain = makeSelectSingle({
      data: null,
      error: null,
    })

    const stripeMock = {
      customers: {
        retrieve: vi.fn().mockResolvedValue({
          invoice_settings: {
            default_payment_method: null,
          },
        }),
      },
      invoices: {
        list: vi.fn().mockResolvedValue({ data: [] }),
      },
    }
    vi.mocked(getStripe).mockReturnValue(stripeMock as never)

    const supabase = makeAccountBillingSupabase({ subscriptionsChain })

    const result = await getAccountBillingDashboard({
      supabase: supabase as never,
      repId: 'rep-1',
      stripeCustomerId: 'cus_123',
    })

    expect(result.subscription).toBe(null)
    expect(result.paymentMethod).toBe(null)
    expect(result.invoices).toEqual([])
    expect(result.canStartSubscription).toBe(true)
    expect(result.canManageBilling).toBe(true)
    expect(result.checkoutMode).toBe('standard')
  })

  it('keeps paid access ready when Stripe details are temporarily unavailable', async () => {
    vi.mocked(stripeEnabled).mockReturnValue(true)

    const subscriptionsChain = makeSelectSingle({
      data: {
        status: 'active',
        plan_tier: 'monthly',
        current_period_end: '2026-06-01T00:00:00Z',
        cancel_at_period_end: false,
        cancelled_at: null,
        stripe_livemode: false,
        stripe_subscription_id: 'sub_123',
        stripe_customer_id: 'cus_123',
      },
      error: null,
    })

    vi.mocked(getStripe).mockReturnValue({
      customers: {
        retrieve: vi.fn().mockRejectedValue(new Error('Stripe timeout')),
      },
      invoices: {
        list: vi.fn().mockResolvedValue({ data: [] }),
      },
    } as never)

    const supabase = makeAccountBillingSupabase({ subscriptionsChain })

    const result = await getAccountBillingDashboard({
      supabase: supabase as never,
      repId: 'rep-1',
      stripeCustomerId: 'cus_123',
    })

    expect(result.subscription?.status).toBe('active')
    expect(result.paymentMethod).toBe(null)
    expect(result.invoices).toEqual([])
    expect(result.canStartSubscription).toBe(false)
    expect(result.canManageBilling).toBe(true)
  })

  it('keeps the account dashboard available when Stripe configuration is unavailable', async () => {
    delete process.env.STRIPE_SECRET_KEY
    delete process.env.STRIPE_WEBHOOK_SECRET
    vi.mocked(stripeEnabled).mockImplementation(() => {
      throw new Error('Stripe configuration is incomplete — cannot start in production')
    })

    const subscriptionsChain = makeSelectSingle({
      data: {
        status: 'active',
        plan_tier: 'monthly',
        current_period_end: '2026-06-01T00:00:00Z',
        cancel_at_period_end: false,
        cancelled_at: null,
        stripe_livemode: false,
        stripe_subscription_id: 'sub_123',
        stripe_customer_id: 'cus_123',
      },
      error: null,
    })
    const supabase = makeAccountBillingSupabase({ subscriptionsChain })

    const result = await getAccountBillingDashboard({
      supabase: supabase as never,
      repId: 'rep-1',
      stripeCustomerId: 'cus_123',
    })

    expect(stripeEnabled).not.toHaveBeenCalled()
    expect(result.stripeConfigured).toBe(false)
    expect(result.subscription?.status).toBe('active')
    expect(result.paymentMethod).toBe(null)
    expect(result.invoices).toEqual([])
    expect(result.canStartSubscription).toBe(false)
    expect(result.canManageBilling).toBe(false)
  })

  it('reports local Stripe test buyer checkout mode for billing review copy', async () => {
    process.env.SPARKLE_STRIPE_TEST_BUYER_MODE = 'true'
    vi.mocked(stripeEnabled).mockReturnValue(false)

    const subscriptionsChain = makeSelectSingle({
      data: null,
      error: null,
    })
    const supabase = makeAccountBillingSupabase({ subscriptionsChain })

    const result = await getAccountBillingDashboard({
      supabase: supabase as never,
      repId: 'rep-1',
      stripeCustomerId: null,
    })

    expect(result.checkoutMode).toBe('test_buyer')
  })

  it('offers founder checkout for a customer with an internal no-Stripe entitlement', async () => {
    vi.mocked(stripeEnabled).mockReturnValue(true)

    const subscriptionsChain = makeSelectSingle({
      data: {
        status: 'active',
        plan_tier: 'monthly',
        current_period_end: '2026-09-21T23:00:00Z',
        cancel_at_period_end: false,
        cancelled_at: null,
        stripe_livemode: false,
        stripe_subscription_id: null,
        stripe_customer_id: null,
      },
      error: null,
    })
    const supabase = makeAccountBillingSupabase({
      subscriptionsChain,
      pricingTier: 'founder',
      founderSequence: 2,
      email: 'kellyygiselleee@gmail.com',
      accountClassification: 'customer',
    })

    const result = await getAccountBillingDashboard({
      supabase: supabase as never,
      repId: 'rep-kelly',
      stripeCustomerId: null,
    })

    expect(result.canStartSubscription).toBe(true)
    expect(result.canManageBilling).toBe(false)
    expect(result.pricing).toEqual({
      tier: 'founder',
      founderSequence: 2,
      setupFeeCents: 4999,
      monthlyAmountCents: 4999,
      founderRateMonths: 12,
      standardMonthlyAmountCents: 7499,
    })
  })

  it('does not offer Stripe checkout for the protected Louis demo entitlement', async () => {
    vi.mocked(stripeEnabled).mockReturnValue(true)

    const subscriptionsChain = makeSelectSingle({
      data: {
        status: 'active',
        plan_tier: 'monthly',
        current_period_end: '2027-01-01T00:00:00Z',
        cancel_at_period_end: false,
        cancelled_at: null,
        stripe_livemode: false,
        stripe_subscription_id: 'sub_internal_beta_louis',
        stripe_customer_id: 'cus_internal_beta_louis',
      },
      error: null,
    })
    const supabase = makeAccountBillingSupabase({
      subscriptionsChain,
      email: 'louis@neonrabbit.net',
      accountClassification: 'demo',
    })

    const result = await getAccountBillingDashboard({
      supabase: supabase as never,
      repId: 'rep-louis-demo',
      stripeCustomerId: 'cus_internal_beta_louis',
    })

    expect(result.canStartSubscription).toBe(false)
    expect(result.canManageBilling).toBe(false)
  })
})
