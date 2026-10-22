import { sortMessagesByCreatedAt } from '@/lib/nic-nac/message-order'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { UIMessage } from 'ai'
import { REMOVAL_NEEDS_ITS_OWN_CONFIRMATION } from '@/lib/nic-nac/turn-replies'
import {
  confirmationAlreadyUsed,
  yesCommitsPreviewedPhoto,
} from '@/lib/nic-nac/workflows/main-photo-save-gate'
import type { TradeBoardIntakeSessionState } from '@/lib/nic-nac/workflows/trade-board-intake-types'

const {
  commitPreviewedAddListingMock,
  getPaidNicNacContextMock,
  loadCanonicalHistoryMock,
  insertUserMessageMock,
  reserveAssistantMessageMock,
  completeAssistantMock,
  logNicNacRunMock,
  probeConversationOwnerMock,
  findForwardRolloverDestinationMock,
  getOrCreateTradeBoardIntakeContextMock,
  loadSuiteRepMemoryCardsMock,
  createAdminClientMock,
} = vi.hoisted(() => ({
  commitPreviewedAddListingMock: vi.fn(),
  getPaidNicNacContextMock: vi.fn(),
  loadCanonicalHistoryMock: vi.fn(),
  insertUserMessageMock: vi.fn(),
  reserveAssistantMessageMock: vi.fn(),
  completeAssistantMock: vi.fn(),
  logNicNacRunMock: vi.fn(),
  probeConversationOwnerMock: vi.fn(),
  findForwardRolloverDestinationMock: vi.fn(),
  getOrCreateTradeBoardIntakeContextMock: vi.fn(),
  loadSuiteRepMemoryCardsMock: vi.fn(),
  createAdminClientMock: vi.fn(),
}))

vi.mock('@/lib/nic-nac/auth', () => ({
  AuthError: class AuthError extends Error {},
  getPaidNicNacContext: getPaidNicNacContextMock,
}))

vi.mock('@/lib/nic-nac/persistence', () => ({
  loadCanonicalHistory: loadCanonicalHistoryMock,
  insertUserMessage: insertUserMessageMock,
  reserveAssistantMessage: reserveAssistantMessageMock,
  completeAssistant: completeAssistantMock,
  abortAssistant: vi.fn(),
  checkpointAssistant: vi.fn(),
  recordApprovalEvent: vi.fn(),
  findForwardRolloverDestination: findForwardRolloverDestinationMock,
}))

vi.mock('@/lib/nic-nac/probe-conversation-owner', () => ({
  probeConversationOwner: probeConversationOwnerMock,
}))

vi.mock('@/lib/nic-nac/guardian-telemetry', () => ({
  logIncident: vi.fn(),
  logToolExecution: vi.fn(),
}))

vi.mock('@/lib/nic-nac/run-telemetry', () => ({
  logNicNacRun: logNicNacRunMock,
  normalizeRunUsage: vi.fn(),
}))

vi.mock('@/lib/nic-nac/core/memory/rep-memory-cards', () => ({
  loadSuiteRepMemoryCards: loadSuiteRepMemoryCardsMock,
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: createAdminClientMock,
}))

vi.mock('@/lib/nic-nac/workflows/trade-board-intake-context', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/lib/nic-nac/workflows/trade-board-intake-context')>()
  return {
    ...actual,
    getOrCreateTradeBoardIntakeContext: getOrCreateTradeBoardIntakeContextMock,
  }
})

vi.mock('@/lib/nic-nac/workflows/workflow-turn-arbitration', () => ({
  arbitrateNicNacWorkflowTurn: () => ({
    tradeBoard: true,
    trade: false,
    calendar: false,
  }),
}))

vi.mock('@/lib/nic-nac/agent/workflow-task-context', () => ({
  loadNicNacWorkflowTaskContinuity: async () => ({
    tradeBoardSession: { status: 'active', updatedAt: '2026-10-22T03:00:00.000Z' },
    tradeSession: null,
    calendarSession: null,
    pausedGoals: [],
  }),
  buildNicNacWorkflowTaskContext: () => ({ pausedGoals: [] }),
  renderNicNacWorkflowTaskContext: () => '',
}))

vi.mock('@/lib/nic-nac/tools/add-listing', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/nic-nac/tools/add-listing')>()
  return {
    ...actual,
    commitPreviewedAddListing: commitPreviewedAddListingMock,
    repHasListingForItemNumber: async () => false,
    savedListingPhotoFacts: async () => ({
      photoUrl: 'https://cdn.example.com/original-upload.jpg',
      itemNumber: 'NK10301',
      designName: 'The Florence Necklace',
    }),
  }
})

