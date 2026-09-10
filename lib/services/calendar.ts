import { randomUUID } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  type EventStatus,
  type CalendarEvent,
  type AddShowInput,
  type AddShowResult,
  type ListShowsInput,
  type ListShowsResult,
  type UpdateShowInput,
  type UpdateShowResult,
  type CancelShowResult,
  type CancelShowSeriesResult,
  type PauseShowSeriesResult,
  type ShowStatusTransitionResult,
  type DiscountCode,
  type RecurringShowInput,
  type StreamingDestination,
  type StreamingDestinationInput,
} from './types'
import { errors } from './errors'
import {
  DEFAULT_REP_TIME_ZONE,
  assertValidTimeZone,
} from './calendar-timezone'
import {
  normalizeStreamingDestinations,
  StreamingDestinationValidationError,
} from './streaming-destinations'

const EVENT_SELECT = `
  id, rep_id, platform, event_time, time_zone, duration_minutes, title, description,
  discount_codes, featured_collections, streaming_destinations, is_recurring, recurrence_group_id,
  recurrence_rule, status, created_at, updated_at
`

type CalendarEventRow = {
  id: string
  rep_id: string
  platform: string
  event_time: string
  time_zone: string | null
  duration_minutes: number | null
  title: string | null
  description: string | null
  discount_codes: DiscountCode[] | null
  featured_collections: string[] | null
  streaming_destinations: StreamingDestination[] | null
  is_recurring: boolean | null
  recurrence_group_id: string | null
  recurrence_rule: string | null
  status: EventStatus
  created_at: string
  updated_at: string
}

type CalendarEventUpdate = {
  updated_at: string
  platform?: string
  event_time?: string
  time_zone?: string
  duration_minutes?: number
  title?: string | null
  description?: string | null
  discount_codes?: DiscountCode[]
  featured_collections?: string[] | null
  streaming_destinations?: StreamingDestination[]
}

function normalizeOptionalText(value: string | undefined): string | null {
  if (value === undefined) return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function normalizeRequiredPlatform(platform: string): string {
  const trimmed = platform.trim()
  if (!trimmed) throw errors.MISSING_PLATFORM()
  return trimmed
}

function normalizeDuration(durationMinutes: number | undefined): number {
  if (durationMinutes === undefined) return 60
  if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) {
    throw errors.INVALID_INPUT(
      'durationMinutes must be a positive integer',
      'Show duration needs to be a whole number of minutes.',
    )
  }
  return durationMinutes
}

function validatePatchDuration(durationMinutes: number | undefined): number | undefined {
  if (durationMinutes === undefined) return undefined
  if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) {
    throw errors.INVALID_INPUT(
      'durationMinutes must be a positive integer',
      'Show duration needs to be a whole number of minutes.',
    )
  }
  return durationMinutes
}

function normalizeFutureEventTime(eventTime: string | undefined): string {
  if (!eventTime?.trim()) throw errors.MISSING_EVENT_TIME()
  const parsed = new Date(eventTime)
  if (Number.isNaN(parsed.getTime())) {
    throw errors.INVALID_INPUT('eventTime must be a valid ISO timestamp')
  }
  if (parsed.getTime() <= Date.now()) throw errors.EVENT_TIME_PAST()
  return parsed.toISOString()
}

function normalizeEventTimeZone(timeZone: string | undefined): string {
  try {
    return assertValidTimeZone(timeZone)
  } catch {
    throw errors.INVALID_INPUT(
      'timeZone must be a valid IANA timezone',
      'Show timezone needs to be a valid timezone like America/New_York.',
    )
  }
}

function normalizeDiscountCodes(discountCodes: DiscountCode[] | undefined): DiscountCode[] {
  if (!discountCodes) return []
  if (discountCodes.length > 10) throw errors.TOO_MANY_DISCOUNT_CODES()

  return discountCodes.map((discountCode) => {
    const code = discountCode.code.trim()
    if (!code) throw errors.EMPTY_DISCOUNT_CODE()

    return {
      code,
      description: discountCode.description.trim(),
    }
  })
}

