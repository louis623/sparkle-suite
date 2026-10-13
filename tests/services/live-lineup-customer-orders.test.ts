import { describe, expect, it, vi } from 'vitest'

import {
  classifyLiveOrderLastSeen,
  countCustomersGoneQuiet,
  countCustomersOrderedDuringLiveInLast90Days,
  getLiveLineupCustomerActivity,
  isMissingLiveOrderColumn,
  liveOrderWindowStart,
  readRepLiveOrderActivity,
} from '@/lib/services/live-lineup-customer-orders'

const repId = '11111111-1111-4111-8111-111111111111'
const asOf = new Date('2026-10-13T00:00:00.000Z')

function client(payload: unknown, error: { message: string } | null = null) {
  return {
    rpc: vi.fn(async () => ({ data: payload, error })),
  }
}

describe('live lineup customer activity', () => {
  it('reads both dashboard counts from one rep-scoped call', async () => {
    const supabase = client({
      orderedDuringLiveLast90Days: 4,
      goneQuiet: 2,
      asOf: '2026-10-13T00:00:00+00',
      windowDays: 90,
    })

    await expect(getLiveLineupCustomerActivity(supabase as never, repId, asOf)).resolves.toEqual({
      orderedDuringLiveLast90Days: 4,
      goneQuiet: 2,
      asOf: '2026-10-13T00:00:00.000Z',
      windowDays: 90,
    })
    expect(supabase.rpc).toHaveBeenCalledWith('live_lineup_customer_activity', {
      p_rep_id: repId,
      p_as_of: '2026-10-13T00:00:00.000Z',
    })
    expect(await countCustomersOrderedDuringLiveInLast90Days(supabase as never, repId, asOf)).toBe(4)
    expect(await countCustomersGoneQuiet(supabase as never, repId, asOf)).toBe(2)
  })

  it('rejects a missing rep and a receipt that is not two counts', async () => {
    await expect(getLiveLineupCustomerActivity(client({}) as never, '', asOf)).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    })
    await expect(getLiveLineupCustomerActivity(client({
      orderedDuringLiveLast90Days: 1,
      goneQuiet: -1,
      windowDays: 90,
    }) as never, repId, asOf)).rejects.toMatchObject({ code: 'INVALID_INPUT' })
    await expect(getLiveLineupCustomerActivity(client(null, { message: 'missing' }) as never, repId, asOf)).rejects.toEqual({
      message: 'missing',
    })
  })

  it('keeps both counts when the activity call succeeds', async () => {
    const supabase = client({
      orderedDuringLiveLast90Days: 97,
      goneQuiet: 61,
      windowDays: 90,
    })

    await expect(readRepLiveOrderActivity(supabase as never, repId, asOf)).resolves.toEqual({
      available: true,
      orderedDuringLiveLast90Days: 97,
      goneQuiet: 61,
      windowStartIso: '2026-07-15T00:00:00.000Z',
    })
    expect(supabase.rpc).toHaveBeenCalledTimes(2)
  })

  it('reports LIVE order counts as not available yet when the query fails', async () => {
    const supabase = client(null, {
      message: 'Could not find the function public.live_lineup_customer_activity in the schema cache',
      code: 'PGRST202',
    })

    await expect(readRepLiveOrderActivity(supabase as never, repId, asOf)).resolves.toEqual({
      available: false,
      orderedDuringLiveLast90Days: null,
      goneQuiet: null,
      windowStartIso: null,
    })
  })

  it('classifies the latest LIVE order time', () => {
    const windowStart = liveOrderWindowStart(asOf)
    expect(classifyLiveOrderLastSeen('2026-08-01T00:00:00.000Z', windowStart)).toBe('ordered_during_live_90')
    expect(classifyLiveOrderLastSeen('2026-07-15T00:00:00.000Z', windowStart)).toBe('ordered_during_live_90')
    expect(classifyLiveOrderLastSeen(asOf.toISOString(), windowStart)).toBe('ordered_during_live_90')
    expect(classifyLiveOrderLastSeen('2026-06-01T00:00:00.000Z', windowStart)).toBe('gone_quiet')
    expect(classifyLiveOrderLastSeen('2026-10-14T00:00:00.000Z', windowStart)).toBeNull()
    expect(classifyLiveOrderLastSeen(null, windowStart)).toBeNull()
    expect(isMissingLiveOrderColumn({
      code: 'PGRST204',
      message: "Could not find the 'last_seen_in_lineup_at' column of 'customer_audience' in the schema cache",
    })).toBe(true)
    expect(isMissingLiveOrderColumn({ message: 'permission denied' })).toBe(false)
  })
})
