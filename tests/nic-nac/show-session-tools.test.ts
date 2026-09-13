import { beforeEach, describe, expect, it, vi } from 'vitest'

const startNicNacShowSessionMock = vi.fn()
const loadActiveNicNacShowSessionMock = vi.fn()
const recordNicNacShowSessionEventMock = vi.fn()
const loadNicNacShowSessionContextMock = vi.fn()
const startShowMock = vi.fn()

vi.mock('@/lib/nic-nac/show-sessions', async () => {
  const actual = await vi.importActual<typeof import('@/lib/nic-nac/show-sessions')>(
    '@/lib/nic-nac/show-sessions',
  )
  return {
    ...actual,
    startNicNacShowSession: (...args: unknown[]) =>
      startNicNacShowSessionMock(...args),
    loadActiveNicNacShowSession: (...args: unknown[]) =>
      loadActiveNicNacShowSessionMock(...args),
    recordNicNacShowSessionEvent: (...args: unknown[]) =>
      recordNicNacShowSessionEventMock(...args),
    loadNicNacShowSessionContext: (...args: unknown[]) =>
      loadNicNacShowSessionContextMock(...args),
  }
})

vi.mock('@/lib/nic-nac/guardian-telemetry', () => ({
  logIncident: vi.fn(),
  logToolExecution: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/services/calendar', () => ({
  startShow: (...args: unknown[]) => startShowMock(...args),
}))

import { buildAllTools } from '@/lib/nic-nac/tools'
import { makeGetShowSessionContextTool } from '@/lib/nic-nac/tools/get-show-session-context'
import { makeRecordShowSessionEventTool } from '@/lib/nic-nac/tools/record-show-session-event'
import { makeStartShowSessionTool } from '@/lib/nic-nac/tools/start-show-session'
import { NIC_NAC_SYSTEM_PROMPT } from '@/lib/nic-nac/system-prompt'

interface ToolDef {
  execute: (input: unknown) => Promise<Record<string, unknown>>
}

function makeCtx() {
  return {
    repId: 'rep-1',
    supabase: { marker: 'supabase' } as never,
    conversationId: 'conv-1',
    runId: 'run-1',
  }
}

beforeEach(() => {
  startNicNacShowSessionMock.mockReset()
  loadActiveNicNacShowSessionMock.mockReset()
  loadActiveNicNacShowSessionMock.mockResolvedValue(null)
  recordNicNacShowSessionEventMock.mockReset()
  loadNicNacShowSessionContextMock.mockReset()
  startShowMock.mockReset()
})