function getRecurringOccurrenceCount(recurring: RecurringShowInput): number {
  if (recurring.occurrenceCount !== undefined) {
    if (
      !Number.isInteger(recurring.occurrenceCount) ||
      recurring.occurrenceCount <= 0 ||
      recurring.occurrenceCount > 180
    ) {
      throw errors.INVALID_INPUT(
        'occurrenceCount must be an integer from 1 to 180',
        'Bounded repeats need a whole-number count between 1 and 180 shows.',
      )
    }
    return recurring.occurrenceCount
  }

  if (recurring.cadence === 'daily') {
    if (recurring.duration === '1_month') return 30
    if (recurring.duration === '3_months') return 90
    return 180
  }

  if (recurring.cadence === 'weekday') {
    if (recurring.duration === '1_month') return 23
    if (recurring.duration === '3_months') return 66
    return 130
  }

  if (recurring.duration === '1_month') return 4
  if (recurring.duration === '3_months') return 13
  return 26
}

function normalizeEventStreamingDestinations(
  streamingDestinations: StreamingDestinationInput[] | undefined,
): StreamingDestination[] {
  try {
    return normalizeStreamingDestinations(streamingDestinations)
  } catch (error) {
    if (error instanceof StreamingDestinationValidationError) {
      throw errors.INVALID_INPUT('invalid streamingDestinations', error.message)
    }
    throw error
  }
}

type ZonedDateTimeParts = {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
  millisecond: number
}

function getZonedDateTimeParts(date: Date, timeZone: string): ZonedDateTimeParts {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  })
  const values = Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value]),
  )
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
    millisecond: date.getUTCMilliseconds(),
  }
}

function localPartsToUtcMs(parts: ZonedDateTimeParts): number {
  return Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
    parts.millisecond,
  )
}

function addDaysToLocalDate(parts: ZonedDateTimeParts, days: number): ZonedDateTimeParts {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days))
  return {
    ...parts,
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  }
}

function nextWeekdayOffset(parts: ZonedDateTimeParts, occurrenceIndex: number): number {
  let offset = 0
  let seen = 0

  while (true) {
    const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + offset))
    const weekday = date.getUTCDay()
    if (weekday >= 1 && weekday <= 5) {
      if (seen === occurrenceIndex) return offset
      seen += 1
    }
    offset += 1
  }
}

function zonedLocalTimeToIso(parts: ZonedDateTimeParts, timeZone: string): string {
  const targetLocalMs = localPartsToUtcMs(parts)
  let utcMs = targetLocalMs

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const observed = getZonedDateTimeParts(new Date(utcMs), timeZone)
    const delta = targetLocalMs - localPartsToUtcMs(observed)
    if (delta === 0) break
    utcMs += delta
  }

  return new Date(utcMs).toISOString()
}

function buildRecurringEventTimes(
  eventTime: string,
  timeZone: string,
  recurring: RecurringShowInput,
): string[] {
  const occurrences = getRecurringOccurrenceCount(recurring)
  const startInstant = new Date(eventTime)
  const startLocalParts = getZonedDateTimeParts(startInstant, timeZone)

  return Array.from({ length: occurrences }, (_, index) => {
    if (index === 0 && recurring.cadence !== 'weekday') return eventTime
    const daysToAdd =
      recurring.cadence === 'daily'
        ? index
        : recurring.cadence === 'weekday'
          ? nextWeekdayOffset(startLocalParts, index)
          : index * 7
    const nextLocalParts = addDaysToLocalDate(startLocalParts, daysToAdd)
    return zonedLocalTimeToIso(nextLocalParts, timeZone)
  })
}

async function runListShowsQuery(
  supabase: SupabaseClient,
  repId: string,
  statuses: EventStatus[],
  opts: {
    upcomingOnly: boolean
    pastOnly: boolean
    nowIso: string
    limit: number
    ascending: boolean
  },
): Promise<{ rows: CalendarEventRow[]; totalCount: number }> {
  let query = supabase
    .from('calendar_events')
    .select(EVENT_SELECT, { count: 'exact' })
    .eq('rep_id', repId)

  if (opts.upcomingOnly) {
    query = query.gt('event_time', opts.nowIso)
  } else if (opts.pastOnly) {
    query = query.lte('event_time', opts.nowIso)
  }

  if (statuses.length === 1) {
    query = query.eq('status', statuses[0])
  } else {
    query = query.in('status', statuses)
  }

  query = query.order('event_time', { ascending: opts.ascending })
  const { data, error, count } = await query.limit(opts.limit)
  if (error) throw error

  const rows = (data ?? []) as CalendarEventRow[]
  return { rows, totalCount: count ?? rows.length }
}

