import { z } from 'zod'
import { tool } from 'ai'
import type { SupabaseClient } from '@supabase/supabase-js'
import { cancelShowSeriesFuture } from '@/lib/services/calendar'
import { ServiceError } from '@/lib/services/errors'
import { writeTradeActionAudit } from '@/lib/nic-nac/audit'
import { logIncident } from '@/lib/nic-nac/guardian-telemetry'
import { NicNacToolError } from '@/lib/nic-nac/errors'
import type { ToolDefinition } from './types'

const MAX_INLINE_MUTATION_EVENTS = 5

const inputSchema = z.object({
  eventId: z.string().uuid(),
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

export function makeCancelShowSeriesTool(ctx: {
  repId: string
  supabase: SupabaseClient
  conversationId: string
  runId: string
}) {
  return tool({
    description:
      'Cancel the selected recurring show occurrence and every future scheduled occurrence in that same series. ' +
      'Use this only when the rep wants to stop the series going forward. Requires rep confirmation.',
    inputSchema,
    needsApproval: true,
    execute: async ({ eventId, reason }) => {
      let result: Awaited<ReturnType<typeof cancelShowSeriesFuture>>
      try {
        result = await cancelShowSeriesFuture(ctx.supabase, ctx.repId, eventId, reason)
      } catch (err) {
        explainServiceError(err)
      }

      try {
        await writeTradeActionAudit({
          actionType: 'cancel_show_series',
          repId: ctx.repId,
          targetListingId: null,
          beforeState: { eventId, repId: ctx.repId, status: 'scheduled_series' },
          afterState: {
            eventId,
            repId: ctx.repId,
            cancelledCount: result.cancelledCount,
            status: 'cancelled',
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
              toolName: 'cancel_show_series',
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
          result.cancelledCount <= MAX_INLINE_MUTATION_EVENTS
            ? result.events
            : undefined,
        firstEvent: result.events[0] ?? null,
        lastEvent: result.events[result.events.length - 1] ?? null,
        cancelledCount: result.cancelledCount,
        reason: reason ?? null,
        futureSeriesCancelled: true,
      }
    },
  })
}

export const cancelShowSeriesTool: ToolDefinition = {
  name: 'cancel_show_series',
  readOnly: false,
  build: (ctx) =>
    makeCancelShowSeriesTool({
      repId: ctx.repId,
      supabase: ctx.supabase,
      conversationId: ctx.conversationId,
      runId: ctx.runId,
    }),
}
