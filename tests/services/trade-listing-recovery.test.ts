import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

import {
  getTradeListingRecoveryWindowDays,
  getTradeListingRecoveryCutoffIso,
  purgeExpiredRemovedListings,
  removeListing,
  restoreListing,
  getMyBoard,
} from '@/lib/services/trade-board'

const fixedNow = new Date('2026-05-17T12:00:00.000Z')

class ThenableQuery {
  filters: Array<[string, unknown, unknown?]> = []
  updatePayload: Record<string, unknown> | null = null

  constructor(private readonly result: Record<string, unknown>) {}

  select() {
    return this
  }

  eq(column: string, value: unknown) {
    this.filters.push(['eq', column, value])
    return this
  }

  neq(column: string, value: unknown) {
    this.filters.push(['neq', column, value])
    return this
  }

  lt(column: string, value: unknown) {
    this.filters.push(['lt', column, value])
    return this
  }

  in(column: string, value: unknown) {
    this.filters.push(['in', column, value])
    return this
  }

  order() {
    return this
  }

  limit() {
    return this
  }

  range() {
    return this
  }

  maybeSingle() {
    return Promise.resolve(this.result)
  }

  then(resolve: (value: Record<string, unknown>) => unknown) {
    return Promise.resolve(this.result).then(resolve)
  }
}

function makeDesign(name = 'Aurora Ring') {
  return {
    id: 'design-1',
    item_number: 'RG100',
    design_name: name,
    material: 'Sterling Silver',
    main_stone: 'Topaz',
    bp_msrp: 75,
    canonical_photo_url: null,
    type_prefix: 'RG',
    collection: { id: 'collection-1', name: 'Lustre' },
  }
}

function makeListing(overrides: Record<string, unknown>) {
  return {
    id: 'listing-1',
    rep_id: 'rep-1',
    status: 'removed',
    rep_notes: null,
    trade_preferences: null,
    listing_photo_url: null,
    uses_canonical_photo: true,
    listed_at: '2026-05-01T12:00:00.000Z',
    removal_reason: 'mistake',
    deleted_at: '2026-05-16T12:00:00.000Z',
    created_at: '2026-05-01T12:00:00.000Z',
    updated_at: '2026-05-16T12:00:00.000Z',
    design: makeDesign(),
    ...overrides,
  }
}

describe('trade listing recovery config', () => {
  const original = process.env.SPARKLE_TRADE_LISTING_RECOVERY_DAYS

  afterEach(() => {
    if (original === undefined) {
      delete process.env.SPARKLE_TRADE_LISTING_RECOVERY_DAYS
    } else {
      process.env.SPARKLE_TRADE_LISTING_RECOVERY_DAYS = original
    }
  })

  it('defaults the recovery window to 7 days', () => {
    delete process.env.SPARKLE_TRADE_LISTING_RECOVERY_DAYS

    expect(getTradeListingRecoveryWindowDays()).toBe(7)
  })

  it('supports switching the recovery window to 30 days', () => {
    process.env.SPARKLE_TRADE_LISTING_RECOVERY_DAYS = '30'

    expect(getTradeListingRecoveryWindowDays()).toBe(30)
  })

  it('uses the same cutoff helper for read and purge windows', () => {
    expect(getTradeListingRecoveryCutoffIso(fixedNow, 7)).toBe(
      '2026-05-10T12:00:00.000Z',
    )
    expect(getTradeListingRecoveryCutoffIso(fixedNow, 30)).toBe(
      '2026-04-17T12:00:00.000Z',
    )
  })
})

