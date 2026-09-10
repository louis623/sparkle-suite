import { describe, expect, it, vi } from 'vitest'
import {
  getOrCreateCalendarWorkflowContext,
  inferCalendarIntent,
  resolveCalendarIntentForTurn,
} from '@/lib/nic-nac/workflows/calendar-workflow-context'

const baseRow = {
  id: '11111111-1111-4111-8111-111111111111',
  rep_id: 'rep-1',
  conversation_id: '22222222-2222-4222-8222-222222222222',
  workflow_type: 'calendar_event_work',
  status: 'active',
  phase: 'details_capture',
  intent: 'add_show',
  known_fields: {
    title: 'BlingKitchen Live',
    platform: 'TikTok',
    eventTime: '2026-07-04T00:00:00.000Z',
    timeZone: 'America/New_York',
    durationMinutes: 150,
  },
  missing_fields: [],
  candidate_event_ids: [],
  last_user_message_id: 'msg-1',
  expires_at: '2026-07-03T02:00:00.000Z',
  created_at: '2026-07-03T00:00:00.000Z',
  updated_at: '2026-07-03T00:01:00.000Z',
}

function makeSupabase(existingRow: unknown = null) {
  const selectChain = {
    select: vi.fn(() => selectChain),
    eq: vi.fn(() => selectChain),
    gt: vi.fn(() => selectChain),
    order: vi.fn(() => selectChain),
    limit: vi.fn(() => selectChain),
    maybeSingle: vi.fn(async () => ({ data: existingRow, error: null })),
    insert: vi.fn(() => selectChain),
    update: vi.fn(() => selectChain),
    single: vi.fn(async () => ({ data: baseRow, error: null })),
  }

  return {
    chain: selectChain,
    supabase: { from: vi.fn(() => selectChain) },
  }
}

