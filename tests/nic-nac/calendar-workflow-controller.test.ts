import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  computeCalendarWorkflowReadiness,
  mergeCalendarKnownFieldsFromText,
} from '@/lib/nic-nac/workflows/calendar-workflow-controller'

describe('calendar workflow controller', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not require description for add_show readiness', () => {
    const state = computeCalendarWorkflowReadiness({
      intent: 'add_show',
      knownFields: {
        title: 'BlingKitchen Live',
        platform: 'TikTok',
        eventTime: '2026-07-04T00:00:00.000Z',
        timeZone: 'America/New_York',
        durationMinutes: 150,
      },
      candidateEventIds: [],
    })

    expect(state.phase).toBe('ready_to_add')
    expect(state.missingFields).not.toContain('description')
  })

  it('retains add_show details when a rep rejects optional description', () => {
    const merged = mergeCalendarKnownFieldsFromText(
      {
        title: 'BlingKitchen Live',
        platform: 'TikTok',
        eventTime: '2026-07-04T00:00:00.000Z',
        timeZone: 'America/New_York',
        durationMinutes: 150,
      },
      "No, you don't need a short description of the event.",
    )

    expect(merged.description).toBeNull()
    expect(merged.platform).toBe('TikTok')
    expect(merged.durationMinutes).toBe(150)
  })

  it('extracts platform and duration from a natural follow-up', () => {
    const merged = mergeCalendarKnownFieldsFromText(
      {
        title: 'BlingKitchen Live',
        eventTime: '2026-07-04T00:00:00.000Z',
        timeZone: 'America/New_York',
      },
      "It's going to be on TikTok, and it is going to be 2.5 hours.",
    )

    expect(merged.platform).toBe('TikTok')
    expect(merged.durationMinutes).toBe(150)
  })

  it('extracts the quick-chip add-show details from Louis real replay', () => {
    const afterTime = mergeCalendarKnownFieldsFromText(
      {},
      'Tiktok July 4 7p Est',
    )
    const afterTitleAndDuration = mergeCalendarKnownFieldsFromText(
      afterTime,
      'Bling party and 3 hrs',
    )
    const readiness = computeCalendarWorkflowReadiness({
      intent: 'add_show',
      knownFields: afterTitleAndDuration,
      candidateEventIds: [],
    })

    expect(afterTitleAndDuration).toMatchObject({
      title: 'Bling Party',
      platform: 'TikTok',
      eventTime: '2026-07-04T19:00:00-04:00',
      timeZone: 'America/New_York',
      durationMinutes: 180,
    })
    expect(readiness).toEqual({
      phase: 'ready_to_add',
      missingFields: [],
    })
  })

  it('treats title and duration as optional when core scheduling facts are known', () => {
    const knownFields = mergeCalendarKnownFieldsFromText(
      {},
      'Tiktok July 4 7p Est',
    )
    const readiness = computeCalendarWorkflowReadiness({
      intent: 'add_show',
      knownFields,
      candidateEventIds: [],
    })

    expect(readiness).toEqual({
      phase: 'ready_to_add',
      missingFields: [],
    })
  })

  it('captures recurrence only from explicit recurring language', () => {
    const oneTime = mergeCalendarKnownFieldsFromText(
      {},
      'Tiktok July 4 7p Est',
    )
    const recurring = mergeCalendarKnownFieldsFromText(
      {},
      'Make this a weekly recurring show for three months',
    )

    expect(oneTime.recurring).toBeUndefined()
    expect(recurring.recurring).toEqual({
      cadence: 'weekly',
      duration: '3_months',
      mode: 'series',
    })
  })

  it('captures Title-colon recurring show prompts for direct add_show repair', () => {
    const merged = mergeCalendarKnownFieldsFromText(
      {},
      'Add a weekly recurring show. Title: Codex Pressure Weekly Series. Platform: Facebook Live. Starts: 2026-07-03T22:28:00.000Z. Duration: 120 minutes. Repeat weekly for three months.',
    )

    expect(merged).toMatchObject({
      title: 'Codex Pressure Weekly Series',
      platform: 'Facebook Live',
      durationMinutes: 120,
      recurring: {
        cadence: 'weekly',
        duration: '3_months',
        mode: 'series',
      },
    })
  })

  it('captures Louis Coffee and Fizz recurring setup language', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-03T12:00:00Z'))

    const afterRequest = mergeCalendarKnownFieldsFromText(
      {},
      'I want to create a reoccurring show on Wednesday mornings for the foreseeable future that starts at 9 a.m. The show will be called Coffee and Fizz. It will be Eastern Standard Time. No discount codes, but the feature collection for the first two shows will be the July Birthday Collection.',
    )
    const afterPlatformDuration = mergeCalendarKnownFieldsFromText(
      afterRequest,
      'The show will be dual streamed on both Facebook Live and TikTok Live, and it will have a three-hour duration.',
    )
    const readiness = computeCalendarWorkflowReadiness({
      intent: 'add_show',
      knownFields: afterPlatformDuration,
      candidateEventIds: [],
    })

    expect(afterPlatformDuration).toMatchObject({
      title: 'Coffee and Fizz',
      platform: 'Facebook Live + TikTok Live',
      eventTime: '2026-07-08T09:00:00-04:00',
      timeZone: 'America/New_York',
      durationMinutes: 180,
      recurring: {
        cadence: 'weekly',
        duration: 'ongoing',
        mode: 'series',
      },
      featuredCollections: ['July Birthday Collection'],
    })
    expect(readiness).toEqual({
      phase: 'ready_to_add',
      missingFields: [],
    })
  })

  it('captures Louis two-Tuesday bounded repeat as exactly two occurrences', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-03T12:00:00Z'))

    const merged = mergeCalendarKnownFieldsFromText(
      {},
      "All right, so I'm going to stream to TikTok for this show. It is just going to be two times. It's going to be the next two Tuesday mornings, and it's going to be coffees, pastries, and jewelry reveals for the show name at 7:30 a.m. Eastern Standard Time for two hours. Pastries123 gets a 10% off discount code, and the featured collection is stacks and the July birthdays.",
    )
    const readiness = computeCalendarWorkflowReadiness({
      intent: 'add_show',
      knownFields: merged,
      candidateEventIds: [],
    })

    expect(merged).toMatchObject({
      title: 'Coffees, Pastries, And Jewelry Reveals',
      platform: 'TikTok',
      eventTime: '2026-07-07T07:30:00-04:00',
      timeZone: 'America/New_York',
      durationMinutes: 120,
      recurring: {
        cadence: 'weekly',
        duration: '1_month',
        occurrenceCount: 2,
        mode: 'exact_count',
      },
      discountCodes: [{ code: 'Pastries123', description: '10% off' }],
      featuredCollections: ['stacks', 'July birthdays'],
    })
    expect(readiness).toEqual({
      phase: 'ready_to_add',
      missingFields: [],
    })
  })

  it('captures a weekday recurring schedule once the rep gives the start date', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-03T12:00:00Z'))

    const afterRequest = mergeCalendarKnownFieldsFromText(
      {},
      'Add a reoccuring show everyweek day at 9am to 4p Est called Live with Heather',
    )
    const afterPlatform = mergeCalendarKnownFieldsFromText(afterRequest, 'Tiktok and facebook')
    const afterStartDate = mergeCalendarKnownFieldsFromText(afterPlatform, 'this monday')
    const afterDurationChoice = mergeCalendarKnownFieldsFromText(afterStartDate, 'ongoing')
    const readiness = computeCalendarWorkflowReadiness({
      intent: 'add_show',
      knownFields: afterDurationChoice,
      candidateEventIds: [],
    })

    expect(afterRequest).toMatchObject({
      title: 'Live with Heather',
      timeZone: 'America/New_York',
      durationMinutes: 420,
      localStartTime: { hour: 9, minute: 0 },
      recurring: {
        cadence: 'weekday',
        duration: '1_month',
        mode: 'series',
      },
    })
    expect(afterDurationChoice).toMatchObject({
      platform: 'Facebook Live + TikTok Live',
      eventTime: '2026-07-06T09:00:00-04:00',
      recurring: {
        cadence: 'weekday',
        duration: 'ongoing',
        mode: 'series',
      },
    })
    expect(readiness).toEqual({
      phase: 'ready_to_add',
      missingFields: [],
    })
  })

  it('keeps update intent in identify_existing_event when an event id is missing', () => {
    const state = computeCalendarWorkflowReadiness({
      intent: 'update_show',
      knownFields: {
        title: 'BlingKitchen Live',
        eventTime: '2026-07-04T00:00:00.000Z',
        timeZone: 'America/New_York',
      },
      candidateEventIds: [],
    })

    expect(state.phase).toBe('identify_existing_event')
    expect(state.missingFields).toContain('eventId')
  })
})
