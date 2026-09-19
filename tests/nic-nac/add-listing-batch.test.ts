import { beforeEach, describe, expect, it, vi } from 'vitest'

const addListingMock = vi.fn()
const addListingBatchMock = vi.fn()
const resolveItemNumberMock = vi.fn()
const writeTradeActionAuditMock = vi.fn()
const logIncidentMock = vi.fn()
const createAdminClientMock = vi.fn(() => ({}))

vi.mock('@/lib/services/trade-board', () => ({
  addListing: (...args: unknown[]) => addListingMock(...args),
  addListingBatch: (...args: unknown[]) => addListingBatchMock(...args),
}))

vi.mock('@/lib/services/jewelry-database', () => ({
  createDesign: vi.fn(),
  resolveItemNumber: (...args: unknown[]) => resolveItemNumberMock(...args),
  updateCanonicalPhoto: vi.fn(),
  updatePhotoPipelineState: vi.fn(),
  normalizeJewelryMaterialKey: (value: string | null | undefined) =>
    value?.trim().replace(/\s+/g, ' ').toLowerCase() || null,
  normalizeJewelryMainStoneKey: (value: string | null | undefined) =>
    value?.trim().replace(/\s+/g, ' ').toLowerCase() || null,
}))

vi.mock('@/lib/services/storage', () => ({
  uploadJewelryPhoto: vi.fn(),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => createAdminClientMock(),
}))

vi.mock('@/lib/nic-nac/audit', () => ({
  writeTradeActionAudit: (...args: unknown[]) =>
    writeTradeActionAuditMock(...args),
}))

vi.mock('@/lib/nic-nac/guardian-telemetry', () => ({
  logIncident: (...args: unknown[]) => logIncidentMock(...args),
}))

import { makeAddListingTool } from '@/lib/nic-nac/tools/add-listing'

interface ToolDef {
  execute: (input: unknown) => Promise<Record<string, unknown>>
}

function makeConversationSupabase(messages = [
  {
    role: 'user',
    parts: [{ type: 'text', text: 'Add ER76003 to my board' }],
  },
]) {
  const latestUser = messages.find((message) => message.role === 'user')

  const maybeSingle = vi.fn().mockResolvedValue({
    data: latestUser ? { parts: latestUser.parts } : null,
    error: null,
  })
  const userLimit = vi.fn(() => ({ maybeSingle }))
  const userOrderById = vi.fn(() => ({ limit: userLimit }))
  const userOrderByCreatedAt = vi.fn(() => ({ order: userOrderById }))
  const userStatusEq = vi.fn(() => ({ order: userOrderByCreatedAt }))
  const userRoleEq = vi.fn(() => ({ eq: userStatusEq }))
  const userConversationEq = vi.fn(() => ({ eq: userRoleEq }))

  const recentLimit = vi.fn().mockResolvedValue({ data: messages, error: null })
  const recentOrderById = vi.fn(() => ({ limit: recentLimit }))
  const recentOrderByCreatedAt = vi.fn(() => ({ order: recentOrderById }))
  const recentRoleIn = vi.fn(() => ({ order: recentOrderByCreatedAt }))
  const recentStatusEq = vi.fn(() => ({ in: recentRoleIn }))
  const recentConversationEq = vi.fn(() => ({ eq: recentStatusEq }))

  const select = vi.fn((columns: string) => {
    if (columns === 'role,parts') {
      return { eq: recentConversationEq }
    }
    return { eq: userConversationEq }
  })

  return {
    from: vi.fn((table: string) => {
      if (table !== 'nic_nac_conversations') {
        throw new Error(`unexpected table ${table}`)
      }
      return { select }
    }),
  }
}

function makeAdminWithExistingListing(existingListing: boolean) {
  const duplicateLimit = vi.fn().mockResolvedValue({
    data: existingListing ? [{ id: 'listing-existing' }] : [],
    error: null,
  })
  const duplicateNeq = vi.fn(() => ({ limit: duplicateLimit }))
  const duplicateDesignEq = vi.fn(() => ({ neq: duplicateNeq }))
  const duplicateRepEq = vi.fn(() => ({ eq: duplicateDesignEq }))
  const duplicateSelect = vi.fn(() => ({ eq: duplicateRepEq }))

  return {
    from: vi.fn((table: string) => {
      if (table !== 'trade_listings') {
        throw new Error(`unexpected table ${table}`)
      }
      return { select: duplicateSelect }
    }),
  }
}

function makeTool(messages?: Parameters<typeof makeConversationSupabase>[0]): ToolDef {
  return makeAddListingTool({
    repId: 'rep-1',
    supabase: makeConversationSupabase(messages) as never,
    conversationId: 'conv-1',
    runId: 'run-1',
  }) as unknown as ToolDef
}

