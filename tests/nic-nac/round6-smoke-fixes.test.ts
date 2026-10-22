import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { UIMessage } from 'ai'
import { buildAssistantMessageRenderables } from '@/app/nic-nac/components/NicNacChatBody'
import {
  createRepTextScrubber,
  repAskedToUpdateSharedCatalogImage,
  stripUnaskedCatalogPhotoOffer,
} from '@/lib/nic-nac/core/stream-output-guard'
import {
  MOVED_ON_MESSAGE,
  assistantIsResumingUnfinishedPiece,
  freshChatNotice,
} from '@/lib/nic-nac/piece-task'
import { recentConversationsFromRows } from '@/lib/nic-nac/recent-conversations'
import { prepareNicNacRolloverMessages } from '@/lib/nic-nac/rollover'
import { pendingMainPhotoConfirmation } from '@/lib/nic-nac/tools/add-listing'
import {
  acceptedReplacementPhotoReply,
  directPieceReply,
  retireSupersededPreviews,
} from '@/lib/nic-nac/turn-replies'
import { acceptResentProductPhoto } from '@/lib/nic-nac/workflows/jewelry-main-photo'
import { mainPhotoPreviewRefusal } from '@/lib/nic-nac/workflows/workflow-photo-roles'

function textMessage(role: 'user' | 'assistant', text: string, id = role): UIMessage {
  return { id, role, parts: [{ type: 'text', text }] }
}

const rg97106 = {
  itemNumber: 'RG97106',
  ringSize: '10',
  rarityClassification: 'standard' as const,
  material: 'Silver',
  mainStone: 'Pink Stone',
  designName: 'Smoke Test Ring',
  collectionName: 'Smoke Test',
}

function previewWorkflow(photo: Record<string, unknown>) {
  return {
    id: 'intake-1',
    status: 'active' as const,
    catalogMode: 'item_number' as const,
    metadata: { mainPhotoConfirmationRequired: true },
    known: { itemNumber: 'ER97203', jewelryType: 'ER' as const },
    photos: [
      {
        id: 'photo-1',
        attachmentIndex: 1,
        declaredRole: 'jewelry_front',
        visualRole: 'jewelry',
        roleConfirmed: true,
        imageUrl: 'https://example.com/piece.jpg',
        quality: 'usable',
        qualityIssues: [],
        notes: [],
        ...photo,
      },
    ],
  }
}

describe('round 6 rollover notice comes from stored state', () => {
  it('inserts the notice and routes yes back to the unfinished piece', () => {
    const saved = textMessage(
      'assistant',
      'Added RG97105 to your Dance Floor — gold ring with an orange stone, Smoke Test collection, size 5, standard.',
      'saved',
    )
    const prepared = prepareNicNacRolloverMessages([saved], rg97106)
    const notice = prepared.messages.at(-1)
    const noticeText = JSON.stringify(notice?.parts)
    expect(notice?.id).toBe('rollover-finish-ask')
    expect(noticeText).toContain('I started a fresh chat.')
    expect(noticeText).toContain('RG97106')
    expect(noticeText).toContain('size 10')
    expect(noticeText).toContain('Smoke Test collection')
    expect(noticeText).not.toContain('RG97105')
    const yes = directPieceReply({
      messages: [...prepared.messages, textMessage('user', 'yes', 'yes')],
      latestUserText: 'yes',
      latestUserHasImage: false,
      known: rg97106,
    })
    expect(yes).toBe('Send the photo for RG97106 again.')
    expect(assistantIsResumingUnfinishedPiece(noticeText)).toBe(true)
    const accepted = acceptResentProductPhoto({
      declaredRole: 'unknown',
      visualRole: 'uncertain',
      quality: 'blocked',
      qualityIssues: [],
      roleConfirmed: false,
      notes: [],
    })
    expect(accepted.declaredRole).toBe('jewelry_front')
    expect(accepted.quality).toBe('usable')
    const blurry = acceptResentProductPhoto({
      declaredRole: 'jewelry_front',
      visualRole: 'jewelry',
      quality: 'usable',
      qualityIssues: ['blur_risk'],
      roleConfirmed: true,
      notes: [],
    })
    expect(blurry.quality).toBe('blocked')
  })

  it('recovers the unfinished piece from messages when intake state is missing', () => {
    const prepared = prepareNicNacRolloverMessages(
      [
        textMessage(
          'user',
          'Add RG97106, silver ring with a pink stone, Smoke Test collection, size 10, standard.',
          'add',
        ),
        textMessage(
          'assistant',
          'This is the main photo I will save for RG97106. If this is the right piece, reply yes.',
          'preview',
        ),
      ],
      null,
    )
    const noticeText = JSON.stringify(prepared.messages.at(-1)?.parts)
    expect(prepared.carry?.itemNumber).toBe('RG97106')
    expect(prepared.carry?.collectionName).toBe('Smoke Test')
    expect(prepared.carry?.rarity).toBe('standard')
    expect(noticeText).toContain('Want to finish RG97106?')
    expect(noticeText).not.toContain('main photo I will save')
  })
})

