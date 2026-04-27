// Tool: remove_listing — HITL. Needs user approval before executing.
// Authorization gate: repId from session closure; model cannot supply it.
// Server-side replay validation against approval_events happens in the route
// handler before the SDK resumes to execute this tool.

import { z } from 'zod'
import { tool } from 'ai'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  removeListing,
  TradeBoardError,
  type RemovalReason,
} from '@/lib/services/trade-board'
import { writeTradeActionAudit } from '@/lib/thumper/audit'
import { logIncident } from '@/lib/thumper/guardian-telemetry'
import { ThumperToolError } from '@/lib/thumper/errors'
import type { ToolDefinition } from './types'

const inputSchema = z.object({
  listingId: z.string().uuid().optional(),
  itemNumber: z.string().optional(),
  reason: z.enum(['sold', 'keeping', 'mistake', 'other']),
}).refine((v) => !!(v.listingId || v.itemNumber), {
  message: 'listingId or itemNumber required',
})

function explainTradeBoardError(err: unknown): never {
  if (err instanceof TradeBoardError) {
    const msg =
      err.code === 'LISTING_NOT_FOUND'
        ? "I couldn't find that listing on your board."
        : err.code === 'UNAUTHORIZED'
          ? "That listing isn't on your board, so I can't change it."
          : err.message
    throw new ThumperToolError({ code: err.code, userMessage: msg, cause: err })
  }
  throw err
}

export function makeRemoveListingTool(ctx: {
  repId: string
  supabase: SupabaseClient
  conversationId: string
  runId: string
}) {
  return tool({
    description:
      "Remove a listing from the authenticated rep's trade board (soft delete — sets status='removed' and records the reason). " +
      'Auto-cancels any pending trade request against the listing. ' +
      "Requires explicit user approval — never remove without asking first. Identify the listing by listingId OR itemNumber and capture the reason (sold | keeping | mistake | other).",
    inputSchema,
    needsApproval: true,
    execute: async ({ listingId, itemNumber, reason }) => {
      let result: Awaited<ReturnType<typeof removeListing>>
      try {
        result = await removeListing(ctx.supabase, ctx.repId, {
          listingId,
          itemNumber,
          reason: reason as RemovalReason,
        })
      } catch (err) {
        explainTradeBoardError(err)
      }

      // Audit write is observability, not business logic. The mutation has
      // already succeeded; audit failure must NEVER reverse the rep's view
      // of success. Same isolation discipline as telemetry — log + best-effort
      // incident + return the successful result regardless of audit fate.
      try {
        await writeTradeActionAudit({
          actionType: 'remove_listing',
          repId: ctx.repId,
          targetListingId: result.listingId,
          beforeState: {
            listingId: result.listingId,
            status: result.previousStatus ?? '',
            removalReason: '',
            repId: ctx.repId,
          },
          afterState: {
            listingId: result.listingId,
            status: 'removed',
            removalReason: reason,
            repId: ctx.repId,
          },
          details: { runId: ctx.runId, conversationId: ctx.conversationId },
        })
      } catch (auditErr) {
        console.error('[thumper] trade_action_audit write failed', {
          listingId: result.listingId,
          auditErr,
        })
        try {
          await logIncident({
            errorType: 'audit_write_failed',
            repId: ctx.repId,
            conversationId: ctx.conversationId,
            severity: 'warn',
            details: {
              toolName: 'remove_listing',
              runId: ctx.runId,
              listingId: result.listingId,
              message: (auditErr as Error)?.message,
            },
          })
        } catch {
          /* swallow — observability must not affect outcome */
        }
      }

      return {
        listingId: result.listingId,
        designName: result.designName,
        previousStatus: result.previousStatus,
        cancelledRequest: result.cancelledRequestId
          ? {
              requestId: result.cancelledRequestId,
              customerName: result.cancelledRequestCustomerName,
            }
          : null,
      }
    },
  })
}

export const removeListingTool: ToolDefinition = {
  name: 'remove_listing',
  readOnly: false,
  build: (ctx) =>
    makeRemoveListingTool({
      repId: ctx.repId,
      supabase: ctx.supabase,
      conversationId: ctx.conversationId,
      runId: ctx.runId,
    }),
}
