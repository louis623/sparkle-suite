import { describe, expect, it, vi } from 'vitest'
import {
  clearActiveConversationsForRep,
  getLatestConversationId,
  loadCanonicalHistory,
} from '@/lib/nic-nac/persistence'

describe('Nic-Nac cleared conversation persistence', () => {
  it('clears only the open chat and leaves earlier chats in Recent', async () => {
    const complete = Promise.resolve({
      data: [
        { conversation_id: 'conversation-current' },
        { conversation_id: 'conversation-old' },
        { conversation_id: 'conversation-current' },
      ],
      error: null,
    })
    const query = {
      update: vi.fn(),
      eq: vi.fn(),
      is: vi.fn(),
      select: vi.fn(),
    }
    query.update.mockReturnValue(query)
    query.eq.mockReturnValue(query)
    query.is.mockReturnValue(complete)
    query.is.mockReturnValue(query)
    query.select.mockReturnValue(complete)
    const supabase = { from: vi.fn(() => query) }

    await expect(
      clearActiveConversationsForRep(
        supabase as never,
        'rep-1',
        'conversation-current',
      ),
    ).resolves.toEqual(['conversation-current', 'conversation-old'])

    expect(supabase.from).toHaveBeenCalledWith('nic_nac_conversations')
    expect(query.update).toHaveBeenCalledWith(
      expect.objectContaining({ cleared_at: expect.any(String) }),
    )
    expect(query.eq).toHaveBeenCalledWith('rep_id', 'rep-1')
    expect(query.eq).toHaveBeenCalledWith('conversation_id', 'conversation-current')
    expect(query.is).toHaveBeenCalledWith('cleared_at', null)
    expect(query.select).toHaveBeenCalledWith('conversation_id')
  })

  it('does not select a cleared thread as the rep’s latest conversation', async () => {
    const complete = Promise.resolve({
      data: { conversation_id: 'active-conversation' },
      error: null,
    })
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      is: vi.fn(),
      order: vi.fn(),
      limit: vi.fn(),
      maybeSingle: vi.fn(),
    }
    query.select.mockReturnValue(query)
    query.eq.mockReturnValue(query)
    query.is.mockReturnValue(query)
    query.order.mockReturnValue(query)
    query.limit.mockReturnValue(query)
    query.maybeSingle.mockReturnValue(complete)
    const supabase = { from: vi.fn(() => query) }

    await expect(getLatestConversationId(supabase as never, 'rep-1')).resolves.toBe(
      'active-conversation',
    )
    expect(query.is).toHaveBeenCalledWith('cleared_at', null)
  })

  it('does not hydrate a cleared thread from a stale conversation URL', async () => {
    const rows = [
      {
        message_id: 'message-1',
        role: 'user',
        parts: [{ type: 'text', text: 'old message' }],
        status: 'complete',
        created_at: '2026-08-16T12:00:00.000Z',
        cleared_at: '2026-08-16T12:05:00.000Z',
      },
    ]
    const complete = Promise.resolve({ data: rows, error: null })
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      order: vi.fn(),
    }
    query.select.mockReturnValue(query)
    query.eq.mockReturnValue(query)
    query.order.mockReturnValue(complete)
    const supabase = { from: vi.fn(() => query) }

    await expect(loadCanonicalHistory(supabase as never, 'conversation-1')).resolves.toEqual([])
  })
})