describe('round 6 skip follows the Dance Floor row', () => {
  it('says the piece is already saved when the listing exists', () => {
    const reply = directPieceReply({
      messages: [
        textMessage(
          'assistant',
          'Added RG97105 to your Dance Floor — gold ring with an orange stone.',
        ),
        textMessage('user', "No, don't save RG97105. Skip it for now."),
      ],
      latestUserText: "No, don't save RG97105. Skip it for now.",
      latestUserHasImage: false,
      listingExists: true,
    })
    expect(reply).toBe(
      "RG97105 is already on your Dance Floor. If you want it removed, say remove it and I'll ask you to confirm.",
    )
    expect(reply).not.toMatch(/won'?t be saved|won'?t save|I won'?t save/i)
    const notSaved = directPieceReply({
      messages: [
        textMessage('assistant', 'The label says ER97999. I won\'t save it on ER97202.'),
        textMessage('user', 'Skip ER97202 for now.'),
      ],
      latestUserText: 'Skip ER97202 for now.',
      latestUserHasImage: false,
      listingExists: false,
    })
    expect(notSaved).toBeNull()
  })
})

describe('round 6 a replacement photo keeps stored details', () => {
  it('does not ask again for collection or rarity and does not offer the shared photo', () => {
    const known = {
      itemNumber: 'RG97103',
      collectionName: 'Smoke Test',
      material: 'Rose Gold',
      mainStone: 'Purple Stone',
      ringSize: '6',
      rarityClassification: 'standard' as const,
    }
    const reply = directPieceReply({
      messages: [
        textMessage(
          'assistant',
          "I can't reuse another piece's photo. Send a different photo of RG97103.",
        ),
        textMessage('user', "No, that's not right. Here's the right photo for RG97103."),
      ],
      latestUserText: "No, that's not right. Here's the right photo for RG97103.",
      latestUserHasImage: true,
      known,
    })
    expect(reply).toBe(acceptedReplacementPhotoReply(known))
    expect(reply).toContain('Smoke Test collection')
    expect(reply).toContain('standard')
    expect(reply).toContain('This is the main photo I will save for RG97103.')
    expect(reply).toContain('reply yes')
    expect(reply).not.toMatch(/design name|diamond or unicorn|for all reps|catalog photo|what's its/i)
  })
})

describe('round 6 shared catalog photo is a separate ask', () => {
  it('drops the for-all-reps offer unless this turn asked for it', () => {
    const offer =
      "Got it—this is the correct jewelry-front photo for NK97303. Would you like me to submit it as the replacement catalog photo? It will update the design list image for all reps."
    expect(
      repAskedToUpdateSharedCatalogImage(
        "No, that's the wrong piece. Here's the right photo for NK97303.",
      ),
    ).toBe(false)
    expect(repAskedToUpdateSharedCatalogImage('Please update the design list image.')).toBe(
      true,
    )
    expect(stripUnaskedCatalogPhotoOffer(offer)).toBe(
      'Got it—this is the correct jewelry-front photo for NK97303.',
    )
    const scrubber = createRepTextScrubber({ correctPhotoBlame: () => null })
    expect(scrubber.push(offer)).toBe('')
    expect(scrubber.flush()).toBe('Got it—this is the correct jewelry-front photo for NK97303.')
    const allowed = createRepTextScrubber({
      allowSharedCatalogPhotoOffer: true,
      correctPhotoBlame: () => null,
    })
    expect(allowed.push(offer)).toBe('')
    expect(allowed.flush()).toContain('for all reps')
  })
})

describe('round 6 preview gate', () => {
  it('refuses a blurry or wrong-type photo before any reply-yes preview', () => {
    expect(
      mainPhotoPreviewRefusal({
        photo: { quality: 'usable', qualityIssues: ['blur_risk'], notes: [] },
        itemNumber: 'RG97102',
        jewelryType: 'RG',
      }),
    ).toMatch(/too blurry/)
    expect(
      mainPhotoPreviewRefusal({
        photo: { quality: 'usable', qualityIssues: [], notes: ['subject-type:RG'] },
        itemNumber: 'ER97203',
        jewelryType: 'ER',
      }),
    ).toBe(
      "That photo shows a ring, so I won't use it as the main photo for these earrings. Send a photo of the earrings.",
    )
    expect(() =>
      pendingMainPhotoConfirmation({
        itemNumber: 'ER97203',
        workflow: previewWorkflow({ qualityIssues: ['blur_risk'] }) as never,
      }),
    ).toThrow(/too blurry/)
    expect(() =>
      pendingMainPhotoConfirmation({
        itemNumber: 'ER97203',
        workflow: previewWorkflow({ notes: ['subject-type:RG'] }) as never,
      }),
    ).toThrow(/shows a ring/)
    const clear = pendingMainPhotoConfirmation({
      itemNumber: 'ER97203',
      workflow: previewWorkflow({}) as never,
    })
    expect(clear?.message).toContain('reply yes')
    expect(clear?.message).toContain('ER97203')
  })
})

describe('round 6 label insist stays on the label', () => {
  it('refuses again without asking for details that were already given', () => {
    const reply = directPieceReply({
      messages: [
        textMessage(
          'assistant',
          'The jewelry photo looks like gold earrings, but the label says ER97999, not ER97205.',
        ),
        textMessage('user', "It's ER97205. The label is fine. Save it."),
      ],
      latestUserText: "It's ER97205. The label is fine. Save it.",
      latestUserHasImage: false,
      known: {
        itemNumber: 'ER97205',
        collectionName: 'Smoke Test',
        rarityClassification: 'standard',
      },
      labelItemNumber: 'ER97999',
    })
    expect(reply).toBe(
      "The label says ER97999. I won't save it on ER97205. Send the label for ER97205.",
    )
    expect(reply).not.toMatch(/design name|collection|diamond|unicorn|customer-facing photo/i)
  })
})

describe('round 6 empty chats do not fill Recent', () => {
  it('hides chats with no user text and keeps a cleared chat that has messages', () => {
    const listed = recentConversationsFromRows(
      [
        {
          conversation_id: 'empty-a',
          role: 'user',
          parts: [],
          created_at: '2026-10-21T18:00:00.000Z',
        },
        {
          conversation_id: 'empty-b',
          role: 'assistant',
          parts: [],
          created_at: '2026-10-21T17:00:00.000Z',
        },
        {
          conversation_id: 'cleared',
          role: 'user',
          parts: [{ type: 'text', text: 'Add RG97106, silver ring with a pink stone' }],
          created_at: '2026-10-21T16:00:00.000Z',
        },
      ],
      5,
    )
    expect(listed.map((item) => item.conversationId)).toEqual(['cleared'])
    expect(listed[0]?.title).not.toMatch(/^Started /)
  })
})

describe('round 6 rollover notice does not repeat the design name', () => {
  it('omits a design name that only restates metal, stone, and jewelry type', () => {
    const notice = freshChatNotice({
      itemNumber: 'ER97204',
      rarity: 'standard',
      material: 'Silver',
      mainStone: 'Yellow Stone',
      designName: 'silver earrings with yellow stones',
      collectionName: 'Smoke Test',
    })
    expect(notice).toBe(
      'I started a fresh chat. I still have ER97204, standard, Silver, Yellow Stone, Smoke Test collection. Want to finish ER97204? Send the photo again.',
    )
    expect(notice.match(/I started a fresh chat/g)?.length).toBe(1)
    const kept = freshChatNotice({
      itemNumber: 'RG97106',
      material: 'Silver',
      designName: 'Smoke Test Ring',
    })
    expect(kept).toContain('Smoke Test Ring')
  })
})

describe('round 6 old reply-yes card is inactive', () => {
  it('renders the moved-on sentence and not an actionable photo card', () => {
    const retired = retireSupersededPreviews([
      {
        role: 'assistant',
        parts: [
          {
            type: 'text',
            text: 'This is the main photo I will save for RG97106. If this is the right piece, reply yes.',
          },
          {
            type: 'tool-add_listing',
            state: 'output-available',
            output: {
              needsAction: 'confirm_main_photo',
              previewImageUrl: 'https://example.com/ring.jpg',
              message: 'Reply yes to save RG97106.',
            },
          },
        ],
      },
    ])
    const renderables = buildAssistantMessageRenderables(retired[0]?.parts ?? [])
    expect(renderables.some((item) => item.type === 'main-photo-preview')).toBe(false)
    expect(renderables.map((item) => (item.type === 'text' ? item.text : ''))).toContain(
      MOVED_ON_MESSAGE,
    )
    expect(JSON.stringify(renderables)).not.toMatch(/reply yes/i)
    const historyRoute = readFileSync(
      'app/api/nic-nac/conversation-state/route.ts',
      'utf8',
    )
    expect(historyRoute).toContain('retireSupersededPreviews')
  })
})
