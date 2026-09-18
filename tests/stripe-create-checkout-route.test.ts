import { beforeEach, describe, expect, it, vi } from 'vitest'

const stripeEnabledMock = vi.fn()
const getStripeMock = vi.fn()
const getPriceIdMock = vi.fn()
const getSparkleSuitePriceIdsMock = vi.fn()
const getAppUrlMock = vi.fn()
const getStripeConfigMock = vi.fn()
const getOrCreateStripeCustomerMock = vi.fn()
const getAuthenticatedRepMock = vi.fn()
const createAdminClientMock = vi.fn()

vi.mock('@/lib/stripe/client', () => ({
  stripeEnabled: (...args: unknown[]) => stripeEnabledMock(...args),
  getStripe: (...args: unknown[]) => getStripeMock(...args),
}))

vi.mock('@/lib/stripe/config', () => ({
  getPriceId: (...args: unknown[]) => getPriceIdMock(...args),
  getSparkleSuitePriceIds: (...args: unknown[]) =>
    getSparkleSuitePriceIdsMock(...args),
  getAppUrl: (...args: unknown[]) => getAppUrlMock(...args),
  getStripeConfig: (...args: unknown[]) => getStripeConfigMock(...args),
}))

vi.mock('@/lib/stripe/customers', () => ({
  getOrCreateStripeCustomer: (...args: unknown[]) =>
    getOrCreateStripeCustomerMock(...args),
}))

vi.mock('@/lib/supabase/auth', () => ({
  AuthError: class AuthError extends Error {},
  getAuthenticatedRep: (...args: unknown[]) => getAuthenticatedRepMock(...args),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: (...args: unknown[]) => createAdminClientMock(...args),
}))

import { POST } from '@/app/api/stripe/create-checkout/route'

type PricingAssignmentRow = {
  pricing_tier: 'founder' | 'standard'
  founder_sequence: number | null
}

function createCheckoutAdminMock(
  paidSubscriptionStarts = 0,
  options: {
    pricingAssignment?: PricingAssignmentRow
    requireRpcThis?: boolean
    workspaceTrial?: { id: string; status: 'pending' | 'active' | 'revoked' } | null
    existingSubscription?: {
      id: string
      status: string
      stripe_subscription_id?: string | null
      stripe_customer_id?: string | null
      stripe_livemode?: boolean | null
    } | null
    billingRep?: {
      email?: string | null
      account_classification?: string | null
      pricing_tier?: 'founder' | 'standard' | null
      founder_sequence?: number | null
    } | null
  } = {},
) {
  const pricingAssignment =
    options.pricingAssignment ??
    (paidSubscriptionStarts < 20
      ? {
          pricing_tier: 'founder' as const,
          founder_sequence: paidSubscriptionStarts + 1,
        }
      : {
          pricing_tier: 'standard' as const,
          founder_sequence: null,
        })

  const admin = {
    rpc: vi.fn(function (
      this: unknown,
      functionName: string,
      _args?: Record<string, unknown>,
    ) {
      if (options.requireRpcThis && this !== admin) {
        throw new Error('Supabase rpc called without client binding')
      }
      if (functionName === 'assign_sparkle_suite_checkout_pricing') {
        return Promise.resolve({
          data: [pricingAssignment],
          error: null,
        })
      }
      if (functionName === 'release_sparkle_suite_checkout_pricing') {
        return Promise.resolve({
          data: true,
          error: null,
        })
      }

      throw new Error(`Unexpected rpc ${functionName}`)
    }),
    from: vi.fn((table: string) => {
      if (table === 'subscriptions') {
        return {
          select: vi.fn((_: string, queryOptions?: { count?: string }) => {
            if (queryOptions?.count === 'exact') {
              return {
                in: vi.fn().mockResolvedValue({
                  count: paidSubscriptionStarts,
                  error: null,
                }),
              }
            }

            return {
              eq: vi.fn(() => ({
                in: vi.fn(() => ({
                  limit: vi.fn(() => ({
                    single: vi.fn().mockResolvedValue({
                      data: options.existingSubscription ?? null,
                    }),
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: options.existingSubscription ?? null,
                      error: null,
                    }),
                  })),
                })),
              })),
            }
          }),
        }
      }

      if (table === 'self_serve_setup_sessions') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            })),
          })),
        }
      }

      if (table === 'reps') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: options.billingRep ?? null,
                error: null,
              }),
            })),
          })),
        }
      }

      if (table === 'workspace_trials') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: options.workspaceTrial ?? null,
                error: null,
              }),
            })),
          })),
        }
      }

      throw new Error(`Unexpected table ${table}`)
    }),
  }

  return admin
}

