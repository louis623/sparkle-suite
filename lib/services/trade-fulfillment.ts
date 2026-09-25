// Trade Fulfillment service — status progression + queue.
//
// Client requirements:
//   updateFulfillmentStatus — auth client. RLS via fulfillment_own_data
//                             scopes through request → listing → rep_id.
//   getFulfillmentQueue     — auth client. Same RLS policy.

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  type FulfillmentStatus,
  type UpdateFulfillmentInput,
  type UpdateFulfillmentResult,
  type FulfillmentQueueItem,
  type FulfillmentLogFilter,
  type FulfillmentLogPage,
  type TradeListingWithDesign,
} from './types'
import { errors } from './errors'
import { getTradeListingDisplayFields } from './trade-listing-display'

const TRANSITIONS: Record<FulfillmentStatus, FulfillmentStatus[]> = {
  approved: ['shipped', 'completed'],
  shipped: ['completed'],
  completed: ['approved'],
}

function isValidTransition(from: FulfillmentStatus, to: FulfillmentStatus): boolean {
  if (from === to) return true
  return TRANSITIONS[from].includes(to)
}

export async function updateFulfillmentStatus(
  supabase: SupabaseClient,
  repId: string,
  input: UpdateFulfillmentInput
): Promise<UpdateFulfillmentResult> {
  if (!repId) throw errors.UNAUTHORIZED('repId required')
  if (!input.nextStatus) throw errors.MISSING_ITEM_INPUT()
  if (input.shippingNotes !== undefined && input.shippingNotes.length > 300) {
    throw errors.INVALID_INPUT('Shipping notes must be 300 characters or fewer')
  }

  // Resolve fulfillment row by requestId or customerName. RLS already scopes to rep.
  let fulfillmentRow: {
    id: string
    request_id: string
    fulfillment_status: FulfillmentStatus
    completed_at: string | null
    shipping_notes: string | null
  } | null = null

  if ('requestId' in input && input.requestId) {
    const { data, error } = await supabase
      .from('trade_fulfillment')
      .select('id, request_id, fulfillment_status, completed_at, shipping_notes, request:trade_requests!inner(listing:trade_listings!inner(rep_id))')
      .eq('request_id', input.requestId)
      .eq('request.listing.rep_id', repId)
      .maybeSingle()
    if (error) throw error
    if (!data) throw errors.FULFILLMENT_NOT_FOUND()
    fulfillmentRow = {
      id: data.id as string,
      request_id: data.request_id as string,
      fulfillment_status: data.fulfillment_status as FulfillmentStatus,
      completed_at: (data.completed_at as string | null) ?? null,
      shipping_notes: (data.shipping_notes as string | null) ?? null,
    }
  } else if ('customerName' in input && input.customerName) {
    const { data, error } = await supabase
      .from('trade_fulfillment')
      .select(
        'id, request_id, fulfillment_status, completed_at, shipping_notes, request:trade_requests!inner(customer_name, listing:trade_listings!inner(rep_id))',
      )
      .eq('request.customer_name', input.customerName)
      .eq('request.listing.rep_id', repId)
    if (error) throw error
    const rows = (data ?? []) as Array<{
      id: string
      request_id: string
      fulfillment_status: FulfillmentStatus
      completed_at: string | null
      shipping_notes: string | null
    }>
    if (rows.length === 0) throw errors.FULFILLMENT_NOT_FOUND()
    if (rows.length > 1) throw errors.AMBIGUOUS_CUSTOMER(input.customerName)
    fulfillmentRow = rows[0]
  } else {
    throw errors.INVALID_INPUT('requestId or customerName required')
  }

  const previousStatus = fulfillmentRow.fulfillment_status
  if (previousStatus === input.nextStatus &&
      (input.shippingNotes === undefined || input.shippingNotes === (fulfillmentRow.shipping_notes ?? ''))) {
    return {
      fulfillmentId: fulfillmentRow.id,
      requestId: fulfillmentRow.request_id,
      previousStatus,
      status: previousStatus,
      completedAt: fulfillmentRow.completed_at,
      changed: false,
      shouldPromptAddToBoard: false,
    }
  }

  if (!isValidTransition(previousStatus, input.nextStatus)) {
    throw errors.INVALID_STATUS_TRANSITION(previousStatus, input.nextStatus)
  }

  const nowIso = new Date().toISOString()
  const update: Record<string, unknown> = {}
  if (previousStatus !== input.nextStatus) {
    update.fulfillment_status = input.nextStatus
    update.status_updated_at = nowIso
  }
  if (input.shippingNotes !== undefined) update.shipping_notes = input.shippingNotes
  if (input.nextStatus === 'completed' && previousStatus !== 'completed') update.completed_at = nowIso
  if (previousStatus === 'completed' && input.nextStatus === 'approved') update.completed_at = null

  const { data: updated, error: updErr } = await supabase
    .from('trade_fulfillment')
    .update(update)
    .eq('id', fulfillmentRow.id)
    .select('id, request_id, fulfillment_status, completed_at')
    .single()
  if (updErr) throw updErr

  return {
    fulfillmentId: updated.id as string,
    requestId: updated.request_id as string,
    previousStatus,
    status: updated.fulfillment_status as FulfillmentStatus,
    completedAt: (updated.completed_at as string | null) ?? null,
    changed: true,
    shouldPromptAddToBoard:
      input.nextStatus === 'completed' && input.addToBoard === true,
  }
}

