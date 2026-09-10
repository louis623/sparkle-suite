import { describe, expect, it, vi } from 'vitest'

import {
  buildCalendarPlanFromText,
  reconcileAddShowInputWithCalendarPlan,
} from '@/lib/nic-nac/workflows/calendar-plan'

function makeWorkflow(recurring?: {
  cadence: 'daily' | 'weekly' | 'weekday'
  duration: '1_month' | '3_months' | 'ongoing'
  occurrenceCount?: number
  mode?: 'exact_count' | 'series'
}) {
  return {
    id: 'calendar-workflow-1',
    repId: 'rep-1',
    conversationId: 'conv-1',
    workflowType: 'calendar_event_work',
    status: 'active',
    phase: 'ready_to_add',
    intent: 'add_show',
    knownFields: {
      title: 'Coffee and Fizz',
      recurring,
    },
    missingFields: [],
    candidateEventIds: [],
    expiresAt: '2099-01-01T00:00:00.000Z',
    createdAt: '2099-01-01T00:00:00.000Z',
    updatedAt: '2099-01-01T00:00:00.000Z',
  } as const
}

describe('calendar plan contract', () => {
  it('does not require optional title or duration to create a show', () => {
    const plan = buildCalendarPlanFromText(
      'Add a TikTok show July 4 at 7 p.m. Eastern.',
    )

    expect(plan.missingFields).not.toContain('title')
    expect(plan.missingFields).not.toContain('durationMinutes')
  })

  it('plans exact-count repeats as standalone bounded occurrences', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-03T12:00:00Z'))

    const plan = buildCalendarPlanFromText(
      "It's just going to be two times, the next two Tuesday mornings at 7:30 a.m. Eastern.",
    )

    expect(plan).toMatchObject({
      operation: 'create_exact_count',
      source: 'latest_user_text',
      normalizedRecurring: {
        cadence: 'weekly',
        duration: '1_month',
        occurrenceCount: 2,
        mode: 'exact_count',
      },
      preview: {
        occurrenceCount: 2,
        recurrenceMode: 'exact_count',
      },
      contradictions: [],
    })

    vi.useRealTimers()
  })

  it('plans weekly three-month requests as real recurring series', () => {
    const plan = buildCalendarPlanFromText(
      'Add a weekly recurring show called Coffee and Fizz for three months.',
    )

    expect(plan).toMatchObject({
      operation: 'create_recurring_series',
      normalizedRecurring: {
        cadence: 'weekly',
        duration: '3_months',
        mode: 'series',
      },
      preview: {
        occurrenceCount: 13,
        recurrenceMode: 'series',
      },
    })
    expect(plan.normalizedRecurring).not.toHaveProperty('occurrenceCount')
  })

  it('plans weekday ongoing requests as real Monday-Friday recurring series', () => {
    const plan = buildCalendarPlanFromText(
      'Add a recurring show every weekday at 9am to 4p Eastern called Live with Heather, ongoing.',
    )

    expect(plan).toMatchObject({
      operation: 'create_recurring_series',
      normalizedRecurring: {
        cadence: 'weekday',
        duration: 'ongoing',
        mode: 'series',
      },
      preview: {
        occurrenceCount: 130,
        recurrenceMode: 'series',
        cadence: 'weekday',
        duration: 'ongoing',
      },
    })
  })

  it('strips model-invented recurrence when active workflow is one-time', () => {
    const result = reconcileAddShowInputWithCalendarPlan({
      input: {
        platform: 'TikTok',
        eventTime: '2099-07-04T23:00:00.000Z',
        timeZone: 'America/New_York',
        title: 'One Night Fizz',
        durationMinutes: 180,
        recurring: { cadence: 'weekly', duration: '1_month' },
      },
      activeCalendarWorkflow: {
        ...makeWorkflow(),
        knownFields: { title: 'One Night Fizz' },
      },
    })

    expect(result.input.recurring).toBeUndefined()
    expect(result.plan).toMatchObject({
      operation: 'create_one_time',
      contradictions: ['model_added_recurring_without_rep_intent'],
    })
  })

  it('repairs model occurrence-count drift for a trusted series workflow', () => {
    const result = reconcileAddShowInputWithCalendarPlan({
      input: {
        platform: 'Facebook Live',
        eventTime: '2099-07-08T13:00:00.000Z',
        timeZone: 'America/New_York',
        title: 'Coffee and Fizz',
        durationMinutes: 180,
        recurring: { cadence: 'weekly', duration: '3_months', occurrenceCount: 13 },
      },
      activeCalendarWorkflow: makeWorkflow({
        cadence: 'weekly',
        duration: '3_months',
      }),
    })

    expect(result.input.recurring).toEqual({
      cadence: 'weekly',
      duration: '3_months',
      mode: 'series',
    })
    expect(result.plan).toMatchObject({
      operation: 'create_recurring_series',
      source: 'workflow',
      contradictions: ['model_changed_series_to_exact_count'],
    })
  })

  it('uses latest user text to restore an omitted exact-count plan', () => {
    const result = reconcileAddShowInputWithCalendarPlan({
      latestUserText:
        'The show is called Coffee and Fizz. It is just going to be two times, the next two Tuesday mornings at 7:30 a.m. Eastern.',
      input: {
        platform: 'TikTok',
        eventTime: '2099-07-07T11:30:00.000Z',
        timeZone: 'America/New_York',
        title: 'Coffee and Fizz',
        durationMinutes: 120,
      },
    })

    expect(result.input.recurring).toEqual({
      cadence: 'weekly',
      duration: '1_month',
      occurrenceCount: 2,
      mode: 'exact_count',
    })
    expect(result.plan).toMatchObject({
      operation: 'create_exact_count',
      source: 'latest_user_text',
      contradictions: ['model_omitted_rep_recurring_intent'],
    })
  })
})
