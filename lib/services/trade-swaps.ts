import { validateRepNotes } from '@/lib/services/rep-notes'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createHash } from 'node:crypto'

import { approveTrade, assertRequestOwnedByRep, getRequestedTradeFacts, requestedTradeFactsError } from '@/lib/services/trade-requests'
import { addListing, findCatalogListingMutationByKey } from '@/lib/services/trade-board'
import { normalizeTradeFamily, normalizeTradeType, screenTradeOffer } from '@/lib/services/trade-request-matcher'
import { createAdminClient } from '@/lib/supabase/admin'
import { ServiceError, errors } from '@/lib/services/errors'
import { resolveItemNumber } from '@/lib/services/jewelry-database'
import type {
  ApproveTradeReviewResult,
  ApproveTradeSwapInput,
  ApproveTradeSwapResult,
  ApproveTradeResult,
  JewelryType,
  ResolveTradeSwapReplacementInput,
  ResolveTradeSwapReplacementResult,
  TradeSwapCleanupItem,
  TradeSwapReplacementStatus,
} from '@/lib/services/types'

type CleanupRow = {
  id: string
  request_id: string
  outgoing_listing_id: string
  revealed_item_number: string
  revealed_ring_size: string | null
  revealed_material?: string | null
  revealed_design_id?: string | null
  design?: { material: string | null; collection: { name: string } | null } | null
  replacement_status: TradeSwapReplacementStatus
  created_at: string
  request:
    | {
        customer_name: string
        listing:
          | {
              rep_id: string
            }
          | Array<{
              rep_id: string
            }>
          | null
      }
    | Array<{
        customer_name: string
        listing:
          | {
              rep_id: string
            }
          | Array<{
              rep_id: string
            }>
          | null
      }>
    | null
}

function normalizeItemNumber(value: string) {
  return value.replace(/[\x00-\x1f\x7f]/g, '').trim().toUpperCase().slice(0, 40)
}

function normalizeOptionalText(value: string | undefined) {
  const trimmed = value?.trim()
  return trimmed || undefined
}

function normalizeOptionalComparable(value: string | undefined) {
  return normalizeOptionalText(value)?.toLowerCase() ?? null
}

function getTradeSwapInputSignature(input: {
  requestId: string
  revealedItemNumber: string
  revealedMaterial?: string
  revealedRingSize?: string
  repNotes?: string
}) {
  return createHash('sha256')
    .update(
      JSON.stringify({
        requestId: input.requestId,
        itemNumber: normalizeItemNumber(input.revealedItemNumber),
        material: normalizeOptionalComparable(input.revealedMaterial),
        ringSize: normalizeOptionalText(input.revealedRingSize) ?? null,
        repNotes: normalizeOptionalText(input.repNotes) ?? null,
      }),
    )
    .digest('hex')
}

function isRingType(typePrefix: JewelryType) {
  return typePrefix === 'RG'
}


