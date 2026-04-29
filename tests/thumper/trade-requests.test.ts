// Unit tests for the three Thumper trade-request tool handlers:
//   - get_trade_requests (read-only flatten)
//   - approve_trade     (write + audit, needsApproval)
//   - reject_trade      (write + audit, no needsApproval)
//
// All external collaborators are mocked — no network, no Supabase. The tests
// invoke the real tools' execute() functions so error translation (ServiceError
// → ThumperToolError), audit composition, and audit-isolation behaviour are
// exercised end-to-end. Mock paths exactly match what the production tools
// import (verified against the imports in lib/thumper/tools/{approve,reject}-trade.ts
// and the existing test pattern in tests/thumper/add-listing-recovery.test.ts).

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { errors } from '@/lib/services/errors'

const getTradeRequestsMock = vi.fn()
const approveTradeMock = vi.fn()
const rejectTradeMock = vi.fn()
const writeTradeActionAuditMock = vi.fn()
const logIncidentMock = vi.fn()

vi.mock('@/lib/services/trade-requests', () => ({
  getTradeRequests: (...args: unknown[]) => getTradeRequestsMock(...args),
  approveTrade: (...args: unknown[]) => approveTradeMock(...args),
  rejectTrade: (...args: unknown[]) => rejectTradeMock(...args),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({}),
}))

vi.mock('@/lib/thumper/audit', () => ({
  writeTradeActionAudit: (...args: unknown[]) =>
    writeTradeActionAuditMock(...args),
}))

vi.mock('@/lib/thumper/guardian-telemetry', () => ({
  logIncident: (...args: unknown[]) => logIncidentMock(...args),
}))

import { makeGetTradeRequestsTool } from '@/lib/thumper/tools/get-trade-requests'
import { makeApproveTradeTool } from '@/lib/thumper/tools/approve-trade'
import { makeRejectTradeTool } from '@/lib/thumper/tools/reject-trade'

interface ToolDef {
  execute: (input: unknown) => Promise<Record<string, unknown>>
  needsApproval?: boolean
}

function makeGetTool(): ToolDef {
  return makeGetTradeRequestsTool({
    repId: 'rep-1',
    supabase: {} as never,
  }) as unknown as ToolDef
}

function makeApproveTool(): ToolDef {
  return makeApproveTradeTool({
    repId: 'rep-1',
    supabase: {} as never,
    conversationId: 'conv-1',
    runId: 'run-1',
  }) as unknown as ToolDef
}

function makeRejectTool(): ToolDef {
  return makeRejectTradeTool({
    repId: 'rep-1',
    supabase: {} as never,
    conversationId: 'conv-1',
    runId: 'run-1',
  }) as unknown as ToolDef
}

beforeEach(() => {
  getTradeRequestsMock.mockReset()
  approveTradeMock.mockReset()
  rejectTradeMock.mockReset()
  writeTradeActionAuditMock.mockReset()
  logIncidentMock.mockReset()
})