describe('calendar workflow context', () => {
  it.each([
    'Hey Nic-Nac, do I have anything on my calendar right now?',
    "What's on my schedule this week?",
    'Do I have a show tonight?',
    'When is my next live?',
  ])('classifies a natural Calendar lookup as list_shows: %s', (text) => {
    expect(
      inferCalendarIntent([
        { id: 'msg-1', role: 'user', parts: [{ type: 'text', text }] },
      ] as never),
    ).toBe('list_shows')
  })

  it('lets an explicit Calendar lookup supersede older add-show language for the turn', () => {
    expect(
      inferCalendarIntent([
        {
          id: 'msg-1',
          role: 'user',
          parts: [{ type: 'text', text: 'Add a show to my calendar Friday.' }],
        },
        {
          id: 'msg-2',
          role: 'assistant',
          parts: [{ type: 'text', text: 'What time should I use?' }],
        },
        {
          id: 'msg-3',
          role: 'user',
          parts: [{ type: 'text', text: 'First, what is on my calendar this week?' }],
        },
      ] as never),
    ).toBe('list_shows')
  })

  it('lets an explicit add request replace an old Calendar read intent', () => {
    expect(
      resolveCalendarIntentForTurn({
        existingIntent: 'list_shows',
        messages: [
          {
            id: 'msg-2',
            role: 'user',
            parts: [
              {
                type: 'text',
                text: 'Cool. Add a show tonight at 7 p.m. Eastern on TikTok.',
              },
            ],
          },
        ] as never,
      }),
    ).toBe('add_show')
  })

  it('lets the latest correction supersede an earlier add-show request', () => {
    expect(
      inferCalendarIntent([
        {
          id: 'msg-1',
          role: 'user',
          parts: [{ type: 'text', text: 'Add weekday shows from 10 a.m. to 4 p.m.' }],
        },
        {
          id: 'msg-2',
          role: 'assistant',
          parts: [{ type: 'text', text: 'I scheduled those shows.' }],
        },
        {
          id: 'msg-3',
          role: 'user',
          parts: [{ type: 'text', text: 'Correction: edit those existing shows to end at 5 p.m.' }],
        },
      ] as never),
    ).toBe('update_show')
  })

  it('continues the existing write intent for a short clarification answer', () => {
    expect(
      resolveCalendarIntentForTurn({
        existingIntent: 'add_show',
        messages: [
          {
            id: 'msg-2',
            role: 'user',
            parts: [{ type: 'text', text: 'TikTok.' }],
          },
        ] as never,
      }),
    ).toBe('add_show')
  })

  it('does not persist a Calendar read as an active workflow', async () => {
    const { supabase, chain } = makeSupabase(null)

    const context = await getOrCreateCalendarWorkflowContext({
      supabase: supabase as never,
      repId: 'rep-1',
      conversationId: baseRow.conversation_id,
      latestUserMessageId: 'msg-read',
      mode: 'workspace',
      nowIso: '2026-07-03T00:30:00.000Z',
      messages: [
        {
          id: 'msg-read',
          role: 'user',
          parts: [{ type: 'text', text: 'Do I have any shows tonight?' }],
        },
      ],
    })

    expect(chain.insert).not.toHaveBeenCalled()
    expect(context.sessionAfter).toBeNull()
    expect(context.activeWorkflow).toBeNull()
  })

  it('pauses an existing Calendar mutation during a read without overwriting it', async () => {
    const { supabase, chain } = makeSupabase(baseRow)

    const context = await getOrCreateCalendarWorkflowContext({
      supabase: supabase as never,
      repId: 'rep-1',
      conversationId: baseRow.conversation_id,
      latestUserMessageId: 'msg-read',
      mode: 'workspace',
      nowIso: '2026-07-03T00:30:00.000Z',
      messages: [
        {
          id: 'msg-read',
          role: 'user',
          parts: [{ type: 'text', text: 'First, what is on my calendar?' }],
        },
      ],
    })

    expect(chain.update).not.toHaveBeenCalled()
    expect(context.sessionAfter?.intent).toBe('add_show')
    expect(context.activeWorkflow).toBeNull()
    expect(context.workflowPromptState).toBe('')
  })

  it('turns an existing active calendar workflow into retained calendar tools', async () => {
    const { supabase } = makeSupabase(baseRow)

    const context = await getOrCreateCalendarWorkflowContext({
      supabase: supabase as never,
      repId: 'rep-1',
      conversationId: baseRow.conversation_id,
      latestUserMessageId: 'msg-2',
      mode: 'workspace',
      nowIso: '2026-07-03T00:30:00.000Z',
      messages: [
        {
          id: 'msg-2',
          role: 'user',
          parts: [{ type: 'text', text: "No, you don't need a short description." }],
        },
      ],
    })

    expect(context.activeWorkflow?.workflowType).toBe('calendar_event_work')
    expect(context.activeWorkflow?.workflowIntents).toEqual(['calendar'])
    expect(context.toolPolicySource).toBe('active_workflow')
    expect(context.workflowPromptState).toContain('Active workflow: calendar_event_work')
    expect(context.workflowPromptState).toContain('Description: optional')
  })

  it('starts a calendar workflow when the latest turn asks for calendar work', async () => {
    const { supabase, chain } = makeSupabase(null)

    const context = await getOrCreateCalendarWorkflowContext({
      supabase: supabase as never,
      repId: 'rep-1',
      conversationId: baseRow.conversation_id,
      latestUserMessageId: 'msg-1',
      mode: 'workspace',
      nowIso: '2026-07-03T00:30:00.000Z',
      messages: [
        {
          id: 'msg-1',
          role: 'user',
          parts: [{ type: 'text', text: 'Add a show to my calendar this Friday.' }],
        },
      ],
    })

    expect(chain.insert).toHaveBeenCalledWith({
      rep_id: 'rep-1',
      conversation_id: baseRow.conversation_id,
      last_user_message_id: 'msg-1',
    })
    expect(context.activeWorkflow?.workflowIntents).toEqual(['calendar'])
  })

  it('does not create calendar workflow context in required setup mode', async () => {
    const { supabase, chain } = makeSupabase(null)

    const context = await getOrCreateCalendarWorkflowContext({
      supabase: supabase as never,
      repId: 'rep-1',
      conversationId: baseRow.conversation_id,
      mode: 'required_setup',
      nowIso: '2026-07-03T00:30:00.000Z',
      messages: [
        {
          id: 'msg-1',
          role: 'user',
          parts: [{ type: 'text', text: 'Add a show to my calendar.' }],
        },
      ],
    })

    expect(chain.insert).not.toHaveBeenCalled()
    expect(context.activeWorkflow).toBeNull()
    expect(context.workflowIntents).toEqual([])
  })
})
