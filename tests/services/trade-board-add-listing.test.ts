import { beforeEach, describe, expect, it, vi } from 'vitest'

const analyzeServerImageQualityMock = vi.fn()

vi.mock('@/lib/services/server-image-quality', () => ({
  analyzeServerImageQuality: (...args: unknown[]) =>
    analyzeServerImageQualityMock(...args),
}))

import {
  addListing,
  addListingBatch,
  getCatalogListingMutationReceipt,
} from '@/lib/services/trade-board'
import { resolveItemNumber } from '@/lib/services/jewelry-database'

function makeResolveSupabase(rows: Array<Record<string, unknown>> | Record<string, unknown> | null) {
  const data = Array.isArray(rows) ? rows : rows ? [rows] : []
  const limit = vi.fn().mockResolvedValue({ data, error: null })
  const query = { eq: vi.fn(), limit }
  query.eq.mockReturnValue(query)
  const select = vi.fn().mockReturnValue(query)
  const from = vi.fn().mockReturnValue({ select })

  return {
    client: { from } as never,
    spies: { from, select, eq: query.eq, limit },
  }
}

function makeBatchSupabase(
  options: {
    existingListings?: Array<{ design_id: string }>
    canonicalPhotoUrl?: string | null
    designRows?: Array<Record<string, unknown>>
  } = {},
) {
  let availableQuantity = options.existingListings?.length ? 1 : 0
  const rpc = vi.fn().mockImplementation(async () => {
    availableQuantity += 1
    return {
      data: {
        listing_id: 'listing-1',
        status: 'available',
        quantity_available: availableQuantity,
        grouped_with_existing: availableQuantity > 1,
      },
      error: null,
    }
  })
  const defaultDesignRows = [
      {
        id: 'design-1',
        item_number: 'RG31452',
        design_name: 'Celeste Ring',
        material: 'Sterling Silver',
        main_stone: 'Topaz',
        bp_msrp: 42,
        collection_id: 'collection-1',
        canonical_photo_url: options.canonicalPhotoUrl ?? null,
        type_prefix: 'RG',
        search_tags: [],
        collection: { name: 'Lustre', collection_year: null },
      },
    ]
  const designLookup = vi.fn().mockResolvedValue({
    data: options.designRows ?? defaultDesignRows,
    error: null,
  })
  const existingLookup = vi
    .fn()
    .mockResolvedValue({ data: options.existingListings ?? [], error: null })
  let insertedRows: Array<Record<string, unknown>> = []
  const insertSelect = vi.fn().mockImplementation(() =>
    Promise.resolve({
      data: insertedRows.map((row, index) => ({
        id: `listing-${index + 1}`,
        design_id: row.design_id,
        status: row.status,
      })),
      error: null,
    }),
  )
  const insert = vi.fn((rows: Array<Record<string, unknown>>) => {
    insertedRows = rows
    return { select: insertSelect }
  })
  const timesListedLookup = vi.fn().mockResolvedValue({
    data: { times_listed: 2 },
    error: null,
  })
  const designUpdateEq = vi.fn().mockResolvedValue({ data: null, error: null })
  const designUpdate = vi.fn().mockReturnValue({ eq: designUpdateEq })

  const existingIn = vi.fn().mockImplementation(existingLookup)
  const existingEqStatus = vi.fn().mockReturnValue({ in: existingIn })
  const existingEqRep = vi.fn().mockReturnValue({ eq: existingEqStatus })
  const tradeListingsSelect = vi
    .fn()
    .mockReturnValueOnce({ eq: existingEqRep })

  const designResolveEq = vi.fn().mockReturnValue({ limit: designLookup })
  const timesListedEq = vi
    .fn()
    .mockReturnValue({ maybeSingle: timesListedLookup })
  const designIn = vi.fn()
  const jewelryDesignsSelect = vi.fn((columns: string) =>
    columns === 'times_listed'
      ? { eq: timesListedEq }
      : { eq: designResolveEq },
  )

  const from = vi.fn((table: string) => {
    if (table === 'trade_listings') {
      return {
        select: tradeListingsSelect,
        insert,
      }
    }

    if (table === 'jewelry_designs') {
      return {
        select: jewelryDesignsSelect,
        update: designUpdate,
      }
    }

    throw new Error(`unexpected table ${table}`)
  })

  return {
    client: { from, rpc } as never,
    spies: {
      from,
      insert,
      insertSelect,
      designLookup,
      designIn,
      existingLookup,
      existingEqRep,
      existingEqStatus,
      existingIn,
      timesListedLookup,
      designUpdate,
      designUpdateEq,
      rpc,
    },
  }
}