describe('get_trade_requests — flattened structured output', () => {
  it('returns count + flattened request shape with photoUrl prefer logic (canonical)', async () => {
    getTradeRequestsMock.mockResolvedValueOnce([
      {
        id: 'req-1',
        status: 'pending',
        customerName: 'Alice',
        customerDescription: 'Trading a Galaxy ring',
        rejectionReason: null,
        repNotes: null,
        createdAt: '2026-04-28T10:00:00Z',
        updatedAt: '2026-04-28T10:00:00Z',
        listing: {
          id: 'listing-1',
          repId: 'rep-1',
          listingPhotoUrl: 'https://rep/listing.jpg',
          usesCanonicalPhoto: true,
          design: {
            id: 'design-1',
            itemNumber: 'RG31452',
            designName: 'The Celeste Ring',
            material: 'Rhodium',
            mainStone: 'Lab Emerald',
            bpMsrp: 128,
            canonicalPhotoUrl: 'https://canonical/photo.jpg',
            typePrefix: 'RG',
          },
        },
      },
    ])

    const tool = makeGetTool()
    const result = await tool.execute({ statusFilter: 'pending' })

    expect(getTradeRequestsMock).toHaveBeenCalledTimes(1)
    expect(getTradeRequestsMock.mock.calls[0][1]).toBe('rep-1')
    expect(getTradeRequestsMock.mock.calls[0][2]).toMatchObject({
      statusFilter: 'pending',
    })
    expect(result.count).toBe(1)
    const requests = result.requests as Array<Record<string, unknown>>
    expect(requests[0]).toMatchObject({
      requestId: 'req-1',
      status: 'pending',
      customerName: 'Alice',
      customerDescription: 'Trading a Galaxy ring',
    })
    const listing = requests[0].listing as Record<string, unknown>
    // usesCanonicalPhoto: true → photoUrl resolves to canonicalPhotoUrl, not
    // the rep's listing photo. This is the photo-resolution contract Thumper
    // surfaces to the model.
    expect(listing.photoUrl).toBe('https://canonical/photo.jpg')
    expect(listing.design).toMatchObject({
      itemNumber: 'RG31452',
      designName: 'The Celeste Ring',
      msrp: 128,
      type: 'RG',
    })
  })

  it('falls back to listingPhotoUrl when uses_canonical_photo is false', async () => {
    getTradeRequestsMock.mockResolvedValueOnce([
      {
        id: 'req-1',
        status: 'pending',
        customerName: 'Bob',
        customerDescription: '...',
        rejectionReason: null,
        repNotes: null,
        createdAt: '2026-04-28T10:00:00Z',
        updatedAt: '2026-04-28T10:00:00Z',
        listing: {
          id: 'listing-1',
          repId: 'rep-1',
          listingPhotoUrl: 'https://rep/listing.jpg',
          usesCanonicalPhoto: false,
          design: {
            id: 'design-1',
            itemNumber: 'NK66139',
            designName: 'Orbit',
            material: null,
            mainStone: null,
            bpMsrp: null,
            canonicalPhotoUrl: 'https://canonical/photo.jpg',
            typePrefix: 'NK',
          },
        },
      },
    ])

    const tool = makeGetTool()
    const result = await tool.execute({})

    const requests = result.requests as Array<Record<string, unknown>>
    const listing = requests[0].listing as Record<string, unknown>
    expect(listing.photoUrl).toBe('https://rep/listing.jpg')
  })

  it('returns count:0 with empty array when no matching requests', async () => {
    getTradeRequestsMock.mockResolvedValueOnce([])

    const tool = makeGetTool()
    const result = await tool.execute({})

    expect(result.count).toBe(0)
    expect(result.requests).toEqual([])
  })

  it('translates ServiceError into ThumperToolError', async () => {
    getTradeRequestsMock.mockRejectedValueOnce(errors.UNAUTHORIZED('foreign repId'))

    const tool = makeGetTool()
    await expect(tool.execute({})).rejects.toMatchObject({
      name: 'ThumperToolError',
      code: 'UNAUTHORIZED',
    })
  })
})

describe('approve_trade — write + audit', () => {
  it('calls approveTrade with admin client + repId + requestId, writes trade_approved audit, returns service result', async () => {
    approveTradeMock.mockResolvedValueOnce({
      requestId: 'req-1',
      fulfillmentId: 'ful-1',
      listingId: 'listing-1',
      customerName: 'Alice',
    })

    const tool = makeApproveTool()
    const result = await tool.execute({
      requestId: '11111111-1111-1111-1111-111111111111',
      repNotes: 'sounds good',
    })

    expect(approveTradeMock).toHaveBeenCalledTimes(1)
    // approveTrade(admin, repId, requestId, repNotes)
    expect(approveTradeMock.mock.calls[0][1]).toBe('rep-1')
    expect(approveTradeMock.mock.calls[0][2]).toBe(
      '11111111-1111-1111-1111-111111111111',
    )
    expect(approveTradeMock.mock.calls[0][3]).toBe('sounds good')

    expect(writeTradeActionAuditMock).toHaveBeenCalledTimes(1)
    expect(writeTradeActionAuditMock.mock.calls[0][0]).toMatchObject({
      actionType: 'trade_approved',
      repId: 'rep-1',
      targetListingId: 'listing-1',
      details: { runId: 'run-1', conversationId: 'conv-1' },
    })
    const auditArg = writeTradeActionAuditMock.mock.calls[0][0] as {
      beforeState: Record<string, unknown>
      afterState: Record<string, unknown>
    }
    expect(auditArg.beforeState).toMatchObject({
      requestStatus: 'pending',
      listingStatus: 'pending_trade',
      listingId: 'listing-1',
    })
    expect(auditArg.afterState).toMatchObject({
      requestStatus: 'approved',
      listingStatus: 'traded',
      listingId: 'listing-1',
      fulfillmentId: 'ful-1',
    })

    expect(result).toEqual({
      requestId: 'req-1',
      fulfillmentId: 'ful-1',
      listingId: 'listing-1',
      customerName: 'Alice',
    })
  })

  it('translates REQUEST_NOT_PENDING ServiceError into ThumperToolError without auditing', async () => {
    approveTradeMock.mockRejectedValueOnce(errors.REQUEST_NOT_PENDING())

    const tool = makeApproveTool()
    await expect(
      tool.execute({ requestId: '11111111-1111-1111-1111-111111111111' }),
    ).rejects.toMatchObject({
      name: 'ThumperToolError',
      code: 'REQUEST_NOT_PENDING',
    })
    // The mutation never succeeded — no audit row should be written.
    expect(writeTradeActionAuditMock).not.toHaveBeenCalled()
  })

  it('exposes needsApproval:true so the SDK gates the call behind a Confirm/Cancel dialog', () => {
    const tool = makeApproveTool()
    expect(tool.needsApproval).toBe(true)
  })
})

