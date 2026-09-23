import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { listRepConversations } from '@/lib/services/workspace-conversations'

describe('canonical workspace conversation data service', () => {
  it('uses the joined database page and preserves its exact unread total', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'conversation-150',
          conversation_type: 'support',
          state: 'open',
          subject: 'A matching thread beyond the former membership cap',
          context_snapshot: {},
          last_message_at: '2026-08-26T15:00:00.000Z',
          latest_message_preview: 'Please help',
          latest_message_sender_display_name: 'Avery',
          updated_at: '2026-08-26T15:00:00.000Z',
          participant_id: 'participant-row-150',
          participant_role: 'requester',
          participant_membership_state: 'active',
          participant_last_read_at: null,
          participant_archived_at: null,
          participant_muted_at: null,
          participant_unread_count: 2,
          total_unread: '137',
        },
      ],
      error: null,
    })
    const supabase = { rpc } as never

    const result = await listRepConversations(supabase, 'rep-1', {
      view: 'support',
      limit: 250,
    })

    expect(rpc).toHaveBeenCalledWith('list_workspace_rep_conversation_page', {
      p_rep_id: 'rep-1',
      p_conversation_type: 'support',
      p_archived: false,
      p_limit: 250,
      p_before_last_message_at: null,
      p_before_id: null,
      p_equal_timestamp_mode: null,
    })
    expect(result.unreadCount).toBe(137)
    expect(result.messages).toEqual([
      expect.objectContaining({
        id: 'conversation-150',
        conversationType: 'support',
        unreadCount: 2,
      }),
    ])
  })

  it('does not infer unread from a truncated page', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [], error: null })
    const result = await listRepConversations({ rpc } as never, 'rep-1', {
      view: 'team',
    })

    expect(result).toEqual({ messages: [], unreadCount: 0, nextCursor: null })
  })

  it('searches within the rep membership page and keeps the onboarding person stable after a lead reply', async () => {
    const rpc = vi.fn(async (name: string) => name === 'workspace_rep_conversation_page_metadata'
      ? { data: [{ conversation_id: 'team-1', participant_name: 'Taylor Brooks', needs_reply: false }], error: null }
      : { data: [{
          id: 'team-1', conversation_type: 'team_onboarding', state: 'open',
          subject: 'New Rep Onboarding: Taylor Brooks', context_snapshot: {},
          last_message_at: '2026-09-23T12:00:00Z', latest_message_preview: 'I will help',
          latest_message_sender_display_name: 'Team lead', updated_at: '2026-09-23T12:00:00Z',
          participant_id: 'membership-1', participant_role: 'team_lead',
          participant_membership_state: 'active', participant_last_read_at: null,
          participant_archived_at: null, participant_muted_at: null,
          participant_unread_count: 0, total_unread: 0,
        }], error: null })
    const result = await listRepConversations({ rpc } as never, 'rep-1', {
      view: 'team', search: 'Taylor', limit: 50,
      beforeLastMessageAt: '2026-09-24T00:00:00Z', beforeId: 'team-2',
    })
    expect(rpc).toHaveBeenCalledWith('search_workspace_rep_conversation_page', {
      p_rep_id: 'rep-1', p_conversation_type: 'team_onboarding',
      p_archived: false, p_search: 'Taylor', p_needs_reply: false,
      p_limit: 50, p_before_last_message_at: '2026-09-24T00:00:00Z',
      p_before_id: 'team-2', p_equal_timestamp_mode: 'same_kind',
    })
    expect(result.messages[0]).toEqual(expect.objectContaining({
      senderDisplayName: 'Taylor Brooks', participantLabels: ['Taylor Brooks'],
      needsReply: false,
    }))
  })

  it('delegates Needs reply filtering before pagination and exposes latest inbound state', async () => {
    const rpc = vi.fn(async (name: string) => name === 'workspace_rep_conversation_page_metadata'
      ? { data: [{ conversation_id: 'team-2', participant_name: 'Taylor Brooks', needs_reply: true }], error: null }
      : { data: [{
          id: 'team-2', conversation_type: 'team_onboarding', state: 'open',
          subject: 'New Rep Onboarding: Taylor Brooks', context_snapshot: {},
          last_message_at: '2026-09-23T13:00:00Z', latest_message_preview: 'One more question',
          latest_message_sender_display_name: 'Taylor Brooks', updated_at: '2026-09-23T13:00:00Z',
          participant_id: 'membership-2', participant_role: 'team_lead',
          participant_membership_state: 'active', participant_last_read_at: '2026-09-23T13:01:00Z',
          participant_archived_at: null, participant_muted_at: null,
          participant_unread_count: 0, total_unread: 0,
        }], error: null })
    const result = await listRepConversations({ rpc } as never, 'rep-1', {
      view: 'needs_reply', needsReply: true,
    })
    expect(rpc).toHaveBeenCalledWith('search_workspace_rep_conversation_page',
      expect.objectContaining({ p_needs_reply: true, p_search: null }))
    expect(result.messages[0].needsReply).toBe(true)
    expect(result.messages[0].unreadCount).toBe(0)
  })
})
