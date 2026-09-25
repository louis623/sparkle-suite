import { describe, expect, it, vi } from 'vitest'

import {
  getFulfillmentLogPage,
  getFulfillmentQueue,
  updateFulfillmentStatus,
} from '@/lib/services/trade-fulfillment'

class ThenableQuery {
  constructor(private readonly result: Record<string, unknown>) {}

  select() {
    return this
  }

  neq() {
    return this
  }

  order() {
    return this
  }

  then(resolve: (value: Record<string, unknown>) => unknown) {
    return Promise.resolve(this.result).then(resolve)
  }
}

function makeFulfillmentSupabase(row: Record<string, unknown>) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: row, error: null })
  const lookupQuery = { eq: vi.fn(), maybeSingle }
  lookupQuery.eq.mockReturnValue(lookupQuery)
  const lookupEq = lookupQuery.eq
  const lookupSelect = vi.fn(() => ({ eq: lookupEq }))
  let pendingUpdate: Record<string, unknown> = {}
  const updateSingle = vi.fn(async () => ({
    data: { ...row, ...pendingUpdate },
    error: null,
  }))
  const updateSelect = vi.fn(() => ({ single: updateSingle }))
  const updateEq = vi.fn(() => ({ select: updateSelect }))
  const update = vi.fn((patch: Record<string, unknown>) => {
    pendingUpdate = patch
    return { eq: updateEq }
  })
  const from = vi.fn((table: string) => {
    if (table !== 'trade_fulfillment') {
      throw new Error(`Unexpected table ${table}`)
    }
    return {
      select: lookupSelect,
      update,
    }
  })

  return {
    supabase: { from },
    spies: {
      update,
      lookupEq,
    },
  }
}

