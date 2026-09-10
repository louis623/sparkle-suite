import { describe, it, expect, vi, beforeEach } from 'vitest'
import { errors } from '@/lib/services/errors'

const addShowMock = vi.fn()
const listMyShowsMock = vi.fn()
const updateShowMock = vi.fn()
const cancelShowMock = vi.fn()
const cancelShowSeriesFutureMock = vi.fn()
const pauseShowSeriesUntilMock = vi.fn()
const endShowMock = vi.fn()
const writeTradeActionAuditMock = vi.fn()
const logIncidentMock = vi.fn()

vi.mock('@/lib/services/calendar', () => ({
  addShow: (...args: unknown[]) => addShowMock(...args),
  listMyShows: (...args: unknown[]) => listMyShowsMock(...args),
  updateShow: (...args: unknown[]) => updateShowMock(...args),
  cancelShow: (...args: unknown[]) => cancelShowMock(...args),
  cancelShowSeriesFuture: (...args: unknown[]) => cancelShowSeriesFutureMock(...args),
  pauseShowSeriesUntil: (...args: unknown[]) => pauseShowSeriesUntilMock(...args),
  endShow: (...args: unknown[]) => endShowMock(...args),
}))

vi.mock('@/lib/nic-nac/audit', () => ({
  writeTradeActionAudit: (...args: unknown[]) =>
    writeTradeActionAuditMock(...args),
}))

vi.mock('@/lib/nic-nac/guardian-telemetry', () => ({
  logIncident: (...args: unknown[]) => logIncidentMock(...args),
  logToolExecution: vi.fn().mockResolvedValue(undefined),
}))

import { makeAddShowTool } from '@/lib/nic-nac/tools/add-show'
import { makeListMyShowsTool } from '@/lib/nic-nac/tools/list-my-shows'
import { makeUpdateShowTool } from '@/lib/nic-nac/tools/update-show'
import { makeCancelShowTool } from '@/lib/nic-nac/tools/cancel-show'
import { makeSkipShowOccurrenceTool } from '@/lib/nic-nac/tools/skip-show-occurrence'
import { makeCancelShowSeriesTool } from '@/lib/nic-nac/tools/cancel-show-series'
import { makePauseShowSeriesTool } from '@/lib/nic-nac/tools/pause-show-series'
import { makeEndShowTool } from '@/lib/nic-nac/tools/end-show'
import { buildAllTools } from '@/lib/nic-nac/tools'
import { NIC_NAC_SYSTEM_PROMPT } from '@/lib/nic-nac/system-prompt'
import { APPROVAL_COPY } from '@/app/nic-nac/components/HITLBlock'

interface ToolDef {
  execute: (input: unknown) => Promise<Record<string, unknown>>
  needsApproval?: boolean
}

const VALID_EVENT_ID = '11111111-1111-4111-8111-111111111111'

function calendarEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: VALID_EVENT_ID,
    repId: 'rep-1',
    platform: 'TikTok',
    eventTime: '2099-05-01T20:00:00.000Z',
    timeZone: 'America/New_York',
    durationMinutes: 60,
    title: 'Friday Sparkles',
    description: 'Main show',
    discountCodes: [{ code: 'SPARKLE10', description: 'Ten percent off' }],
    featuredCollections: ['Celestial'],
    isRecurring: false,
    recurrenceGroupId: null,
    recurrenceRule: null,
    status: 'scheduled',
    createdAt: '2099-04-01T12:00:00.000Z',
    updatedAt: '2099-04-01T12:00:00.000Z',
    ...overrides,
  }
}

function makeCtx() {
  return {
    repId: 'rep-1',
    supabase: {} as never,
    conversationId: 'conv-1',
    runId: 'run-1',
  }
}

function makeCtxWithSocialHandles(socialHandles: Record<string, string>) {
  const maybeSingle = vi.fn().mockResolvedValue({
    data: { social_handles: socialHandles },
    error: null,
  })
  const eq = vi.fn(() => ({ maybeSingle }))
  const select = vi.fn(() => ({ eq }))
  return {
    ...makeCtx(),
    supabase: {
      from: vi.fn(() => ({ select })),
    } as never,
  }
}

function makeCalendarWorkflow(recurring?: {
  cadence: 'daily' | 'weekly' | 'weekday'
  duration: '1_month' | '3_months' | 'ongoing'
  occurrenceCount?: number
}) {
  return {
    id: 'calendar-workflow-1',
    repId: 'rep-1',
    conversationId: 'conv-1',
    workflowType: 'calendar_event_work',
    status: 'active',
    phase: 'ready_to_add',
    intent: 'add_show',
    knownFields: recurring ? { recurring } : {},
    missingFields: [],
    candidateEventIds: [],
    expiresAt: '2099-01-01T00:00:00.000Z',
    createdAt: '2099-01-01T00:00:00.000Z',
    updatedAt: '2099-01-01T00:00:00.000Z',
  } as const
}

beforeEach(() => {
  addShowMock.mockReset()
  listMyShowsMock.mockReset()
  updateShowMock.mockReset()
  cancelShowMock.mockReset()
  cancelShowSeriesFutureMock.mockReset()
  pauseShowSeriesUntilMock.mockReset()
  endShowMock.mockReset()
  writeTradeActionAuditMock.mockReset()
  logIncidentMock.mockReset()
})

