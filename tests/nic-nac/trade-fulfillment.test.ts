import { describe, it, expect, vi, beforeEach } from 'vitest'
import { errors } from '@/lib/services/errors'

const getFulfillmentQueueMock = vi.fn()
const updateFulfillmentStatusMock = vi.fn()
const writeTradeActionAuditMock = vi.fn()
const logIncidentMock = vi.fn()
const completeTradeWorkflowSessionMock = vi.fn()

vi.mock('@/lib/services/trade-fulfillment', () => ({
  getFulfillmentQueue: (...args: unknown[]) => getFulfillmentQueueMock(...args),
  updateFulfillmentStatus: (...args: unknown[]) =>
    updateFulfillmentStatusMock(...args),
}))

vi.mock('@/lib/nic-nac/audit', () => ({
  writeTradeActionAudit: (...args: unknown[]) =>
    writeTradeActionAuditMock(...args),
}))

vi.mock('@/lib/nic-nac/guardian-telemetry', () => ({
  logIncident: (...args: unknown[]) => logIncidentMock(...args),
  logToolExecution: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ admin: true }),
}))

vi.mock('@/lib/nic-nac/workflows/trade-workflow-store', () => ({
  completeTradeWorkflowSession: (...args: unknown[]) =>
    completeTradeWorkflowSessionMock(...args),
}))

import { makeGetFulfillmentQueueTool } from '@/lib/nic-nac/tools/get-fulfillment-queue'
import { makeUpdateFulfillmentStatusTool } from '@/lib/nic-nac/tools/update-fulfillment-status'
import { buildAllTools } from '@/lib/nic-nac/tools'
import { NIC_NAC_SYSTEM_PROMPT } from '@/lib/nic-nac/system-prompt'

interface ToolDef {
  execute: (input: unknown) => Promise<Record<string, unknown>>
  needsApproval?: boolean
}

function activeFulfillmentWorkflow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'workflow-fulfillment-1',
    repId: 'rep-1',
    conversationId: 'conv-1',
    workflowType: 'trade_fulfillment_update',
    status: 'active',
    phase: 'ready_to_update',
    intent: 'update_fulfillment_status',
    knownFields: {},
    missingFields: [],
    blockers: [],
    candidates: [],
    approvalState: 'not_required',
    ...overrides,
  } as const
}

function makeCtx(
  activeTradeWorkflow: ReturnType<typeof activeFulfillmentWorkflow> | null = null,
) {
  return {
    repId: 'rep-1',
    supabase: {} as never,
    conversationId: 'conv-1',
    runId: 'run-1',
    activeTradeWorkflow,
  }
}

function makeGetTool(): ToolDef {
  return makeGetFulfillmentQueueTool(makeCtx()) as unknown as ToolDef
}

function makeUpdateTool(
  activeTradeWorkflow: ReturnType<typeof activeFulfillmentWorkflow> | null = null,
): ToolDef {
  return makeUpdateFulfillmentStatusTool(
    makeCtx(activeTradeWorkflow),
  ) as unknown as ToolDef
}

beforeEach(() => {
  getFulfillmentQueueMock.mockReset()
  updateFulfillmentStatusMock.mockReset()
  writeTradeActionAuditMock.mockReset()
  logIncidentMock.mockReset()
  completeTradeWorkflowSessionMock.mockReset()
})

