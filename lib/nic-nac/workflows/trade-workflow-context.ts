import type { NicNacToolIntent } from '@/lib/nic-nac/tools'
import type { UIMessage } from 'ai'
import type { ActiveNicNacWorkflowContext } from './active-tool-context'
import {
  computeTradeWorkflowReadiness,
  inferTradeWorkflowIntent,
} from './trade-workflow-controller'
import {
  createTradeWorkflowSession,
  getActiveTradeWorkflowSession,
  isMissingTradeWorkflowSchemaError,
  updateTradeWorkflowSession,
} from './trade-workflow-store'
import {
  getTradeWorkflowToolIntents,
  type TradeWorkflowCandidate,
  type TradeWorkflowSessionState,
  type TradeWorkflowType,
} from './trade-workflow-types'
import {
  normalizeTradeItemNumber,
  normalizeTradeRingSize,
} from './trade-workflow-sanitizers'
import type { SupabaseClient } from '@supabase/supabase-js'

export async function getOrCreateTradeWorkflowContext(args: {
  supabase: SupabaseClient
  repId: string
  conversationId: string
  latestUserText: string
  latestToolIntents: NicNacToolIntent[]
  messages?: UIMessage[]
  latestUserMessageId?: string
  mode: 'workspace' | 'required_setup'
  nowIso: string
  preloadedSession?: TradeWorkflowSessionState | null
}): Promise<{
  sessionBefore: TradeWorkflowSessionState | null
  sessionAfter: TradeWorkflowSessionState | null
  activeWorkflow: ActiveNicNacWorkflowContext | null
}> {
  if (args.mode !== 'workspace') return emptyContext()

  try {
    const existing =
      args.preloadedSession !== undefined
        ? args.preloadedSession
        : await getActiveTradeWorkflowSession(args.supabase, {
            repId: args.repId,
            conversationId: args.conversationId,
            nowIso: args.nowIso,
          })
    const explicitWorkflowType = inferWorkflowTypeFromTurn(
      args.latestUserText,
      args.latestToolIntents,
    )
    const continuingExisting =
      existing &&
      (!explicitWorkflowType || explicitWorkflowType === existing.workflowType)
        ? existing
        : null
    const workflowType =
      explicitWorkflowType ?? continuingExisting?.workflowType
    if (!workflowType) return emptyContext()

    const base =
      continuingExisting ??
      (await createTradeWorkflowSession(args.supabase, {
        repId: args.repId,
        conversationId: args.conversationId,
        workflowType,
        intent: inferWorkflowIntentFromTurn(workflowType, args.latestUserText),
        lastUserMessageId: args.latestUserMessageId,
      }))
    const ingested = ingestTradeWorkflowTurn(
      {
        ...base,
        intent: continuingExisting
          ? inferWorkflowIntentFromTurn(base.workflowType, args.latestUserText, base.intent)
          : base.intent,
      },
      args.messages ?? [],
      args.latestUserText,
    )
    const readiness = computeTradeWorkflowReadiness({
      workflowType: ingested.workflowType,
      intent: ingested.intent,
      knownFields: ingested.knownFields,
      candidateCount: ingested.candidates.length,
      approvalState: ingested.approvalState,
    })
    const updated =
      ingested.phase === readiness.phase &&
      sameArray(ingested.missingFields, readiness.missingFields) &&
      sameArray(ingested.blockers, readiness.blockers) &&
      sameJson(ingested.knownFields, base.knownFields) &&
      sameJson(ingested.candidates, base.candidates)
        ? ingested
        : await updateTradeWorkflowSession(args.supabase, {
            ...ingested,
            phase: readiness.phase,
            missingFields: readiness.missingFields,
            blockers: readiness.blockers,
            lastUserMessageId: args.latestUserMessageId ?? ingested.lastUserMessageId,
          })
    const workflowIntents = getTradeWorkflowToolIntents(updated)
    return {
      sessionBefore: continuingExisting,
      sessionAfter: updated,
      activeWorkflow:
        updated.status === 'active' && workflowIntents.length
          ? {
              workflowId: updated.id,
              workflowType: updated.workflowType,
              status: updated.status,
              phase: updated.phase,
              workflowIntents,
              toolPolicySource: 'active_workflow',
              promptState: renderTradeWorkflowPromptState(updated, workflowIntents),
            }
          : null,
    }
  } catch (err) {
    if (isMissingTradeWorkflowSchemaError(err)) {
      console.warn('[nic-nac] generic Trade workflow schema is unavailable', {
        conversationId: args.conversationId,
      })
      return emptyContext()
    }
    throw err
  }
}

