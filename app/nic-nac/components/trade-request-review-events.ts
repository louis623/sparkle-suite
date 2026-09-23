export const TRADE_REQUEST_REVIEW_EVENT = 'sparkle:trade-request-review'

export function openTradeRequestReview(requestId: string, action?: 'approve' | 'reject') {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent(TRADE_REQUEST_REVIEW_EVENT, { detail: { requestId, action } }),
  )
}
