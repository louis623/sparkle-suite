import { beforeEach, describe, expect, it, vi } from 'vitest'

const { createAdmin } = vi.hoisted(() => ({ createAdmin: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: createAdmin }))
import { getFounderAvailability } from '@/lib/sparkle-suite/founder-availability-service'

type Result = { data: unknown[] | null; count: number | null; error: unknown }
const unavailable = { status: 'unavailable', remaining: null, checkedAt: null }
const rep = { id: 'safe-customer', founder_sequence: 1, account_classification: 'customer', subscriptions: { stripe_livemode: true } }
const subscription = { rep_id: 'safe-customer', founder_sequence: 1, stripe_livemode: true, reps: { account_classification: 'customer' } }

function stubQueries(repResult: Result, subscriptionResult: Result) {
  const queries: Record<string, ReturnType<typeof query>> = {}
  function query(result: Result) {
    const builder = {
      select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), not: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(), abortSignal: vi.fn().mockResolvedValue(result),
    }
    return builder
  }
  queries.reps = query(repResult)
  queries.subscriptions = query(subscriptionResult)
  createAdmin.mockReturnValue({ from: vi.fn((table: string) => queries[table]) })
  return queries
}

describe('read-only founder availability service', () => {
  beforeEach(() => vi.clearAllMocks())
  it('reads bounded exact allocation sets, validates completeness and returns no private fields', async () => {
    const queries = stubQueries({ data: [rep], count: 1, error: null }, { data: [subscription], count: 1, error: null })
    const result = await getFounderAvailability()
    expect(result).toEqual({ status: 'available', remaining: 19, checkedAt: expect.any(String) })
    for (const builder of Object.values(queries)) {
      expect(builder.eq).toHaveBeenCalledWith('pricing_tier', 'founder')
      if (builder === queries.subscriptions) expect(builder.eq).toHaveBeenCalledWith('stripe_livemode', true)
      expect(builder.not).toHaveBeenCalledWith('founder_sequence', 'is', null)
      expect(builder.limit).toHaveBeenCalledWith(21)
      expect(builder.abortSignal).toHaveBeenCalledWith(expect.any(AbortSignal))
    }
    expect(JSON.stringify(result)).not.toContain('safe-customer')
  })
  it.each([
    { data: null, count: null, error: { message: 'private provider failure' } },
    { data: [rep], count: 2, error: null },
    { data: [rep], count: null, error: null },
    { data: Array(21).fill(rep), count: 21, error: null },
  ])('fails closed for unavailable, incomplete, or excessive results (%#)', async result => {
    stubQueries(result, { data: [subscription], count: 1, error: null })
    expect(await getFounderAvailability()).toEqual(unavailable)
  })
  it('fails closed if the second query fails', async () => {
    stubQueries({ data: [rep], count: 1, error: null }, { data: null, count: null, error: {} })
    expect(await getFounderAvailability()).toEqual(unavailable)
  })
  it('does not leak credentials/provider failures if configuration is missing', async () => {
    createAdmin.mockImplementation(() => { throw new Error('secret configuration value') })
    expect(await getFounderAvailability()).toEqual(unavailable)
  })
})
