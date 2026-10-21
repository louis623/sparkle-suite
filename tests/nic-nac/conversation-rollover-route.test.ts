import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { UIMessage } from 'ai'

const getPaidNicNacContextMock = vi.fn()
const getConversationOwnerMock = vi.fn()
const insertConversationMessagesMock = vi.fn()
const deleteConversationMessagesMock = vi.fn()
const loadConversationForClientMock = vi.fn()
const findActionableApprovalMock = vi.fn()
const logNicNacRolloverMock = vi.fn()
const createAdminClientMock = vi.fn()
const adminRpcMock = vi.fn()

function confirmedIntakeRow() {
  return {
    id: 'workflow-1',
    rep_id: 'rep-1',
    conversation_id: 'conv-source',
    status: 'active',
    catalog_mode: 'item_number',
    current_phase: 'ready_to_add',
    metadata: { mainPhotoConfirmedPhotoId: 'photo-confirmed' },
  }
}

function makeAdminClient(session: Record<string, unknown> | null) {
  return {
    rpc: adminRpcMock,
    from(table: string) {
      const builder: Record<string, unknown> = {}
      const chain = () => builder
      builder.select = chain
      builder.eq = chain
      builder.in = chain
      builder.gt = chain
      builder.limit = chain
      builder.order = (column: string) => {
        if (table === 'trade_board_intake_photos' && column === 'created_at') {
          return Promise.resolve({ data: [], error: null })
        }
        return builder
      }
      builder.maybeSingle = async () => ({ data: session, error: null })
      return builder
    },
  }
}

vi.mock('@/lib/nic-nac/auth', () => ({
  AuthError: class AuthError extends Error {},
  getPaidNicNacContext: (...args: unknown[]) =>
    getPaidNicNacContextMock(...args),
}))

vi.mock('@/lib/services/errors', () => ({
  ServiceError: class ServiceError extends Error {
    userMessage = 'service error'
    code = 'service_error'
    statusCode = 500
  },
}))

vi.mock('@/lib/nic-nac/persistence', () => ({
  getConversationOwner: (...args: unknown[]) =>
    getConversationOwnerMock(...args),
  insertConversationMessages: (...args: unknown[]) =>
    insertConversationMessagesMock(...args),
  deleteConversationMessages: (...args: unknown[]) =>
    deleteConversationMessagesMock(...args),
  loadConversationForClient: (...args: unknown[]) =>
    loadConversationForClientMock(...args),
}))

vi.mock('@/lib/nic-nac/hitl-state', () => ({
  findActionableApproval: (...args: unknown[]) =>
    findActionableApprovalMock(...args),
}))

vi.mock('@/lib/nic-nac/rollover-telemetry', () => ({
  logNicNacRollover: (...args: unknown[]) => logNicNacRolloverMock(...args),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: (...args: unknown[]) => createAdminClientMock(...args),
}))

import { POST as postLegacyRollover } from '@/app/api/nic-nac/conversation-rollover/route'
import { POST as postRollover } from '@/app/api/nic-nac/conversation/rollover/route'

const routes = [
  ['current route', postRollover],
  ['legacy-compatible route', postLegacyRollover],
] as const

function userMessage(): UIMessage {
  return {
    id: 'source-message',
    role: 'user',
    parts: [{ type: 'text', text: 'Use the confirmed Ruby photo.' }],
  }
}