describe('trade listing recovery service', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(fixedNow)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('stamps deleted_at when a listing is removed', async () => {
    const listingFetch = new ThenableQuery({
      data: makeListing({ status: 'available', deleted_at: null }),
      error: null,
    })
    const listingUpdate = new ThenableQuery({ data: null, error: null })
    const pendingRequestFetch = new ThenableQuery({ data: null, error: null })
    const update = vi.fn((payload: Record<string, unknown>) => {
      listingUpdate.updatePayload = payload
      return listingUpdate
    })

    const from = vi.fn((table: string) => {
      if (table === 'trade_listings') {
        return {
          select: vi.fn(() => listingFetch),
          update,
        }
      }
      if (table === 'trade_requests') {
        return { select: vi.fn(() => pendingRequestFetch) }
      }
      throw new Error(`unexpected table ${table}`)
    })

    await removeListing({ from } as never, 'rep-1', {
      listingId: 'listing-1',
      reason: 'mistake',
    })

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'removed',
        removal_reason: 'mistake',
        deleted_at: fixedNow.toISOString(),
      }),
    )
  })

  it('blocks item-number removal when multiple active physical listings match', async () => {
    const designLookup = new ThenableQuery({
      data: [{ id: 'design-1' }],
      error: null,
    })
    const listingCandidates = new ThenableQuery({
      data: [
        { id: 'listing-newer', created_at: '2026-05-16T12:00:00.000Z' },
        { id: 'listing-older', created_at: '2026-05-15T12:00:00.000Z' },
      ],
      error: null,
    })
    const update = vi.fn()
    const from = vi.fn((table: string) => {
      if (table === 'jewelry_designs') {
        return { select: vi.fn(() => designLookup) }
      }
      if (table === 'trade_listings') {
        return {
          select: vi.fn(() => listingCandidates),
          update,
        }
      }
      throw new Error(`unexpected table ${table}`)
    })

    await expect(
      removeListing({ from } as never, 'rep-1', {
        itemNumber: 'ER13229',
        reason: 'mistake',
      }),
    ).rejects.toMatchObject({
      code: 'AMBIGUOUS_LISTING',
    })
    expect(update).not.toHaveBeenCalled()
  })

  it('blocks item-number removal when the catalog item has material variants', async () => {
    const designLookup = new ThenableQuery({
      data: [{ id: 'design-silver' }, { id: 'design-gold' }],
      error: null,
    })
    const update = vi.fn()
    const from = vi.fn((table: string) => {
      if (table === 'jewelry_designs') {
        return { select: vi.fn(() => designLookup) }
      }
      if (table === 'trade_listings') {
        return { update }
      }
      throw new Error(`unexpected table ${table}`)
    })

    await expect(
      removeListing({ from } as never, 'rep-1', {
        itemNumber: 'ER13229',
        reason: 'mistake',
      }),
    ).rejects.toMatchObject({
      code: 'NEEDS_MATERIAL_VARIANT',
    })
    expect(update).not.toHaveBeenCalled()
  })

  it('restores a removed listing inside the configured 7-day window', async () => {
    const fetch = new ThenableQuery({
      data: makeListing({ deleted_at: '2026-05-12T12:00:00.000Z' }),
      error: null,
    })
    const updateResult = new ThenableQuery({ data: null, error: null })
    const update = vi.fn((payload: Record<string, unknown>) => {
      updateResult.updatePayload = payload
      return updateResult
    })
    const from = vi.fn(() => ({
      select: vi.fn(() => fetch),
      update,
    }))

    const result = await restoreListing(
      { from } as never,
      'rep-1',
      { listingId: 'listing-1' },
      { now: fixedNow, recoveryWindowDays: 7 },
    )

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'available',
        removal_reason: null,
        deleted_at: null,
      }),
    )
    expect(result).toMatchObject({
      listingId: 'listing-1',
      status: 'available',
      recoveryWindowDays: 7,
    })
  })

  it('blocks restore after the 7-day window but allows the same listing with the 30-day switch', async () => {
    const makeClient = () => {
      const fetch = new ThenableQuery({
        data: makeListing({ deleted_at: '2026-05-01T12:00:00.000Z' }),
        error: null,
      })
      const update = vi.fn(() => new ThenableQuery({ data: null, error: null }))
      return {
        client: {
          from: vi.fn(() => ({
            select: vi.fn(() => fetch),
            update,
          })),
        } as never,
        update,
      }
    }

    await expect(
      restoreListing(
        makeClient().client,
        'rep-1',
        { listingId: 'listing-1' },
        { now: fixedNow, recoveryWindowDays: 7 },
      ),
    ).rejects.toMatchObject({ code: 'LISTING_RECOVERY_EXPIRED' })

    const thirtyDay = makeClient()
    await restoreListing(
      thirtyDay.client,
      'rep-1',
      { listingId: 'listing-1' },
      { now: fixedNow, recoveryWindowDays: 30 },
    )

    expect(thirtyDay.update).toHaveBeenCalled()
  })

  it('hides removed listings from default board reads', async () => {
    const boardQuery = new ThenableQuery({
      data: [
        makeListing({
          id: 'recoverable',
          deleted_at: '2026-05-12T12:00:00.000Z',
        }),
        makeListing({
          id: 'expired',
          deleted_at: '2026-05-01T12:00:00.000Z',
        }),
        makeListing({
          id: 'available',
          status: 'available',
          deleted_at: null,
          removal_reason: null,
        }),
      ],
      error: null,
    })
    const requestCountQuery = new ThenableQuery({ count: 0, error: null })
    const from = vi.fn((table: string) => {
      if (table === 'trade_listings') return { select: vi.fn(() => boardQuery) }
      if (table === 'trade_requests') return { select: vi.fn(() => requestCountQuery) }
      throw new Error(`unexpected table ${table}`)
    })

    const board = await getMyBoard(
      { from } as never,
      'rep-1',
      {},
      { now: fixedNow, recoveryWindowDays: 7 },
    )

    expect(board.listings.map((listing) => listing.id)).toEqual(['available'])
  })

  it('shows only recoverable removed listings when explicitly reading removed listings', async () => {
    const boardQuery = new ThenableQuery({
      data: [
        makeListing({
          id: 'recoverable',
          deleted_at: '2026-05-12T12:00:00.000Z',
        }),
        makeListing({
          id: 'expired',
          deleted_at: '2026-05-01T12:00:00.000Z',
        }),
        makeListing({
          id: 'available',
          status: 'available',
          deleted_at: null,
          removal_reason: null,
        }),
      ],
      error: null,
    })
    const requestCountQuery = new ThenableQuery({ count: 0, error: null })
    const from = vi.fn((table: string) => {
      if (table === 'trade_listings') return { select: vi.fn(() => boardQuery) }
      if (table === 'trade_requests') return { select: vi.fn(() => requestCountQuery) }
      throw new Error(`unexpected table ${table}`)
    })

    const board = await getMyBoard(
      { from } as never,
      'rep-1',
      { statusFilter: 'removed' },
      { now: fixedNow, recoveryWindowDays: 7 },
    )

    expect(board.listings.map((listing) => listing.id)).toEqual([
      'recoverable',
    ])
  })

  it('sorts filtered board listings by supported design fields before paging', async () => {
    const boardQuery = new ThenableQuery({
      data: [
        makeListing({
          id: 'listing-middle',
          status: 'available',
          deleted_at: null,
          removal_reason: null,
          design: {
            ...makeDesign('Middle Ring'),
            item_number: 'RG200',
            bp_msrp: 75,
          },
        }),
        makeListing({
          id: 'listing-low',
          status: 'available',
          deleted_at: null,
          removal_reason: null,
          design: {
            ...makeDesign('Low Ring'),
            item_number: 'RG100',
            bp_msrp: 42,
          },
        }),
        makeListing({
          id: 'listing-high',
          status: 'available',
          deleted_at: null,
          removal_reason: null,
          design: {
            ...makeDesign('High Ring'),
            item_number: 'RG300',
            bp_msrp: 128,
          },
        }),
      ],
      error: null,
    })
    const requestCountQuery = new ThenableQuery({ count: 0, error: null })
    const from = vi.fn((table: string) => {
      if (table === 'trade_listings') return { select: vi.fn(() => boardQuery) }
      if (table === 'trade_requests') return { select: vi.fn(() => requestCountQuery) }
      throw new Error(`unexpected table ${table}`)
    })

    const board = await getMyBoard(
      { from } as never,
      'rep-1',
      { sortBy: 'design_name', sortOrder: 'desc', limit: 2, offset: 1 },
      { now: fixedNow, recoveryWindowDays: 7 },
    )

    expect(board.listings.map((listing) => listing.id)).toEqual([
      'listing-low',
      'listing-high',
    ])
    expect(board.summary.totalPieces).toBe(2)
  })

  it('purges expired removed listings using the same configured cutoff', async () => {
    const purgeQuery = new ThenableQuery({
      data: [{ id: 'expired-1' }, { id: 'expired-2' }],
      error: null,
    })
    const deleteFn = vi.fn(() => purgeQuery)
    const from = vi.fn(() => ({ delete: deleteFn }))

    const result = await purgeExpiredRemovedListings(
      { from } as never,
      { now: fixedNow, recoveryWindowDays: 7 },
    )

    expect(purgeQuery.filters).toContainEqual(['eq', 'status', 'removed'])
    expect(purgeQuery.filters).toContainEqual([
      'lt',
      'deleted_at',
      '2026-05-10T12:00:00.000Z',
    ])
    expect(result).toEqual({
      purgedCount: 2,
      cutoffIso: '2026-05-10T12:00:00.000Z',
    })
  })
})
