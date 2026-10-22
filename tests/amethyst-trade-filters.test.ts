import { describe, expect, it } from 'vitest'

import {
  countActiveTradeBoardFilters,
  deriveTradeBoardFilterOptions,
  displayCollectionLabel,
  filterCollectionOptions,
  filterTradeBoardListings,
  type AmethystTradeBoardFilterState,
} from '@/lib/amethyst/trade-board-filters'
import type { AmethystTradeBoardListing } from '@/lib/amethyst/trade-board-listings'

const listings: AmethystTradeBoardListing[] = [
  {
    id: 'listing-1',
    name: 'Birthday Bloom Ring',
    collection: 'Birthday',
    type: 'Ring',
    material: 'Sterling silver',
    stone: 'Diamond accent',
    msrp: 88,
    size: '8',
    note: 'Item-for-item only.',
    glyph: 'B',
    tier: 'diamond',
    photoUrl: null,
    photoSource: 'missing',
  },
  {
    id: 'listing-2',
    name: 'Velvet Hour Necklace',
    collection: 'OG',
    type: 'Necklace',
    material: 'Triple-plated gold',
    stone: 'Moonstone accent',
    msrp: 42,
    size: null,
    note: 'Item-for-item only.',
    glyph: 'V',
    tier: 'everyday',
    photoUrl: null,
    photoSource: 'missing',
  },
  {
    id: 'listing-3',
    name: 'Aurora Stack',
    collection: 'Stacks',
    type: 'Stack',
    material: 'Mixed alloy plating',
    stone: 'Crystal mix',
    msrp: 68,
    size: null,
    note: 'Item-for-item only.',
    glyph: 'A',
    tier: 'unicorn',
    photoUrl: null,
    photoSource: 'missing',
  },
]

describe('Amethyst dance floor filters', () => {
  it('derives sorted, deduplicated filter options from listings', () => {
    expect(deriveTradeBoardFilterOptions(listings)).toEqual({
      collections: ['Birthday', 'OG', 'Stacks'],
      types: ['Necklace', 'Ring', 'Stack'],
      materials: ['Mixed alloy plating', 'Sterling silver', 'Triple-plated gold'],
      sizes: ['8'],
      rarityTags: ['diamond', 'unicorn'],
    })
  })

  it('filters listings by the selected filter state', () => {
    const state: AmethystTradeBoardFilterState = {
      collection: 'Birthday',
      type: 'Ring',
      rarity: 'diamond',
      material: 'Sterling silver',
      size: '8',
    }

    const filtered = filterTradeBoardListings(listings, state)

    expect(filtered.map((listing) => listing.id)).toEqual(['listing-1'])
    expect(countActiveTradeBoardFilters(state)).toBe(5)
  })

  it('filters collection options with a case-insensitive search term', () => {
    const options = deriveTradeBoardFilterOptions(listings)

    expect(filterCollectionOptions(options.collections, 'stack')).toEqual([
      'Stacks',
    ])
    expect(filterCollectionOptions(options.collections, '')).toEqual(
      options.collections,
    )
  })

  it('shows Original Earring and Original Earrings as one collection chip', () => {
    const mixed = [
      { ...listings[0], id: 'earring', collection: 'Original Earring' },
      { ...listings[1], id: 'earrings', collection: 'Original Earrings' },
    ]

    expect(displayCollectionLabel('Original Earring')).toBe('Original Earrings')
    expect(deriveTradeBoardFilterOptions(mixed).collections).toEqual(['Original Earrings'])
    expect(filterTradeBoardListings(mixed, {
      collection: 'Original Earrings',
      type: 'all',
      rarity: 'all',
      material: 'all',
      size: 'all',
    }).map((listing) => listing.id)).toEqual(['earring', 'earrings'])
  })
})
