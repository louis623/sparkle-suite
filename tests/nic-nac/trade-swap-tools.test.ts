import { beforeEach, describe, expect, it, vi } from 'vitest'
import { errors } from '@/lib/services/errors'

const approveTradeFromReviewMock = vi.fn()
const rejectTradeMock = vi.fn()
const getTradeSwapCleanupQueueMock = vi.fn()
const writeTradeActionAuditMock = vi.fn()
const logIncidentMock = vi.fn()
const completeTradeWorkflowSessionMock = vi.fn()

vi.mock('@/lib/services/trade-requests', () => ({ rejectTrade: (...args: unknown[]) => rejectTradeMock(...args) }))

vi.mock('@/lib/services/trade-swaps', () => ({
  approveTradeFromReview: (...args: unknown[]) =>
    approveTradeFromReviewMock(...args),
  getTradeSwapCleanupQueue: (...args: unknown[]) =>
    getTradeSwapCleanupQueueMock(...args),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ admin: true }),
}))

vi.mock('@/lib/nic-nac/audit', () => ({
  writeTradeActionAudit: (...args: unknown[]) =>
    writeTradeActionAuditMock(...args),
}))

vi.mock('@/lib/nic-nac/guardian-telemetry', () => ({
  logIncident: (...args: unknown[]) => logIncidentMock(...args),
}))

vi.mock('@/lib/nic-nac/workflows/trade-workflow-store', () => ({
  completeTradeWorkflowSession: (...args: unknown[]) =>
    completeTradeWorkflowSessionMock(...args),
}))

import { makeRejectTradeTool } from '@/lib/nic-nac/tools/reject-trade'
import { makeApproveTradeSwapTool } from '@/lib/nic-nac/tools/approve-trade-swap'
import { makeGetTradeSwapCleanupTool } from '@/lib/nic-nac/tools/get-trade-swap-cleanup'

interface ToolDef {
  execute: (input: unknown) => Promise<Record<string, unknown>>
  needsApproval?: boolean
  description?: string
}

function activeSwapWorkflow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'workflow-swap-1',
    repId: 'rep-1',
    conversationId: 'conv-1',
    workflowType: 'trade_swap_capture',
    status: 'active',
    phase: 'ready_to_approve',
    intent: 'approve_trade_swap',
    knownFields: {},
    missingFields: [],
    blockers: [],
    candidates: [],
    approvalState: 'required',
    ...overrides,
  } as const
}

function makeApproveTool(
  activeTradeWorkflow: ReturnType<typeof activeSwapWorkflow> | null = null,
): ToolDef {
  return makeApproveTradeSwapTool({
    repId: 'rep-1',
    supabase: {} as never,
    conversationId: 'conv-1',
    runId: 'run-1',
    activeTradeWorkflow,
  }) as unknown as ToolDef
}

function makeCleanupTool(): ToolDef {
  return makeGetTradeSwapCleanupTool({
    repId: 'rep-1',
    supabase: {} as never,
  }) as unknown as ToolDef
}

beforeEach(() => {
  rejectTradeMock.mockReset()
  approveTradeFromReviewMock.mockReset()
  getTradeSwapCleanupQueueMock.mockReset()
  writeTradeActionAuditMock.mockReset()
  logIncidentMock.mockReset()
  completeTradeWorkflowSessionMock.mockReset()
})