function makeAddListingWithCollectionSupabase(
  options: {
    existingListing?: Record<string, unknown> | null
    canonicalPhotoUrl?: string | null
    collection?: { id: string; name: string; collection_year: number | null }
    mutationReplayed?: boolean
  } = {},
) {
  const rpc = vi.fn().mockResolvedValue({
    data: {
      listing_id: 'listing-1',
      status: 'available',
      quantity_available: options.existingListing ? 2 : 1,
      grouped_with_existing: Boolean(options.existingListing),
      mutation_replayed: Boolean(options.mutationReplayed),
    },
    error: null,
  })
  const resolveLimit = vi.fn().mockResolvedValue({
    data: options.designRows ?? [
      {
      id: 'design-1',
      item_number: 'RG31452',
      design_name: 'Celeste Ring',
      material: 'Sterling Silver',
      main_stone: 'Topaz',
      bp_msrp: 42,
      canonical_photo_url: options.canonicalPhotoUrl ?? null,
      type_prefix: 'RG',
      collection_id: null,
      collection: null,
      },
    ],
    error: null,
  })
  const resolveEq = vi.fn().mockReturnValue({ limit: resolveLimit })

  const collectionMaybeSingle = vi.fn().mockResolvedValue({
    data: options.collection ?? {
      id: 'collection-1',
      name: 'Lustre',
      collection_year: null,
    },
    error: null,
  })
  const collectionEq = vi.fn().mockReturnValue({
    maybeSingle: collectionMaybeSingle,
  })
  const collectionSelect = vi.fn().mockReturnValue({ eq: collectionEq })

  const patchMaybeSingle = vi.fn().mockResolvedValue({
    data: { id: 'design-1', collection_id: 'collection-1' },
    error: null,
  })
  const patchSelect = vi.fn().mockReturnValue({ maybeSingle: patchMaybeSingle })
  const patchIs = vi.fn().mockReturnValue({ select: patchSelect })
  const patchEq = vi.fn().mockReturnValue({ is: patchIs })
  const patchUpdate = vi.fn().mockReturnValue({ eq: patchEq })

  const timesListedMaybeSingle = vi.fn().mockResolvedValue({
    data: { times_listed: 1 },
    error: null,
  })
  const timesListedEq = vi
    .fn()
    .mockReturnValue({ maybeSingle: timesListedMaybeSingle })

  const jewelrySelect = vi
    .fn()
    .mockReturnValueOnce({ eq: resolveEq })
    .mockReturnValueOnce({ eq: timesListedEq })

  const timesListedUpdateEq = vi.fn().mockResolvedValue({
    data: null,
    error: null,
  })
  const timesListedUpdate = vi
    .fn()
    .mockReturnValue({ eq: timesListedUpdateEq })
  const jewelryUpdate = vi
    .fn()
    .mockImplementationOnce(patchUpdate)
    .mockImplementationOnce(timesListedUpdate)

  const duplicateMaybeSingle = vi.fn().mockResolvedValue({
    data: options.existingListing ?? null,
    error: null,
  })
  const duplicateChain: Record<string, unknown> = {
    maybeSingle: duplicateMaybeSingle,
  }
  duplicateChain.eq = vi.fn().mockReturnValue(duplicateChain)
  duplicateChain.limit = vi.fn().mockReturnValue(duplicateChain)
  const tradeListingsSelect = vi.fn().mockReturnValue(duplicateChain)

  const insertSingle = vi.fn().mockResolvedValue({
    data: { id: 'listing-1', status: 'available' },
    error: null,
  })
  const insertSelect = vi.fn().mockReturnValue({ single: insertSingle })
  const insert = vi.fn().mockReturnValue({ select: insertSelect })

  const from = vi.fn((table: string) => {
    if (table === 'jewelry_designs') {
      return {
        select: jewelrySelect,
        update: jewelryUpdate,
      }
    }

    if (table === 'collections') {
      return {
        select: collectionSelect,
      }
    }

    if (table === 'trade_listings') {
      return {
        select: tradeListingsSelect,
        insert,
      }
    }

    throw new Error(`unexpected table ${table}`)
  })

  return {
    client: { from, rpc } as never,
    spies: {
      collectionEq,
      patchUpdate,
      patchIs,
      insert,
      rpc,
      timesListedUpdate,
    },
  }
}

