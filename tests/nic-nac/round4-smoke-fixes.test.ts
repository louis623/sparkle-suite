import { describe, expect, it } from 'vitest'
import type { UIMessage } from 'ai'
import { relativeTimeLabel } from '@/app/nic-nac/components/RelativeTime'
import {
  freshChatNotice,
} from '@/lib/nic-nac/piece-task'
import {
  clearNicNacConversationChain,
  listRecentNicNacConversations,
} from '@/lib/nic-nac/persistence'
import {
  recentConversationsFromRows,
  stableRecentTitle,
} from '@/lib/nic-nac/recent-conversations'
import { buildNicNacRolloverMessages } from '@/lib/nic-nac/rollover'
import {
  createRepTextScrubber,
  scrubInternalCatalogPhrases,
} from '@/lib/nic-nac/core/stream-output-guard'
import { correctJewelryVersusLabelPhotos } from '@/lib/nic-nac/workflows/jewelry-main-photo'
import { renderItemNumberPng } from '@/lib/nic-nac/workflows/label-item-number'
import { getOrCreateTradeBoardIntakeContext } from '@/lib/nic-nac/workflows/trade-board-intake-context'
import { NIC_NAC_SYSTEM_PROMPT } from '@/lib/nic-nac/system-prompt'

describe('round 4 jewelry photo versus label', () => {
  it('treats the photo that prints an item number as the label', async () => {
    const labelPng = await renderItemNumberPng('ER95204')
    const photos = await correctJewelryVersusLabelPhotos([
      {
        imageUrl: `data:image/png;base64,${labelPng.toString('base64')}`,
        declaredRole: 'jewelry_front',
        visualRole: 'jewelry',
      },
      {
        imageUrl: 'data:image/jpeg;base64,TkVX',
        declaredRole: 'label_details',
        visualRole: 'label_or_packaging',
      },
    ])
    expect(photos[0]?.declaredRole).toBe('label_details')
    expect(photos[1]?.declaredRole).toBe('jewelry_front')
  })
})

describe('round 4 fresh chat', () => {
  it('says a fresh chat started once and keeps the details', () => {
    const notice = freshChatNotice({
      itemNumber: 'RG95106',
      ringSize: '7',
      rarity: 'diamond',
      material: 'Silver',
    })
    expect(notice).toBe(
      'I started a fresh chat. I still have RG95106, size 7, Diamond, Silver. Want to finish RG95106? Send the photo again.',
    )
    expect(notice).not.toMatch(/catalog record|shared catalog/i)
    const rolled = buildNicNacRolloverMessages(
      [
        {
          id: 'claim-1',
          role: 'assistant',
          parts: [{ type: 'text', text: 'I have the photo. This is the main photo I will save.' }],
        },
        {
          id: 'claim-2',
          role: 'assistant',
          parts: [{ type: 'text', text: 'That earlier photo was not brought into this chat.' }],
        },
        {
          id: 'claim-3',
          role: 'assistant',
          parts: [{ type: 'text', text: 'I got the picture you sent.' }],
        },
      ] as UIMessage[],
      12,
      {
        dropPendingPiece: true,
        unfinishedItemNumber: 'RG95106',
        carriedDetails: { ringSize: '7', rarity: 'diamond' },
      },
    )
    const text = JSON.stringify(rolled)
    expect(text.match(/I started a fresh chat/g)?.length).toBe(1)
    expect(text).toContain('size 7')
    expect(text).toContain('Diamond')
    expect(text).not.toContain('That earlier photo was not brought into this chat.')
  })
})

describe('round 4 rep-facing wording', () => {
  it('removes catalog record and shared catalog from replies', () => {
    expect(NIC_NAC_SYSTEM_PROMPT).toContain('Never say "catalog record" or "shared catalog"')
    expect(scrubInternalCatalogPhrases('I found a matching catalog record in the shared catalog.')).toBe(
      'I found a matching piece in the design list.',
    )
    const scrubber = createRepTextScrubber()
    const parts = ['I need the ', 'shared ', 'catalog name.']
    const emitted = parts.map((part) => scrubber.push(part)).join('') + scrubber.flush()
    expect(emitted).toBe('I need the design list name.')
    expect(emitted).not.toMatch(/catalog record|shared catalog/i)
  })
})

