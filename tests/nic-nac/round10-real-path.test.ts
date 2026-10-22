import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { UIMessage } from 'ai'
import { designSourcePublicFile } from '@/lib/services/design-source-photo-processing'
import {
  guardAssistantVisibleText,
  HANDLER_INSTRUCTION_PATTERNS,
} from '@/lib/nic-nac/core/stream-output-guard'
import { classifySubmissionReplay } from '@/lib/nic-nac/submission-replay'
import {
  leaveItOffReply,
  alreadySavedReply,
  directPieceReply,
  MOVED_ON_MESSAGE,
  retireSupersededPreviews,
} from '@/lib/nic-nac/turn-replies'
import { recoverStoredPieceDetails } from '@/lib/nic-nac/workflows/trade-board-known-fields'
import {
  CUT_OFF_PHOTO_MESSAGE,
  mainPhotoPreviewRefusal,
} from '@/lib/nic-nac/workflows/workflow-photo-roles'
import { decideCustomerFacingSave } from '@/lib/nic-nac/tools/add-listing'
import { buildAssistantMessageRenderables } from '@/app/nic-nac/components/NicNacChatBody'
import type { TradeBoardIntakeSessionState } from '@/lib/nic-nac/workflows/trade-board-intake-types'

const LEAK =
  "RG11105 isn't in the Sparkle Suite jewelry database yet. Use vision on the rep's photos to extract designName and pass piecePhotoIndex or listingPhotoIndex. The handler uploads the photo from chat automatically. needsAction:'create_design'"

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
    tradeBoardSession: { status: 'active', updatedAt: '2026-10-22T09:00:00.000Z' },
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
    savedListingPhotoFacts: async () => null,
  }
})

vi.mock('@/lib/nic-nac/agent', () => ({
  createConfiguredNicNacAgent: () => {
    throw new Error('model-not-used')
  },
}))

import { POST } from '@/app/api/nic-nac/route'

function textMessage(id: string, role: 'user' | 'assistant', text: string): UIMessage {
  return { id, role, parts: [{ type: 'text', text }] }
}

function sessionWithoutDesign(): TradeBoardIntakeSessionState {
  return {
    id: 'session-1',
    repId: 'rep-1',
    conversationId: 'conversation-1',
    workflowType: 'trade_board_add_listing',
    catalogMode: 'item_number',
    status: 'active',
    phase: 'ready_to_add',
    known: {
      itemNumber: 'RG11105',
      collectionName: 'July Birthday',
      rarityClassification: 'standard',
    },
    missing: [],
    blockers: [],
    warnings: [],
    metadata: {},
    photos: [
      {
        id: 'photo-1',
        attachmentIndex: 1,
        declaredRole: 'jewelry_front',
        visualRole: 'jewelry',
        roleConfirmed: true,
        imageUrl: 'https://cdn.example.com/RG11105-source.jpg',
        quality: 'usable',
        qualityIssues: [],
        notes: [],
      },
    ],
  }
}

