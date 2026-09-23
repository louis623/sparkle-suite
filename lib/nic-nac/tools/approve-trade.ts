// Tool: approve_trade — HITL. Needs user approval before executing.
// Approving a trade is irreversible: the listing flips to status='traded',
// a fulfillment row is created, and design.times_traded is incremented.
// Authorization gate: repId from session closure; the service layer
// (approveTrade → assertRequestOwnedByRep) re-verifies the rep owns the
// underlying listing before invoking rpc_approve_trade.
//
// Service-role client: rpc_approve_trade is SECURITY DEFINER but operates
// across trade_requests, trade_listings, trade_fulfillment, and
// jewelry_designs. We obtain createAdminClient() inside execute and pass it
// to the service for consistency with add-listing.ts and to surface the
// uniform Postgrest error mapping.

import { z } from 'zod'
import { tool } from 'ai'
import type { SupabaseClient } from '@supabase/supabase-js'
import { approveTrade } from '@/lib/services/trade-requests'
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

export function makeApproveTradeTool(ctx: {
  repId: string
  supabase: SupabaseClient
  conversationId: string
  runId: string
  activeTradeWorkflow?: TradeWorkflowSessionState | null
}) {
  return tool({
    description:
      "Approve an incoming trade request against one of the authenticated rep's listings. " +
      'Irreversible: the listing flips to traded, a fulfillment row is created, and the design times_traded counter is incremented. ' +
      "Requires explicit rep verification of the offered family and jewelry type, a final confirmation, and the tool's approval dialog. Identify the request by requestId.",
    inputSchema,
    needsApproval: true,
    execute: async ({ requestId, verifiedOfferedFamily, verifiedOfferedType, verificationConfirmed, finalConfirmation, repNotes }) => {
      assertTradeWorkflowInputMatches({
        workflow: ctx.activeTradeWorkflow,
        workflowType: 'trade_request_decision',
        toolName: 'approve_trade',
        checks: [{ field: 'requestId', value: requestId, label: 'trade request' }],
      })
      const admin = createAdminClient()

      let result: Awaited<ReturnType<typeof approveTrade>>
      try {
        result = await approveTrade(admin, ctx.repId, requestId, repNotes, {
          verifiedOfferedFamily, verifiedOfferedType, verificationConfirmed, finalConfirmation,
        })
      } catch (err) {
        explainServiceError(err)
      }

      // Audit write is observability, not business logic. The mutation has
      // already succeeded; audit failure must NEVER reverse the rep's view of
      // success. Same isolation discipline as remove-listing.ts.
      try {
        await writeTradeActionAudit({
          actionType: 'trade_approved',
          repId: ctx.repId,
          targetListingId: result.listingId,
          beforeState: {
            requestId,
            // requestStatus pending: invariant — approveTrade() throws
            // REQUEST_NOT_PENDING via assertRequestOwnedByRep if the request
            // is not pending, so we never reach this audit branch otherwise.
            requestStatus: 'pending',
            listingId: result.listingId,
            // listingStatus pending_trade: expected by current workflow —
            // rpc_submit_trade_request flips the listing to pending_trade
            // when a request is created. The partial unique index only
            // constrains one pending request per listing_id; it does not
            // enforce listing.status at the DB level, so this is a workflow
            // invariant, not a DB-level guarantee.
            listingStatus: 'pending_trade',
            repId: ctx.repId,
          },
          afterState: {
            requestId: result.requestId,
            requestStatus: 'approved',
            listingId: result.listingId,
            listingStatus: 'traded',
            fulfillmentId: result.fulfillmentId,
            repId: ctx.repId,
          },
          details: { runId: ctx.runId, conversationId: ctx.conversationId },
        })
      } catch (auditErr) {
        console.error('[nic-nac] trade_action_audit write failed', {
          requestId,
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
              toolName: 'approve_trade',
              runId: ctx.runId,
              requestId,
              listingId: result.listingId,
              message: (auditErr as Error)?.message,
            },
          })
        } catch {
          /* swallow — observability must not affect outcome */
        }
      }

      if (ctx.activeTradeWorkflow?.workflowType === 'trade_request_decision') {
        try {
          await completeTradeWorkflowSession(admin, ctx.activeTradeWorkflow, {
            knownFields: {
              requestId: result.requestId,
              listingId: result.listingId,
              decision: 'approve',
              fulfillmentRequestId: result.fulfillmentId,
            },
            approvalState: 'approved',
            dbAssertions: {
              tradeRequest: {
                id: result.requestId,
                status: 'approved',
              },
              tradeListing: {
                id: result.listingId,
                status: 'traded',
              },
              fulfillment: {
                id: result.fulfillmentId,
                requestId: result.requestId,
                status: 'approved',
              },
            },
            publicProof: {
              tradeBoardListingShouldBeHidden: true,
              listingId: result.listingId,
            },
            createdMutationIds: [
              { kind: 'trade_request', id: result.requestId },
              { kind: 'listing', id: result.listingId },
              { kind: 'fulfillment', id: result.fulfillmentId },
            ],
          })
        } catch (workflowErr) {
          console.error('[nic-nac] trade workflow completion failed', {
            workflowId: ctx.activeTradeWorkflow.id,
            toolName: 'approve_trade',
            workflowErr,
          })
        }
      }

      return {
        requestId: result.requestId,
        fulfillmentId: result.fulfillmentId,
        listingId: result.listingId,
        customerName: result.customerName,
      }
    },
  })
}

export const approveTradeTool: ToolDefinition = {
  name: 'approve_trade',
  readOnly: false,
  build: (ctx) =>
    makeApproveTradeTool({
      repId: ctx.repId,
      supabase: ctx.supabase,
      conversationId: ctx.conversationId,
      runId: ctx.runId,
      activeTradeWorkflow: ctx.activeTradeWorkflow,
    }),
}
