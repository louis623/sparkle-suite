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
import { ServiceError } from '@/lib/services/errors'
import { writeTradeActionAudit } from '@/lib/nic-nac/audit'
import { logIncident } from '@/lib/nic-nac/guardian-telemetry'
import { NicNacToolError } from '@/lib/nic-nac/errors'
import { completeTradeWorkflowSession } from '@/lib/nic-nac/workflows/trade-workflow-store'
import type { TradeWorkflowSessionState } from '@/lib/nic-nac/workflows/trade-workflow-types'
import {
  assertTradeWorkflowInputMatches,
  workflowKnownString,
} from '@/lib/nic-nac/workflows/trade-workflow-tool-guards'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ToolDefinition } from './types'

const inputSchema = z.object({
  listingId: z.string().uuid().optional(),
  itemNumber: z.string().optional(),
  reason: z.enum(['swapped', 'keeping', 'mistake', 'other']),
}).refine((v) => !!(v.listingId || v.itemNumber), {
  message: 'listingId or itemNumber required',
})

function explainTradeBoardError(err: unknown): never {
  if (err instanceof TradeBoardError || err instanceof ServiceError) {
    const msg =
      err.code === 'LISTING_NOT_FOUND'
        ? "I couldn't find that listing on your board."
        : err.code === 'UNAUTHORIZED'
          ? "That listing isn't on your board, so I can't change it."
          : err.code === 'AMBIGUOUS_LISTING'
            ? 'I found more than one active physical piece for that item. Pick the exact listing before I remove anything.'
          : err.message
    throw new NicNacToolError({ code: err.code, userMessage: msg, cause: err })
  }
  throw err
}

export function makeRemoveListingTool(ctx: {
  repId: string
  supabase: SupabaseClient
  conversationId: string
  runId: string
  activeTradeWorkflow?: TradeWorkflowSessionState | null
}) {
  return tool({
    description:
      "Remove a listing from the authenticated rep's dance floor (soft delete — sets status='removed' and records the reason). " +
      'Auto-cancels any pending swap request against the listing. ' +
      "Requires explicit user approval — never remove without asking first. Identify the listing by listingId OR itemNumber and capture the reason (swapped | keeping | mistake | other).",
    inputSchema,
    needsApproval: true,
    execute: async ({ listingId, itemNumber, reason }) => {
      const storedReason = (reason === 'swapped' ? 'sold' : reason) as RemovalReason
      assertTradeWorkflowInputMatches({
        workflow: ctx.activeTradeWorkflow,
        workflowType: 'trade_board_remove_listing',
        toolName: 'remove_listing',
        checks: [
          { field: 'listingId', value: listingId, label: 'listing' },
          { field: 'itemNumber', value: itemNumber, label: 'item number' },
          { field: 'removalReason', value: storedReason, label: 'removal reason' },
        ],
      })
      const workflowListingId = workflowKnownString(
        ctx.activeTradeWorkflow,
        'listingId',
      )
      const workflowItemNumber = workflowKnownString(
        ctx.activeTradeWorkflow,
        'itemNumber',
      )
      const guardedListingId = listingId ?? workflowListingId
      const guardedItemNumber = guardedListingId
        ? itemNumber
        : itemNumber ?? workflowItemNumber
      let result: Awaited<ReturnType<typeof removeListing>>
      try {
        result = await removeListing(ctx.supabase, ctx.repId, {
          listingId: guardedListingId,
          itemNumber: guardedItemNumber,
          reason: storedReason,
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
            removalReason: storedReason,
            repId: ctx.repId,
          },
          details: { runId: ctx.runId, conversationId: ctx.conversationId },
        })
      } catch (auditErr) {
        console.error('[nic-nac] trade_action_audit write failed', {
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

      if (ctx.activeTradeWorkflow?.workflowType === 'trade_board_remove_listing') {
        try {
          await completeTradeWorkflowSession(createAdminClient(), ctx.activeTradeWorkflow, {
            knownFields: {
              listingId: result.listingId,
              itemNumber: guardedItemNumber,
              removalReason: storedReason,
            },
            approvalState: 'approved',
            dbAssertions: {
              tradeListing: {
                id: result.listingId,
                previousStatus: result.previousStatus,
                status: 'removed',
                removalReason: storedReason,
              },
              cancelledTradeRequest: result.cancelledRequestId
                ? {
                    id: result.cancelledRequestId,
                    status: 'cancelled',
                  }
                : null,
            },
            publicProof: {
              listingId: result.listingId,
              tradeBoardListingShouldBeHidden: true,
            },
            createdMutationIds: [
              { kind: 'listing', id: result.listingId },
              ...(result.cancelledRequestId
                ? [
                    {
                      kind: 'trade_request' as const,
                      id: result.cancelledRequestId,
                    },
                  ]
                : []),
            ],
          })
        } catch (workflowErr) {
          console.error('[nic-nac] trade workflow completion failed', {
            workflowId: ctx.activeTradeWorkflow.id,
            toolName: 'remove_listing',
            workflowErr,
          })
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
      activeTradeWorkflow: ctx.activeTradeWorkflow,
    }),
}
