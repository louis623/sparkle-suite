import { describe, expect, it, vi } from 'vitest'
import type { UIMessage } from 'ai'
import sharp from 'sharp'
import {
  NIC_NAC_REQUEST_BODY_LIMIT_BYTES,
  nicNacSendPayloadBytes,
  pieceCarryNote,
  pieceTurnBoundary,
  prepareNicNacSendMessages,
  scopeMessagesToCurrentPiece,
} from '@/lib/nic-nac/piece-task'
import {
  getOrCreateTradeBoardIntakeContext,
  ingestLatestTradeBoardIntakeTurn,
} from '@/lib/nic-nac/workflows/trade-board-intake-context'
import {
  decideLabelSave,
  LABEL_UNREADABLE_MESSAGE,
  readLabelPhoto,
} from '@/lib/nic-nac/workflows/label-item-number'
import { getNicNacModelPolicy } from '@/lib/nic-nac/core/model-policy'
import { shouldClearSendErrorAfterServerReply } from '@/lib/nic-nac/client-message-refresh'
import { recentConversationsFromRows } from '@/lib/nic-nac/recent-conversations'
import { buildTradeBoardIntakePromptState } from '@/lib/nic-nac/workflows/trade-board-intake-controller'
import type { TradeBoardIntakeSessionState } from '@/lib/nic-nac/workflows/trade-board-intake-types'
import { TURNED_DOWN_MAIN_PHOTO_NOTE } from '@/lib/nic-nac/workflows/workflow-photo-roles'
import { buildAssistantMessageRenderables } from '@/app/nic-nac/components/NicNacChatBody'

function photoMessage(id: string, bytes: string): UIMessage {
  return {
    id,
    role: 'user',
    parts: [
      { type: 'text', text: id },
      { type: 'file', mediaType: 'image/jpeg', url: `data:image/jpeg;base64,${bytes}` },
    ],
  }
}

