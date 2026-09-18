import { describe, expect, it } from 'vitest'
import {
  isAssignedFounderPricing,
  isConvertibleInternalEntitlement,
  isInternalPlaceholderStripeId,
  isProtectedInternalDemoAccount,
  isProtectedInternalDemoEmail,
  isRealStripeProviderId,
} from '@/lib/stripe/convertible-internal-entitlement'

describe('convertible internal entitlement', () => {
  it('treats Kelly-style founder customers with no Stripe provider ids as convertible', () => {
    expect(
      isConvertibleInternalEntitlement({
        accountClassification: 'customer',
        email: 'kellyygiselleee@gmail.com',
        pricingTier: 'founder',
        founderSequence: 2,
        stripeSubscriptionId: null,
        stripeCustomerId: null,
      }),
    ).toBe(true)
  })

  it('does not convert Kim-style live Stripe subscriptions', () => {
    expect(
      isConvertibleInternalEntitlement({
        accountClassification: 'customer',
        email: 'ksgoforth64@gmail.com',
        pricingTier: 'founder',
        founderSequence: 1,
        stripeSubscriptionId: 'sub_1UBF21QYwdFOcEdvswemOH3e',
        stripeCustomerId: 'cus_VAxgQbVNwYKenO',
      }),
    ).toBe(false)
  })

  it('does not convert grandfathered customers that are not founder-assigned', () => {
    expect(
      isConvertibleInternalEntitlement({
        accountClassification: 'customer',
        email: 'lindseychapman1188@gmail.com',
        pricingTier: null,
        founderSequence: null,
        stripeSubscriptionId: null,
        stripeCustomerId: null,
      }),
    ).toBe(false)
  })

  it('blocks Louis demo emails and plus-tag Suite demo identities even if classified customer', () => {
    expect(isProtectedInternalDemoEmail('louis@neonrabbit.net')).toBe(true)
    expect(isProtectedInternalDemoEmail('louis+sparkle-demo-2@neonrabbit.net')).toBe(
      true,
    )
    expect(
      isProtectedInternalDemoEmail('louis+sparkle-live-smoke-1@neonrabbit.net'),
    ).toBe(true)
    expect(
      isProtectedInternalDemoEmail('sparkle-reviewer+preview@neonrabbit.net'),
    ).toBe(true)
    expect(isProtectedInternalDemoEmail('testrep@neonrabbit.net')).toBe(true)
    expect(
      isProtectedInternalDemoEmail(
        'sparkle-reviewer+communications-1-new-rep@neonrabbit.net',
      ),
    ).toBe(true)
    expect(isProtectedInternalDemoEmail('sparkle-reviewer@example.com')).toBe(
      true,
    )
    expect(isProtectedInternalDemoEmail('kellyygiselleee@gmail.com')).toBe(false)
    expect(
      isProtectedInternalDemoAccount({
        email: 'someone@gmail.com',
        accountClassification: 'demo',
      }),
    ).toBe(true)
    expect(
      isConvertibleInternalEntitlement({
        accountClassification: 'customer',
        email: 'louis+sparkle-demo-2@neonrabbit.net',
        pricingTier: 'founder',
        founderSequence: 3,
        stripeSubscriptionId: null,
        stripeCustomerId: null,
      }),
    ).toBe(false)
  })

  it('does not convert internal placeholder Stripe ids onto live checkout', () => {
    expect(isInternalPlaceholderStripeId('sub_internal_beta_rep')).toBe(true)
    expect(isRealStripeProviderId('cus_reviewer_smoke_rep')).toBe(false)
    expect(isRealStripeProviderId('cus_VAxgQbVNwYKenO')).toBe(true)
    expect(isAssignedFounderPricing({ pricingTier: 'founder', founderSequence: null })).toBe(
      true,
    )
    expect(
      isConvertibleInternalEntitlement({
        accountClassification: 'customer',
        email: 'someone@gmail.com',
        pricingTier: 'founder',
        founderSequence: 2,
        stripeSubscriptionId: 'sub_internal_beta_rep',
        stripeCustomerId: 'cus_internal_beta_rep',
      }),
    ).toBe(false)
  })
})
