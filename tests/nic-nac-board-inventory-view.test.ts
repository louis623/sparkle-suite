import { describe, expect, it } from 'vitest'
import type { TradeListingWithDesign } from '@/lib/services/types'
import { getTradeListingDisplayFields } from '@/lib/services/trade-listing-display'

import {
  getBoardInventoryOptions,
  getBoardInventoryResults,
  hasActiveBoardInventoryBrowse,
} from '@/lib/nic-nac/board-inventory-view'

function listing(
  id: string,
  overrides: {
    itemNumber: string
    designName: string
    typePrefix: NonNullable<TradeListingWithDesign['design']>['type_prefix']
    collectionName: string | null
    listedAt: string | null
    status?: TradeListingWithDesign['status']
    bpMsrp?: number | null
  },
): TradeListingWithDesign {
  return {
    id,
    rep_id: 'rep-1',
    status: overrides.status ?? 'available',
    rep_notes: null,
    trade_preferences: null,
    listing_photo_url: null,
    uses_canonical_photo: true,
    listed_at: overrides.listedAt,
    removal_reason: null,
    deleted_at: null,
    created_at: overrides.listedAt ?? '2026-06-01T00:00:00.000Z',
    updated_at: overrides.listedAt ?? '2026-06-01T00:00:00.000Z',
    design: {
      id: `design-${id}`,
      item_number: overrides.itemNumber,
      design_name: overrides.designName,
      material: null,
      main_stone: null,
      bp_msrp: overrides.bpMsrp ?? 39.95,
      canonical_photo_url: null,
      type_prefix: overrides.typePrefix,
      collection: overrides.collectionName
        ? { id: `collection-${overrides.collectionName}`, name: overrides.collectionName }
        : null,
    },
  }
}

function nonItemNumberListing(
  id: string,
  overrides: {
    jewelryType: NonNullable<TradeListingWithDesign['manual_type_prefix']>
    collectionFamily: string
    collectionName: string | null
    size?: string | null
    listedAt: string | null
    status?: TradeListingWithDesign['status']
  },
): TradeListingWithDesign {
  return {
    id,
    rep_id: 'rep-1',
    listing_source: 'non_item_number',
    status: overrides.status ?? 'available',
    rep_notes: null,
    trade_preferences: null,
    ring_size: overrides.size ?? null,
    listing_photo_url: 'https://cdn.example.com/jewelry-photos/rep-1/manual.jpg',
    uses_canonical_photo: false,
    manual_type_prefix: overrides.jewelryType,
    manual_collection_family: overrides.collectionFamily,
    manual_collection_name: overrides.collectionName,
    manual_size: overrides.size ?? null,
    manual_photo_url: 'https://cdn.example.com/jewelry-photos/rep-1/manual.jpg',
    listed_at: overrides.listedAt,
    removal_reason: null,
    deleted_at: null,
    created_at: overrides.listedAt ?? '2026-06-01T00:00:00.000Z',
    updated_at: overrides.listedAt ?? '2026-06-01T00:00:00.000Z',
    design: null,
  }
}

const boardListings = [
  listing('old-ring', {
    itemNumber: 'RG100',
    designName: 'Rose Glow Ring',
    typePrefix: 'RG',
    collectionName: 'Birthday',
    listedAt: '2026-06-01T12:00:00.000Z',
  }),
  listing('new-ring', {
    itemNumber: 'RG200',
    designName: 'Celestial Ring',
    typePrefix: 'RG',
    collectionName: 'Celestial',
    listedAt: '2026-06-03T12:00:00.000Z',
  }),
  listing('necklace', {
    itemNumber: 'NK300',
    designName: 'Birthday Pendant',
    typePrefix: 'NK',
    collectionName: 'Birthday',
    listedAt: '2026-06-02T12:00:00.000Z',
  }),
  listing('removed-bracelet', {
    itemNumber: 'BR400',
    designName: 'Removed Bracelet',
    typePrefix: 'BR',
    collectionName: 'Retired',
    listedAt: '2026-06-04T12:00:00.000Z',
    status: 'removed',
  }),
  nonItemNumberListing('manual-ring', {
    jewelryType: 'RG',
    collectionFamily: 'Birthday',
    collectionName: 'July Birthday 2026',
    size: '7',
    listedAt: '2026-06-05T12:00:00.000Z',
  }),
]

describe('board inventory browsing helpers', () => {
  it('shows all available dancers when no filters are selected', () => {
    expect(
      hasActiveBoardInventoryBrowse({
        search: '   ',
        jewelryType: '',
        collection: '',
      }),
    ).toBe(false)

    expect(
      getBoardInventoryResults(boardListings, {
        search: '',
        jewelryType: '',
        collection: '',
      }).map((item) => item.id),
    ).toEqual(['manual-ring', 'new-ring', 'necklace', 'old-ring'])
  })

  it('builds dropdown options from available active board pieces only', () => {
    expect(getBoardInventoryOptions(boardListings)).toEqual({
      jewelryTypes: ['NK', 'RG'],
      collections: ['Birthday', 'Celestial', 'July Birthday 2026'],
      rarities: [],
      materials: ['Shown in photo'],
      sizes: ['7'],
    })
  })

  it('combines jewelry type and collection filters and sorts newest first', () => {
    const results = getBoardInventoryResults(boardListings, {
      search: '',
      jewelryType: 'RG',
      collection: 'Birthday',
    })

    expect(
      results.map((item) => getTradeListingDisplayFields(item).itemNumber),
    ).toEqual(['RG100'])
  })

  it('searches item number, design name, jewelry type, and collection', () => {
    expect(
      getBoardInventoryResults(boardListings, {
        search: 'birthday',
        jewelryType: '',
        collection: '',
      }).map((item) => getTradeListingDisplayFields(item).designName),
    ).toEqual([
      'July Birthday 2026 Ring - Size 7',
      'Birthday Pendant',
      'Rose Glow Ring',
    ])

    expect(
      getBoardInventoryResults(boardListings, {
        search: 'rg',
        jewelryType: '',
        collection: '',
      }).map((item) => getTradeListingDisplayFields(item).designName),
    ).toEqual([
      'July Birthday 2026 Ring - Size 7',
      'Celestial Ring',
      'Rose Glow Ring',
    ])
  })

  it('searches and filters non-item-number pieces by controlled display fields', () => {
    const results = getBoardInventoryResults(boardListings, {
      search: 'size 7',
      jewelryType: 'RG',
      collection: 'July Birthday 2026',
    })

    expect(results).toHaveLength(1)
    expect(getTradeListingDisplayFields(results[0]).designName).toBe(
      'July Birthday 2026 Ring - Size 7',
    )
  })

  it('returns an empty result set when active filters do not match board pieces', () => {
    expect(
      getBoardInventoryResults(boardListings, {
        search: 'not-on-board',
        jewelryType: '',
        collection: '',
      }),
    ).toEqual([])
  })

  it('uses the customer view sort and size controls on the same available set', () => {
    expect(getBoardInventoryResults(boardListings, {
      search: '', jewelryType: '', collection: '', size: '7', sortMode: 'name',
    }).map((item) => item.id)).toEqual(['manual-ring'])
    expect(getBoardInventoryResults(boardListings, {
      search: '', jewelryType: '', collection: '', material: 'Shown in photo',
    }).map((item) => item.id)).toEqual(['manual-ring'])
    expect(getBoardInventoryResults(boardListings, {
      search: '', jewelryType: '', collection: '', sortMode: 'name',
    }).map((item) => item.id)).toEqual(['necklace', 'new-ring', 'manual-ring', 'old-ring'])
  })

})