describe('round 4 timestamps and clear', () => {
  it('does not call an old message just now before the clock starts', () => {
    const then = Date.now() - 2 * 60 * 60 * 1000
    expect(relativeTimeLabel(then, null)).not.toBe('just now')
    expect(relativeTimeLabel(then, Date.now())).toBe('2h ago')
  })

  it('keeps the open chat in Recent and opens an empty chat', async () => {
    const cleared: string[] = []
    const upserts: Array<Record<string, unknown>> = []
    const supabase = {
      from: () => {
        const query: Record<string, unknown> = {}
        const chain = () => query
        query.update = chain
        query.eq = (column: string, value: string) => {
          if (column === 'conversation_id') cleared.push(value)
          return query
        }
        query.is = chain
        query.select = () =>
          Promise.resolve({
            data: cleared.slice(-1).map((conversation_id) => ({ conversation_id })),
            error: null,
          })
        query.upsert = (row: Record<string, unknown>) => {
          upserts.push(row)
          return Promise.resolve({ error: null })
        }
        return query
      },
    }
    const admin = {
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: () =>
                Promise.resolve({
                  data: [
                    {
                      source_conversation_id: 'pre-rollover',
                      destination_conversation_id: 'after-rollover',
                    },
                  ],
                  error: null,
                }),
            }),
          }),
        }),
      }),
    }
    await expect(
      clearNicNacConversationChain(
        supabase as never,
        admin as never,
        'rep-1',
        'after-rollover',
        'fresh-chat',
      ),
    ).resolves.toEqual([])
    expect(cleared).toEqual([])
    expect(upserts[0]).toMatchObject({
      conversation_id: 'fresh-chat',
      role: 'assistant',
      status: 'pending',
    })
  })
})

describe('round 4 recent conversations', () => {
  it('keeps a stable title from the first piece, not the newest yes', () => {
    expect(stableRecentTitle(['yes', 'Reference photo 11', 'Add ER95204'], '2026-10-21T15:00:00.000Z')).toBe(
      'Add ER95204',
    )
    const rows = [
      {
        conversation_id: 'burst',
        role: 'user',
        parts: [{ type: 'text', text: 'Add ER95204' }],
        created_at: '2026-10-21T15:00:00.000Z',
      },
      ...Array.from({ length: 90 }, (_, index) => ({
        conversation_id: 'burst',
        role: 'user',
        parts: [{ type: 'text', text: index % 2 === 0 ? 'yes' : `Reference photo ${index}` }],
        created_at: `2026-10-21T16:${String(index % 60).padStart(2, '0')}:00.000Z`,
      })),
      {
        conversation_id: 'older',
        role: 'user',
        parts: [{ type: 'text', text: 'Where is my show?' }],
        created_at: '2026-10-20T15:00:00.000Z',
      },
    ]
    const listed = recentConversationsFromRows(rows, 5)
    expect(listed.map((item) => item.conversationId)).toEqual(['burst', 'older'])
    expect(listed[0]?.title).toBe('Add ER95204')
  })

  it('finds conversations outside the newest 80 messages', async () => {
    const scan = [
      ...Array.from({ length: 80 }, (_, index) => ({
        conversation_id: 'burst',
        created_at: `2026-10-21T18:${String(index % 60).padStart(2, '0')}:00.000Z`,
      })),
      {
        conversation_id: 'older',
        created_at: '2026-10-20T15:00:00.000Z',
      },
    ]
    const users: Record<string, Array<{ parts: unknown; created_at: string }>> = {
      burst: [
        {
          parts: [{ type: 'text', text: 'Add NK95301' }],
          created_at: '2026-10-21T12:00:00.000Z',
        },
        {
          parts: [{ type: 'text', text: 'yes' }],
          created_at: '2026-10-21T18:00:00.000Z',
        },
      ],
      older: [
        {
          parts: [{ type: 'text', text: 'Where is my show?' }],
          created_at: '2026-10-20T15:00:00.000Z',
        },
      ],
    }
    let conversationId = ''
    const query: Record<string, unknown> = {}
    const chain = () => query
    query.select = chain
    query.eq = (column: string, value: string) => {
      if (column === 'conversation_id') conversationId = value
      return query
    }
    query.is = chain
    query.order = chain
    query.range = () => Promise.resolve({ data: scan, error: null })
    query.limit = () =>
      Promise.resolve({ data: users[conversationId] ?? [], error: null })
    const supabase = { from: () => query }
    const listed = await listRecentNicNacConversations(supabase as never, 'rep-1', 5)
    expect(listed.map((item) => item.conversationId)).toEqual(['burst', 'older'])
    expect(listed[0]?.title).toBe('Add NK95301')
  })
})

describe('round 4 skip after save', () => {
  it('says the piece is already on the Dance Floor', async () => {
    const supabase = {
      from: () => {
        const query: Record<string, unknown> = {}
        const chain = () => query
        query.select = chain
        query.eq = chain
        query.in = chain
        query.order = chain
        query.limit = chain
        query.maybeSingle = async () => ({
          data: { metadata: { priorPieceNotes: ['Saved ER95204 earrings'] } },
          error: null,
        })
        return query
      },
    }
    const result = await getOrCreateTradeBoardIntakeContext({
      supabase: supabase as never,
      repId: 'rep-1',
      conversationId: 'conv-1',
      messages: [
        {
          id: 'skip-1',
          role: 'user',
          parts: [{ type: 'text', text: 'skip' }],
        },
      ] as UIMessage[],
      mode: 'workspace',
      nowIso: '2026-10-22T00:00:00.000Z',
      preloadedSession: null,
    })
    expect(result.workflowPromptState).toContain('already on the Dance Floor')
    expect(result.workflowPromptState).toContain('remove_listing')
    expect(result.workflowPromptState).not.toMatch(/won't be saved|will not be saved/i)
  })
})
