import { describe, expect, it } from 'vitest'
import { signupDiscountTile } from '@/app/nic-nac/components/site-settings-layout'
import { discountOfferFieldError } from '@/app/nic-nac/components/site-settings-save'

describe('sign-up discount tile', () => {
  it('uses stored offer and code only when the discount is on', () => {
    expect(signupDiscountTile({
      signupDiscountEnabled: true,
      signupDiscountCode: 'WELCOME10',
      signupDiscountOffer: '10% off',
    })).toMatchObject({ chip: 'Done', offer: '10% off', code: 'WELCOME10', detail: null })
    expect(signupDiscountTile({
      signupDiscountEnabled: true,
      signupDiscountCode: 'WELCOME10',
      signupDiscountOffer: '   ',
    })).toMatchObject({ chip: 'Done', offer: 'A thank-you discount', code: 'WELCOME10' })
  })

  it('does not invent a code or percentage when the offer is off or the code is missing', () => {
    const off = signupDiscountTile({ signupDiscountEnabled: false, signupDiscountCode: 'WELCOME10', signupDiscountOffer: '10% off' })
    expect(off.chip).toBe('Off')
    expect(off.code).toBeNull()
    expect(off.offer).not.toMatch(/%/)
    const needs = signupDiscountTile({ signupDiscountEnabled: true, signupDiscountCode: 'has spaces', signupDiscountOffer: '' })
    expect(needs.chip).toBe('Needs a code')
    expect(needs.code).toBeNull()
    expect(needs.offer).not.toMatch(/%/)
  })

  it('keeps an invalid offer out of a successful save', () => {
    expect(discountOfferFieldError('Free shipping')).toBeNull()
    expect(discountOfferFieldError('<b>10% off</b>')).toMatch(/plain text/)
  })
})