type TradeToolOutputPart = {
  type?: string
  state?: string
  output?: {
    listings?: Array<{
      listingId?: unknown
      itemNumber?: unknown
      designName?: unknown
      status?: unknown
      repFacingNote?: unknown
      collection?: unknown
      ringSize?: unknown
    }>
    requests?: Array<{
      requestId?: unknown
      status?: unknown
      customerName?: unknown
      customerDescription?: unknown
      listing?: {
        listingId?: unknown
        design?: {
          itemNumber?: unknown
          designName?: unknown
        }
      }
    }>
    queue?: Array<{
      fulfillmentId?: unknown
      requestId?: unknown
      status?: unknown
      customerName?: unknown
      designName?: unknown
      itemNumber?: unknown
      suggestedNextAction?: unknown
    }>
    results?: Array<{
      designId?: unknown
      itemNumber?: unknown
      designName?: unknown
      collectionName?: unknown
      type?: unknown
      isOnMyBoard?: unknown
    }>
    items?: Array<{
      swapId?: unknown
      requestId?: unknown
      customerName?: unknown
      outgoingListingId?: unknown
      revealedItemNumber?: unknown
      revealedRingSize?: unknown
      replacementStatus?: unknown
    }>
  }
}

function ingestTradeWorkflowTurn(
  state: TradeWorkflowSessionState,
  messages: UIMessage[],
  latestUserText: string,
): TradeWorkflowSessionState {
  const knownFields = { ...state.knownFields }
  let candidates = state.candidates

  const textItemNumbers = extractItemNumbersFromText(latestUserText)
  const textRingSize = extractRingSizeFromText(latestUserText)

  if (
    state.workflowType === 'trade_board_remove_listing' ||
    state.workflowType === 'trade_catalog_correction'
  ) {
    knownFields.itemNumber ??= textItemNumbers[0]
  }
  if (
    state.workflowType === 'trade_swap_cleanup'
  ) {
    knownFields.revealedItemNumber ??= textItemNumbers[0]
    knownFields.revealedRingSize ??= textRingSize
  }
  if (state.workflowType === 'trade_swap_capture') {
    const explicitRevealedItemNumber = extractRevealedItemNumberFromText(
      latestUserText,
      textItemNumbers,
    )
    if (explicitRevealedItemNumber) {
      const currentRevealed = normalizeTradeItemNumber(knownFields.revealedItemNumber)
      const outgoingItem = normalizeTradeItemNumber(knownFields.itemNumber)
      if (!currentRevealed || currentRevealed === outgoingItem) {
        knownFields.revealedItemNumber = explicitRevealedItemNumber
      }
    } else if (shouldFallbackToSingleSwapItemNumber(latestUserText, textItemNumbers)) {
      knownFields.revealedItemNumber ??= textItemNumbers[0]
    }
    knownFields.revealedRingSize ??= textRingSize
  }
  if (state.workflowType === 'trade_swap_capture' && shouldSkipReplacementCapture(latestUserText)) {
    knownFields.skipReplacementCapture = true
  }
  if (state.workflowType === 'trade_fulfillment_update') {
    knownFields.nextFulfillmentStatus ??= inferFulfillmentStatus(latestUserText)
  }
  if (state.workflowType === 'trade_catalog_correction') {
    knownFields.catalogIssueType ??= inferCatalogIssueType(latestUserText)
  }

  if (state.workflowType === 'trade_board_remove_listing') {
    const listingOutput = extractLatestToolOutput(messages, 'tool-list_my_trade_board')
    const listings = listingOutput?.listings ?? []
    candidates = listingsToCandidates(listings)
    const selected = selectCandidate(candidates, latestUserText, textItemNumbers)
    if (selected?.kind === 'listing') {
      knownFields.listingId = selected.id
      knownFields.itemNumber ??= selected.itemNumber
    }
  }

  if (
    state.workflowType === 'trade_request_decision' ||
    state.workflowType === 'trade_swap_capture'
  ) {
    const requestOutput = extractLatestToolOutput(messages, 'tool-get_trade_requests')
    const requests = requestOutput?.requests ?? []
    candidates = requestsToCandidates(requests)
    const selected = selectCandidate(candidates, latestUserText, textItemNumbers)
    if (selected?.kind === 'trade_request') {
      knownFields.requestId = selected.id
      knownFields.itemNumber ??= selected.itemNumber
      if (state.workflowType === 'trade_swap_capture') {
        const explicitRevealedItemNumber = extractRevealedItemNumberFromText(
          latestUserText,
          textItemNumbers,
        )
        const currentRevealed = normalizeTradeItemNumber(knownFields.revealedItemNumber)
        const outgoingItem = normalizeTradeItemNumber(knownFields.itemNumber)
        if (
          explicitRevealedItemNumber &&
          (!currentRevealed || currentRevealed === outgoingItem)
        ) {
          knownFields.revealedItemNumber = explicitRevealedItemNumber
        }
      }
    }
  }

  if (state.workflowType === 'trade_fulfillment_update') {
    const queueOutput = extractLatestToolOutput(messages, 'tool-get_fulfillment_queue')
    const queue = queueOutput?.queue ?? []
    candidates = fulfillmentToCandidates(queue)
    const selected = selectCandidate(candidates, latestUserText, textItemNumbers)
    if (selected?.kind === 'fulfillment') {
      knownFields.fulfillmentRequestId = selected.id
      const row = queue.find((entry) => entry.fulfillmentId === selected.id)
      if (typeof row?.requestId === 'string') knownFields.requestId = row.requestId
      knownFields.nextFulfillmentStatus ??= normalizeSuggestedFulfillmentAction(
        row?.suggestedNextAction,
      )
    }
  }

  if (state.workflowType === 'trade_catalog_correction') {
    const searchOutput = extractLatestToolOutput(messages, 'tool-search_jewelry_database')
    const results = searchOutput?.results ?? []
    candidates = catalogResultsToCandidates(results)
    const selected = selectCandidate(candidates, latestUserText, textItemNumbers)
    if (selected?.kind === 'catalog_design') {
      knownFields.itemNumber = selected.itemNumber
    }
  }

  if (state.workflowType === 'trade_swap_cleanup') {
    const cleanup = extractLatestToolOutput(messages, 'tool-get_trade_swap_cleanup')
    const items = cleanup?.items ?? []
    candidates = swapCleanupToCandidates(items)
    const selected = selectCandidate(candidates, latestUserText, textItemNumbers)
    if (selected?.kind === 'swap') {
      knownFields.swapId = selected.id
      knownFields.revealedItemNumber ??= selected.itemNumber
      knownFields.itemNumber ??= selected.itemNumber
      const item = items.find((entry) => entry.swapId === selected.id)
      if (typeof item?.requestId === 'string') knownFields.requestId = item.requestId.trim()
      knownFields.revealedRingSize ??= normalizeTradeRingSize(item?.revealedRingSize)
    } else if (items.length === 1) {
      const item = items[0]
      if (typeof item.swapId === 'string') knownFields.swapId = item.swapId.trim()
      if (typeof item.requestId === 'string') knownFields.requestId = item.requestId.trim()
      if (typeof item.revealedItemNumber === 'string') {
        const itemNumber = normalizeTradeItemNumber(item.revealedItemNumber)
        if (itemNumber) {
          knownFields.revealedItemNumber = itemNumber
          knownFields.itemNumber = itemNumber
        }
      }
      knownFields.revealedRingSize ??= normalizeTradeRingSize(item.revealedRingSize)
    }
  }

  return {
    ...state,
    knownFields,
    candidates,
  }
}

