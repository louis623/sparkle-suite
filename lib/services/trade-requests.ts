// Trade Requests service — submit/get/approve/reject + history.
//
// Client requirements:
//   submitTradeRequest — service client. Customer is unauthenticated;
//                        rpc_submit_trade_request is SECURITY DEFINER but we
//                        still need a client that can reach it.
//   getTradeRequests   — auth client. RLS gives `requests_rep_read` for the
//                        rep's own listings.
//   approveTrade       — service client. RPC is SECURITY DEFINER; service
//                        client chosen for consistency and uniform error
//                        mapping. Validates `repId` ownership before calling.
//   rejectTrade        — same as approveTrade.
//   getTradeHistory    — auth client. Pure rep-scoped read; never elevate to
//                        service. requests_rep_read + fulfillment_own_data +
//                        designs_read_all + collections_read_all all permit.

import type { SupabaseClient, PostgrestError } from '@supabase/supabase-js'
import {
  type TradeRequestStatus,
  type RejectionReason,
  type FulfillmentStatus,
  type SubmitTradeRequestInput,
  type SubmitTradeRequestResult,
  type GetTradeRequestsFilters,
  type TradeRequestWithListing,
  type ApproveTradeResult,
  type RejectTradeResult,
  type GetTradeHistoryOptions,
  type TradeHistoryItem,
  type TradeHistoryResult,
} from './types'
import { ServiceError, errors } from './errors'

function rpcError(err: PostgrestError | null): ServiceError | null {
  if (!err) return null
  const msg = err.message ?? ''
  if (msg.includes('LISTING_NOT_FOUND')) return errors.LISTING_NOT_FOUND()
  if (msg.includes('REQUEST_ALREADY_EXISTS')) return errors.REQUEST_ALREADY_EXISTS()
  if (msg.includes('REQUEST_NOT_FOUND')) return errors.LISTING_NOT_FOUND('request')
  if (msg.includes('REQUEST_NOT_PENDING')) return errors.REQUEST_NOT_PENDING()
  // Partial unique index collision surfaces as 23505.
  if (err.code === '23505') return errors.REQUEST_ALREADY_EXISTS()
  return null
}

export async function submitTradeRequest(
  supabase: SupabaseClient,
  input: SubmitTradeRequestInput
): Promise<SubmitTradeRequestResult> {
  if (!input.listingId) throw errors.MISSING_ITEM_INPUT()
  if (!input.customerName?.trim()) {
    throw errors.INVALID_INPUT('customerName required', 'I need a customer name to submit that.')
  }
  if (!input.customerDescription?.trim()) {
    throw errors.INVALID_INPUT(
      'customerDescription required',
      'I need a short description from the customer to submit that.',
    )
  }

  const { data, error } = await supabase.rpc('rpc_submit_trade_request', {
    p_listing_id: input.listingId,
    p_customer_name: input.customerName,
    p_customer_description: input.customerDescription,
  })
  const mapped = rpcError(error)
  if (mapped) throw mapped
  if (error) throw error

  const payload = data as { request_id: string; listing_id: string } | null
  if (!payload?.request_id) throw errors.LISTING_NOT_FOUND(input.listingId)
  return { requestId: payload.request_id, listingId: payload.listing_id }
}

const REQUEST_LISTING_SELECT = `
  id, status, customer_name, customer_description, rejection_reason,
  rep_notes, created_at, updated_at,
  listing:trade_listings(
    id, rep_id, listing_photo_url, uses_canonical_photo,
    design:jewelry_designs(
      id, item_number, design_name, material, main_stone, bp_msrp,
      canonical_photo_url, type_prefix
    )
  )
`

