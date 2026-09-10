import { z } from 'zod'
import { tool } from 'ai'
import type { SupabaseClient } from '@supabase/supabase-js'
import { pauseShowSeriesUntil } from '@/lib/services/calendar'
import { ServiceError } from '@/lib/services/errors'
import { writeTradeActionAudit } from '@/lib/nic-nac/audit'
import { logIncident } from '@/lib/nic-nac/guardian-telemetry'
import { NicNacToolError } from '@/lib/nic-nac/errors'
import type { ToolDefinition } from './types'

const MAX_INLINE_MUTATION_EVENTS = 5

const inputSchema = z.object({
  eventId: z.string().uuid(),
  pauseUntil: z.string(),
  reason: z.string().optional(),
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

export function makePauseShowSeriesTool(ctx: {
  repId: string
  supabase: SupabaseClient
  conversationId: string
  runId: string
}) {
  return tool({
    description:
      'Pause a recurring show series for a bounded date range by cancelling scheduled occurrences from the selected event through pauseUntil. ' +
      'Use for requests like "pause Tuesdays for two weeks." Future generated shows after pauseUntil stay scheduled. Requires rep confirmation.',
    inputSchema,
    needsApproval: true,
    execute: async ({ eventId, pauseUntil, reason }) => {
      let result: Awaited<ReturnType<typeof pauseShowSeriesUntil>>
      try {
        result = await pauseShowSeriesUntil(
          ctx.supabase,
          ctx.repId,
          eventId,
          pauseUntil,
          reason,
        )
      } catch (err) {
        explainServiceError(err)
      }

      try {
        await writeTradeActionAudit({
          actionType: 'pause_show_series',
          repId: ctx.repId,
          targetListingId: null,
          beforeState: { eventId, repId: ctx.repId, status: 'scheduled_series' },
          afterState: {
            eventId,
            repId: ctx.repId,
            pausedCount: result.pausedCount,
            pauseUntil: result.pauseUntil,
          },
          details: {
            runId: ctx.runId,
            conversationId: ctx.conversationId,
            reason: reason ?? null,
          },
        })
      } catch (auditErr) {
        console.error('[nic-nac] trade_action_audit write failed', {
          eventId,
          auditErr,
        })
        try {
          await logIncident({
            errorType: 'audit_write_failed',
            repId: ctx.repId,
            conversationId: ctx.conversationId,
            severity: 'warn',
            details: {
              toolName: 'pause_show_series',
              runId: ctx.runId,
              eventId,
              message: (auditErr as Error)?.message,
            },
          })
        } catch {
          /* swallow */
        }
      }

      return {
        events:
          result.pausedCount <= MAX_INLINE_MUTATION_EVENTS
            ? result.events
            : undefined,
        firstEvent: result.events[0] ?? null,
        lastEvent: result.events[result.events.length - 1] ?? null,
        pausedCount: result.pausedCount,
        pauseUntil: result.pauseUntil,
        reason: reason ?? null,
        boundedPause: true,
      }
    },
  })
}

export const pauseShowSeriesTool: ToolDefinition = {
  name: 'pause_show_series',
  readOnly: false,
  build: (ctx) =>
    makePauseShowSeriesTool({
      repId: ctx.repId,
      supabase: ctx.supabase,
      conversationId: ctx.conversationId,
      runId: ctx.runId,
    }),
}