function extractLatestToolOutput(messages: UIMessage[], type: string) {
  const parts = messages.flatMap(
    (message) => (message.parts ?? []) as TradeToolOutputPart[],
  )
  return [...parts]
    .reverse()
    .find(
      (part) =>
        part.type === type &&
        part.state === 'output-available' &&
        part.output,
    )?.output
}

function listingsToCandidates(
  listings: NonNullable<TradeToolOutputPart['output']>['listings'] = [],
): TradeWorkflowCandidate[] {
  return listings
    .filter((listing) => typeof listing.listingId === 'string')
    .map((listing) => ({
      id: String(listing.listingId),
      kind: 'listing' as const,
      itemNumber: normalizeTradeItemNumber(listing.itemNumber),
      designName: stringValue(listing.designName),
      status: stringValue(listing.status),
      summary: [
        normalizeTradeItemNumber(listing.itemNumber),
        stringValue(listing.designName),
        stringValue(listing.collection),
        stringValue(listing.ringSize) ? `size ${stringValue(listing.ringSize)}` : null,
      ]
        .filter(Boolean)
        .join(' - '),
      risk: 'high' as const,
    }))
}

function requestsToCandidates(
  requests: NonNullable<TradeToolOutputPart['output']>['requests'] = [],
): TradeWorkflowCandidate[] {
  return requests
    .filter((request) => typeof request.requestId === 'string')
    .map((request) => {
      const design = request.listing?.design
      return {
        id: String(request.requestId),
        kind: 'trade_request' as const,
        itemNumber: normalizeTradeItemNumber(design?.itemNumber),
        designName: stringValue(design?.designName),
        status: stringValue(request.status),
        summary: [
          stringValue(request.customerName),
          normalizeTradeItemNumber(design?.itemNumber),
          stringValue(design?.designName),
          stringValue(request.customerDescription),
        ]
          .filter(Boolean)
          .join(' - '),
        risk: 'high' as const,
      }
    })
}

