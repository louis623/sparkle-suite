import type {
  TradeRequestNotificationSummary,
  TradeRequestStatus,
} from '@/lib/services/types'

export type TradeRequestCardData = {
  requestId: string
  status?: TradeRequestStatus
  customerName: string
  requestedItem: {
    itemNumber: string | null
    designName: string
    typePrefix: string
    collectionName: string | null
    /** Retained only when reading cards created before MSRP retirement. */
    bpMsrp?: number | null
    repFacingNote?: string | null
  }
  offeredText: string
  revealScreenshot?: {
    viewUrl: string
    expiresAt: string
  } | null
  ruleCheck: {
    status: 'needs_review'
    label: string
    description: string
  }
}

export type TradeRequestCardPart = {
  type: 'data-trade-request-card'
  data: TradeRequestCardData
}

export function buildTradeRequestCardPart(
  summary: TradeRequestNotificationSummary,
): TradeRequestCardPart {
  const comparisonTarget = summary.listing.collectionName
    ? `${summary.listing.typePrefix} / ${summary.listing.collectionName}`
    : summary.listing.typePrefix

  return {
    type: 'data-trade-request-card',
    data: {
      requestId: summary.requestId,
      status: 'pending',
      customerName: summary.customerName,
      requestedItem: {
        itemNumber: summary.listing.itemNumber,
        designName: summary.listing.designName,
        typePrefix: summary.listing.typePrefix,
        collectionName: summary.listing.collectionName,
        ...(summary.listing.listingSource === 'non_item_number'
          ? { repFacingNote: '(non-item number piece)' }
          : {}),
      },
      offeredText: summary.customerDescription,
      revealScreenshot: summary.revealScreenshot
        ? {
            viewUrl: `/api/nic-nac/trade-requests/${summary.requestId}/reveal-screenshot`,
            expiresAt: summary.revealScreenshot.expiresAt,
          }
        : null,
      ruleCheck: {
        status: 'needs_review',
        label: `Compare against ${comparisonTarget}`,
        description:
          'Customer offers are free text, so the rep should confirm the offered piece is the same type and collection before approving the trade.',
      },
    },
  }
}

export function isTradeRequestCardPart(
  part: unknown,
): part is TradeRequestCardPart {
  if (!part || typeof part !== 'object') return false

  const candidate = part as Partial<TradeRequestCardPart>
  const data = candidate.data
  const requestedItem = data?.requestedItem
  const ruleCheck = data?.ruleCheck

  return (
    candidate.type === 'data-trade-request-card' &&
    !!data &&
    typeof data === 'object' &&
    typeof data.requestId === 'string' &&
    (data.status === undefined ||
      data.status === 'pending' ||
      data.status === 'approved' ||
      data.status === 'denied' ||
      data.status === 'cancelled') &&
    typeof data.customerName === 'string' &&
    !!requestedItem &&
    typeof requestedItem === 'object' &&
    (typeof requestedItem.itemNumber === 'string' ||
      requestedItem.itemNumber === null) &&
    typeof requestedItem.designName === 'string' &&
    typeof requestedItem.typePrefix === 'string' &&
    (typeof requestedItem.collectionName === 'string' ||
      requestedItem.collectionName === null) &&
    (requestedItem.bpMsrp === undefined ||
      typeof requestedItem.bpMsrp === 'number' ||
      requestedItem.bpMsrp === null) &&
    (requestedItem.repFacingNote === undefined ||
      typeof requestedItem.repFacingNote === 'string' ||
      requestedItem.repFacingNote === null) &&
    typeof data.offeredText === 'string' &&
    (data.revealScreenshot === undefined ||
      data.revealScreenshot === null ||
      (typeof data.revealScreenshot === 'object' &&
        typeof data.revealScreenshot.viewUrl === 'string' &&
        typeof data.revealScreenshot.expiresAt === 'string')) &&
    !!ruleCheck &&
    typeof ruleCheck === 'object' &&
    ruleCheck.status === 'needs_review' &&
    typeof ruleCheck.label === 'string' &&
    typeof ruleCheck.description === 'string'
  )
}
