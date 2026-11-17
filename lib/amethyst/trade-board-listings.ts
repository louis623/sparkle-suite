import type { TradeListingWithDesign } from '@/lib/services/types'
import {
  getTradeListingDisplayFields,
  type TradeListingDisplayInput,
  TRADE_LISTING_TYPE_LABELS,
} from '@/lib/services/trade-listing-display'
import { resolveAmethystPreviewRep } from '@/lib/amethyst/preview-rep'
import { createAdminClient } from '@/lib/supabase/admin'
import { jewelryRarityToTradeBoardTier } from '@/lib/services/jewelry-rarity'

// Public reads deliberately cannot select the private rep editor fields.
type PublicTradeListing = TradeListingDisplayInput & Pick<TradeListingWithDesign,
  'id' | 'trade_preferences' | 'rarity_classification' | 'quantity_available'
>
export const PUBLIC_TRADE_LISTING_SELECT = `
  id, quantity_available, trade_preferences, ring_size, listing_photo_url,
  rarity_classification, listing_source, manual_type_prefix, manual_collection_family,
  manual_collection_name, manual_size, manual_photo_url,
  design:jewelry_designs(id, item_number, design_name, material, main_stone, bp_msrp,
    canonical_photo_url, type_prefix, rarity_classification, collection:collections(id, name))
`

export type AmethystTradeBoardTier = 'everyday' | 'diamond' | 'unicorn'

export interface AmethystTradeBoardListing {
  id: string
  name: string
  collection: string
  matcherFamily?: string | null
  type: string
  material: string
  stone: string
  size: string | null
  tradePreferences: string
  glyph: string
  tier: AmethystTradeBoardTier
  photoUrl: string | null
  photoSource: 'listing' | 'canonical' | 'missing'
  quantityAvailable?: number
}

const TYPE_LABELS = TRADE_LISTING_TYPE_LABELS

const DEFAULT_TRADE_NOTE =
  'Item-for-item only. Requests must stay within the same collection and the same jewelry type.'

function demoDancer(
  listing: Omit<AmethystTradeBoardListing, 'tradePreferences' | 'glyph' | 'tier' | 'photoSource' | 'quantityAvailable' | 'size'> & {
    size?: string | null
  },
): AmethystTradeBoardListing {
  return {
    size: null,
    tradePreferences: DEFAULT_TRADE_NOTE,
    glyph: listing.name.charAt(0).toUpperCase(),
    tier: 'everyday',
    photoSource: 'listing',
    quantityAvailable: 1,
    ...listing,
  }
}

// Photos are existing Sparkle Finder piece shots. Names match those photos.
// Item numbers stay off the card so a demo label cannot contradict the picture.
export const defaultAmethystTradeBoardListings: AmethystTradeBoardListing[] = [
  demoDancer({
    id: 'demo-prestige-hoops',
    name: 'The Prestige Hoops',
    collection: 'Hoop Earrings',
    type: 'Earrings',
    material: 'Rhodium plating',
    stone: 'Diamond cubic zirconia',
    photoUrl: '/amethyst/demo-dancers/prestige-hoops.jpg',
  }),
  demoDancer({
    id: 'demo-all-shine',
    name: 'All Shine, No Shade',
    collection: 'Hoop Earrings',
    type: 'Earrings',
    material: 'Rhodium plating',
    stone: 'Cubic zirconia',
    photoUrl: '/amethyst/demo-dancers/all-shine-no-shade.jpg',
  }),
  demoDancer({
    id: 'demo-baguette-rose',
    name: 'Baguette Braid in Rose Quartz',
    collection: 'Baguette Earrings',
    type: 'Earrings',
    material: 'Rhodium plating',
    stone: 'Rose quartz',
    photoUrl: '/amethyst/demo-dancers/baguette-braid-rose.jpg',
  }),
  demoDancer({
    id: 'demo-baguette-ruby',
    name: 'Baguette Braid in Ruby',
    collection: 'Baguette Earrings',
    type: 'Earrings',
    material: 'Rhodium plating',
    stone: 'Ruby',
    photoUrl: '/amethyst/demo-dancers/baguette-braid-ruby.jpg',
  }),
  demoDancer({
    id: 'demo-elodie',
    name: 'The Elodie Luxe',
    collection: 'Drop Earrings',
    type: 'Earrings',
    material: 'Silver tone',
    stone: 'Cubic zirconia',
    photoUrl: '/amethyst/demo-dancers/elodie-luxe.jpg',
  }),
  demoDancer({
    id: 'demo-dreaming',
    name: "I've Been Dreaming Of You",
    collection: 'Drop Earrings',
    type: 'Earrings',
    material: 'Gold plating',
    stone: 'Amethyst cubic zirconia',
    photoUrl: '/amethyst/demo-dancers/dreaming-of-you.jpg',
  }),
  demoDancer({
    id: 'demo-marisol',
    name: 'The Marisol Earrings',
    collection: 'Drop Earrings',
    type: 'Earrings',
    material: 'Gold plating',
    stone: 'Lab-created pink sapphire',
    photoUrl: '/amethyst/demo-dancers/marisol-earrings.jpg',
  }),
  demoDancer({
    id: 'demo-statement',
    name: 'Statement of Sparkle',
    collection: 'Necklace',
    type: 'Necklace',
    material: 'Hematite tone',
    stone: 'Blue stone',
    photoUrl: '/amethyst/demo-dancers/statement-of-sparkle.jpg',
  }),
  demoDancer({
    id: 'demo-gogo',
    name: 'The GoGo Necklace',
    collection: 'Necklace',
    type: 'Necklace',
    material: 'Rhodium plating',
    stone: 'Lab-created blue spinel',
    photoUrl: '/amethyst/demo-dancers/gogo-necklace.jpg',
  }),
]

