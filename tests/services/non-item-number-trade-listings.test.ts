import { describe, expect, it, vi } from 'vitest'

import {
  addNonItemNumberListing,
  getMyBoard,
} from '@/lib/services/trade-board'

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

  maybeSingle() {
    return Promise.resolve(this.result)
  }

  single() {
    return Promise.resolve(this.result)
  }

  then(resolve: (value: Record<string, unknown>) => unknown) {
    return Promise.resolve(this.result).then(resolve)
  }
}

function makeCatalogListing() {
  return {
    id: 'catalog-listing-1',
    rep_id: 'rep-1',
    listing_source: 'catalog',
    status: 'available',
    rep_notes: null,
    trade_preferences: null,
    ring_size: '8',
    listing_photo_url: null,
    uses_canonical_photo: true,
    listed_at: '2026-06-20T12:00:00.000Z',
    removal_reason: null,
    deleted_at: null,
    created_at: '2026-06-20T12:00:00.000Z',
    updated_at: '2026-06-20T12:00:00.000Z',
    manual_type_prefix: null,
    manual_collection_family: null,
    manual_collection_name: null,
    manual_size: null,
    manual_photo_url: null,
    design: {
      id: 'design-1',
      item_number: 'RG31452',
      design_name: 'Celeste Ring',
      material: 'Sterling Silver',
      main_stone: 'Topaz',
      bp_msrp: 42,
      canonical_photo_url: 'https://cdn.example.com/catalog.jpg',
      type_prefix: 'RG',
      collection: { id: 'collection-1', name: 'July Birthday 2026' },
    },
  }
}

function makeNonItemNumberListing() {
  return {
    id: 'manual-listing-1',
    rep_id: 'rep-1',
    listing_source: 'non_item_number',
    status: 'available',
    rep_notes: null,
    trade_preferences: null,
    ring_size: null,
    listing_photo_url: 'https://cdn.example.com/manual-ring.jpg',
    uses_canonical_photo: false,
    listed_at: '2026-06-21T12:00:00.000Z',
    removal_reason: null,
    deleted_at: null,
    created_at: '2026-06-21T12:00:00.000Z',
    updated_at: '2026-06-21T12:00:00.000Z',
    manual_type_prefix: 'RG',
    manual_collection_family: 'Birthday',
    manual_collection_name: 'July Birthday 2026',
    manual_size: '7',
    manual_photo_url: 'https://cdn.example.com/manual-ring.jpg',
    design: null,
  }
}

describe('non-item-number trade listings service', () => {
  it('creates a rep-owned listing without touching the shared jewelry database', async () => {
    const insertSingle = vi.fn().mockResolvedValue({
      data: { id: 'manual-listing-1', status: 'available' },
      error: null,
    })
    const insertSelect = vi.fn().mockReturnValue({ single: insertSingle })
    const insert = vi.fn().mockReturnValue({ select: insertSelect })
    const from = vi.fn((table: string) => {
      if (table === 'trade_listings') return { insert }
      if (table === 'jewelry_designs') {
        throw new Error('non-item-number listings must not touch jewelry_designs')
      }
      throw new Error(`unexpected table ${table}`)
    })

    const result = await addNonItemNumberListing({ from } as never, 'rep-1', {
      jewelryType: 'RG',
      collectionFamily: 'Birthday',
      collectionName: 'July Birthday 2026',
      size: '7',
      photoUrl: 'https://cdn.example.com/jewelry-photos/rep-1/manual-ring.jpg',
      repNotes: 'Customer photo approved',
    })

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        rep_id: 'rep-1',
        design_id: null,
        listing_source: 'non_item_number',
        manual_type_prefix: 'RG',
        manual_collection_family: 'Birthday',
        manual_collection_name: 'July Birthday 2026',
        manual_size: '7',
        manual_photo_url:
          'https://cdn.example.com/jewelry-photos/rep-1/manual-ring.jpg',
        listing_photo_url:
          'https://cdn.example.com/jewelry-photos/rep-1/manual-ring.jpg',
        uses_canonical_photo: false,
      }),
    )
    expect(from).not.toHaveBeenCalledWith('jewelry_designs')
    expect(result).toMatchObject({
      listingId: 'manual-listing-1',
      listingSource: 'non_item_number',
      displayName: 'July Birthday 2026 Ring - Size 7',
    })
  })

  it('requires size when the non-item-number piece is a ring', async () => {
    await expect(
      addNonItemNumberListing({ from: vi.fn() } as never, 'rep-1', {
        jewelryType: 'RG',
        collectionFamily: 'Birthday',
      photoUrl: 'https://cdn.example.com/jewelry-photos/rep-1/manual-ring.jpg',
      }),
    ).rejects.toMatchObject({
      code: 'INVALID_INPUT',
    })
  })

  it('returns catalog and non-item-number listings in one board read', async () => {
    const boardQuery = new ThenableQuery({
      data: [makeCatalogListing(), makeNonItemNumberListing()],
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
      { sortBy: 'listed_at', sortOrder: 'asc' },
      { now: new Date('2026-06-29T12:00:00.000Z') },
    )

    expect(board.listings.map((listing) => listing.id)).toEqual([
      'catalog-listing-1',
      'manual-listing-1',
    ])
    expect(board.summary.totalPieces).toBe(2)
    expect(board.summary).not.toHaveProperty('totalMsrp')
    expect(board.summary.typeBreakdown.RG).toBe(2)
  })
})
