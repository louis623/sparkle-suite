import { describe, expect, it } from 'vitest'
import type { UIMessage } from 'ai'
import { buildAssistantMessageRenderables } from '@/app/nic-nac/components/NicNacChatBody'
import { sortMessagesByCreatedAt } from '@/lib/nic-nac/message-order'
import { listRecentNicNacConversations } from '@/lib/nic-nac/persistence'
import { prepareNicNacRolloverMessages } from '@/lib/nic-nac/rollover'
import {
  REMOVAL_NEEDS_ITS_OWN_CONFIRMATION,
  directPieceReply,
  retireSupersededPreviews,
  savedPhotoDisputeReply,
} from '@/lib/nic-nac/turn-replies'
import { originalUploadUrl } from '@/lib/nic-nac/tools/add-listing'
import { rarityFromConversation } from '@/lib/nic-nac/workflows/trade-board-known-fields'
import { computeTradeBoardAddAttemptReadiness } from '@/lib/nic-nac/workflows/trade-board-intake-controller'
import { fillBlankKnownFromPriorSession } from '@/lib/nic-nac/workflows/trade-board-intake-store'
import type { TradeBoardIntakeSessionState } from '@/lib/nic-nac/workflows/trade-board-intake-types'
import { mainPhotoPreviewRefusal } from '@/lib/nic-nac/workflows/workflow-photo-roles'

function textMessage(
  id: string,
  role: 'user' | 'assistant',
  text: string,
): UIMessage {
  return { id, role, parts: [{ type: 'text', text }] }
}