function request(messages: UIMessage[], submittedMessageId?: string) {
  if (messages.at(-1)?.role === 'user') {
    loadCanonicalHistoryMock.mockResolvedValue(messages.slice(0, -1))
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

describe('round 10 duplicate yes saves without leaking handler text', () => {
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
      sessionBefore: sessionWithoutDesign(),
      sessionAfter: sessionWithoutDesign(),
      workflowIntents: [],
      toolPolicySource: 'active_workflow',
      workflowPromptState: '',
      modelPieceContext: { fromMessageId: null, carryNotes: [], unfinishedQuestion: null },
    }))
    commitPreviewedAddListingMock.mockResolvedValue({
      listingId: 'listing-1',
      itemNumber: 'RG11105',
    })
  })

  it('recovers the stored design and saves after duplicate, no, a new photo, and yes', async () => {
    const messages: UIMessage[] = [
      textMessage('u-details', 'user', "It's RG11105, Grok Run11 Piece, July Birthday, standard."),
      {
        id: 'a-preview',
        role: 'assistant',
        parts: [
          {
            type: 'text',
            text: 'This is the main photo I will save for RG11105. If this is the right piece, reply yes.',
          },
          {
            type: 'tool-add_listing',
            state: 'output-available',
            input: {
              itemNumber: 'RG11105',
              designName: 'Grok Run11 Piece',
              collectionName: 'July Birthday',
              rarityClassification: 'standard',
            },
            output: { needsAction: 'confirm_main_photo', previewPhotoId: 'photo-1' },
          },
        ],
      },
      textMessage('yes-1', 'user', 'yes'),
    ]
    const response = await POST(request(messages, 'yes-1'))
    const body = await response.text()
    expect(response.status).toBe(200)
    expect(body).toContain('RG11105 is on your Dance Floor')
    for (const pattern of HANDLER_INSTRUCTION_PATTERNS) {
      expect(body).not.toMatch(pattern)
    }
    expect(commitPreviewedAddListingMock).toHaveBeenCalledTimes(1)
    expect(commitPreviewedAddListingMock.mock.calls[0]?.[0]?.workflow.known.designName).toBe(
      'Grok Run11 Piece',
    )
    expect(commitPreviewedAddListingMock.mock.calls[0]?.[0]?.workflow.known.collectionName).toBe(
      'July Birthday',
    )
    expect(completeAssistantMock).toHaveBeenCalled()
    const stored = completeAssistantMock.mock.calls[0]?.[1]?.parts as Array<{ text?: string }>
    const visible = JSON.stringify(stored)
    expect(visible).toContain('RG11105 is on your Dance Floor')
    expect(visible).not.toMatch(/use vision on the rep/i)
    expect(visible).not.toMatch(/handler uploads the photo/i)
  })

  it('never shows a handler instruction when the save still needs a design', async () => {
    commitPreviewedAddListingMock.mockResolvedValue({
      needsAction: 'create_design',
      message: LEAK,
    })
    const messages: UIMessage[] = [
      {
        id: 'a-preview',
        role: 'assistant',
        parts: [
          {
            type: 'text',
            text: 'This is the main photo I will save for RG11105. If this is the right piece, reply yes.',
          },
          {
            type: 'tool-add_listing',
            state: 'output-available',
            output: { needsAction: 'confirm_main_photo', previewPhotoId: 'photo-1' },
          },
        ],
      },
      textMessage('yes-1', 'user', 'yes'),
    ]
    const response = await POST(request(messages, 'yes-1'))
    const body = await response.text()
    expect(guardAssistantVisibleText(LEAK)).not.toMatch(/use vision|handler uploads/i)
    for (const pattern of HANDLER_INSTRUCTION_PATTERNS) {
      expect(body).not.toMatch(pattern)
    }
    expect(body).toContain('RG11105')
    const stored = JSON.stringify(completeAssistantMock.mock.calls[0]?.[1]?.parts ?? null)
    expect(stored).toContain('design name and collection')
    for (const pattern of HANDLER_INSTRUCTION_PATTERNS) {
      expect(stored).not.toMatch(pattern)
    }
  })

  it('does not start a second turn for a client message id that already has a reply', async () => {
    const stored = [
      textMessage('u-clear', 'user', "Here's a clearer photo of NK11312."),
      textMessage('a-clear', 'assistant', 'This is the main photo I will save for NK11312. Reply yes.'),
    ]
    loadCanonicalHistoryMock.mockResolvedValue(stored)
    const response = await POST(request(stored, 'u-clear'))
    const body = await response.text()
    expect(body).toContain('main photo I will save')
    expect(insertUserMessageMock).not.toHaveBeenCalled()
    expect(reserveAssistantMessageMock).not.toHaveBeenCalled()
    expect(commitPreviewedAddListingMock).not.toHaveBeenCalled()
  })
})