function mapEvent(row: CalendarEventRow): CalendarEvent {
  return {
    id: row.id,
    repId: row.rep_id,
    platform: row.platform,
    eventTime: row.event_time,
    timeZone: row.time_zone ?? DEFAULT_REP_TIME_ZONE,
    durationMinutes: row.duration_minutes ?? 60,
    title: row.title,
    description: row.description,
    discountCodes: row.discount_codes ?? [],
    featuredCollections: row.featured_collections,
    streamingDestinations: normalizeStreamingDestinations(row.streaming_destinations),
    isRecurring: row.is_recurring ?? false,
    recurrenceGroupId: row.recurrence_group_id,
    recurrenceRule: row.recurrence_rule,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function applyUpdateToRow(
  row: CalendarEventRow,
  update: CalendarEventUpdate,
): CalendarEventRow {
  return {
    ...row,
    platform: update.platform ?? row.platform,
    event_time: update.event_time ?? row.event_time,
    time_zone: update.time_zone ?? row.time_zone,
    duration_minutes: update.duration_minutes ?? row.duration_minutes,
    title: Object.prototype.hasOwnProperty.call(update, 'title')
      ? (update.title ?? null)
      : row.title,
    description: Object.prototype.hasOwnProperty.call(update, 'description')
      ? (update.description ?? null)
      : row.description,
    discount_codes: Object.prototype.hasOwnProperty.call(update, 'discount_codes')
      ? (update.discount_codes ?? [])
      : row.discount_codes,
    featured_collections: Object.prototype.hasOwnProperty.call(update, 'featured_collections')
      ? (update.featured_collections ?? null)
      : row.featured_collections,
    streaming_destinations: Object.prototype.hasOwnProperty.call(update, 'streaming_destinations')
      ? (update.streaming_destinations ?? [])
      : row.streaming_destinations,
    updated_at: update.updated_at,
  }
}

async function getOwnedEvent(
  supabase: SupabaseClient,
  repId: string,
  eventId: string,
): Promise<CalendarEventRow> {
  const { data, error } = await supabase
    .from('calendar_events')
    .select(EVENT_SELECT)
    .eq('id', eventId)
    .maybeSingle()
  if (error) throw error
  if (!data) throw errors.EVENT_NOT_FOUND()

  const row = data as CalendarEventRow
  if (row.rep_id !== repId) throw errors.EVENT_NOT_FOUND()
  return row
}

export async function addShow(
  supabase: SupabaseClient,
  repId: string,
  input: AddShowInput,
): Promise<AddShowResult> {
  if (!repId) throw errors.UNAUTHORIZED('repId required')

  const eventTime = normalizeFutureEventTime(input.eventTime)
  const timeZone = normalizeEventTimeZone(input.timeZone)
  const platform = normalizeRequiredPlatform(input.platform)
  const durationMinutes = normalizeDuration(input.durationMinutes)
  const discountCodes = normalizeDiscountCodes(input.discountCodes)
  const title = normalizeOptionalText(input.title)
  const description = normalizeOptionalText(input.description)
  const featuredCollections = input.featuredCollections ?? null
  const streamingDestinations = normalizeEventStreamingDestinations(input.streamingDestinations)

  if (!input.recurring) {
    const { data, error } = await supabase
      .from('calendar_events')
      .insert({
        rep_id: repId,
        platform,
        event_time: eventTime,
        time_zone: timeZone,
        duration_minutes: durationMinutes,
        title,
        description,
        discount_codes: discountCodes,
        featured_collections: featuredCollections,
        streaming_destinations: streamingDestinations,
        is_recurring: false,
        recurrence_group_id: null,
        recurrence_rule: null,
        status: 'scheduled',
      })
      .select(EVENT_SELECT)
      .single()
    if (error) throw error

    return { events: [mapEvent(data as CalendarEventRow)], count: 1 }
  }

  if (input.recurring.mode === 'exact_count' && input.recurring.occurrenceCount === undefined) {
    throw errors.INVALID_INPUT(
      'recurring.mode exact_count requires occurrenceCount',
      'Tell me exactly how many times you want that repeated show to run.',
    )
  }

  const recurrenceGroupId = randomUUID()
  const shouldCreateSeries =
    input.recurring.mode === 'series' ||
    (input.recurring.mode !== 'exact_count' && input.recurring.occurrenceCount === undefined)
  const eventRows = buildRecurringEventTimes(eventTime, timeZone, input.recurring).map((nextEventTime) => ({
    id: randomUUID(),
    rep_id: repId,
    platform,
    event_time: nextEventTime,
    time_zone: timeZone,
    duration_minutes: durationMinutes,
    title,
    description,
    discount_codes: discountCodes,
    featured_collections: featuredCollections,
    streaming_destinations: streamingDestinations,
    is_recurring: shouldCreateSeries,
    recurrence_group_id: shouldCreateSeries ? recurrenceGroupId : null,
    recurrence_rule: shouldCreateSeries ? input.recurring!.cadence : null,
    status: 'scheduled' as const,
  }))

  const { data, error } = await supabase
    .from('calendar_events')
    .insert(eventRows)
    .select(EVENT_SELECT)
  if (error) throw error

  const events = ((data ?? []) as CalendarEventRow[]).map(mapEvent)
  return { events, count: events.length }
}

export async function listMyShows(
  supabase: SupabaseClient,
  repId: string,
  input: ListShowsInput & { pastOnly?: boolean } = {},
): Promise<ListShowsResult> {
  if (!repId) throw errors.UNAUTHORIZED('repId required')

  const upcoming = input.upcoming ?? true
  const pastOnly = input.pastOnly ?? false
  const limit = input.limit ?? 10
  if (!Number.isInteger(limit) || limit <= 0) {
    throw errors.INVALID_INPUT('limit must be a positive integer')
  }
  if (upcoming && pastOnly) {
    throw errors.INVALID_INPUT('upcoming and pastOnly cannot both be true')
  }

  const requestedStatuses = input.status
    ? Array.isArray(input.status)
      ? input.status
      : [input.status]
    : upcoming
      ? (['scheduled', 'live'] as EventStatus[])
      : (['scheduled', 'live', 'completed'] as EventStatus[])
  const ascending = upcoming
  const nowIso = new Date().toISOString()

  if (upcoming && requestedStatuses.includes('live')) {
    const liveStatuses = requestedStatuses.filter((status) => status === 'live')
    const futureStatuses = requestedStatuses.filter((status) => status !== 'live')

    if (futureStatuses.length === 0) {
      const result = await runListShowsQuery(supabase, repId, liveStatuses, {
        upcomingOnly: false,
        pastOnly,
        nowIso,
        limit,
        ascending,
      })
      return {
        events: result.rows.map(mapEvent),
        totalCount: result.totalCount,
      }
    }

    // Live shows can already be in progress, so they need to bypass the future-time filter.
    const [liveResult, futureResult] = await Promise.all([
      runListShowsQuery(supabase, repId, liveStatuses, {
        upcomingOnly: false,
        pastOnly,
        nowIso,
        limit,
        ascending,
      }),
      runListShowsQuery(supabase, repId, futureStatuses, {
        upcomingOnly: true,
        pastOnly: false,
        nowIso,
        limit,
        ascending,
      }),
    ])

    const events = [...liveResult.rows, ...futureResult.rows]
      .sort((a, b) => Date.parse(a.event_time) - Date.parse(b.event_time))
      .slice(0, limit)
      .map(mapEvent)

    return {
      events,
      totalCount: liveResult.totalCount + futureResult.totalCount,
    }
  }

  const result = await runListShowsQuery(supabase, repId, requestedStatuses, {
    upcomingOnly: upcoming,
    pastOnly,
    nowIso,
    limit,
    ascending,
  })

  return {
    events: result.rows.map(mapEvent),
    totalCount: result.totalCount,
  }
}

export async function updateShow(
  supabase: SupabaseClient,
  repId: string,
  eventId: string,
  patch: UpdateShowInput,
): Promise<UpdateShowResult> {
  if (!repId) throw errors.UNAUTHORIZED('repId required')
  if (!eventId) throw errors.EVENT_NOT_FOUND()

  const current = await getOwnedEvent(supabase, repId, eventId)
  if (current.status !== 'scheduled') throw errors.EVENT_NOT_EDITABLE()
  if (patch.applyToSeries && !current.recurrence_group_id) throw errors.NOT_A_SERIES()
  if (patch.applyToSeries && patch.eventTime !== undefined) {
    throw errors.SERIES_TIME_UPDATE_UNSUPPORTED()
  }

  const update: CalendarEventUpdate = { updated_at: new Date().toISOString() }
  let hasPatch = false

  if (patch.platform !== undefined) {
    update.platform = normalizeRequiredPlatform(patch.platform)
    hasPatch = true
  }
  if (patch.eventTime !== undefined) {
    update.event_time = normalizeFutureEventTime(patch.eventTime)
    hasPatch = true
  }
  if (patch.timeZone !== undefined) {
    update.time_zone = normalizeEventTimeZone(patch.timeZone)
    hasPatch = true
  }
  if (patch.durationMinutes !== undefined) {
    update.duration_minutes = validatePatchDuration(patch.durationMinutes)
    hasPatch = true
  }
  if (patch.title !== undefined) {
    update.title = normalizeOptionalText(patch.title)
    hasPatch = true
  }
  if (patch.description !== undefined) {
    update.description = normalizeOptionalText(patch.description)
    hasPatch = true
  }
  if (patch.discountCodes !== undefined) {
    update.discount_codes = normalizeDiscountCodes(patch.discountCodes)
    hasPatch = true
  }
  if (patch.featuredCollections !== undefined) {
    update.featured_collections = patch.featuredCollections
    hasPatch = true
  }
  if (patch.streamingDestinations !== undefined) {
    update.streaming_destinations = normalizeEventStreamingDestinations(patch.streamingDestinations)
    hasPatch = true
  }

  if (!hasPatch) {
    throw errors.INVALID_INPUT(
      'at least one patch field is required',
      'Tell me what you want to change on that show.',
    )
  }

  if (patch.applyToSeries) {
    const { data, error } = await supabase
      .from('calendar_events')
      .update(update)
      .eq('rep_id', repId)
      .eq('recurrence_group_id', current.recurrence_group_id)
      .gte('event_time', current.event_time)
      .eq('status', 'scheduled')
      .select(EVENT_SELECT)
    if (error) throw error

    const rows = ((data ?? []) as CalendarEventRow[]).map(mapEvent)
    const targetEvent =
      rows.find((event) => event.id === eventId) ?? mapEvent(applyUpdateToRow(current, update))

    return {
      event: targetEvent,
      updatedCount: rows.length,
    }
  }

  const { data, error } = await supabase
    .from('calendar_events')
    .update(update)
    .eq('id', eventId)
    .eq('rep_id', repId)
    .select(EVENT_SELECT)
    .single()
  if (error) throw error

  return { event: mapEvent(data as CalendarEventRow), updatedCount: 1 }
}

export async function cancelShow(
  supabase: SupabaseClient,
  repId: string,
  eventId: string,
  _reason?: string,
): Promise<CancelShowResult> {
  void _reason
  if (!repId) throw errors.UNAUTHORIZED('repId required')
  if (!eventId) throw errors.EVENT_NOT_FOUND()

  const current = await getOwnedEvent(supabase, repId, eventId)
  if (current.status !== 'scheduled' && current.status !== 'live') {
    throw errors.EVENT_NOT_CANCELLABLE()
  }

  const { data, error } = await supabase
    .from('calendar_events')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', eventId)
    .eq('rep_id', repId)
    .select(EVENT_SELECT)
    .single()
  if (error) throw error

  return { event: mapEvent(data as CalendarEventRow) }
}

export async function cancelShowSeriesFuture(
  supabase: SupabaseClient,
  repId: string,
  eventId: string,
  _reason?: string,
): Promise<CancelShowSeriesResult> {
  void _reason
  if (!repId) throw errors.UNAUTHORIZED('repId required')
  if (!eventId) throw errors.EVENT_NOT_FOUND()

  const current = await getOwnedEvent(supabase, repId, eventId)
  if (!current.recurrence_group_id) throw errors.NOT_A_SERIES()
  if (current.status !== 'scheduled') throw errors.EVENT_NOT_CANCELLABLE()

  const { data, error } = await supabase
    .from('calendar_events')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('rep_id', repId)
    .eq('recurrence_group_id', current.recurrence_group_id)
    .gte('event_time', current.event_time)
    .eq('status', 'scheduled')
    .select(EVENT_SELECT)
  if (error) throw error

  const events = ((data ?? []) as CalendarEventRow[]).map(mapEvent)
  return { events, cancelledCount: events.length }
}

export async function pauseShowSeriesUntil(
  supabase: SupabaseClient,
  repId: string,
  eventId: string,
  pauseUntil: string,
  _reason?: string,
): Promise<PauseShowSeriesResult> {
  void _reason
  if (!repId) throw errors.UNAUTHORIZED('repId required')
  if (!eventId) throw errors.EVENT_NOT_FOUND()

  const pauseUntilDate = new Date(pauseUntil)
  if (Number.isNaN(pauseUntilDate.getTime())) {
    throw errors.INVALID_INPUT(
      'pauseUntil must be a valid ISO timestamp',
      'I need the date/time when that pause should end.',
    )
  }

  const current = await getOwnedEvent(supabase, repId, eventId)
  if (!current.recurrence_group_id) throw errors.NOT_A_SERIES()
  if (current.status !== 'scheduled') throw errors.EVENT_NOT_CANCELLABLE()
  if (pauseUntilDate.getTime() < Date.parse(current.event_time)) {
    throw errors.INVALID_INPUT(
      'pauseUntil must be after the selected event time',
      'The pause end needs to be after the first show you want to skip.',
    )
  }

  const normalizedPauseUntil = pauseUntilDate.toISOString()
  const { data, error } = await supabase
    .from('calendar_events')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('rep_id', repId)
    .eq('recurrence_group_id', current.recurrence_group_id)
    .gte('event_time', current.event_time)
    .lte('event_time', normalizedPauseUntil)
    .eq('status', 'scheduled')
    .select(EVENT_SELECT)
  if (error) throw error

  const events = ((data ?? []) as CalendarEventRow[]).map(mapEvent)
  return { events, pausedCount: events.length, pauseUntil: normalizedPauseUntil }
}

async function transitionShowStatus(
  supabase: SupabaseClient,
  repId: string,
  eventId: string,
  expectedStatus: EventStatus,
  nextStatus: EventStatus,
  errorFactory: () => Error,
  options: { allowAlreadyTransitioned?: boolean } = {},
): Promise<ShowStatusTransitionResult> {
  if (!repId) throw errors.UNAUTHORIZED('repId required')
  if (!eventId) throw errors.EVENT_NOT_FOUND()

  const current = await getOwnedEvent(supabase, repId, eventId)
  if (options.allowAlreadyTransitioned && current.status === nextStatus) {
    return { event: mapEvent(current) }
  }
  if (current.status !== expectedStatus) throw errorFactory()

  const { data, error } = await supabase
    .from('calendar_events')
    .update({
      status: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', eventId)
    .eq('rep_id', repId)
    .eq('status', expectedStatus)
    .select(EVENT_SELECT)
    .maybeSingle()
  if (error) throw error
  if (!data) throw errorFactory()

  return { event: mapEvent(data as CalendarEventRow) }
}

export async function startShow(
  supabase: SupabaseClient,
  repId: string,
  eventId: string,
): Promise<ShowStatusTransitionResult> {
  return transitionShowStatus(
    supabase,
    repId,
    eventId,
    'scheduled',
    'live',
    errors.EVENT_NOT_STARTABLE,
    { allowAlreadyTransitioned: true },
  )
}

export async function endShow(
  supabase: SupabaseClient,
  repId: string,
  eventId: string,
): Promise<ShowStatusTransitionResult> {
  return transitionShowStatus(
    supabase,
    repId,
    eventId,
    'live',
    'completed',
    errors.EVENT_NOT_ENDABLE,
  )
}