describe('get_fulfillment_queue', () => {
  it('returns a flattened queue with status counts and follow-up nudges', async () => {
    getFulfillmentQueueMock.mockResolvedValueOnce([
      {
        fulfillmentId: 'ful-1',
        requestId: 'req-1',
        status: 'approved',
        customerName: 'Alice',
        designName: 'The Celeste Ring',
        itemNumber: 'RG31452',
        statusUpdatedAt: '2026-05-01T10:00:00Z',
        daysSinceLastUpdate: 4,
      },
      {
        fulfillmentId: 'ful-2',
        requestId: 'req-2',
        status: 'shipped',
        customerName: 'Bob',
        designName: 'Orbit Necklace',
        itemNumber: 'NK66139',
        statusUpdatedAt: '2026-04-29T10:00:00Z',
        daysSinceLastUpdate: 6,
      },
      {
        fulfillmentId: 'ful-3',
        requestId: 'req-3',
        status: 'approved',
        customerName: 'Cara',
        designName: 'Nova Studs',
        itemNumber: 'ER12345',
        statusUpdatedAt: '2026-05-04T10:00:00Z',
        daysSinceLastUpdate: 1,
      },
    ])

    const tool = makeGetTool()
    const result = await tool.execute({})

    expect(getFulfillmentQueueMock).toHaveBeenCalledWith(expect.anything(), 'rep-1')
    expect(result).toMatchObject({
      count: 3,
      countsByStatus: { approved: 2, shipped: 1 },
      needsAttentionCount: 2,
    })
    expect(result.queue).toEqual([
      expect.objectContaining({
        fulfillmentId: 'ful-1',
        requestId: 'req-1',
        status: 'approved',
        customerName: 'Alice',
        itemNumber: 'RG31452',
        daysSinceLastUpdate: 4,
        needsAttention: true,
        suggestedNextAction: 'mark_shipped',
      }),
      expect.objectContaining({
        fulfillmentId: 'ful-2',
        requestId: 'req-2',
        status: 'shipped',
        customerName: 'Bob',
        itemNumber: 'NK66139',
        daysSinceLastUpdate: 6,
        needsAttention: true,
        suggestedNextAction: 'mark_completed',
      }),
      expect.objectContaining({
        fulfillmentId: 'ful-3',
        requestId: 'req-3',
        status: 'approved',
        customerName: 'Cara',
        itemNumber: 'ER12345',
        daysSinceLastUpdate: 1,
        needsAttention: false,
        suggestedNextAction: 'mark_shipped',
      }),
    ])
  })

  it('returns an empty queue summary when there are no active fulfillments', async () => {
    getFulfillmentQueueMock.mockResolvedValueOnce([])

    const tool = makeGetTool()
    const result = await tool.execute({})

    expect(result).toEqual({
      count: 0,
      countsByStatus: { approved: 0, shipped: 0 },
      needsAttentionCount: 0,
      queue: [],
    })
  })

  it('translates ServiceError into NicNacToolError', async () => {
    getFulfillmentQueueMock.mockRejectedValueOnce(errors.UNAUTHORIZED('foreign repId'))

    const tool = makeGetTool()
    await expect(tool.execute({})).rejects.toMatchObject({
      name: 'NicNacToolError',
      code: 'UNAUTHORIZED',
    })
  })
})