describe('calendar tools', () => {
  it('requires an unambiguous timestamp before add or update can execute', () => {
    const add = makeAddShowTool(makeCtx()).inputSchema as import('zod').ZodType
    const update = makeUpdateShowTool(makeCtx()).inputSchema as import('zod').ZodType
    for (const eventTime of ['2026-09-04T19:00:00', '2026-09-04', 'not-a-date']) {
      expect(add.safeParse({ platform: 'TikTok', eventTime, timeZone: 'America/New_York' }).success).toBe(false)
      expect(update.safeParse({ eventId: VALID_EVENT_ID, eventTime }).success).toBe(false)
    }
    for (const eventTime of ['2026-09-04T19:00:00-04:00', '2026-09-04T23:00:00Z']) {
      expect(add.safeParse({ platform: 'TikTok', eventTime }).success).toBe(true)
      expect(update.safeParse({ eventId: VALID_EVENT_ID, eventTime }).success).toBe(true)
    }
    expect(update.safeParse({ eventId: VALID_EVENT_ID, title: 'Title only' }).success).toBe(true)
    expect(addShowMock).not.toHaveBeenCalled()
    expect(updateShowMock).not.toHaveBeenCalled()
  })

  it('add_show forwards multi-code and recurring inputs and returns the calendar payload', async () => {
    addShowMock.mockResolvedValueOnce({ count: 4, events: [calendarEvent({ isRecurring: true })] })
    const tool = makeAddShowTool(makeCtx()) as unknown as ToolDef

    const result = await tool.execute({
      platform: 'TikTok',
      eventTime: '2026-06-07T00:00:00.000Z',
      timeZone: 'America/New_York',
      title: 'Friday Sparkles',
      discountCodes: [{ code: 'SPARKLE10', description: 'Ten percent off' }],
      recurring: { cadence: 'weekly', duration: '1_month' },
    })

    expect(addShowMock).toHaveBeenCalledWith(
      expect.anything(),
      'rep-1',
      expect.objectContaining({
        platform: 'TikTok',
        eventTime: '2026-06-07T00:00:00.000Z',
        timeZone: 'America/New_York',
        title: 'Friday Sparkles',
        discountCodes: [{ code: 'SPARKLE10', description: 'Ten percent off' }],
        recurring: { cadence: 'weekly', duration: '1_month', mode: 'series' },
      }),
    )
    expect(result.calendarPlan).toMatchObject({
      operation: 'create_recurring_series',
      preview: { occurrenceCount: 4, recurrenceMode: 'series' },
    })
    expect(result.count).toBe(4)
    expect(result.events).toHaveLength(1)
  })

  it('uses the matching configured customer-site social link for a scheduled platform', async () => {
    addShowMock.mockResolvedValueOnce({ count: 1, events: [calendarEvent()] })
    const tool = makeAddShowTool(
      makeCtxWithSocialHandles({ tiktok: '@demo' }),
    ) as unknown as ToolDef

    const result = await tool.execute({
      platform: 'TikTok',
      eventTime: '2026-06-07T00:00:00.000Z',
    })

    expect(result).toMatchObject({
      customerSiteWatchLinks: [{
        kind: 'tiktok',
        label: 'Watch on TikTok',
        href: 'https://www.tiktok.com/@demo',
      }],
      missingCustomerSitePlatforms: [],
    })
  })

  it('reports the selected platform as missing when the customer-site link is not configured', async () => {
    addShowMock.mockResolvedValueOnce({ count: 1, events: [calendarEvent()] })
    const tool = makeAddShowTool(
      makeCtxWithSocialHandles({ facebook: '@demo' }),
    ) as unknown as ToolDef

    const result = await tool.execute({
      platform: 'TikTok',
      eventTime: '2026-06-07T00:00:00.000Z',
    })

    expect(result).toMatchObject({
      customerSiteWatchLinks: [],
      missingCustomerSitePlatforms: ['tiktok'],
    })
  })

  it('add_show strips recurring when active workflow did not capture recurrence', async () => {
    addShowMock.mockResolvedValueOnce({ count: 1, events: [calendarEvent()] })
    const tool = makeAddShowTool({
      ...makeCtx(),
      activeCalendarWorkflow: makeCalendarWorkflow(),
    }) as unknown as ToolDef

    await tool.execute({
      platform: 'TikTok',
      eventTime: '2026-07-04T19:00:00-04:00',
      timeZone: 'America/New_York',
      title: 'Bling party',
      durationMinutes: 180,
      recurring: { cadence: 'weekly', duration: '1_month' },
    })

    expect(addShowMock).toHaveBeenCalledWith(
      expect.anything(),
      'rep-1',
      expect.objectContaining({
        title: 'Bling party',
        durationMinutes: 180,
        recurring: undefined,
      }),
    )
  })

  it('add_show keeps recurring when active workflow captured explicit recurrence', async () => {
    addShowMock.mockResolvedValueOnce({ count: 4, events: [calendarEvent({ isRecurring: true })] })
    const recurring = { cadence: 'weekly' as const, duration: '1_month' as const }
    const tool = makeAddShowTool({
      ...makeCtx(),
      activeCalendarWorkflow: makeCalendarWorkflow(recurring),
    }) as unknown as ToolDef

    await tool.execute({
      platform: 'TikTok',
      eventTime: '2026-07-04T19:00:00-04:00',
      timeZone: 'America/New_York',
      title: 'Bling party',
      durationMinutes: 180,
      recurring,
    })

    expect(addShowMock).toHaveBeenCalledWith(
      expect.anything(),
      'rep-1',
      expect.objectContaining({ recurring: { ...recurring, mode: 'series' } }),
    )
  })

  it('add_show preserves exact occurrence counts captured by the active workflow', async () => {
    addShowMock.mockResolvedValueOnce({
      count: 2,
      events: [calendarEvent(), calendarEvent({ id: 'event-2' })],
    })
    const recurring = { cadence: 'weekly' as const, duration: '1_month' as const, occurrenceCount: 2 }
    const tool = makeAddShowTool({
      ...makeCtx(),
      activeCalendarWorkflow: makeCalendarWorkflow(recurring),
    }) as unknown as ToolDef

    await tool.execute({
      platform: 'TikTok',
      eventTime: '2026-07-07T07:30:00-04:00',
      timeZone: 'America/New_York',
      title: 'Coffees, Pastries, And Jewelry Reveals',
      durationMinutes: 120,
      recurring,
    })

    expect(addShowMock).toHaveBeenCalledWith(
      expect.anything(),
      'rep-1',
      expect.objectContaining({ recurring: { ...recurring, mode: 'exact_count' } }),
    )
  })

  it('add_show forwards weekday recurring plans instead of flattening them', async () => {
    addShowMock.mockResolvedValueOnce({
      count: 23,
      events: [calendarEvent({ isRecurring: true })],
    })
    const recurring = { cadence: 'weekday' as const, duration: '1_month' as const }
    const tool = makeAddShowTool({
      ...makeCtx(),
      activeCalendarWorkflow: {
        ...makeCalendarWorkflow(recurring),
        knownFields: {
          title: 'Live with Heather',
          recurring,
        },
      },
    }) as unknown as ToolDef

    await tool.execute({
      platform: 'Facebook Live + TikTok Live',
      eventTime: '2026-07-06T09:00:00-04:00',
      timeZone: 'America/New_York',
      title: 'Live with Heather',
      durationMinutes: 420,
    })

    expect(addShowMock).toHaveBeenCalledWith(
      expect.anything(),
      'rep-1',
      expect.objectContaining({ recurring: { ...recurring, mode: 'series' } }),
    )
  })

  it('add_show applies active workflow recurrence when the model omits it for the same title', async () => {
    addShowMock.mockResolvedValueOnce({ count: 13, events: [calendarEvent({ isRecurring: true })] })
    const recurring = { cadence: 'weekly' as const, duration: '3_months' as const }
    const tool = makeAddShowTool({
      ...makeCtx(),
      activeCalendarWorkflow: {
        ...makeCalendarWorkflow(recurring),
        knownFields: {
          title: 'Codex Pressure Weekly Series',
          recurring,
        },
      },
    }) as unknown as ToolDef

    await tool.execute({
      platform: 'Facebook Live',
      eventTime: '2026-07-03T22:09:00.000Z',
      timeZone: 'America/New_York',
      title: 'Codex Pressure Weekly Series',
      durationMinutes: 120,
    })

    expect(addShowMock).toHaveBeenCalledWith(
      expect.anything(),
      'rep-1',
      expect.objectContaining({ recurring: { ...recurring, mode: 'series' } }),
    )
  })

  it('add_show lets active workflow recurrence override model occurrence-count drift', async () => {
    addShowMock.mockResolvedValueOnce({ count: 13, events: [calendarEvent({ isRecurring: true })] })
    const workflowRecurring = { cadence: 'weekly' as const, duration: '3_months' as const }
    const modelRecurring = { ...workflowRecurring, occurrenceCount: 13 }
    const tool = makeAddShowTool({
      ...makeCtx(),
      activeCalendarWorkflow: {
        ...makeCalendarWorkflow(workflowRecurring),
        knownFields: {
          title: 'Codex Pressure Weekly Series',
          recurring: workflowRecurring,
        },
      },
    }) as unknown as ToolDef

    await tool.execute({
      platform: 'Facebook Live',
      eventTime: '2026-07-03T22:09:00.000Z',
      timeZone: 'America/New_York',
      title: 'Codex Pressure Weekly Series',
      durationMinutes: 120,
      recurring: modelRecurring,
    })

    expect(addShowMock).toHaveBeenCalledWith(
      expect.anything(),
      'rep-1',
      expect.objectContaining({ recurring: { ...workflowRecurring, mode: 'series' } }),
    )
  })

  it('add_show repairs omitted recurrence from the latest user text when titles match', async () => {
    addShowMock.mockResolvedValueOnce({ count: 13, events: [calendarEvent({ isRecurring: true })] })
    const tool = makeAddShowTool({
      ...makeCtx(),
      latestUserText:
        'Add a weekly recurring show. Title: Codex Pressure Weekly Series. Platform: Facebook Live. Starts: 2026-07-03T22:28:00.000Z. Duration: 120 minutes. Repeat weekly for three months.',
    }) as unknown as ToolDef

    await tool.execute({
      platform: 'Facebook Live',
      eventTime: '2026-07-03T22:28:00.000Z',
      timeZone: 'America/New_York',
      title: 'Codex Pressure Weekly Series',
      durationMinutes: 120,
    })

    expect(addShowMock).toHaveBeenCalledWith(
      expect.anything(),
      'rep-1',
      expect.objectContaining({
        recurring: { cadence: 'weekly', duration: '3_months', mode: 'series' },
      }),
    )
  })

  it('add_show lets latest user text recurrence override model occurrence-count drift', async () => {
    addShowMock.mockResolvedValueOnce({ count: 13, events: [calendarEvent({ isRecurring: true })] })
    const tool = makeAddShowTool({
      ...makeCtx(),
      latestUserText:
        'Add a weekly recurring show. Title: Codex Pressure Weekly Series. Platform: Facebook Live. Starts: 2026-07-03T22:28:00.000Z. Duration: 120 minutes. Repeat weekly for three months.',
    }) as unknown as ToolDef

    await tool.execute({
      platform: 'Facebook Live',
      eventTime: '2026-07-03T22:28:00.000Z',
      timeZone: 'America/New_York',
      title: 'Codex Pressure Weekly Series',
      durationMinutes: 120,
      recurring: { cadence: 'weekly', duration: '3_months', occurrenceCount: 13 },
    })

    expect(addShowMock).toHaveBeenCalledWith(
      expect.anything(),
      'rep-1',
      expect.objectContaining({
        recurring: { cadence: 'weekly', duration: '3_months', mode: 'series' },
      }),
    )
  })

  it('add_show does not apply stale workflow recurrence to a different title', async () => {
    addShowMock.mockResolvedValueOnce({ count: 1, events: [calendarEvent()] })
    const recurring = { cadence: 'weekly' as const, duration: '3_months' as const }
    const tool = makeAddShowTool({
      ...makeCtx(),
      activeCalendarWorkflow: {
        ...makeCalendarWorkflow(recurring),
        knownFields: {
          title: 'Old Weekly Series',
          recurring,
        },
      },
    }) as unknown as ToolDef

    await tool.execute({
      platform: 'TikTok',
      eventTime: '2026-07-04T19:00:00-04:00',
      timeZone: 'America/New_York',
      title: 'Different One-Time Show',
      durationMinutes: 180,
    })

    const forwardedInput = addShowMock.mock.calls[0][2] as { recurring?: unknown }
    expect(forwardedInput.recurring).toBeUndefined()
  })

  it('agent add_show does not reuse recurrence from a saved Calendar transaction', async () => {
    addShowMock.mockResolvedValueOnce({ count: 1, events: [calendarEvent()] })
    const recurring = { cadence: 'weekly' as const, duration: '3_months' as const }
    const tool = makeAddShowTool({
      ...makeCtx(),
      agentHarness: true,
      latestUserText:
        'Add a weekly show from the old conversation even though this request is one time.',
      activeCalendarWorkflow: {
        ...makeCalendarWorkflow(recurring),
        knownFields: {
          title: 'Bunny Ears Live',
          recurring,
        },
      },
    }) as unknown as ToolDef

    await tool.execute({
      platform: 'TikTok',
      eventTime: '2099-07-04T19:00:00-04:00',
      timeZone: 'America/New_York',
      title: 'Bunny Ears Live',
      durationMinutes: 60,
    })

    const forwardedInput = addShowMock.mock.calls[0][2] as { recurring?: unknown }
    expect(forwardedInput.recurring).toBeUndefined()
  })

  it('agent add_show preserves the structured recurrence selected by the model', async () => {
    addShowMock.mockResolvedValueOnce({
      count: 2,
      events: [calendarEvent(), calendarEvent({ id: 'event-2' })],
    })
    const tool = makeAddShowTool({
      ...makeCtx(),
      agentHarness: true,
      latestUserText: 'An unrelated saved plan must not rewrite this exact request.',
      activeCalendarWorkflow: makeCalendarWorkflow({
        cadence: 'daily',
        duration: 'ongoing',
      }),
    }) as unknown as ToolDef

    await tool.execute({
      platform: 'TikTok',
      eventTime: '2099-07-07T19:00:00-04:00',
      timeZone: 'America/New_York',
      title: 'Two Bunny Ears Lives',
      recurring: {
        cadence: 'weekly',
        duration: '1_month',
        occurrenceCount: 2,
      },
    })

    expect(addShowMock).toHaveBeenCalledWith(
      expect.anything(),
      'rep-1',
      expect.objectContaining({
        recurring: {
          cadence: 'weekly',
          duration: '1_month',
          occurrenceCount: 2,
        },
      }),
    )
  })

  it('list_my_shows returns count + totalCount + discount code arrays', async () => {
    listMyShowsMock.mockResolvedValueOnce({
      events: [calendarEvent()],
      totalCount: 3,
    })
    const tool = makeListMyShowsTool(makeCtx()) as unknown as ToolDef

    const result = await tool.execute({ upcoming: true, limit: 5 })

    expect(listMyShowsMock).toHaveBeenCalledWith(
      expect.anything(),
      'rep-1',
      { upcoming: true, limit: 5 },
    )
    expect(result).toMatchObject({
      count: 1,
      totalCount: 3,
      truncated: true,
    })
    expect((result.events as Array<Record<string, unknown>>)[0]).toMatchObject({
      eventId: VALID_EVENT_ID,
      title: 'Friday Sparkles',
      platform: 'TikTok',
      timeZone: 'America/New_York',
      discountCodes: [{ code: 'SPARKLE10', description: 'Ten percent off' }],
    })
    expect((result.events as Array<Record<string, unknown>>)[0]).toMatchObject({
      localStart: expect.stringContaining('4:00 PM'),
      localEnd: expect.stringContaining('5:00 PM'),
      displaySchedule: expect.stringContaining('through'),
    })
  })

  it('list_my_shows groups returned recurring rows around one series update target', async () => {
    listMyShowsMock.mockResolvedValueOnce({
      events: [
        calendarEvent({
          id: 'event-1',
          recurrenceGroupId: 'group-1',
          recurrenceRule: 'weekday',
          isRecurring: true,
        }),
        calendarEvent({
          id: 'event-2',
          eventTime: '2099-05-04T20:00:00.000Z',
          recurrenceGroupId: 'group-1',
          recurrenceRule: 'weekday',
          isRecurring: true,
        }),
      ],
      totalCount: 130,
    })
    const tool = makeListMyShowsTool(makeCtx()) as unknown as ToolDef

    const result = await tool.execute({ upcoming: true, limit: 20 })

    expect(result.recurringSeries).toEqual([
      expect.objectContaining({
        recurrenceGroupId: 'group-1',
        cadence: 'weekday',
        returnedOccurrenceCount: 2,
        nextEventId: 'event-1',
        firstEventTime: '2099-05-01T20:00:00.000Z',
        lastEventTime: '2099-05-04T20:00:00.000Z',
      }),
    ])
  })

  it('update_show blocks empty patches before calling the service', async () => {
    const tool = makeUpdateShowTool(makeCtx()) as unknown as ToolDef

    await expect(tool.execute({ eventId: VALID_EVENT_ID })).rejects.toMatchObject({
      name: 'NicNacToolError',
      code: 'NO_PATCH_FIELDS',
    })
    expect(updateShowMock).not.toHaveBeenCalled()
  })

  it('update_show forwards applyToSeries and returns updatedCount', async () => {
    updateShowMock.mockResolvedValueOnce({
      event: calendarEvent({
        title: 'Moved title',
        discountCodes: [{ code: 'NEWCODE', description: 'Updated' }],
      }),
      updatedCount: 5,
    })
    const tool = makeUpdateShowTool(makeCtx()) as unknown as ToolDef

    const result = await tool.execute({
      eventId: VALID_EVENT_ID,
      title: 'Moved title',
      discountCodes: [{ code: 'NEWCODE', description: 'Updated' }],
      applyToSeries: true,
    })

    expect(updateShowMock).toHaveBeenCalledWith(
      expect.anything(),
      'rep-1',
      VALID_EVENT_ID,
      {
        title: 'Moved title',
        platform: undefined,
        eventTime: undefined,
        timeZone: undefined,
        durationMinutes: undefined,
        description: undefined,
        discountCodes: [{ code: 'NEWCODE', description: 'Updated' }],
        featuredCollections: undefined,
        streamingDestinations: undefined,
        applyToSeries: true,
      },
    )
    expect(result).toMatchObject({
      updatedCount: 5,
      patchedFields: ['title', 'discountCodes'],
      event: { title: 'Moved title' },
    })
  })

  it('update_show translates ServiceError into NicNacToolError', async () => {
    updateShowMock.mockRejectedValueOnce(errors.EVENT_NOT_EDITABLE())
    const tool = makeUpdateShowTool(makeCtx()) as unknown as ToolDef

    await expect(
      tool.execute({ eventId: VALID_EVENT_ID, title: 'Moved title' }),
    ).rejects.toMatchObject({
      name: 'NicNacToolError',
      code: 'EVENT_NOT_EDITABLE',
    })
  })

  it('cancel_show exposes needsApproval, writes audit, and returns the cancelled event', async () => {
    cancelShowMock.mockResolvedValueOnce({
      event: calendarEvent({ status: 'cancelled' }),
    })
    const tool = makeCancelShowTool(makeCtx()) as unknown as ToolDef

    const result = await tool.execute({
      eventId: VALID_EVENT_ID,
      reason: 'family emergency',
    })

    expect(tool.needsApproval).toBe(true)
    expect(cancelShowMock).toHaveBeenCalledWith(
      expect.anything(),
      'rep-1',
      VALID_EVENT_ID,
      'family emergency',
    )
    expect(writeTradeActionAuditMock).toHaveBeenCalledTimes(1)
    expect(writeTradeActionAuditMock.mock.calls[0][0]).toMatchObject({
      actionType: 'cancel_show',
      repId: 'rep-1',
      targetListingId: null,
      details: { runId: 'run-1', conversationId: 'conv-1', reason: 'family emergency' },
    })
    expect(result).toMatchObject({
      event: { status: 'cancelled' },
      reason: 'family emergency',
    })
  })

  it('cancel_show still returns success when audit logging fails', async () => {
    cancelShowMock.mockResolvedValueOnce({
      event: calendarEvent({ status: 'cancelled' }),
    })
    writeTradeActionAuditMock.mockRejectedValueOnce(new Error('audit down'))
    const tool = makeCancelShowTool(makeCtx()) as unknown as ToolDef

    const result = await tool.execute({ eventId: VALID_EVENT_ID })

    expect(result).toMatchObject({
      event: { status: 'cancelled' },
    })
    expect(logIncidentMock).toHaveBeenCalledTimes(1)
    expect(logIncidentMock.mock.calls[0][0]).toMatchObject({
      errorType: 'audit_write_failed',
      severity: 'warn',
    })
  })

  it('update_show preserves duration when the rep changes an end time', async () => {
    updateShowMock.mockResolvedValueOnce({
      event: calendarEvent({ durationMinutes: 480 }),
      updatedCount: 130,
    })
    const tool = makeUpdateShowTool({
      ...makeCtx(),
      latestUserText:
        'Correct the existing weekday shows so they start at 9 a.m. and end at 5 p.m.',
    }) as unknown as ToolDef

    await tool.execute({
      eventId: VALID_EVENT_ID,
      durationMinutes: 480,
      applyToSeries: true,
    })

    expect(updateShowMock).toHaveBeenCalledWith(
      expect.anything(),
      'rep-1',
      VALID_EVENT_ID,
      expect.objectContaining({
        durationMinutes: 480,
        applyToSeries: true,
      }),
    )
  })

  it('update_show preserves duration for a correction phrased as bare clock ranges', async () => {
    updateShowMock.mockResolvedValueOnce({
      event: calendarEvent({ durationMinutes: 480 }),
      updatedCount: 130,
    })
    const tool = makeUpdateShowTool({
      ...makeCtx(),
      latestUserText:
        'Change the pre-existing shows from 10 to 4 so they run from 9 to 5.',
    }) as unknown as ToolDef

    await tool.execute({
      eventId: VALID_EVENT_ID,
      durationMinutes: 480,
      applyToSeries: true,
    })

    expect(updateShowMock).toHaveBeenCalledWith(
      expect.anything(),
      'rep-1',
      VALID_EVENT_ID,
      expect.objectContaining({ durationMinutes: 480 }),
    )
  })

  it('update_show exposes streaming destination edits in its schema', () => {
    const tool = makeUpdateShowTool(makeCtx())
    expect(tool.inputSchema.safeParse({
      eventId: VALID_EVENT_ID,
      streamingDestinations: [{
        platform: 'YouTube',
        url: 'https://www.youtube.com/watch?v=example',
        label: 'Watch live',
      }],
    }).success).toBe(true)
  })

  it('add_show compacts large recurring-series results', async () => {
    addShowMock.mockResolvedValueOnce({
      count: 130,
      events: Array.from({ length: 130 }, (_, index) =>
        calendarEvent({
          id: `event-${index + 1}`,
          eventTime: new Date(Date.parse('2099-05-01T20:00:00.000Z') + index * 86_400_000).toISOString(),
          isRecurring: true,
          recurrenceGroupId: 'group-1',
          recurrenceRule: 'weekday',
        }),
      ),
    })
    const tool = makeAddShowTool(makeCtx()) as unknown as ToolDef

    const result = await tool.execute({
      platform: 'TikTok',
      eventTime: '2099-05-01T20:00:00.000Z',
      timeZone: 'America/New_York',
      recurring: { cadence: 'weekday', duration: 'ongoing' },
    })

    expect(result.count).toBe(130)
    expect(result.events).toBeUndefined()
    expect(result.firstEvent).toMatchObject({ id: 'event-1' })
    expect(result.lastEvent).toMatchObject({ id: 'event-130' })
  })

  it('update_show ignores blank optional model fields before series patches', async () => {
    updateShowMock.mockResolvedValueOnce({
      event: calendarEvent({
        discountCodes: [{ code: 'SERIES25', description: '25% off' }],
      }),
      updatedCount: 13,
    })
    const tool = makeUpdateShowTool(makeCtx()) as unknown as ToolDef

    await tool.execute({
      eventId: VALID_EVENT_ID,
      title: '',
      platform: '',
      eventTime: '.',
      timeZone: '',
      description: '',
      durationMinutes: 120,
      discountCodes: [{ code: 'SERIES25', description: '25% off' }],
      featuredCollections: ['Series Luxe'],
      applyToSeries: true,
    })

    expect(updateShowMock).toHaveBeenCalledWith(
      expect.anything(),
      'rep-1',
      VALID_EVENT_ID,
      {
        title: undefined,
        platform: undefined,
        eventTime: undefined,
        timeZone: undefined,
        durationMinutes: 120,
        description: undefined,
        discountCodes: [{ code: 'SERIES25', description: '25% off' }],
        featuredCollections: ['Series Luxe'],
        applyToSeries: true,
      },
    )
  })

  it('update_show drops model-default duration when the rep did not request a duration change', async () => {
    updateShowMock.mockResolvedValueOnce({
      event: calendarEvent({
        discountCodes: [{ code: 'SERIES25', description: '25% off' }],
      }),
      updatedCount: 13,
    })
    const tool = makeUpdateShowTool({
      ...makeCtx(),
      latestUserText:
        'Replace discount codes with SERIES25 = 25% off the whole cart and KEEP5 = $5 off keepers. Replace featured collections with Series Luxe and Vault Night. Keep the same time.',
    }) as unknown as ToolDef

    await tool.execute({
      eventId: VALID_EVENT_ID,
      durationMinutes: 60,
      discountCodes: [{ code: 'SERIES25', description: '25% off' }],
      featuredCollections: ['Series Luxe', 'Vault Night'],
      applyToSeries: true,
    })

    expect(updateShowMock).toHaveBeenCalledWith(
      expect.anything(),
      'rep-1',
      VALID_EVENT_ID,
      expect.objectContaining({
        durationMinutes: undefined,
        discountCodes: [{ code: 'SERIES25', description: '25% off' }],
        featuredCollections: ['Series Luxe', 'Vault Night'],
      }),
    )
  })

  it('update_show keeps duration when the rep explicitly requests a duration change', async () => {
    updateShowMock.mockResolvedValueOnce({
      event: calendarEvent({ durationMinutes: 90 }),
      updatedCount: 1,
    })
    const tool = makeUpdateShowTool({
      ...makeCtx(),
      latestUserText: 'Change this show duration to 90 minutes.',
    }) as unknown as ToolDef

    await tool.execute({
      eventId: VALID_EVENT_ID,
      durationMinutes: 90,
    })

    expect(updateShowMock).toHaveBeenCalledWith(
      expect.anything(),
      'rep-1',
      VALID_EVENT_ID,
      expect.objectContaining({ durationMinutes: 90 }),
    )
  })

  it('skip_show_occurrence cancels one selected show while preserving the recurring series', async () => {
    cancelShowMock.mockResolvedValueOnce({
      event: calendarEvent({
        status: 'cancelled',
        isRecurring: true,
        recurrenceGroupId: 'group-1',
      }),
    })
    const tool = makeSkipShowOccurrenceTool(makeCtx()) as unknown as ToolDef

    const result = await tool.execute({
      eventId: VALID_EVENT_ID,
      reason: 'rep is sick tonight',
    })

    expect(tool.needsApproval).toBe(true)
    expect(cancelShowMock).toHaveBeenCalledWith(
      expect.anything(),
      'rep-1',
      VALID_EVENT_ID,
      'rep is sick tonight',
    )
    expect(cancelShowSeriesFutureMock).not.toHaveBeenCalled()
    expect(result).toMatchObject({
      event: { status: 'cancelled', isRecurring: true },
      occurrenceOnly: true,
      seriesPreserved: true,
    })
  })

  it('cancel_show_series cancels the selected and future recurring shows', async () => {
    cancelShowSeriesFutureMock.mockResolvedValueOnce({
      events: [
        calendarEvent({
          id: VALID_EVENT_ID,
          status: 'cancelled',
          isRecurring: true,
          recurrenceGroupId: 'group-1',
        }),
        calendarEvent({
          id: '22222222-2222-4222-8222-222222222222',
          status: 'cancelled',
          isRecurring: true,
          recurrenceGroupId: 'group-1',
        }),
      ],
      cancelledCount: 2,
    })
    const tool = makeCancelShowSeriesTool(makeCtx()) as unknown as ToolDef

    const result = await tool.execute({
      eventId: VALID_EVENT_ID,
      reason: 'rep wants to stop the Friday series',
    })

    expect(tool.needsApproval).toBe(true)
    expect(cancelShowSeriesFutureMock).toHaveBeenCalledWith(
      expect.anything(),
      'rep-1',
      VALID_EVENT_ID,
      'rep wants to stop the Friday series',
    )
    expect(result).toMatchObject({
      cancelledCount: 2,
      futureSeriesCancelled: true,
    })
  })

  it('pause_show_series pauses only the bounded recurring occurrences', async () => {
    pauseShowSeriesUntilMock.mockResolvedValueOnce({
      events: [
        calendarEvent({
          id: VALID_EVENT_ID,
          status: 'cancelled',
          isRecurring: true,
          recurrenceGroupId: 'group-1',
        }),
      ],
      pausedCount: 1,
      pauseUntil: '2099-05-22T00:00:00.000Z',
    })
    const tool = makePauseShowSeriesTool(makeCtx()) as unknown as ToolDef

    const result = await tool.execute({
      eventId: VALID_EVENT_ID,
      pauseUntil: '2099-05-22T00:00:00.000Z',
      reason: 'rep needs two weeks off',
    })

    expect(tool.needsApproval).toBe(true)
    expect(pauseShowSeriesUntilMock).toHaveBeenCalledWith(
      expect.anything(),
      'rep-1',
      VALID_EVENT_ID,
      '2099-05-22T00:00:00.000Z',
      'rep needs two weeks off',
    )
    expect(result).toMatchObject({
      pausedCount: 1,
      boundedPause: true,
      pauseUntil: '2099-05-22T00:00:00.000Z',
    })
  })

  it('end_show completes a live show, writes audit, and returns the completed event', async () => {
    endShowMock.mockResolvedValueOnce({
      event: calendarEvent({ status: 'completed' }),
    })
    const tool = makeEndShowTool(makeCtx()) as unknown as ToolDef

    const result = await tool.execute({ eventId: VALID_EVENT_ID })

    expect(endShowMock).toHaveBeenCalledWith(
      expect.anything(),
      'rep-1',
      VALID_EVENT_ID,
    )
    expect(writeTradeActionAuditMock).toHaveBeenCalledTimes(1)
    expect(writeTradeActionAuditMock.mock.calls[0][0]).toMatchObject({
      actionType: 'end_show',
      repId: 'rep-1',
      targetListingId: null,
      details: { runId: 'run-1', conversationId: 'conv-1' },
    })
    expect(result).toMatchObject({
      event: { status: 'completed' },
    })
  })

  it('end_show translates ServiceError into NicNacToolError', async () => {
    endShowMock.mockRejectedValueOnce(errors.EVENT_NOT_ENDABLE())
    const tool = makeEndShowTool(makeCtx()) as unknown as ToolDef

    await expect(tool.execute({ eventId: VALID_EVENT_ID })).rejects.toMatchObject({
      name: 'NicNacToolError',
      code: 'EVENT_NOT_ENDABLE',
    })
  })

  it('add_show description makes the current ongoing horizon explicit', () => {
    const tool = makeAddShowTool(makeCtx()) as unknown as { description?: string }
    expect(tool.description).toContain('ongoing')
    expect(tool.description).toContain('about six months ahead')
  })
})

