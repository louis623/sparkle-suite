import { describe, it, expect, vi } from 'vitest'
import {
  addShow,
  listMyShows,
  updateShow,
  cancelShow,
  cancelShowSeriesFuture,
  pauseShowSeriesUntil,
  startShow,
  endShow,
} from '@/lib/services/calendar'

type Chain = Record<string, unknown>

function baseRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'event-1',
    rep_id: 'rep-1',
    platform: 'TikTok',
    event_time: '2099-05-01T20:00:00.000Z',
    time_zone: 'America/New_York',
    duration_minutes: 60,
    title: 'Friday Sparkles',
    description: 'Main show',
    discount_codes: [
      { code: 'SPARKLE10', description: 'Ten percent off' },
    ],
    featured_collections: ['Celestial'],
    streaming_destinations: [],
    is_recurring: false,
    recurrence_group_id: null,
    recurrence_rule: null,
    status: 'scheduled',
    created_at: '2099-04-01T12:00:00.000Z',
    updated_at: '2099-04-01T12:00:00.000Z',
    ...overrides,
  }
}

function makeListChain(result: { data: unknown[]; count?: number | null; error: unknown | null }) {
  const state = {
    eq: [] as Array<[string, unknown]>,
    gt: [] as Array<[string, unknown]>,
    lte: [] as Array<[string, unknown]>,
    in: [] as Array<[string, unknown[]]>,
    order: [] as Array<[string, { ascending: boolean }]>,
    limit: [] as number[],
  }

  const chain: Chain = {
    eq: vi.fn((column: string, value: unknown) => {
      state.eq.push([column, value])
      return chain
    }),
    gt: vi.fn((column: string, value: unknown) => {
      state.gt.push([column, value])
      return chain
    }),
    lte: vi.fn((column: string, value: unknown) => {
      state.lte.push([column, value])
      return chain
    }),
    in: vi.fn((column: string, value: unknown[]) => {
      state.in.push([column, value])
      return chain
    }),
    order: vi.fn((column: string, opts: { ascending: boolean }) => {
      state.order.push([column, opts])
      return chain
    }),
    limit: vi.fn((value: number) => {
      state.limit.push(value)
      return Promise.resolve(result)
    }),
  }

  return { chain, state }
}

function makeSelectSingleChain(result: { data: unknown; error: unknown | null }) {
  const eq = vi.fn(() => chain)
  const maybeSingle = vi.fn(() => Promise.resolve(result))
  const chain: Chain = { eq, maybeSingle }
  return { chain, eq, maybeSingle }
}

function makeInsertSingleChain(result: { data: unknown; error: unknown | null }) {
  const single = vi.fn(() => Promise.resolve(result))
  const select = vi.fn(() => ({ single }))
  return { select, single }
}

function makeInsertManyChain(result: { data: unknown[]; error: unknown | null }) {
  const select = vi.fn(() => Promise.resolve(result))
  return { select }
}

function makeUpdateSingleChain(result: { data: unknown; error: unknown | null }) {
  const single = vi.fn(() => Promise.resolve(result))
  const maybeSingle = vi.fn(() => Promise.resolve(result))
  const select = vi.fn(() => ({ single, maybeSingle }))
  const eq = vi.fn(() => chain)
  const chain: Chain = { eq, select }
  return { chain, eq, select, single, maybeSingle }
}

function makeUpdateManyChain(result: { data: unknown[]; error: unknown | null }) {
  const state = {
    eq: [] as Array<[string, unknown]>,
    gt: [] as Array<[string, unknown]>,
    gte: [] as Array<[string, unknown]>,
    lte: [] as Array<[string, unknown]>,
  }
  const select = vi.fn(() => Promise.resolve(result))
  const chain: Chain = {
    eq: vi.fn((column: string, value: unknown) => {
      state.eq.push([column, value])
      return chain
    }),
    gt: vi.fn((column: string, value: unknown) => {
      state.gt.push([column, value])
      return chain
    }),
    gte: vi.fn((column: string, value: unknown) => {
      state.gte.push([column, value])
      return chain
    }),
    lte: vi.fn((column: string, value: unknown) => {
      state.lte.push([column, value])
      return chain
    }),
    select,
  }
  return { chain, state, select }
}