/** Only this atomic capture boundary may establish that no approval committed. */
export class RevealCaptureNotCommitted extends Error {
  constructor(cause: unknown) { super('Reveal capture did not commit', { cause }); this.name = 'RevealCaptureNotCommitted' }
}
function isDefiniteCaptureRejection(error: { code?: string; message?: string }, status?: number) {
  return typeof status === 'number' && status >= 400 && status < 500 &&
    typeof error.code === 'string' && /^[0-9A-Z]{5}$/.test(error.code) && !error.code.startsWith('PGRST') &&
    typeof error.message === 'string' &&
    !['REQUEST_NOT_PENDING','REQUEST_NOT_FOUND','UNAUTHORIZED_TRADE','LISTING_NOT_FOUND'].some(code => error.message!.includes(code))
}
async function resumeTradeSwap(supabase: SupabaseClient, repId: string, input: ApproveTradeSwapInput, status: string) {
  if (status !== 'approved') throw errors.REQUEST_NOT_PENDING()
  const resumed = await loadApprovedTradeSwapForResume(supabase, repId, input.requestId)
  if (!resumed.existingSwap) throw errors.REQUEST_NOT_PENDING()
  try {
    assertMatchingTradeSwapRetry(resumed.existingSwap, {
      inputSignature: getTradeSwapInputSignature(input),
      revealedItemNumber: normalizeItemNumber(input.revealedItemNumber),
      revealedMaterial: normalizeOptionalText(input.revealedMaterial) ?? null,
      revealedRingSize: normalizeOptionalText(input.revealedRingSize) ?? null,
      repNotes: normalizeOptionalText(input.repNotes) ?? null,
    })
  } catch (error) {
    if (error instanceof ServiceError && error.code === 'INVALID_INPUT') throw errors.REQUEST_NOT_PENDING()
    throw error
  }
  return resumed.existingSwap.result
}
export async function approveTradeFromReview(
  supabase: SupabaseClient, repId: string,
  input: Omit<ApproveTradeSwapInput, 'revealedItemNumber' | 'verification'> & { revealedItemNumber?: string },
): Promise<ApproveTradeReviewResult> {
  validateRepNotes(input.repNotes)
  const number = normalizeItemNumber(input.revealedItemNumber ?? '')
  const normalized = { ...input, revealedItemNumber: number }
  const status = await assertRequestOwnedByRep(supabase, repId, input.requestId, true)
  if (status !== 'pending') {
    if (status !== 'approved') throw errors.REQUEST_NOT_PENDING()
    const recorded = await loadApprovedTradeSwapForResume(supabase, repId, input.requestId)
    if (recorded.existingSwap) {
      if (recorded.existingSwap.result.replacementStatus === 'added_to_board') return { kind: 'captured', ...recorded.existingSwap.result }
      return { kind: 'captured', ...await resumeTradeSwap(supabase, repId, normalized, status) }
    }
    return recorded.revealedItemNumber
      ? { kind: 'noted_only', ...recorded.approved, revealedItemNumber: recorded.revealedItemNumber }
      : { kind: 'approved', ...recorded.approved }
  }
  if (!number) return { kind: 'approved', ...await approveTrade(supabase, repId, input.requestId, input.repNotes) }
  const facts = await getRequestedTradeFacts(supabase, repId, input.requestId)
  const resolved = await resolveItemNumber(supabase, number, { material: input.revealedMaterial })
  if (resolved.found && screenTradeOffer(facts.family, facts.type, resolved.design.collectionName, resolved.design.typePrefix).status === 'likely_match') {
    try {
      return { kind: 'captured', ...await approveTradeWithRevealedItemCapture(supabase, repId, normalized, { resolvedDesign: resolved }) }
    } catch (error) { if (!(error instanceof RevealCaptureNotCommitted)) throw error }
  }
  // Plain approval re-checks owned pending state and raw requested facts. Its error is final.
  const notes = [input.repNotes?.trim(), `Revealed item: ${number}`].filter(Boolean).join('\n')
  return { kind: 'noted_only', revealedItemNumber: number,
    ...await approveTrade(supabase, repId, input.requestId, notes) }
}