describe('resolveItemNumber', () => {
  it('normalizes whitespace and casing before exact matching item_number', async () => {
    const { client, spies } = makeResolveSupabase({
      id: 'design-1',
      item_number: 'RG31452',
      design_name: 'Celeste Ring',
      material: 'Sterling Silver',
      main_stone: 'Topaz',
      bp_msrp: 42,
      canonical_photo_url: null,
      type_prefix: 'RG',
      collection_id: 'collection-1',
      collection: { name: 'Lustre' },
    })

    const result = await resolveItemNumber(client, ' rg31452 ')

    expect(spies.eq).toHaveBeenCalledWith('item_number', 'RG31452')
    expect(result).toMatchObject({
      found: true,
      design: {
        itemNumber: 'RG31452',
        designName: 'Celeste Ring',
      },
      hasCollection: true,
    })
  })

  it('uses material as the variant key when one item number has multiple platings', async () => {
    const { client } = makeResolveSupabase([
      {
        id: 'design-rhodium',
        item_number: 'NK12032',
        design_name: 'Reveal Necklace',
        material: 'Rhodium Plating',
        main_stone: 'Ruby',
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
        main_stone: 'Ruby',
        bp_msrp: 138,
        canonical_photo_url: null,
        type_prefix: 'NK',
        collection_id: 'collection-1',
        search_tags: [],
        collection: { name: 'July Birthday 2026', collection_year: 2026 },
      },
    ])

    const result = await resolveItemNumber(client, 'NK12032', {
      material: 'hematite plating',
    })

    expect(result).toMatchObject({
      found: true,
      design: {
        id: 'design-hematite',
        itemNumber: 'NK12032',
        material: 'Hematite Plating',
      },
    })
  })

  it('uses main stone as part of the variant key when item number and plating match', async () => {
    const { client } = makeResolveSupabase([
      {
        id: 'design-rose-quartz',
        item_number: 'ER59000',
        design_name: 'Baguette Braid Sparkle',
        material: 'Rhodium Plating',
        main_stone: 'Rose Quartz Cubic Zirconia',
        bp_msrp: 126,
        canonical_photo_url: 'https://cdn.example.com/er59000-rose-quartz.png',
        type_prefix: 'ER',
        collection_id: 'collection-1',
        search_tags: [],
        collection: { name: 'July Birthday 2026', collection_year: 2026 },
      },
      {
        id: 'design-ruby',
        item_number: 'ER59000',
        design_name: 'Baguette Braid Sparkle',
        material: 'Rhodium Plating',
        main_stone: 'Lab-Created Ruby',
        bp_msrp: 126,
        canonical_photo_url: 'https://cdn.example.com/er59000-ruby.png',
        type_prefix: 'ER',
        collection_id: 'collection-1',
        search_tags: [],
        collection: { name: 'July Birthday 2026', collection_year: 2026 },
      },
    ])

    const result = await resolveItemNumber(client, 'ER59000', {
      material: 'rhodium plating',
      mainStone: 'lab-created ruby',
    })

    expect(result).toMatchObject({
      found: true,
      design: {
        id: 'design-ruby',
        itemNumber: 'ER59000',
        mainStone: 'Lab-Created Ruby',
        canonicalPhotoUrl: 'https://cdn.example.com/er59000-ruby.png',
      },
    })
  })

  it('uses the internal design id when public variant attributes are incomplete', async () => {
    const { client, spies } = makeResolveSupabase([
      {
        id: 'design-legacy-a',
        item_number: 'RBP5902',
        design_name: 'One More Chapter',
        material: null,
        main_stone: null,
        bp_msrp: 112,
        canonical_photo_url: 'https://cdn.example.com/rbp5902-a.png',
        type_prefix: 'NK',
        collection_id: 'collection-1',
        search_tags: [],
        collection: { name: 'OG', collection_year: null },
      },
      {
        id: 'design-legacy-b',
        item_number: 'RBP5902',
        design_name: 'One More Chapter',
        material: null,
        main_stone: null,
        bp_msrp: 112,
        canonical_photo_url: 'https://cdn.example.com/rbp5902-b.png',
        type_prefix: 'NK',
        collection_id: 'collection-1',
        search_tags: [],
        collection: { name: 'OG', collection_year: null },
      },
    ])

    const result = await resolveItemNumber(client, 'RBP5902', {
      designId: 'design-legacy-b',
    })

    expect(spies.eq).toHaveBeenCalledWith('item_number', 'RBP5902')
    expect(spies.eq).toHaveBeenCalledWith('id', 'design-legacy-b')
    expect(result).toMatchObject({
      found: true,
      design: { id: 'design-legacy-b', itemNumber: 'RBP5902' },
    })
  })

  it('rejects stale public attributes that do not match the selected internal design id', async () => {
    const { client } = makeResolveSupabase({
      id: 'design-ruby',
      item_number: 'ER59000',
      design_name: 'Baguette Braid Sparkle',
      material: 'Rhodium Plating',
      main_stone: 'Lab-Created Ruby',
      bp_msrp: 126,
      canonical_photo_url: 'https://cdn.example.com/er59000-ruby.png',
      type_prefix: 'ER',
      collection_id: 'collection-1',
      search_tags: [],
      collection: { name: 'OG', collection_year: null },
    })

    await expect(
      resolveItemNumber(client, 'ER59000', {
        designId: 'design-ruby',
        material: 'Rhodium Plating',
        mainStone: 'Rose Quartz Cubic Zirconia',
      }),
    ).resolves.toMatchObject({
      found: false,
      itemNumber: 'ER59000',
      requestedMainStone: 'Rose Quartz Cubic Zirconia',
    })
  })

  it('returns an ambiguous variant result when plating is missing for a multi-plating item number', async () => {
    const { client } = makeResolveSupabase([
      {
        id: 'design-rhodium',
        item_number: 'NK12032',
        design_name: 'Reveal Necklace',
        material: 'Rhodium Plating',
        main_stone: 'Ruby',
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
        main_stone: 'Ruby',
        bp_msrp: 138,
        canonical_photo_url: null,
        type_prefix: 'NK',
        collection_id: 'collection-1',
        search_tags: [],
        collection: { name: 'July Birthday 2026', collection_year: 2026 },
      },
    ])

    const result = await resolveItemNumber(client, 'NK12032')

    expect(result).toMatchObject({
      found: false,
      itemNumber: 'NK12032',
      ambiguous: true,
      variantCandidates: [
        { designId: 'design-rhodium', material: 'Rhodium Plating' },
        { designId: 'design-hematite', material: 'Hematite Plating' },
      ],
    })
  })
})