describe('update_fulfillment_status', () => {
  it('forwards requestId updates, writes an audit row, and returns the transition summary', async () => {
    updateFulfillmentStatusMock.mockResolvedValueOnce({
      fulfillmentId: 'ful-1',
      requestId: 'req-1',
      previousStatus: 'approved',
      status: 'shipped',
      completedAt: null,
      shouldPromptAddToBoard: false,
    })

    const tool = makeUpdateTool()
    const result = await tool.execute({
      requestId: '11111111-1111-4111-8111-111111111111',
      nextStatus: 'shipped',
      shippingNotes: 'USPS 12345',
    })

    expect(updateFulfillmentStatusMock).toHaveBeenCalledWith(
      expect.anything(),
      'rep-1',
      {
        requestId: '11111111-1111-4111-8111-111111111111',
        nextStatus: 'shipped',
        shippingNotes: 'USPS 12345',
      },
    )
    expect(writeTradeActionAuditMock).toHaveBeenCalledTimes(1)
    expect(writeTradeActionAuditMock.mock.calls[0][0]).toMatchObject({
      actionType: 'fulfillment_status_updated',
      repId: 'rep-1',
      targetListingId: null,
      details: {
        runId: 'run-1',
        conversationId: 'conv-1',
        requestId: 'req-1',
      },
    })
    const auditArg = writeTradeActionAuditMock.mock.calls[0][0] as {
      beforeState: Record<string, unknown>
      afterState: Record<string, unknown>
    }
    expect(auditArg.beforeState).toMatchObject({
      fulfillmentId: 'ful-1',
      requestId: 'req-1',
      status: 'approved',
      repId: 'rep-1',
    })
    expect(auditArg.afterState).toMatchObject({
      fulfillmentId: 'ful-1',
      requestId: 'req-1',
      status: 'shipped',
      repId: 'rep-1',
      shippingNotes: 'USPS 12345',
    })
    expect(result).toEqual({
      fulfillmentId: 'ful-1',
      requestId: 'req-1',
      previousStatus: 'approved',
      status: 'shipped',
      completedAt: null,
      shippingNotesApplied: 'USPS 12345',
      shouldPromptAddToBoard: false,
      nextSuggestedTool: null,
    })
  })

  it('supports customerName lookup without requesting a floor-add follow-up', async () => {
    updateFulfillmentStatusMock.mockResolvedValueOnce({
      fulfillmentId: 'ful-2',
      requestId: 'req-2',
      previousStatus: 'shipped',
      status: 'completed',
      completedAt: '2026-05-05T23:00:00Z',
      shouldPromptAddToBoard: false,
    })

    const tool = makeUpdateTool()
    const result = await tool.execute({
      customerName: 'Alice',
      nextStatus: 'completed',
    })

    expect(updateFulfillmentStatusMock).toHaveBeenCalledWith(
      expect.anything(),
      'rep-1',
      {
        customerName: 'Alice',
        nextStatus: 'completed',
      },
    )
    expect(result).toEqual({
      fulfillmentId: 'ful-2',
      requestId: 'req-2',
      previousStatus: 'shipped',
      status: 'completed',
      completedAt: '2026-05-05T23:00:00Z',
      shippingNotesApplied: null,
      shouldPromptAddToBoard: false,
      nextSuggestedTool: null,
    })
  })

  it('drops blank model-supplied shipping notes instead of clearing saved tracking on completion', async () => {
    updateFulfillmentStatusMock.mockResolvedValueOnce({
      fulfillmentId: 'ful-2',
      requestId: 'req-2',
      previousStatus: 'shipped',
      status: 'completed',
      completedAt: '2026-05-05T23:00:00Z',
      shouldPromptAddToBoard: false,
    })

    const tool = makeUpdateTool()
    await tool.execute({
      requestId: '11111111-1111-4111-8111-111111111111',
      nextStatus: 'completed',
      shippingNotes: '',
    })

    expect(updateFulfillmentStatusMock).toHaveBeenCalledWith(
      expect.anything(),
      'rep-1',
      {
        requestId: '11111111-1111-4111-8111-111111111111',
        nextStatus: 'completed',
      },
    )
  })

  it('does not expose addToBoard in the tool description or forward stray input', async () => {
    updateFulfillmentStatusMock.mockResolvedValueOnce({
      fulfillmentId: 'ful-2', requestId: 'req-2', previousStatus: 'approved',
      status: 'completed', completedAt: '2026-09-25T18:00:00Z',
      shouldPromptAddToBoard: false,
    })
    const tool = makeUpdateFulfillmentStatusTool(makeCtx())
    expect(tool.description).not.toContain('addToBoard')
    await tool.execute({
      requestId: '11111111-1111-4111-8111-111111111111',
      nextStatus: 'completed',
      addToBoard: true,
    } as never)
    expect(updateFulfillmentStatusMock).toHaveBeenCalledWith(
      expect.anything(), 'rep-1', {
        requestId: '11111111-1111-4111-8111-111111111111',
        nextStatus: 'completed',
      },
    )
  })

  it('returns the success result even when audit logging fails', async () => {
    updateFulfillmentStatusMock.mockResolvedValueOnce({
      fulfillmentId: 'ful-1',
      requestId: 'req-1',
      previousStatus: 'approved',
      status: 'shipped',
      completedAt: null,
      shouldPromptAddToBoard: false,
    })
    writeTradeActionAuditMock.mockRejectedValueOnce(new Error('audit down'))

    const tool = makeUpdateTool()
    const result = await tool.execute({
      requestId: '11111111-1111-4111-8111-111111111111',
      nextStatus: 'shipped',
    })

    expect(result).toMatchObject({
      fulfillmentId: 'ful-1',
      status: 'shipped',
    })
    expect(logIncidentMock).toHaveBeenCalledTimes(1)
    expect(logIncidentMock.mock.calls[0][0]).toMatchObject({
      errorType: 'audit_write_failed',
      severity: 'warn',
    })
  })

  it('translates invalid transitions into NicNacToolError without auditing', async () => {
    updateFulfillmentStatusMock.mockRejectedValueOnce(
      errors.INVALID_STATUS_TRANSITION('approved', 'completed'),
    )

    const tool = makeUpdateTool()
    await expect(
      tool.execute({
        requestId: '11111111-1111-4111-8111-111111111111',
        nextStatus: 'completed',
      }),
    ).rejects.toMatchObject({
      name: 'NicNacToolError',
      code: 'INVALID_STATUS_TRANSITION',
    })
    expect(writeTradeActionAuditMock).not.toHaveBeenCalled()
  })

  it('does not require HITL approval because status updates are operational follow-through', () => {
    const tool = makeUpdateTool()
    expect(tool.needsApproval).toBeFalsy()
  })

  it('completes an active fulfillment workflow after the status update succeeds', async () => {
    updateFulfillmentStatusMock.mockResolvedValueOnce({
      fulfillmentId: 'ful-1',
      requestId: 'req-1',
      previousStatus: 'approved',
      status: 'shipped',
      completedAt: null,
      changed: true,
      shouldPromptAddToBoard: false,
    })

    const tool = makeUpdateTool(activeFulfillmentWorkflow())
    await tool.execute({
      requestId: '11111111-1111-4111-8111-111111111111',
      nextStatus: 'shipped',
    })

    expect(completeTradeWorkflowSessionMock).toHaveBeenCalledWith(
      { admin: true },
      expect.objectContaining({
        id: 'workflow-fulfillment-1',
        workflowType: 'trade_fulfillment_update',
      }),
      expect.objectContaining({
        knownFields: expect.objectContaining({
          requestId: 'req-1',
          fulfillmentRequestId: 'ful-1',
          nextFulfillmentStatus: 'shipped',
        }),
        dbAssertions: expect.objectContaining({
          fulfillment: expect.objectContaining({
            id: 'ful-1',
            requestId: 'req-1',
            previousStatus: 'approved',
            status: 'shipped',
            changed: true,
          }),
        }),
        publicProof: expect.objectContaining({
          tradeBoardListingVisibilityUnaffected: true,
        }),
        createdMutationIds: expect.arrayContaining([
          { kind: 'fulfillment', id: 'ful-1' },
          { kind: 'trade_request', id: 'req-1' },
        ]),
      }),
    )
  })

  it('rejects fulfillment updates when the model status conflicts with workflow state', async () => {
    const tool = makeUpdateTool(
      activeFulfillmentWorkflow({
        knownFields: {
          requestId: '11111111-1111-4111-8111-111111111111',
          nextFulfillmentStatus: 'shipped',
        },
      }),
    )

    await expect(
      tool.execute({
        requestId: '11111111-1111-4111-8111-111111111111',
        nextStatus: 'completed',
      }),
    ).rejects.toMatchObject({
      name: 'NicNacToolError',
      code: 'WORKFLOW_TARGET_MISMATCH',
    })

    expect(updateFulfillmentStatusMock).not.toHaveBeenCalled()
    expect(writeTradeActionAuditMock).not.toHaveBeenCalled()
  })

  it('uses the workflow-selected request id instead of a loose customer-name target', async () => {
    updateFulfillmentStatusMock.mockResolvedValueOnce({
      fulfillmentId: 'ful-1',
      requestId: 'req-1',
      previousStatus: 'approved',
      status: 'shipped',
      completedAt: null,
      changed: true,
      shouldPromptAddToBoard: false,
    })

    const tool = makeUpdateTool(
      activeFulfillmentWorkflow({
        knownFields: {
          requestId: '11111111-1111-4111-8111-111111111111',
          nextFulfillmentStatus: 'shipped',
        },
      }),
    )
    await tool.execute({
      customerName: 'Jamie',
      nextStatus: 'shipped',
    })

    expect(updateFulfillmentStatusMock).toHaveBeenCalledWith(
      expect.anything(),
      'rep-1',
      {
        requestId: '11111111-1111-4111-8111-111111111111',
        nextStatus: 'shipped',
      },
    )
  })
})

describe('fulfillment registry and prompt wiring', () => {
  it('buildAllTools exposes the two fulfillment tools', () => {
    const tools = buildAllTools(makeCtx())
    const names = Object.keys(tools).sort()

    expect(new Set(names).size).toBe(names.length)
    expect(names).toEqual(
      expect.arrayContaining([
        'get_fulfillment_queue',
        'update_fulfillment_status',
      ]),
    )
  })

  it('system prompt documents the fulfillment queue tools and follow-up flow', () => {
    expect(NIC_NAC_SYSTEM_PROMPT).toContain(
      "You have a scoped set of workspace tools available when the rep's request calls for them:",
    )
    expect(NIC_NAC_SYSTEM_PROMPT).toContain('get_fulfillment_queue')
    expect(NIC_NAC_SYSTEM_PROMPT).toContain('update_fulfillment_status')
    expect(NIC_NAC_SYSTEM_PROMPT).toContain('Approved or shipped can move directly to completed')
    expect(NIC_NAC_SYSTEM_PROMPT).toContain('completed can return to approved')
    expect(NIC_NAC_SYSTEM_PROMPT).toContain('Fulfillment completion does not add a dancer')
  })
})