function fulfillmentToCandidates(
  queue: NonNullable<TradeToolOutputPart['output']>['queue'] = [],
): TradeWorkflowCandidate[] {
  return queue
    .filter((item) => typeof item.fulfillmentId === 'string')
    .map((item) => ({
      id: String(item.fulfillmentId),
      kind: 'fulfillment' as const,
      itemNumber: normalizeTradeItemNumber(item.itemNumber),
      designName: stringValue(item.designName),
      status: typeof item.requestId === 'string' ? item.requestId : stringValue(item.status),
      summary: [
        stringValue(item.customerName),
        normalizeTradeItemNumber(item.itemNumber),
        stringValue(item.designName),
        stringValue(item.status),
      ]
        .filter(Boolean)
        .join(' - '),
      risk: 'medium' as const,
    }))
}

function catalogResultsToCandidates(
  results: NonNullable<TradeToolOutputPart['output']>['results'] = [],
): TradeWorkflowCandidate[] {
  return results
    .filter((result) => typeof result.designId === 'string')
    .map((result) => ({
      id: String(result.designId),
      kind: 'catalog_design' as const,
      itemNumber: normalizeTradeItemNumber(result.itemNumber),
      designName: stringValue(result.designName),
      status: stringValue(result.collectionName),
      summary: [
        normalizeTradeItemNumber(result.itemNumber),
        stringValue(result.designName),
        stringValue(result.collectionName),
        stringValue(result.type),
      ]
        .filter(Boolean)
        .join(' - '),
      risk: 'medium' as const,
    }))
}

function swapCleanupToCandidates(
  items: NonNullable<TradeToolOutputPart['output']>['items'] = [],
): TradeWorkflowCandidate[] {
  return items
    .filter((item) => typeof item.swapId === 'string' && item.swapId.trim().length > 0)
    .map((item) => {
      const itemNumber = normalizeTradeItemNumber(item.revealedItemNumber)
      return {
        id: String(item.swapId).trim(),
        kind: 'swap' as const,
        itemNumber,
        status: stringValue(item.replacementStatus),
        summary: [
          stringValue(item.customerName) || 'Swap',
          itemNumber,
          stringValue(item.revealedRingSize)
            ? `size ${stringValue(item.revealedRingSize)}`
            : null,
        ]
          .filter(Boolean)
          .join(' - '),
        risk: 'medium' as const,
      }
    })
}

function selectCandidate(
  candidates: TradeWorkflowCandidate[],
  latestUserText: string,
  itemNumbers: string[],
): TradeWorkflowCandidate | null {
  if (candidates.length === 1) return candidates[0]
  const normalizedText = latestUserText.toLocaleLowerCase()
  const itemNumberMatches = candidates.filter(
    (candidate) =>
      candidate.itemNumber && itemNumbers.includes(candidate.itemNumber),
  )
  if (itemNumberMatches.length === 1) return itemNumberMatches[0]
  const summaryMatches = candidates.filter((candidate) =>
    candidate.summary
      .toLocaleLowerCase()
      .split(/\s+-\s+|\s+/)
      .filter((part) => part.length >= 4)
      .some((part) => normalizedText.includes(part)),
  )
  return summaryMatches.length === 1 ? summaryMatches[0] : null
}