export async function approveTradeWithRevealedItemCapture(
  supabase: SupabaseClient,
  repId: string,
  input: ApproveTradeSwapInput,
  options: { resolvedDesign?: Awaited<ReturnType<typeof resolveItemNumber>> } = {},
): Promise<ApproveTradeSwapResult> {
  if (!repId) throw errors.UNAUTHORIZED('repId required')
  if (!input.requestId) throw errors.MISSING_ITEM_INPUT()

  validateRepNotes(input.repNotes)
  const revealedItemNumber = normalizeItemNumber(input.revealedItemNumber)
  if (!revealedItemNumber) {
    throw errors.INVALID_INPUT(
      'revealedItemNumber required',
      'I need the item number that was just revealed for the customer.',
    )
  }

  const revealedMaterial = normalizeOptionalText(input.revealedMaterial)
  const revealedRingSize = normalizeOptionalText(input.revealedRingSize)
  const normalizedRepNotes = normalizeOptionalText(input.repNotes)
  const swapInputSignature = getTradeSwapInputSignature({
    requestId: input.requestId,
    revealedItemNumber,
    revealedMaterial,
    revealedRingSize,
    repNotes: normalizedRepNotes,
  })

  const requestStatus = await assertRequestOwnedByRep(supabase, repId, input.requestId, true)
  if (requestStatus !== 'pending') return resumeTradeSwap(supabase, repId, input, requestStatus)
  const facts = await getRequestedTradeFacts(supabase, repId, input.requestId)
  const resolvedDesign = options.resolvedDesign ?? await resolveItemNumber(supabase, revealedItemNumber, { material: revealedMaterial })
  if (!resolvedDesign.found) throw new RevealCaptureNotCommitted(new Error('REVEAL_UNRESOLVED'))
  if (!options.resolvedDesign && screenTradeOffer(facts.family, facts.type,
      resolvedDesign.design.collectionName, resolvedDesign.design.typePrefix).status !== 'likely_match') {
    throw new RevealCaptureNotCommitted(new Error('REVEAL_NOT_COMPARABLE'))
  }

  let approved: ApproveTradeResult
  let swapId: string
  try {
    const { data, error, status } = await supabase.rpc('rpc_approve_trade_with_swap_v2', {
      p_request_id: input.requestId,
      p_rep_id: repId,
      p_verified_family: facts.family,
      p_verified_type: facts.type,
      p_verification_confirmed: true,
      p_final_confirmation: true,
      p_revealed_item_number: revealedItemNumber,
      p_revealed_material: revealedMaterial ?? null,
      p_revealed_ring_size: revealedRingSize ?? null,
      p_revealed_design_id: resolvedDesign.design.id,
      p_input_signature: swapInputSignature,
      p_rep_notes: normalizedRepNotes ?? null,
    })
    if (error) {
      if (isDefiniteCaptureRejection(error, status)) throw new RevealCaptureNotCommitted(error)
      if (error.message?.includes('REQUEST_NOT_PENDING')) throw errors.REQUEST_NOT_PENDING()
      if (error.message?.includes('TRADE_FAMILY_MISMATCH')) throw new ServiceError({ code: 'TRADE_FAMILY_MISMATCH', message: error.message, userMessage: 'The offered collection does not match this dancer.', statusCode: 409 })
      if (error.message?.includes('TRADE_TYPE_MISMATCH')) throw new ServiceError({ code: 'TRADE_TYPE_MISMATCH', message: error.message, userMessage: 'The offered jewelry type does not match this dancer.', statusCode: 409 })
      if (error.message?.includes('UNAUTHORIZED_TRADE')) throw errors.UNAUTHORIZED('trade request belongs to another rep')
      if (error.message?.includes('VERIFICATION_REQUIRED')) throw requestedTradeFactsError()
      throw error
    }
    if (!data?.swap_id || !data?.fulfillment_id || !data?.request_id || !data?.listing_id || typeof data?.customer_name !== 'string') throw new Error('atomic trade swap approval returned incomplete data')
    swapId = data.swap_id as string
    approved = {
      requestId: data.request_id as string,
      fulfillmentId: data.fulfillment_id as string,
      listingId: data.listing_id as string,
      customerName: data.customer_name as string,
      quantityAvailable: data.quantity_available as number,
    }
  } catch (error) {
    if (!(error instanceof ServiceError) || error.code !== 'REQUEST_NOT_PENDING') {
      throw error
    }
    const resumed = await loadApprovedTradeSwapForResume(
      supabase,
      repId,
      input.requestId,
    )
    if (resumed.existingSwap) {
      assertMatchingTradeSwapRetry(resumed.existingSwap, {
        inputSignature: swapInputSignature,
        revealedItemNumber,
        revealedMaterial: revealedMaterial ?? null,
        revealedRingSize: revealedRingSize ?? null,
        repNotes: normalizedRepNotes ?? null,
      })
      return resumed.existingSwap.result
    }
    throw errors.REQUEST_NOT_PENDING()
  }

  let replacementStatus: TradeSwapReplacementStatus = 'needs_catalog_details'
  let revealedDesignId: string | null = null
  let replacementListingId: string | null = null

  if (resolvedDesign.found) {
    revealedDesignId = resolvedDesign.design.id
    if (isRingType(resolvedDesign.design.typePrefix) && !revealedRingSize) {
      replacementStatus = 'needs_ring_size'
    } else {
      try {
        const replacementInputSignature = createHash('sha256')
          .update(
            JSON.stringify({
              requestId: approved.requestId,
              itemNumber: revealedItemNumber,
              material: revealedMaterial ?? null,
              ringSize: revealedRingSize ?? null,
              customerName: approved.customerName,
            }),
          )
          .digest('hex')
        const replacement = await addListing(supabase, repId, {
          itemNumber: revealedItemNumber,
          designId: resolvedDesign.design.id,
          material: revealedMaterial,
          ringSize: revealedRingSize,
          repNotes: 'Added from an approved dancer swap.',
          idempotencyKey: `trade-swap-replacement:${approved.requestId}`,
          inputSignature: replacementInputSignature,
        })
        replacementListingId = replacement.listingId
        replacementStatus = 'added_to_board'
      } catch (err) {
        // The approval is already durable. Keep the swap in recoverable cleanup
        // rather than returning a false failure for a completed approval.
        console.error('[trade-swaps] replacement listing deferred after approval', err)
        replacementStatus = 'needs_catalog_details'
      }
    }
  }

  if (replacementListingId) {
    const { error: updateError } = await supabase.from('trade_swaps')
      .update({ replacement_listing_id: replacementListingId, replacement_status: 'added_to_board', updated_at: new Date().toISOString() })
      .eq('id', swapId)
    if (updateError) {
      console.error('[trade-swaps] approved swap replacement link deferred', updateError)
      replacementListingId = null
      replacementStatus = 'needs_catalog_details'
    }
  }

  return {
    swapId,
    requestId: approved.requestId,
    fulfillmentId: approved.fulfillmentId,
    outgoingListingId: approved.listingId,
    customerName: approved.customerName,
    revealedItemNumber,
    revealedDesignId,
    replacementListingId,
    replacementStatus,
  }
}

