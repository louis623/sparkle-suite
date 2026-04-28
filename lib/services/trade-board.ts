// Trade Board service — stable facade for the existing 4 callers
// (lib/thumper/tools/list-my-trade-board.ts, lib/thumper/tools/remove-listing.ts,
// scripts/verify-trade-board.ts, scripts/red-team.ts). Public surface
// (getMyBoard, removeListing, TradeBoardError, and the legacy types) is
// preserved at this exact module path. New functions (addListing,
// addListingBatch, updateListing) live alongside.
//
// Client requirements (caller passes the right SupabaseClient):
//
//   getMyBoard      — auth client. RLS scopes by rep_id.
//   removeListing   — auth client. UPDATE on trade_listings is rep-scoped;
//                     auto-cancel on trade_requests works because
//                     supabase/migrations/020_thumper_conversations.sql added
//                     the `requests_rep_update` policy specifically for this.
//   addListing      — service client. Touches jewelry_designs.times_listed,
//                     for which only the admin policy permits UPDATE. The
//                     function explicitly validates `repId` so a misrouted
//                     auth client can't enable cross-rep writes.
//   addListingBatch — service client. Same reason as addListing.
//   updateListing   — auth client. Rep-scoped UPDATE on trade_listings.

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  type ListingStatus,
  type JewelryType,
  type RemovalReason,
  type TradeRequestStatus,
  type TradeListingWithDesign,
  type BoardResult,
  type RemoveListingResult,
  type GetMyBoardFilters,
  type AddListingInput,
  type AddListingResult,
  type BatchListingItem,
  type AddListingBatchInput,
  type AddListingBatchResult,
  type UpdateListingInput,
  type UpdateListingResult,
} from './types'
import { TradeBoardError, errors } from './errors'
import { resolveItemNumber } from './jewelry-database'