describe('round 9 stored details, recent chats, and photo words', () => {
  it('carries rarity from the old pending row onto the replacement', async () => {
    const replacement: TradeBoardIntakeSessionState = {
      id: 'session-new',
      repId: 'rep-1',
      conversationId: 'conversation-1',
      workflowType: 'trade_board_add_listing',
      catalogMode: 'item_number',
      status: 'active',
      phase: 'photo_capture',
      known: { itemNumber: 'NK10314' },
      missing: ['rarityClassification'],
      blockers: [],
      warnings: [],
      metadata: {},
      photos: [
        {
          id: 'photo-2',
          attachmentIndex: 1,
          declaredRole: 'jewelry_front',
          visualRole: 'jewelry',
          roleConfirmed: true,
          imageUrl: 'https://cdn.example.com/replacement.jpg',
          quality: 'usable',
          qualityIssues: [],
          notes: [],
        },
      ],
    }
    const prior = {
      rarity_classification: 'standard',
      design_name: 'Grok Run10 Piece',
      collection_name: 'July Birthday',
      material: 'Rhodium Plating',
      main_stone: 'Lab-Created Ruby',
      ring_size: null,
      jewelry_type: 'NK',
      collection_family: null,
    }
    const supabase = {
      from: () => {
        const query = {
          select: () => query,
          eq: () => query,
          neq: () => query,
          order: () => query,
          limit: async () => ({ data: [prior], error: null }),
          update: () => ({ eq: async () => ({ error: null }) }),
        }
        return query
      },
    }
    const filled = await fillBlankKnownFromPriorSession(supabase as never, replacement)
    const readiness = computeTradeBoardAddAttemptReadiness(filled, {
      itemNumber: filled.known.itemNumber,
      designName: filled.known.designName,
      collectionName: filled.known.collectionName,
      rarityClassification: filled.known.rarityClassification,
    })
    expect(filled.known.rarityClassification).toBe('standard')
    expect(readiness.missing).not.toContain('rarityClassification')
    expect(
      rarityFromConversation([
        textMessage('u1', 'user', 'NK10314 standard'),
        textMessage('u2', 'user', 'no'),
      ]),
    ).toBe('standard')
  })

  it('counts conversations instead of stopping after 100 rows', async () => {
    let ranges = 0
    const excluded = new Set<string>()
    const query = {
      select: () => query,
      eq: () => query,
      is: () => query,
      neq: (_key: string, id: string) => { excluded.add(id); return query },
      order: () => query,
      range: () => {
        ranges += 1
        if (!excluded.has('burst')) {
          return Promise.resolve({
            data: Array.from({ length: 100 }, () => ({
              conversation_id: 'burst',
              created_at: '2026-10-22T03:00:00.000Z',
            })),
            error: null,
          })
        }
        return Promise.resolve({
          data: [
            {
              conversation_id: '4129469d',
              created_at: '2026-10-21T18:00:00.000Z',
            },
          ],
          error: null,
        })
      },
      limit: () =>
        Promise.resolve({
          data: [
            {
              parts: [{ type: 'text', text: 'Add NK10314' }],
              created_at: '2026-10-21T12:00:00.000Z',
            },
          ],
          error: null,
        }),
    }
    const listed = await listRecentNicNacConversations({ from: () => query } as never, 'rep-1', 5)
    expect(ranges).toBeGreaterThan(1)
    expect(listed.map((item) => item.conversationId)).toEqual(
      expect.arrayContaining(['burst', '4129469d']),
    )
  })

  it('puts the fresh-chat notice last and keeps a yes off an older remove', () => {
    const prepared = prepareNicNacRolloverMessages(
      [
        textMessage(
          'old-remove',
          'assistant',
          'Do you want me to remove those listed Dance Floor items?',
        ),
        textMessage('old-user', 'user', 'RG10107 standard'),
      ],
      { itemNumber: 'RG10107', rarityClassification: 'standard' },
    )
    const ordered = sortMessagesByCreatedAt(prepared.messages)
    const last = ordered[ordered.length - 1]
    const lastText =
      last?.parts?.map((part) => (part as { text?: string }).text ?? '').join(' ') ?? ''
    expect(lastText).toContain('I started a fresh chat')
    expect(lastText).toContain('standard')
    const reply = directPieceReply({
      messages: [...ordered, textMessage('yes-3', 'user', 'yes')],
      latestUserText: 'yes',
      latestUserHasImage: false,
      known: { itemNumber: 'RG10107', rarityClassification: 'standard' },
    })
    expect(reply).toContain('Send the photo for RG10107 again')
    expect(reply).not.toBe(REMOVAL_NEEDS_ITS_OWN_CONFIRMATION)
  })

  it('says cut off or blurry, retires the old reply-yes line, and describes the saved photo', () => {
    expect(
      mainPhotoPreviewRefusal({
        photo: { quality: 'warning', qualityIssues: ['subject_cut_off'], notes: [] },
        itemNumber: 'NK10301',
        jewelryType: 'NK',
      }),
    ).toMatch(/cut off/i)
    expect(
      mainPhotoPreviewRefusal({
        photo: { quality: 'usable', qualityIssues: ['blur_risk'], notes: [] },
        itemNumber: 'ER10212',
        jewelryType: 'ER',
      }),
    ).toMatch(/blurry/i)
    const retired = retireSupersededPreviews([
      textMessage(
        'old-yes',
        'assistant',
        'Is this the right main photo? Reply yes and I will add it.',
      ),
    ])
    expect(JSON.stringify(retired)).toContain('This chat moved on')
    expect(JSON.stringify(retired)).not.toContain('Reply yes')
    const rendered = buildAssistantMessageRenderables(
      [{ type: 'text', text: 'If this is the right main photo, reply yes.' }],
      { readOnly: true, overlayMovedOn: true },
    )
    expect(rendered.map((item) => (item.type === 'text' ? item.text : '')).join(' ')).toContain(
      'This chat moved on',
    )
    expect(
      savedPhotoDisputeReply({
        latestUserText: 'you saved the wrong photo on NK10301',
        listingPhotoUrl: 'https://cdn.example.com/original-upload.jpg',
        itemNumber: 'NK10301',
        designName: 'The Florence Necklace',
      }),
    ).toContain('The Florence Necklace')
    expect(
      originalUploadUrl({
        photoUrl: 'https://cdn.example.com/cropped.jpg',
        originalPhotoUrl: 'https://cdn.example.com/original-upload.jpg',
      }),
    ).toBe('https://cdn.example.com/original-upload.jpg')
  })

  it('keeps the typed item number when the rep says to use another piece photo', () => {
    expect(
      directPieceReply({
        messages: [
          textMessage('a', 'assistant', 'That catalog photo is for NK10301.'),
          textMessage('u', 'user', "use the other piece's photo for RG10107"),
        ],
        latestUserText: "use the other piece's photo for RG10107",
        latestUserHasImage: false,
        known: { itemNumber: 'RG10107' },
      }),
    ).toContain("I'll keep RG10107")
  })
})