async function loadApprovedTradeSwapForResume(
  supabase: SupabaseClient,
  repId: string,
  requestId: string,
): Promise<{
  approved: ApproveTradeResult
  revealedItemNumber?: string
  existingSwap: {
    inputSignature: string | null
    revealedItemNumber: string
    revealedMaterial: string | null
    revealedRingSize: string | null
    repNotes: string | null
    result: ApproveTradeSwapResult
  } | null
}> {
  const { data: requestRow, error: requestError } = await supabase
    .from('trade_requests')
    .select(
      'id, status, customer_name, listing_id, rep_notes, listing:trade_listings!inner(rep_id), fulfillment:trade_fulfillment(id)',
    )
    .eq('id', requestId)
    .maybeSingle()
  if (requestError) throw requestError

  const request = requestRow as
    | {
        id: string
        status: string
        customer_name: string
        rep_notes?: string | null
        listing_id: string
        listing: { rep_id: string } | Array<{ rep_id: string }> | null
        fulfillment: { id: string } | Array<{ id: string }> | null
      }
    | null
  const listing = request ? getSingleRelation(request.listing) : null
  const fulfillment = request ? getSingleRelation(request.fulfillment) : null
  if (
    !request ||
    request.status !== 'approved' ||
    !listing ||
    listing.rep_id !== repId ||
    !fulfillment
  ) {
    throw errors.REQUEST_NOT_PENDING()
  }

  const approved: ApproveTradeResult = {
    requestId: request.id,
    fulfillmentId: fulfillment.id,
    listingId: request.listing_id,
    customerName: request.customer_name,
    quantityAvailable: 0,
  }

  const { data: swapRow, error: swapError } = await supabase
    .from('trade_swaps')
    .select(
      'id, input_signature, revealed_item_number, revealed_material, revealed_ring_size, revealed_design_id, replacement_listing_id, replacement_status, rep_notes',
    )
    .eq('request_id', requestId)
    .maybeSingle()
  if (swapError) throw swapError
  if (!swapRow) return { approved, existingSwap: null, revealedItemNumber: request.rep_notes?.match(/(?:^|\n)Revealed item: ([^\r\n]{1,40})$/)?.[1] }

  return {
    approved,
    existingSwap: {
      inputSignature:
        typeof swapRow.input_signature === 'string'
          ? swapRow.input_signature
          : null,
      revealedItemNumber: String(swapRow.revealed_item_number),
      revealedMaterial:
        typeof swapRow.revealed_material === 'string'
          ? swapRow.revealed_material
          : null,
      revealedRingSize:
        typeof swapRow.revealed_ring_size === 'string'
          ? swapRow.revealed_ring_size
          : null,
      repNotes:
        typeof swapRow.rep_notes === 'string' ? swapRow.rep_notes : null,
      result: {
        swapId: String(swapRow.id),
        requestId: approved.requestId,
        fulfillmentId: approved.fulfillmentId,
        outgoingListingId: approved.listingId,
        customerName: approved.customerName,
        revealedItemNumber: String(swapRow.revealed_item_number),
        revealedDesignId:
          typeof swapRow.revealed_design_id === 'string'
            ? swapRow.revealed_design_id
            : null,
        replacementListingId:
          typeof swapRow.replacement_listing_id === 'string'
            ? swapRow.replacement_listing_id
            : null,
        replacementStatus:
          swapRow.replacement_status as TradeSwapReplacementStatus,
      },
    },
  }
}

