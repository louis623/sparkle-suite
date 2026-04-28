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
} from './types'
import { errors } from './errors'

const FORWARD: Record<FulfillmentStatus, FulfillmentStatus | null> = {
  approved: 'shipped',
  shipped: 'completed',
  completed: null,
}

function isValidTransition(from: FulfillmentStatus, to: FulfillmentStatus): boolean {
  if (from === to) return true
  return FORWARD[from] === to
}

export async function updateFulfillmentStatus(
  supabase: SupabaseClient,
  repId: string,
  input: UpdateFulfillmentInput
): Promise<UpdateFulfillmentResult> {
  if (!repId) throw errors.UNAUTHORIZED('repId required')
  if (!input.nextStatus) throw errors.MISSING_ITEM_INPUT()

  // Resolve fulfillment row by requestId or customerName. RLS already scopes to rep.
  let fulfillmentRow: {
    id: string
    request_id: string
    fulfillment_status: FulfillmentStatus
  } | null = null

  if ('requestId' in input && input.requestId) {
    const { data, error } = await supabase
      .from('trade_fulfillment')
      .select('id, request_id, fulfillment_status')
      .eq('request_id', input.requestId)
      .maybeSingle()
    if (error) throw error
    if (!data) throw errors.FULFILLMENT_NOT_FOUND()
    fulfillmentRow = {
      id: data.id as string,
      request_id: data.request_id as string,
      fulfillment_status: data.fulfillment_status as FulfillmentStatus,
    }
  } else if ('customerName' in input && input.customerName) {
    const { data, error } = await supabase
      .from('trade_fulfillment')
      .select('id, request_id, fulfillment_status, request:trade_requests!inner(customer_name)')
      .eq('request.customer_name', input.customerName)
    if (error) throw error
    const rows = (data ?? []) as Array<{
      id: string
      request_id: string
      fulfillment_status: FulfillmentStatus
    }>
    if (rows.length === 0) throw errors.FULFILLMENT_NOT_FOUND()
    if (rows.length > 1) throw errors.AMBIGUOUS_CUSTOMER(input.customerName)
    fulfillmentRow = rows[0]
  } else {
    throw errors.INVALID_INPUT('requestId or customerName required')
  }

  const previousStatus = fulfillmentRow.fulfillment_status
  if (!isValidTransition(previousStatus, input.nextStatus)) {
    throw errors.INVALID_STATUS_TRANSITION(previousStatus, input.nextStatus)
  }

  const nowIso = new Date().toISOString()
  const update: Record<string, unknown> = {
    fulfillment_status: input.nextStatus,
    status_updated_at: nowIso,
  }
  if (input.shippingNotes !== undefined) update.shipping_notes = input.shippingNotes
  if (input.nextStatus === 'completed') update.completed_at = nowIso

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
    shouldPromptAddToBoard:
      input.nextStatus === 'completed' && input.addToBoard === true,
  }
}

const QUEUE_SELECT = `
  id, fulfillment_status, status_updated_at,
  request:trade_requests!inner(
    id, customer_name,
    listing:trade_listings!inner(
      rep_id,
      design:jewelry_designs(item_number, design_name)
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

  type RawDesign = { item_number: string; design_name: string }
  type RawListing = { rep_id: string; design: RawDesign | RawDesign[] | null }
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
    if (!design) continue
    const updatedAt = new Date(row.status_updated_at).getTime()
    items.push({
      fulfillmentId: row.id,
      requestId: req.id,
      status: row.fulfillment_status,
      customerName: req.customer_name,
      designName: design.design_name,
      itemNumber: design.item_number,
      statusUpdatedAt: row.status_updated_at,
      daysSinceLastUpdate: Math.max(0, Math.floor((now - updatedAt) / 86_400_000)),
    })
  }

  return items
}