const QUEUE_SELECT = `
  id, fulfillment_status, status_updated_at,
  request:trade_requests!inner(
    id, customer_name,
    listing:trade_listings!inner(
      rep_id, listing_source, listing_photo_url, uses_canonical_photo,
      manual_type_prefix, manual_collection_family, manual_collection_name,
      manual_size, manual_photo_url,
      design:jewelry_designs(
        id, item_number, design_name, material, main_stone, bp_msrp,
        canonical_photo_url, type_prefix,
        collection:collections(name)
      )
    )
  )
`

export async function getFulfillmentQueue(
  supabase: SupabaseClient,
  repId: string
): Promise<FulfillmentQueueItem[]> {
  if (!repId) throw errors.UNAUTHORIZED('repId required')

  const { data, error } = await supabase
    .from('trade_fulfillment')
    .select(QUEUE_SELECT)
    .neq('fulfillment_status', 'completed')
    .order('status_updated_at', { ascending: true })
  if (error) throw error

  type RawDesign = {
    id: string
    item_number: string
    design_name: string
    material: string | null
    main_stone: string | null
    bp_msrp: number | null
    canonical_photo_url: string | null
    type_prefix: TradeListingWithDesign['manual_type_prefix']
    collection: { name: string } | { name: string }[] | null
  }
  type RawListing = {
    rep_id: string
    listing_source?: TradeListingWithDesign['listing_source'] | null
    listing_photo_url?: string | null
    uses_canonical_photo?: boolean
    manual_type_prefix?: TradeListingWithDesign['manual_type_prefix']
    manual_collection_family?: string | null
    manual_collection_name?: string | null
    manual_size?: string | null
    manual_photo_url?: string | null
    design: RawDesign | RawDesign[] | null
  }
  type RawRequest = {
    id: string
    customer_name: string
    listing: RawListing | RawListing[] | null
  }
  type RawRow = {
    id: string
    fulfillment_status: FulfillmentStatus
    status_updated_at: string
    request: RawRequest | RawRequest[] | null
  }

  const now = Date.now()
  const items: FulfillmentQueueItem[] = []
  for (const row of (data ?? []) as unknown as RawRow[]) {
    const req = Array.isArray(row.request) ? row.request[0] : row.request
    if (!req) continue
    const lst = Array.isArray(req.listing) ? req.listing[0] : req.listing
    if (!lst || lst.rep_id !== repId) continue
    const design = Array.isArray(lst.design) ? lst.design[0] : lst.design
    const collectionRel = design?.collection
    const collection = Array.isArray(collectionRel) ? collectionRel[0] : collectionRel
    const display = getTradeListingDisplayFields({
      id: '',
      rep_id: lst.rep_id,
      listing_source: lst.listing_source ?? undefined,
      status: 'available',
      rep_notes: null,
      trade_preferences: null,
      ring_size: null,
      listing_photo_url: lst.listing_photo_url ?? null,
      uses_canonical_photo: lst.uses_canonical_photo ?? true,
      manual_type_prefix: lst.manual_type_prefix,
      manual_collection_family: lst.manual_collection_family,
      manual_collection_name: lst.manual_collection_name,
      manual_size: lst.manual_size,
      manual_photo_url: lst.manual_photo_url,
      listed_at: null,
      removal_reason: null,
      deleted_at: null,
      created_at: row.status_updated_at,
      updated_at: row.status_updated_at,
      design: design
        ? {
            id: design.id,
            item_number: design.item_number,
            design_name: design.design_name,
            material: design.material,
            main_stone: design.main_stone,
            bp_msrp: design.bp_msrp,
            canonical_photo_url: design.canonical_photo_url,
            type_prefix: design.type_prefix ?? 'RG',
            collection: collection ? { id: '', name: collection.name } : null,
          }
        : null,
    } as TradeListingWithDesign)
    const updatedAt = new Date(row.status_updated_at).getTime()
    items.push({
      fulfillmentId: row.id,
      requestId: req.id,
      status: row.fulfillment_status,
      customerName: req.customer_name,
      designName: display.designName,
      itemNumber: display.itemNumber,
      statusUpdatedAt: row.status_updated_at,
      daysSinceLastUpdate: Math.max(0, Math.floor((now - updatedAt) / 86_400_000)),
    })
  }

  return items
}