export async function getTradeRequests(
  supabase: SupabaseClient,
  repId: string,
  filters: GetTradeRequestsFilters = {}
): Promise<TradeRequestWithListing[]> {
  if (!repId) throw errors.UNAUTHORIZED('repId required')

  const status = filters.statusFilter ?? 'pending'
  let query = supabase
    .from('trade_requests')
    .select(REQUEST_LISTING_SELECT)
    .eq('status', status)
    .order('created_at', { ascending: false })
  if (filters.limit) query = query.limit(filters.limit)

  const { data, error } = await query
  if (error) throw error

  type RawListing = {
    id: string
    rep_id: string
    listing_photo_url: string | null
    uses_canonical_photo: boolean
    design:
      | {
          id: string
          item_number: string
          design_name: string
          material: string | null
          main_stone: string | null
          bp_msrp: number | null
          canonical_photo_url: string | null
          type_prefix: TradeRequestWithListing['listing']['design']['typePrefix']
        }
      | Array<{
          id: string
          item_number: string
          design_name: string
          material: string | null
          main_stone: string | null
          bp_msrp: number | null
          canonical_photo_url: string | null
          type_prefix: TradeRequestWithListing['listing']['design']['typePrefix']
        }>
      | null
  }
  type RawRow = {
    id: string
    status: TradeRequestStatus
    customer_name: string
    customer_description: string
    rejection_reason: RejectionReason | null
    rep_notes: string | null
    created_at: string
    updated_at: string
    listing: RawListing | RawListing[] | null
  }

  const rows = ((data ?? []) as unknown as RawRow[])
    .map((row): TradeRequestWithListing | null => {
      const lst = Array.isArray(row.listing) ? row.listing[0] : row.listing
      if (!lst) return null
      const design = Array.isArray(lst.design) ? lst.design[0] : lst.design
      if (!design) return null
      // Auth client RLS already filters to this rep's listings, but double-check.
      if (lst.rep_id !== repId) return null
      return {
        id: row.id,
        status: row.status,
        customerName: row.customer_name,
        customerDescription: row.customer_description,
        rejectionReason: row.rejection_reason,
        repNotes: row.rep_notes,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        listing: {
          id: lst.id,
          repId: lst.rep_id,
          listingPhotoUrl: lst.listing_photo_url,
          usesCanonicalPhoto: lst.uses_canonical_photo,
          design: {
            id: design.id,
            itemNumber: design.item_number,
            designName: design.design_name,
            material: design.material,
            mainStone: design.main_stone,
            bpMsrp: design.bp_msrp,
            canonicalPhotoUrl: design.canonical_photo_url,
            typePrefix: design.type_prefix,
          },
        },
      }
    })
    .filter((r): r is TradeRequestWithListing => r !== null)

  return rows
}

async function assertRequestOwnedByRep(
  supabase: SupabaseClient,
  repId: string,
  requestId: string
): Promise<void> {
  const { data, error } = await supabase
    .from('trade_requests')
    .select('id, status, listing:trade_listings!inner(rep_id)')
    .eq('id', requestId)
    .maybeSingle()
  if (error) throw error
  if (!data) throw errors.LISTING_NOT_FOUND(`request ${requestId}`)
  const listingRel = (data as { listing: { rep_id: string } | { rep_id: string }[] }).listing
  const ownerRep = Array.isArray(listingRel) ? listingRel[0]?.rep_id : listingRel?.rep_id
  if (!ownerRep || ownerRep !== repId) {
    throw errors.UNAUTHORIZED(`request ${requestId} not owned by rep`)
  }
  if ((data as { status: TradeRequestStatus }).status !== 'pending') {
    throw errors.REQUEST_NOT_PENDING()
  }
}

export async function approveTrade(
  supabase: SupabaseClient,
  repId: string,
  requestId: string,
  repNotes?: string
): Promise<ApproveTradeResult> {
  if (!repId) throw errors.UNAUTHORIZED('repId required')
  if (!requestId) throw errors.MISSING_ITEM_INPUT()

  await assertRequestOwnedByRep(supabase, repId, requestId)

  const { data, error } = await supabase.rpc('rpc_approve_trade', {
    p_request_id: requestId,
    p_rep_notes: repNotes ?? null,
  })
  const mapped = rpcError(error)
  if (mapped) throw mapped
  if (error) throw error

  const payload = data as
    | { request_id: string; fulfillment_id: string; listing_id: string; customer_name: string }
    | null
  if (!payload) throw errors.LISTING_NOT_FOUND(`request ${requestId}`)
  return {
    requestId: payload.request_id,
    fulfillmentId: payload.fulfillment_id,
    listingId: payload.listing_id,
    customerName: payload.customer_name,
  }
}

export async function rejectTrade(
  supabase: SupabaseClient,
  repId: string,
  requestId: string,
  reason?: RejectionReason,
  repNotes?: string
): Promise<RejectTradeResult> {
  if (!repId) throw errors.UNAUTHORIZED('repId required')
  if (!requestId) throw errors.MISSING_ITEM_INPUT()

  await assertRequestOwnedByRep(supabase, repId, requestId)

  const { data, error } = await supabase.rpc('rpc_reject_trade', {
    p_request_id: requestId,
    p_reason: reason ?? null,
    p_rep_notes: repNotes ?? null,
  })
  const mapped = rpcError(error)
  if (mapped) throw mapped
  if (error) throw error

  const payload = data as { request_id: string; listing_id: string; listing_restored: boolean } | null
  if (!payload) throw errors.LISTING_NOT_FOUND(`request ${requestId}`)
  return {
    requestId: payload.request_id,
    listingId: payload.listing_id,
    listingRestored: payload.listing_restored,
  }
}

