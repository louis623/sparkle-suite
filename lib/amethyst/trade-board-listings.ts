import type { TradeListingWithDesign } from '@/lib/services/types'
import { getMyBoard } from '@/lib/services/trade-board'
import {
  getTradeListingDisplayFields,
  TRADE_LISTING_TYPE_LABELS,
} from '@/lib/services/trade-listing-display'
import { resolveAmethystPreviewRep } from '@/lib/amethyst/preview-rep'
import { createAdminClient } from '@/lib/supabase/admin'
import { jewelryRarityToTradeBoardTier } from '@/lib/services/jewelry-rarity'

export type AmethystTradeBoardTier = 'everyday' | 'diamond' | 'unicorn'

export interface AmethystTradeBoardListing {
  id: string
  name: string
  collection: string
  type: string
  material: string
  stone: string
  msrp: number | null
  size: string | null
  note: string
  glyph: string
  tier: AmethystTradeBoardTier
  photoUrl: string | null
  photoSource: 'listing' | 'canonical' | 'missing'
  quantityAvailable?: number
}

const TYPE_LABELS = TRADE_LISTING_TYPE_LABELS

const DEFAULT_TRADE_NOTE =
  'Item-for-item only. Requests must stay within the same collection and the same jewelry type.'

export const defaultAmethystTradeBoardListings: AmethystTradeBoardListing[] = [
  {
    id: 'trade-bloom-ring',
    name: 'Birthday Bloom Ring',
    collection: 'Birthday',
    type: 'Ring',
    material: 'Sterling silver',
    stone: 'Amethyst crystal',
    msrp: 88,
    size: '8',
    note: DEFAULT_TRADE_NOTE,
    glyph: 'B',
    tier: 'diamond',
    photoUrl: null,
    photoSource: 'missing',
    quantityAvailable: 1,
  },
  {
    id: 'trade-velvet-necklace',
    name: 'Velvet Hour Necklace',
    collection: 'OG',
    type: 'Necklace',
    material: 'Triple-plated gold',
    stone: 'Moonstone accent',
    msrp: 42,
    size: null,
    note: DEFAULT_TRADE_NOTE,
    glyph: 'V',
    tier: 'everyday',
    photoUrl: null,
    photoSource: 'missing',
    quantityAvailable: 1,
  },
  {
    id: 'trade-petal-earrings',
    name: 'Petal Drop Earrings',
    collection: 'Spring Luxe',
    type: 'Earrings',
    material: 'Sterling silver',
    stone: 'Opal shimmer',
    msrp: 54,
    size: null,
    note: DEFAULT_TRADE_NOTE,
    glyph: 'P',
    tier: 'everyday',
    photoUrl: null,
    photoSource: 'missing',
    quantityAvailable: 1,
  },
  {
    id: 'trade-aurora-stack',
    name: 'Aurora Stack',
    collection: 'Stacks',
    type: 'Stack',
    material: 'Mixed alloy plating',
    stone: 'Crystal mix',
    msrp: 68,
    size: null,
    note: DEFAULT_TRADE_NOTE,
    glyph: 'A',
    tier: 'unicorn',
    photoUrl: null,
    photoSource: 'missing',
    quantityAvailable: 1,
  },
]

export function getTradeBoardPhotoSource(
  listing: TradeListingWithDesign,
): AmethystTradeBoardListing['photoSource'] {
  const display = getTradeListingDisplayFields(listing)
  if (display.listingPhotoUrl) return 'listing'
  if (display.canonicalPhotoUrl && listing.uses_canonical_photo) {
    return 'canonical'
  }
  return 'missing'
}

function inferTradeBoardTier(listing: TradeListingWithDesign): AmethystTradeBoardTier {
  return jewelryRarityToTradeBoardTier(
    listing.rarity_classification ?? listing.design?.rarity_classification,
  )
}

export function mapTradeListingToAmethystTradeBoardListing(
  listing: TradeListingWithDesign,
  pendingReservationCount = 0,
): AmethystTradeBoardListing {
  const display = getTradeListingDisplayFields(listing)
  const displayName = display.designName.trim()
  const material = display.material?.trim() || 'Shown in photo'
  const stone = display.mainStone?.trim() || 'Shown in photo'
  const collection = display.collectionName?.trim() || 'Collection'
  const type = TYPE_LABELS[display.typePrefix]
  const note =
    listing.trade_preferences?.trim() ||
    (display.listingSource === 'catalog' ? listing.rep_notes?.trim() : null) ||
    DEFAULT_TRADE_NOTE

  return {
    id: listing.id,
    name: displayName,
    collection,
    type,
    material,
    stone,
    msrp: display.bpMsrp,
    size: display.size,
    note,
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

    const board = await getMyBoard(admin, rep.id as string, {
      statusFilter: 'available',
      sortBy: 'listed_at',
      sortOrder: 'desc',
    })

    if (!board.listings.length) {
      return targeted ? [] : defaultAmethystTradeBoardListings
    }

    const listingById = new Map(board.listings.map((listing) => [listing.id, listing]))
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