describe('trade fulfillment service', () => {
  it('treats same-status updates as no-ops without resetting fulfillment aging', async () => {
    const { supabase, spies } = makeFulfillmentSupabase({
      id: 'fulfillment-1',
      request_id: 'request-1',
      fulfillment_status: 'shipped',
      completed_at: null,
      shipping_notes: 'Already shipped.',
    })

    const result = await updateFulfillmentStatus(supabase as never, 'rep-1', {
      requestId: 'request-1',
      nextStatus: 'shipped',
      shippingNotes: 'Already shipped.',
    })

    expect(spies.update).not.toHaveBeenCalled()
    expect(spies.lookupEq).toHaveBeenCalledWith('request.listing.rep_id', 'rep-1')
    expect(result).toEqual({
      fulfillmentId: 'fulfillment-1',
      requestId: 'request-1',
      previousStatus: 'shipped',
      status: 'shipped',
      completedAt: null,
      changed: false,
      shouldPromptAddToBoard: false,
    })
  })

  it('keeps non-item-number listings visible in the active fulfillment queue', async () => {
    const queueQuery = new ThenableQuery({
      data: [
        {
          id: 'fulfillment-1',
          fulfillment_status: 'approved',
          status_updated_at: new Date().toISOString(),
          request: {
            id: 'request-1',
            customer_name: 'Jamie',
            listing: {
              rep_id: 'rep-1',
              listing_source: 'non_item_number',
              listing_photo_url:
                'https://cdn.example.com/jewelry-photos/rep-1/manual-ring.jpg',
              uses_canonical_photo: false,
              manual_type_prefix: 'RG',
              manual_collection_family: 'Birthday',
              manual_collection_name: 'July Birthday 2026',
              manual_size: '7',
              manual_photo_url:
                'https://cdn.example.com/jewelry-photos/rep-1/manual-ring.jpg',
              design: null,
            },
          },
        },
      ],
      error: null,
    })
    const from = vi.fn((table: string) => {
      if (table === 'trade_fulfillment') return { select: vi.fn(() => queueQuery) }
      throw new Error(`Unexpected table ${table}`)
    })

    const queue = await getFulfillmentQueue({ from } as never, 'rep-1')

    expect(queue).toHaveLength(1)
    expect(queue[0]).toMatchObject({
      fulfillmentId: 'fulfillment-1',
      requestId: 'request-1',
      customerName: 'Jamie',
      designName: 'July Birthday 2026 Ring - Size 7',
      itemNumber: null,
    })
  })

  it('finishes an approved trade in one tap and clears completion on undo', async () => {
    const approved = makeFulfillmentSupabase({
      id: 'fulfillment-1', request_id: 'request-1',
      fulfillment_status: 'approved', completed_at: null, shipping_notes: null,
    })
    const done = await updateFulfillmentStatus(approved.supabase as never, 'rep-1', {
      requestId: 'request-1', nextStatus: 'completed',
    })
    expect(done.status).toBe('completed')
    expect(approved.spies.update).toHaveBeenCalledWith(expect.objectContaining({
      fulfillment_status: 'completed', completed_at: expect.any(String),
    }))

    const completed = makeFulfillmentSupabase({
      id: 'fulfillment-1', request_id: 'request-1',
      fulfillment_status: 'completed', completed_at: '2026-09-25T10:00:00Z', shipping_notes: null,
    })
    const undone = await updateFulfillmentStatus(completed.supabase as never, 'rep-1', {
      requestId: 'request-1', nextStatus: 'approved',
    })
    expect(undone.status).toBe('approved')
    expect(completed.spies.update).toHaveBeenCalledWith(expect.objectContaining({
      fulfillment_status: 'approved', completed_at: null,
    }))
  })

  it('saves shipping notes without changing fulfillment status or aging', async () => {
    const { supabase, spies } = makeFulfillmentSupabase({
      id: 'fulfillment-1', request_id: 'request-1',
      fulfillment_status: 'shipped', completed_at: null, shipping_notes: null,
    })
    await updateFulfillmentStatus(supabase as never, 'rep-1', {
      requestId: 'request-1', nextStatus: 'shipped', shippingNotes: 'Tracking 123',
    })
    expect(spies.update).toHaveBeenCalledWith({ shipping_notes: 'Tracking 123' })
  })

  it('uses one 90-day rep scope for the page and Open count', async () => {
    const queries: Array<{ select: string; filters: Array<[string, unknown]> }> = []
    const from = vi.fn(() => ({
      select: (select: string) => {
        const query = { select, filters: [] as Array<[string, unknown]> }
        queries.push(query)
        const builder = {
          gte: (field: string, value: unknown) => { query.filters.push([field, value]); return builder },
          eq: (field: string, value: unknown) => { query.filters.push([field, value]); return builder },
          in: (field: string, value: unknown) => { query.filters.push([field, value]); return builder },
          order: () => builder,
          range: (from: number, to: number) => {
            query.filters.push(['range', [from, to]])
            return Promise.resolve({ data: [], count: 0, error: null })
          },
          then: (resolve: (result: unknown) => unknown) =>
            Promise.resolve({ data: null, count: 12, error: null }).then(resolve),
        }
        return builder
      },
    }))
    const page = await getFulfillmentLogPage({ from } as never, 'rep-1', 'open', 2)
    expect(page).toMatchObject({ total: 0, totalOpen: 12, page: 2, pageSize: 10 })
    expect(queries).toHaveLength(2)
    for (const query of queries) {
      expect(query.filters).toContainEqual(['request.listing.rep_id', 'rep-1'])
      expect(query.filters).toContainEqual(['fulfillment_status', ['approved', 'shipped']])
      expect(query.filters.some(([field]) => field === 'created_at')).toBe(true)
    }
    expect(queries[0].filters).toContainEqual(['range', [10, 19]])
    expect(queries[0].filters.find(([field]) => field === 'created_at')).toEqual(
      queries[1].filters.find(([field]) => field === 'created_at'),
    )
    await getFulfillmentLogPage({ from } as never, 'rep-1', 'done')
    expect(queries[2].filters).toContainEqual(['fulfillment_status', 'completed'])
    expect(queries[2].filters).not.toContainEqual(['fulfillment_status', ['approved', 'shipped']])
    expect(queries[3].filters).toContainEqual(['fulfillment_status', ['approved', 'shipped']])
    await getFulfillmentLogPage({ from } as never, 'rep-1', 'all')
    expect(queries[4].filters.some(([field]) => field === 'fulfillment_status')).toBe(false)
    expect(queries[5].filters).toContainEqual(['fulfillment_status', ['approved', 'shipped']])
  })

  it('maps an existing approved trade, its exact design, swap reveal, and screenshot', async () => {
    const createdAt = new Date().toISOString()
    const row = {
      id: 'fulfillment-1', request_id: 'request-1', fulfillment_status: 'approved',
      shipping_notes: 'Pickup after show', created_at: createdAt,
      status_updated_at: createdAt, completed_at: null,
      request: {
        id: 'request-1', customer_name: 'Jamie', customer_description: 'Blue ring',
        offered_family: 'Birthday', offered_type: 'RG',
        verified_offered_family: 'Birthday', verified_offered_type: 'RG',
        reveal_screenshot_path: 'private/request-1.jpg',
        reveal_screenshot_expires_at: new Date(Date.now() + 86_400_000).toISOString(),
        listing: {
          id: 'listing-1', rep_id: 'rep-1', design_id: 'design-variant-2',
          listing_source: 'catalog', listing_photo_url: null,
          uses_canonical_photo: true, ring_size: '7',
          design: {
            id: 'design-variant-2', item_number: 'RG100', design_name: 'Moon Ring',
            material: 'Rose Gold', main_stone: 'Ruby', bp_msrp: 39,
            canonical_photo_url: null, type_prefix: 'RG',
            collection: { name: 'Moon' },
          },
        },
        swap: { revealed_item_number: 'ER200', revealed_ring_size: null,
          revealed_material: 'Silver' },
      },
    }
    let selected = 0
    const from = vi.fn(() => ({
      select: () => {
        const isPage = selected++ === 0
        const builder = {
          gte: () => builder, eq: () => builder, in: () => builder,
          order: () => builder,
          range: () => Promise.resolve({ data: [row], count: 1, error: null }),
          then: (resolve: (result: unknown) => unknown) =>
            Promise.resolve({ data: null, count: isPage ? 1 : 1, error: null }).then(resolve),
        }
        return builder
      },
    }))
    const result = await getFulfillmentLogPage({ from } as never, 'rep-1')
    expect(result.items[0]).toMatchObject({
      requestId: 'request-1', customerName: 'Jamie',
      gaveDesignId: 'design-variant-2', got: 'ER200 · Silver',
      hasRevealScreenshot: true, shippingNotes: 'Pickup after show',
    })
    expect(result.items[0].gave).toContain('Rose Gold')
    expect(result.items[0].gave).toContain('Ruby')
    row.request.reveal_screenshot_expires_at = new Date(Date.now() - 86_400_000).toISOString()
    const expired = await getFulfillmentLogPage({ from } as never, 'rep-1')
    expect(expired.items[0].hasRevealScreenshot).toBe(false)
  })
})