const HISTORY_SELECT = `
  id, status, customer_name, created_at,
  fulfillment:trade_fulfillment(
    id, fulfillment_status, completed_at, status_updated_at
  ),
  listing:trade_listings!inner(
    id, rep_id,
    design:jewelry_designs(
      item_number, design_name, bp_msrp, type_prefix,
      collection:collections(name)
    )
  )
`

export async function getTradeHistory(
  supabase: SupabaseClient,
  repId: string,
  options: GetTradeHistoryOptions = {}
): Promise<TradeHistoryResult> {
  if (!repId) throw errors.UNAUTHORIZED('repId required')

  let query = supabase
    .from('trade_requests')
    .select(HISTORY_SELECT)
    .in('status', ['approved', 'denied'])
    .order('created_at', { ascending: false })
  if (options.limit) query = query.limit(options.limit)

  const { data, error } = await query
  if (error) throw error

  type RawDesign = {
    item_number: string
    design_name: string
    bp_msrp: number | null
    type_prefix: TradeHistoryItem['design']['typePrefix']
    collection: { name: string } | { name: string }[] | null
  }
  type RawListing = {
    id: string
    rep_id: string
    design: RawDesign | RawDesign[] | null
  }
  type RawFulfillment = {
    id: string
    fulfillment_status: FulfillmentStatus | null
    completed_at: string | null
    status_updated_at: string | null
  }
  type RawRow = {
    id: string
    status: TradeRequestStatus
    customer_name: string
    created_at: string
    fulfillment: RawFulfillment | RawFulfillment[] | null
    listing: RawListing | RawListing[] | null
  }

  const items: TradeHistoryItem[] = []
  for (const row of (data ?? []) as unknown as RawRow[]) {
    const lst = Array.isArray(row.listing) ? row.listing[0] : row.listing
    if (!lst || lst.rep_id !== repId) continue
    const design = Array.isArray(lst.design) ? lst.design[0] : lst.design
    if (!design) continue
    const collectionRel = design.collection
    const collection = Array.isArray(collectionRel) ? collectionRel[0] : collectionRel
    const ful = Array.isArray(row.fulfillment) ? row.fulfillment[0] : row.fulfillment

    let fulfillmentDays: number | null = null
    if (ful?.completed_at) {
      const created = new Date(row.created_at).getTime()
      const completed = new Date(ful.completed_at).getTime()
      fulfillmentDays = Math.max(0, Math.round((completed - created) / 86_400_000))
    }

    items.push({
      requestId: row.id,
      listingId: lst.id,
      customerName: row.customer_name,
      status: row.status,
      fulfillmentStatus: (ful?.fulfillment_status as FulfillmentStatus | null) ?? null,
      createdAt: row.created_at,
      completedAt: ful?.completed_at ?? null,
      fulfillmentDays,
      design: {
        itemNumber: design.item_number,
        designName: design.design_name,
        bpMsrp: design.bp_msrp,
        typePrefix: design.type_prefix,
        collectionName: collection?.name ?? null,
      },
    })
  }

  // Summary stats — completed-only for averages.
  const completed = items.filter((i) => i.fulfillmentStatus === 'completed')
  const totalCompleted = completed.length
  const totalMsrpTraded = completed.reduce((sum, i) => sum + Number(i.design.bpMsrp ?? 0), 0)
  const daysList = completed
    .map((i) => i.fulfillmentDays)
    .filter((d): d is number => typeof d === 'number')
  const avgFulfillmentDays =
    daysList.length > 0 ? daysList.reduce((s, d) => s + d, 0) / daysList.length : null

  const designCounts = new Map<string, { itemNumber: string; designName: string; count: number }>()
  for (const i of completed) {
    const key = i.design.itemNumber
    const cur = designCounts.get(key)
    if (cur) cur.count += 1
    else
      designCounts.set(key, {
        itemNumber: i.design.itemNumber,
        designName: i.design.designName,
        count: 1,
      })
  }
  const topDesign =
    [...designCounts.values()].sort((a, b) => b.count - a.count)[0] ?? null

  const customerCounts = new Map<string, number>()
  for (const i of completed) {
    customerCounts.set(i.customerName, (customerCounts.get(i.customerName) ?? 0) + 1)
  }
  const repeatCustomers = [...customerCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([customerName, count]) => ({ customerName, count }))
    .sort((a, b) => b.count - a.count)

  return {
    items,
    summary: {
      totalCompleted,
      totalMsrpTraded,
      avgFulfillmentDays,
      topDesign,
      repeatCustomers,
    },
  }
}