describe('reject_trade — write + audit', () => {
  it('calls rejectTrade with admin client + repId + requestId + reason + repNotes, writes trade_rejected audit, returns service result', async () => {
    rejectTradeMock.mockResolvedValueOnce({
      requestId: 'req-1',
      listingId: 'listing-1',
      listingRestored: true,
    })

    const tool = makeRejectTool()
    const result = await tool.execute({
      requestId: '22222222-2222-2222-2222-222222222222',
      reason: 'msrp_mismatch',
      repNotes: 'too low',
    })

    expect(rejectTradeMock).toHaveBeenCalledTimes(1)
    // rejectTrade(admin, repId, requestId, reason, repNotes)
    expect(rejectTradeMock.mock.calls[0][1]).toBe('rep-1')
    expect(rejectTradeMock.mock.calls[0][2]).toBe(
      '22222222-2222-2222-2222-222222222222',
    )
    expect(rejectTradeMock.mock.calls[0][3]).toBe('msrp_mismatch')
    expect(rejectTradeMock.mock.calls[0][4]).toBe('too low')

    expect(writeTradeActionAuditMock).toHaveBeenCalledTimes(1)
    const auditArg = writeTradeActionAuditMock.mock.calls[0][0] as {
      actionType: string
      beforeState: Record<string, unknown>
      afterState: Record<string, unknown>
    }
    expect(auditArg.actionType).toBe('trade_rejected')
    expect(auditArg.beforeState).toMatchObject({
      requestStatus: 'pending',
      listingStatus: 'pending_trade',
    })
    expect(auditArg.afterState).toMatchObject({
      requestStatus: 'denied',
      // listingRestored:true → listing flipped back to available
      listingStatus: 'available',
      rejectionReason: 'msrp_mismatch',
    })

    expect(result).toEqual({
      requestId: 'req-1',
      listingId: 'listing-1',
      listingRestored: true,
    })
  })

  it('audits rejectionReason as null when reason is omitted (do NOT coerce to "other")', async () => {
    rejectTradeMock.mockResolvedValueOnce({
      requestId: 'req-1',
      listingId: 'listing-1',
      listingRestored: true,
    })

    const tool = makeRejectTool()
    await tool.execute({ requestId: '22222222-2222-2222-2222-222222222222' })

    const auditArg = writeTradeActionAuditMock.mock.calls[0][0] as {
      afterState: Record<string, unknown>
    }
    expect(auditArg.afterState.rejectionReason).toBeNull()
  })

  it('audits listingStatus as pending_trade when listingRestored is false', async () => {
    rejectTradeMock.mockResolvedValueOnce({
      requestId: 'req-1',
      listingId: 'listing-1',
      listingRestored: false,
    })

    const tool = makeRejectTool()
    await tool.execute({ requestId: '22222222-2222-2222-2222-222222222222' })

    const auditArg = writeTradeActionAuditMock.mock.calls[0][0] as {
      afterState: Record<string, unknown>
    }
    expect(auditArg.afterState.listingStatus).toBe('pending_trade')
  })

  it('returns the success result even when audit write fails (audit is observability, not business logic)', async () => {
    rejectTradeMock.mockResolvedValueOnce({
      requestId: 'req-1',
      listingId: 'listing-1',
      listingRestored: true,
    })
    writeTradeActionAuditMock.mockRejectedValueOnce(new Error('audit table unreachable'))

    const tool = makeRejectTool()
    const result = await tool.execute({
      requestId: '22222222-2222-2222-2222-222222222222',
    })

    // Mutation succeeded — rep MUST see success regardless of audit fate.
    expect(result).toEqual({
      requestId: 'req-1',
      listingId: 'listing-1',
      listingRestored: true,
    })
    // Best-effort incident logging fired in the catch block.
    expect(logIncidentMock).toHaveBeenCalledTimes(1)
    expect(logIncidentMock.mock.calls[0][0]).toMatchObject({
      errorType: 'audit_write_failed',
      severity: 'warn',
    })
  })

  it('translates REQUEST_NOT_PENDING ServiceError into ThumperToolError without auditing', async () => {
    rejectTradeMock.mockRejectedValueOnce(errors.REQUEST_NOT_PENDING())

    const tool = makeRejectTool()
    await expect(
      tool.execute({ requestId: '22222222-2222-2222-2222-222222222222' }),
    ).rejects.toMatchObject({
      name: 'ThumperToolError',
      code: 'REQUEST_NOT_PENDING',
    })
    expect(writeTradeActionAuditMock).not.toHaveBeenCalled()
  })

  it('does NOT expose needsApproval — rejection is reversible and runs without a dialog', () => {
    const tool = makeRejectTool()
    expect(tool.needsApproval).toBeFalsy()
  })
})
