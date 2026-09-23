import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  attachTradeRequestRevealScreenshot,
  getTradeRequests,
  getTradeRequestRevealScreenshotForRep,
  submitTradeRequest,
} from '@/lib/services/trade-requests'

class ThenableQuery {
  filters: Array<[string, unknown]> = []
  ranges: Array<[number, number]> = []

  constructor(private readonly result: Record<string, unknown>) {}

  select() {
    return this
  }

  eq(column: string, value: unknown) {
    this.filters.push([column, value])
    return this
  }

  order() {
    return this
  }

  limit() {
    return this
  }

  range(start: number, end: number) {
    this.ranges.push([start, end])
    return this
  }

  then(resolve: (value: Record<string, unknown>) => unknown) {
    return Promise.resolve(this.result).then(resolve)
  }
}

describe('submitTradeRequest', () => {
  const rpc = vi.fn()
  const maybeSingle = vi.fn()
  const single = vi.fn()
  const eq = vi.fn(() => ({ maybeSingle, single }))
  const select = vi.fn(() => ({ eq }))
  const from = vi.fn(() => ({ select }))
  const supabase = { rpc, from } as unknown as {
    rpc: typeof rpc
    from: typeof from
  }
  const supabaseWithListingLookup = {
    from,
    rpc,
  }

  beforeEach(() => {
    rpc.mockReset()
    from.mockReset()
    select.mockClear()
    eq.mockClear()
    maybeSingle.mockReset()
    single.mockReset()
    single.mockResolvedValue({ data: { screening_status: 'needs_verification', screening_reason: 'The collection family or jewelry type needs rep verification.' }, error: null })
    from.mockReturnValue({ select })
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-only-receipt-secret')
  })

  it('calls v3 and returns a private receipt without checkbox acknowledgement', async () => {
    rpc.mockResolvedValueOnce({
      data: { request_id: 'request-1', listing_id: 'listing-1' },
      error: null,
    })

    await expect(
      submitTradeRequest(supabase as never, {
        listingId: 'listing-1',
        customerName: 'Jamie',
        customerDescription: 'Birthday ring, size 8',
      }),
    ).resolves.toMatchObject({
      requestId: 'request-1',
      listingId: 'listing-1',
      receiptUrl: expect.stringMatching(/^\/trade-request\/status\/[a-f0-9]{64}$/),
    })

    expect(rpc).toHaveBeenCalledWith('rpc_submit_trade_request_v3', expect.objectContaining({
      p_listing_id: 'listing-1',
      p_customer_name: 'Jamie',
      p_customer_description: 'Birthday ring, size 8',
      p_receipt_token_hash: expect.stringMatching(/^[a-f0-9]{64}$/),
    }))
  })

  it('returns the same private receipt token on idempotent replay', async () => {
    rpc.mockResolvedValue({
      data: {
        request_id: 'request-1',
        listing_id: 'listing-1',
        mutation_replayed: true,
      },
      error: null,
    })
    const submissionId = '00000000-0000-4000-8000-000000000001'

    const input = {
        listingId: 'listing-1',
        customerName: '  Jamie  ',
        customerDescription: '  Birthday ring, size 8  ',
        submissionId,
      }
    const first = await submitTradeRequest(supabase as never, input)
    const replay = await submitTradeRequest(supabase as never, input)
    expect(first).toMatchObject({
      requestId: 'request-1',
      listingId: 'listing-1',
      mutationReplayed: true,
    })
    expect(replay.receiptUrl).toBe(first.receiptUrl)
    expect(rpc).toHaveBeenCalledWith('rpc_submit_trade_request_v3', expect.objectContaining({
      p_listing_id: 'listing-1',
      p_customer_name: 'Jamie',
      p_customer_description: 'Birthday ring, size 8',
      p_submission_id: submissionId,
    }))
  })

  it('rejects oversized customer text and invalid submission identities before RPC', async () => {
    await expect(
      submitTradeRequest(supabase as never, {
        listingId: 'listing-1',
        customerName: 'x'.repeat(101),
        customerDescription: 'Birthday ring',
      }),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' })
    await expect(
      submitTradeRequest(supabase as never, {
        listingId: 'listing-1',
        customerName: 'Jamie',
        customerDescription: 'x'.repeat(1001),
      }),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' })
    await expect(
      submitTradeRequest(supabase as never, {
        listingId: 'listing-1',
        customerName: 'Jamie',
        customerDescription: 'Birthday ring',
        submissionId: 'not-a-uuid',
      }),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' })
    expect(rpc).not.toHaveBeenCalled()
  })

  it('rejects expected-rep mismatches before submitting the request rpc', async () => {
    maybeSingle.mockResolvedValueOnce({
      data: { id: 'listing-1', rep_id: 'rep-other' },
      error: null,
    })

    await expect(
      submitTradeRequest(supabaseWithListingLookup as never, {
        listingId: 'listing-1',
        customerName: 'Jamie',
        customerDescription: 'Birthday ring, size 8',
        expectedRepId: 'rep-louis',
      }),
    ).rejects.toMatchObject({
      code: 'LISTING_NOT_FOUND',
    })

    expect(from).toHaveBeenCalledWith('trade_listings')
    expect(eq).toHaveBeenCalledWith('id', 'listing-1')
    expect(rpc).not.toHaveBeenCalled()
  })

  it('attaches reveal screenshot metadata to an existing trade request', async () => {
    const updateEq = vi.fn().mockResolvedValueOnce({ error: null })
    const update = vi.fn(() => ({ eq: updateEq }))
    from.mockReturnValueOnce({ update } as never)

    await attachTradeRequestRevealScreenshot(supabaseWithListingLookup as never, 'request-1', {
      objectPath: 'rep-1/request-1/reveal.png',
      contentType: 'image/png',
      sizeBytes: 123,
      uploadedAt: '2026-06-17T12:00:00.000Z',
      expiresAt: '2026-06-19T12:00:00.000Z',
    })

    expect(from).toHaveBeenCalledWith('trade_requests')
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        reveal_screenshot_path: 'rep-1/request-1/reveal.png',
        reveal_screenshot_content_type: 'image/png',
        reveal_screenshot_size_bytes: 123,
        reveal_screenshot_uploaded_at: '2026-06-17T12:00:00.000Z',
        reveal_screenshot_expires_at: '2026-06-19T12:00:00.000Z',
      }),
    )
    expect(updateEq).toHaveBeenCalledWith('id', 'request-1')
  })

  it('returns a reveal screenshot only for the owning rep and before expiry', async () => {
    maybeSingle.mockResolvedValueOnce({
      data: {
        id: 'request-1',
        reveal_screenshot_path: 'rep-1/request-1/reveal.png',
        reveal_screenshot_content_type: 'image/png',
        reveal_screenshot_size_bytes: 123,
        reveal_screenshot_uploaded_at: '2026-06-17T12:00:00.000Z',
        reveal_screenshot_expires_at: '2999-06-19T12:00:00.000Z',
        listing: { rep_id: 'rep-1' },
      },
      error: null,
    })

    await expect(
      getTradeRequestRevealScreenshotForRep(
        supabaseWithListingLookup as never,
        'rep-1',
        'request-1',
      ),
    ).resolves.toEqual({
      objectPath: 'rep-1/request-1/reveal.png',
      contentType: 'image/png',
      sizeBytes: 123,
      uploadedAt: '2026-06-17T12:00:00.000Z',
      expiresAt: '2999-06-19T12:00:00.000Z',
    })
  })

  it('returns null for expired reveal screenshots', async () => {
    maybeSingle.mockResolvedValueOnce({
      data: {
        id: 'request-1',
        reveal_screenshot_path: 'rep-1/request-1/reveal.png',
        reveal_screenshot_content_type: 'image/png',
        reveal_screenshot_size_bytes: 123,
        reveal_screenshot_uploaded_at: '2026-06-17T12:00:00.000Z',
        reveal_screenshot_expires_at: '2020-06-19T12:00:00.000Z',
        listing: { rep_id: 'rep-1' },
      },
      error: null,
    })

    await expect(
      getTradeRequestRevealScreenshotForRep(
        supabaseWithListingLookup as never,
        'rep-1',
        'request-1',
      ),
    ).resolves.toBeNull()
  })

  it('keeps non-item-number listings visible in the rep request inbox', async () => {
    const requestQuery = new ThenableQuery({
      data: [
        {
          id: 'request-1',
          status: 'pending',
          customer_name: 'Jamie',
          customer_description: 'July Birthday ring, size 7',
          reveal_screenshot_path: null,
          reveal_screenshot_content_type: null,
          reveal_screenshot_size_bytes: null,
          reveal_screenshot_uploaded_at: null,
          reveal_screenshot_expires_at: null,
          rejection_reason: null,
          rep_notes: null,
          created_at: '2026-06-29T12:00:00.000Z',
          updated_at: '2026-06-29T12:00:00.000Z',
          listing: {
            id: 'manual-listing-1',
            rep_id: 'rep-1',
            listing_source: 'non_item_number',
            listing_photo_url: 'https://cdn.example.com/manual-ring.jpg',
            uses_canonical_photo: false,
            manual_type_prefix: 'RG',
            manual_collection_family: 'Birthday',
            manual_collection_name: 'July Birthday 2026',
            manual_size: '7',
            manual_photo_url: 'https://cdn.example.com/manual-ring.jpg',
            design: null,
          },
        },
      ],
      error: null,
    })
    const requestSelect = vi.fn(() => requestQuery)
    const localFrom = vi.fn((table: string) => {
      if (table === 'trade_requests') return { select: requestSelect }
      throw new Error(`unexpected table ${table}`)
    })

    const requests = await getTradeRequests({ from: localFrom } as never, 'rep-1', { limit: 8, offset: 0 })

    expect(requests).toHaveLength(1)
    expect(requests[0].listing.design).toMatchObject({
      itemNumber: null,
      designName: 'July Birthday 2026 Ring - Size 7',
      collectionName: 'July Birthday 2026',
      typePrefix: 'RG',
    })
    expect(requests[0].listing.listingSource).toBe('non_item_number')
    expect(requests[0].listing.repFacingNote).toBe('(non-item number piece)')
    // The owner predicate must reach PostgREST before pagination; filtering
    // after an 8-row preview can hide this rep behind other reps' requests.
    expect(requestSelect.mock.calls[0][0]).toContain('trade_listings!inner')
    expect(requestQuery.filters).toContainEqual(['listing.rep_id', 'rep-1'])
    expect(requestQuery.ranges).toEqual([[0, 7]])
  })
})