beforeEach(() => {
  addListingMock.mockReset()
  addListingBatchMock.mockReset()
  resolveItemNumberMock.mockReset()
  createAdminClientMock.mockReset()
  createAdminClientMock.mockReturnValue({})
  writeTradeActionAuditMock.mockReset()
  logIncidentMock.mockReset()
})

describe('add_listing — batch mode', () => {
  it('calls addListingBatch and returns ready/need-collection/need-full-info buckets', async () => {
    addListingBatchMock.mockResolvedValueOnce({
      added: [
        {
          listingId: 'listing-1',
          designId: 'design-1',
          itemNumber: 'RG31452',
          designName: 'Celeste Ring',
          status: 'available',
          usesCanonicalPhoto: true,
        },
      ],
      pending: {
        needCollection: [
          {
            itemNumber: 'NK66139',
            designId: 'design-2',
            designName: 'Orbit Necklace',
          },
        ],
        needFullInfo: [{ itemNumber: 'ER99999' }],
      },
    })

    const tool = makeTool()
    const result = await tool.execute({
      mode: 'batch',
      clickwrapAccepted: true,
      items: [
        { itemNumber: 'RG31452' },
        { itemNumber: 'NK66139' },
        { itemNumber: 'ER99999' },
      ],
    })

    expect(addListingBatchMock).toHaveBeenCalledTimes(1)
    expect(addListingBatchMock.mock.calls[0][1]).toBe('rep-1')
    expect(addListingBatchMock.mock.calls[0][2]).toMatchObject({
      items: [
        {
          itemNumber: 'RG31452',
          idempotencyKey: expect.any(String),
          inputSignature: expect.any(String),
        },
        {
          itemNumber: 'NK66139',
          idempotencyKey: expect.any(String),
          inputSignature: expect.any(String),
        },
        {
          itemNumber: 'ER99999',
          idempotencyKey: expect.any(String),
          inputSignature: expect.any(String),
        },
      ],
    })

    expect(result).toMatchObject({
      mode: 'batch',
      added: [
        {
          listingId: 'listing-1',
          itemNumber: 'RG31452',
          designName: 'Celeste Ring',
          status: 'available',
        },
      ],
      pending: {
        needCollection: [
          {
            itemNumber: 'NK66139',
            designId: 'design-2',
            designName: 'Orbit Necklace',
          },
        ],
        needFullInfo: [
          {
            itemNumber: 'ER99999',
          },
        ],
      },
      summary: {
        addedCount: 1,
        needCollectionCount: 1,
        needFullInfoCount: 1,
      },
    })
  })

  it('forwards ring size to the trade listing service for ring entries', async () => {
    resolveItemNumberMock.mockResolvedValueOnce({ found: false, itemNumber: 'RG31452' })
    addListingMock.mockResolvedValueOnce({
      listingId: 'listing-1',
      designId: 'design-1',
      itemNumber: 'RG31452',
      designName: 'Celeste Ring',
      status: 'available',
      usesCanonicalPhoto: true,
    })

    const tool = makeTool()
    await tool.execute({
      mode: 'single',
      itemNumber: 'RG31452',
      collectionName: 'Lustre',
      ringSize: '8',
    })

    expect(addListingMock).toHaveBeenCalledWith(
      expect.anything(),
      'rep-1',
      expect.objectContaining({
        itemNumber: 'RG31452',
        collectionName: 'Lustre',
        ringSize: '8',
      }),
    )
  })

  it('writes one audit row per successfully added listing in batch mode', async () => {
    addListingBatchMock.mockResolvedValueOnce({
      added: [
        {
          listingId: 'listing-1',
          designId: 'design-1',
          itemNumber: 'RG31452',
          designName: 'Celeste Ring',
          status: 'available',
          usesCanonicalPhoto: true,
        },
        {
          listingId: 'listing-2',
          designId: 'design-2',
          itemNumber: 'NK66139',
          designName: 'Orbit Necklace',
          status: 'available',
          usesCanonicalPhoto: false,
        },
      ],
      pending: {
        needCollection: [],
        needFullInfo: [],
      },
    })

    const tool = makeTool()
    await tool.execute({
      mode: 'batch',
      clickwrapAccepted: true,
      items: [{ itemNumber: 'RG31452' }, { itemNumber: 'NK66139' }],
    })

    expect(writeTradeActionAuditMock).toHaveBeenCalledTimes(2)
    expect(writeTradeActionAuditMock.mock.calls[0][0]).toMatchObject({
      actionType: 'add_listing',
      repId: 'rep-1',
      targetListingId: 'listing-1',
    })
    expect(writeTradeActionAuditMock.mock.calls[1][0]).toMatchObject({
      actionType: 'add_listing',
      repId: 'rep-1',
      targetListingId: 'listing-2',
    })
  })

  it('asks for second-physical-piece confirmation before adding an item already on the board', async () => {
    createAdminClientMock.mockReturnValueOnce(
      makeAdminWithExistingListing(true),
    )
    resolveItemNumberMock.mockResolvedValueOnce({
      found: true,
      design: {
        id: 'design-1',
        itemNumber: 'ER76003',
        designName: 'The Elodie Luxe',
      },
      hasCollection: true,
    })
    addListingMock.mockResolvedValueOnce({
      listingId: 'listing-2',
      designId: 'design-1',
      itemNumber: 'ER76003',
      designName: 'The Elodie Luxe',
      status: 'available',
      usesCanonicalPhoto: true,
    })

    const tool = makeTool()

    await expect(
      tool.execute({
        mode: 'single',
        itemNumber: 'ER76003',
      }),
    ).rejects.toMatchObject({
      code: 'DUPLICATE_PHYSICAL_CONFIRMATION_REQUIRED',
      userMessage:
        'That item number is already on your Dance Floor. Are we adding a second physical piece of that same design?',
    })
    expect(addListingMock).not.toHaveBeenCalled()
  })

  it('adds another copy after the rep confirms the already-listed item is another physical piece', async () => {
    createAdminClientMock.mockReturnValueOnce(
      makeAdminWithExistingListing(true),
    )
    resolveItemNumberMock.mockResolvedValueOnce({
      found: true,
      design: {
        id: 'design-1',
        itemNumber: 'ER76003',
        designName: 'The Elodie Luxe',
      },
      hasCollection: true,
    })
    addListingMock.mockResolvedValueOnce({
      listingId: 'listing-2',
      designId: 'design-1',
      itemNumber: 'ER76003',
      designName: 'The Elodie Luxe',
      status: 'available',
      usesCanonicalPhoto: true,
    })

    const tool = makeTool([
      {
        role: 'user',
        parts: [{ type: 'text', text: 'Yes.' }],
      },
      {
        role: 'assistant',
        parts: [
          {
            type: 'text',
            text: 'That item number is already on your Dance Floor. Are we adding another physical piece of the same design?',
          },
        ],
      },
    ])

    const result = await tool.execute({
      mode: 'single',
      itemNumber: 'ER76003',
    })

    expect(addListingMock).toHaveBeenCalledTimes(1)
    expect(result).toMatchObject({
      mode: 'single',
      listingId: 'listing-2',
      itemNumber: 'ER76003',
    })
  })

  it('accepts a plain yes after the natural second-physical-piece confirmation', async () => {
    createAdminClientMock.mockReturnValueOnce(
      makeAdminWithExistingListing(true),
    )
    resolveItemNumberMock.mockResolvedValueOnce({
      found: true,
      design: {
        id: 'design-1',
        itemNumber: 'ER76003',
        designName: 'The Elodie Luxe',
      },
      hasCollection: true,
    })
    addListingMock.mockResolvedValueOnce({
      listingId: 'listing-2',
      designId: 'design-1',
      itemNumber: 'ER76003',
      designName: 'The Elodie Luxe',
      status: 'available',
      usesCanonicalPhoto: true,
    })

    const tool = makeTool([
      {
        role: 'user',
        parts: [{ type: 'text', text: 'Yes.' }],
      },
      {
        role: 'assistant',
        parts: [
          {
            type: 'text',
            text: 'That item number is already on your Dance Floor. Are we adding a second physical piece of that same design?',
          },
        ],
      },
    ])

    const result = await tool.execute({
      mode: 'single',
      itemNumber: 'ER76003',
    })

    expect(addListingMock).toHaveBeenCalledTimes(1)
    expect(result).toMatchObject({
      mode: 'single',
      listingId: 'listing-2',
      itemNumber: 'ER76003',
    })
  })

  it('collapses repeated same-item batches when the latest rep message has no quantity', async () => {
    addListingMock.mockResolvedValueOnce({
      listingId: 'listing-1',
      designId: 'design-1',
      itemNumber: 'ER76003',
      designName: 'The Elodie Luxe',
      status: 'available',
      usesCanonicalPhoto: true,
    })

    const tool = makeTool()
    const result = await tool.execute({
      mode: 'batch',
      items: [{ itemNumber: 'ER76003' }, { itemNumber: 'ER76003' }],
    })

    expect(addListingMock).toHaveBeenCalledTimes(1)
    expect(addListingBatchMock).not.toHaveBeenCalled()
    expect(addListingMock.mock.calls[0][2]).toMatchObject({
      itemNumber: 'ER76003',
    })
    expect(result).toMatchObject({
      mode: 'single',
      listingId: 'listing-1',
      itemNumber: 'ER76003',
    })
  })
})