vi.mock('@/lib/nic-nac/agent', () => ({
  createConfiguredNicNacAgent: () => {
    throw new Error('model-not-used')
  },
}))

import { POST } from '@/app/api/nic-nac/route'

function textMessage(
  id: string,
  role: 'user' | 'assistant',
  text: string,
  createdAt?: string,
): UIMessage {
  return {
    id,
    role,
    parts: [{ type: 'text', text }],
    ...(createdAt ? { metadata: { created_at: createdAt } } : {}),
  }
}

function activeSession(
  metadata: Record<string, unknown> = {},
): TradeBoardIntakeSessionState {
  return {
    id: 'session-1',
    repId: 'rep-1',
    conversationId: 'conversation-1',
    workflowType: 'trade_board_add_listing',
    catalogMode: 'item_number',
    status: 'active',
    phase: 'ready_to_add',
    known: {
      itemNumber: 'NK10314',
      designName: 'Grok Run10 Piece',
      collectionName: 'July Birthday',
    },
    missing: [],
    blockers: [],
    warnings: [],
    metadata,
    photos: [
      {
        id: 'photo-1',
        attachmentIndex: 1,
        declaredRole: 'jewelry_front',
        visualRole: 'jewelry',
        roleConfirmed: true,
        imageUrl: 'https://cdn.example.com/original-upload.jpg',
        quality: 'usable',
        qualityIssues: [],
        notes: [],
      },
    ],
  }
}

function request(messages: UIMessage[], submittedMessageId?: string) {
  if (messages.at(-1)?.role === 'user') {
    loadCanonicalHistoryMock.mockResolvedValue(sortMessagesByCreatedAt(messages.slice(0, -1)))
  }
  return new Request('http://localhost/api/nic-nac', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      conversationId: 'conversation-1',
      mode: 'workspace',
      messages,
      ...(submittedMessageId ? { submittedMessageId } : {}),
    }),
  })
}

