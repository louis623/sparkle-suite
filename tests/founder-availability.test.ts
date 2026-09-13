import { describe, expect, it } from 'vitest'
import {
  calculateFounderAvailability,
  type FounderRepAllocation,
  type FounderSubscriptionAllocation,
} from '@/lib/sparkle-suite/founder-availability'

const checkedAt = '2026-09-05T16:00:00.000Z'
const rep = (sequence: number, extra: Partial<FounderRepAllocation> = {}): FounderRepAllocation => ({
  id: `customer-${sequence}`, founder_sequence: sequence, account_classification: 'customer', subscriptions: [], ...extra,
})
const subscription = (sequence: number, extra: Partial<FounderSubscriptionAllocation> = {}): FounderSubscriptionAllocation => ({
  rep_id: `customer-${sequence}`, founder_sequence: sequence, stripe_livemode: true, reps: { account_classification: 'customer' }, ...extra,
})

describe('public founder availability matches durable checkout allocation', () => {
  it('deduplicates one real founder across rep and subscription records', () => {
    expect(calculateFounderAvailability([rep(1)], [subscription(1)], checkedAt)).toEqual({ status: 'available', remaining: 19, checkedAt })
  })
  it('counts available slots rather than the largest sequence or number of rows', () => {
    expect(calculateFounderAvailability([rep(2), rep(17)], [subscription(17)], checkedAt).remaining).toBe(18)
  })
  it('counts reservations until released and durable subscription allocations after cancellation', () => {
    expect(calculateFounderAvailability([rep(1), rep(2)], [subscription(1)], checkedAt).remaining).toBe(18)
    // The expiration webhook clears the unpaid rep allocation; no guessed TTL.
    expect(calculateFounderAvailability([rep(1)], [subscription(1)], checkedAt).remaining).toBe(19)
    expect(calculateFounderAvailability([], [subscription(1)], checkedAt).remaining).toBe(19)
  })
  it('supports the real one-to-one subscription embedding and an unpaid reservation with no subscription', () => {
    expect(calculateFounderAvailability([rep(1, { subscriptions: { stripe_livemode: true } })], [subscription(1)], checkedAt).remaining).toBe(19)
    expect(calculateFounderAvailability([rep(1, { subscriptions: null })], [], checkedAt).remaining).toBe(19)
  })
  it('keeps a customer founder allocation visible when test subscription history exists', () => {
    expect(calculateFounderAvailability(
      [rep(1, { subscriptions: [{ stripe_livemode: false }, { stripe_livemode: true }] }), rep(2)],
      [subscription(1), subscription(2)],
      checkedAt,
    )).toEqual({ status: 'available', remaining: 18, checkedAt })
  })
  it('ignores non-live subscription history that is not a durable customer allocation', () => {
    expect(calculateFounderAvailability([], [subscription(1, { stripe_livemode: false })], checkedAt))
      .toEqual({ status: 'available', remaining: 20, checkedAt })
  })
  it('reports full without exposing internal totals or customer fields', () => {
    expect(calculateFounderAvailability(Array.from({ length: 20 }, (_, i) => rep(i + 1)), [], checkedAt)).toEqual({ status: 'full', remaining: 0, checkedAt })
  })
  it('ignores unsequenced legacy/demo rows as the allocator does', () => {
    expect(calculateFounderAvailability([rep(1)], [subscription(1), subscription(2, { founder_sequence: null, reps: { account_classification: 'demo' } })], checkedAt).remaining).toBe(19)
  })
  it.each([
    [[rep(1, { account_classification: 'demo' })], []],
    [[], [subscription(1, { reps: { account_classification: 'demo' } })]],
    [[], [subscription(1, { reps: null })]],
    [[rep(0)], []],
    [[rep(21)], []],
    [[rep(1.5)], []],
    [[rep(1)], [subscription(1, { rep_id: 'different-owner' })]],
    [[rep(1)], [subscription(2, { rep_id: 'customer-1' })]],
  ] as Array<[FounderRepAllocation[], FounderSubscriptionAllocation[]]>)('fails closed on conflicting, invalid, demo or test allocations (%#)', (reps, subscriptions) => {
    expect(calculateFounderAvailability(reps, subscriptions, checkedAt)).toEqual({ status: 'unavailable', remaining: null, checkedAt: null })
  })
})
