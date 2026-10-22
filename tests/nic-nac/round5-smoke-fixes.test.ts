import { describe, expect, it } from 'vitest'
import type { UIMessage } from 'ai'
import { freshChatNotice } from '@/lib/nic-nac/piece-task'
import {
  clearNicNacConversationChain,
  findForwardRolloverDestination,
} from '@/lib/nic-nac/persistence'
import { recentConversationsFromRows } from '@/lib/nic-nac/recent-conversations'
import {
  enrichKnownFromPieceMessages,
  extractKnownFieldsFromText,
  impliedCollectionType,
} from '@/lib/nic-nac/workflows/trade-board-known-fields'
import { acceptResentProductPhoto } from '@/lib/nic-nac/workflows/jewelry-main-photo'
import { carryKnownListingFields } from '@/lib/nic-nac/tools/add-listing'
import {
  buildTradeBoardIntakePromptState,
  createEmptyTradeBoardIntakeState,
} from '@/lib/nic-nac/workflows/trade-board-intake-controller'
import {
  createRepTextScrubber,
  photoBlameCorrection,
} from '@/lib/nic-nac/core/stream-output-guard'
import {
  MOVED_ON_MESSAGE,
  directPieceReply,
  retireSupersededPreviews,
} from '@/lib/nic-nac/turn-replies'

const pieceText =
  'RG96106, size 10, standard, silver ring with a pink stone, design name Smoke Test Ring, Smoke Test collection'

function textMessage(role: 'user' | 'assistant', text: string): UIMessage {
  return { id: `${role}-${text.slice(0, 12)}`, role, parts: [{ type: 'text', text }] }
}

describe('round 5 finish a piece after a fresh chat', () => {
  it('treats yes as continue and keeps every detail the rep already gave', () => {
    const known = extractKnownFieldsFromText(pieceText)
    expect(known).toMatchObject({
      itemNumber: 'RG96106',
      ringSize: '10',
      rarityClassification: 'standard',
      material: 'Silver',
      mainStone: 'Pink Stone',
      designName: 'Smoke Test Ring',
      collectionName: 'Smoke Test',
    })
    expect(extractKnownFieldsFromText('July Birthday 2026')).toMatchObject({
      collectionName: 'July Birthday',
      collectionYear: 2026,
    })
    expect(extractKnownFieldsFromText('in the Smoke Test collection').collectionName).toBe(
      'Smoke Test',
    )
    const enriched = enrichKnownFromPieceMessages(
      { itemNumber: 'RG96106', material: 'Gold' },
      [textMessage('user', pieceText)],
    )
    expect(enriched.material).toBe('Gold')
    expect(enriched.collectionName).toBe('Smoke Test')
    expect(enriched.mainStone).toBe('Pink Stone')

    const notice = freshChatNotice(known)
    expect(notice).toContain('Want to finish RG96106?')
    expect(notice).toContain('Smoke Test collection')
    expect(notice).toContain('Send the photo again.')
    const reply = directPieceReply({
      messages: [textMessage('assistant', notice), textMessage('user', 'yes')],
      latestUserText: 'yes',
      latestUserHasImage: false,
      known,
    })
    expect(reply).toBe('Send the photo for RG96106 again.')
    expect(reply).not.toMatch(/diamond|unicorn|confirm or do next|data:image/i)

    const carried = carryKnownListingFields(
      { mode: 'single', catalogMode: 'non_item_number' },
      {
        status: 'active',
        known: {
          itemNumber: 'RG96106',
          material: 'Silver',
          mainStone: 'Pink Stone',
          designName: 'Smoke Test Ring',
          collectionName: 'Smoke Test',
          ringSize: '10',
          rarityClassification: 'standard',
        },
      },
    )
    expect(carried.catalogMode).toBe('item_number')
    expect(carried.material).toBe('Silver')
    expect(carried.mainStone).toBe('Pink Stone')
    expect(carried.designName).toBe('Smoke Test Ring')
    expect(carried.collectionName).toBe('Smoke Test')
    expect(carried.ringSize).toBe('10')
    expect(carried.rarityClassification).toBe('standard')
  })

  it('accepts the resent product photo and still blocks a blurry one', () => {
    const rotated = acceptResentProductPhoto({
      declaredRole: 'unknown',
      visualRole: 'uncertain',
      quality: 'blocked',
      qualityIssues: ['subject_too_small'],
    })
    expect(rotated.declaredRole).toBe('jewelry_front')
    expect(rotated.quality).toBe('usable')
    const blurry = acceptResentProductPhoto({
      declaredRole: 'unknown',
      visualRole: 'jewelry',
      quality: 'blocked',
      qualityIssues: ['blur_risk'],
    })
    expect(blurry.quality).toBe('blocked')
    const label = acceptResentProductPhoto({
      declaredRole: 'label_details',
      visualRole: 'label_or_packaging',
      quality: 'usable',
      qualityIssues: [],
    })
    expect(label.declaredRole).toBe('label_details')
  })
})