describe('Nic-Nac show-session tools', () => {
  it('starts a show session using the authenticated rep and current conversation context', async () => {
    startShowMock.mockResolvedValueOnce({
      event: {
        id: 'event-1',
        status: 'live',
      },
    })
    startNicNacShowSessionMock.mockResolvedValueOnce({
      id: 'session-1',
      repId: 'rep-1',
      status: 'active',
    })
    const tool = makeStartShowSessionTool(makeCtx()) as unknown as ToolDef

    const result = await tool.execute({
      calendarEventId: 'event-1',
      liveQueueSyncCode: 'SYNC123',
      metadata: { platform: 'TikTok' },
    })

    expect(startNicNacShowSessionMock).toHaveBeenCalledWith(
      { marker: 'supabase' },
      {
        repId: 'rep-1',
        calendarEventId: 'event-1',
        liveQueueSyncCode: 'SYNC123',
        replaceActiveSession: false,
        expectedActiveSessionId: undefined,
        metadata: {
          platform: 'TikTok',
          conversationId: 'conv-1',
          runId: 'run-1',
        },
      },
    )
    expect(startShowMock).toHaveBeenCalledWith(
      { marker: 'supabase' },
      'rep-1',
      'event-1',
    )
    expect(result).toMatchObject({ id: 'session-1', status: 'active' })
  })

  it('auto-anchors a show session when no calendar or live queue id is available', async () => {
    startNicNacShowSessionMock.mockResolvedValueOnce({
      id: 'session-1',
      repId: 'rep-1',
      status: 'active',
      liveQueueSyncCode: 'NIC-NAC-AUTO-conv-1',
    })
    const tool = makeStartShowSessionTool(makeCtx()) as unknown as ToolDef

    await tool.execute({})

    expect(startShowMock).not.toHaveBeenCalled()
    expect(startNicNacShowSessionMock).toHaveBeenCalledWith(
      { marker: 'supabase' },
      {
        repId: 'rep-1',
        calendarEventId: undefined,
        liveQueueSyncCode: 'NIC-NAC-AUTO-conv-1',
        replaceActiveSession: false,
        expectedActiveSessionId: undefined,
        metadata: {
          autoAnchor: true,
          conversationId: 'conv-1',
          runId: 'run-1',
        },
      },
    )
  })

  it('records a show-session event with conversation and run correlation', async () => {
    recordNicNacShowSessionEventMock.mockResolvedValueOnce({
      id: 'event-row-1',
      repId: 'rep-1',
      eventType: 'follow_up',
    })
    const tool = makeRecordShowSessionEventTool(makeCtx()) as unknown as ToolDef

    const result = await tool.execute({
      sessionId: 'session-1',
      eventType: 'follow_up',
      summary: 'Ask Jamie about the blue ring after the show.',
      payload: { customerName: 'Jamie' },
    })

    expect(recordNicNacShowSessionEventMock).toHaveBeenCalledWith(
      { marker: 'supabase' },
      {
        sessionId: 'session-1',
        repId: 'rep-1',
        eventType: 'follow_up',
        summary: 'Ask Jamie about the blue ring after the show.',
        payload: { customerName: 'Jamie' },
        conversationId: 'conv-1',
        runId: 'run-1',
      },
    )
    expect(result).toMatchObject({ id: 'event-row-1', eventType: 'follow_up' })
  })

  it('gets current show context as a read-only internal tool', async () => {
    loadNicNacShowSessionContextMock.mockResolvedValueOnce({
      activeSession: null,
      recentEvents: [],
      memory: {
        preferences: [],
        showProcesses: [],
        customerPatterns: [],
        followUps: [],
        previousShowSummaries: [],
        guarded: [],
      },
    })
    const tool = makeGetShowSessionContextTool(makeCtx()) as unknown as ToolDef

    await tool.execute({})

    expect(loadNicNacShowSessionContextMock).toHaveBeenCalledWith(
      { marker: 'supabase' },
      'rep-1',
      { eventLimit: 20, memoryLimit: 10, loadEffectiveLineup: expect.any(Function) },
    )
  })

  it('registers show-session tools and documents the no-provider smoke boundary', () => {
    const tools = buildAllTools(makeCtx())
    expect(Object.keys(tools)).toEqual(
      expect.arrayContaining([
        'start_show_session',
        'end_show',
        'record_show_session_event',
        'get_show_session_context',
      ]),
    )
    expect(NIC_NAC_SYSTEM_PROMPT).toContain(
      "You have a scoped set of workspace tools available when the rep's request calls for them:",
    )
    expect(NIC_NAC_SYSTEM_PROMPT).toContain('get_show_session_context')
    expect(NIC_NAC_SYSTEM_PROMPT).toContain('end_show')
    expect(NIC_NAC_SYSTEM_PROMPT).toContain('record_show_session_event')
  })

  it('refuses to replace a different active show without rep approval', async () => {
    loadActiveNicNacShowSessionMock.mockResolvedValueOnce({
      id: 'session-existing',
      repId: 'rep-1',
      calendarEventId: 'event-existing',
      liveQueueSyncCode: 'SYNC-OLD',
      status: 'active',
    })
    const tool = makeStartShowSessionTool(makeCtx()) as unknown as ToolDef

    await expect(
      tool.execute({
        calendarEventId: 'event-new',
        liveQueueSyncCode: 'SYNC-NEW',
        replaceActiveSession: false,
      }),
    ).rejects.toMatchObject({ code: 'show_session_conflict' })

    expect(startShowMock).not.toHaveBeenCalled()
    expect(startNicNacShowSessionMock).not.toHaveBeenCalled()
  })

  it('requires approval only when replacing a different active show', async () => {
    const tool = makeStartShowSessionTool(makeCtx()) as unknown as ToolDef & {
      needsApproval: (input: { replaceActiveSession: boolean }) => boolean
    }

    expect(tool.needsApproval({ replaceActiveSession: false })).toBe(false)
    expect(tool.needsApproval({ replaceActiveSession: true })).toBe(true)
  })
})
