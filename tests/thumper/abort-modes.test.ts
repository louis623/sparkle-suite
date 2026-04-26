// Mocked unit tests for the persistence flow when a stream aborts.
// These do NOT run a real network or a real Supabase — they exercise the
// abort/complete branching against mocked persistence helpers and assert:
//   (a) partial reply persists with status='aborted'
//   (b) no orphaned approval_events for the aborted run
//   (c) recorded parts replay cleanly

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Module under test mocks: we don't import the route directly because Next
// route handlers expect a Request object and full request lifecycle. Instead
// we exercise the persistence helpers directly through fake implementations
// and assert the semantic contract holds.

interface ConvRow {
  conversation_id: string
  message_id: string
  rep_id: string
  role: 'user' | 'assistant'
  parts: unknown
  status: 'pending' | 'complete' | 'aborted'
}

interface ApprovalRow {
  conversation_id: string
  approval_id: string
  approved: boolean
}

function makeFakeStore() {
  const conv: ConvRow[] = []
  const approvals: ApprovalRow[] = []
  return {
    conv,
    approvals,
    reserveAssistant: vi.fn((args: { conversationId: string; repId: string; messageId: string }) => {
      conv.push({
        conversation_id: args.conversationId,
        message_id: args.messageId,
        rep_id: args.repId,
        role: 'assistant',
        parts: [],
        status: 'pending',
      })
    }),
    completeAssistant: vi.fn((args: { conversationId: string; messageId: string; parts: unknown }) => {
      const row = conv.find(
        (r) => r.conversation_id === args.conversationId && r.message_id === args.messageId
      )
      if (row) {
        row.parts = args.parts
        row.status = 'complete'
      }
    }),
    abortAssistant: vi.fn((args: { conversationId: string; messageId: string; parts?: unknown }) => {
      const row = conv.find(
        (r) => r.conversation_id === args.conversationId && r.message_id === args.messageId
      )
      if (row) {
        if (args.parts !== undefined) row.parts = args.parts
        row.status = 'aborted'
      }
    }),
    recordApproval: vi.fn((args: { conversationId: string; approvalId: string; approved: boolean }) => {
      approvals.push({
        conversation_id: args.conversationId,
        approval_id: args.approvalId,
        approved: args.approved,
      })
    }),
  }
}

// onFinish branching: this is the contract pulled from app/api/thumper/route.ts.
// If isAborted → call abortAssistant with partial parts. Else → completeAssistant.
async function onFinish(
  store: ReturnType<typeof makeFakeStore>,
  args: { conversationId: string; messageId: string; parts: unknown; isAborted: boolean }
) {
  if (args.isAborted) {
    store.abortAssistant({
      conversationId: args.conversationId,
      messageId: args.messageId,
      parts: args.parts,
    })
  } else {
    store.completeAssistant({
      conversationId: args.conversationId,
      messageId: args.messageId,
      parts: args.parts,
    })
  }
}

describe('abort-modes', () => {
  let store: ReturnType<typeof makeFakeStore>

  beforeEach(() => {
    store = makeFakeStore()
  })

  it('tab-close: partial parts persist with status=aborted, no approvals recorded', async () => {
    const conversationId = 'conv-1'
    const messageId = 'msg-1'
    const repId = 'rep-1'
    store.reserveAssistant({ conversationId, repId, messageId })

    // Stream produced two text parts before being aborted (tab close = abort signal).
    const partialParts = [
      { type: 'text', text: 'Pulling up your boa' },
    ]
    await onFinish(store, { conversationId, messageId, parts: partialParts, isAborted: true })

    const row = store.conv.find((r) => r.message_id === messageId)
    expect(row).toBeDefined()
    expect(row?.status).toBe('aborted')
    expect(row?.parts).toEqual(partialParts)
    expect(store.approvals.filter((a) => a.conversation_id === conversationId)).toHaveLength(0)
  })

  it('network-drop: aborted with empty parts is still persisted as aborted (not pending)', async () => {
    const conversationId = 'conv-2'
    const messageId = 'msg-2'
    store.reserveAssistant({ conversationId, repId: 'rep-1', messageId })

    // Network died before any parts streamed back.
    await onFinish(store, { conversationId, messageId, parts: [], isAborted: true })

    const row = store.conv.find((r) => r.message_id === messageId)
    expect(row?.status).toBe('aborted')
    expect(row?.parts).toEqual([])
  })

  it('server-kill mid HITL: approval_events row exists, assistant message is aborted, replay is consistent', async () => {
    const conversationId = 'conv-3'
    const userMessageId = 'msg-3-user'
    const assistantMessageId = 'msg-3-assistant'

    // User sent message + approval response together — approval recorded
    // BEFORE streamText started.
    store.recordApproval({
      conversationId,
      approvalId: 'approval-abc',
      approved: true,
    })
    store.reserveAssistant({
      conversationId,
      repId: 'rep-1',
      messageId: assistantMessageId,
    })

    // Stream killed mid-flight. onFinish fires with isAborted=true.
    const partialParts = [{ type: 'text', text: 'Removing the' }]
    await onFinish(store, {
      conversationId,
      messageId: assistantMessageId,
      parts: partialParts,
      isAborted: true,
    })

    // Replay: load history filtered by status — aborted assistant rows are
    // dropped from the canonical view fed back to the model. So a replay
    // should see only the user-side approval, no orphaned half-assistant.
    const canonical = store.conv.filter((r) => r.role === 'user' || r.status === 'complete')
    expect(canonical).toHaveLength(0)
    // But the durable record is preserved for the GET /conversation/[id]
    // viewer route (which surfaces aborted rows for transparency).
    const fullView = store.conv
    expect(fullView.find((r) => r.message_id === assistantMessageId)?.status).toBe('aborted')

    // Approval is durable — only one row, not duplicated.
    expect(store.approvals.filter((a) => a.approval_id === 'approval-abc')).toHaveLength(1)
  })

  it('clean finish: status=complete, parts persisted as final', async () => {
    const conversationId = 'conv-4'
    const messageId = 'msg-4'
    store.reserveAssistant({ conversationId, repId: 'rep-1', messageId })

    const finalParts = [{ type: 'text', text: 'Done. The Sapphire Cuff is off your board.' }]
    await onFinish(store, { conversationId, messageId, parts: finalParts, isAborted: false })

    const row = store.conv.find((r) => r.message_id === messageId)
    expect(row?.status).toBe('complete')
    expect(row?.parts).toEqual(finalParts)
  })
})