function inferWorkflowTypeFromTurn(
  text: string,
  latestToolIntents: NicNacToolIntent[],
): TradeWorkflowType | null {
  if (
    latestToolIntents.includes('fulfillment') &&
    /\b(mark|set|update|move|advance|ship|shipped|complete|completed|done|tracking|fulfilled|received)\b/i.test(
      text,
    )
  ) {
    return 'trade_fulfillment_update'
  }
  if (
    latestToolIntents.includes('catalog') &&
    /\b(wrong|incorrect|bad|fix|correct|correction|issue|problem|duplicate|bad\s+photo|photo\s+is\s+wrong|collection\s+is\s+wrong|material\s+is\s+wrong|stone\s+is\s+wrong|variant)\b/i.test(
      text,
    )
  ) {
    return 'trade_catalog_correction'
  }
  if (latestToolIntents.includes('trade_requests')) {
    if (/\b(cleanup|missing\s+details|ring\s+size|after[-\s]?show)\b/i.test(text)) {
      return 'trade_swap_cleanup'
    }
    if (
      /\b(approve|accept|yes|okay|ok|confirm)\b/i.test(text) &&
      shouldSkipReplacementCapture(text)
    ) {
      return 'trade_request_decision'
    }
    if (/\b(swap|revealed|just\s+revealed|item\s*(?:number|#))\b/i.test(text)) {
      return 'trade_swap_capture'
    }
    if (/\b(approve|accept|reject|decline|deny|cancel)\b/i.test(text)) {
      return 'trade_request_decision'
    }
  }
  if (
    latestToolIntents.includes('trade_board') &&
    /\b(remove|take\s+down|delete|pull|clear)\b[\s\S]{0,80}\b(listing|trade\s+board|dance\s+floor|board|piece|item|dancer)\b/i.test(
      text,
    )
  ) {
    return 'trade_board_remove_listing'
  }
  return null
}

function inferWorkflowIntentFromTurn(
  workflowType: TradeWorkflowType,
  text: string,
  fallback?: ReturnType<typeof inferTradeWorkflowIntent>,
) {
  if (workflowType === 'trade_request_decision') {
    if (/\b(reject|decline|deny|cancel|pass)\b/i.test(text)) return 'reject_trade'
    if (/\b(approve|accept|yes|okay|ok|confirm)\b/i.test(text)) return 'approve_trade'
  }
  return fallback ?? inferTradeWorkflowIntent(workflowType)
}

function renderTradeWorkflowPromptState(
  state: TradeWorkflowSessionState,
  intents: NicNacToolIntent[],
) {
  return [
    'Active Nic-Nac Trade workflow:',
    `- id: ${state.id}`,
    `- type: ${state.workflowType}`,
    `- phase: ${state.phase}`,
    `- status: ${state.status}`,
    `- intent: ${state.intent}`,
    `- known fields: ${JSON.stringify(state.knownFields)}`,
    `- candidates: ${state.candidates.length ? JSON.stringify(state.candidates) : 'none'}`,
    `- missing: ${state.missingFields.length ? state.missingFields.join(', ') : 'none'}`,
    `- blockers: ${state.blockers.length ? state.blockers.join(', ') : 'none'}`,
    `- approval: ${state.approvalState}`,
    `- active tool intents: ${intents.join(', ')}`,
    'Rules: keep the listed Trade tools available until this workflow completes, is cancelled, expires, or needs human review. Do not invent mutation fields; ask for missing required fields or exact candidates before calling write tools.',
  ].join('\n')
}

function extractItemNumbersFromText(text: string): string[] {
  const matches = text.match(/\b[A-Z]{1,4}[\s-]*\d[A-Z0-9-]{2,20}\b/gi) ?? []
  return [...new Set(matches.map(normalizeTradeItemNumber).filter(Boolean) as string[])]
}

function extractRevealedItemNumberFromText(
  text: string,
  normalizedItemNumbers = extractItemNumbersFromText(text),
): string | undefined {
  if (!normalizedItemNumbers.length) return undefined

  const itemPattern = '[A-Z]{1,4}[\\s-]*\\d[A-Z0-9-]{2,20}'
  const directPatterns = [
    new RegExp(
      `\\b(?:item\\s*(?:number|#)\\s*)?(?:just\\s+)?revealed(?:\\s+(?:item|piece|replacement))?(?:\\s+(?:for\\s+the\\s+customer|for\\s+them))?\\s*(?:is|was|:)?\\s*(${itemPattern})\\b`,
      'i',
    ),
    new RegExp(
      `\\b(?:revealed|replacement|received)\\s+(?:item|piece)(?:\\s*(?:number|#))?\\s*(?:is|was|:)?\\s*(${itemPattern})\\b`,
      'i',
    ),
    new RegExp(
      `\\b(?:item\\s*(?:number|#)|piece)\\s+(${itemPattern})\\s+(?:was|is)\\s+(?:just\\s+)?revealed\\b`,
      'i',
    ),
  ]
  for (const pattern of directPatterns) {
    const match = text.match(pattern)
    const itemNumber = normalizeTradeItemNumber(match?.[1])
    if (itemNumber) return itemNumber
  }

  const lowerText = text.toLocaleLowerCase()
  const rawMatches = [
    ...text.matchAll(/\b[A-Z]{1,4}[\s-]*\d[A-Z0-9-]{2,20}\b/gi),
  ]
  for (const match of rawMatches) {
    const itemNumber = normalizeTradeItemNumber(match[0])
    if (!itemNumber || !normalizedItemNumbers.includes(itemNumber)) continue
    const before = lowerText.slice(Math.max(0, match.index - 90), match.index)
    if (/\b(just\s+revealed|revealed|replacement|received)\b/.test(before)) {
      return itemNumber
    }
  }

  return undefined
}

function shouldFallbackToSingleSwapItemNumber(text: string, itemNumbers: string[]) {
  return (
    itemNumbers.length === 1 &&
    /\b(just\s+revealed|revealed\s+(?:item|piece)|replacement\s+(?:item|piece))\b/i.test(
      text,
    )
  )
}

function extractRingSizeFromText(text: string): string | undefined {
  const sizeMatch = text.match(/\b(?:size|sz)\s*([4-9]|1[0-3])(?:\s*(?:\.|and a half)\s*5?)?\b/i)
  if (!sizeMatch) return normalizeTradeRingSize(text)
  const raw = /half/i.test(sizeMatch[0]) ? `${sizeMatch[1]}.5` : sizeMatch[0].match(/\.\s*5/) ? `${sizeMatch[1]}.5` : sizeMatch[1]
  return normalizeTradeRingSize(raw)
}

function shouldSkipReplacementCapture(text: string): boolean {
  return /\b(skip|too busy|later|after\s+show|not now|don't know|do not know|do\s+not\s+capture|don['’]?t\s+capture|without\s+(?:the\s+)?(?:revealed\s+)?(?:replacement\s+)?(?:item\s+)?capture|add\s+(?:the\s+)?(?:received|revealed|replacement)\s+piece\s+later)\b/i.test(text)
}

function inferFulfillmentStatus(
  text: string,
): 'approved' | 'shipped' | 'completed' | undefined {
  if (/\b(completed|complete|done|finished|fulfilled|received|got it)\b/i.test(text)) {
    return 'completed'
  }
  if (/\b(shipped|ship|mailed|tracking|sent)\b/i.test(text)) return 'shipped'
  return undefined
}

function normalizeSuggestedFulfillmentAction(
  value: unknown,
): 'approved' | 'shipped' | 'completed' | undefined {
  if (value === 'mark_shipped') return 'shipped'
  if (value === 'mark_completed') return 'completed'
  return undefined
}

function inferCatalogIssueType(
  text: string,
): NonNullable<TradeWorkflowSessionState['knownFields']['catalogIssueType']> | undefined {
  if (/\b(photo|image|picture)\b/i.test(text)) return 'bad_photo'
  if (/\b(collection)\b/i.test(text)) return 'wrong_collection'
  if (/\b(material|plating)\b/i.test(text)) return 'wrong_material'
  if (/\b(stone|gem)\b/i.test(text)) return 'wrong_stone'
  if (/\b(name|called)\b/i.test(text)) return 'wrong_design_name'
  if (/\b(duplicate)\b/i.test(text)) return 'duplicate'
  return undefined
}

function stringValue(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed || undefined
}

function sameArray(left: string[], right: string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index])
}

function sameJson(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right)
}

function emptyContext() {
  return {
    sessionBefore: null,
    sessionAfter: null,
    activeWorkflow: null,
  }
}