function assertMatchingTradeSwapRetry(
  existingSwap: {
    inputSignature: string | null
    revealedItemNumber: string
    revealedMaterial: string | null
    revealedRingSize: string | null
    repNotes: string | null
  },
  expected: {
    inputSignature: string
    revealedItemNumber: string
    revealedMaterial: string | null
    revealedRingSize: string | null
    repNotes: string | null
  },
) {
  const matches = existingSwap.inputSignature
    ? existingSwap.inputSignature === expected.inputSignature
    : existingSwap.revealedItemNumber === expected.revealedItemNumber &&
      existingSwap.revealedRingSize === expected.revealedRingSize &&
      (existingSwap.revealedMaterial === null ||
        normalizeOptionalComparable(existingSwap.revealedMaterial) ===
          normalizeOptionalComparable(expected.revealedMaterial ?? undefined)) &&
      (existingSwap.repNotes === null ||
        normalizeOptionalText(existingSwap.repNotes) === expected.repNotes)

  if (!matches) {
    throw errors.INVALID_INPUT(
      'approved trade swap retry does not match the recorded revealed item',
    )
  }
}

function getSingleRelation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value
}

export async function getTradeSwapCleanupQueue(
  supabase: SupabaseClient,
  repId: string,
): Promise<TradeSwapCleanupItem[]> {
  if (!repId) throw errors.UNAUTHORIZED('repId required')

  const { data, error } = await supabase
    .from('trade_swaps')
    .select(
      `
        id, request_id, outgoing_listing_id, revealed_item_number,
        revealed_ring_size, revealed_material, revealed_design_id, replacement_status, created_at,
        design:jewelry_designs!revealed_design_id(material, collection:collections(name)),
        request:trade_requests!inner(
          customer_name,
          listing:trade_listings!inner(rep_id)
        )
      `,
    )
    .eq('request.listing.rep_id', repId)
    .neq('replacement_status', 'added_to_board')
    .order('created_at', { ascending: false })
  if (error) throw error

  const items: TradeSwapCleanupItem[] = []
  for (const row of (data ?? []) as unknown as CleanupRow[]) {
    const request = getSingleRelation(row.request)
    if (!request) continue
    const listing = getSingleRelation(request.listing)
    if (!listing || listing.rep_id !== repId) continue

    items.push({
      swapId: row.id,
      requestId: row.request_id,
      customerName: request.customer_name,
      outgoingListingId: row.outgoing_listing_id,
      revealedItemNumber: row.revealed_item_number,
      revealedRingSize: row.revealed_ring_size,
      replacementStatus: row.replacement_status,
      createdAt: row.created_at,
      missingFields: missingFollowUpFields(row),
    })
  }

  return items
}

