import type { UIMessageChunk } from 'ai'
import { isCalendarReadQueryText } from '@/lib/nic-nac/calendar-read-intent'

export const NIC_NAC_EMPTY_RESPONSE_FALLBACK =
  "I’m sorry—I didn’t produce a response that time. Please send that again."

type ToolOutputRecord = Record<string, unknown>

type CalendarReadFallbackInput = {
  upcoming?: boolean
  limit?: number
}

export type NicNacEmptyCalendarReadRecovery = {
  text: string
  toolName: 'list_my_shows'
  succeeded: boolean
  errorMessage: string | null
}

export type NicNacToolFailure = {
  toolName: string
  errorTier: string
  code: string | null
  stage: string | null
  message: string | null
}

function asRecord(output: unknown): ToolOutputRecord {
  return output && typeof output === 'object'
    ? (output as ToolOutputRecord)
    : {}
}

function readString(record: ToolOutputRecord, key: string) {
  const value = record[key]
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function readNumber(record: ToolOutputRecord, key: string) {
  const value = record[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function readRecords(record: ToolOutputRecord, key: string): ToolOutputRecord[] {
  const value = record[key]
  return Array.isArray(value)
    ? value.filter(
        (item): item is ToolOutputRecord =>
          Boolean(item) && typeof item === 'object' && !Array.isArray(item),
      )
    : []
}

function compactLabel(value: unknown, fallback: string) {
  if (typeof value !== 'string') return fallback
  const compact = value.replace(/\s+/g, ' ').trim()
  return compact ? compact.slice(0, 160) : fallback
}

function summarizeRows(
  intro: string,
  rows: ToolOutputRecord[],
  render: (row: ToolOutputRecord, index: number) => string,
) {
  const visible = rows.slice(0, 5)
  const lines = visible.map(render)
  const remainder = rows.length - visible.length
  return [
    intro,
    ...lines,
    ...(remainder > 0 ? [`…and ${remainder} more.`] : []),
  ].join('\n')
}

function summarizeTradeBoard(record: ToolOutputRecord) {
  const listings = readRecords(record, 'listings')
  const count = readNumber(record, 'count') ?? listings.length
  if (count === 0) return 'Your Dance Floor has no matching dancers right now.'

  const intro = `Your Dance Floor has ${count} matching ${count === 1 ? 'dancer' : 'dancers'}.`
  return summarizeRows(intro, listings, (listing, index) => {
    const name = compactLabel(listing.designName, 'Unnamed dancer')
    const item = compactLabel(listing.itemNumber, 'no item number')
    const quantity = readNumber(listing, 'quantityAvailable')
    const status = compactLabel(listing.status, 'status unavailable').replaceAll('_', ' ')
    return `${index + 1}. ${name} (${item}) — ${status}${
      quantity && quantity > 1 ? `, quantity ${quantity}` : ''
    }.`
  })
}

function summarizeTradeRequests(record: ToolOutputRecord) {
  const requests = readRecords(record, 'requests')
  const count = readNumber(record, 'count') ?? requests.length
  if (count === 0) return 'You don’t have any matching trade requests right now.'

  return summarizeRows(
    `You have ${count} matching trade ${count === 1 ? 'request' : 'requests'}.`,
    requests,
    (request, index) => {
      const listing = asRecord(request.listing)
      const design = asRecord(listing.design)
      const customer = compactLabel(request.customerName, 'A customer')
      const name = compactLabel(design.designName, 'an unnamed dancer')
      const item = compactLabel(design.itemNumber, 'no item number')
      const status = compactLabel(request.status, 'status unavailable')
      return `${index + 1}. ${customer} requested ${name} (${item}) — ${status}.`
    },
  )
}

function summarizeFulfillmentQueue(record: ToolOutputRecord) {
  const queue = readRecords(record, 'queue')
  const count = readNumber(record, 'count') ?? queue.length
  if (count === 0) return 'Your fulfillment queue is clear right now.'

  const needsAttention = readNumber(record, 'needsAttentionCount') ?? 0
  return summarizeRows(
    `Your fulfillment queue has ${count} active ${count === 1 ? 'trade' : 'trades'}${
      needsAttention > 0 ? `; ${needsAttention} need attention` : ''
    }.`,
    queue,
    (item, index) => {
      const customer = compactLabel(item.customerName, 'Customer')
      const name = compactLabel(item.designName, 'Unnamed dancer')
      const status = compactLabel(item.status, 'status unavailable')
      const next = compactLabel(item.suggestedNextAction, 'review').replaceAll('_', ' ')
      return `${index + 1}. ${name} for ${customer} — ${status}; next: ${next}.`
    },
  )
}

function summarizeSwapCleanup(record: ToolOutputRecord) {
  const items = readRecords(record, 'items')
  const count = readNumber(record, 'count') ?? items.length
  if (count === 0) return 'You don’t have any revealed trade swaps waiting for cleanup.'

  return summarizeRows(
    `You have ${count} revealed trade ${count === 1 ? 'swap' : 'swaps'} waiting for cleanup.`,
    items,
    (item, index) => {
      const customer = compactLabel(item.customerName, 'Customer')
      const itemNumber = compactLabel(item.revealedItemNumber, 'item number missing')
      const ringSize = compactLabel(item.revealedRingSize, '')
      const status = compactLabel(item.replacementStatus, 'cleanup needed').replaceAll('_', ' ')
      return `${index + 1}. ${customer}: ${itemNumber}${ringSize ? `, ring size ${ringSize}` : ''} — ${status}.`
    },
  )
}

function summarizeCatalogSearch(record: ToolOutputRecord) {
  const results = readRecords(record, 'results')
  const count = readNumber(record, 'count') ?? results.length
  if (count === 0) return 'I couldn’t find a matching jewelry catalog record.'

  return summarizeRows(
    `I found ${count} matching catalog ${count === 1 ? 'record' : 'records'}.`,
    results,
    (result, index) => {
      const name = compactLabel(result.designName, 'Unnamed design')
      const item = compactLabel(result.itemNumber, 'no item number')
      const boardStatus = result.isOnMyBoard === true
        ? 'already on your Dance Floor'
        : 'not currently on your Dance Floor'
      return `${index + 1}. ${name} (${item}); ${boardStatus}.`
    },
  )
}

function summarizeTradeHistory(record: ToolOutputRecord) {
  const items = readRecords(record, 'items')
  const count = readNumber(record, 'count') ?? items.length
  if (count === 0) return 'You don’t have any matching completed or denied trade history yet.'

  return summarizeRows(
    `I found ${count} matching past trade ${count === 1 ? 'record' : 'records'}.`,
    items,
    (item, index) => {
      const design = asRecord(item.design)
      const name = compactLabel(design.designName, 'Unnamed dancer')
      const customer = compactLabel(item.customerName, 'Customer')
      const status = compactLabel(item.status, 'status unavailable')
      return `${index + 1}. ${name} with ${customer} — ${status}.`
    },
  )
}

type ToolRecoveryContext = {
  latestUserText?: string
  now?: Date
}

function summarizeShows(record: ToolOutputRecord, context: ToolRecoveryContext = {}) {
  const events = readRecords(record, 'events')
  const count = readNumber(record, 'count') ?? events.length
  const query = context.latestUserText?.replace(/\s+/g, ' ').trim() ?? ''
  const now = context.now ?? new Date()
  if (count === 0) return summarizeEmptyCalendarRead(query)

  const chronological = [...events].sort(
    (left, right) => readEventTime(left) - readEventTime(right),
  )
  const nextEvent = chronological.find((event) => readEventTime(event) >= now.getTime())

  if (/\bnext\s+(?:show|live|event)\b/i.test(query) && nextEvent) {
    return summarizeNextShow(nextEvent)
  }

  if (/\bright now\b|\bcurrently\b/i.test(query)) {
    const activeEvent = chronological.find((event) => eventIsActive(event, now))
    if (activeEvent) {
      return `Yes — ${compactLabel(activeEvent.title, 'your show')} is happening right now on ${compactLabel(activeEvent.platform, 'your scheduled platform')}.`
    }
    return nextEvent
      ? `You don’t have a show happening right now. ${summarizeNextShow(nextEvent)}`
      : 'You don’t have a show happening right now, and there isn’t another scheduled show coming up.'
  }

  const dateScope = calendarDateScope(query)
  if (dateScope) {
    const timeZone = readEventTimeZone(chronological[0])
    const scopedEvents = chronological.filter((event) =>
      eventFallsInDateScope(event, now, timeZone, dateScope),
    )
    if (dateScope === 'tonight') {
      if (scopedEvents.length === 0) {
        return nextEvent
          ? `No — you don’t have a show tonight. ${summarizeNextShow(nextEvent)}`
          : 'No — you don’t have a show tonight or another show scheduled yet.'
      }
      if (scopedEvents.length === 1) {
        const event = scopedEvents[0]
        return `Yes — you have ${compactLabel(event.title, 'a show')} tonight at ${formatCalendarEventClockTime(event.eventTime, event.timeZone)} on ${compactLabel(event.platform, 'your scheduled platform')}.`
      }
    }

    const label = calendarDateScopeLabel(dateScope)
    if (scopedEvents.length === 0) {
      return nextEvent
        ? `You don’t have a show ${label}. ${summarizeNextShow(nextEvent)}`
        : `You don’t have a show ${label} or another show scheduled yet.`
    }
    return summarizeRows(
      `You have ${scopedEvents.length} ${scopedEvents.length === 1 ? 'show' : 'shows'} ${label}.`,
      scopedEvents,
      summarizeShowRow,
    )
  }

  return summarizeRows(
    `You have ${count} matching ${count === 1 ? 'show' : 'shows'} on your Calendar.`,
    events,
    summarizeShowRow,
  )
}

function summarizeShowRow(event: ToolOutputRecord, index: number) {
  const title = compactLabel(event.title, 'Untitled show')
  const when = formatCalendarEventTime(event.eventTime, event.timeZone)
  const platform = compactLabel(event.platform, 'platform unavailable')
  const status = compactLabel(event.status, 'status unavailable')
  return `${index + 1}. ${title} — ${when} on ${platform} (${status}).`
}

function summarizeNextShow(event: ToolOutputRecord) {
  return `Your next live is ${compactLabel(event.title, 'an untitled show')} — ${formatCalendarEventTime(event.eventTime, event.timeZone)} on ${compactLabel(event.platform, 'your scheduled platform')}.`
}

function readEventTime(event: ToolOutputRecord) {
  return typeof event.eventTime === 'string' ? Date.parse(event.eventTime) : Number.NaN
}

function readEventTimeZone(event: ToolOutputRecord) {
  return typeof event.timeZone === 'string' && event.timeZone.trim()
    ? event.timeZone
    : 'UTC'
}

function eventIsActive(event: ToolOutputRecord, now: Date) {
  const startsAt = readEventTime(event)
  if (!Number.isFinite(startsAt)) return false
  const durationMinutes =
    typeof event.durationMinutes === 'number' && event.durationMinutes > 0
      ? event.durationMinutes
      : 120
  return startsAt <= now.getTime() && now.getTime() < startsAt + durationMinutes * 60_000
}

type CalendarDateScope =
  | 'today'
  | 'tonight'
  | 'tomorrow'
  | 'this_week'
  | 'next_week'
  | 'this_month'

function calendarDateScope(query: string): CalendarDateScope | null {
  if (/\btonight\b/i.test(query)) return 'tonight'
  if (/\btomorrow\b/i.test(query)) return 'tomorrow'
  if (/\bnext week\b/i.test(query)) return 'next_week'
  if (/\bthis week\b/i.test(query)) return 'this_week'
  if (/\bthis month\b/i.test(query)) return 'this_month'
  if (/\btoday\b/i.test(query)) return 'today'
  return null
}

function calendarDateScopeLabel(scope: CalendarDateScope) {
  return scope === 'this_week'
    ? 'this week'
    : scope === 'next_week'
      ? 'next week'
      : scope === 'this_month'
        ? 'this month'
        : scope
}

function summarizeEmptyCalendarRead(query: string) {
  if (/\bnext\s+(?:show|live|event)\b/i.test(query)) {
    return 'You don’t have another live scheduled yet.'
  }
  if (/\bright now\b|\bcurrently\b/i.test(query)) {
    return 'You don’t have a show happening right now, and there isn’t another scheduled show coming up.'
  }
  const scope = calendarDateScope(query)
  if (scope === 'tonight') return 'No — you don’t have a show tonight.'
  if (scope) return `You don’t have a show ${calendarDateScopeLabel(scope)}.`
  return 'You don’t have any matching shows on your Calendar right now.'
}

function eventFallsInDateScope(
  event: ToolOutputRecord,
  now: Date,
  fallbackTimeZone: string,
  scope: CalendarDateScope,
) {
  const eventTime = readEventTime(event)
  if (!Number.isFinite(eventTime)) return false
  const timeZone = readEventTimeZone(event) || fallbackTimeZone
  const eventDate = localCalendarDateKey(new Date(eventTime), timeZone)
  const today = localCalendarDateKey(now, timeZone)
  if (scope === 'today' || scope === 'tonight') return eventDate === today
  if (scope === 'tomorrow') return eventDate === addCalendarDays(today, 1)
  if (scope === 'this_month') return eventDate.slice(0, 7) === today.slice(0, 7)

  const weekday = localWeekdayIndex(now, timeZone)
  const weekStart = addCalendarDays(today, -weekday)
  const weekEnd = addCalendarDays(weekStart, 6)
  if (scope === 'next_week') {
    const nextWeekStart = addCalendarDays(weekStart, 7)
    const nextWeekEnd = addCalendarDays(nextWeekStart, 6)
    return eventDate >= nextWeekStart && eventDate <= nextWeekEnd
  }
  return eventDate >= weekStart && eventDate <= weekEnd
}

function localCalendarDateKey(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const value = (type: 'year' | 'month' | 'day') =>
    parts.find((part) => part.type === type)?.value ?? '00'
  return `${value('year')}-${value('month')}-${value('day')}`
}

function localWeekdayIndex(date: Date, timeZone: string) {
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
  }).format(date)
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(weekday)
}

function addCalendarDays(dateKey: string, days: number) {
  const [year, month, day] = dateKey.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day + days))
  return date.toISOString().slice(0, 10)
}