describe('round 10 stored history, photos, replay, and skip', () => {
  it('keeps earlier replies and tool output, and overlays only the last visible line', () => {
    const history = [
      textMessage('u1', 'user', 'Add RG11107'),
      {
        id: 'early',
        role: 'assistant' as const,
        parts: [
          { type: 'text' as const, text: 'This is the main photo I will save for RG11106. Reply yes.' },
          {
            type: 'tool-add_listing' as const,
            state: 'output-available' as const,
            output: {
              needsAction: 'confirm_main_photo',
              code: 'MAIN_PHOTO_CONFIRMATION_REQUIRED',
              message: 'Reply yes to save RG11106.',
            },
          },
        ],
      },
      textMessage('u2', 'user', 'Here is another photo'),
      {
        id: 'last',
        role: 'assistant' as const,
        parts: [
          { type: 'text' as const, text: 'Is this the right piece to save?' },
          {
            type: 'tool-add_listing' as const,
            state: 'output-available' as const,
            output: {
              needsAction: 'confirm_main_photo',
              previewImageUrl: 'https://cdn.example.com/RG11107.jpg',
              message: 'Is this the right piece to save?',
            },
          },
        ],
      },
    ]
    const displayed = retireSupersededPreviews(history)
    expect(displayed).toHaveLength(history.length)
    expect(JSON.stringify(displayed[1])).toContain('Reply yes')
    expect(JSON.stringify(displayed[1])).toContain('MAIN_PHOTO_CONFIRMATION_REQUIRED')
    expect(JSON.stringify(displayed[3]?.parts?.[1])).toContain('previewImageUrl')
    const lastText = (displayed[3]?.parts?.[0] as { text?: string }).text
    expect(lastText).toBe(MOVED_ON_MESSAGE)
    const earlierRender = buildAssistantMessageRenderables(
      [{ type: 'text', text: 'This is the main photo I will save for RG11106. Reply yes.' }],
      { readOnly: true },
    )
    expect(JSON.stringify(earlierRender)).toContain('Reply yes')
    const lastRender = buildAssistantMessageRenderables(history[3].parts, {
      readOnly: true,
      overlayMovedOn: true,
    })
    expect(JSON.stringify(lastRender)).toContain(MOVED_ON_MESSAGE)
    expect(JSON.stringify(lastRender)).not.toMatch(/right piece to save/i)
    expect(lastRender.some((item) => item.type === 'main-photo-preview')).toBe(false)
  })

  it('publishes the original upload when a listing save would otherwise crop', () => {
    expect(
      designSourcePublicFile({
        filenameStem: 'NK11312',
        cropped: true,
        publishOriginalUpload: true,
      }),
    ).toEqual({ filename: 'NK11312-source', selectedSource: 'original' })
    expect(
      designSourcePublicFile({ filenameStem: 'NK11312', cropped: true }),
    ).toEqual({ filename: 'NK11312-cropped', selectedSource: 'cropped' })
  })

  it('blocks a preview when the stored photo is flagged blurry or cut off', () => {
    expect(
      mainPhotoPreviewRefusal({
        photo: { quality: 'usable', qualityIssues: ['blur_risk'], notes: [] },
        itemNumber: 'NK11312',
      }),
    ).toMatch(/too blurry/)
    expect(
      mainPhotoPreviewRefusal({
        photo: { quality: 'usable', qualityScore: 90, qualityIssues: ['subject_cut_off'], notes: [] },
        itemNumber: 'RG11118',
      }),
    ).toBe(CUT_OFF_PHOTO_MESSAGE)
    expect(
      mainPhotoPreviewRefusal({
        photo: { quality: 'usable', qualityIssues: [], notes: ['the chain is cut off'] },
        itemNumber: 'RG11118',
      }),
    ).toBe(CUT_OFF_PHOTO_MESSAGE)
    const workflow = {
      status: 'active' as const,
      id: 'session-1',
      catalogMode: 'item_number' as const,
      known: { itemNumber: 'NK11312', jewelryType: 'NK' as const },
      metadata: { boundMainPhotoId: 'blurry' },
      photos: [
        {
          id: 'blurry',
          declaredRole: 'jewelry_front',
          visualRole: 'jewelry',
          quality: 'usable',
          qualityIssues: ['blur_risk'],
          notes: [],
          imageUrl: 'https://cdn.example.com/blurry.jpg',
        },
      ],
    }
    expect(() =>
      decideCustomerFacingSave({
        latestUserText: 'here is the photo',
        latestUserHasImage: true,
        workflow: workflow as never,
        itemNumber: 'NK11312',
        selectedPhotoId: 'blurry',
      }),
    ).toThrow(/too blurry/)
  })

  it('drops a replayed long message and stamps the server receive time', async () => {
    const stored = [
      textMessage('client-1', 'user', "It's NK11306. The label is fine. Save it."),
    ]
    const incoming = [
      ...stored,
      textMessage('client-2', 'user', "It's NK11306. The label is fine. Save it."),
    ]
    const replay = classifySubmissionReplay({ incoming, stored })
    expect(replay.dropIds).toEqual(['client-2'])
    expect(replay.suppressNewTurn).toBe(true)
    const sameId = classifySubmissionReplay({
      incoming: [
        textMessage('client-1', 'user', "Here's a clearer photo of the necklace."),
        textMessage('assistant-1', 'assistant', 'Saved.'),
      ],
      stored: [
        textMessage('client-1', 'user', "Here's a clearer photo of the necklace."),
        textMessage('assistant-1', 'assistant', 'Saved.'),
      ],
    })
    expect(sameId.suppressNewTurn).toBe(true)
    expect(sameId.storedAssistantId).toBe('assistant-1')

    const rows: Array<{ row: Record<string, unknown>; options: unknown }> = []
    const supabase = {
      from: () => ({
        upsert: async (row: Record<string, unknown>, options: unknown) => {
          rows.push({ row, options })
          return { error: null }
        },
      }),
    }
    const { insertUserMessage: insertActual } = await vi.importActual<
      typeof import('@/lib/nic-nac/persistence')
    >('@/lib/nic-nac/persistence')
    const before = Date.now()
    await insertActual(supabase as never, {
      conversationId: 'conversation-1',
      repId: 'rep-1',
      messageId: 'client-1',
      parts: [{ type: 'text', text: "It's NK11306. The label is fine. Save it." }],
    })
    const createdAt = String(rows[0]?.row.created_at)
    expect(Date.parse(createdAt)).toBeGreaterThanOrEqual(before - 1000)
    expect(rows[0]?.row.message_id).toBe('client-1')
    expect(rows[0]?.options).toEqual({
      onConflict: 'conversation_id,message_id',
      ignoreDuplicates: true,
    })
    expect(rows[0]?.row).not.toHaveProperty('metadata')
  })

  it('answers skip with leave-it-off before a save and already-saved after', () => {
    const before = directPieceReply({
      messages: [
        textMessage('a', 'assistant', 'Is this the right piece to save?'),
        textMessage('u', 'user', 'skip'),
      ],
      latestUserText: 'skip',
      latestUserHasImage: false,
      known: { itemNumber: 'NK11308' },
      listingExists: false,
    })
    expect(before).toBe(leaveItOffReply('NK11308'))
    expect(before).toMatch(/leave it off/i)
    expect(before).not.toMatch(/\?/)
    const after = directPieceReply({
      messages: [
        textMessage('a', 'assistant', 'Which listing should I skip?'),
        textMessage('u', 'user', 'skip'),
      ],
      latestUserText: 'skip',
      latestUserHasImage: false,
      known: { itemNumber: 'RG11118' },
      listingExists: true,
    })
    expect(after).toBe(alreadySavedReply('RG11118'))
    expect(after).toMatch(/already on your Dance Floor/i)
  })

  it('recovers a design title that is not the word ring or necklace', () => {
    const known = recoverStoredPieceDetails(
      { itemNumber: 'RG11105', collectionName: 'July Birthday', rarityClassification: 'standard' },
      [
        {
          role: 'user',
          parts: [{ type: 'text', text: "It's RG11105, Grok Run11 Piece, July Birthday." }],
        },
      ],
    )
    expect(known.designName).toBe('Grok Run11 Piece')
    expect(known.collectionName).toBe('July Birthday')
  })
})
