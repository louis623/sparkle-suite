import { beforeEach, describe, expect, it, vi } from 'vitest'
import { errors } from '@/lib/services/errors'

const verification = {
  verifiedOfferedFamily: 'Lustre',
  verifiedOfferedType: 'NK' as const,
  verificationConfirmed: true,
  finalConfirmation: true,
}

const approveTradeMock = vi.fn()
const addListingMock = vi.fn()

vi.mock('@/lib/services/trade-requests', () => ({
  approveTrade: (...args: unknown[]) => approveTradeMock(...args),
}))

vi.mock('@/lib/services/trade-board', () => ({
  addListing: (...args: unknown[]) => addListingMock(...args),
}))

import {
  approveTradeWithRevealedItemCapture as approveTradeWithRevealedItemCaptureService,
  getTradeSwapCleanupQueue,
  resolveTradeSwapReplacementListing,
} from '@/lib/services/trade-swaps'

function approveTradeWithRevealedItemCapture(
  client: Parameters<typeof approveTradeWithRevealedItemCaptureService>[0],
  repId: string,
  input: Parameters<typeof approveTradeWithRevealedItemCaptureService>[2],
) {
  const itemNumber = input.revealedItemNumber.trim().toUpperCase()
  const catalogVerification = {
    ...verification,
    verifiedOfferedFamily: itemNumber === 'NK12032' ? 'Birthday' : 'Lustre',
    verifiedOfferedType: itemNumber.slice(0, 2) as 'RG' | 'NK' | 'ER',
  }
  return approveTradeWithRevealedItemCaptureService(client, repId, { verification: catalogVerification, ...input })
}

function makeApproveSupabase(
  design: Record<string, unknown> | Array<Record<string, unknown>> | null = null,
) {
  const designRows = Array.isArray(design) ? design : design ? [design] : []
  const designLimit = vi.fn().mockResolvedValue({ data: designRows, error: null })
  const designEq = vi.fn().mockReturnValue({ limit: designLimit })
  const designSelect = vi.fn().mockReturnValue({ eq: designEq })
  const insertSingle = vi.fn().mockResolvedValue({
    data: { id: 'swap-1', replacement_status: 'needs_catalog_details' },
    error: null,
  })
  const insertSelect = vi.fn().mockReturnValue({ single: insertSingle })
  const insert = vi.fn().mockReturnValue({ select: insertSelect })
  const updateEq = vi.fn().mockResolvedValue({ error: null })
  const update = vi.fn().mockReturnValue({ eq: updateEq })
  const rpc = vi.fn().mockResolvedValue({ data: {
    request_id: 'request-1', fulfillment_id: 'fulfillment-1', listing_id: 'outgoing-listing-1',
    customer_name: 'Jamie', quantity_available: 0, swap_id: 'swap-1',
  }, error: null })
  const from = vi.fn((table: string) => {
    if (table === 'jewelry_designs') return { select: designSelect }
    if (table === 'trade_swaps') return { insert, update }
    throw new Error(`unexpected table ${table}`)
  })

  return {
    client: { from, rpc } as never,
    spies: { from, designEq, designLimit, insert, insertSingle, update, rpc },
  }
}

function makeCleanupSupabase(rows: Array<Record<string, unknown>>) {
  const order = vi.fn().mockResolvedValue({ data: rows, error: null })
  const neq = vi.fn().mockReturnValue({ order })
  const eq = vi.fn().mockReturnValue({ neq })
  const select = vi.fn().mockReturnValue({ eq })
  const from = vi.fn((table: string) => {
    if (table === 'trade_swaps') return { select }
    throw new Error(`unexpected table ${table}`)
  })

  return { client: { from } as never, spies: { from, eq, neq, order } }
}

