import type { AmethystTradeBoardListing } from './trade-board-listings'

export interface AmethystTradeBoardFilterState {
  collection: string
  type: string
  rarity: string
  material: string
  size: string
}

export interface AmethystTradeBoardFilterOptions {
  collections: string[]
  types: string[]
  materials: string[]
  sizes: string[]
  rarityTags: string[]
}

const COLLECTION_TYPE_LABELS: Record<string, string> = {
  earring: 'Earrings',
  earrings: 'Earrings',
  ring: 'Ring',
  rings: 'Ring',
  necklace: 'Necklace',
  necklaces: 'Necklace',
  bracelet: 'Bracelet',
  bracelets: 'Bracelet',
  stack: 'Stack',
  stacks: 'Stack',
  pendant: 'Pendant',
  pendants: 'Pendant',
}

/** Display label only. Singular and plural jewelry words on a collection name collapse to one chip. */
export function displayCollectionLabel(value: string | null | undefined) {
  const cleaned = String(value ?? '').trim().replace(/\s+/g, ' ')
  const match = cleaned.match(/^(.*\S)\s+(earring|earrings|ring|rings|necklace|necklaces|bracelet|bracelets|stack|stacks|pendant|pendants)$/i)
  if (!match) return cleaned
  return `${match[1]} ${COLLECTION_TYPE_LABELS[match[2].toLowerCase()]}`
}

function sortValues(values: Set<string>) {
  return [...values].sort((left, right) => left.localeCompare(right))
}

export function deriveTradeBoardFilterOptions(
  listings: AmethystTradeBoardListing[],
): AmethystTradeBoardFilterOptions {
  const collections = new Set<string>()
  const types = new Set<string>()
  const materials = new Set<string>()
  const sizes = new Set<string>()
  const rarityTags = new Set<string>()

  for (const listing of listings) {
    if (listing.collection) collections.add(displayCollectionLabel(listing.collection))
    if (listing.type) types.add(listing.type)
    if (listing.material) materials.add(listing.material)
    if (listing.size) sizes.add(listing.size)
    if (listing.tier === 'diamond' || listing.tier === 'unicorn') {
      rarityTags.add(listing.tier)
    }
  }

  return {
    collections: sortValues(collections),
    types: sortValues(types),
    materials: sortValues(materials),
    sizes: sortValues(sizes),
    rarityTags: sortValues(rarityTags),
  }
}

export function filterCollectionOptions(
  collections: string[],
  searchTerm: string,
) {
  const normalizedSearch = searchTerm.trim().toLowerCase()
  if (!normalizedSearch) return collections

  return collections.filter((collection) =>
    collection.toLowerCase().includes(normalizedSearch),
  )
}

export function filterTradeBoardListings(
  listings: AmethystTradeBoardListing[],
  state: AmethystTradeBoardFilterState,
) {
  return listings.filter((listing) => {
    if (state.collection !== 'all' && displayCollectionLabel(listing.collection) !== state.collection) {
      return false
    }
    if (state.type !== 'all' && listing.type !== state.type) {
      return false
    }
    if (state.rarity !== 'all' && listing.tier !== state.rarity) {
      return false
    }
    if (state.material !== 'all' && listing.material !== state.material) {
      return false
    }
    if (state.size !== 'all' && listing.size !== state.size) {
      return false
    }
    return true
  })
}

export function countActiveTradeBoardFilters(
  state: AmethystTradeBoardFilterState,
) {
  return Object.values(state).filter((value) => value !== 'all').length
}
