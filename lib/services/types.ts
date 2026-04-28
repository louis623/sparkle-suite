// Source of truth for shared service-layer types. Imports flow OUT of this
// file; nothing in `types.ts` imports from another service file. trade-board.ts,
// trade-requests.ts, trade-fulfillment.ts, and jewelry-database.ts all import
// types from here. trade-board.ts re-exports the legacy types for backward
// compatibility with the existing 4 callers of @/lib/services/trade-board.

// ============================================================================
// Postgres enums — mirrored verbatim from supabase/migrations/006_*.sql
// Do NOT add values that don't exist in the DB.
// ============================================================================

export type ListingStatus = 'available' | 'pending_trade' | 'traded' | 'removed'
export type TradeRequestStatus = 'pending' | 'approved' | 'denied' | 'cancelled'
export type FulfillmentStatus = 'approved' | 'shipped' | 'completed'
export type JewelryType = 'RG' | 'NK' | 'ER' | 'ST' | 'BR'
export type RemovalReason = 'sold' | 'keeping' | 'mistake' | 'other'
export type RejectionReason = 'msrp_mismatch' | 'not_interested' | 'changed_mind' | 'other'

// ============================================================================
// trade-board domain — existing types (preserved shape)
// ============================================================================

export interface TradeListingWithDesign {
  id: string
  rep_id: string
  status: ListingStatus
  rep_notes: string | null
  trade_preferences: string | null
  listing_photo_url: string | null
  uses_canonical_photo: boolean
  listed_at: string | null
  removal_reason: RemovalReason | null
  created_at: string
  updated_at: string
  design: {
    id: string
    item_number: string
    design_name: string
    material: string | null
    main_stone: string | null
    bp_msrp: number | null
    canonical_photo_url: string | null
    type_prefix: JewelryType
    collection: { id: string; name: string } | null
  }
}

export interface BoardResult {
  listings: TradeListingWithDesign[]
  summary: {
    totalPieces: number
    totalMsrp: number
    typeBreakdown: Record<JewelryType, number>
    pendingRequestCount: number
  }
}

export interface RemoveListingResult {
  listingId: string
  designName: string
  previousStatus: ListingStatus
  cancelledRequestId?: string
  cancelledRequestCustomerName?: string
}