describe('addListingBatch', () => {
  beforeEach(() => {
    vi.useRealTimers()
    analyzeServerImageQualityMock.mockReset()
  })

  it('groups repeated identical item numbers inside the same batch into one dancer quantity', async () => {
    const { client, spies } = makeBatchSupabase()

    const result = await addListingBatch(client, 'rep-1', {
      clickwrapAccepted: true,
      items: [
        { itemNumber: 'RG31452', idempotencyKey: 'batch-1', inputSignature: 'sig-1' },
        { itemNumber: ' rg31452 ', idempotencyKey: 'batch-2', inputSignature: 'sig-2' },
      ],
    })

    expect(spies.rpc).toHaveBeenCalledTimes(2)
    expect(result.added).toHaveLength(1)
    expect(result.added[0]).toMatchObject({
      itemNumber: 'RG31452',
      designName: 'Celeste Ring',
      quantityAvailable: 2,
      groupedWithExisting: true,
    })
  })

  it('increments a matching available dancer instead of adding another card', async () => {
    const { client, spies } = makeBatchSupabase({
      existingListings: [{ design_id: 'design-1' }],
    })

    const result = await addListingBatch(client, 'rep-1', {
      clickwrapAccepted: true,
      items: [{ itemNumber: 'RG31452', idempotencyKey: 'batch-4', inputSignature: 'sig-4' }],
    })

    expect(spies.rpc).toHaveBeenCalledTimes(1)
    expect(result.added).toMatchObject([
      { listingId: 'listing-1', quantityAvailable: 2, groupedWithExisting: true },
    ])
  })

  it('trusts batch canonical fallback without reclassifying the catalog photo', async () => {
    const { client, spies } = makeBatchSupabase({
      canonicalPhotoUrl: 'https://cdn.example.com/card-back.jpg',
    })

    const result = await addListingBatch(client, 'rep-1', {
      clickwrapAccepted: true,
      items: [{ itemNumber: 'RG31452', idempotencyKey: 'batch-3', inputSignature: 'sig-3' }],
    })

    expect(analyzeServerImageQualityMock).not.toHaveBeenCalled()
    expect(spies.rpc).toHaveBeenCalledTimes(1)
    expect(result.added).toHaveLength(1)
  })
})