describe('POST /api/stripe/create-checkout', () => {
  const originalTestBuyerMode = process.env.SPARKLE_STRIPE_TEST_BUYER_MODE

  beforeEach(() => {
    process.env.SPARKLE_STRIPE_TEST_BUYER_MODE = originalTestBuyerMode
    stripeEnabledMock.mockReset()
    getStripeMock.mockReset()
    getPriceIdMock.mockReset()
    getSparkleSuitePriceIdsMock.mockReset()
    getAppUrlMock.mockReset()
    getStripeConfigMock.mockReset()
    getOrCreateStripeCustomerMock.mockReset()
    getAuthenticatedRepMock.mockReset()
    createAdminClientMock.mockReset()
  })

  it('defaults to the monthly plan and returns to nic-nac URLs', async () => {
    stripeEnabledMock.mockReturnValue(true)
    getAuthenticatedRepMock.mockResolvedValueOnce({
      repId: 'rep-1',
      rep: { id: 'rep-1' },
    })
    createAdminClientMock.mockReturnValue(createCheckoutAdminMock())
    getPriceIdMock.mockReturnValue('price_monthly')
    getSparkleSuitePriceIdsMock.mockReturnValue({
      buildFee: 'price_build_fee',
      founderMonthly: 'price_founder_monthly',
      standardMonthly: 'price_standard_monthly',
    })
    getAppUrlMock.mockReturnValue('https://sparkle-suite.example')
    getOrCreateStripeCustomerMock.mockResolvedValueOnce('cus_123')

    const createMock = vi.fn().mockResolvedValue({
      id: 'cs_123',
      url: 'https://checkout.stripe.test/cs_123',
    })
    getStripeMock.mockReturnValue({
      checkout: {
        sessions: {
          create: createMock,
        },
      },
    })

    const response = await POST(
      new Request('https://sparkle-suite.example/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ agreementAccepted: true }),
      }),
    )

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [
          { price: 'price_build_fee', quantity: 1 },
          { price: 'price_founder_monthly', quantity: 1 },
        ],
        success_url:
          'https://sparkle-suite.example/nic-nac?onboarding=required-setup&billing=subscription-success&session_id={CHECKOUT_SESSION_ID}',
        cancel_url:
          'https://sparkle-suite.example/nic-nac?onboarding=checkout-required&billing=subscription-cancelled',
        payment_method_types: ['card', 'link'],
        shipping_address_collection: { allowed_countries: ['US'] },
        phone_number_collection: { enabled: true },
        metadata: expect.objectContaining({
          plan_type: 'monthly',
          first_run_setup: 'required_nic_nac',
          light_box_required: 'true',
          pricing_tier: 'founder',
          founder_sequence: '1',
          build_fee_charged: 'true',
          founder_rate_months: '12',
          agreement_provider: 'clickwrap',
          agreement_version: 'sparkle-suite-terms-2026-05-09',
          signwell_required: 'false',
        }),
        subscription_data: expect.objectContaining({
          metadata: expect.objectContaining({
            first_run_setup: 'required_nic_nac',
            light_box_required: 'true',
          }),
        }),
      }),
    )
    expect(response.status).toBe(200)
  })

  it('returns operator trial conversions to Account without required setup or Light Box fulfillment', async () => {
    stripeEnabledMock.mockReturnValue(true)
    getAuthenticatedRepMock.mockResolvedValueOnce({
      repId: 'rep-operator-trial',
      rep: { id: 'rep-operator-trial' },
    })
    createAdminClientMock.mockReturnValue(
      createCheckoutAdminMock(0, {
        workspaceTrial: { id: 'trial-1', status: 'active' },
      }),
    )
    getSparkleSuitePriceIdsMock.mockReturnValue({
      buildFee: 'price_build_fee',
      founderMonthly: 'price_founder_monthly',
      standardMonthly: 'price_standard_monthly',
    })
    getOrCreateStripeCustomerMock.mockResolvedValueOnce('cus_operator_trial')

    const createMock = vi.fn().mockResolvedValue({
      id: 'cs_operator_trial',
      url: 'https://checkout.stripe.test/cs_operator_trial',
    })
    getStripeMock.mockReturnValue({
      checkout: { sessions: { create: createMock } },
    })

    const response = await POST(
      new Request('https://sparkle-suite.example/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ agreementAccepted: true }),
      }),
    )

    expect(response.status).toBe(200)
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        success_url:
          'http://localhost:3000/nic-nac?section=account&billing=subscription-success&session_id={CHECKOUT_SESSION_ID}',
        cancel_url:
          'http://localhost:3000/nic-nac?section=account&billing=subscription-cancelled',
        metadata: expect.objectContaining({
          rep_id: 'rep-operator-trial',
          first_run_setup: 'operator_trial_conversion',
          light_box_required: 'false',
        }),
        subscription_data: expect.objectContaining({
          metadata: expect.objectContaining({
            first_run_setup: 'operator_trial_conversion',
            light_box_required: 'false',
          }),
        }),
      }),
    )
  })

  it('adds a resolved referral to checkout and subscription metadata', async () => {
    stripeEnabledMock.mockReturnValue(true)
    getAuthenticatedRepMock.mockResolvedValueOnce({
      repId: 'rep-referred',
      rep: { id: 'rep-referred' },
    })
    const admin = {
      from: vi.fn((table: string) => {
        if (table === 'subscriptions') {
          return {
            select: vi.fn((_: string, options?: { count?: string }) => {
              if (options?.count === 'exact') {
                return {
                  in: vi.fn().mockResolvedValue({ count: 0, error: null }),
                }
              }

              return {
                eq: vi.fn(() => ({
                  in: vi.fn(() => ({
                    limit: vi.fn(() => ({
                      maybeSingle: vi
                        .fn()
                        .mockResolvedValue({ data: null, error: null }),
                    })),
                  })),
                })),
              }
            }),
          }
        }

        if (table === 'self_serve_setup_sessions') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { answers: { referralCode: 'SS-K7M4Q9' } },
                  error: null,
                }),
              })),
            })),
          }
        }

        if (table === 'workspace_trials') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
              })),
            })),
          }
        }

        if (table === 'reps') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: 'rep-referrer',
                    referral_code: 'SS-K7M4Q9',
                  },
                  error: null,
                }),
              })),
            })),
          }
        }

        throw new Error(`Unexpected table ${table}`)
      }),
    }
    createAdminClientMock.mockReturnValue(admin)
    getSparkleSuitePriceIdsMock.mockReturnValue({
      buildFee: 'price_build_fee',
      founderMonthly: 'price_founder_monthly',
      standardMonthly: 'price_standard_monthly',
    })
    getAppUrlMock.mockReturnValue('https://sparkle-suite.example')
    getOrCreateStripeCustomerMock.mockResolvedValueOnce('cus_referred')

    const createMock = vi.fn().mockResolvedValue({
      id: 'cs_referred',
      url: 'https://checkout.stripe.test/cs_referred',
    })
    getStripeMock.mockReturnValue({
      checkout: {
        sessions: {
          create: createMock,
        },
      },
    })

    const response = await POST(
      new Request('https://sparkle-suite.example/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ agreementAccepted: true }),
      }),
    )

    expect(response.status).toBe(200)
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          referral_code_used: 'SS-K7M4Q9',
          referrer_rep_id: 'rep-referrer',
        }),
        subscription_data: expect.objectContaining({
          metadata: expect.objectContaining({
            referral_code_used: 'SS-K7M4Q9',
            referrer_rep_id: 'rep-referrer',
          }),
        }),
      }),
    )
  })

  it('returns Stripe checkout to the preview deployment origin that started checkout', async () => {
    stripeEnabledMock.mockReturnValue(true)
    getAuthenticatedRepMock.mockResolvedValueOnce({
      repId: 'rep-preview',
      rep: { id: 'rep-preview' },
    })
    createAdminClientMock.mockReturnValue(createCheckoutAdminMock())
    getSparkleSuitePriceIdsMock.mockReturnValue({
      buildFee: 'price_build_fee',
      founderMonthly: 'price_founder_monthly',
      standardMonthly: 'price_standard_monthly',
    })
    getAppUrlMock.mockReturnValue('https://sparkle-suite.vercel.app')
    getOrCreateStripeCustomerMock.mockResolvedValueOnce('cus_preview')

    const createMock = vi.fn().mockResolvedValue({
      id: 'cs_preview',
      url: 'https://checkout.stripe.test/cs_preview',
    })
    getStripeMock.mockReturnValue({
      checkout: {
        sessions: {
          create: createMock,
        },
      },
    })

    const previewOrigin =
      'https://sparkle-suite-git-codex-sparkle-cro-d70670-louis-2849s-projects.vercel.app'
    const response = await POST(
      new Request(`${previewOrigin}/api/stripe/create-checkout`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          origin: previewOrigin,
        },
        body: JSON.stringify({ agreementAccepted: true }),
      }),
    )

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        success_url:
          `${previewOrigin}/nic-nac?onboarding=required-setup&billing=subscription-success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url:
          `${previewOrigin}/nic-nac?onboarding=checkout-required&billing=subscription-cancelled`,
      }),
    )
    expect(response.status).toBe(200)
  })

  it('does not trust an arbitrary checkout origin header', async () => {
    stripeEnabledMock.mockReturnValue(true)
    getAuthenticatedRepMock.mockResolvedValueOnce({
      repId: 'rep-safe-origin',
      rep: { id: 'rep-safe-origin' },
    })
    createAdminClientMock.mockReturnValue(createCheckoutAdminMock())
    getSparkleSuitePriceIdsMock.mockReturnValue({
      buildFee: 'price_build_fee',
      founderMonthly: 'price_founder_monthly',
      standardMonthly: 'price_standard_monthly',
    })
    getAppUrlMock.mockReturnValue('https://sparkle-suite.vercel.app')
    getOrCreateStripeCustomerMock.mockResolvedValueOnce('cus_safe_origin')

    const createMock = vi.fn().mockResolvedValue({
      id: 'cs_safe_origin',
      url: 'https://checkout.stripe.test/cs_safe_origin',
    })
    getStripeMock.mockReturnValue({
      checkout: {
        sessions: {
          create: createMock,
        },
      },
    })

    const response = await POST(
      new Request('https://sparkle-suite.vercel.app/api/stripe/create-checkout', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          origin: 'https://evil.example',
        },
        body: JSON.stringify({ agreementAccepted: true }),
      }),
    )

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        success_url:
          'https://sparkle-suite.vercel.app/nic-nac?onboarding=required-setup&billing=subscription-success&session_id={CHECKOUT_SESSION_ID}',
        cancel_url:
          'https://sparkle-suite.vercel.app/nic-nac?onboarding=checkout-required&billing=subscription-cancelled',
      }),
    )
    expect(response.status).toBe(200)
  })

  it('allows only card and Link payment methods for Sparkle Suite checkout', async () => {
    stripeEnabledMock.mockReturnValue(true)
    getAuthenticatedRepMock.mockResolvedValueOnce({
      repId: 'rep-payment-methods',
      rep: { id: 'rep-payment-methods' },
    })
    createAdminClientMock.mockReturnValue(createCheckoutAdminMock())
    getSparkleSuitePriceIdsMock.mockReturnValue({
      buildFee: 'price_build_fee',
      founderMonthly: 'price_founder_monthly',
      standardMonthly: 'price_standard_monthly',
    })
    getAppUrlMock.mockReturnValue('https://sparkle-suite.example')
    getOrCreateStripeCustomerMock.mockResolvedValueOnce('cus_payment_methods')

    const createMock = vi.fn().mockResolvedValue({
      id: 'cs_payment_methods',
      url: 'https://checkout.stripe.test/cs_payment_methods',
    })
    getStripeMock.mockReturnValue({
      checkout: {
        sessions: {
          create: createMock,
        },
      },
    })

    const response = await POST(
      new Request('https://sparkle-suite.example/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ agreementAccepted: true }),
      }),
    )

    const createParams = createMock.mock.calls[0]?.[0]
    expect(createParams).toEqual(
      expect.objectContaining({
        payment_method_types: ['card', 'link'],
      }),
    )
    expect(createParams.payment_method_types).not.toEqual(
      expect.arrayContaining([
        'affirm',
        'afterpay_clearpay',
        'amazon_pay',
        'cashapp',
        'klarna',
      ]),
    )
    expect(response.status).toBe(200)
  })

  it('uses standard monthly pricing once 20 paid subscriptions have started', async () => {
    stripeEnabledMock.mockReturnValue(true)
    getAuthenticatedRepMock.mockResolvedValueOnce({
      repId: 'rep-21',
      rep: { id: 'rep-21' },
    })
    createAdminClientMock.mockReturnValue(createCheckoutAdminMock(20))
    getSparkleSuitePriceIdsMock.mockReturnValue({
      buildFee: 'price_build_fee',
      founderMonthly: 'price_founder_monthly',
      standardMonthly: 'price_standard_monthly',
    })
    getAppUrlMock.mockReturnValue('https://sparkle-suite.example')
    getOrCreateStripeCustomerMock.mockResolvedValueOnce('cus_standard')

    const createMock = vi.fn().mockResolvedValue({
      id: 'cs_standard',
      url: 'https://checkout.stripe.test/cs_standard',
    })
    getStripeMock.mockReturnValue({
      checkout: {
        sessions: {
          create: createMock,
        },
      },
    })

    const response = await POST(
      new Request('http://localhost/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ agreementAccepted: true }),
      }),
    )

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [
          { price: 'price_build_fee', quantity: 1 },
          { price: 'price_standard_monthly', quantity: 1 },
        ],
        metadata: expect.objectContaining({
          pricing_tier: 'standard',
          founder_sequence: '',
          build_fee_charged: 'true',
          founder_rate_months: '',
        }),
      }),
    )
    expect(response.status).toBe(200)
  })

  it('still uses founder monthly pricing for the twentieth paid subscription start', async () => {
    stripeEnabledMock.mockReturnValue(true)
    getAuthenticatedRepMock.mockResolvedValueOnce({
      repId: 'rep-20',
      rep: { id: 'rep-20' },
    })
    createAdminClientMock.mockReturnValue(createCheckoutAdminMock(19))
    getSparkleSuitePriceIdsMock.mockReturnValue({
      buildFee: 'price_build_fee',
      founderMonthly: 'price_founder_monthly',
      standardMonthly: 'price_standard_monthly',
    })
    getAppUrlMock.mockReturnValue('https://sparkle-suite.example')
    getOrCreateStripeCustomerMock.mockResolvedValueOnce('cus_founder_20')

    const createMock = vi.fn().mockResolvedValue({
      id: 'cs_founder_20',
      url: 'https://checkout.stripe.test/cs_founder_20',
    })
    getStripeMock.mockReturnValue({
      checkout: {
        sessions: {
          create: createMock,
        },
      },
    })

    const response = await POST(
      new Request('http://localhost/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ agreementAccepted: true }),
      }),
    )

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [
          { price: 'price_build_fee', quantity: 1 },
          { price: 'price_founder_monthly', quantity: 1 },
        ],
        metadata: expect.objectContaining({
          pricing_tier: 'founder',
          founder_sequence: '20',
          build_fee_charged: 'true',
          founder_rate_months: '12',
        }),
      }),
    )
    expect(response.status).toBe(200)
  })

  it('uses the database-reserved pricing assignment when available', async () => {
    stripeEnabledMock.mockReturnValue(true)
    getAuthenticatedRepMock.mockResolvedValueOnce({
      repId: 'rep-reserved-standard',
      rep: { id: 'rep-reserved-standard' },
    })
    const admin = createCheckoutAdminMock(0, {
      pricingAssignment: {
        pricing_tier: 'standard',
        founder_sequence: null,
      },
      requireRpcThis: true,
    })
    createAdminClientMock.mockReturnValue(admin)
    getSparkleSuitePriceIdsMock.mockReturnValue({
      buildFee: 'price_build_fee',
      founderMonthly: 'price_founder_monthly',
      standardMonthly: 'price_standard_monthly',
    })
    getAppUrlMock.mockReturnValue('https://sparkle-suite.example')
    getOrCreateStripeCustomerMock.mockResolvedValueOnce('cus_reserved_standard')

    const createMock = vi.fn().mockResolvedValue({
      id: 'cs_reserved_standard',
      url: 'https://checkout.stripe.test/cs_reserved_standard',
    })
    getStripeMock.mockReturnValue({
      checkout: {
        sessions: {
          create: createMock,
        },
      },
    })

    const response = await POST(
      new Request('http://localhost/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ agreementAccepted: true }),
      }),
    )

    expect(admin.rpc).toHaveBeenCalledWith(
      'assign_sparkle_suite_checkout_pricing',
      { p_rep_id: 'rep-reserved-standard' },
    )
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [
          { price: 'price_build_fee', quantity: 1 },
          { price: 'price_standard_monthly', quantity: 1 },
        ],
        metadata: expect.objectContaining({
          pricing_tier: 'standard',
          founder_sequence: '',
          founder_rate_months: '',
        }),
      }),
    )
    expect(response.status).toBe(200)
  })

  it('does not reserve founder pricing when checkout prices are not configured', async () => {
    stripeEnabledMock.mockReturnValue(true)
    getAuthenticatedRepMock.mockResolvedValueOnce({
      repId: 'rep-missing-prices',
      rep: { id: 'rep-missing-prices' },
    })
    const admin = createCheckoutAdminMock()
    createAdminClientMock.mockReturnValue(admin)
    getSparkleSuitePriceIdsMock.mockReturnValue({})

    const response = await POST(
      new Request('http://localhost/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ agreementAccepted: true }),
      }),
    )

    expect(response.status).toBe(400)
    expect(admin.rpc).not.toHaveBeenCalledWith(
      'assign_sparkle_suite_checkout_pricing',
      expect.anything(),
    )
    await expect(response.json()).resolves.toMatchObject({
      error: 'Sparkle Suite checkout prices are not configured.',
      missingEnv: [
        'STRIPE_PRICE_BUILD_FEE',
        'STRIPE_PRICE_FOUNDER_MONTHLY',
        'STRIPE_PRICE_STANDARD_MONTHLY',
      ],
    })
  })

  it('releases a founder pricing reservation when customer creation fails before checkout is created', async () => {
    stripeEnabledMock.mockReturnValue(true)
    getAuthenticatedRepMock.mockResolvedValueOnce({
      repId: 'rep-customer-failure',
      rep: { id: 'rep-customer-failure' },
    })
    const admin = createCheckoutAdminMock(4)
    createAdminClientMock.mockReturnValue(admin)
    getSparkleSuitePriceIdsMock.mockReturnValue({
      buildFee: 'price_build_fee',
      founderMonthly: 'price_founder_monthly',
      standardMonthly: 'price_standard_monthly',
    })
    getOrCreateStripeCustomerMock.mockRejectedValueOnce(
      new Error('Stripe customer unavailable'),
    )

    const createMock = vi.fn()
    getStripeMock.mockReturnValue({
      checkout: {
        sessions: {
          create: createMock,
        },
      },
    })

    const response = await POST(
      new Request('http://localhost/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ agreementAccepted: true }),
      }),
    )

    expect(response.status).toBe(500)
    expect(createMock).not.toHaveBeenCalled()
    expect(admin.rpc).toHaveBeenCalledWith(
      'assign_sparkle_suite_checkout_pricing',
      { p_rep_id: 'rep-customer-failure' },
    )
    expect(admin.rpc).toHaveBeenCalledWith(
      'release_sparkle_suite_checkout_pricing',
      {
        p_rep_id: 'rep-customer-failure',
        p_founder_sequence: 5,
      },
    )
  })

  it('releases a founder pricing reservation when Stripe checkout creation fails', async () => {
    stripeEnabledMock.mockReturnValue(true)
    getAuthenticatedRepMock.mockResolvedValueOnce({
      repId: 'rep-checkout-failure',
      rep: { id: 'rep-checkout-failure' },
    })
    const admin = createCheckoutAdminMock(5)
    createAdminClientMock.mockReturnValue(admin)
    getSparkleSuitePriceIdsMock.mockReturnValue({
      buildFee: 'price_build_fee',
      founderMonthly: 'price_founder_monthly',
      standardMonthly: 'price_standard_monthly',
    })
    getOrCreateStripeCustomerMock.mockResolvedValueOnce('cus_checkout_failure')

    const createMock = vi.fn().mockRejectedValueOnce(
      new Error('Stripe checkout unavailable'),
    )
    getStripeMock.mockReturnValue({
      checkout: {
        sessions: {
          create: createMock,
        },
      },
    })

    const response = await POST(
      new Request('http://localhost/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ agreementAccepted: true }),
      }),
    )

    expect(response.status).toBe(500)
    expect(createMock).toHaveBeenCalled()
    expect(admin.rpc).toHaveBeenCalledWith(
      'release_sparkle_suite_checkout_pricing',
      {
        p_rep_id: 'rep-checkout-failure',
        p_founder_sequence: 6,
      },
    )
  })

  it('refuses checkout with an actionable error when Stripe env is missing', async () => {
    stripeEnabledMock.mockReturnValue(false)

    const response = await POST(
      new Request('http://localhost/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ agreementAccepted: true }),
      }),
    )

    expect(getAuthenticatedRepMock).not.toHaveBeenCalled()
    expect(getStripeMock).not.toHaveBeenCalled()
    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toEqual({
      code: 'STRIPE_CONFIGURATION_MISSING',
      error: 'Stripe is not configured.',
      action:
        'Set STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, NEXT_PUBLIC_APP_URL, STRIPE_PRICE_BUILD_FEE, STRIPE_PRICE_FOUNDER_MONTHLY, and STRIPE_PRICE_STANDARD_MONTHLY before starting checkout.',
    })
  })

  it('uses the authenticated rep identity instead of request-supplied identity', async () => {
    stripeEnabledMock.mockReturnValue(true)
    getAuthenticatedRepMock.mockResolvedValueOnce({
      repId: 'rep-authenticated',
      rep: { id: 'rep-authenticated' },
    })
    createAdminClientMock.mockReturnValue(createCheckoutAdminMock())
    getPriceIdMock.mockReturnValue('price_monthly')
    getSparkleSuitePriceIdsMock.mockReturnValue({
      buildFee: 'price_build_fee',
      founderMonthly: 'price_founder_monthly',
      standardMonthly: 'price_standard_monthly',
    })
    getAppUrlMock.mockReturnValue('https://sparkle-suite.example')
    getOrCreateStripeCustomerMock.mockResolvedValueOnce('cus_auth')

    const createMock = vi.fn().mockResolvedValue({
      id: 'cs_123',
      url: 'https://checkout.stripe.test/cs_123',
    })
    getStripeMock.mockReturnValue({
      checkout: {
        sessions: {
          create: createMock,
        },
      },
    })

    const response = await POST(
      new Request('http://localhost/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          repId: 'rep-attacker',
          planType: 'monthly',
          agreementAccepted: true,
        }),
      }),
    )

    expect(getOrCreateStripeCustomerMock).toHaveBeenCalledWith('rep-authenticated')
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          rep_id: 'rep-authenticated',
        }),
        subscription_data: expect.objectContaining({
          metadata: expect.objectContaining({
            rep_id: 'rep-authenticated',
          }),
        }),
      }),
    )
    expect(response.status).toBe(200)
  })

  it('fails closed when the active subscription guard query errors', async () => {
    stripeEnabledMock.mockReturnValue(true)
    getAuthenticatedRepMock.mockResolvedValueOnce({
      repId: 'rep-guard-error',
      rep: { id: 'rep-guard-error' },
    })
    createAdminClientMock.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn((_: string, options?: { count?: string }) => {
          if (options?.count === 'exact') {
            return {
              in: vi.fn().mockResolvedValue({
                count: 0,
                error: null,
              }),
            }
          }

          return {
            eq: vi.fn(() => ({
              in: vi.fn(() => ({
                limit: vi.fn(() => ({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: null,
                    error: { message: 'database unavailable' },
                  }),
                  single: vi.fn().mockResolvedValue({
                    data: null,
                    error: { message: 'database unavailable' },
                  }),
                })),
              })),
            })),
          }
        }),
      })),
    })
    getSparkleSuitePriceIdsMock.mockReturnValue({
      buildFee: 'price_build_fee',
      founderMonthly: 'price_founder_monthly',
      standardMonthly: 'price_standard_monthly',
    })
    getAppUrlMock.mockReturnValue('https://sparkle-suite.example')
    getOrCreateStripeCustomerMock.mockResolvedValueOnce('cus_guard_error')

    const createMock = vi.fn()
    getStripeMock.mockReturnValue({
      checkout: {
        sessions: {
          create: createMock,
        },
      },
    })

    const response = await POST(
      new Request('https://sparkle-suite.example/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ agreementAccepted: true }),
      }),
    )

    expect(response.status).toBe(500)
    expect(createMock).not.toHaveBeenCalled()
    expect(getOrCreateStripeCustomerMock).not.toHaveBeenCalled()
  })

  it('requires standard terms acceptance before creating checkout', async () => {
    stripeEnabledMock.mockReturnValue(true)
    getAuthenticatedRepMock.mockResolvedValueOnce({
      repId: 'rep-1',
      rep: { id: 'rep-1' },
    })

    const response = await POST(
      new Request('http://localhost/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      }),
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: 'Accept the Sparkle Suite Terms and Conditions before checkout.',
      agreementVersion: 'sparkle-suite-terms-2026-05-09',
    })
    expect(getStripeMock).not.toHaveBeenCalled()
  })

  it('rejects non-monthly plan requests', async () => {
    stripeEnabledMock.mockReturnValue(true)
    getAuthenticatedRepMock.mockResolvedValueOnce({
      repId: 'rep-1',
      rep: { id: 'rep-1' },
    })

    const response = await POST(
      new Request('http://localhost/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ planType: 'annual' }),
      }),
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: 'Invalid planType — monthly is the only supported plan.',
    })
  })
  it('creates a guarded 50-cent Stripe test buyer checkout without configured price IDs', async () => {
    process.env.SPARKLE_STRIPE_TEST_BUYER_MODE = 'true'
    stripeEnabledMock.mockReturnValue(true)
    getStripeConfigMock.mockReturnValue({
      STRIPE_SECRET_KEY: 'sk_test_secret',
    })
    getAuthenticatedRepMock.mockResolvedValueOnce({
      repId: 'rep-test-buyer',
      rep: { id: 'rep-test-buyer' },
    })
    createAdminClientMock.mockReturnValue(createCheckoutAdminMock())
    getSparkleSuitePriceIdsMock.mockReturnValue({})
    getAppUrlMock.mockReturnValue('http://localhost:3000')
    getOrCreateStripeCustomerMock.mockResolvedValueOnce('cus_test_buyer')

    const createMock = vi.fn().mockResolvedValue({
      id: 'cs_test_buyer',
      url: 'https://checkout.stripe.test/cs_test_buyer',
    })
    getStripeMock.mockReturnValue({
      checkout: {
        sessions: {
          create: createMock,
        },
      },
    })

    const response = await POST(
      new Request('http://localhost/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ agreementAccepted: true }),
      }),
    )

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: 'cus_test_buyer',
        mode: 'subscription',
        line_items: [
          {
            price_data: expect.objectContaining({
              currency: 'usd',
              unit_amount: 50,
              recurring: { interval: 'month' },
              product_data: expect.objectContaining({
                name: 'Sparkle Suite test buyer subscription',
              }),
            }),
            quantity: 1,
          },
        ],
        metadata: expect.objectContaining({
          rep_id: 'rep-test-buyer',
          pricing_tier: 'standard',
          test_buyer_checkout: 'true',
          production_pricing: 'false',
          monthly_price_id: 'test_buyer_price_data_50_cents',
        }),
        subscription_data: expect.objectContaining({
          metadata: expect.objectContaining({
            test_buyer_checkout: 'true',
            production_pricing: 'false',
          }),
        }),
      }),
    )
    expect(response.status).toBe(200)
  })

  it('refuses test buyer checkout unless the local Stripe key is a test key', async () => {
    process.env.SPARKLE_STRIPE_TEST_BUYER_MODE = 'true'
    stripeEnabledMock.mockReturnValue(true)
    getStripeConfigMock.mockReturnValue({
      STRIPE_SECRET_KEY: 'sk_live_secret',
    })
    getAuthenticatedRepMock.mockResolvedValueOnce({
      repId: 'rep-test-buyer',
      rep: { id: 'rep-test-buyer' },
    })
    createAdminClientMock.mockReturnValue(createCheckoutAdminMock())

    const response = await POST(
      new Request('http://localhost/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ agreementAccepted: true }),
      }),
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      code: 'TEST_BUYER_CHECKOUT_NOT_AVAILABLE',
      error:
        'Test buyer checkout requires a Stripe test key and cannot run in production.',
      action:
        'Use STRIPE_SECRET_KEY=sk_test_... with SPARKLE_STRIPE_TEST_BUYER_MODE=true in local development.',
    })
    expect(getStripeMock).not.toHaveBeenCalled()
  })

  it('creates founder checkout for a customer converting an internal no-Stripe entitlement', async () => {
    stripeEnabledMock.mockReturnValue(true)
    getAuthenticatedRepMock.mockResolvedValueOnce({
      repId: 'rep-kelly',
      rep: { id: 'rep-kelly', email: 'kellyygiselleee@gmail.com' },
    })
    createAdminClientMock.mockReturnValue(
      createCheckoutAdminMock(1, {
        existingSubscription: {
          id: 'sub-internal-kelly',
          status: 'active',
          stripe_subscription_id: null,
          stripe_customer_id: null,
          stripe_livemode: false,
        },
        billingRep: {
          email: 'kellyygiselleee@gmail.com',
          account_classification: 'customer',
          pricing_tier: 'founder',
          founder_sequence: 2,
        },
        pricingAssignment: {
          pricing_tier: 'founder',
          founder_sequence: 2,
        },
      }),
    )
    getSparkleSuitePriceIdsMock.mockReturnValue({
      buildFee: 'price_1ThAmIQYwdFOcEdvyAlTox0V',
      founderMonthly: 'price_1ThAmIQYwdFOcEdvWmNm96yG',
      standardMonthly: 'price_1ThAmJQYwdFOcEdv3HQwDV0V',
    })
    getOrCreateStripeCustomerMock.mockResolvedValueOnce('cus_kelly_checkout')

    const createMock = vi.fn().mockResolvedValue({
      id: 'cs_kelly',
      url: 'https://checkout.stripe.test/cs_kelly',
    })
    getStripeMock.mockReturnValue({
      checkout: { sessions: { create: createMock } },
    })

    const response = await POST(
      new Request('https://sparkle-suite.example/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ agreementAccepted: true }),
      }),
    )

    expect(response.status).toBe(200)
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [
          { price: 'price_1ThAmIQYwdFOcEdvyAlTox0V', quantity: 1 },
          { price: 'price_1ThAmIQYwdFOcEdvWmNm96yG', quantity: 1 },
        ],
        success_url:
          'http://localhost:3000/nic-nac?section=account&billing=subscription-success&session_id={CHECKOUT_SESSION_ID}',
        cancel_url:
          'http://localhost:3000/nic-nac?section=account&billing=subscription-cancelled',
        metadata: expect.objectContaining({
          rep_id: 'rep-kelly',
          first_run_setup: 'operator_trial_conversion',
          light_box_required: 'false',
          pricing_tier: 'founder',
          founder_sequence: '2',
          build_fee_charged: 'true',
          founder_rate_months: '12',
          build_fee_price_id: 'price_1ThAmIQYwdFOcEdvyAlTox0V',
          monthly_price_id: 'price_1ThAmIQYwdFOcEdvWmNm96yG',
        }),
      }),
    )
  })

  it('still blocks a second checkout when a live Stripe subscription already exists', async () => {
    stripeEnabledMock.mockReturnValue(true)
    getAuthenticatedRepMock.mockResolvedValueOnce({
      repId: 'rep-kim',
      rep: { id: 'rep-kim', email: 'ksgoforth64@gmail.com' },
    })
    createAdminClientMock.mockReturnValue(
      createCheckoutAdminMock(1, {
        existingSubscription: {
          id: 'sub-kim',
          status: 'active',
          stripe_subscription_id: 'sub_1UBF21QYwdFOcEdvswemOH3e',
          stripe_customer_id: 'cus_VAxgQbVNwYKenO',
          stripe_livemode: true,
        },
        billingRep: {
          email: 'ksgoforth64@gmail.com',
          account_classification: 'customer',
        },
      }),
    )

    const response = await POST(
      new Request('https://sparkle-suite.example/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ agreementAccepted: true }),
      }),
    )

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toEqual({
      error: 'Active subscription already exists. Use the Customer Portal to change plans.',
    })
    expect(getStripeMock).not.toHaveBeenCalled()
  })

  it('blocks Stripe checkout for the protected Louis demo account', async () => {
    stripeEnabledMock.mockReturnValue(true)
    getAuthenticatedRepMock.mockResolvedValueOnce({
      repId: 'rep-louis-demo',
      rep: { id: 'rep-louis-demo', email: 'louis@neonrabbit.net' },
    })
    createAdminClientMock.mockReturnValue(createCheckoutAdminMock())

    const response = await POST(
      new Request('https://sparkle-suite.example/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ agreementAccepted: true }),
      }),
    )

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({
      code: 'INTERNAL_DEMO_CHECKOUT_BLOCKED',
      error: 'This internal demo account does not use Stripe checkout.',
    })
    expect(getStripeMock).not.toHaveBeenCalled()
  })

  it('blocks Stripe checkout for plus-tagged Suite demo emails', async () => {
    stripeEnabledMock.mockReturnValue(true)
    getAuthenticatedRepMock.mockResolvedValueOnce({
      repId: 'rep-sparkle-demo-2',
      rep: {
        id: 'rep-sparkle-demo-2',
        email: 'louis+sparkle-demo-2@neonrabbit.net',
      },
    })
    createAdminClientMock.mockReturnValue(createCheckoutAdminMock())

    const response = await POST(
      new Request('https://sparkle-suite.example/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ agreementAccepted: true }),
      }),
    )

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({
      code: 'INTERNAL_DEMO_CHECKOUT_BLOCKED',
      error: 'This internal demo account does not use Stripe checkout.',
    })
    expect(getStripeMock).not.toHaveBeenCalled()
  })

  it('blocks Stripe checkout when the durable account classification is demo', async () => {
    stripeEnabledMock.mockReturnValue(true)
    getAuthenticatedRepMock.mockResolvedValueOnce({
      repId: 'rep-classified-demo',
      rep: { id: 'rep-classified-demo', email: 'someone@gmail.com' },
    })
    createAdminClientMock.mockReturnValue(
      createCheckoutAdminMock(0, {
        billingRep: {
          email: 'someone@gmail.com',
          account_classification: 'demo',
        },
      }),
    )

    const response = await POST(
      new Request('https://sparkle-suite.example/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ agreementAccepted: true }),
      }),
    )

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({
      code: 'INTERNAL_DEMO_CHECKOUT_BLOCKED',
      error: 'This internal demo account does not use Stripe checkout.',
    })
    expect(getStripeMock).not.toHaveBeenCalled()
  })

  it('does not convert a grandfathered customer placeholder subscription onto founder checkout', async () => {
    stripeEnabledMock.mockReturnValue(true)
    getAuthenticatedRepMock.mockResolvedValueOnce({
      repId: 'rep-lindsey',
      rep: { id: 'rep-lindsey', email: 'lindseychapman1188@gmail.com' },
    })
    createAdminClientMock.mockReturnValue(
      createCheckoutAdminMock(1, {
        existingSubscription: {
          id: 'sub-internal-lindsey',
          status: 'active',
          stripe_subscription_id: null,
          stripe_customer_id: null,
          stripe_livemode: false,
        },
        billingRep: {
          email: 'lindseychapman1188@gmail.com',
          account_classification: 'customer',
          pricing_tier: null,
          founder_sequence: null,
        },
      }),
    )

    const response = await POST(
      new Request('https://sparkle-suite.example/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ agreementAccepted: true }),
      }),
    )

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toEqual({
      error: 'Active subscription already exists. Use the Customer Portal to change plans.',
    })
    expect(getStripeMock).not.toHaveBeenCalled()
  })
})