export interface GetMyBoardFilters {
  statusFilter?: ListingStatus
  collectionFilter?: string
  typeFilter?: JewelryType
  sortBy?: 'created_at' | 'listed_at' | 'msrp' | 'design_name' | 'collection'
  sortOrder?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

// ============================================================================
// trade-board domain — new types
// ============================================================================

export interface AddListingInput {
  itemNumber: string
  clickwrapAccepted: boolean
  repNotes?: string
  tradePreferences?: string
  listingPhotoUrl?: string // when omitted, falls back to canonical photo
}

export interface AddListingResult {
  listingId: string
  designId: string
  itemNumber: string
  designName: string
  status: ListingStatus
  usesCanonicalPhoto: boolean
}

export interface BatchListingItem {
  itemNumber: string
  repNotes?: string
  tradePreferences?: string
  listingPhotoUrl?: string
}

export interface AddListingBatchInput {
  items: BatchListingItem[]
  clickwrapAccepted: boolean
}

export interface AddListingBatchResult {
  added: AddListingResult[]
  pending: {
    needCollection: Array<{
      itemNumber: string
      designId: string
      designName: string
    }>
    needFullInfo: Array<{ itemNumber: string }>
  }
}

export interface UpdateListingInput {
  repNotes?: string | null
  tradePreferences?: string | null
  listingPhotoUrl?: string | null
  // When true, clears listing_photo_url and sets uses_canonical_photo=true
  useCanonicalPhoto?: boolean
}

export interface UpdateListingResult {
  listingId: string
  status: ListingStatus
}

// ============================================================================
// trade-requests domain
// ============================================================================

export interface SubmitTradeRequestInput {
  listingId: string
  customerName: string
  customerDescription: string
}

export interface SubmitTradeRequestResult {
  requestId: string
  listingId: string
}

export interface GetTradeRequestsFilters {
  statusFilter?: TradeRequestStatus // default: 'pending'
  limit?: number
}

export interface TradeRequestWithListing {
  id: string
  status: TradeRequestStatus
  customerName: string
  customerDescription: string
  rejectionReason: RejectionReason | null
  repNotes: string | null
  createdAt: string
  updatedAt: string
  listing: {
    id: string
    repId: string
    listingPhotoUrl: string | null
    usesCanonicalPhoto: boolean
    design: {
      id: string
      itemNumber: string
      designName: string
      material: string | null
      mainStone: string | null
      bpMsrp: number | null
      canonicalPhotoUrl: string | null
      typePrefix: JewelryType
    }
  }
}

export interface ApproveTradeResult {
  requestId: string
  fulfillmentId: string
  listingId: string
  customerName: string
}

export interface RejectTradeResult {
  requestId: string
  listingId: string
  listingRestored: boolean
}

export interface GetTradeHistoryOptions {
  limit?: number
}

export interface TradeHistoryItem {
  requestId: string
  listingId: string
  customerName: string
  status: TradeRequestStatus
  fulfillmentStatus: FulfillmentStatus | null
  createdAt: string
  completedAt: string | null
  fulfillmentDays: number | null
  design: {
    itemNumber: string
    designName: string
    bpMsrp: number | null
    typePrefix: JewelryType
    collectionName: string | null
  }
}

export interface TradeHistoryResult {
  items: TradeHistoryItem[]
  summary: {
    totalCompleted: number
    totalMsrpTraded: number
    avgFulfillmentDays: number | null
    topDesign: { itemNumber: string; designName: string; count: number } | null
    repeatCustomers: Array<{ customerName: string; count: number }>
  }
}

// ============================================================================
// trade-fulfillment domain
// ============================================================================

export type UpdateFulfillmentInput =
  | {
      requestId: string
      nextStatus: FulfillmentStatus
      shippingNotes?: string
      addToBoard?: boolean
    }
  | {
      customerName: string
      nextStatus: FulfillmentStatus
      shippingNotes?: string
      addToBoard?: boolean
    }

export interface UpdateFulfillmentResult {
  fulfillmentId: string
  requestId: string
  previousStatus: FulfillmentStatus
  status: FulfillmentStatus
  completedAt: string | null
  shouldPromptAddToBoard: boolean
}

export interface FulfillmentQueueItem {
  fulfillmentId: string
  requestId: string
  status: FulfillmentStatus
  customerName: string
  designName: string
  itemNumber: string
  statusUpdatedAt: string
  daysSinceLastUpdate: number
}

// ============================================================================
// jewelry-database domain
// ============================================================================

export interface SearchJewelryInput {
  query: string
  limit?: number
}

export interface JewelryDatabaseResult {
  designId: string
  itemNumber: string
  designName: string
  material: string | null
  mainStone: string | null
  bpMsrp: number | null
  canonicalPhotoUrl: string | null
  typePrefix: JewelryType
  collectionName: string | null
  isOnMyBoard: boolean
  activeListingsCount: number
}

export type ResolveItemNumberResult =
  | { found: false; itemNumber: string }
  | {
      found: true
      design: {
        id: string
        itemNumber: string
        designName: string
        material: string | null
        mainStone: string | null
        bpMsrp: number | null
        canonicalPhotoUrl: string | null
        typePrefix: JewelryType
        collectionId: string | null
        collectionName: string | null
      }
      hasCollection: boolean
    }

export interface CreateDesignInput {
  itemNumber: string
  designName: string
  piecePhotoUrl: string
  material?: string
  mainStone?: string
  bpMsrp?: number
  collectionName?: string
  specialFeatures?: string
  lengthInfo?: string
}

export interface CreateDesignResult {
  designId: string
  itemNumber: string
  collectionId: string | null
  collectionName: string | null
  typePrefix: JewelryType
}

export interface UpdateCanonicalPhotoResult {
  designId: string
  canonicalPhotoUrl: string
}
