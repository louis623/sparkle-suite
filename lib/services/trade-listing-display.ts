import type {
  JewelryType,
  ListingSource,
  TradeListingWithDesign,
} from './types'

export const TRADE_LISTING_TYPE_LABELS: Record<JewelryType, string> = {
  RG: 'Ring',
  NK: 'Necklace',
  ER: 'Earrings',
  ST: 'Stack',
  BR: 'Bracelet',
}

export const NON_ITEM_NUMBER_REP_NOTE = '(non-item number piece)'

export interface TradeListingDisplayFields {
  listingSource: ListingSource
  itemNumber: string | null
  designName: string
  collectionName: string | null
  typePrefix: JewelryType
  typeLabel: string
  material: string | null
  mainStone: string | null
  bpMsrp: number | null
  canonicalPhotoUrl: string | null
  listingPhotoUrl: string | null
  photoUrl: string | null
  size: string | null
  repFacingNote: string | null
}

function cleanText(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

export function getTradeListingSource(
  listing: Pick<TradeListingWithDesign, 'listing_source' | 'design'>,
): ListingSource {
  if (listing.listing_source === 'non_item_number') return 'non_item_number'
  if (listing.listing_source === 'catalog') return 'catalog'
  return listing.design ? 'catalog' : 'non_item_number'
}

export function buildNonItemNumberTradeListingName(input: {
  jewelryType: JewelryType
  collectionFamily: string
  collectionName?: string | null
  size?: string | null
}): string {
  const collection =
    cleanText(input.collectionName) ?? cleanText(input.collectionFamily) ?? 'Jewelry'
  const typeLabel = TRADE_LISTING_TYPE_LABELS[input.jewelryType] ?? 'Jewelry'
  const size = cleanText(input.size)
  return size
    ? `${collection} ${typeLabel} - Size ${size}`
    : `${collection} ${typeLabel}`
}

export function getTradeListingDisplayFields(
  listing: TradeListingWithDesign,
): TradeListingDisplayFields {
  const listingSource = getTradeListingSource(listing)

  if (listingSource === 'non_item_number') {
    const typePrefix = listing.manual_type_prefix ?? 'RG'
    const collectionName =
      cleanText(listing.manual_collection_name) ??
      cleanText(listing.manual_collection_family)
    const size = cleanText(listing.manual_size) ?? cleanText(listing.ring_size)
    const photoUrl =
      cleanText(listing.manual_photo_url) ?? cleanText(listing.listing_photo_url)

    return {
      listingSource,
      itemNumber: null,
      designName: buildNonItemNumberTradeListingName({
        jewelryType: typePrefix,
        collectionFamily: collectionName ?? 'Jewelry',
        collectionName,
        size,
      }),
      collectionName,
      typePrefix,
      typeLabel: TRADE_LISTING_TYPE_LABELS[typePrefix],
      material: null,
      mainStone: null,
      bpMsrp: null,
      canonicalPhotoUrl: null,
      listingPhotoUrl: photoUrl,
      photoUrl,
      size,
      repFacingNote: NON_ITEM_NUMBER_REP_NOTE,
    }
  }

  const design = listing.design
  if (!design) {
    return {
      listingSource: 'catalog',
      itemNumber: null,
      designName: 'Jewelry',
      collectionName: null,
      typePrefix: 'RG',
      typeLabel: TRADE_LISTING_TYPE_LABELS.RG,
      material: null,
      mainStone: null,
      bpMsrp: null,
      canonicalPhotoUrl: null,
      listingPhotoUrl: cleanText(listing.listing_photo_url),
      photoUrl: cleanText(listing.listing_photo_url),
      size: cleanText(listing.ring_size),
      repFacingNote: null,
    }
  }

  const listingPhotoUrl = cleanText(listing.listing_photo_url)
  const canonicalPhotoUrl = cleanText(design.canonical_photo_url)
  // June 27 / August 23 identity still owns the card: this listing's photo,
  // else THIS design's canonical (`jewelry_designs.id` = item + material +
  // stone). Display does not re-resolve by item number or copy another listing.
  const photoUrl =
    listingPhotoUrl ??
    (listing.uses_canonical_photo ? canonicalPhotoUrl : null)

  return {
    listingSource,
    itemNumber: design.item_number,
    designName: design.design_name,
    collectionName: design.collection?.name ?? null,
    typePrefix: design.type_prefix,
    typeLabel: TRADE_LISTING_TYPE_LABELS[design.type_prefix],
    material: design.material,
    mainStone: design.main_stone,
    bpMsrp: design.bp_msrp,
    canonicalPhotoUrl,
    listingPhotoUrl,
    photoUrl,
    size: cleanText(listing.ring_size),
    repFacingNote: null,
  }
}