describe('catalog listing mutation receipts', () => {
  it('hydrates a replay into the normal camelCase add-listing result', async () => {
    const receiptMaybeSingle = vi.fn().mockResolvedValue({
      data: {
        input_signature: 'sig-1',
        result: {
          listing_id: 'listing-1',
          grouped_with_existing: true,
        },
      },
      error: null,
    })
    const receiptKeyEq = vi.fn().mockReturnValue({ maybeSingle: receiptMaybeSingle })
    const receiptRepEq = vi.fn().mockReturnValue({ eq: receiptKeyEq })
    const receiptSelect = vi.fn().mockReturnValue({ eq: receiptRepEq })

    const listingMaybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: 'listing-1',
        design_id: 'design-ruby',
        status: 'available',
        quantity_available: 2,
        uses_canonical_photo: false,
        design: {
          item_number: 'ER59000',
          design_name: 'Baguette Braid Sparkle',
        },
      },
      error: null,
    })
    const listingIdEq = vi.fn().mockReturnValue({ maybeSingle: listingMaybeSingle })
    const listingRepEq = vi.fn().mockReturnValue({ eq: listingIdEq })
    const listingSelect = vi.fn().mockReturnValue({ eq: listingRepEq })

    const from = vi.fn((table: string) => {
      if (table === 'trade_listing_add_mutations') return { select: receiptSelect }
      if (table === 'trade_listings') return { select: listingSelect }
      throw new Error(`unexpected table ${table}`)
    })

    await expect(
      getCatalogListingMutationReceipt({ from } as never, {
        repId: 'rep-1',
        idempotencyKey: 'add-1',
        inputSignature: 'sig-1',
      }),
    ).resolves.toEqual({
      listingId: 'listing-1',
      designId: 'design-ruby',
      itemNumber: 'ER59000',
      designName: 'Baguette Braid Sparkle',
      status: 'available',
      usesCanonicalPhoto: false,
      quantityAvailable: 2,
      groupedWithExisting: true,
      mutationReplayed: true,
    })
  })
})

