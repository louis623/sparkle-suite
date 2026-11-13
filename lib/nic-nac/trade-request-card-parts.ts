import { offeredDimensions } from './swap-request-display'
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
  dancerPhotoUrl?: string | null
  screeningStatus?: string
  createdAt?: string
  photoExpired?: boolean
  pendingPosition?: number
  offeredFamily?: string | null
  offeredType?: string | null
  customerDescription?: string
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

export function swapOfferLine(summary: Pick<TradeRequestNotificationSummary, 'offeredType' | 'offeredFamily' | 'customerDescription' | 'photoExpired' | 'revealScreenshot'>) {
  const details = offeredDimensions(summary.offeredType, summary.offeredFamily)
  if (summary.customerDescription) return summary.customerDescription
  if (summary.photoExpired || (summary.revealScreenshot && Date.parse(summary.revealScreenshot.expiresAt) <= Date.now())) return ['Photo expired after 7 days. Ask the customer to resend.', details].filter(Boolean).join(' ')
  if (summary.revealScreenshot) return details ? 'Offered: ' + details : 'Photo attached. Collection and type not given, check the photo'
  return details ? 'No photo. Customer says it is a ' + details : 'No photo, no details'
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
      offeredText: summary.customerDescription || offeredDimensions(summary.offeredType, summary.offeredFamily) || 'Not given',
      customerDescription: summary.customerDescription,
      offeredType: summary.offeredType,
      offeredFamily: summary.offeredFamily,
      pendingPosition: summary.pendingPosition,
      screeningStatus: summary.screeningStatus,
      createdAt: summary.createdAt,
      photoExpired: summary.photoExpired,
      dancerPhotoUrl: summary.dancerPhotoUrl,
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
          'Confirm the actual offered type and collection before approving the swap.',
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
    (data.customerDescription === undefined || typeof data.customerDescription === 'string') &&
    (data.offeredFamily == null || typeof data.offeredFamily === 'string') &&
    (data.offeredType == null || typeof data.offeredType === 'string') &&
    (data.dancerPhotoUrl == null || typeof data.dancerPhotoUrl === 'string') &&
    (data.createdAt === undefined || typeof data.createdAt === 'string') &&
    (data.pendingPosition === undefined || Number.isSafeInteger(data.pendingPosition)) &&
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