function formatCalendarEventTime(eventTime: unknown, timeZone: unknown) {
  if (typeof eventTime !== 'string') return 'time unavailable'
  const parsed = new Date(eventTime)
  if (Number.isNaN(parsed.getTime())) return compactLabel(eventTime, 'time unavailable')

  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: typeof timeZone === 'string' && timeZone.trim() ? timeZone : 'UTC',
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    }).format(parsed)
  } catch {
    return compactLabel(eventTime, 'time unavailable')
  }
}

function formatCalendarEventClockTime(eventTime: unknown, timeZone: unknown) {
  if (typeof eventTime !== 'string') return 'the scheduled time'
  const parsed = new Date(eventTime)
  if (Number.isNaN(parsed.getTime())) return compactLabel(eventTime, 'the scheduled time')

  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: typeof timeZone === 'string' && timeZone.trim() ? timeZone : 'UTC',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    }).format(parsed)
  } catch {
    return compactLabel(eventTime, 'the scheduled time')
  }
}

export function getNicNacToolFailure(
  toolName: string,
  output: unknown,
): NicNacToolFailure | null {
  const record = asRecord(output)
  if (record.ok !== false) return null

  return {
    toolName,
    errorTier: readString(record, 'errorTier') ?? 'unknown',
    code: readString(record, 'code'),
    stage: readString(record, 'stage'),
    message: readString(record, 'message'),
  }
}