describe('round 9 real route and stored-detail path', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getPaidNicNacContextMock.mockResolvedValue({
      repId: 'rep-1',
      rep: { auth_user_id: 'user-1', display_name: 'Grok' },
      supabase: {},
    })
    probeConversationOwnerMock.mockResolvedValue(null)
    loadCanonicalHistoryMock.mockResolvedValue([])
    insertUserMessageMock.mockResolvedValue(undefined)
    reserveAssistantMessageMock.mockResolvedValue(undefined)
    completeAssistantMock.mockResolvedValue(undefined)
    logNicNacRunMock.mockResolvedValue(undefined)
    findForwardRolloverDestinationMock.mockResolvedValue(null)
    loadSuiteRepMemoryCardsMock.mockResolvedValue([])
    createAdminClientMock.mockReturnValue({
      from: () => {
        const query = {
          select: () => query,
          eq: () => query,
          neq: () => query,
          order: () => query,
          limit: async () => ({ data: [], error: null }),
          update: () => ({ eq: async () => ({ error: null }) }),
        }
        return query
      },
    })
    getOrCreateTradeBoardIntakeContextMock.mockImplementation(async () => ({
      sessionBefore: activeSession(),
      sessionAfter: activeSession(),
      workflowIntents: [],
      toolPolicySource: 'active_workflow',
      workflowPromptState: '',
      modelPieceContext: {
        fromMessageId: null,
        carryNotes: [],
        unfinishedQuestion: null,
      },
    }))
    commitPreviewedAddListingMock.mockResolvedValue({
      listingId: 'listing-1',
      itemNumber: 'NK10314',
    })
  })

  it('does not save a yes the rep did not submit', async () => {
    const messages = [
      textMessage('u-standard', 'user', 'NK10314 standard', '2026-10-22T03:00:00.000Z'),
      {
        ...textMessage(
          'a-preview',
          'assistant',
          'This is the main photo I will save for NK10314. If this is the right piece, reply yes.',
          '2026-10-22T03:01:00.000Z',
        ),
        parts: [
          {
            type: 'text',
            text: 'This is the main photo I will save for NK10314. If this is the right piece, reply yes.',
          },
          {
            type: 'tool-add_listing',
            state: 'output-available',
            output: { needsAction: 'confirm_main_photo', previewPhotoId: 'photo-1' },
          },
        ],
      } as UIMessage,
      textMessage('phantom-yes', 'user', 'yes', '2026-10-22T03:02:00.000Z'),
    ]

    expect((await POST(request(messages))).status).toBe(200)
    expect(commitPreviewedAddListingMock).not.toHaveBeenCalled()
  })

  it('saves once for the submitted yes and keeps stored standard', async () => {
    const messages = [
      textMessage('u-standard', 'user', 'NK10314 standard', '2026-10-22T03:00:00.000Z'),
      {
        id: 'a-preview',
        role: 'assistant' as const,
        metadata: { created_at: '2026-10-22T03:01:00.000Z' },
        parts: [
          {
            type: 'text' as const,
            text: 'This is the main photo I will save for NK10314. If this is the right piece, reply yes.',
          },
          {
            type: 'tool-add_listing' as const,
            state: 'output-available' as const,
            output: { needsAction: 'confirm_main_photo', previewPhotoId: 'photo-1' },
          },
        ],
      },
      textMessage('yes-1', 'user', 'yes', '2026-10-22T03:02:00.000Z'),
    ]
    const response = await POST(request(messages, 'yes-1'))
    const body = await response.text()
    expect(response.status).toBe(200)
    expect(body).toContain('NK10314 is on your Dance Floor')
    expect(commitPreviewedAddListingMock).toHaveBeenCalledTimes(1)
    expect(commitPreviewedAddListingMock.mock.calls[0]?.[0]?.workflow.known.rarityClassification).toBe(
      'standard',
    )
  })

  it('does not save the same confirmation twice', async () => {
    getOrCreateTradeBoardIntakeContextMock.mockImplementation(async () => ({
      sessionBefore: null,
      sessionAfter: activeSession({
        photoConfirmationMessageIds: ['yes-1'],
        committedPreviewPhotoId: 'photo-1',
      }),
      workflowIntents: [],
      toolPolicySource: 'active_workflow',
      workflowPromptState: '',
      modelPieceContext: { fromMessageId: null, carryNotes: [], unfinishedQuestion: null },
    }))
    const messages = [
      textMessage('u-standard', 'user', 'NK10314 standard', '2026-10-22T03:00:00.000Z'),
      {
        id: 'a-preview',
        role: 'assistant' as const,
        metadata: { created_at: '2026-10-22T03:01:00.000Z' },
        parts: [
          { type: 'text' as const, text: 'This is the main photo I will save for NK10314. Reply yes.' },
          {
            type: 'tool-add_listing' as const,
            state: 'output-available' as const,
            output: { needsAction: 'confirm_main_photo', previewPhotoId: 'photo-1' },
          },
        ],
      },
      textMessage('yes-1', 'user', 'yes', '2026-10-22T03:02:00.000Z'),
    ]
    const response = await POST(request(messages, 'yes-1'))
    expect(await response.text()).toContain('Dance Floor')
    expect(commitPreviewedAddListingMock).not.toHaveBeenCalled()
    expect(
      confirmationAlreadyUsed({
        submittedMessageId: 'yes-1',
        previewPhotoId: 'photo-1',
        usedMessageIds: ['yes-1'],
        committedPreviewPhotoId: 'photo-1',
      }),
    ).toBe(true)
  })

  it('does not treat yes as consent to remove an older ask', async () => {
    const messages = [
      textMessage(
        'a-remove',
        'assistant',
        'Do you want me to remove those listed Dance Floor items?',
        '2026-10-22T03:00:00.000Z',
      ),
      textMessage(
        'a-fresh',
        'assistant',
        'I started a fresh chat. I still have RG10107, standard. Want to finish RG10107? Send the photo again.',
        '2026-10-22T03:05:00.000Z',
      ),
      textMessage('yes-2', 'user', 'yes'),
    ]
    const reversed = [messages[1], messages[0], messages[2]] as UIMessage[]
    const response = await POST(request(reversed, 'yes-2'))
    const body = await response.text()
    expect(body).toContain('Send the photo for RG10107 again')
    expect(body).not.toContain(REMOVAL_NEEDS_ITS_OWN_CONFIRMATION)
    expect(commitPreviewedAddListingMock).not.toHaveBeenCalled()
    expect(
      yesCommitsPreviewedPhoto({
        latestUserText: 'yes',
        previewPhotoId: 'photo-1',
        previousAssistantText: 'Do you want me to remove those listed Dance Floor items?',
        submittedMessageId: 'yes-2',
        latestUserMessageId: 'yes-2',
      }),
    ).toBe(false)
  })
})