describe.each(routes)('Nic-Nac conversation rollover %s', (_label, post) => {
  beforeEach(() => {
    vi.clearAllMocks()
    getPaidNicNacContextMock.mockResolvedValue({
      repId: 'rep-1',
      supabase: { marker: 'service-client' },
    })
    getConversationOwnerMock.mockResolvedValue('rep-1')
    loadConversationForClientMock.mockResolvedValue([userMessage()])
    findActionableApprovalMock.mockReturnValue(null)
    insertConversationMessagesMock.mockResolvedValue(undefined)
    deleteConversationMessagesMock.mockResolvedValue(undefined)
    createAdminClientMock.mockReturnValue(makeAdminClient(confirmedIntakeRow()))
    adminRpcMock.mockImplementation(
      async (_name: string, args: { p_destination_conversation_id: string }) => ({
        data: {
          workflow_id: 'workflow-1',
          destination_conversation_id: args.p_destination_conversation_id,
          replayed: false,
        },
        error: null,
      }),
    )
    logNicNacRolloverMock.mockResolvedValue(undefined)
  })

  it('carries the same active workflow into the generated conversation', async () => {
    const response = await post(
      new Request('https://www.yoursparklesuite.com/api/nic-nac/conversation/rollover', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ conversationId: 'conv-source' }),
      }),
    )
    const body = (await response.json()) as {
      conversationId: string
      workflowId: string | null
      carriedMessageCount: number
    }

    expect(response.status).toBe(200)
    expect(body.workflowId).toBe('workflow-1')
    expect(body.carriedMessageCount).toBe(1)
    expect(insertConversationMessagesMock).toHaveBeenCalledWith(
      { marker: 'service-client' },
      expect.objectContaining({
        repId: 'rep-1',
        conversationId: body.conversationId,
      }),
    )
    expect(createAdminClientMock).toHaveBeenCalledTimes(1)
    expect(adminRpcMock).toHaveBeenCalledWith(
      'rpc_rollover_trade_board_intake_v2',
      expect.objectContaining({
        p_rep_id: 'rep-1',
        p_source_conversation_id: 'conv-source',
        p_destination_conversation_id: body.conversationId,
      }),
    )
  })

  it('leaves an unconfirmed piece in the old chat', async () => {
    createAdminClientMock.mockReturnValue(
      makeAdminClient({
        ...confirmedIntakeRow(),
        metadata: {},
      }),
    )
    loadConversationForClientMock.mockResolvedValue([
      {
        id: 'pending-preview',
        role: 'assistant',
        parts: [
          {
            type: 'tool-add_listing',
            state: 'output-available',
            output: {
              needsAction: 'confirm_main_photo',
              previewPhotoId: 'photo-ring',
              message: 'This is the main photo I will save for NK90303.',
            },
          },
        ],
      } as UIMessage,
    ])

    const response = await post(
      new Request('https://www.yoursparklesuite.com/api/nic-nac/conversation/rollover', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ conversationId: 'conv-source' }),
      }),
    )
    const body = (await response.json()) as { workflowId: string | null }
    expect(response.status).toBe(200)
    expect(body.workflowId).toBeNull()
    expect(adminRpcMock).not.toHaveBeenCalled()
    const inserted = insertConversationMessagesMock.mock.calls[0]?.[1] as {
      messages: UIMessage[]
    }
    expect(JSON.stringify(inserted.messages)).not.toContain('confirm_main_photo')
    expect(JSON.stringify(inserted.messages)).not.toContain('photo-ring')
  })

  it('replays the first destination instead of orphaning the workflow on a concurrent retry', async () => {
    adminRpcMock.mockResolvedValueOnce({
      data: {
        workflow_id: 'workflow-1',
        destination_conversation_id: 'conv-first-destination',
        replayed: true,
      },
      error: null,
    })

    const response = await post(
      new Request('https://www.yoursparklesuite.com/api/nic-nac/conversation/rollover', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ conversationId: 'conv-source' }),
      }),
    )
    const body = (await response.json()) as {
      conversationId: string
      workflowId: string | null
    }

    expect(response.status).toBe(200)
    expect(body).toMatchObject({
      conversationId: 'conv-first-destination',
      workflowId: 'workflow-1',
    })
    expect(deleteConversationMessagesMock).toHaveBeenCalledWith(
      { marker: 'service-client' },
      expect.objectContaining({ repId: 'rep-1' }),
    )
    expect(logNicNacRolloverMock).not.toHaveBeenCalled()
  })

  it('does not copy messages or workflow state across reps', async () => {
    getConversationOwnerMock.mockResolvedValueOnce('rep-other')

    const response = await post(
      new Request('https://www.yoursparklesuite.com/api/nic-nac/conversation/rollover', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ conversationId: 'conv-source' }),
      }),
    )

    expect(response.status).toBe(403)
    expect(insertConversationMessagesMock).not.toHaveBeenCalled()
    expect(createAdminClientMock).not.toHaveBeenCalled()
    expect(adminRpcMock).not.toHaveBeenCalled()
  })

  it('removes copied destination messages when workflow transfer fails', async () => {
    adminRpcMock.mockResolvedValueOnce({
      data: null,
      error: new Error('rollover failed'),
    })

    await expect(
      post(
        new Request('https://www.yoursparklesuite.com/api/nic-nac/conversation/rollover', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ conversationId: 'conv-source' }),
        }),
      ),
    ).rejects.toThrow('rollover failed')

    expect(deleteConversationMessagesMock).toHaveBeenCalledWith(
      { marker: 'service-client' },
      expect.objectContaining({ repId: 'rep-1' }),
    )
  })
})