describe('calendar service', () => {
  it('addShow rejects event times in the past', async () => {
    const supabase = {
      from: vi.fn(),
    }

    await expect(
      addShow(supabase as never, 'rep-1', {
        platform: 'TikTok',
        eventTime: '2000-01-01T00:00:00.000Z',
      }),
    ).rejects.toMatchObject({ code: 'EVENT_TIME_PAST' })
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('addShow inserts a scheduled event with default duration and returns discount code arrays', async () => {
    const row = baseRow()
    const insertSingle = makeInsertSingleChain({ data: row, error: null })
    const insert = vi.fn(() => ({ select: insertSingle.select }))
    const supabase = {
      from: vi.fn(() => ({ insert })),
    } as never

    const result = await addShow(supabase, 'rep-1', {
      platform: 'TikTok',
      eventTime: row.event_time as string,
      title: 'Friday Sparkles',
      discountCodes: [{ code: 'SPARKLE10', description: 'Ten percent off' }],
      featuredCollections: ['Celestial'],
    })

    expect(insert).toHaveBeenCalledWith({
      rep_id: 'rep-1',
      platform: 'TikTok',
      event_time: '2099-05-01T20:00:00.000Z',
      time_zone: 'America/New_York',
      duration_minutes: 60,
      title: 'Friday Sparkles',
      description: null,
      discount_codes: [{ code: 'SPARKLE10', description: 'Ten percent off' }],
      featured_collections: ['Celestial'],
      streaming_destinations: [],
      is_recurring: false,
      recurrence_group_id: null,
      recurrence_rule: null,
      status: 'scheduled',
    })
    expect(result.count).toBe(1)
    expect(result.events[0]).toMatchObject({
      id: 'event-1',
      repId: 'rep-1',
      eventTime: '2099-05-01T20:00:00.000Z',
      timeZone: 'America/New_York',
      durationMinutes: 60,
      discountCodes: [{ code: 'SPARKLE10', description: 'Ten percent off' }],
      recurrenceGroupId: null,
      featuredCollections: ['Celestial'],
      status: 'scheduled',
    })
  })

  it('addShow spawns recurring weekly shows that share a recurrence group', async () => {
    const rows = Array.from({ length: 4 }, (_, index) =>
      baseRow({
        id: `event-${index + 1}`,
        title: 'Weekly Sparkles',
        is_recurring: true,
        recurrence_group_id: 'group-1',
        recurrence_rule: 'weekly',
        event_time: new Date(Date.parse('2099-05-01T20:00:00.000Z') + index * 7 * 24 * 60 * 60 * 1000).toISOString(),
      }),
    )
    const insertMany = makeInsertManyChain({ data: rows, error: null })
    const insert = vi.fn(() => ({ select: insertMany.select }))
    const supabase = {
      from: vi.fn(() => ({ insert })),
    } as never

    const result = await addShow(supabase, 'rep-1', {
      platform: 'TikTok',
      eventTime: '2099-05-01T20:00:00.000Z',
      title: 'Weekly Sparkles',
      discountCodes: [{ code: 'BOGO', description: 'Buy one get one' }],
      recurring: { cadence: 'weekly', duration: '1_month' },
    })

    const insertPayload = (insert as unknown as { mock: { calls: unknown[][] } }).mock.calls[0][0] as Array<
      Record<string, unknown>
    >
    expect(insertPayload).toHaveLength(4)
    expect(insertPayload.every((row) => row.is_recurring === true)).toBe(true)
    expect(insertPayload.every((row) => row.recurrence_rule === 'weekly')).toBe(true)
    expect(insertPayload.every((row) => row.status === 'scheduled')).toBe(true)
    expect(insertPayload.every((row) => row.time_zone === 'America/New_York')).toBe(true)
    expect(insertPayload.every((row) => row.discount_codes instanceof Array)).toBe(true)
    expect(new Set(insertPayload.map((row) => row.recurrence_group_id))).toHaveLength(1)
    expect(new Set(insertPayload.map((row) => row.id))).toHaveLength(4)

    expect(result.count).toBe(4)
    expect(result.events).toHaveLength(4)
    expect(result.events[0]).toMatchObject({
      title: 'Weekly Sparkles',
      isRecurring: true,
      timeZone: 'America/New_York',
      recurrenceGroupId: 'group-1',
      recurrenceRule: 'weekly',
    })
  })

  it('normalizes, de-duplicates, and persists event streaming destinations', async () => {
    const row = baseRow({
      streaming_destinations: [
        { platform: 'tiktok', url: 'https://www.tiktok.com/@demo' },
        { platform: 'whatnot', url: 'https://www.whatnot.com/user/demo' },
      ],
    })
    const insertSingle = makeInsertSingleChain({ data: row, error: null })
    const insert = vi.fn(() => ({ select: insertSingle.select }))
    const supabase = { from: vi.fn(() => ({ insert })) } as never

    await addShow(supabase, 'rep-1', {
      platform: 'TikTok',
      eventTime: row.event_time as string,
      streamingDestinations: [
        { platform: 'TikTok', url: 'https://www.tiktok.com/@demo' },
        { platform: 'TikTok', url: 'https://www.tiktok.com/@demo' },
        { platform: 'Whatnot', url: 'https://www.whatnot.com/user/demo' },
      ],
    })

    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      streaming_destinations: [
        { platform: 'tiktok', url: 'https://www.tiktok.com/@demo' },
        { platform: 'whatnot', url: 'https://www.whatnot.com/user/demo' },
      ],
    }))
  })

  it('rejects non-HTTPS and unlabeled custom streaming destinations', async () => {
    const supabase = { from: vi.fn() } as never
    await expect(addShow(supabase, 'rep-1', {
      platform: 'TikTok',
      eventTime: '2099-05-01T20:00:00.000Z',
      streamingDestinations: [{ platform: 'TikTok', url: 'http://example.com/live' }],
    })).rejects.toMatchObject({ code: 'INVALID_INPUT' })
    await expect(addShow(supabase, 'rep-1', {
      platform: 'TikTok',
      eventTime: '2099-05-01T20:00:00.000Z',
      streamingDestinations: [{ platform: 'ShopLive', url: 'https://example.com/live' }],
    })).rejects.toMatchObject({ code: 'INVALID_INPUT' })
  })

  it('addShow creates exact-count repeated shows as standalone one-time entries', async () => {
    const rows = [
      baseRow({
        id: 'event-1',
        title: 'Coffees, Pastries, And Jewelry Reveals',
        is_recurring: false,
        recurrence_group_id: null,
        recurrence_rule: null,
        event_time: '2099-07-07T11:30:00.000Z',
      }),
      baseRow({
        id: 'event-2',
        title: 'Coffees, Pastries, And Jewelry Reveals',
        is_recurring: false,
        recurrence_group_id: null,
        recurrence_rule: null,
        event_time: '2099-07-14T11:30:00.000Z',
      }),
    ]
    const insertMany = makeInsertManyChain({ data: rows, error: null })
    const insert = vi.fn(() => ({ select: insertMany.select }))
    const supabase = {
      from: vi.fn(() => ({ insert })),
    } as never

    const result = await addShow(supabase, 'rep-1', {
      platform: 'TikTok',
      eventTime: '2099-07-07T11:30:00.000Z',
      timeZone: 'America/New_York',
      durationMinutes: 120,
      title: 'Coffees, Pastries, And Jewelry Reveals',
      discountCodes: [{ code: 'Pastries123', description: '10% off' }],
      featuredCollections: ['stacks', 'July birthdays'],
      recurring: { cadence: 'weekly', duration: '1_month', occurrenceCount: 2 },
    })

    const insertPayload = (insert as unknown as { mock: { calls: unknown[][] } }).mock.calls[0][0] as Array<
      Record<string, unknown>
    >
    expect(insertPayload).toHaveLength(2)
    expect(insertPayload.map((row) => row.event_time)).toEqual([
      '2099-07-07T11:30:00.000Z',
      '2099-07-14T11:30:00.000Z',
    ])
    expect(insertPayload.every((row) => row.is_recurring === false)).toBe(true)
    expect(insertPayload.every((row) => row.recurrence_group_id === null)).toBe(true)
    expect(insertPayload.every((row) => row.recurrence_rule === null)).toBe(true)
    expect(insertPayload.every((row) => row.duration_minutes === 120)).toBe(true)

    expect(result.count).toBe(2)
    expect(result.events.every((event) => event.isRecurring === false)).toBe(true)
  })

  it('addShow keeps recurring weekly shows at the same local time across DST', async () => {
    const rows = [
      baseRow({
        id: 'event-1',
        is_recurring: true,
        recurrence_group_id: 'group-1',
        recurrence_rule: 'weekly',
        event_time: '2027-03-08T01:00:00.000Z',
      }),
      baseRow({
        id: 'event-2',
        is_recurring: true,
        recurrence_group_id: 'group-1',
        recurrence_rule: 'weekly',
        event_time: '2027-03-15T00:00:00.000Z',
      }),
      baseRow({
        id: 'event-3',
        is_recurring: true,
        recurrence_group_id: 'group-1',
        recurrence_rule: 'weekly',
        event_time: '2027-03-22T00:00:00.000Z',
      }),
      baseRow({
        id: 'event-4',
        is_recurring: true,
        recurrence_group_id: 'group-1',
        recurrence_rule: 'weekly',
        event_time: '2027-03-29T00:00:00.000Z',
      }),
    ]
    const insertMany = makeInsertManyChain({ data: rows, error: null })
    const insert = vi.fn(() => ({ select: insertMany.select }))
    const supabase = {
      from: vi.fn(() => ({ insert })),
    } as never

    await addShow(supabase, 'rep-1', {
      platform: 'TikTok',
      eventTime: '2027-03-08T01:00:00.000Z',
      timeZone: 'America/New_York',
      title: 'Sunday Sparkles',
      recurring: { cadence: 'weekly', duration: '1_month' },
    })

    const insertPayload = (insert as unknown as { mock: { calls: unknown[][] } }).mock.calls[0][0] as Array<
      Record<string, unknown>
    >
    expect(insertPayload.map((row) => row.event_time)).toEqual([
      '2027-03-08T01:00:00.000Z',
      '2027-03-15T00:00:00.000Z',
      '2027-03-22T00:00:00.000Z',
      '2027-03-29T00:00:00.000Z',
    ])
  })

  it('addShow creates weekday recurring shows for Monday through Friday only', async () => {
    const rows = Array.from({ length: 5 }, (_, index) =>
      baseRow({
        id: `event-${index + 1}`,
        title: 'Live with Heather',
        is_recurring: true,
        recurrence_group_id: 'group-1',
        recurrence_rule: 'weekday',
        event_time: new Date(Date.parse('2099-07-06T13:00:00.000Z') + index * 24 * 60 * 60 * 1000).toISOString(),
      }),
    )
    const insertMany = makeInsertManyChain({ data: rows, error: null })
    const insert = vi.fn(() => ({ select: insertMany.select }))
    const supabase = {
      from: vi.fn(() => ({ insert })),
    } as never

    await addShow(supabase, 'rep-1', {
      platform: 'Facebook Live + TikTok Live',
      eventTime: '2099-07-06T13:00:00.000Z',
      timeZone: 'America/New_York',
      durationMinutes: 420,
      title: 'Live with Heather',
      recurring: { cadence: 'weekday', duration: '1_month' },
    })

    const insertPayload = (insert as unknown as { mock: { calls: unknown[][] } }).mock.calls[0][0] as Array<
      Record<string, unknown>
    >
    expect(insertPayload).toHaveLength(23)
    expect(insertPayload.slice(0, 6).map((row) => row.event_time)).toEqual([
      '2099-07-06T13:00:00.000Z',
      '2099-07-07T13:00:00.000Z',
      '2099-07-08T13:00:00.000Z',
      '2099-07-09T13:00:00.000Z',
      '2099-07-10T13:00:00.000Z',
      '2099-07-13T13:00:00.000Z',
    ])
    expect(insertPayload.every((row) => row.is_recurring === true)).toBe(true)
    expect(insertPayload.every((row) => row.recurrence_rule === 'weekday')).toBe(true)
    expect(insertPayload.every((row) => row.duration_minutes === 420)).toBe(true)
  })

  it('addShow moves a weekend weekday-series start to the next Monday', async () => {
    const rows = [
      baseRow({
        id: 'event-1',
        title: 'Weekend Repair Weekday Series',
        is_recurring: true,
        recurrence_group_id: 'group-1',
        recurrence_rule: 'weekday',
        event_time: '2099-07-06T13:00:00.000Z',
      }),
    ]
    const insertMany = makeInsertManyChain({ data: rows, error: null })
    const insert = vi.fn(() => ({ select: insertMany.select }))
    const supabase = {
      from: vi.fn(() => ({ insert })),
    } as never

    await addShow(supabase, 'rep-1', {
      platform: 'TikTok',
      eventTime: '2099-07-05T13:00:00.000Z',
      timeZone: 'America/New_York',
      title: 'Weekend Repair Weekday Series',
      recurring: { cadence: 'weekday', duration: '1_month' },
    })

    const insertPayload = (insert as unknown as { mock: { calls: unknown[][] } }).mock.calls[0][0] as Array<
      Record<string, unknown>
    >
    expect(insertPayload[0].event_time).toBe('2099-07-06T13:00:00.000Z')
  })

  it('addShow rejects more than 10 discount codes', async () => {
    const supabase = {
      from: vi.fn(),
    }

    await expect(
      addShow(supabase as never, 'rep-1', {
        platform: 'TikTok',
        eventTime: '2099-05-01T20:00:00.000Z',
        discountCodes: Array.from({ length: 11 }, (_, index) => ({
          code: `CODE${index + 1}`,
          description: `Code ${index + 1}`,
        })),
      }),
    ).rejects.toMatchObject({ code: 'TOO_MANY_DISCOUNT_CODES' })
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('listMyShows defaults to upcoming scheduled/live events ordered ascending and returns totalCount', async () => {
    const scheduledRow = baseRow()
    const liveChain = makeListChain({ data: [], count: 2, error: null })
    const scheduledChain = makeListChain({ data: [scheduledRow], count: 7, error: null })
    const from = vi
      .fn()
      .mockReturnValueOnce({ select: vi.fn(() => liveChain.chain) })
      .mockReturnValueOnce({ select: vi.fn(() => scheduledChain.chain) })
    const supabase = { from } as never

    const result = await listMyShows(supabase, 'rep-1')

    expect(liveChain.state.eq).toEqual([
      ['rep_id', 'rep-1'],
      ['status', 'live'],
    ])
    expect(liveChain.state.gt).toEqual([])
    expect(scheduledChain.state.eq).toEqual([
      ['rep_id', 'rep-1'],
      ['status', 'scheduled'],
    ])
    expect(scheduledChain.state.gt[0][0]).toBe('event_time')
    expect(scheduledChain.state.order).toEqual([['event_time', { ascending: true }]])
    expect(scheduledChain.state.limit).toEqual([10])
    expect(result.totalCount).toBe(9)
    expect(result.events[0]).toMatchObject({
      id: 'event-1',
      title: 'Friday Sparkles',
      timeZone: 'America/New_York',
      discountCodes: [{ code: 'SPARKLE10', description: 'Ten percent off' }],
      featuredCollections: ['Celestial'],
    })
  })

  it('listMyShows keeps currently-live shows in the default upcoming path even if their start time is in the past', async () => {
    const liveRow = baseRow({
      id: 'live-1',
      status: 'live',
      event_time: '2099-04-30T20:00:00.000Z',
      title: 'Live Right Now',
    })
    const scheduledRow = baseRow({
      id: 'event-2',
      status: 'scheduled',
      event_time: '2099-05-02T20:00:00.000Z',
      title: 'Tomorrow Night',
    })

    const liveChain = makeListChain({ data: [liveRow], count: 1, error: null })
    const scheduledChain = makeListChain({ data: [scheduledRow], count: 1, error: null })
    const from = vi
      .fn()
      .mockReturnValueOnce({ select: vi.fn(() => liveChain.chain) })
      .mockReturnValueOnce({ select: vi.fn(() => scheduledChain.chain) })

    const supabase = { from } as never

    const result = await listMyShows(supabase, 'rep-1')

    expect(liveChain.state.eq).toEqual([
      ['rep_id', 'rep-1'],
      ['status', 'live'],
    ])
    expect(liveChain.state.gt).toEqual([])
    expect(scheduledChain.state.eq).toEqual([
      ['rep_id', 'rep-1'],
      ['status', 'scheduled'],
    ])
    expect(scheduledChain.state.gt[0][0]).toBe('event_time')
    expect(result.totalCount).toBe(2)
    expect(result.events.map((event) => event.id)).toEqual(['live-1', 'event-2'])
  })

  it('listMyShows can constrain history to events whose start time has passed', async () => {
    const historyChain = makeListChain({
      data: [baseRow({ status: 'cancelled', event_time: '2026-09-08T20:00:00.000Z' })],
      count: 1,
      error: null,
    })
    const supabase = {
      from: vi.fn(() => ({ select: vi.fn(() => historyChain.chain) })),
    } as never

    const result = await listMyShows(supabase, 'rep-1', {
      upcoming: false,
      pastOnly: true,
      status: ['completed', 'cancelled'],
      limit: 60,
    })

    expect(historyChain.state.gt).toEqual([])
    expect(historyChain.state.lte[0][0]).toBe('event_time')
    expect(historyChain.state.order).toEqual([['event_time', { ascending: false }]])
    expect(result.events).toHaveLength(1)
  })

  it('updateShow rejects events that are no longer scheduled', async () => {
    const current = makeSelectSingleChain({
      data: baseRow({ status: 'live' }),
      error: null,
    })
    const supabase = {
      from: vi.fn(() => ({ select: vi.fn(() => current.chain) })),
    } as never

    await expect(
      updateShow(supabase, 'rep-1', 'event-1', { title: 'Moved title' }),
    ).rejects.toMatchObject({ code: 'EVENT_NOT_EDITABLE' })
  })

  it('updateShow applies a patch to all future events in a recurrence group when applyToSeries is true', async () => {
    const current = makeSelectSingleChain({
      data: baseRow({
        id: 'event-1',
        recurrence_group_id: 'group-1',
        is_recurring: true,
        recurrence_rule: 'weekly',
      }),
      error: null,
    })
    const updatedRows = [
      baseRow({
        id: 'event-1',
        title: 'Wednesday Sparkles',
        recurrence_group_id: 'group-1',
        is_recurring: true,
        recurrence_rule: 'weekly',
        discount_codes: [{ code: 'NEWCODE', description: 'Updated' }],
      }),
      baseRow({
        id: 'event-2',
        title: 'Wednesday Sparkles',
        recurrence_group_id: 'group-1',
        is_recurring: true,
        recurrence_rule: 'weekly',
        discount_codes: [{ code: 'NEWCODE', description: 'Updated' }],
      }),
    ]
    const updated = makeUpdateManyChain({ data: updatedRows, error: null })

    const from = vi
      .fn()
      .mockReturnValueOnce({ select: vi.fn(() => current.chain) })
      .mockReturnValueOnce({ update: vi.fn(() => updated.chain) })
      .mockReturnValueOnce({ select: vi.fn(() => current.chain) })

    const supabase = { from } as never

    const result = await updateShow(supabase, 'rep-1', 'event-1', {
      title: 'Wednesday Sparkles',
      discountCodes: [{ code: 'NEWCODE', description: 'Updated' }],
      timeZone: 'America/New_York',
      streamingDestinations: [
        { platform: 'TikTok', url: 'https://www.tiktok.com/@demo' },
        { platform: 'Whatnot', url: 'https://www.whatnot.com/user/demo' },
      ],
      applyToSeries: true,
    })

    const updateCall = (from.mock.results[1].value.update as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(updateCall.title).toBe('Wednesday Sparkles')
    expect(updateCall.discount_codes).toEqual([{ code: 'NEWCODE', description: 'Updated' }])
    expect(updateCall.time_zone).toBe('America/New_York')
    expect(updateCall.streaming_destinations).toEqual([
      { platform: 'tiktok', url: 'https://www.tiktok.com/@demo' },
      { platform: 'whatnot', url: 'https://www.whatnot.com/user/demo' },
    ])
    expect(typeof updateCall.updated_at).toBe('string')
    expect(updated.state.eq).toEqual([
      ['rep_id', 'rep-1'],
      ['recurrence_group_id', 'group-1'],
      ['status', 'scheduled'],
    ])
    expect(updated.state.gte).toEqual([['event_time', '2099-05-01T20:00:00.000Z']])
    expect(result.updatedCount).toBe(2)
    expect(result.event.title).toBe('Wednesday Sparkles')
    expect(result.event.discountCodes).toEqual([{ code: 'NEWCODE', description: 'Updated' }])
  })

  it('addShow can explicitly create a real series even when occurrenceCount is present for preview', async () => {
    const rows = Array.from({ length: 13 }, (_, index) =>
      baseRow({
        id: `event-${index + 1}`,
        title: 'Previewed Weekly Sparkles',
        is_recurring: true,
        recurrence_group_id: 'group-1',
        recurrence_rule: 'weekly',
        event_time: new Date(Date.parse('2099-05-01T20:00:00.000Z') + index * 7 * 24 * 60 * 60 * 1000).toISOString(),
      }),
    )
    const insertMany = makeInsertManyChain({ data: rows, error: null })
    const insert = vi.fn(() => ({ select: insertMany.select }))
    const supabase = {
      from: vi.fn(() => ({ insert })),
    } as never

    const result = await addShow(supabase, 'rep-1', {
      platform: 'TikTok',
      eventTime: '2099-05-01T20:00:00.000Z',
      title: 'Previewed Weekly Sparkles',
      recurring: {
        cadence: 'weekly',
        duration: '3_months',
        occurrenceCount: 13,
        mode: 'series',
      },
    })

    const insertPayload = (insert as unknown as { mock: { calls: unknown[][] } }).mock.calls[0][0] as Array<
      Record<string, unknown>
    >
    expect(insertPayload).toHaveLength(13)
    expect(insertPayload.every((row) => row.is_recurring === true)).toBe(true)
    expect(new Set(insertPayload.map((row) => row.recurrence_group_id))).toHaveLength(1)
    expect(result.events.every((event) => event.isRecurring)).toBe(true)
  })

  it('updateShow rejects applyToSeries for a non-recurring event', async () => {
    const current = makeSelectSingleChain({
      data: baseRow({ recurrence_group_id: null, is_recurring: false }),
      error: null,
    })
    const supabase = {
      from: vi.fn(() => ({ select: vi.fn(() => current.chain) })),
    } as never

    await expect(
      updateShow(supabase, 'rep-1', 'event-1', {
        title: 'Moved title',
        applyToSeries: true,
      }),
    ).rejects.toMatchObject({ code: 'NOT_A_SERIES' })
  })

  it('updateShow rejects eventTime when applying a patch to a recurring series', async () => {
    const current = makeSelectSingleChain({
      data: baseRow({
        id: 'event-1',
        recurrence_group_id: 'group-1',
        is_recurring: true,
        recurrence_rule: 'weekly',
      }),
      error: null,
    })
    const supabase = {
      from: vi.fn(() => ({ select: vi.fn(() => current.chain) })),
    } as never

    await expect(
      updateShow(supabase, 'rep-1', 'event-1', {
        eventTime: '2099-06-01T20:00:00.000Z',
        applyToSeries: true,
      }),
    ).rejects.toMatchObject({
      code: 'SERIES_TIME_UPDATE_UNSUPPORTED',
    })
    expect(supabase.from).toHaveBeenCalledTimes(1)
  })

  it('cancelShow only allows scheduled/live events and returns the cancelled row', async () => {
    const current = makeSelectSingleChain({
      data: baseRow({ status: 'scheduled' }),
      error: null,
    })
    const cancelledRow = baseRow({ status: 'cancelled' })
    const updated = makeUpdateSingleChain({ data: cancelledRow, error: null })

    const from = vi
      .fn()
      .mockReturnValueOnce({ select: vi.fn(() => current.chain) })
      .mockReturnValueOnce({ update: vi.fn(() => updated.chain) })

    const supabase = { from } as never

    const result = await cancelShow(supabase, 'rep-1', 'event-1', 'sick kid')

    const updateCall = (from.mock.results[1].value.update as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(updateCall.status).toBe('cancelled')
    expect(typeof updateCall.updated_at).toBe('string')
    expect(result.event.status).toBe('cancelled')
  })

  it('cancelShowSeriesFuture cancels the selected occurrence and future scheduled events in its series', async () => {
    const current = makeSelectSingleChain({
      data: baseRow({
        id: 'event-2',
        recurrence_group_id: 'group-1',
        is_recurring: true,
        recurrence_rule: 'weekly',
        event_time: '2099-05-08T20:00:00.000Z',
      }),
      error: null,
    })
    const updatedRows = [
      baseRow({
        id: 'event-2',
        recurrence_group_id: 'group-1',
        is_recurring: true,
        status: 'cancelled',
        event_time: '2099-05-08T20:00:00.000Z',
      }),
      baseRow({
        id: 'event-3',
        recurrence_group_id: 'group-1',
        is_recurring: true,
        status: 'cancelled',
        event_time: '2099-05-15T20:00:00.000Z',
      }),
    ]
    const updated = makeUpdateManyChain({ data: updatedRows, error: null })

    const from = vi
      .fn()
      .mockReturnValueOnce({ select: vi.fn(() => current.chain) })
      .mockReturnValueOnce({ update: vi.fn(() => updated.chain) })

    const supabase = { from } as never

    const result = await cancelShowSeriesFuture(
      supabase,
      'rep-1',
      'event-2',
      'rep wants to stop Friday shows',
    )

    const updateCall = (from.mock.results[1].value.update as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(updateCall.status).toBe('cancelled')
    expect(typeof updateCall.updated_at).toBe('string')
    expect(updated.state.eq).toEqual([
      ['rep_id', 'rep-1'],
      ['recurrence_group_id', 'group-1'],
      ['status', 'scheduled'],
    ])
    expect(updated.state.gte).toEqual([['event_time', '2099-05-08T20:00:00.000Z']])
    expect(result.cancelledCount).toBe(2)
    expect(result.events.map((event) => event.id)).toEqual(['event-2', 'event-3'])
  })

  it('cancelShowSeriesFuture rejects a non-recurring show', async () => {
    const current = makeSelectSingleChain({
      data: baseRow({ recurrence_group_id: null, is_recurring: false }),
      error: null,
    })
    const supabase = {
      from: vi.fn(() => ({ select: vi.fn(() => current.chain) })),
    } as never

    await expect(
      cancelShowSeriesFuture(supabase, 'rep-1', 'event-1'),
    ).rejects.toMatchObject({ code: 'NOT_A_SERIES' })
  })

  it('pauseShowSeriesUntil cancels only scheduled occurrences through the pause end time', async () => {
    const current = makeSelectSingleChain({
      data: baseRow({
        id: 'event-2',
        recurrence_group_id: 'group-1',
        is_recurring: true,
        recurrence_rule: 'weekly',
        event_time: '2099-05-08T20:00:00.000Z',
      }),
      error: null,
    })
    const pausedRows = [
      baseRow({
        id: 'event-2',
        recurrence_group_id: 'group-1',
        is_recurring: true,
        status: 'cancelled',
        event_time: '2099-05-08T20:00:00.000Z',
      }),
      baseRow({
        id: 'event-3',
        recurrence_group_id: 'group-1',
        is_recurring: true,
        status: 'cancelled',
        event_time: '2099-05-15T20:00:00.000Z',
      }),
    ]
    const updated = makeUpdateManyChain({ data: pausedRows, error: null })
    const pauseUntil = '2099-05-22T00:00:00.000Z'

    const from = vi
      .fn()
      .mockReturnValueOnce({ select: vi.fn(() => current.chain) })
      .mockReturnValueOnce({ update: vi.fn(() => updated.chain) })

    const supabase = { from } as never

    const result = await pauseShowSeriesUntil(
      supabase,
      'rep-1',
      'event-2',
      pauseUntil,
      'family travel',
    )

    const updateCall = (from.mock.results[1].value.update as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(updateCall.status).toBe('cancelled')
    expect(updated.state.eq).toEqual([
      ['rep_id', 'rep-1'],
      ['recurrence_group_id', 'group-1'],
      ['status', 'scheduled'],
    ])
    expect(updated.state.gte).toEqual([['event_time', '2099-05-08T20:00:00.000Z']])
    expect(updated.state.lte).toEqual([['event_time', pauseUntil]])
    expect(result.pausedCount).toBe(2)
    expect(result.pauseUntil).toBe(pauseUntil)
    expect(result.events.map((event) => event.id)).toEqual(['event-2', 'event-3'])
  })

  it('pauseShowSeriesUntil rejects a pause end before the selected occurrence', async () => {
    const current = makeSelectSingleChain({
      data: baseRow({
        id: 'event-2',
        recurrence_group_id: 'group-1',
        is_recurring: true,
        event_time: '2099-05-08T20:00:00.000Z',
      }),
      error: null,
    })
    const supabase = {
      from: vi.fn(() => ({ select: vi.fn(() => current.chain) })),
    } as never

    await expect(
      pauseShowSeriesUntil(
        supabase,
        'rep-1',
        'event-2',
        '2099-05-01T20:00:00.000Z',
      ),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' })
  })

  it('startShow moves a scheduled event to live and returns the live event', async () => {
    const current = makeSelectSingleChain({
      data: baseRow({ status: 'scheduled' }),
      error: null,
    })
    const liveRow = baseRow({ status: 'live' })
    const updated = makeUpdateSingleChain({ data: liveRow, error: null })

    const from = vi
      .fn()
      .mockReturnValueOnce({ select: vi.fn(() => current.chain) })
      .mockReturnValueOnce({ update: vi.fn(() => updated.chain) })

    const supabase = { from } as never

    const result = await startShow(supabase, 'rep-1', 'event-1')

    const updateCall = (from.mock.results[1].value.update as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(updateCall.status).toBe('live')
    expect(typeof updateCall.updated_at).toBe('string')
    expect(result.event.status).toBe('live')
  })

  it('startShow rejects events that are not scheduled', async () => {
    const current = makeSelectSingleChain({
      data: baseRow({ status: 'completed' }),
      error: null,
    })
    const supabase = {
      from: vi.fn(() => ({ select: vi.fn(() => current.chain) })),
    } as never

    await expect(startShow(supabase, 'rep-1', 'event-1')).rejects.toMatchObject({
      code: 'EVENT_NOT_STARTABLE',
    })
  })

  it('startShow treats an already-live owned event as an idempotent retry', async () => {
    const current = makeSelectSingleChain({
      data: baseRow({ status: 'live' }),
      error: null,
    })
    const supabase = {
      from: vi.fn(() => ({ select: vi.fn(() => current.chain) })),
    } as never

    const result = await startShow(supabase, 'rep-1', 'event-1')

    expect(result.event.status).toBe('live')
    expect(supabase.from).toHaveBeenCalledTimes(1)
  })

  it('endShow moves a live event to completed and returns the completed event', async () => {
    const current = makeSelectSingleChain({
      data: baseRow({ status: 'live' }),
      error: null,
    })
    const completedRow = baseRow({ status: 'completed' })
    const updated = makeUpdateSingleChain({ data: completedRow, error: null })

    const from = vi
      .fn()
      .mockReturnValueOnce({ select: vi.fn(() => current.chain) })
      .mockReturnValueOnce({ update: vi.fn(() => updated.chain) })

    const supabase = { from } as never

    const result = await endShow(supabase, 'rep-1', 'event-1')

    const updateCall = (from.mock.results[1].value.update as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(updateCall.status).toBe('completed')
    expect(typeof updateCall.updated_at).toBe('string')
    expect(result.event.status).toBe('completed')
  })

  it('endShow rejects events that are not live', async () => {
    const current = makeSelectSingleChain({
      data: baseRow({ status: 'scheduled' }),
      error: null,
    })
    const supabase = {
      from: vi.fn(() => ({ select: vi.fn(() => current.chain) })),
    } as never

    await expect(endShow(supabase, 'rep-1', 'event-1')).rejects.toMatchObject({
      code: 'EVENT_NOT_ENDABLE',
    })
  })

  it('endShow rejects when the live event changed status before the update landed', async () => {
    const current = makeSelectSingleChain({
      data: baseRow({ status: 'live' }),
      error: null,
    })
    const updated = makeUpdateSingleChain({ data: null, error: null })

    const from = vi
      .fn()
      .mockReturnValueOnce({ select: vi.fn(() => current.chain) })
      .mockReturnValueOnce({ update: vi.fn(() => updated.chain) })

    const supabase = { from } as never

    await expect(endShow(supabase, 'rep-1', 'event-1')).rejects.toMatchObject({
      code: 'EVENT_NOT_ENDABLE',
    })
    expect(updated.eq).toHaveBeenCalledWith('status', 'live')
  })
})
