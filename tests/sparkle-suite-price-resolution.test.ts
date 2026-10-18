import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  priceLookupKeysForSecret,
  resolveSparkleSuitePriceIds,
  SPARKLE_SUITE_LIVE_PRICE_LOOKUP_KEYS,
  SPARKLE_SUITE_TEST_PRICE_LOOKUP_KEYS,
} from '@/lib/stripe/sparkle-suite-price-resolution'

describe('Sparkle Suite price resolution', () => {
  it('uses the same lookup keys as the live and demo price scripts', () => {
    const live = readFileSync(join(process.cwd(), 'scripts/prepare-stripe-live-prices.ts'), 'utf8')
    const demo = readFileSync(join(process.cwd(), 'scripts/prepare-stripe-demo-price.ts'), 'utf8')
    expect(live).toContain(SPARKLE_SUITE_LIVE_PRICE_LOOKUP_KEYS.buildFee)
    expect(live).toContain(SPARKLE_SUITE_LIVE_PRICE_LOOKUP_KEYS.founderMonthly)
    expect(live).toContain(SPARKLE_SUITE_LIVE_PRICE_LOOKUP_KEYS.standardMonthly)
    expect(demo).toContain(SPARKLE_SUITE_TEST_PRICE_LOOKUP_KEYS.buildFee)
    expect(demo).toContain(SPARKLE_SUITE_TEST_PRICE_LOOKUP_KEYS.founderMonthly)
    expect(demo).toContain(SPARKLE_SUITE_TEST_PRICE_LOOKUP_KEYS.standardMonthly)
  })

  it('keeps env price ids and does not call Stripe when they are complete', async () => {
    const listPrices = async () => {
      throw new Error('lookup should not run')
    }
    await expect(
      resolveSparkleSuitePriceIds({
        envPriceIds: {
          buildFee: 'price_build',
          founderMonthly: 'price_founder',
          standardMonthly: 'price_standard',
        },
        secretKey: 'sk_live_example',
        listPrices,
      }),
    ).resolves.toEqual({
      buildFee: 'price_build',
      founderMonthly: 'price_founder',
      standardMonthly: 'price_standard',
    })
  })

  it('resolves live lookup keys when the secret is live and env ids are missing', async () => {
    const resolved = await resolveSparkleSuitePriceIds({
      envPriceIds: {},
      secretKey: 'sk_live_example',
      listPrices: async (lookupKeys) => {
        expect(lookupKeys).toEqual([
          SPARKLE_SUITE_LIVE_PRICE_LOOKUP_KEYS.buildFee,
          SPARKLE_SUITE_LIVE_PRICE_LOOKUP_KEYS.founderMonthly,
          SPARKLE_SUITE_LIVE_PRICE_LOOKUP_KEYS.standardMonthly,
        ])
        return lookupKeys.map((lookupKey) => ({ id: `id_${lookupKey}`, lookup_key: lookupKey }))
      },
    })
    expect(resolved.buildFee).toBe('id_sparkle_suite_build_fee_live')
    expect(priceLookupKeysForSecret('sk_test_example')).toBe(SPARKLE_SUITE_TEST_PRICE_LOOKUP_KEYS)
  })
})