function toolFailureRecoveryText(failure: NicNacToolFailure): string {
  if (failure.message && failure.errorTier === 'explain') return failure.message
  if (failure.toolName === 'prepare_trade_board_work') {
    if (failure.message && /catalog check failed|paused this dancer add/i.test(failure.message)) {
      return failure.message
    }
    return "I couldn’t check the Dance Floor catalog because Sparkle Suite hit a problem. I haven’t changed anything, and the issue has been logged for review."
  }
  if (failure.message && failure.errorTier === 'escalate' && failure.code) {
    return failure.message
  }
  return failure.message ??
    "Sparkle Suite hit a problem while I was checking that. I haven’t changed anything, and the issue has been logged for review."
}

export function getNicNacToolOnlyRecoveryText(
  toolName: string,
  output: unknown,
  context: ToolRecoveryContext = {},
): string | null {
  const record = asRecord(output)
  const failure = getNicNacToolFailure(toolName, output)
  if (failure) return toolFailureRecoveryText(failure)

  if (toolName === 'prepare_trade_board_work') {
    const nextQuestion = readString(record, 'nextQuestion')
    if (nextQuestion) return nextQuestion

    const missing = Array.isArray(record.requiredBeforeAction)
      ? record.requiredBeforeAction.filter(
          (field): field is string => typeof field === 'string',
        )
      : []
    if (missing.includes('ringSize') && missing.length === 1) {
      return 'What ring size is this physical piece?'
    }
    if (
      missing.some((field) =>
        ['itemNumber', 'designName', 'collectionName', 'jewelryFrontPhoto'].includes(
          field,
        ),
      )
    ) {
      return 'I can help add that dancer. Send the item number or a readable label/details photo, plus a clear customer-facing photo of the jewelry, and I’ll finish the Dance Floor listing.'
    }
    return 'I can help with that Dance Floor piece. Send the item number, a label/details photo, or a short description so I can check the jewelry database first.'
  }

  if (toolName === 'prepare_calendar_work') {
    const intent = readString(record, 'intent')
    if (intent === 'add_show') {
      return 'I can add that show. What title, date and start time (including the time zone), and streaming platform should I use?'
    }
    return 'I can help with that Calendar request. Which show and date or schedule should I use?'
  }

  if (toolName === 'list_my_trade_board') return summarizeTradeBoard(record)
  if (toolName === 'get_trade_requests') return summarizeTradeRequests(record)
  if (toolName === 'get_fulfillment_queue') return summarizeFulfillmentQueue(record)
  if (toolName === 'get_trade_swap_cleanup') return summarizeSwapCleanup(record)
  if (toolName === 'search_jewelry_database') return summarizeCatalogSearch(record)
  if (toolName === 'get_trade_history') return summarizeTradeHistory(record)
  if (toolName === 'list_my_shows') return summarizeShows(record, context)

  return null
}