// Re-export for the existing 4 callers that import from
// '@/lib/services/trade-board'. Do not remove these without updating callers.
export { TradeBoardError } from './errors'
export type {
  ListingStatus,
  JewelryType,
  RemovalReason,
  TradeRequestStatus,
  TradeListingWithDesign,
  BoardResult,
  RemoveListingResult,
  GetMyBoardFilters,
  AddListingInput,
  AddListingResult,
  BatchListingItem,
  AddListingBatchInput,
  AddListingBatchResult,
  UpdateListingInput,
  UpdateListingResult,
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

  // TODO(SS-spec-alignment): SS Service Spec wants this count across ALL of
  // the rep's listings, but current shipped behavior counts across the
  // collection-filtered set. Preserved here for Task 1.5A; reconcile in the
  // task that wires the dashboard view (likely by adding a separate
  // pendingRequestCountTotal field).
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
    // COMPAT: when a rep has multiple non-removed listings for the same design,
    // we deliberately pick the most-recent one by created_at DESC limit 1.
    // This is "ambiguous, pick one" rather than a defined product rule —
    // scripts/verify-trade-board.ts intentionally does not assert which row
    // gets hit. Don't refactor this into something cleaner without product input.
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

// ============================================================================
// New functions — service client required (validates repId in body).
// ============================================================================

export async function addListing(
  supabase: SupabaseClient,
  repId: string,
  input: AddListingInput
): Promise<AddListingResult> {
  if (!repId) throw errors.UNAUTHORIZED('repId required')
  if (!input.clickwrapAccepted) throw errors.CLICKWRAP_REQUIRED()
  if (!input.itemNumber) throw errors.MISSING_ITEM_INPUT()

  const resolved = await resolveItemNumber(supabase, input.itemNumber)
  if (!resolved.found) throw errors.NEEDS_FULL_INFO(input.itemNumber)
  if (!resolved.hasCollection) {
    throw errors.NEEDS_COLLECTION(resolved.design.id, resolved.design.designName)
  }

  // Duplicate check: rep already has an available listing for this design.
  const { data: existing, error: dupErr } = await supabase
    .from('trade_listings')
    .select('id')
    .eq('rep_id', repId)
    .eq('design_id', resolved.design.id)
    .eq('status', 'available')
    .limit(1)
    .maybeSingle()
  if (dupErr) throw dupErr
  if (existing) throw errors.DUPLICATE_LISTING(input.itemNumber)

  const usesCanonicalPhoto = !input.listingPhotoUrl
  const { data: inserted, error: insErr } = await supabase
    .from('trade_listings')
    .insert({
      rep_id: repId,
      design_id: resolved.design.id,
      status: 'available',
      rep_notes: input.repNotes ?? null,
      trade_preferences: input.tradePreferences ?? null,
      listing_photo_url: input.listingPhotoUrl ?? null,
      uses_canonical_photo: usesCanonicalPhoto,
      listed_at: new Date().toISOString(),
    })
    .select('id, status')
    .single()
  if (insErr) throw insErr

  // Increment times_listed via fetch-then-update (counter, not load-bearing).
  const { data: designRow } = await supabase
    .from('jewelry_designs')
    .select('times_listed')
    .eq('id', resolved.design.id)
    .maybeSingle()
  if (designRow) {
    await supabase
      .from('jewelry_designs')
      .update({
        times_listed: ((designRow.times_listed as number | null) ?? 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', resolved.design.id)
  }

  return {
    listingId: inserted.id as string,
    designId: resolved.design.id,
    itemNumber: resolved.design.itemNumber,
    designName: resolved.design.designName,
    status: inserted.status as ListingStatus,
    usesCanonicalPhoto,
  }
}

export async function addListingBatch(
  supabase: SupabaseClient,
  repId: string,
  input: AddListingBatchInput
): Promise<AddListingBatchResult> {
  if (!repId) throw errors.UNAUTHORIZED('repId required')
  if (!input.clickwrapAccepted) throw errors.CLICKWRAP_REQUIRED()
  if (!input.items || input.items.length === 0) {
    return { added: [], pending: { needCollection: [], needFullInfo: [] } }
  }

  const itemNumbers = input.items.map((i) => i.itemNumber)
  const { data: designs, error: designErr } = await supabase
    .from('jewelry_designs')
    .select('id, item_number, design_name, collection_id')
    .in('item_number', itemNumbers)
  if (designErr) throw designErr

  const designByItem = new Map<string, { id: string; design_name: string; collection_id: string | null }>()
  for (const d of designs ?? []) {
    designByItem.set(d.item_number as string, {
      id: d.id as string,
      design_name: d.design_name as string,
      collection_id: (d.collection_id as string | null) ?? null,
    })
  }

  const ready: Array<{ item: BatchListingItem; designId: string; designName: string }> = []
  const needCollection: Array<{ itemNumber: string; designId: string; designName: string }> = []
  const needFullInfo: Array<{ itemNumber: string }> = []

  for (const item of input.items) {
    const d = designByItem.get(item.itemNumber)
    if (!d) {
      needFullInfo.push({ itemNumber: item.itemNumber })
      continue
    }
    if (!d.collection_id) {
      needCollection.push({
        itemNumber: item.itemNumber,
        designId: d.id,
        designName: d.design_name,
      })
      continue
    }
    ready.push({ item, designId: d.id, designName: d.design_name })
  }

  if (ready.length === 0) {
    return { added: [], pending: { needCollection, needFullInfo } }
  }

  // Skip duplicates within the rep's existing available listings.
  const designIds = ready.map((r) => r.designId)
  const { data: existing } = await supabase
    .from('trade_listings')
    .select('design_id')
    .eq('rep_id', repId)
    .eq('status', 'available')
    .in('design_id', designIds)
  const dupSet = new Set<string>(((existing ?? []) as Array<{ design_id: string }>).map((e) => e.design_id))

  const toInsert = ready.filter((r) => !dupSet.has(r.designId))
  if (toInsert.length === 0) {
    return { added: [], pending: { needCollection, needFullInfo } }
  }

  const nowIso = new Date().toISOString()
  const insertRows = toInsert.map((r) => ({
    rep_id: repId,
    design_id: r.designId,
    status: 'available' as const,
    rep_notes: r.item.repNotes ?? null,
    trade_preferences: r.item.tradePreferences ?? null,
    listing_photo_url: r.item.listingPhotoUrl ?? null,
    uses_canonical_photo: !r.item.listingPhotoUrl,
    listed_at: nowIso,
  }))

  const { data: inserted, error: insErr } = await supabase
    .from('trade_listings')
    .insert(insertRows)
    .select('id, design_id, status')
  if (insErr) throw insErr

  // Bump times_listed per design (one update per design).
  for (const r of toInsert) {
    const { data: designRow } = await supabase
      .from('jewelry_designs')
      .select('times_listed')
      .eq('id', r.designId)
      .maybeSingle()
    if (designRow) {
      await supabase
        .from('jewelry_designs')
        .update({
          times_listed: ((designRow.times_listed as number | null) ?? 0) + 1,
          updated_at: nowIso,
        })
        .eq('id', r.designId)
    }
  }

  const added: AddListingResult[] = (inserted ?? []).map((row) => {
    const r = toInsert.find((x) => x.designId === row.design_id)!
    return {
      listingId: row.id as string,
      designId: r.designId,
      itemNumber: r.item.itemNumber,
      designName: r.designName,
      status: row.status as ListingStatus,
      usesCanonicalPhoto: !r.item.listingPhotoUrl,
    }
  })

  return { added, pending: { needCollection, needFullInfo } }
}

export async function updateListing(
  supabase: SupabaseClient,
  repId: string,
  listingId: string,
  patch: UpdateListingInput
): Promise<UpdateListingResult> {
  if (!repId) throw errors.UNAUTHORIZED('repId required')
  if (!listingId) throw errors.MISSING_ITEM_INPUT()

  const { data: current, error: fetchErr } = await supabase
    .from('trade_listings')
    .select('id, rep_id, status')
    .eq('id', listingId)
    .maybeSingle()
  if (fetchErr) throw fetchErr
  if (!current) throw errors.LISTING_NOT_FOUND(listingId)
  if (current.rep_id !== repId) throw errors.UNAUTHORIZED('listing belongs to another rep')
  const status = current.status as ListingStatus
  if (status !== 'available' && status !== 'pending_trade') {
    throw errors.INVALID_STATUS_TRANSITION(status, 'edit')
  }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (patch.repNotes !== undefined) update.rep_notes = patch.repNotes
  if (patch.tradePreferences !== undefined) update.trade_preferences = patch.tradePreferences
  if (patch.useCanonicalPhoto === true) {
    update.listing_photo_url = null
    update.uses_canonical_photo = true
  } else if (patch.listingPhotoUrl !== undefined) {
    update.listing_photo_url = patch.listingPhotoUrl
    update.uses_canonical_photo = patch.listingPhotoUrl === null
  }

  const { error: updErr } = await supabase
    .from('trade_listings')
    .update(update)
    .eq('id', listingId)
    .eq('rep_id', repId)
  if (updErr) throw updErr

  return { listingId, status }
}
