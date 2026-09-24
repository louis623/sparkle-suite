import type { TradeListingWithDesign } from '@/lib/services/types'
import { getTradeListingDisplayFields } from '@/lib/services/trade-listing-display'

export type BoardInventoryFilters = {
  search: string
  jewelryType: string
  collection: string
  rarity?: string
  material?: string
  size?: string
  sortMode?: 'newest' | 'collection' | 'type' | 'rarity' | 'name'
}

export type BoardInventoryOptions = {
  jewelryTypes: string[]
  collections: string[]
  rarities: string[]
  materials: string[]
  sizes: string[]
}

export function getBoardInventoryMaterial(listing: TradeListingWithDesign) {
  const display = getTradeListingDisplayFields(listing)
  return display.material ??
    (display.listingSource === 'non_item_number' ? 'Shown in photo' : null)
}

export function hasActiveBoardInventoryBrowse(filters: BoardInventoryFilters) {
  return Boolean(
    filters.search.trim() ||
      filters.jewelryType.trim() ||
      filters.collection.trim() ||
      filters.rarity?.trim() ||
      filters.material?.trim() ||
      filters.size?.trim() ||
      (filters.sortMode && filters.sortMode !== 'newest'),
  )
}

export function getBoardInventoryOptions(
  listings: TradeListingWithDesign[],
): BoardInventoryOptions {
  const jewelryTypes = new Set<string>()
  const collections = new Set<string>()
  const rarities = new Set<string>()
  const materials = new Set<string>()
  const sizes = new Set<string>()

  for (const listing of listings) {
    if (listing.status !== 'available') continue
    const display = getTradeListingDisplayFields(listing)
    jewelryTypes.add(display.typePrefix)
    const collectionName = display.collectionName?.trim()
    if (collectionName) {
      collections.add(collectionName)
    }
    const rarity = listing.rarity_classification ??
      listing.design?.rarity_classification ?? 'standard'
    if (rarity === 'diamond' || rarity === 'unicorn') rarities.add(rarity)
    const material = getBoardInventoryMaterial(listing)
    if (material) materials.add(material)
    if (display.size) sizes.add(display.size)
  }

  return {
    jewelryTypes: [...jewelryTypes].sort((a, b) => a.localeCompare(b)),
    collections: [...collections].sort((a, b) => a.localeCompare(b)),
    rarities: [...rarities].sort((a, b) => a.localeCompare(b)),
    materials: [...materials].sort((a, b) => a.localeCompare(b)),
    sizes: [...sizes].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
  }
}

export function getBoardInventoryResults(
  listings: TradeListingWithDesign[],
  filters: BoardInventoryFilters,
): TradeListingWithDesign[] {
  const terms = normalizeInventorySearch(filters.search).split(/\s+/).filter(Boolean)
  const jewelryType = filters.jewelryType.trim()
  const collection = filters.collection.trim()
  const rarity = filters.rarity?.trim()
  const material = filters.material?.trim()
  const size = filters.size?.trim()

  return listings
    .filter((listing) => listing.status === 'available')
    .filter((listing) => {
      const display = getTradeListingDisplayFields(listing)
      if (jewelryType && display.typePrefix !== jewelryType) return false
      if (collection && display.collectionName !== collection) return false
      if (
        rarity &&
        (listing.rarity_classification ?? listing.design?.rarity_classification ?? 'standard') !== rarity
      ) return false
      if (material && getBoardInventoryMaterial(listing) !== material) return false
      if (size && display.size !== size) return false
      return terms.every((term) => getSearchableListingText(listing).includes(term))
    })
    .sort((a, b) => sortBoardListings(a, b, filters.sortMode ?? 'newest'))
}

function normalizeInventorySearch(value: string) {
  return value.trim().toLowerCase()
}

function getSearchableListingText(listing: TradeListingWithDesign) {
  const display = getTradeListingDisplayFields(listing)
  return [
    display.itemNumber ?? '',
    display.designName,
    display.typePrefix,
    display.typeLabel,
    display.collectionName ?? '',
    display.size ?? '',
    getBoardInventoryMaterial(listing) ?? '',
    display.mainStone ?? '',
    listing.rarity_classification ?? listing.design?.rarity_classification ?? '',
  ]
    .join(' ')
    .toLowerCase()
}

function sortBoardListings(
  a: TradeListingWithDesign,
  b: TradeListingWithDesign,
  sortMode: NonNullable<BoardInventoryFilters['sortMode']>,
) {
  const left = getTradeListingDisplayFields(a)
  const right = getTradeListingDisplayFields(b)
  const compare = (x: string | null, y: string | null) =>
    (x ?? '').localeCompare(y ?? '', undefined, { numeric: true, sensitivity: 'base' })
  if (sortMode === 'collection') return compare(left.collectionName, right.collectionName) || compare(left.designName, right.designName)
  if (sortMode === 'type') return compare(left.typeLabel, right.typeLabel) || compare(left.designName, right.designName)
  if (sortMode === 'name') return compare(left.designName, right.designName)
  if (sortMode === 'rarity') {
    const rank = { unicorn: 0, diamond: 1, standard: 2 }
    const leftRarity = a.rarity_classification ?? a.design?.rarity_classification ?? 'standard'
    const rightRarity = b.rarity_classification ?? b.design?.rarity_classification ?? 'standard'
    return rank[leftRarity] - rank[rightRarity] || compare(left.designName, right.designName)
  }
  const listedComparison = getListingTime(b) - getListingTime(a)
  if (listedComparison !== 0) return listedComparison
  return compare(left.designName, right.designName)
}

function getListingTime(listing: TradeListingWithDesign) {
  const parsed = Date.parse(listing.listed_at ?? listing.created_at)
  return Number.isNaN(parsed) ? 0 : parsed
}