describe('addListing', () => {
  it('patches a missing design collection before listing when the rep supplies the exact collection name', async () => {
    const { client, spies } = makeAddListingWithCollectionSupabase()

    const result = await addListing(client, 'rep-1', {
      itemNumber: ' rg31452 ',
      clickwrapAccepted: true,
      collectionName: ' Lustre ',
      idempotencyKey: 'add-1',
      inputSignature: 'sig-1',
    })

    expect(spies.collectionEq).toHaveBeenCalledWith('name', 'Lustre')
    expect(spies.patchUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        collection_id: 'collection-1',
        updated_at: expect.any(String),
      }),
    )
    expect(spies.patchIs).toHaveBeenCalledWith('collection_id', null)
    expect(spies.rpc).toHaveBeenCalledWith(
      'rpc_add_or_increment_catalog_listing_v3',
      expect.objectContaining({ p_rep_id: 'rep-1', p_design_id: 'design-1' }),
    )
    expect(result).toMatchObject({
      listingId: 'listing-1',
      designId: 'design-1',
      itemNumber: 'RG31452',
      designName: 'Celeste Ring',
    })
  })

  it('resolves batch variants by material and stone instead of row order', async () => {
    const base = {
      item_number: 'ER59000',
      design_name: 'Baguette Braid Sparkle',
      material: 'Rhodium Plating',
      bp_msrp: 126,
      collection_id: 'collection-1',
      canonical_photo_url: null,
      type_prefix: 'ER',
      search_tags: [],
      collection: { name: 'OG', collection_year: null },
    }
    const { client, spies } = makeBatchSupabase({
      designRows: [
        { ...base, id: 'design-rose', main_stone: 'Rose Quartz Cubic Zirconia' },
        { ...base, id: 'design-ruby', main_stone: 'Lab-Created Ruby' },
      ],
    })

    const result = await addListingBatch(client, 'rep-1', {
      items: [
        {
          itemNumber: 'ER59000',
          material: 'Rhodium Plating',
          mainStone: 'Lab-Created Ruby',
          idempotencyKey: 'batch-ruby',
          inputSignature: 'sig-ruby',
        },
      ],
    })

    expect(result.pending).toEqual({ needCollection: [], needFullInfo: [] })
    expect(spies.rpc).toHaveBeenCalledWith(
      'rpc_add_or_increment_catalog_listing_v3',
      expect.objectContaining({ p_design_id: 'design-ruby' }),
    )
  })

  it('saves ring size on the physical listing when a ring is added', async () => {
    const { client, spies } = makeAddListingWithCollectionSupabase()

    await addListing(client, 'rep-1', {
      itemNumber: 'RG31452',
      clickwrapAccepted: true,
      collectionName: 'Lustre',
      ringSize: '8',
      idempotencyKey: 'add-2',
      inputSignature: 'sig-2',
    })

    expect(spies.rpc).toHaveBeenCalledWith(
      'rpc_add_or_increment_catalog_listing_v3',
      expect.objectContaining({ p_ring_size: '8' }),
    )
  })

  it('passes a stable mutation identity and does not bump counters on replay', async () => {
    const { client, spies } = makeAddListingWithCollectionSupabase({
      mutationReplayed: true,
    })

    await addListing(client, 'rep-1', {
      itemNumber: 'RG31452',
      clickwrapAccepted: true,
      collectionName: 'Lustre',
      idempotencyKey: 'trade-board-add:workflow-1:single:signature',
      inputSignature: 'signature',
    })

    expect(spies.rpc).toHaveBeenCalledWith(
      'rpc_add_or_increment_catalog_listing_v3',
      expect.objectContaining({
        p_idempotency_key: 'trade-board-add:workflow-1:single:signature',
        p_input_signature: 'signature',
      }),
    )
    expect(spies.timesListedUpdate).not.toHaveBeenCalled()
  })

  it('uses the Birthday collection year when patching a missing design collection', async () => {
    const { client, spies } = makeAddListingWithCollectionSupabase({
      collection: {
        id: 'collection-2026',
        name: 'July Birthday 2026',
        collection_year: 2026,
      },
    })

    await addListing(client, 'rep-1', {
      itemNumber: 'RG31452',
      clickwrapAccepted: true,
      collectionName: 'July Birthday',
      collectionYear: 2026,
      idempotencyKey: 'add-3',
      inputSignature: 'sig-3',
    })

    expect(spies.collectionEq).toHaveBeenCalledWith(
      'name',
      'July Birthday 2026',
    )
    expect(spies.patchUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        collection_id: 'collection-2026',
      }),
    )
  })

  it('returns the grouped dancer when the rep already has the same design on the board', async () => {
    const { client, spies } = makeAddListingWithCollectionSupabase({
      existingListing: { id: 'listing-existing' },
    })

    const result = await addListing(client, 'rep-1', {
      itemNumber: 'RG31452',
      clickwrapAccepted: true,
      collectionName: 'Lustre',
      idempotencyKey: 'add-5',
      inputSignature: 'sig-5',
    })

    expect(spies.rpc).toHaveBeenCalledTimes(1)
    expect(result).toMatchObject({
      listingId: 'listing-1',
      quantityAvailable: 2,
      groupedWithExisting: true,
    })
  })

  it('trusts canonical fallback without reclassifying the catalog photo', async () => {
    const { client, spies } = makeAddListingWithCollectionSupabase({
      canonicalPhotoUrl: 'https://cdn.example.com/card-back.jpg',
    })

    const result = await addListing(client, 'rep-1', {
      itemNumber: 'RG31452',
      clickwrapAccepted: true,
      collectionName: 'Lustre',
      idempotencyKey: 'add-4',
      inputSignature: 'sig-4',
    })

    expect(analyzeServerImageQualityMock).not.toHaveBeenCalled()
    expect(spies.rpc).toHaveBeenCalledTimes(1)
    expect(result).toMatchObject({
      listingId: 'listing-1',
      usesCanonicalPhoto: true,
    })
  })
})