describe('calendar registry and prompt wiring', () => {
  it('buildAllTools exposes the calendar tools without duplicate registry names', () => {
    const tools = buildAllTools(makeCtx())
    const names = Object.keys(tools).sort()

    expect(new Set(names).size).toBe(names.length)
    expect(names).toEqual(expect.arrayContaining([
      'add_show',
      'list_my_shows',
      'update_show',
      'cancel_show',
      'skip_show_occurrence',
      'cancel_show_series',
      'pause_show_series',
      'end_show',
    ]))
  })

  it('system prompt documents recurring shows, multi-code support, and series updates', () => {
    expect(NIC_NAC_SYSTEM_PROMPT).toContain(
      "You have a scoped set of workspace tools available when the rep's request calls for them:",
    )
    expect(NIC_NAC_SYSTEM_PROMPT).toContain('add_show')
    expect(NIC_NAC_SYSTEM_PROMPT).toContain('list_my_shows')
    expect(NIC_NAC_SYSTEM_PROMPT).toContain('update_show')
    expect(NIC_NAC_SYSTEM_PROMPT).toContain('cancel_show')
    expect(NIC_NAC_SYSTEM_PROMPT).toContain('end_show')
    expect(NIC_NAC_SYSTEM_PROMPT).toContain('Recurring shows are now supported')
    expect(NIC_NAC_SYSTEM_PROMPT).toContain('How often')
    expect(NIC_NAC_SYSTEM_PROMPT).toContain('weekdays/Monday-Friday')
    expect(NIC_NAC_SYSTEM_PROMPT).toContain('recurring.cadence="weekday"')
    expect(NIC_NAC_SYSTEM_PROMPT).toContain('up to 10 discount codes per show')
    expect(NIC_NAC_SYSTEM_PROMPT).toContain('applyToSeries: true')
    expect(NIC_NAC_SYSTEM_PROMPT).toContain('Do not combine applyToSeries: true with eventTime')
    expect(NIC_NAC_SYSTEM_PROMPT).toContain('Calendar times must be timezone-explicit')
    expect(NIC_NAC_SYSTEM_PROMPT).toContain("viewer's local browser timezone")
    expect(NIC_NAC_SYSTEM_PROMPT).toContain('about six months ahead')
    expect(NIC_NAC_SYSTEM_PROMPT).toContain(
      'Telnyx campaign C7BAANX is active, but live SMS still requires number assignment and handset smoke proof.',
    )
    expect(NIC_NAC_SYSTEM_PROMPT).toContain(
      'automated pre-show reminders are handled by the scheduled reminder job',
    )
    expect(NIC_NAC_SYSTEM_PROMPT).toContain(
      'Do not promise a reminder was sent unless the reminder job result or message_log confirms it.',
    )
  })

  it('HITL copy includes custom cancel_show labels', () => {
    expect(APPROVAL_COPY.cancel_show).toEqual({
      title: 'Cancel this show?',
      confirm: 'Cancel show',
      cancel: 'Keep show',
    })
  })
})
