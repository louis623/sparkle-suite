import { beforeEach, describe, expect, it, vi } from 'vitest'
import { errors } from '@/lib/services/errors'

const removeListingMock = vi.fn()
const writeTradeActionAuditMock = vi.fn()
const logIncidentMock = vi.fn()

vi.mock('@/lib/services/trade-board', () => ({
  removeListing: (...args: unknown[]) => removeListingMock(...args),
  TradeBoardError: class TradeBoardError extends Error {
    readonly code: string
    constructor(code: string, message: string) {
      super(message)
      this.name = 'TradeBoardError'
      this.code = code
    }
  },
}))

vi.mock('@/lib/nic-nac/audit', () => ({
  writeTradeActionAudit: (...args: unknown[]) =>
    writeTradeActionAuditMock(...args),
}))

vi.mock('@/lib/nic-nac/guardian-telemetry', () => ({
  logIncident: (...args: unknown[]) => logIncidentMock(...args),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({}),
}))

vi.mock('@/lib/nic-nac/workflows/trade-workflow-store', () => ({
  completeTradeWorkflowSession: vi.fn(async () => undefined),
}))

import { makeRemoveListingTool } from '@/lib/nic-nac/tools/remove-listing'

interface ToolDef {
  execute: (input: unknown) => Promise<Record<string, unknown>>
  needsApproval?: boolean
}

function activeRemoveWorkflow() {
  return {
    id: 'workflow-remove-1',
    repId: 'rep-1',
    conversationId: 'conv-1',
    workflowType: 'trade_board_remove_listing',
    status: 'active',
    phase: 'ready_to_remove',
    intent: 'remove_listing',
    knownFields: {
      listingId: '11111111-1111-4111-8111-111111111111',
      itemNumber: 'ER13229',
    },
    missingFields: [],
    blockers: [],
    candidates: [],
    approvalState: 'not_required',
  } as const
}

function makeTool(
  activeTradeWorkflow: ReturnType<typeof activeRemoveWorkflow> | null = null,
): ToolDef {
  return makeRemoveListingTool({
    repId: 'rep-1',
    supabase: {} as never,
    conversationId: 'conv-1',
    runId: 'run-1',
    activeTradeWorkflow,
  }) as unknown as ToolDef
}

beforeEach(() => {
  removeListingMock.mockReset()
  writeTradeActionAuditMock.mockReset()
  logIncidentMock.mockReset()
})

describe('remove_listing tool', () => {
  it('requires HITL approval', () => {
    expect(makeTool().needsApproval).toBe(true)
  })

  it('translates ambiguous item-number removal into an exact-listing prompt', async () => {
    removeListingMock.mockRejectedValueOnce(errors.AMBIGUOUS_LISTING('ER13229'))

    await expect(
      makeTool().execute({
        itemNumber: 'ER13229',
        reason: 'mistake',
      }),
    ).rejects.toMatchObject({
      name: 'NicNacToolError',
      code: 'AMBIGUOUS_LISTING',
      userMessage:
        'I found more than one active physical piece for that item. Pick the exact listing before I remove anything.',
    })

    expect(writeTradeActionAuditMock).not.toHaveBeenCalled()
  })

  it('rejects a model-supplied listing id that does not match the active workflow target', async () => {
    await expect(
      makeTool(activeRemoveWorkflow()).execute({
        listingId: '22222222-2222-4222-8222-222222222222',
        itemNumber: 'ER13229',
        reason: 'mistake',
      }),
    ).rejects.toMatchObject({
      name: 'NicNacToolError',
      code: 'WORKFLOW_TARGET_MISMATCH',
    })

    expect(removeListingMock).not.toHaveBeenCalled()
    expect(writeTradeActionAuditMock).not.toHaveBeenCalled()
  })

  it('stores a swapped removal using the existing sold reason', async () => {
    removeListingMock.mockResolvedValueOnce({
      listingId: '11111111-1111-4111-8111-111111111111',
      designName: 'Earrings',
      previousStatus: 'available',
      cancelledRequestId: null,
    })
    const workflow = activeRemoveWorkflow()

    await makeTool({
      ...workflow,
      knownFields: {
        ...workflow.knownFields,
        removalReason: 'sold',
      },
    }).execute({
      listingId: '11111111-1111-4111-8111-111111111111',
      itemNumber: 'ER13229',
      reason: 'swapped',
    })

    expect(removeListingMock).toHaveBeenCalledWith(
      expect.anything(),
      'rep-1',
      expect.objectContaining({ reason: 'sold' }),
    )
  })
})
