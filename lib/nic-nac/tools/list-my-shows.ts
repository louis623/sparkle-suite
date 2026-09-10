import { z } from 'zod'
import { tool } from 'ai'
import type { SupabaseClient } from '@supabase/supabase-js'
import { listMyShows } from '@/lib/services/calendar'
import { ServiceError } from '@/lib/services/errors'
import { NicNacToolError } from '@/lib/nic-nac/errors'
import type { CalendarEvent } from '@/lib/services/types'
import type { ToolDefinition } from './types'

const inputSchema = z.object({
  upcoming: z.boolean().optional(),
  limit: z.number().int().positive().max(20).optional(),
})

export type ListMyShowsToolInput = z.infer<typeof inputSchema>

function explainServiceError(err: unknown): never {
  if (err instanceof ServiceError) {
    throw new NicNacToolError({
      code: err.code,
      userMessage: err.userMessage,
      cause: err,
    })
  }
  throw err
}

function formatLocalInstant(instant: Date, timeZone: string) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(instant)
}

function localSchedule(event: CalendarEvent) {
  const start = new Date(event.eventTime)
  const end = new Date(start.getTime() + event.durationMinutes * 60_000)
  const localStart = formatLocalInstant(start, event.timeZone)
  const localEnd = formatLocalInstant(end, event.timeZone)
  return {
    localStart,
    localEnd,
    displaySchedule: `${localStart} through ${localEnd}`,
  }
}

function summarizeReturnedSeries(events: CalendarEvent[]) {
  const summaries = new Map<string, {
    recurrenceGroupId: string
    cadence: string | null
    returnedOccurrenceCount: number
    nextEventId: string
    firstEventTime: string
    lastEventTime: string
    timeZone: string
    platform: string
    title: string | null
    durationMinutes: number
    displaySchedule: string
  }>()

  for (const event of events) {
    if (!event.recurrenceGroupId) continue
    const existing = summaries.get(event.recurrenceGroupId)
    if (existing) {
      existing.returnedOccurrenceCount += 1
      existing.lastEventTime = event.eventTime
      continue
    }
    summaries.set(event.recurrenceGroupId, {
      recurrenceGroupId: event.recurrenceGroupId,
      cadence: event.recurrenceRule,
      returnedOccurrenceCount: 1,
      nextEventId: event.id,
      firstEventTime: event.eventTime,
      lastEventTime: event.eventTime,
      timeZone: event.timeZone,
      platform: event.platform,
      title: event.title,
      durationMinutes: event.durationMinutes,
      displaySchedule: localSchedule(event).displaySchedule,
    })
  }

  return [...summaries.values()]
}

export async function readMyShowsForNicNac(
  ctx: { repId: string; supabase: SupabaseClient },
  input: ListMyShowsToolInput = {},
) {
  let result: Awaited<ReturnType<typeof listMyShows>>
  try {
    result = await listMyShows(ctx.supabase, ctx.repId, input)
  } catch (err) {
    explainServiceError(err)
  }

  return {
    count: result.events.length,
    totalCount: result.totalCount,
    truncated: result.totalCount > result.events.length,
    recurringSeries: summarizeReturnedSeries(result.events),
    events: result.events.map((event) => ({
      eventId: event.id,
      platform: event.platform,
      eventTime: event.eventTime,
      timeZone: event.timeZone,
      durationMinutes: event.durationMinutes,
      title: event.title,
      description: event.description,
      discountCodes: event.discountCodes,
      discountCodesSummary: event.discountCodes.length
        ? event.discountCodes
            .map((discountCode) => `${discountCode.code} (${discountCode.description})`)
            .join(', ')
        : null,
      featuredCollections: event.featuredCollections,
      isRecurring: event.isRecurring,
      recurrenceGroupId: event.recurrenceGroupId,
      recurrenceRule: event.recurrenceRule,
      status: event.status,
      ...localSchedule(event),
    })),
  }
}

export function makeListMyShowsTool(ctx: { repId: string; supabase: SupabaseClient }) {
  return tool({
    description:
      "Directly read the rep's Calendar for questions such as what is scheduled now, today, tonight, next, or upcoming. Defaults to upcoming scheduled shows. " +
      'Use displaySchedule/localStart/localEnd as the trusted rep-local interpretation; do not reinterpret the ISO timestamp as local clock time. recurringSeries groups recurring rows and gives the nextEventId to use with a single applyToSeries update. ' +
      'A Calendar read is complete after you answer from this result and must not control a later add, update, or unrelated request. Do not call prepare_calendar_work for a simple Calendar read. Set upcoming=false to see past shows too.',
    inputSchema,
    execute: async ({ upcoming, limit }) =>
      readMyShowsForNicNac(ctx, { upcoming, limit }),
  })
}

export const listMyShowsTool: ToolDefinition = {
  name: 'list_my_shows',
  readOnly: true,
  build: (ctx) => makeListMyShowsTool({ repId: ctx.repId, supabase: ctx.supabase }),
}