const LOG_PAGE_SIZE = 10 as const
const OPEN_STATUSES: FulfillmentStatus[] = ['approved', 'shipped']
const LOG_SELECT = `
  id, request_id, fulfillment_status, shipping_notes, created_at, status_updated_at, completed_at,
  request:trade_requests!inner(
    id, customer_name, customer_description, offered_family, offered_type,
    verified_offered_family, verified_offered_type,
    reveal_screenshot_path, reveal_screenshot_expires_at,
    listing:trade_listings!inner(
      id, rep_id, design_id, listing_source, listing_photo_url, uses_canonical_photo,
      manual_type_prefix, manual_collection_family, manual_collection_name,
      manual_size, manual_photo_url, ring_size,
      design:jewelry_designs(
        id, item_number, design_name, material, main_stone, bp_msrp,
        canonical_photo_url, type_prefix, collection:collections(name)
      )
    ),
    swap:trade_swaps(revealed_item_number, revealed_ring_size, revealed_material)
  )
`
const LOG_COUNT_SELECT = 'id, request:trade_requests!inner(listing:trade_listings!inner(rep_id))'

// The log page and pink Open count use this exact scope. RLS remains the
// authorization boundary; the rep filter also prevents admin-account bleed.
function scopedLogQuery(
  supabase: SupabaseClient,
  repId: string,
  cutoff: string,
  select: string,
  head = false,
) {
  return supabase.from('trade_fulfillment')
    .select(select, { count: 'exact', head })
    .gte('created_at', cutoff)
    .eq('request.listing.rep_id', repId)
}

function one<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null)
}

export async function getFulfillmentLogPage(
  supabase: SupabaseClient,
  repId: string,
  filter: FulfillmentLogFilter = 'open',
  page = 1,
): Promise<FulfillmentLogPage> {
  if (!repId) throw errors.UNAUTHORIZED('repId required')
  if (!['open', 'done', 'all'].includes(filter) || !Number.isSafeInteger(page) || page < 1) {
    throw errors.INVALID_INPUT('Invalid fulfillment log filter or page')
  }
  const cutoff = new Date(Date.now() - 90 * 86_400_000).toISOString()
  let pageQuery = scopedLogQuery(supabase, repId, cutoff, LOG_SELECT)
  if (filter === 'open') pageQuery = pageQuery.in('fulfillment_status', OPEN_STATUSES)
  if (filter === 'done') pageQuery = pageQuery.eq('fulfillment_status', 'completed')
  const [pageResult, openResult] = await Promise.all([
    pageQuery.order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range((page - 1) * LOG_PAGE_SIZE, page * LOG_PAGE_SIZE - 1),
    scopedLogQuery(supabase, repId, cutoff, LOG_COUNT_SELECT, true)
      .in('fulfillment_status', OPEN_STATUSES),
  ])
  if (pageResult.error) throw pageResult.error
  if (openResult.error) throw openResult.error

  type Relation = Record<string, unknown> | Record<string, unknown>[] | null
  const now = Date.now()
  const items = ((pageResult.data ?? []) as unknown as Record<string, unknown>[]).flatMap((row) => {
    const request = one(row.request as Relation)
    const listing = one(request?.listing as Relation)
    if (!request || !listing || listing.rep_id !== repId) return []
    const design = one(listing.design as Relation)
    const collection = one(design?.collection as Relation)
    const display = getTradeListingDisplayFields({
      ...listing,
      design: design ? { ...design, collection } : null,
    } as unknown as TradeListingWithDesign)
    const swap = one(request.swap as Relation)
    const gotParts = swap
      ? [swap.revealed_item_number, swap.revealed_material,
          swap.revealed_ring_size ? `Size ${swap.revealed_ring_size}` : null]
      : [request.verified_offered_family ?? request.offered_family,
          request.verified_offered_type ?? request.offered_type,
          request.customer_description]
    const expiry = request.reveal_screenshot_expires_at
    return [{
      fulfillmentId: String(row.id),
      requestId: String(request.id),
      status: row.fulfillment_status as FulfillmentStatus,
      customerName: String(request.customer_name),
      gave: [display.itemNumber, display.designName,
        display.material, display.mainStone, display.size ? `Size ${display.size}` : null]
        .filter(Boolean).join(' · '),
      gaveDesignId: (listing.design_id as string | null) ?? null,
      got: gotParts.filter(Boolean).join(' · ') || 'Reveal details unavailable',
      hasRevealScreenshot: Boolean(request.reveal_screenshot_path) &&
        (!expiry || new Date(String(expiry)).getTime() > now),
      shippingNotes: String(row.shipping_notes ?? ''),
      approvedAt: String(row.created_at),
      statusUpdatedAt: String(row.status_updated_at),
      completedAt: (row.completed_at as string | null) ?? null,
    }]
  })
  return {
    items,
    total: pageResult.count ?? 0,
    totalOpen: openResult.count ?? 0,
    page,
    pageSize: LOG_PAGE_SIZE,
  }
}
