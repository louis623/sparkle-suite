import type { FulfillmentLogFilter } from '@/lib/services/types'

export type FulfillmentLogView = {
  filter: FulfillmentLogFilter
  page: number
}

// The Dance Floor poll captures loadFulfillmentQueue once, while the log is
// still on Open. Callers that omit a view must read the latest tab here.
// A default parameter would freeze Open and later replace the Done list.
export function fulfillmentLogViewForRequest(
  explicitView: FulfillmentLogView | undefined,
  latestView: FulfillmentLogView,
): FulfillmentLogView {
  return explicitView ?? latestView
}

export function shouldApplyFulfillmentLogPage(input: {
  requestSequence: number
  latestSequence: number
  requestedView: FulfillmentLogView
  latestView: FulfillmentLogView
}): boolean {
  return (
    input.requestSequence === input.latestSequence &&
    input.requestedView.filter === input.latestView.filter &&
    input.requestedView.page === input.latestView.page
  )
}
