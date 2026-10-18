import { beforeEach, describe, expect, it, vi } from 'vitest'

const getLatestConversationIdMock = vi.fn()
const randomUUIDMock = vi.fn(() => 'conv-new')

vi.mock('crypto', () => ({
  randomUUID: () => randomUUIDMock(),
}))

vi.mock('@/lib/nic-nac/persistence', () => ({
  getLatestConversationId: (...args: unknown[]) =>
    getLatestConversationIdMock(...args),
}))

import { notifyRepOfTradeRequest } from '@/lib/nic-nac/trade-request-notifications'
import { isTradeRequestCardPart } from '@/lib/nic-nac/trade-request-card-parts'

describe('notifyRepOfTradeRequest', () => {
  const upsert = vi.fn()
  const supabase = {
    from: vi.fn(() => ({ upsert })),
  } as unknown as {
    from: typeof upsert
  }

  beforeEach(() => {
    getLatestConversationIdMock.mockReset()
    randomUUIDMock.mockClear()
    upsert.mockReset()
  })

  it('writes a complete assistant message into the rep\'s latest conversation', async () => {
    getLatestConversationIdMock.mockResolvedValueOnce('conv-1')
    upsert.mockResolvedValueOnce({ error: null })

    await notifyRepOfTradeRequest(supabase as never, {
      requestId: 'req-1',
      repId: 'rep-1',
      customerName: 'Alice',
      customerDescription: 'Trading a birthday ring, size 8',
      listing: {
        id: 'listing-1',
        itemNumber: 'RG31452',
        designName: 'The Celeste Ring',
        collectionName: 'Birthday',
        typePrefix: 'RG',
        bpMsrp: 128,
      },
    })

    expect(getLatestConversationIdMock).toHaveBeenCalledWith(
      supabase,
      'rep-1',
    )
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        conversation_id: 'conv-1',
        message_id: 'trade-request-req-1',
        rep_id: 'rep-1',
        role: 'assistant',
        status: 'complete',
        parts: [
          {
            type: 'text',
            text: expect.stringContaining('New swap request from Alice'),
          },
          {
            type: 'data-trade-request-card',
            data: expect.objectContaining({
              requestId: 'req-1',
              status: 'pending',
              customerName: 'Alice',
              requestedItem: {
                itemNumber: 'RG31452',
                designName: 'The Celeste Ring',
                typePrefix: 'RG',
                collectionName: 'Birthday',
                bpMsrp: 128,
              },
              offeredText: 'Trading a birthday ring, size 8',
              ruleCheck: {
                status: 'needs_review',
                label: 'Compare against RG / Birthday',
                description: expect.stringContaining('free text'),
              },
            }),
          },
        ],
      }),
      { onConflict: 'conversation_id,message_id', ignoreDuplicates: true },
    )

    const payload = upsert.mock.calls[0][0] as {
      parts: Array<{
        type: string
        text?: string
        data?: { ruleCheck: { description: string } }
      }>
    }
    expect(payload.parts[0].text).toContain('Birthday')
    expect(payload.parts[0].text).toContain('RG')
    expect(payload.parts[0].text).toContain('MSRP is reference only')
    expect(payload.parts[1].data?.ruleCheck.description).toContain(
      'same type and collection',
    )
    expect(isTradeRequestCardPart(payload.parts[0])).toBe(false)
    expect(isTradeRequestCardPart(payload.parts[1])).toBe(true)
  })

  it('creates a fresh conversation id when the rep has no existing Nic-Nac thread yet', async () => {
    getLatestConversationIdMock.mockResolvedValueOnce(null)
    upsert.mockResolvedValueOnce({ error: null })

    await notifyRepOfTradeRequest(supabase as never, {
      requestId: 'req-1',
      repId: 'rep-1',
      customerName: 'Alice',
      customerDescription: 'Trading a birthday ring, size 8',
      listing: {
        id: 'listing-1',
        itemNumber: 'RG31452',
        designName: 'The Celeste Ring',
        collectionName: 'Birthday',
        typePrefix: 'RG',
        bpMsrp: 128,
      },
    })

    expect(randomUUIDMock).toHaveBeenCalledTimes(1)
    expect(upsert.mock.calls[0][0]).toMatchObject({
      conversation_id: 'conv-new',
    })
  })
})