describe('piece working context', () => {
  it('keeps 20 photo sends well under the request limit', () => {
    const bytes = 'A'.repeat(500_000)
    const messages = Array.from({ length: 20 }, (_, index) =>
      photoMessage(`photo-${index}`, bytes),
    )
    const rawBytes = new TextEncoder().encode(JSON.stringify(messages)).length
    const sentBytes = nicNacSendPayloadBytes(messages)
    expect(rawBytes).toBeGreaterThan(NIC_NAC_REQUEST_BODY_LIMIT_BYTES)
    expect(sentBytes).toBeLessThan(NIC_NAC_REQUEST_BODY_LIMIT_BYTES / 2)
    const prepared = prepareNicNacSendMessages(messages)
    expect(JSON.stringify(prepared[19])).toContain('data:image/jpeg')
    expect(JSON.stringify(prepared.slice(0, 19))).not.toContain('data:image')
    expect(JSON.stringify(prepared[0])).toContain('[earlier photo already saved]')
  })

  it('gives the model only the current piece and a short note', () => {
    const oldBytes = `OLD${'B'.repeat(80_000)}`
    const newBytes = `NEW${'C'.repeat(80_000)}`
    const messages = [
      photoMessage('old-photo', oldBytes),
      {
        id: 'saved-note',
        role: 'assistant',
        parts: [{ type: 'text', text: 'Saved the earrings.' }],
      } as UIMessage,
      photoMessage('current-photo', newBytes),
    ]
    const scoped = scopeMessagesToCurrentPiece({
      messages,
      fromMessageId: 'current-photo',
      carryNotes: ['Saved ER92202 earrings'],
    })
    const packed = JSON.stringify(scoped)
    expect(packed).toContain('Saved ER92202 earrings')
    expect(packed).toContain('current-photo')
    expect(packed).not.toContain(oldBytes)
    expect(packed).toContain(newBytes)
    expect(packed.match(/data:image/g)?.length ?? 0).toBe(1)
  })

  it('clears a skipped piece so the next item number does not inherit its label', async () => {
    const labelUrl = 'data:image/jpeg;base64,TEFCRUw='
    const sessionRow = {
      id: 'piece-earrings',
      rep_id: 'rep-1',
      conversation_id: 'conv-1',
      workflow_type: 'trade_board_add_listing',
      status: 'active',
      current_phase: 'photo_capture',
      item_number: 'ER90999',
      jewelry_type: 'ER',
      metadata: { mainPhotoConfirmedItemNumber: 'ER90999' },
      missing_fields: [],
      hard_blockers: [],
      soft_warnings: [],
    }
    const activeBuilder = {
      select: vi.fn(() => activeBuilder),
      eq: vi.fn(() => activeBuilder),
      in: vi.fn(() => activeBuilder),
      gt: vi.fn(() => activeBuilder),
      order: vi.fn(() => activeBuilder),
      limit: vi.fn(() => activeBuilder),
      maybeSingle: vi.fn(async () => ({ data: sessionRow, error: null })),
    }
    const photoBuilder = {
      select: vi.fn(() => photoBuilder),
      eq: vi.fn(() => photoBuilder),
      order: vi.fn(async () => ({
        data: [
          {
            id: 'label-photo',
            session_id: 'piece-earrings',
            image_url: labelUrl,
            declared_role: 'label_details',
            visual_role: 'label_or_packaging',
            role_confirmed: true,
            attachment_index: 1,
            quality: 'usable',
            quality_issues: [],
            notes: [],
          },
        ],
        error: null,
      })),
    }
    const update = vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) }))
    const workflowSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'trade_board_intake_photos') return photoBuilder
        return { ...activeBuilder, update }
      }),
    }

    const skipped = await getOrCreateTradeBoardIntakeContext({
      supabase: workflowSupabase as never,
      workflowSupabase: workflowSupabase as never,
      repId: 'rep-1',
      conversationId: 'conv-1',
      messages: [
        {
          id: 'skip-earrings',
          role: 'user',
          parts: [{ type: 'text', text: 'Skip the earrings' }],
        } as UIMessage,
      ],
      latestUserMessageId: 'skip-earrings',
      mode: 'workspace',
      nowIso: '2026-10-21T20:00:00.000Z',
    })

    expect(skipped.sessionAfter).toBeNull()
    expect(JSON.stringify(skipped.modelPieceContext.carryNotes)).toContain('Skipped ER90999')
    expect(JSON.stringify(skipped.sessionAfter)).not.toContain(labelUrl)
    expect(JSON.stringify(skipped.modelPieceContext)).not.toContain(labelUrl)
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'cancelled',
        current_phase: 'cancelled',
      }),
    )
    const closedMetadata = update.mock.calls[0]?.[0]?.metadata as {
      mainPhotoConfirmedItemNumber?: string
    }
    expect(closedMetadata.mainPhotoConfirmedItemNumber).toBeUndefined()
  })

  it('does not label the next piece with a cancelled item number', () => {
    expect(
      pieceTurnBoundary({
        latestUserText: 'cancel RG90101',
        previousAssistantText: 'This is the main photo I will save for RG90101.',
        activeItemNumber: 'RG90101',
        latestTurnIsPhotoConfirmation: false,
      }),
    ).toMatchObject({ action: 'close', reason: 'cancelled', askToFinish: false })
    expect(
      pieceTurnBoundary({
        latestUserText: 'RG91101',
        previousAssistantText: 'What piece is next?',
        activeItemNumber: 'RG90101',
        latestTurnIsPhotoConfirmation: false,
      }),
    ).toMatchObject({
      action: 'close',
      startsReplacement: true,
      askToFinish: true,
    })
    expect(pieceCarryNote({ reason: 'cancelled', itemNumber: 'RG90101' })).toBe(
      'Cancelled RG90101',
    )
  })

  it('asks before a fresh start carries an unfinished piece', () => {
    const scoped = scopeMessagesToCurrentPiece({
      messages: [
        {
          id: 'old',
          role: 'user',
          parts: [
            { type: 'text', text: 'NK91303' },
            { type: 'file', mediaType: 'image/jpeg', url: 'data:image/jpeg;base64,AAAA' },
          ],
        } as UIMessage,
        {
          id: 'restart',
          role: 'user',
          parts: [{ type: 'text', text: 'Start fresh' }],
        } as UIMessage,
      ],
      fromMessageId: 'restart',
      unfinishedQuestion: 'Want to finish NK91303?',
    })
    expect(JSON.stringify(scoped)).toContain('Want to finish NK91303?')
    expect(JSON.stringify(scoped)).not.toContain('data:image')
  })
})

describe('label vision failures', () => {
  it('downscales a large label and fails closed when the model call errors', async () => {
    const previous = process.env.OPENAI_API_KEY
    process.env.OPENAI_API_KEY = 'test-key'
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 400,
      json: async () => ({ error: { message: 'model not found' } }),
    }))
    try {
      const noisy = Buffer.alloc(1600 * 1200 * 3)
      for (let index = 0; index < noisy.length; index += 1) noisy[index] = (index * 17) % 256
      const jpeg = await sharp(noisy, {
        raw: { width: 1600, height: 1200, channels: 3 },
      })
        .jpeg({ quality: 95 })
        .toBuffer()
      expect(jpeg.length).toBeGreaterThan(1_500_000)
      const read = await readLabelPhoto(`data:image/jpeg;base64,${jpeg.toString('base64')}`, {
        fetch: fetchMock as unknown as typeof fetch,
      })
      expect(read.outcome).toBe('failed')
      expect(read.reason).toBe('http_400')
      expect(read.model).toBe('gpt-5.6-terra')
      expect(read.model).toBe(getNicNacModelPolicy('human_default').modelId)
      const sent = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as {
        input: Array<{ content: Array<{ image_url?: string }> }>
      }
      const sentUrl = sent.input[0]?.content.find((part) => part.image_url)?.image_url ?? ''
      expect(sentUrl.length).toBeLessThan(1_500_000)
      const decision = decideLabelSave({ itemNumber: 'ER92202', read })
      expect(decision.blocked).toBe(true)
      if (!decision.blocked) return
      expect(decision.message).toBe(LABEL_UNREADABLE_MESSAGE)
    } finally {
      if (previous === undefined) delete process.env.OPENAI_API_KEY
      else process.env.OPENAI_API_KEY = previous
    }
  })
})

