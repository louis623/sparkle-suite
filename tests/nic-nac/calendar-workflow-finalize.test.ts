import { describe, expect, it, vi } from 'vitest'

import { finalizeCalendarWorkflowAfterWrite } from '@/lib/nic-nac/workflows/calendar-workflow-finalize'

function makeWorkflow() {
  return {
    id: 'calendar-workflow-1',
    repId: 'rep-1',
    conversationId: 'conv-1',
    workflowType: 'calendar_event_work',
    status: 'active',
    phase: 'ready_to_add',
    intent: 'add_show',
    knownFields: { title: 'Coffee and Fizz' },
    missingFields: [],
    candidateEventIds: [],
    expiresAt: '2099-01-01T00:00:00.000Z',
    createdAt: '2099-01-01T00:00:00.000Z',
    updatedAt: '2099-01-01T00:00:00.000Z',
  } as const
}

function makeSupabase() {
  const single = vi.fn(() =>
    Promise.resolve({
      data: {
        id: 'calendar-workflow-1',
        rep_id: 'rep-1',
        conversation_id: 'conv-1',
        workflow_type: 'calendar_event_work',
        status: 'completed',
        phase: 'completed',
        intent: 'add_show',
        known_fields: {},
        missing_fields: [],
        candidate_event_ids: ['event-1', 'event-2'],
        last_user_message_id: null,
        expires_at: '2099-01-01T00:00:00.000Z',
        created_at: '2099-01-01T00:00:00.000Z',
        updated_at: '2099-01-01T00:00:00.000Z',
      },
      error: null,
    }),
  )
  const select = vi.fn(() => ({ single }))
  const eq = vi.fn(() => chain)
  const chain = { eq, select }
  const update = vi.fn(() => chain)
  const from = vi.fn(() => ({ update }))
  return { client: { from } as never, from, update, eq }
}

describe('calendar workflow finalization', () => {
  it('marks active calendar workflows completed after successful calendar writes', async () => {
    const supabase = makeSupabase()

    await finalizeCalendarWorkflowAfterWrite({
      toolName: 'add_show',
      ctx: {
        repId: 'rep-1',
        supabase: supabase.client,
        conversationId: 'conv-1',
        runId: 'run-1',
        activeCalendarWorkflow: makeWorkflow(),
      },
      output: {
        count: 2,
        firstEvent: { id: 'event-1', title: 'Coffee and Fizz' },
        lastEvent: { id: 'event-2', title: 'Coffee and Fizz' },
      },
    })

    const updatePayload = supabase.update.mock.calls[0][0]
    expect(updatePayload).toMatchObject({
      status: 'completed',
      phase: 'completed',
      missing_fields: [],
      candidate_event_ids: ['event-1', 'event-2'],
      known_fields: {
        title: 'Coffee and Fizz',
        completedToolName: 'add_show',
        resultEventIds: ['event-1', 'event-2'],
        resultCount: 2,
      },
    })
    expect(supabase.eq).toHaveBeenCalledWith('id', 'calendar-workflow-1')
    expect(supabase.eq).toHaveBeenCalledWith('rep_id', 'rep-1')
  })

  it('does not finalize read-only calendar tools', async () => {
    const supabase = makeSupabase()

    await finalizeCalendarWorkflowAfterWrite({
      toolName: 'list_my_shows',
      ctx: {
        repId: 'rep-1',
        supabase: supabase.client,
        conversationId: 'conv-1',
        runId: 'run-1',
        activeCalendarWorkflow: makeWorkflow(),
      },
      output: {},
    })

    expect(supabase.update).not.toHaveBeenCalled()
  })
})