export async function resolveTradeSwapReplacementListing(
  supabase: SupabaseClient,
  repId: string,
  input: ResolveTradeSwapReplacementInput,
): Promise<ResolveTradeSwapReplacementResult> {
  if (!repId) throw errors.UNAUTHORIZED('repId required')
  if (!input.swapId || !input.replacementListingId) {
    throw errors.INVALID_INPUT(
      'swapId and replacementListingId required',
      'I need the cleanup item and the new listing before I can close that swap cleanup.',
    )
  }

  const { data: listingRow, error: listingError } = await supabase
    .from('trade_listings')
    .select('id, rep_id')
    .eq('id', input.replacementListingId)
    .maybeSingle()
  if (listingError) throw listingError
  if (!listingRow) throw errors.LISTING_NOT_FOUND(input.replacementListingId)
  if ((listingRow as { rep_id?: string }).rep_id !== repId) {
    throw errors.UNAUTHORIZED('replacement listing belongs to another rep')
  }

  const { data: swapRow, error: swapError } = await supabase
    .from('trade_swaps')
    .select(
      `
        id, request_id,
        request:trade_requests!inner(
          listing:trade_listings!inner(rep_id)
        )
      `,
    )
    .eq('id', input.swapId)
    .maybeSingle()
  if (swapError) throw swapError
  if (!swapRow) throw errors.LISTING_NOT_FOUND(`swap ${input.swapId}`)

  const request = getSingleRelation(
    (swapRow as {
      request:
        | { listing: { rep_id: string } | Array<{ rep_id: string }> | null }
        | Array<{ listing: { rep_id: string } | Array<{ rep_id: string }> | null }>
        | null
    }).request,
  )
  const ownerListing = request ? getSingleRelation(request.listing) : null
  if (!ownerListing || ownerListing.rep_id !== repId) {
    throw errors.UNAUTHORIZED('swap belongs to another rep')
  }

  const requestId = (swapRow as { request_id: string }).request_id
  const { data: updatedSwap, error: updateSwapError } = await supabase
    .from('trade_swaps')
    .update({
      replacement_listing_id: input.replacementListingId,
      replacement_status: 'added_to_board',
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.swapId)
    .select('id, request_id, replacement_listing_id, replacement_status')
    .single()
  if (updateSwapError) throw updateSwapError

  const { data: fulfillmentRow, error: fulfillmentError } = await supabase
    .from('trade_fulfillment')
    .update({
      received_listing_id: input.replacementListingId,
      status_updated_at: new Date().toISOString(),
    })
    .eq('request_id', requestId)
    .select('id')
    .maybeSingle()
  if (fulfillmentError) throw fulfillmentError

  return {
    swapId: updatedSwap.id as string,
    requestId: updatedSwap.request_id as string,
    replacementListingId: updatedSwap.replacement_listing_id as string,
    replacementStatus: 'added_to_board',
    fulfillmentId: (fulfillmentRow as { id?: string } | null)?.id ?? null,
  }
}

type FollowUpFields = 'ringSize' | 'collectionName' | 'material'
function missingFollowUpFields(row: { revealed_item_number: string; revealed_ring_size: string | null; revealed_material?: string | null; design?: unknown }): FollowUpFields[] {
  const design = getSingleRelation(row.design as { material?: string | null; collection?: { name?: string } | Array<{ name?: string }> | null } | null)
  const collection = getSingleRelation(design?.collection ?? null)
  const missing: FollowUpFields[] = []
  if (row.revealed_item_number.startsWith('RG') && !row.revealed_ring_size?.trim()) missing.push('ringSize')
  if (!collection?.name?.trim()) missing.push('collectionName')
  if (!row.revealed_material?.trim() && !design?.material?.trim()) missing.push('material')
  return missing
}
export async function finishTradeSwapFollowUp(supabase: SupabaseClient, repId: string, swapId: string, fields: Record<string, unknown>) {
  const notFound = () => new ServiceError({ code: 'FOLLOW_UP_NOT_FOUND', message: 'Follow-up not found.', statusCode: 404 })
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(swapId)) throw notFound()
  // This gate intentionally includes already-added rows: partial terminal success is resumable.
  const { data: owned, error } = await supabase.from('trade_swaps')
    .select('id, request_id, revealed_item_number, revealed_ring_size, revealed_material, revealed_design_id, replacement_listing_id, replacement_status, design:jewelry_designs!revealed_design_id(material, collection:collections(name)), request:trade_requests!inner(customer_name, listing:trade_listings!inner(rep_id))')
    .eq('id', swapId).eq('request.listing.rep_id', repId).maybeSingle()
  if (error) throw error
  const row = owned as unknown as (CleanupRow & { replacement_listing_id?: string | null }) | null
  const request = getSingleRelation(row?.request ?? null)
  if (!row || getSingleRelation(request?.listing ?? null)?.rep_id !== repId) throw notFound()
  const admin = createAdminClient()
  const key = 'trade-swap-replacement:' + row.request_id
  const prior = await findCatalogListingMutationByKey(admin, repId, key)
  if (prior || row.replacement_listing_id) {
    return resolveTradeSwapReplacementListing(admin, repId, { swapId, replacementListingId: prior ?? row.replacement_listing_id! })
  }
  const missing = missingFollowUpFields(row)
  const supplied: Partial<Record<FollowUpFields, string>> = {}
  for (const field of missing) {
    const value = fields[field]
    if (typeof value !== 'string' || !value.trim() || value.length > 120) {
      throw errors.INVALID_INPUT('Missing follow-up details', "Couldn't add that dancer. Check the details and try again.")
    }
    supplied[field] = value.trim()
  }
  const design = getSingleRelation(row.design ?? null)
  const material = row.revealed_material?.trim() || design?.material?.trim() || supplied.material
  const ringSize = row.revealed_ring_size?.trim() || supplied.ringSize
  // Request text/customer identity is never included in the listing or add signature.
  const inputSignature = createHash('sha256').update(JSON.stringify({
    requestId: row.request_id, itemNumber: row.revealed_item_number, material, ringSize, collectionName: supplied.collectionName,
  })).digest('hex')
  const added = await addListing(admin, repId, {
    itemNumber: row.revealed_item_number, material, ringSize, collectionName: supplied.collectionName,
    idempotencyKey: key, inputSignature,
  })
  return resolveTradeSwapReplacementListing(admin, repId, { swapId, replacementListingId: added.listingId })
}
