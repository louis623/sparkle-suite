import { FOUNDER_PRICING_REP_LIMIT } from '@/lib/stripe/sparkle-suite-pricing'

export type FounderAvailability = {
  status: 'available' | 'full' | 'unavailable'
  remaining: number | null
  checkedAt: string | null
}

export type FounderRepAllocation = {
  id: string
  founder_sequence: number | null
  account_classification: string | null
  subscriptions: { stripe_livemode: boolean | null } | Array<{ stripe_livemode: boolean | null }> | null
}

export type FounderSubscriptionAllocation = {
  rep_id: string
  founder_sequence: number | null
  stripe_livemode: boolean | null
  reps: { account_classification: string | null } | null
}

export function unavailableFounderAvailability(): FounderAvailability {
  return { status: 'unavailable', remaining: null, checkedAt: null }
}

/**
 * Mirrors the checkout allocator's UNION of durable rep/subscription sequences,
 * not the number of leads, active subscriptions, or the highest sequence.
 * Reservations stay occupied until the existing expiration webhook releases
 * them. Cancelled paid subscriptions retain their original founder allocation.
 * Never invent an expiry or silently free a slot that checkout still blocks.
 */
export function calculateFounderAvailability(
  reps: FounderRepAllocation[],
  subscriptions: FounderSubscriptionAllocation[],
  checkedAt: string,
): FounderAvailability {
  const slots = new Map<number, string>()
  const owners = new Map<string, number>()
  const add = (sequence: number | null, repId: string, qualified: boolean) => {
    // Unsequenced legacy rows do not occupy a slot in the allocator.
    if (sequence === null) return true
    if (!qualified || !repId || !Number.isInteger(sequence) || sequence < 1 || sequence > FOUNDER_PRICING_REP_LIMIT) return false
    if (slots.has(sequence) && slots.get(sequence) !== repId) return false
    if (owners.has(repId) && owners.get(repId) !== sequence) return false
    slots.set(sequence, repId)
    owners.set(repId, sequence)
    return true
  }

  for (const rep of reps) {
    // The checkout allocator reserves the durable rep row before a subscription
    // exists, so historical test subscriptions must not invalidate a real
    // customer allocation. The separate subscription pass below only retains
    // live subscription allocations if their rep row is no longer present.
    if (!add(rep.founder_sequence, rep.id, rep.account_classification === 'customer')) {
      return unavailableFounderAvailability()
    }
  }
  for (const subscription of subscriptions) {
    // Test-mode history is not a customer-facing founder allocation. Ignoring
    // it here avoids turning the public count into an unavailable state while
    // preserving the allocator's durable customer rep reservation above.
    if (subscription.stripe_livemode !== true) continue
    const qualified = subscription.reps?.account_classification === 'customer'
      && subscription.stripe_livemode === true
    if (!add(subscription.founder_sequence, subscription.rep_id, qualified)) return unavailableFounderAvailability()
  }

  const remaining = FOUNDER_PRICING_REP_LIMIT - slots.size
  return { status: remaining > 0 ? 'available' : 'full', remaining, checkedAt }
}