describe('false send failure', () => {
  it('clears the failure only when the server already answered', () => {
    const current = [
      { id: 'user-1', role: 'user', parts: [{ type: 'text', text: 'photo' }] },
    ] as UIMessage[]
    const answered = [
      ...current,
      { id: 'assistant-1', role: 'assistant', parts: [{ type: 'text', text: 'Got it.' }] },
    ] as UIMessage[]
    expect(
      shouldClearSendErrorAfterServerReply({
        status: 'error',
        currentMessages: current,
        serverMessages: answered,
      }),
    ).toBe(true)
    expect(
      shouldClearSendErrorAfterServerReply({
        status: 'error',
        currentMessages: current,
        serverMessages: current,
      }),
    ).toBe(false)
    expect(
      shouldClearSendErrorAfterServerReply({
        status: 'ready',
        currentMessages: current,
        serverMessages: answered,
      }),
    ).toBe(false)
  })
})

describe('recent conversations', () => {
  it('uses the first line and date, and stays empty when there are none', () => {
    expect(recentConversationsFromRows([])).toEqual([])
    expect(
      recentConversationsFromRows([
        {
          conversation_id: 'older',
          role: 'user',
          parts: [{ type: 'text', text: 'Add NK91303\nsecond line' }],
          created_at: '2026-10-20T15:00:00.000Z',
        },
        {
          conversation_id: 'newer',
          role: 'assistant',
          parts: [{ type: 'text', text: 'Hello' }],
          created_at: '2026-10-21T18:00:00.000Z',
        },
        {
          conversation_id: 'newer',
          role: 'user',
          parts: [{ type: 'text', text: 'Where is my show?' }],
          created_at: '2026-10-21T17:00:00.000Z',
        },
      ]),
    ).toEqual([
      {
        conversationId: 'newer',
        title: 'Where is my show?',
        createdAt: '2026-10-21T18:00:00.000Z',
        dateLabel: 'Oct 21',
      },
      {
        conversationId: 'older',
        title: 'Add NK91303',
        createdAt: '2026-10-20T15:00:00.000Z',
        dateLabel: 'Oct 20',
      },
    ])
  })
})

describe('recent conversation list', () => {
  it('hides the open chat and keeps one entry when a rollover continues it', () => {
    const rows = [
      {
        conversation_id: 'dest',
        role: 'user',
        parts: [{ type: 'text', text: 'Add ER94204' }],
        created_at: '2026-10-21T18:00:00.000Z',
      },
      {
        conversation_id: 'source',
        role: 'user',
        parts: [{ type: 'text', text: 'Add ER94204' }],
        created_at: '2026-10-21T17:00:00.000Z',
      },
      {
        conversation_id: 'past',
        role: 'user',
        parts: [{ type: 'text', text: 'Where is my show?' }],
        created_at: '2026-10-20T15:00:00.000Z',
      },
    ]
    const edges = [
      { sourceConversationId: 'source', destinationConversationId: 'dest' },
    ]

    expect(
      recentConversationsFromRows(rows, 5, { rolloverEdges: edges }).map(
        (item) => item.conversationId,
      ),
    ).toEqual(['dest', 'past'])
    expect(
      recentConversationsFromRows(rows, 5, {
        excludeConversationId: 'dest',
        rolloverEdges: edges,
      }).map((item) => item.conversationId),
    ).toEqual(['past'])
    expect(
      recentConversationsFromRows(rows, 5, {
        excludeConversationId: 'source',
        rolloverEdges: edges,
      }).map((item) => item.conversationId),
    ).toEqual(['past'])
  })
})

