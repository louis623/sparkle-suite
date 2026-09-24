import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import {
  getDanceFloorDancerCounts,
  getRepLocalDayBounds,
} from '@/lib/services/trade-board-stats'

describe('Dance Floor dancer counts', () => {
  it('uses local midnight boundaries through daylight saving changes', () => {
    expect(getRepLocalDayBounds(
      new Date('2026-03-08T16:00:00.000Z'), 'America/New_York',
    )).toEqual({
      start: '2026-03-08T05:00:00.000Z',
      end: '2026-03-09T04:00:00.000Z',
    })
    expect(getRepLocalDayBounds(
      new Date('2026-11-01T16:00:00.000Z'), 'America/New_York',
    )).toEqual({
      start: '2026-11-01T04:00:00.000Z',
      end: '2026-11-02T05:00:00.000Z',
    })
  })

  it('counts all available cards independently of board pagination and filters today by rep time zone', async () => {
    const queries: Array<Array<unknown[]>> = []
    const supabase = {
      from(table: string) {
        expect(table).toBe('trade_listings')
        const calls: Array<unknown[]> = []
        queries.push(calls)
        const query = {
          select(...args: unknown[]) { calls.push(['select', ...args]); return query },
          eq(...args: unknown[]) { calls.push(['eq', ...args]); return query },
          gte(...args: unknown[]) { calls.push(['gte', ...args]); return query },
          lt(...args: unknown[]) { calls.push(['lt', ...args]); return query },
          then(resolve: (value: unknown) => unknown) {
            return Promise.resolve(resolve({ count: queries.indexOf(calls) === 0 ? 24 : 3, error: null }))
          },
        }
        return query
      },
    } as unknown as SupabaseClient

    await expect(getDanceFloorDancerCounts(
      supabase, 'rep-1', 'America/Chicago', new Date('2026-09-24T02:00:00.000Z'),
    )).resolves.toEqual({ availableDancerCount: 24, newDancersTodayCount: 3 })
    expect(queries).toHaveLength(2)
    for (const calls of queries) {
      expect(calls).toContainEqual(['select', 'id', { count: 'exact', head: true }])
      expect(calls).toContainEqual(['eq', 'rep_id', 'rep-1'])
      expect(calls).toContainEqual(['eq', 'status', 'available'])
    }
    expect(queries[1]).toContainEqual(['gte', 'created_at', '2026-09-23T05:00:00.000Z'])
    expect(queries[1]).toContainEqual(['lt', 'created_at', '2026-09-24T05:00:00.000Z'])
  })
})
