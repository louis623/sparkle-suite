import { describe, expect, it } from 'vitest'

import {
  fulfillmentLogViewForRequest,
  shouldApplyFulfillmentLogPage,
} from '@/lib/nic-nac/fulfillment-log-refresh'

describe('fulfillment log refresh view', () => {
  it('uses the latest Done view when a background refresh has no explicit tab', () => {
    const viewWhenThePollStarted = { filter: 'open' as const, page: 1 }
    const latestView = { filter: 'done' as const, page: 1 }

    expect(fulfillmentLogViewForRequest(undefined, latestView)).toEqual(latestView)
    expect(fulfillmentLogViewForRequest(undefined, viewWhenThePollStarted)).toEqual({
      filter: 'open',
      page: 1,
    })
    expect(shouldApplyFulfillmentLogPage({
      requestSequence: 4,
      latestSequence: 4,
      requestedView: latestView,
      latestView,
    })).toBe(true)
  })

  it('drops an Open payload that finishes after the rep switches to Done', () => {
    const openView = { filter: 'open' as const, page: 1 }
    const doneView = { filter: 'done' as const, page: 1 }

    expect(shouldApplyFulfillmentLogPage({
      requestSequence: 3,
      latestSequence: 4,
      requestedView: openView,
      latestView: doneView,
    })).toBe(false)
    expect(shouldApplyFulfillmentLogPage({
      requestSequence: 4,
      latestSequence: 4,
      requestedView: openView,
      latestView: doneView,
    })).toBe(false)
    expect(fulfillmentLogViewForRequest(doneView, openView)).toEqual(doneView)
  })

  it('keeps an explicit undo refresh on the tab the rep is looking at', () => {
    const doneView = { filter: 'done' as const, page: 2 }
    expect(fulfillmentLogViewForRequest(doneView, { filter: 'open', page: 1 })).toEqual(doneView)
    expect(shouldApplyFulfillmentLogPage({
      requestSequence: 8,
      latestSequence: 9,
      requestedView: { filter: 'all', page: 1 },
      latestView: doneView,
    })).toBe(false)
  })
})
