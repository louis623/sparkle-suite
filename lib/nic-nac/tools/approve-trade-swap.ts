// Tool: approve_trade_swap - HITL. Approves a live-show trade request while
// capturing the item number just revealed for the customer.

import { z } from 'zod'
import { tool } from 'ai'
import type { SupabaseClient } from '@supabase/supabase-js'

import { approveTradeWithRevealedItemCapture } from '@/lib/services/trade-swaps'
import { ServiceError } from '@/lib/services/errors'
import { createAdminClient } from '@/lib/supabase/admin'
import { writeTradeActionAudit } from '@/lib/nic-nac/audit'
import { logIncident } from '@/lib/nic-nac/guardian-telemetry'
import { NicNacToolError } from '@/lib/nic-nac/errors'
import { completeTradeWorkflowSession } from '@/lib/nic-nac/workflows/trade-workflow-store'
import type { TradeWorkflowSessionState } from '@/lib/nic-nac/workflows/trade-workflow-types'
import { assertTradeWorkflowInputMatches } from '@/lib/nic-nac/workflows/trade-workflow-tool-guards'
import type { ToolDefinition } from './types'

const inputSchema = z.object({
  requestId: z.string().uuid(),
  verifiedOfferedFamily: z.string().min(1),
  verifiedOfferedType: z.enum(['RG', 'NK', 'ER', 'ST', 'BR']),
  verificationConfirmed: z.literal(true),
  finalConfirmation: z.literal(true),
  revealedItemNumber: z.string().min(1),
  revealedMaterial: z.string().optional(),
  revealedRingSize: z.string().optional(),
  repNotes: z.string().optional(),
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

export function makeApproveTradeSwapTool(ctx: {
  repId: string
  supabase: SupabaseClient
  conversationId: string
  runId: string
  activeTradeWorkflow?: TradeWorkflowSessionState | null
}) {
  return tool({
    description:
      "Approve a live-show Dance Floor swap for the authenticated rep. Ask the rep exactly: \"Which item number was just revealed for the customer?\" " +
      'Use this instead of plain approve_trade when approving an in-show swap: the customer gets the requested dancer, and Sparkle Suite captures the just-revealed item number so it can be added back to the Dance Floor or finished after the show. ' +
      'If the item number has multiple plating/material variants, include revealedMaterial when the rep provides it. If the revealed item is a ring and the rep knows the size, include revealedRingSize. Requires explicit user approval.',
    inputSchema,
    needsApproval: true,
    execute: async ({
      requestId,
      verifiedOfferedFamily,
      verifiedOfferedType,
      verificationConfirmed,
      finalConfirmation,
      revealedItemNumber,
      revealedMaterial,
      revealedRingSize,
      repNotes,
    }) => {
      assertTradeWorkflowInputMatches({
        workflow: ctx.activeTradeWorkflow,
        workflowType: 'trade_swap_capture',
        toolName: 'approve_trade_swap',
        checks: [
          { field: 'requestId', value: requestId, label: 'trade request' },
          {
            field: 'revealedItemNumber',
            value: revealedItemNumber,
            label: 'revealed item number',
          },
          {
            field: 'revealedRingSize',
            value: revealedRingSize,
            label: 'revealed ring size',
          },
        ],
      })
      const admin = createAdminClient()

      let result: Awaited<ReturnType<typeof approveTradeWithRevealedItemCapture>>
      try {
        result = await approveTradeWithRevealedItemCapture(admin, ctx.repId, {
          requestId,
          revealedItemNumber,
          revealedMaterial,
          revealedRingSize,
          repNotes,
          verification: { verifiedOfferedFamily, verifiedOfferedType, verificationConfirmed, finalConfirmation },
        })
      } catch (err) {
        explainServiceError(err)
      }

      try {
        await writeTradeActionAudit({
          actionType: 'trade_swap_approved',
          repId: ctx.repId,
          targetListingId: result.outgoingListingId,
          beforeState: {
            requestId,
            requestStatus: 'pending',
            listingId: result.outgoingListingId,
            listingStatus: 'pending_trade',
            repId: ctx.repId,
          },
          afterState: {
            requestId: result.requestId,
            requestStatus: 'approved',
            listingId: result.outgoingListingId,
            listingStatus: 'traded',
            fulfillmentId: result.fulfillmentId,
            revealedItemNumber: result.revealedItemNumber,
            revealedDesignId: result.revealedDesignId,
            replacementListingId: result.replacementListingId,
            replacementStatus: result.replacementStatus,
            repId: ctx.repId,
          },
          details: {
            runId: ctx.runId,
            conversationId: ctx.conversationId,
            replacementStatus: result.replacementStatus,
          },
        })
      } catch (auditErr) {
        console.error('[nic-nac] trade_action_audit write failed', {
          requestId,
          listingId: result.outgoingListingId,
          auditErr,
        })
        try {
          await logIncident({
            errorType: 'audit_write_failed',
            repId: ctx.repId,
            conversationId: ctx.conversationId,
            severity: 'warn',
            details: {
              toolName: 'approve_trade_swap',
              runId: ctx.runId,
              requestId,
              listingId: result.outgoingListingId,
              message: (auditErr as Error)?.message,
            },
          })
        } catch {
          /* swallow - observability must not affect outcome */
        }
      }

      if (ctx.activeTradeWorkflow?.workflowType === 'trade_swap_capture') {
        try {
          await completeTradeWorkflowSession(admin, ctx.activeTradeWorkflow, {
            knownFields: {
              requestId: result.requestId,
              swapId: result.swapId,
              listingId: result.outgoingListingId,
              revealedItemNumber: result.revealedItemNumber,
              revealedMaterial,
              revealedRingSize,
            },
            approvalState: 'approved',
            dbAssertions: {
              tradeRequest: {
                id: result.requestId,
                status: 'approved',
              },
              outgoingListing: {
                id: result.outgoingListingId,
                status: 'traded',
              },
              fulfillment: {
                id: result.fulfillmentId,
                requestId: result.requestId,
                status: 'approved',
              },
              replacementListing: result.replacementListingId
                ? {
                    id: result.replacementListingId,
                    status: 'available',
                  }
                : null,
              replacementStatus: result.replacementStatus,
              tradeSwap: {
                id: result.swapId,
                requestId: result.requestId,
                replacementStatus: result.replacementStatus,
              },
            },
            publicProof: {
              outgoingListingShouldBeHidden: true,
              replacementListingShouldBeVisible:
                result.replacementStatus === 'added_to_board',
              replacementListingId: result.replacementListingId ?? null,
            },
            createdMutationIds: [
              { kind: 'trade_swap', id: result.swapId },
              { kind: 'trade_request', id: result.requestId },
              { kind: 'listing', id: result.outgoingListingId },
              { kind: 'fulfillment', id: result.fulfillmentId },
              ...(result.replacementListingId
                ? [
                    {
                      kind: 'listing' as const,
                      id: result.replacementListingId,
                    },
                  ]
                : []),
            ],
          })
        } catch (workflowErr) {
          console.error('[nic-nac] trade workflow completion failed', {
            workflowId: ctx.activeTradeWorkflow.id,
            toolName: 'approve_trade_swap',
            workflowErr,
          })
        }
      }

      return result
    },
  })
}

export const approveTradeSwapTool: ToolDefinition = {
  name: 'approve_trade_swap',
  readOnly: false,
  build: (ctx) =>
    makeApproveTradeSwapTool({
      repId: ctx.repId,
      supabase: ctx.supabase,
      conversationId: ctx.conversationId,
      runId: ctx.runId,
      activeTradeWorkflow: ctx.activeTradeWorkflow,
    }),
}