function makeResumeApproveSupabase(options: {
  swap: Record<string, unknown> | null
  insertError?: Record<string, unknown> | null
}) {
  const requestMaybeSingle = vi.fn().mockResolvedValue({
    data: {
      id: 'request-1',
      status: 'approved',
      customer_name: 'Jamie',
      listing_id: 'outgoing-listing-1',
      listing: { rep_id: 'rep-1' },
      fulfillment: { id: 'fulfillment-1' },
    },
    error: null,
  })
  const requestEq = vi.fn().mockReturnValue({ maybeSingle: requestMaybeSingle })
  const requestSelect = vi.fn().mockReturnValue({ eq: requestEq })

  const swapMaybeSingle = vi.fn().mockResolvedValue({
    data: options.swap,
    error: null,
  })
  const swapEq = vi.fn().mockReturnValue({ maybeSingle: swapMaybeSingle })
  const swapSelect = vi.fn().mockReturnValue({ eq: swapEq })
  const insertSingle = vi.fn().mockResolvedValue({
    data: options.insertError
      ? null
      : { id: 'swap-1', replacement_status: 'added_to_board' },
    error: options.insertError ?? null,
  })
  const insertSelect = vi.fn().mockReturnValue({ single: insertSingle })
  const insert = vi.fn().mockReturnValue({ select: insertSelect })

  const designLimit = vi.fn().mockResolvedValue({
    data: [
      {
        id: 'design-1',
        item_number: 'NK12345',
        design_name: 'Moonlit Pendant',
        material: null,
        main_stone: null,
        bp_msrp: 138,
        canonical_photo_url: null,
        type_prefix: 'NK',
        collection_id: 'collection-1',
        search_tags: [],
        collection: { name: 'Lustre', collection_year: 2026 },
      },
    ],
    error: null,
  })
  const designEq = vi.fn().mockReturnValue({ limit: designLimit })
  const designSelect = vi.fn().mockReturnValue({ eq: designEq })

  const from = vi.fn((table: string) => {
    if (table === 'trade_requests') return { select: requestSelect }
    if (table === 'trade_swaps') return { select: swapSelect, insert }
    if (table === 'jewelry_designs') return { select: designSelect }
    throw new Error(`unexpected table ${table}`)
  })
  const rpc = vi.fn().mockResolvedValue({ data: null, error: { message: 'REQUEST_NOT_PENDING' } })

  return { client: { from, rpc } as never, spies: { insert, rpc } }
}

function makeResolveReplacementSupabase(options: {
  replacementListing?: Record<string, unknown> | null
  swap?: Record<string, unknown> | null
  fulfillment?: Record<string, unknown> | null
} = {}) {
  const replacementListing =
    options.replacementListing === undefined
      ? { id: 'replacement-listing-1', rep_id: 'rep-1' }
      : options.replacementListing
  const swap =
    options.swap === undefined
      ? {
          id: 'swap-1',
          request_id: 'request-1',
          request: { listing: { rep_id: 'rep-1' } },
        }
      : options.swap
  const fulfillment =
    options.fulfillment === undefined
      ? { id: 'fulfillment-1' }
      : options.fulfillment

  const listingMaybeSingle = vi
    .fn()
    .mockResolvedValue({ data: replacementListing, error: null })
  const listingEq = vi.fn().mockReturnValue({ maybeSingle: listingMaybeSingle })
  const listingSelect = vi.fn().mockReturnValue({ eq: listingEq })

  const swapMaybeSingle = vi.fn().mockResolvedValue({ data: swap, error: null })
  const swapReadEq = vi.fn().mockReturnValue({ maybeSingle: swapMaybeSingle })
  const swapReadSelect = vi.fn().mockReturnValue({ eq: swapReadEq })
  const swapUpdateSingle = vi.fn().mockResolvedValue({
    data: {
      id: 'swap-1',
      request_id: 'request-1',
      replacement_listing_id: 'replacement-listing-1',
      replacement_status: 'added_to_board',
    },
    error: null,
  })
  const swapUpdateSelect = vi
    .fn()
    .mockReturnValue({ single: swapUpdateSingle })
  const swapUpdateEq = vi.fn().mockReturnValue({ select: swapUpdateSelect })
  const swapUpdate = vi.fn().mockReturnValue({ eq: swapUpdateEq })

  const fulfillmentMaybeSingle = vi
    .fn()
    .mockResolvedValue({ data: fulfillment, error: null })
  const fulfillmentSelect = vi
    .fn()
    .mockReturnValue({ maybeSingle: fulfillmentMaybeSingle })
  const fulfillmentEq = vi.fn().mockReturnValue({ select: fulfillmentSelect })
  const fulfillmentUpdate = vi.fn().mockReturnValue({ eq: fulfillmentEq })

  const from = vi.fn((table: string) => {
    if (table === 'trade_listings') return { select: listingSelect }
    if (table === 'trade_swaps') {
      return {
        select: swapReadSelect,
        update: swapUpdate,
      }
    }
    if (table === 'trade_fulfillment') return { update: fulfillmentUpdate }
    throw new Error(`unexpected table ${table}`)
  })

  return {
    client: { from } as never,
    spies: {
      from,
      listingEq,
      swapReadEq,
      swapUpdate,
      swapUpdateEq,
      fulfillmentUpdate,
      fulfillmentEq,
    },
  }
}