describe('approve_trade_swap', () => {
  it('captures the revealed item number while approving the trade', async () => {
    approveTradeFromReviewMock.mockResolvedValueOnce({
      kind: 'captured',
      swapId: 'swap-1',
      requestId: 'req-1',
      fulfillmentId: 'ful-1',
      outgoingListingId: 'outgoing-listing-1',
      customerName: 'Jamie',
      revealedItemNumber: 'NK12345',
      revealedDesignId: 'design-1',
      replacementListingId: 'replacement-listing-1',
      replacementStatus: 'added_to_board',
    })

    const tool = makeApproveTool()
    const result = await tool.execute({
      requestId: '11111111-1111-1111-1111-111111111111',
      revealedItemNumber: ' nk12345 ',
      repNotes: 'approved live',
      verifiedOfferedFamily: 'Birthday',
      verifiedOfferedType: 'NK',
      verificationConfirmed: true,
      finalConfirmation: true,
    })

    expect(approveTradeFromReviewMock).toHaveBeenCalledWith(
      { admin: true },
      'rep-1',
      {
        requestId: '11111111-1111-1111-1111-111111111111',
        revealedItemNumber: ' nk12345 ',
        revealedMaterial: undefined,
        revealedRingSize: undefined,
        repNotes: 'approved live',
      },
    )
    expect(writeTradeActionAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'trade_swap_approved',
        repId: 'rep-1',
        targetListingId: 'outgoing-listing-1',
        details: expect.objectContaining({
          runId: 'run-1',
          conversationId: 'conv-1',
          replacementStatus: 'added_to_board',
        }),
      }),
    )
    expect(result).toMatchObject({
      swapId: 'swap-1',
      requestId: 'req-1',
      fulfillmentId: 'ful-1',
      outgoingListingId: 'outgoing-listing-1',
      revealedItemNumber: 'NK12345',
      replacementStatus: 'added_to_board',
    })
  })

  it('completes an active swap workflow with the trade_swaps row proof', async () => {
    approveTradeFromReviewMock.mockResolvedValueOnce({
      kind: 'captured',
      swapId: 'swap-1',
      requestId: 'req-1',
      fulfillmentId: 'ful-1',
      outgoingListingId: 'outgoing-listing-1',
      customerName: 'Jamie',
      revealedItemNumber: 'NK12345',
      revealedDesignId: 'design-1',
      replacementListingId: 'replacement-listing-1',
      replacementStatus: 'added_to_board',
    })

    const tool = makeApproveTool(activeSwapWorkflow())
    await tool.execute({
      requestId: '11111111-1111-1111-1111-111111111111',
      revealedItemNumber: 'NK12345',
    })

    expect(completeTradeWorkflowSessionMock).toHaveBeenCalledWith(
      { admin: true },
      expect.objectContaining({
        id: 'workflow-swap-1',
        workflowType: 'trade_swap_capture',
      }),
      expect.objectContaining({
        knownFields: expect.objectContaining({
          requestId: 'req-1',
          swapId: 'swap-1',
          revealedItemNumber: 'NK12345',
        }),
        dbAssertions: expect.objectContaining({
          tradeSwap: {
            id: 'swap-1',
            requestId: 'req-1',
            replacementStatus: 'added_to_board',
          },
        }),
        createdMutationIds: expect.arrayContaining([
          { kind: 'trade_swap', id: 'swap-1' },
          { kind: 'trade_request', id: 'req-1' },
          { kind: 'listing', id: 'outgoing-listing-1' },
          { kind: 'fulfillment', id: 'ful-1' },
          { kind: 'listing', id: 'replacement-listing-1' },
        ]),
      }),
    )
  })

  it('includes the exact live-show prompt wording in the tool description', () => {
    const tool = makeApproveTool()

    expect(tool.description).toContain(
      'Which item number was just revealed for the customer?',
    )
    expect(tool.needsApproval).toBe(true)
  })

  it('translates ServiceError into NicNacToolError without auditing', async () => {
    approveTradeFromReviewMock.mockRejectedValueOnce(
      errors.REQUEST_NOT_PENDING(),
    )

    const tool = makeApproveTool()

    await expect(
      tool.execute({
        requestId: '11111111-1111-1111-1111-111111111111',
        revealedItemNumber: 'NK12345',
      }),
    ).rejects.toMatchObject({
      name: 'NicNacToolError',
      code: 'REQUEST_NOT_PENDING',
    })
    expect(writeTradeActionAuditMock).not.toHaveBeenCalled()
  })

  it('rejects live swap approval when the revealed item number conflicts with workflow state', async () => {
    const tool = makeApproveTool(
      activeSwapWorkflow({
        knownFields: {
          requestId: '11111111-1111-4111-8111-111111111111',
          revealedItemNumber: 'NK12345',
        },
      }),
    )

    await expect(
      tool.execute({
        requestId: '11111111-1111-4111-8111-111111111111',
        revealedItemNumber: 'ER99999',
      }),
    ).rejects.toMatchObject({
      name: 'NicNacToolError',
      code: 'WORKFLOW_TARGET_MISMATCH',
    })

    expect(approveTradeFromReviewMock).not.toHaveBeenCalled()
    expect(writeTradeActionAuditMock).not.toHaveBeenCalled()
  })
})