describe('round 5 skip after a save', () => {
  it('says the piece is already saved and offers removal', () => {
    const reply = directPieceReply({
      messages: [
        textMessage('assistant', 'RG96104 is now on your Dance Floor.'),
        textMessage('user', 'Skip'),
      ],
      latestUserText: 'Skip',
      latestUserHasImage: false,
      listingExists: true,
    })
    expect(reply).toBe(
      "RG96104 is already on your Dance Floor. If you want it removed, say remove it and I'll ask you to confirm.",
    )
    expect(reply).not.toMatch(/won'?t be added|won'?t save or add/i)
  })
})

describe('round 5 no to a duplicate', () => {
  it('keeps the design name and collection that were already given', () => {
    const known = {
      itemNumber: 'NK96303',
      designName: 'Smoke Test Necklace',
      collectionName: 'Smoke Test',
    }
    const reply = directPieceReply({
      messages: [
        textMessage(
          'assistant',
          'This photo is already on ER96101. I won\'t use it as the main photo for NK96303.',
        ),
        textMessage('user', 'no'),
      ],
      latestUserText: 'no',
      latestUserHasImage: false,
      known,
    })
    expect(reply).toContain('NK96303')
    expect(reply).toContain('Smoke Test Necklace')
    expect(reply).toContain('Smoke Test collection')
    expect(reply).not.toMatch(/what(?:'s| is) the design|which collection|collection type/i)
    const session = createEmptyTradeBoardIntakeState({
      id: 'session-1',
      repId: 'rep-1',
      conversationId: 'conv-1',
    })
    const declined = buildTradeBoardIntakePromptState({
      ...session,
      known,
      metadata: { declinedSharedPhoto: true },
    })
    const rule = declined.hardRules.find((line) => line.includes('Already confirmed'))
    expect(rule).toContain('Smoke Test Necklace')
    expect(rule).toContain('Smoke Test')
    expect(rule).toContain('Do not ask for these again')
  })
})

describe('round 5 clear stays in Recent', () => {
  it('opens an empty chat without removing the cleared one', async () => {
    const updates: string[] = []
    const supabase = {
      from: () => {
        const query: Record<string, unknown> = {}
        query.update = () => {
          updates.push('update')
          return query
        }
        query.eq = () => query
        query.is = () => query
        query.select = () => Promise.resolve({ data: [], error: null })
        query.upsert = () => Promise.resolve({ error: null })
        return query
      },
    }
    await expect(
      clearNicNacConversationChain(
        supabase as never,
        {} as never,
        'rep-1',
        'cleared-chat',
        'empty-chat',
      ),
    ).resolves.toEqual([])
    expect(updates).toEqual([])
    const listed = recentConversationsFromRows(
      [
        {
          conversation_id: 'cleared-chat',
          role: 'user',
          parts: [{ type: 'text', text: 'Add RG96104' }],
          created_at: '2026-10-21T12:00:00.000Z',
        },
        {
          conversation_id: 'empty-chat',
          role: 'assistant',
          parts: [],
          created_at: '2026-10-21T13:00:00.000Z',
        },
      ],
      5,
      { excludeConversationId: 'empty-chat' },
    )
    expect(listed.map((item) => item.conversationId)).toContain('cleared-chat')
  })
})

describe('round 5 collection type', () => {
  it('does not ask for a collection type the collection already implies', () => {
    expect(impliedCollectionType('Original')).toBe('OG')
    expect(impliedCollectionType('July Birthday')).toBe('Birthday')
    expect(impliedCollectionType('Luxe')).toBe('Luxe')
    expect(impliedCollectionType('Smoke Test')).toBeUndefined()
    const withItem = carryKnownListingFields(
      { mode: 'single', catalogMode: 'non_item_number' },
      {
        status: 'active',
        known: { itemNumber: 'RG96105', collectionName: 'Original' },
      },
    )
    expect(withItem.catalogMode).toBe('item_number')
    expect(withItem.itemNumber).toBe('RG96105')
    expect(withItem.collectionFamily).toBe('OG')
    const withoutItem = carryKnownListingFields(
      { mode: 'single', catalogMode: 'non_item_number', collectionName: 'Smoke Test' },
      { status: 'active', known: { collectionName: 'Smoke Test' } },
    )
    expect(withoutItem.collectionFamily).toBe('Smoke Test')
  })
})

describe('round 5 superseded chat', () => {
  it('makes an old reply-yes preview inert and points at the current chat', async () => {
    const retired = retireSupersededPreviews([
      {
        role: 'assistant',
        parts: [
          {
            type: 'text',
            text: 'This is the main photo I will save for ER96204. If this is the right piece, reply yes.',
          },
          {
            type: 'tool-add_listing',
            state: 'output-available',
            output: {
              needsAction: 'confirm_main_photo',
              previewImageUrl: 'https://example.com/earring.jpg',
              message: 'Reply yes to save ER96204.',
            },
          },
        ],
      },
    ])
    const json = JSON.stringify(retired)
    expect(json).toContain(MOVED_ON_MESSAGE)
    expect(json).toContain('confirm_main_photo')
    expect(json).toContain('previewImageUrl')
    expect(retired[0]?.parts?.some((part) => (part as { type?: string }).type === 'text' && (part as { text?: string }).text?.includes(MOVED_ON_MESSAGE))).toBe(true)
    const edges = [
      { source_conversation_id: 'older', destination_conversation_id: 'middle' },
      { source_conversation_id: 'middle', destination_conversation_id: 'current' },
    ]
    const chain = (filters: Record<string, string>) => {
      const api = {
        eq(column: string, value: string) {
          return chain({ ...filters, [column]: value })
        },
        order() {
          return api
        },
        limit() {
          const row = edges.find(
            (edge) => edge.source_conversation_id === filters.source_conversation_id,
          )
          return Promise.resolve({ data: row ? [row] : [], error: null })
        },
      }
      return api
    }
    const admin = {
      from: () => ({
        select: () => chain({}),
      }),
    }
    await expect(
      findForwardRolloverDestination(admin as never, 'rep-1', 'older'),
    ).resolves.toBe('current')
    await expect(
      findForwardRolloverDestination(admin as never, 'rep-1', 'current'),
    ).resolves.toBeNull()
  })
})

describe('round 5 refused duplicate wording', () => {
  it('does not say the photo was accepted after a refusal', () => {
    const reply = directPieceReply({
      messages: [
        textMessage(
          'assistant',
          'This photo is already on ER96101. I won\'t use it as the main photo for NK96303.',
        ),
        textMessage('user', 'Yes, use that photo for NK96303'),
      ],
      latestUserText: 'Yes, use that photo for NK96303',
      latestUserHasImage: false,
    })
    expect(reply).toBe(
      "I won't use that photo. It's already on ER96101. Send a different photo of this piece.",
    )
    expect(reply).not.toMatch(/I'll use|Got it/i)
    const previewYes = directPieceReply({
      messages: [
        textMessage(
          'assistant',
          'This is the main photo I will save for RG96104. If this is the right piece, reply yes.',
        ),
        textMessage('user', 'yes'),
      ],
      latestUserText: 'yes',
      latestUserHasImage: false,
    })
    expect(previewYes).toBeNull()
  })
})

describe('round 5 label mismatch wording', () => {
  it('says the label item number does not match', () => {
    const text = 'That looks like artwork rather than the jewelry itself. Label ER96999.'
    const correction = photoBlameCorrection({
      text,
      itemNumber: 'ER96205',
    })
    expect(correction).toBe(
      "The label says ER96999. I won't save it on ER96205. Send the label for ER96205.",
    )
    expect(correction).not.toMatch(/artwork/i)
    const scrubber = createRepTextScrubber({
      correctPhotoBlame: (value) =>
        photoBlameCorrection({ text: value, itemNumber: 'ER96205' }),
    })
    expect(scrubber.push(text)).toBe('')
    expect(scrubber.flush()).toBe(correction)
  })
})

describe('round 5 product photo check', () => {
  it('does not call a clear product photo artwork', () => {
    expect(
      photoBlameCorrection({
        text: "This isn't a photo of the earrings.",
        itemNumber: 'ER96203',
        acceptedProductPhoto: true,
      }),
    ).toBe('I have that photo.')
    expect(
      photoBlameCorrection({
        text: "This isn't a photo of the earrings.",
        itemNumber: 'ER96203',
        blurry: true,
      }),
    ).toBe('That photo is too blurry. Send a clearer photo of the jewelry.')
  })
})
