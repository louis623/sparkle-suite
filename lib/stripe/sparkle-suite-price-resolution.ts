import { getSparkleSuitePriceIds } from '@/lib/stripe/config'
import type { SparkleSuitePriceIds } from '@/lib/stripe/sparkle-suite-pricing'

/**
 * These are the lookup keys created by scripts/prepare-stripe-live-prices.ts
 * and scripts/prepare-stripe-demo-price.ts. Checkout reads an env price id
 * when one is set, and otherwise asks Stripe for the active price with the
 * matching lookup key. Live production does not set the price env vars.
 */
export const SPARKLE_SUITE_LIVE_PRICE_LOOKUP_KEYS = {
  buildFee: 'sparkle_suite_build_fee_live',
  founderMonthly: 'sparkle_suite_founder_monthly_live',
  standardMonthly: 'sparkle_suite_standard_monthly_live',
} as const

export const SPARKLE_SUITE_TEST_PRICE_LOOKUP_KEYS = {
  buildFee: 'sparkle_suite_launch_demo_build_fee_test',
  founderMonthly: 'sparkle_suite_launch_demo_founder_monthly_test',
  standardMonthly: 'sparkle_suite_launch_demo_standard_monthly_test',
} as const

type PriceKey = keyof typeof SPARKLE_SUITE_LIVE_PRICE_LOOKUP_KEYS

export function priceLookupKeysForSecret(secretKey: string | null | undefined) {
  return secretKey?.startsWith('sk_test_')
    ? SPARKLE_SUITE_TEST_PRICE_LOOKUP_KEYS
    : SPARKLE_SUITE_LIVE_PRICE_LOOKUP_KEYS
}

export async function resolveSparkleSuitePriceIds({
  envPriceIds = getSparkleSuitePriceIds(),
  secretKey,
  listPrices,
}: {
  envPriceIds?: SparkleSuitePriceIds
  secretKey?: string | null
  listPrices?: (
    lookupKeys: string[],
  ) => Promise<Array<{ id: string; lookup_key?: string | null }>>
}): Promise<SparkleSuitePriceIds> {
  const resolved: SparkleSuitePriceIds = { ...envPriceIds }
  const missing = (['buildFee', 'founderMonthly', 'standardMonthly'] as const).filter(
    (key) => !resolved[key],
  )
  if (missing.length === 0 || !listPrices) return resolved

  const lookup = priceLookupKeysForSecret(secretKey)
  const listed = await listPrices(missing.map((key) => lookup[key]))
  for (const price of listed) {
    const match = (Object.keys(lookup) as PriceKey[]).find(
      (key) => lookup[key] === price.lookup_key && missing.includes(key),
    )
    if (match && price.id) resolved[match] = price.id
  }
  return resolved
}
