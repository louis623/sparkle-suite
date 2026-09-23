import type { SupabaseClient } from '@supabase/supabase-js'
import { createHash } from 'node:crypto'

import { addListing } from '@/lib/services/trade-board'
import { normalizeTradeFamily, normalizeTradeType, screenTradeOffer } from '@/lib/services/trade-request-matcher'
import { ServiceError, errors } from '@/lib/services/errors'
import { resolveItemNumber } from '@/lib/services/jewelry-database'
import type {
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
  return value.trim().toUpperCase()
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

export async function approveTradeWithRevealedItemCapture(
  supabase: SupabaseClient,
  repId: string,
  input: ApproveTradeSwapInput,
): Promise<ApproveTradeSwapResult> {
  if (!repId) throw errors.UNAUTHORIZED('repId required')
  if (!input.requestId) throw errors.MISSING_ITEM_INPUT()
  if (!input.verification?.verificationConfirmed || !input.verification.finalConfirmation ||
      !normalizeTradeFamily(input.verification.verifiedOfferedFamily) ||
      !normalizeTradeType(input.verification.verifiedOfferedType)) {
    throw errors.INVALID_INPUT('rep verification required', 'Confirm the offered collection and jewelry type before approving.')
  }

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

  // Resolve the optional catalog item before the irreversible approval. A
  // lookup failure must never be returned after the request was approved.
  const resolvedDesign = await resolveItemNumber(supabase, revealedItemNumber, {
    material: revealedMaterial,
  })
  if (!resolvedDesign.found) {
    throw errors.INVALID_INPUT(
      'revealed item number is unresolved or ambiguous',
      'Confirm the revealed item number and its material before approving.',
    )
  }
  const catalogMatch = screenTradeOffer(
    input.verification.verifiedOfferedFamily,
    input.verification.verifiedOfferedType,
    resolvedDesign.design.collectionName,
    resolvedDesign.design.typePrefix,
  )
  if (catalogMatch.status !== 'likely_match') {
    throw new ServiceError({
      code: catalogMatch.status === 'needs_verification' ? 'VERIFICATION_REQUIRED' : 'CATALOG_ITEM_MISMATCH',
      message: catalogMatch.reason ?? 'catalog item requires verification',
      userMessage: 'The revealed catalog item does not match the verified collection and jewelry type.',
      statusCode: 409,
    })
  }

  let approved: ApproveTradeResult
  let swapId: string
  try {
    const { data, error } = await supabase.rpc('rpc_approve_trade_with_swap_v2', {
      p_request_id: input.requestId,
      p_rep_id: repId,
      p_verified_family: input.verification.verifiedOfferedFamily,
      p_verified_type: input.verification.verifiedOfferedType,
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
      if (error.message?.includes('REQUEST_NOT_PENDING')) throw errors.REQUEST_NOT_PENDING()
      if (error.message?.includes('TRADE_FAMILY_MISMATCH')) throw new ServiceError({ code: 'TRADE_FAMILY_MISMATCH', message: error.message, userMessage: 'The offered collection does not match this dancer.', statusCode: 409 })
      if (error.message?.includes('TRADE_TYPE_MISMATCH')) throw new ServiceError({ code: 'TRADE_TYPE_MISMATCH', message: error.message, userMessage: 'The offered jewelry type does not match this dancer.', statusCode: 409 })
      if (error.message?.includes('UNAUTHORIZED_TRADE')) throw errors.UNAUTHORIZED('trade request belongs to another rep')
      if (error.message?.includes('VERIFICATION_REQUIRED')) throw errors.INVALID_INPUT('rep verification required', 'Confirm the offered collection and jewelry type before approving.')
      throw error
    }
    if (!data?.swap_id || !data?.fulfillment_id) throw new Error('atomic trade swap approval returned incomplete data')
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
          material: revealedMaterial,
          ringSize: revealedRingSize,
          repNotes: `Added from approved trade swap for ${approved.customerName}.`,
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
      'id, status, customer_name, listing_id, listing:trade_listings!inner(rep_id), fulfillment:trade_fulfillment(id)',
    )
    .eq('id', requestId)
    .maybeSingle()
  if (requestError) throw requestError

  const request = requestRow as
    | {
        id: string
        status: string
        customer_name: string
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
  if (!swapRow) return { approved, existingSwap: null }

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
        revealed_ring_size, replacement_status, created_at,
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