function getCalendarReadFallbackInput(text: string): CalendarReadFallbackInput {
  return /\b(?:past|previous|earlier|history|last\s+(?:week|month|year)|did i have|have i had)\b/i.test(
    text,
  )
    ? { upcoming: false }
    : {}
}

/**
 * Final read-only safety net for a Calendar question when the provider ends a
 * turn without text and without calling a tool. The ordinary agent/tool path
 * remains primary; this only prevents an honest Calendar read from collapsing
 * into the generic empty-response apology.
 */
export async function recoverNicNacEmptyCalendarRead(args: {
  latestUserText: string
  executedToolNames: readonly string[]
  readShows: (input: CalendarReadFallbackInput) => Promise<unknown>
}): Promise<NicNacEmptyCalendarReadRecovery | null> {
  if (
    args.executedToolNames.includes('list_my_shows') ||
    !isCalendarReadQueryText(args.latestUserText)
  ) {
    return null
  }

  try {
    const output = await args.readShows(
      getCalendarReadFallbackInput(args.latestUserText),
    )
    const text = getNicNacToolOnlyRecoveryText('list_my_shows', output, {
      latestUserText: args.latestUserText,
    })
    if (!text) return null
    return {
      text,
      toolName: 'list_my_shows',
      succeeded: true,
      errorMessage: null,
    }
  } catch (err) {
    return {
      text:
        'I couldn’t read your Calendar because Sparkle Suite hit a problem. I haven’t changed anything, and the issue has been logged for review.',
      toolName: 'list_my_shows',
      succeeded: false,
      errorMessage: err instanceof Error ? err.message : String(err),
    }
  }
}

export function getNicNacMandatoryToolFollowUpText(
  toolName: string,
  output: unknown,
): string | null {
  const record = asRecord(output)
  if (
    toolName === 'update_fulfillment_status' &&
    record.status === 'completed' &&
    record.shouldPromptAddToBoard === true
  ) {
    return 'Fulfillment is complete. Want to add the dancer you received to your Dance Floor now?'
  }
  return null
}

export function isRenderableNicNacStreamChunk(chunk: UIMessageChunk) {
  if (chunk.type === 'text-delta') return /\S/.test(chunk.delta)
  if (chunk.type === 'tool-approval-request') return true
  return chunk.type === 'data-trade-request-card'
}
