import { z } from 'zod'
import { tool } from 'ai'
import type { SupabaseClient } from '@supabase/supabase-js'
import { addShow } from '@/lib/services/calendar'
import { ServiceError } from '@/lib/services/errors'
import { NicNacToolError } from '@/lib/nic-nac/errors'
import {
  missingCustomerShowPlatforms,
  resolveCustomerShowPlatformLinks,
} from '@/lib/amethyst/show-platform-links'
import {
  buildCalendarCreatePlan,
  reconcileAddShowInputWithCalendarPlan,
} from '@/lib/nic-nac/workflows/calendar-plan'
import type { ToolContext, ToolDefinition } from './types'

const MAX_INLINE_MUTATION_EVENTS = 5

const inputSchema = z.object({
  platform: z.string(),
  eventTime: z.iso.datetime({ offset: true }).describe('ISO timestamp with an explicit UTC offset or Z, e.g. 2026-09-04T19:00:00-04:00. timeZone is the display/recurrence zone, not a substitute for the offset.'),
  timeZone: z.string().optional(),
  durationMinutes: z.number().int().positive().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  discountCodes: z.array(z.object({
    code: z.string().min(1),
    description: z.string(),
  })).max(10).optional(),
  featuredCollections: z.array(z.string()).optional(),
  recurring: z.object({
    cadence: z.enum(['daily', 'weekly', 'weekday']),
    duration: z.enum(['1_month', '3_months', 'ongoing']),
    occurrenceCount: z.number().int().min(1).max(180).optional(),
    mode: z.enum(['exact_count', 'series']).optional(),
  }).optional(),
})

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

async function configuredCustomerSiteWatchLinks(
  supabase: SupabaseClient,
  repId: string,
  platform: string,
) {
  // This lookup is advisory for the customer-facing result. Scheduling remains
  // available even when the rep has not configured that platform yet.
  try {
    const client = supabase as unknown as {
      from?: (table: string) => {
        select: (columns: string) => {
          eq: (column: string, value: string) => {
            maybeSingle: () => Promise<{
              data: { social_handles?: unknown } | null
              error: unknown
            }>
          }
        }
      }
    }
    if (!client.from) return { links: [], missingPlatforms: [] }
    const { data, error } = await client
      .from('reps')
      .select('social_handles')
      .eq('id', repId)
      .maybeSingle()
    if (error) return { links: [], missingPlatforms: [] }

    return {
      links: resolveCustomerShowPlatformLinks(platform, data?.social_handles),
      missingPlatforms: missingCustomerShowPlatforms(platform, data?.social_handles),
    }
  } catch {
    return { links: [], missingPlatforms: [] }
  }
}

export function makeAddShowTool(ctx: {
  repId: string
  supabase: SupabaseClient
  agentHarness?: boolean
  latestUserText?: string
  activeCalendarWorkflow?: ToolContext['activeCalendarWorkflow']
}) {
  return tool({
    description:
      'Schedule a new show when the rep explicitly asks to add, create, put, or schedule one on the Calendar. Use this write tool even when the immediately preceding turn was a Calendar read; an empty read result does not answer or block a later add request. Ask only for a missing required scheduling fact and never repeat the earlier read as the answer to an add request. Can schedule a one-time show or a recurring series. ' +
      'For recurring: ask the rep how often (daily, weekly, or weekday/Monday-Friday) and how long (a specific number of times, one month, three months, or ongoing). ' +
      'If the rep says a bounded count like "twice" or "next two Tuesdays", pass recurring.occurrenceCount and create exactly that many entries. ' +
      'In the current build, ongoing schedules out about six months ahead. ' +
      'Discount codes support up to 10 per show as an array of {code, description} pairs. A show platform uses the matching social link already configured in the rep\'s customer-site settings. Do not ask for or save a separate event URL. The result tells you whether that configured customer-facing watch link exists; if it is missing, schedule the show and say the rep has no configured link to share for that platform yet.',
    inputSchema,
    execute: async (input) => {
      try {
        // On the ToolLoopAgent path, the validated structured arguments are
        // authoritative. Saved Calendar context may help the model form those
        // arguments, but it must never rewrite them after tool selection.
        const { input: safeInput, plan } = ctx.agentHarness
          ? {
              input,
              plan: buildCalendarCreatePlan({
                source: 'model_input',
                fields: input,
                recurring: input.recurring,
              }),
            }
          : reconcileAddShowInputWithCalendarPlan({
              input,
              latestUserText: ctx.latestUserText,
              activeCalendarWorkflow: ctx.activeCalendarWorkflow,
            })
        const [result, customerSiteWatch] = await Promise.all([
          addShow(ctx.supabase, ctx.repId, safeInput),
          configuredCustomerSiteWatchLinks(ctx.supabase, ctx.repId, safeInput.platform),
        ])
        const firstEvent = result.events[0] ?? null
        const lastEvent = result.events[result.events.length - 1] ?? null

        return {
          calendarPlan: plan,
          customerSiteWatchLinks: customerSiteWatch.links,
          missingCustomerSitePlatforms: customerSiteWatch.missingPlatforms,
          count: result.count,
          events:
            result.count <= MAX_INLINE_MUTATION_EVENTS
              ? result.events
              : undefined,
          event: result.count === 1 ? firstEvent : null,
          firstEvent,
          lastEvent,
          summary:
            result.count === 1
              ? null
              : {
                  cadence: safeInput.recurring?.cadence ?? null,
                  startTime: firstEvent?.eventTime ?? null,
                  endTime: lastEvent?.eventTime ?? null,
                },
        }
      } catch (err) {
        explainServiceError(err)
      }
    },
  })
}

export const addShowTool: ToolDefinition = {
  name: 'add_show',
  readOnly: false,
  build: (ctx) =>
    makeAddShowTool({
      repId: ctx.repId,
      supabase: ctx.supabase,
      agentHarness: ctx.agentHarness,
      latestUserText: ctx.latestUserText,
      activeCalendarWorkflow: ctx.activeCalendarWorkflow,
    }),
}
