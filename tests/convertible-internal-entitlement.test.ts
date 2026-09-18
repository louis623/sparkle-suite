import { describe, expect, it } from 'vitest'
import {
  isConvertibleInternalEntitlement,
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
        stripeSubscriptionId: 'sub_1UBF21QYwdFOcEdvswemOH3e',
        stripeCustomerId: 'cus_VAxgQbVNwYKenO',
      }),
    ).toBe(false)
  })

  it('does not convert Louis or other demo entitlements onto Stripe checkout', () => {
    expect(isProtectedInternalDemoEmail('louis@neonrabbit.net')).toBe(true)
    expect(
      isProtectedInternalDemoAccount({
        email: 'louis@neonrabbit.net',
        accountClassification: 'demo',
      }),
    ).toBe(true)
    expect(
      isConvertibleInternalEntitlement({
        accountClassification: 'demo',
        email: 'louis@neonrabbit.net',
        stripeSubscriptionId: 'sub_internal_beta_rep',
        stripeCustomerId: 'cus_internal_beta_rep',
      }),
    ).toBe(false)
  })

  it('ignores reviewer and internal placeholder Stripe ids', () => {
    expect(isRealStripeProviderId('cus_reviewer_smoke_rep')).toBe(false)
    expect(isRealStripeProviderId('sub_internal_beta_rep')).toBe(false)
    expect(isRealStripeProviderId('cus_VAxgQbVNwYKenO')).toBe(true)
    expect(isRealStripeProviderId(null)).toBe(false)
  })
})