export function getTradeBoardPhotoSource(
  listing: PublicTradeListing,
): AmethystTradeBoardListing['photoSource'] {
  const display = getTradeListingDisplayFields(listing)
  if (!display.photoUrl) return 'missing'
  if (display.listingSource === 'catalog' && display.canonicalPhotoUrl === display.photoUrl) return 'canonical'
  return 'listing'
}

function inferTradeBoardTier(listing: PublicTradeListing): AmethystTradeBoardTier {
  return jewelryRarityToTradeBoardTier(
    listing.rarity_classification ?? listing.design?.rarity_classification,
  )
}

export function mapTradeListingToAmethystTradeBoardListing(
  listing: PublicTradeListing,
  pendingReservationCount = 0,
): AmethystTradeBoardListing {
  const display = getTradeListingDisplayFields(listing)
  const displayName = display.designName.trim()
  const material = display.material?.trim() || 'Shown in photo'
  const stone = display.mainStone?.trim() || 'Shown in photo'
  const collection = display.collectionName?.trim() || 'Collection'
  const type = TYPE_LABELS[display.typePrefix]
  const tradePreferences = listing.trade_preferences?.trim() || DEFAULT_TRADE_NOTE

  return {
    id: listing.id,
    name: displayName,
    collection,
    matcherFamily: listing.manual_collection_family ?? listing.design?.collection?.name ?? null,
    type,
    material,
    stone,
    size: display.size,
    tradePreferences,
    glyph: displayName.charAt(0).toUpperCase() || '?',
    tier: inferTradeBoardTier(listing),
    photoUrl: display.photoUrl,
    photoSource: getTradeBoardPhotoSource(listing),
    quantityAvailable: Math.max(
      0,
      (listing.quantity_available ?? 1) - Math.max(0, pendingReservationCount),
    ),
  }
}

interface LoadAmethystTradeBoardPreviewListingsOptions {
  limit?: number
  repId?: string | null
  publicSiteSlug?: string | null
  targeted?: boolean
}

export async function loadAmethystTradeBoardPreviewListings(
  options: LoadAmethystTradeBoardPreviewListingsOptions = {},
): Promise<AmethystTradeBoardListing[]> {
  // The full customer Dance Floor must include every available dancer. Callers
  // that intentionally render a compact preview (such as the homepage) pass
  // their own limit.
  const limit = options.limit
  const targeted = Boolean(options.targeted || options.repId || options.publicSiteSlug)
  const repId = options.repId?.trim() ?? null
  const publicSiteSlug = options.publicSiteSlug?.trim().toLowerCase() ?? null

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return targeted ? [] : defaultAmethystTradeBoardListings
  }

  try {
    const admin = createAdminClient()
    const rep = await resolveAmethystPreviewRep(admin, {
      env: process.env,
      publicSiteSlug,
      repId,
      select: 'id, email',
    })

    if (!rep?.id) {
      return targeted ? [] : defaultAmethystTradeBoardListings
    }

    const { data: netData, error: netError } = await admin.rpc(
      'list_amethyst_public_trade_board_net_v2',
      {
        p_rep_id: rep.id,
        p_limit: limit ?? null,
      },
    )
    if (netError) throw netError
    const netRows = parseAmethystPublicNetRows(netData)
    if (netRows.length === 0) {
      return targeted ? [] : defaultAmethystTradeBoardListings
    }

    const { data, error } = await admin.from('trade_listings')
      .select(PUBLIC_TRADE_LISTING_SELECT)
      .eq('rep_id', rep.id as string)
      .eq('status', 'available')
      .in('id', netRows.map(row => row.listingId))
      .returns<Array<Omit<PublicTradeListing, 'design'> & {
        design: PublicTradeListing['design'] | NonNullable<PublicTradeListing['design']>[]
      }>>()
    if (error) throw error
    const listings = (data ?? []).map(row => ({
      ...row, design: Array.isArray(row.design) ? row.design[0] ?? null : row.design,
    }))
    if (!listings.length) return targeted ? [] : defaultAmethystTradeBoardListings
    const listingById = new Map(listings.map(listing => [listing.id, listing]))
    return netRows.flatMap((row) => {
      const listing = listingById.get(row.listingId)
      if (!listing) return []
      return [
        {
          ...mapTradeListingToAmethystTradeBoardListing(listing),
          quantityAvailable: row.netQuantity,
        },
      ]
    })
  } catch {
    return targeted ? [] : defaultAmethystTradeBoardListings
  }
}

export function parseAmethystPublicNetRows(value: unknown) {
  if (!Array.isArray(value)) {
    throw new Error('Customer Dance Floor quantity query returned an invalid result.')
  }
  const seen = new Set<string>()
  return value.map((entry) => {
    if (!entry || typeof entry !== 'object') {
      throw new Error('Customer Dance Floor quantity row is invalid.')
    }
    const row = entry as Record<string, unknown>
    const listingId = typeof row.listing_id === 'string' ? row.listing_id.trim() : ''
    const netQuantity = Number(row.net_quantity)
    if (
      !listingId ||
      listingId.length > 100 ||
      seen.has(listingId) ||
      !Number.isSafeInteger(netQuantity) ||
      netQuantity < 1
    ) {
      throw new Error('Customer Dance Floor quantity row is invalid.')
    }
    seen.add(listingId)
    return { listingId, netQuantity }
  })
}
