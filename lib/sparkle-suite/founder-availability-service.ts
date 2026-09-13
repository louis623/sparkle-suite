import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { FOUNDER_PRICING_REP_LIMIT } from '@/lib/stripe/sparkle-suite-pricing'
import {
  calculateFounderAvailability,
  unavailableFounderAvailability,
  type FounderAvailability,
  type FounderRepAllocation,
  type FounderSubscriptionAllocation,
} from './founder-availability'

/** Read-only public aggregate. No checkout/Stripe calls or customer mutations. */
export async function getFounderAvailability(): Promise<FounderAvailability> {
  try {
    const admin = createAdminClient()
    const signal = AbortSignal.timeout(5_000)
    const [reps, subscriptions] = await Promise.all([
      admin.from('reps')
        .select('id,founder_sequence,account_classification', { count: 'exact' })
        .eq('pricing_tier', 'founder')
        .not('founder_sequence', 'is', null)
        .limit(FOUNDER_PRICING_REP_LIMIT + 1)
        .abortSignal(signal),
      admin.from('subscriptions')
        .select('rep_id,founder_sequence,stripe_livemode,reps(account_classification)', { count: 'exact' })
        .eq('pricing_tier', 'founder')
        .eq('stripe_livemode', true)
        .not('founder_sequence', 'is', null)
        .limit(FOUNDER_PRICING_REP_LIMIT + 1)
        .abortSignal(signal),
    ])

    // No partial results, stale fallback, or hardcoded owner-supplied count.
    if (reps.error || subscriptions.error || !reps.data || !subscriptions.data
      || reps.count !== reps.data.length || subscriptions.count !== subscriptions.data.length
      || reps.count > FOUNDER_PRICING_REP_LIMIT || subscriptions.count > FOUNDER_PRICING_REP_LIMIT) {
      return unavailableFounderAvailability()
    }

    return calculateFounderAvailability(
      reps.data as unknown as FounderRepAllocation[],
      subscriptions.data as unknown as FounderSubscriptionAllocation[],
      new Date().toISOString(),
    )
  } catch {
    // The anonymous response must not leak provider errors, identifiers, or keys.
    return unavailableFounderAvailability()
  }
}