describe('duplicate photo no', () => {
  it('keeps the piece details and uses the new photo', async () => {
    const sharedUrl = 'https://cdn.example.com/earrings.jpg'
    const upserts: Array<Record<string, unknown>> = []
    const sessionPatches: Array<Record<string, unknown>> = []
    const supabase = {
      from: (table: string) => {
        if (table === 'trade_board_intake_photos') {
          return {
            upsert: (row: Record<string, unknown>) => {
              upserts.push(row)
              const pending = Promise.resolve({ data: null, error: null })
              return Object.assign(pending, {
                select: () => ({
                  maybeSingle: async () => ({
                    data: { id: `saved-${upserts.length}` },
                    error: null,
                  }),
                }),
              })
            },
          }
        }
        if (table === 'trade_board_intake_sessions') {
          return {
            update: (patch: Record<string, unknown>) => {
              sessionPatches.push(patch)
              return { eq: async () => ({ error: null }) }
            },
          }
        }
        throw new Error(`unexpected table ${table}`)
      },
    }
    const session: TradeBoardIntakeSessionState = {
      id: 'intake-nk94304',
      repId: 'rep-1',
      conversationId: 'conv-1',
      workflowType: 'trade_board_add_listing',
      catalogMode: 'item_number',
      status: 'active',
      phase: 'photo_capture',
      known: {
        itemNumber: 'NK94304',
        material: 'Silver',
        designName: 'The Lumen Necklace',
        mainStone: 'Opal',
        rarityClassification: 'standard',
      },
      missing: ['jewelryFrontPhoto'],
      blockers: [],
      warnings: [],
      metadata: { openedOnMessageId: 'ask' },
      photos: [
        {
          id: 'shared-photo',
          conversationMessageId: 'old-photo',
          attachmentIndex: 1,
          declaredRole: 'jewelry_front',
          visualRole: 'jewelry',
          roleConfirmed: true,
          imageUrl: sharedUrl,
          quality: 'usable',
          qualityIssues: [],
          notes: ['declared as customer-facing jewelry photo'],
        },
      ],
    }

    const next = await ingestLatestTradeBoardIntakeTurn(supabase as never, {
      session,
      latestUserMessageId: 'no-photo',
      messages: [
        {
          id: 'ask',
          role: 'assistant',
          parts: [
            {
              type: 'text',
              text: 'This photo is already on ER94204. This is the main photo I will save for NK94304. If NK94304 belongs with that set and this is the right piece, reply yes.',
            },
          ],
        },
        {
          id: 'no-photo',
          role: 'user',
          parts: [
            { type: 'text', text: 'no' },
            {
              type: 'file',
              mediaType: 'image/jpeg',
              url: 'data:image/jpeg;base64,TkVX',
            },
          ],
        },
      ] as UIMessage[],
    })

    expect(next.known).toMatchObject({
      itemNumber: 'NK94304',
      material: 'Silver',
      designName: 'The Lumen Necklace',
      mainStone: 'Opal',
    })
    expect(next.metadata.declinedSharedPhoto).toBe(true)
    expect(next.photos[0]?.notes).toContain(TURNED_DOWN_MAIN_PHOTO_NOTE)
    expect(next.photos[1]?.imageUrl).toContain('TkVX')
    expect(next.photos[1]?.notes ?? []).not.toContain(TURNED_DOWN_MAIN_PHOTO_NOTE)
    expect(
      upserts.some((row) =>
        Array.isArray(row.notes) &&
        row.notes.includes(TURNED_DOWN_MAIN_PHOTO_NOTE) &&
        row.image_url === sharedUrl,
      ),
    ).toBe(true)
    const prompt = buildTradeBoardIntakePromptState(next)
    const rule = prompt.hardRules.find((line) =>
      line.includes('Do not offer to replace the shared catalog photo'),
    )
    expect(rule).toContain('NK94304')
    expect(rule).toContain('Silver')
    expect(rule).toContain('The Lumen Necklace')
    expect(rule).toContain('Opal')
    expect(rule).toContain('Use the new photo for this piece')
    expect(sessionPatches[0]?.metadata).toMatchObject({ declinedSharedPhoto: true })
  })
})

describe('duplicate photo wording', () => {
  it('shows one sentence for the warning card and the assistant message', () => {
    const message =
      'This photo is already on RG90101. This is the main photo I will save for RG91101. If RG91101 belongs with that set and this is the right piece, reply yes.'
    const renderables = buildAssistantMessageRenderables([
      {
        type: 'text',
        text: 'I cannot use that photo because it belongs somewhere else.',
      },
      {
        type: 'tool-add_listing',
        state: 'output-available',
        output: {
          code: 'PHOTO_REUSED_ON_OTHER_ITEM',
          needsAction: 'confirm_main_photo',
          previewPhotoId: 'photo-rg91101',
          message,
        },
      },
    ])
    const texts = renderables.map((item) =>
      item.type === 'text' || item.type === 'main-photo-preview' ? item.text : '',
    )
    expect(texts).toEqual([message])
  })
})