beforeEach(() => {
  approveTradeMock.mockReset()
  addListingMock.mockReset()
})

describe('approveTradeWithRevealedItemCapture', () => {
  it('returns the recorded swap when a lost response is retried after commit', async () => {
    approveTradeMock.mockRejectedValueOnce(errors.REQUEST_NOT_PENDING())
    const { client } = makeResumeApproveSupabase({
      swap: {
        id: 'swap-existing',
        revealed_item_number: 'NK12345',
        revealed_ring_size: null,
        revealed_design_id: 'design-1',
        replacement_listing_id: 'replacement-listing-1',
        replacement_status: 'added_to_board',
      },
    })

    await expect(
      approveTradeWithRevealedItemCapture(client, 'rep-1', {
        requestId: 'request-1',
        revealedItemNumber: 'NK12345',
      }),
    ).resolves.toMatchObject({
      swapId: 'swap-existing',
      requestId: 'request-1',
      replacementListingId: 'replacement-listing-1',
      replacementStatus: 'added_to_board',
    })
    expect(addListingMock).not.toHaveBeenCalled()
  })

  it('rejects a lost-response retry when its variant details do not match the recorded signature', async () => {
    approveTradeMock.mockRejectedValueOnce(errors.REQUEST_NOT_PENDING())
    const { client } = makeResumeApproveSupabase({
      swap: {
        id: 'swap-existing',
        input_signature: 'a'.repeat(64),
        revealed_item_number: 'ER59000',
        revealed_material: 'Lab-Created Ruby',
        revealed_ring_size: null,
        revealed_design_id: 'design-ruby',
        replacement_listing_id: 'replacement-listing-1',
        replacement_status: 'added_to_board',
        rep_notes: 'Ruby pair',
      },
    })

    await expect(
      approveTradeWithRevealedItemCapture(client, 'rep-1', {
        requestId: 'request-1',
        revealedItemNumber: 'ER59000',
        revealedMaterial: 'Rose Quartz Cubic Zirconia',
        repNotes: 'Rose quartz pair',
      }),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' })
    expect(addListingMock).not.toHaveBeenCalled()
  })

  it('does not make an ambiguous replacement after an approved request lacks a capture row', async () => {
    approveTradeMock.mockRejectedValueOnce(errors.REQUEST_NOT_PENDING())
    addListingMock.mockResolvedValueOnce({
      listingId: 'replacement-listing-1',
      designId: 'design-1',
      itemNumber: 'NK12345',
      designName: 'Moonlit Pendant',
      status: 'available',
      usesCanonicalPhoto: true,
    })
    const { client, spies } = makeResumeApproveSupabase({ swap: null })

    await expect(approveTradeWithRevealedItemCapture(client, 'rep-1', {
      requestId: 'request-1',
      revealedItemNumber: 'NK12345',
    })).rejects.toMatchObject({ code: 'REQUEST_NOT_PENDING' })
    expect(addListingMock).not.toHaveBeenCalled()
    expect(spies.insert).not.toHaveBeenCalled()
  })

  it('reads back the committed swap when concurrent resumes race the unique request constraint', async () => {
    approveTradeMock.mockResolvedValueOnce({
      requestId: 'request-1',
      fulfillmentId: 'fulfillment-1',
      listingId: 'outgoing-listing-1',
      customerName: 'Jamie',
    })
    addListingMock.mockResolvedValueOnce({
      listingId: 'replacement-listing-1',
      designId: 'design-1',
      itemNumber: 'NK12345',
      designName: 'Moonlit Pendant',
      status: 'available',
      usesCanonicalPhoto: true,
    })
    const { client } = makeResumeApproveSupabase({
      insertError: { code: '23505', message: 'duplicate key value' },
      swap: {
        id: 'swap-winner',
        input_signature: null,
        revealed_item_number: 'NK12345',
        revealed_material: null,
        revealed_ring_size: null,
        revealed_design_id: 'design-1',
        replacement_listing_id: 'replacement-listing-1',
        replacement_status: 'added_to_board',
        rep_notes: null,
      },
    })

    await expect(
      approveTradeWithRevealedItemCapture(client, 'rep-1', {
        requestId: 'request-1',
        revealedItemNumber: 'NK12345',
      }),
    ).resolves.toMatchObject({
      swapId: 'swap-winner',
      replacementListingId: 'replacement-listing-1',
      replacementStatus: 'added_to_board',
    })
  })

  it('approves the trade and auto-adds the revealed piece when the item number exists', async () => {
    approveTradeMock.mockResolvedValueOnce({
      requestId: 'request-1',
      fulfillmentId: 'fulfillment-1',
      listingId: 'outgoing-listing-1',
      customerName: 'Jamie',
    })
    addListingMock.mockResolvedValueOnce({
      listingId: 'replacement-listing-1',
      designId: 'design-1',
      itemNumber: 'NK12345',
      designName: 'Moonlit Pendant',
      status: 'available',
      usesCanonicalPhoto: true,
    })
    const { client, spies } = makeApproveSupabase({
      id: 'design-1',
      item_number: 'NK12345',
      design_name: 'Moonlit Pendant',
      material: null,
      main_stone: null,
      bp_msrp: 138,
      canonical_photo_url: null,
      type_prefix: 'NK',
      collection_id: 'collection-1',
      search_tags: [],
      collection: { name: 'Lustre', collection_year: 2026 },
    })

    const result = await approveTradeWithRevealedItemCapture(client, 'rep-1', {
      requestId: 'request-1',
      revealedItemNumber: ' nk12345 ',
    })

    expect(spies.rpc).toHaveBeenCalledWith('rpc_approve_trade_with_swap_v2', expect.objectContaining({
      p_request_id: 'request-1', p_revealed_item_number: 'NK12345', p_revealed_design_id: 'design-1',
    }))
    expect(addListingMock).toHaveBeenCalledWith(client, 'rep-1', expect.objectContaining({
      itemNumber: 'NK12345',
      material: undefined,
      ringSize: undefined,
      repNotes: 'Added from approved trade swap for Jamie.',
      idempotencyKey: 'trade-swap-replacement:request-1',
      inputSignature: expect.any(String),
    }))
    expect(spies.designEq).toHaveBeenCalledWith('item_number', 'NK12345')
    expect(spies.update).toHaveBeenCalledWith(expect.objectContaining({
      replacement_listing_id: 'replacement-listing-1', replacement_status: 'added_to_board',
    }))
    expect(result).toMatchObject({
      swapId: 'swap-1',
      replacementStatus: 'added_to_board',
      replacementListingId: 'replacement-listing-1',
      revealedDesignId: 'design-1',
      revealedItemNumber: 'NK12345',
    })
  })

  it('saves a matched ring as needs_ring_size when ring size is missing', async () => {
    approveTradeMock.mockResolvedValueOnce({
      requestId: 'request-1',
      fulfillmentId: 'fulfillment-1',
      listingId: 'outgoing-listing-1',
      customerName: 'Jamie',
    })
    const { client, spies } = makeApproveSupabase({
      id: 'design-1',
      item_number: 'RG99999',
      design_name: 'Moon Ring',
      material: null,
      main_stone: null,
      bp_msrp: 138,
      canonical_photo_url: null,
      type_prefix: 'RG',
      collection_id: 'collection-1',
      search_tags: [],
      collection: { name: 'Lustre', collection_year: 2026 },
    })

    const result = await approveTradeWithRevealedItemCapture(client, 'rep-1', {
      requestId: 'request-1',
      revealedItemNumber: 'RG99999',
    })

    expect(addListingMock).not.toHaveBeenCalled()
    expect(spies.rpc).toHaveBeenCalledWith('rpc_approve_trade_with_swap_v2', expect.objectContaining({
      p_revealed_item_number: 'RG99999', p_revealed_design_id: 'design-1', p_revealed_ring_size: null,
    }))
    expect(result.replacementStatus).toBe('needs_ring_size')
  })

  it('does not approve when the revealed item number cannot be resolved', async () => {
    approveTradeMock.mockResolvedValueOnce({
      requestId: 'request-1',
      fulfillmentId: 'fulfillment-1',
      listingId: 'outgoing-listing-1',
      customerName: 'Jamie',
    })
    const { client, spies } = makeApproveSupabase(null)

    await expect(approveTradeWithRevealedItemCapture(client, 'rep-1', {
      requestId: 'request-1',
      revealedItemNumber: 'ER00001',
    })).rejects.toMatchObject({ code: 'INVALID_INPUT' })

    expect(addListingMock).not.toHaveBeenCalled()
    expect(approveTradeMock).not.toHaveBeenCalled()
    expect(spies.insert).not.toHaveBeenCalled()
  })

  it('blocks contradictory verified facts for a known catalog item before approval', async () => {
    const { client, spies } = makeApproveSupabase({
      id: 'design-1', item_number: 'RG99999', design_name: 'Moon Ring',
      material: null, main_stone: null, bp_msrp: 138, canonical_photo_url: null,
      type_prefix: 'RG', collection_id: 'collection-1', search_tags: [],
      collection: { name: 'Lustre', collection_year: 2026 },
    })
    await expect(approveTradeWithRevealedItemCaptureService(client, 'rep-1', {
      requestId: 'request-1', revealedItemNumber: 'RG99999',
      verification: { ...verification, verifiedOfferedFamily: 'OG', verifiedOfferedType: 'RG' },
    })).rejects.toMatchObject({ code: 'CATALOG_ITEM_MISMATCH' })
    expect(spies.rpc).not.toHaveBeenCalled()
  })

  it('auto-adds a matched ring when ring size is supplied', async () => {
    approveTradeMock.mockResolvedValueOnce({
      requestId: 'request-1',
      fulfillmentId: 'fulfillment-1',
      listingId: 'outgoing-listing-1',
      customerName: 'Jamie',
    })
    addListingMock.mockResolvedValueOnce({
      listingId: 'replacement-listing-1',
      designId: 'design-1',
      itemNumber: 'RG99999',
      designName: 'Moon Ring',
      status: 'available',
      usesCanonicalPhoto: true,
    })
    const { client, spies } = makeApproveSupabase({
      id: 'design-1',
      item_number: 'RG99999',
      design_name: 'Moon Ring',
      material: null,
      main_stone: null,
      bp_msrp: 138,
      canonical_photo_url: null,
      type_prefix: 'RG',
      collection_id: 'collection-1',
      search_tags: [],
      collection: { name: 'Lustre', collection_year: 2026 },
    })

    const result = await approveTradeWithRevealedItemCapture(client, 'rep-1', {
      requestId: 'request-1',
      revealedItemNumber: 'RG99999',
      revealedRingSize: ' 8 ',
    })

    expect(addListingMock).toHaveBeenCalledWith(client, 'rep-1', expect.objectContaining({
      itemNumber: 'RG99999',
      material: undefined,
      ringSize: '8',
      repNotes: 'Added from approved trade swap for Jamie.',
      idempotencyKey: 'trade-swap-replacement:request-1',
      inputSignature: expect.any(String),
    }))
    expect(spies.rpc).toHaveBeenCalledWith('rpc_approve_trade_with_swap_v2', expect.objectContaining({ p_revealed_ring_size: '8' }))
    expect(spies.update).toHaveBeenCalledWith(expect.objectContaining({ replacement_status: 'added_to_board' }))
    expect(result.replacementStatus).toBe('added_to_board')
  })

  it('uses revealed material to choose the correct catalog variant', async () => {
    approveTradeMock.mockResolvedValueOnce({
      requestId: 'request-1',
      fulfillmentId: 'fulfillment-1',
      listingId: 'outgoing-listing-1',
      customerName: 'Jamie',
    })
    addListingMock.mockResolvedValueOnce({
      listingId: 'replacement-listing-1',
      designId: 'design-hematite',
      itemNumber: 'NK12032',
      designName: 'Reveal Necklace',
      status: 'available',
      usesCanonicalPhoto: true,
    })
    const { client, spies } = makeApproveSupabase([
      {
        id: 'design-rhodium',
        item_number: 'NK12032',
        design_name: 'Reveal Necklace',
        material: 'Rhodium Plating',
        main_stone: null,
        bp_msrp: 138,
        canonical_photo_url: null,
        type_prefix: 'NK',
        collection_id: 'collection-1',
        search_tags: [],
        collection: { name: 'July Birthday 2026', collection_year: 2026 },
      },
      {
        id: 'design-hematite',
        item_number: 'NK12032',
        design_name: 'Reveal Necklace',
        material: 'Hematite Plating',
        main_stone: null,
        bp_msrp: 138,
        canonical_photo_url: null,
        type_prefix: 'NK',
        collection_id: 'collection-1',
        search_tags: [],
        collection: { name: 'July Birthday 2026', collection_year: 2026 },
      },
    ])

    const result = await approveTradeWithRevealedItemCapture(client, 'rep-1', {
      requestId: 'request-1',
      revealedItemNumber: 'NK12032',
      revealedMaterial: 'hematite plating',
    })

    expect(addListingMock).toHaveBeenCalledWith(client, 'rep-1', expect.objectContaining({
      itemNumber: 'NK12032',
      material: 'hematite plating',
      ringSize: undefined,
      repNotes: 'Added from approved trade swap for Jamie.',
      idempotencyKey: 'trade-swap-replacement:request-1',
      inputSignature: expect.any(String),
    }))
    expect(spies.rpc).toHaveBeenCalledWith('rpc_approve_trade_with_swap_v2', expect.objectContaining({ p_revealed_design_id: 'design-hematite' }))
    expect(spies.update).toHaveBeenCalledWith(expect.objectContaining({ replacement_status: 'added_to_board' }))
    expect(result.revealedDesignId).toBe('design-hematite')
  })

  it('does not approve a catalog item whose collection is missing', async () => {
    approveTradeMock.mockResolvedValueOnce({
      requestId: 'request-1',
      fulfillmentId: 'fulfillment-1',
      listingId: 'outgoing-listing-1',
      customerName: 'Jamie',
    })
    addListingMock.mockRejectedValueOnce(
      errors.NEEDS_COLLECTION('design-1', 'Moonlit Pendant'),
    )
    const { client, spies } = makeApproveSupabase({
      id: 'design-1',
      item_number: 'NK12345',
      design_name: 'Moonlit Pendant',
      material: null,
      main_stone: null,
      bp_msrp: 138,
      canonical_photo_url: null,
      type_prefix: 'NK',
      collection_id: null,
      search_tags: [],
      collection: null,
    })

    await expect(approveTradeWithRevealedItemCapture(client, 'rep-1', {
      requestId: 'request-1',
      revealedItemNumber: 'NK12345',
    })).rejects.toMatchObject({ code: 'VERIFICATION_REQUIRED' })

    expect(spies.rpc).not.toHaveBeenCalled()
    expect(spies.update).not.toHaveBeenCalled()
    expect(addListingMock).not.toHaveBeenCalled()
  })
})

describe('getTradeSwapCleanupQueue', () => {
  it('returns unresolved swapped-in reveal pieces owned by the rep', async () => {
    const { client, spies } = makeCleanupSupabase([
      {
        id: 'swap-1',
        request_id: 'request-1',
        outgoing_listing_id: 'outgoing-listing-1',
        revealed_item_number: 'ER00001',
        revealed_ring_size: null,
        replacement_status: 'needs_catalog_details',
        created_at: '2026-06-11T20:00:00.000Z',
        request: {
          customer_name: 'Jamie',
          listing: { rep_id: 'rep-1' },
        },
      },
      {
        id: 'swap-2',
        request_id: 'request-2',
        outgoing_listing_id: 'outgoing-listing-2',
        revealed_item_number: 'RG00002',
        revealed_ring_size: null,
        replacement_status: 'needs_ring_size',
        created_at: '2026-06-11T20:05:00.000Z',
        request: {
          customer_name: 'Alex',
          listing: { rep_id: 'other-rep' },
        },
      },
    ])

    const result = await getTradeSwapCleanupQueue(client, 'rep-1')

    expect(spies.eq).toHaveBeenCalledWith(
      'request.listing.rep_id',
      'rep-1',
    )
    expect(spies.neq).toHaveBeenCalledWith(
      'replacement_status',
      'added_to_board',
    )
    expect(result).toEqual([
      {
        swapId: 'swap-1',
        requestId: 'request-1',
        customerName: 'Jamie',
        outgoingListingId: 'outgoing-listing-1',
        revealedItemNumber: 'ER00001',
        revealedRingSize: null,
        replacementStatus: 'needs_catalog_details',
        createdAt: '2026-06-11T20:00:00.000Z',
      },
    ])
  })
})

describe('resolveTradeSwapReplacementListing', () => {
  it('links the replacement listing to the swap and received fulfillment row', async () => {
    const { client, spies } = makeResolveReplacementSupabase()

    const result = await resolveTradeSwapReplacementListing(client, 'rep-1', {
      swapId: 'swap-1',
      replacementListingId: 'replacement-listing-1',
    })

    expect(spies.listingEq).toHaveBeenCalledWith(
      'id',
      'replacement-listing-1',
    )
    expect(spies.swapReadEq).toHaveBeenCalledWith('id', 'swap-1')
    expect(spies.swapUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        replacement_listing_id: 'replacement-listing-1',
        replacement_status: 'added_to_board',
        updated_at: expect.any(String),
      }),
    )
    expect(spies.swapUpdateEq).toHaveBeenCalledWith('id', 'swap-1')
    expect(spies.fulfillmentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        received_listing_id: 'replacement-listing-1',
        status_updated_at: expect.any(String),
      }),
    )
    expect(spies.fulfillmentEq).toHaveBeenCalledWith(
      'request_id',
      'request-1',
    )
    expect(result).toEqual({
      swapId: 'swap-1',
      requestId: 'request-1',
      replacementListingId: 'replacement-listing-1',
      replacementStatus: 'added_to_board',
      fulfillmentId: 'fulfillment-1',
    })
  })
})