describe('get_trade_swap_cleanup', () => {
  it('returns unresolved swap cleanup items for the rep', async () => {
    getTradeSwapCleanupQueueMock.mockResolvedValueOnce([
      {
        swapId: 'swap-1',
        requestId: 'req-1',
        customerName: 'Jamie',
        outgoingListingId: 'listing-1',
        revealedItemNumber: 'ER00001',
        revealedRingSize: null,
        replacementStatus: 'needs_catalog_details',
        createdAt: '2026-06-11T20:00:00.000Z',
      },
    ])

    const tool = makeCleanupTool()
    const result = await tool.execute({})

    expect(getTradeSwapCleanupQueueMock).toHaveBeenCalledWith(
      {},
      'rep-1',
    )
    expect(result).toEqual({
      count: 1,
      items: [
        expect.objectContaining({
          swapId: 'swap-1',
          customerName: 'Jamie',
          revealedItemNumber: 'ER00001',
          replacementStatus: 'needs_catalog_details',
        }),
      ],
    })
  })

  it('translates ServiceError into NicNacToolError', async () => {
    getTradeSwapCleanupQueueMock.mockRejectedValueOnce(
      errors.UNAUTHORIZED('foreign repId'),
    )

    const tool = makeCleanupTool()

    await expect(tool.execute({})).rejects.toMatchObject({
      name: 'NicNacToolError',
      code: 'UNAUTHORIZED',
    })
  })
})

it('noted-only completes with request proof and no invented swap or listing fields',async()=>{
 approveTradeFromReviewMock.mockResolvedValueOnce({kind:'noted_only',requestId:'req-1',fulfillmentId:'ful-1',listingId:'outgoing-listing-1',customerName:'Jamie',quantityAvailable:0,revealedItemNumber:'UNKNOWN'})
 const result=await makeApproveTool(activeSwapWorkflow()).execute({requestId:'req-1',revealedItemNumber:'UNKNOWN',revealedMaterial:'ignored',revealedRingSize:'ignored'})
 expect(result).toMatchObject({kind:'noted_only',requestId:'req-1'})
 expect(result).not.toHaveProperty('swapId');expect(result).not.toHaveProperty('replacementListingId');expect(result).not.toHaveProperty('replacementStatus')
 expect(JSON.stringify(completeTradeWorkflowSessionMock.mock.calls)).not.toContain('"trade_swap"')
 expect(JSON.stringify(completeTradeWorkflowSessionMock.mock.calls)).toContain('req-1')
})


it('reject with customerMessage forces reason other and audits the effective reason', async () => {
  rejectTradeMock.mockResolvedValue({ requestId: 'request-1', listingId: 'listing-1', listingRestored: true })
  const reject = makeRejectTradeTool({ repId: 'rep-1', supabase: {} as never, conversationId: 'conv-1', runId: 'run-1' }) as unknown as ToolDef
  await reject.execute({ requestId: 'request-1', reason: 'item_unavailable', customerMessage: 'Please check with me next show.', repNotes: 'private' })
  expect(rejectTradeMock).toHaveBeenCalledWith({ admin: true }, 'rep-1', 'request-1', 'other', 'private', 'Please check with me next show.')
  expect(writeTradeActionAuditMock).toHaveBeenCalledWith(expect.objectContaining({ afterState: expect.objectContaining({ rejectionReason: 'other' }) }))
  rejectTradeMock.mockClear()
  await expect(reject.execute({ requestId: 'request-1', reason: 'other', repNotes: '😀'.repeat(1001) })).rejects.toMatchObject({ code: 'INVALID_INPUT' })
  expect(rejectTradeMock).not.toHaveBeenCalled()
})
