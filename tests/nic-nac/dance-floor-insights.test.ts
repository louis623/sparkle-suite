import { describe, expect, it } from 'vitest'
import {
  buildDanceFloorInsights,
  daysOnDanceFloor,
  normalizeCollectionName,
  type DanceFloorInsightInput,
} from '@/lib/services/dance-floor-insights'

const NOW = new Date('2026-10-13T16:00:00.000Z')
const DAY = 24 * 60 * 60 * 1000

function piece(overrides: Partial<DanceFloorInsightInput> = {}): DanceFloorInsightInput {
  return {
    id: overrides.id ?? 'piece-1',
    name: 'Unapologetically Luxe',
    itemNumber: 'ER49274',
    typePrefix: 'ER',
    collectionName: 'OG',
    price: 120,
    status: 'available',
    removalReason: null,
    listedAt: new Date(NOW.getTime() - 50.3 * DAY).toISOString(),
    createdAt: new Date(NOW.getTime() - 50.3 * DAY).toISOString(),
    updatedAt: new Date(NOW.getTime() - 50.3 * DAY).toISOString(),
    deletedAt: null,
    requestCount: 0,
    ...overrides,
  }
}

describe('dance floor insight cleanup', () => {
  it('merges duplicate collection names and hides mistakes', () => {
    expect(normalizeCollectionName('OG')).toBe('Original (OG)')
    expect(normalizeCollectionName('Original')).toBe('Original (OG)')
    expect(normalizeCollectionName('  og originals ')).toBe('Original (OG)')
    expect(normalizeCollectionName('Sparkling Gems Exclusive Bringback')).toBe('Exclusive Bringback')
    expect(normalizeCollectionName('Exclusive Bringback')).toBe('Exclusive Bringback')

    const insights = buildDanceFloorInsights(
      [
        piece({ id: 'og', collectionName: 'OG' }),
        piece({ id: 'original', collectionName: 'Original', name: 'Drama On Arrival', typePrefix: 'NK', itemNumber: 'NK78888' }),
        piece({
          id: 'bringback',
          collectionName: 'Sparkling Gems Exclusive Bringback',
          name: 'Sparkling Gems',
          itemNumber: 'ER43437',
          listedAt: new Date(NOW.getTime() - 31.5 * DAY).toISOString(),
        }),
        piece({
          id: 'mistake',
          name: 'Test entry',
          status: 'removed',
          removalReason: 'mistake',
          deletedAt: NOW.toISOString(),
        }),
      ],
      NOW,
    )

    expect(insights.pieceCount).toBe(3)
    expect(insights.mix.collections.map((collection) => collection.name)).toEqual([
      'Original (OG)',
      'Exclusive Bringback',
    ])
    expect(insights.outcomes.slices.map((slice) => slice.key)).toEqual(['on_floor'])
    expect(JSON.stringify(insights)).not.toContain('Test entry')
  })

  it('keeps swapped pieces with a missing exit out of the fast-mover list', () => {
    const soldAt = new Date(NOW.getTime() - 2 * DAY).toISOString()
    const insights = buildDanceFloorInsights(
      [
        piece({
          id: 'fast',
          name: 'The Sugar Kiss Earrings',
          status: 'traded',
          removalReason: null,
          listedAt: new Date(NOW.getTime() - 19.5 * DAY).toISOString(),
          updatedAt: soldAt,
          deletedAt: null,
        }),
        piece({
          id: 'no-exit',
          name: 'Swapped without a date',
          status: 'traded',
          removalReason: null,
          listedAt: new Date(NOW.getTime() - 10 * DAY).toISOString(),
          updatedAt: new Date(NOW.getTime() - 10 * DAY).toISOString(),
          deletedAt: null,
        }),
        piece({
          id: 'other',
          name: 'The Florence Earrings',
          status: 'removed',
          removalReason: 'other',
          listedAt: new Date(NOW.getTime() - 55 * DAY).toISOString(),
          deletedAt: NOW.toISOString(),
        }),
        piece({ id: 'sitter', name: 'Unapologetically Luxe', requestCount: 2 }),
      ],
      NOW,
    )

    expect(daysOnDanceFloor(piece({
      status: 'removed',
      removalReason: 'sold',
      listedAt: new Date(NOW.getTime() - 10 * DAY).toISOString(),
      updatedAt: new Date(NOW.getTime() - 10 * DAY).toISOString(),
      deletedAt: null,
    }), NOW)).toBeNull()
    expect(insights.swapped).toBe(2)
    expect(insights.movers.fastest.map((row) => row.name)).toEqual(['The Sugar Kiss Earrings'])
    expect(insights.movers.earlyData).toBe(true)
    expect(insights.movers.swapCount).toBe(2)
    expect(insights.outcomes.needsCleanup).toBe(true)
    expect(insights.outcomes.slices.find((slice) => slice.key === 'other')?.count).toBe(1)
    expect(insights.sitting[0]).toMatchObject({ name: 'Unapologetically Luxe', days: 50, requestCount: 2 })
    expect(insights.sitting45).toBe(1)
  })

  it('treats an empty floor and a pending trade as still listed', () => {
    expect(buildDanceFloorInsights([], NOW).empty).toBe(true)
    const insights = buildDanceFloorInsights(
      [
        piece({ id: 'pending', status: 'pending_trade', name: 'Waiting' }),
        piece({
          id: 'traded',
          name: 'Already traded',
          status: 'traded',
          removalReason: null,
          listedAt: new Date(NOW.getTime() - 12 * DAY).toISOString(),
          deletedAt: new Date(NOW.getTime() - 2 * DAY).toISOString(),
        }),
      ],
      NOW,
    )
    expect(insights.onFloor).toBe(1)
    expect(insights.outcomes.slices.map((slice) => slice.label)).toEqual(['Still on floor', 'Swapped'])
  })
})
