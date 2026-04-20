import type { SupabaseClient } from '@supabase/supabase-js'

export type ListingStatus = 'available' | 'pending_trade' | 'traded' | 'removed'
export type JewelryType = 'RG' | 'NK' | 'ER' | 'ST' | 'BR'
export type RemovalReason = 'sold' | 'keeping' | 'mistake' | 'other'
export type TradeRequestStatus = 'pending' | 'approved' | 'denied' | 'cancelled'

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

const DESIGN_SELECT =
  'id, item_number, design_name, material, main_stone, bp_msrp, canonical_photo_url, type_prefix, collection:collections(id, name)'

const LISTING_SELECT = `
  id, rep_id, status, rep_notes, trade_preferences, listing_photo_url,
  uses_canonical_photo, listed_at, removal_reason, created_at, updated_at,
  design:jewelry_designs(${DESIGN_SELECT})
`

export async function getMyBoard(
  supabase: SupabaseClient,
  repId: string,
  filters: GetMyBoardFilters = {}
): Promise<BoardResult> {
  let query = supabase
    .from('trade_listings')
    .select(LISTING_SELECT)
    .eq('rep_id', repId)

  if (filters.statusFilter) {
    query = query.eq('status', filters.statusFilter)
  }
  if (filters.typeFilter) {
    query = query.eq('jewelry_designs.type_prefix', filters.typeFilter)
  }

  const sortBy = filters.sortBy ?? 'listed_at'
  const sortOrder = filters.sortOrder ?? 'desc'
  if (sortBy === 'listed_at' || sortBy === 'created_at') {
    query = query.order(sortBy, { ascending: sortOrder === 'asc', nullsFirst: false })
  }

  if (filters.limit) query = query.limit(filters.limit)
  if (filters.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit ?? 100) - 1)
  }

  const { data, error } = await query
  if (error) throw error

  const rawListings = (data ?? []) as unknown as Array<
    Omit<TradeListingWithDesign, 'design'> & {
      design: TradeListingWithDesign['design'] | TradeListingWithDesign['design'][] | null
    }
  >

  const listings: TradeListingWithDesign[] = rawListings
    .map((row) => {
      const design = Array.isArray(row.design) ? row.design[0] : row.design
      if (!design) return null
      return { ...row, design } as TradeListingWithDesign
    })
    .filter((l): l is TradeListingWithDesign => l !== null)

  const filteredByCollection = filters.collectionFilter
    ? listings.filter((l) => l.design.collection?.name === filters.collectionFilter)
    : listings

  const totalPieces = filteredByCollection.length
  const totalMsrp = filteredByCollection.reduce(
    (sum, l) => sum + Number(l.design.bp_msrp ?? 0),
    0
  )
  const typeBreakdown: Record<JewelryType, number> = { RG: 0, NK: 0, ER: 0, ST: 0, BR: 0 }
  for (const l of filteredByCollection) {
    typeBreakdown[l.design.type_prefix] = (typeBreakdown[l.design.type_prefix] ?? 0) + 1
  }

  const listingIds = filteredByCollection.map((l) => l.id)
  let pendingRequestCount = 0
  if (listingIds.length > 0) {
    const { count } = await supabase
      .from('trade_requests')
      .select('id', { count: 'exact', head: true })
      .in('listing_id', listingIds)
      .eq('status', 'pending')
    pendingRequestCount = count ?? 0
  }

  return {
    listings: filteredByCollection,
    summary: { totalPieces, totalMsrp, typeBreakdown, pendingRequestCount },
  }
}

export class TradeBoardError extends Error {
  constructor(public code: 'LISTING_NOT_FOUND' | 'UNAUTHORIZED' | 'INVALID_INPUT', message: string) {
    super(message)
    this.name = 'TradeBoardError'
  }
}

export async function removeListing(
  supabase: SupabaseClient,
  repId: string,
  input: { listingId?: string; itemNumber?: string; reason: RemovalReason }
): Promise<RemoveListingResult> {
  if (!input.listingId && !input.itemNumber) {
    throw new TradeBoardError('INVALID_INPUT', 'listingId or itemNumber required')
  }

  let listingId = input.listingId
  if (!listingId && input.itemNumber) {
    const { data: designRow, error: designErr } = await supabase
      .from('jewelry_designs')
      .select('id')
      .eq('item_number', input.itemNumber)
      .maybeSingle()
    if (designErr) throw designErr
    if (!designRow) {
      throw new TradeBoardError('LISTING_NOT_FOUND', `No design for item ${input.itemNumber}`)
    }
    const { data: listingRows, error: listingErr } = await supabase
      .from('trade_listings')
      .select('id, created_at')
      .eq('design_id', designRow.id)
      .eq('rep_id', repId)
      .neq('status', 'removed')
      .order('created_at', { ascending: false })
      .limit(1)
    if (listingErr) throw listingErr
    if (!listingRows || listingRows.length === 0) {
      throw new TradeBoardError('LISTING_NOT_FOUND', `No active listing for item ${input.itemNumber}`)
    }
    listingId = listingRows[0].id as string
  }

  const { data: currentRow, error: fetchErr } = await supabase
    .from('trade_listings')
    .select(`id, status, rep_id, design:jewelry_designs(design_name)`)
    .eq('id', listingId!)
    .maybeSingle()
  if (fetchErr) throw fetchErr
  if (!currentRow) {
    throw new TradeBoardError('UNAUTHORIZED', 'Listing not found or not owned by rep')
  }
  if (currentRow.rep_id !== repId) {
    throw new TradeBoardError('UNAUTHORIZED', 'Listing does not belong to rep')
  }

  const previousStatus = currentRow.status as ListingStatus
  const designRel = currentRow.design as { design_name: string } | { design_name: string }[] | null
  const designName = Array.isArray(designRel) ? designRel[0]?.design_name ?? '' : designRel?.design_name ?? ''

  const { error: updErr } = await supabase
    .from('trade_listings')
    .update({
      status: 'removed',
      removal_reason: input.reason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', listingId!)
    .eq('rep_id', repId)
  if (updErr) throw updErr

  const { data: pendingReq, error: reqFetchErr } = await supabase
    .from('trade_requests')
    .select('id, customer_name')
    .eq('listing_id', listingId!)
    .eq('status', 'pending')
    .maybeSingle()
  if (reqFetchErr) throw reqFetchErr

  let cancelledRequestId: string | undefined
  let cancelledRequestCustomerName: string | undefined
  if (pendingReq) {
    const { error: cancelErr } = await supabase
      .from('trade_requests')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', pendingReq.id)
    if (cancelErr) throw cancelErr
    cancelledRequestId = pendingReq.id as string
    cancelledRequestCustomerName = pendingReq.customer_name as string
  }

  return {
    listingId: listingId!,
    designName,
    previousStatus,
    cancelledRequestId,
    cancelledRequestCustomerName,
  }
}
