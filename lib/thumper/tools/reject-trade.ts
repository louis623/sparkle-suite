// Tool: reject_trade — write, NO HITL. Rejecting a request is reversible
// (the customer can submit a new request, the listing returns to available),
// so this does not gate behind a Confirm/Cancel approval dialog.
// Authorization gate: repId from session closure; the service layer
// (rejectTrade → assertRequestOwnedByRep) re-verifies the rep owns the
// underlying listing before invoking rpc_reject_trade.
//
// Service-role client: rpc_reject_trade is SECURITY DEFINER but operates
// across trade_requests and trade_listings. We obtain createAdminClient()
// inside execute and pass it to the service for consistency with
// approve-trade.ts.

import { z } from 'zod'
import { tool } from 'ai'
import type { SupabaseClient } from '@supabase/supabase-js'
import { rejectTrade } from '@/lib/services/trade-requests'
import { ServiceError } from '@/lib/services/errors'
import type { RejectionReason } from '@/lib/services/types'
import { createAdminClient } from '@/lib/supabase/admin'
import { writeTradeActionAudit } from '@/lib/thumper/audit'
import { logIncident } from '@/lib/thumper/guardian-telemetry'
import { ThumperToolError } from '@/lib/thumper/errors'
import type { ToolDefinition } from './types'

const inputSchema = z.object({
  requestId: z.string().uuid(),
  reason: z
    .enum(['msrp_mismatch', 'not_interested', 'changed_mind', 'other'])
    .optional(),
  repNotes: z.string().optional(),
})

function explainServiceError(err: unknown): never {
  if (err instanceof ServiceError) {
    throw new ThumperToolError({
      code: err.code,
      userMessage: err.userMessage,
      cause: err,
    })
  }
  throw err
}

export function makeRejectTradeTool(ctx: {
  repId: string
  supabase: SupabaseClient
  conversationId: string
  runId: string
}) {
  return tool({
    description:
      "Reject an incoming trade request against one of the authenticated rep's listings. " +
      'Reversible: the listing returns to status=available so it can receive new requests. ' +
      "No approval dialog — rejecting is reversible. Identify the request by requestId. Optionally include reason (msrp_mismatch | not_interested | changed_mind | other) and repNotes the rep wants attached to the rejection.",
    inputSchema,
    execute: async ({ requestId, reason, repNotes }) => {
      const admin = createAdminClient()

      let result: Awaited<ReturnType<typeof rejectTrade>>
      try {
        result = await rejectTrade(
          admin,
          ctx.repId,
          requestId,
          reason as RejectionReason | undefined,
          repNotes,
        )
      } catch (err) {
        explainServiceError(err)
      }

      // Audit write is observability, not business logic. The mutation has
      // already succeeded; audit failure must NEVER reverse the rep's view of
      // success. Same isolation discipline as remove-listing.ts.
      try {
        await writeTradeActionAudit({
          actionType: 'trade_rejected',
          repId: ctx.repId,
          targetListingId: result.listingId,
          beforeState: {
            requestId,
            // requestStatus pending: invariant — rejectTrade() throws
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
            requestStatus: 'denied',
            listingId: result.listingId,
            // The RPC restores listing.status='available' iff this was the
            // only pending request on the listing; otherwise it stays
            // pending_trade so the remaining request is still actionable.
            listingStatus: result.listingRestored ? 'available' : 'pending_trade',
            // null when reason is omitted — the service passes null to the
            // RPC. Coercing to 'other' would create false audit history of
            // an explicit reason that was never given.
            rejectionReason: reason ?? null,
            repId: ctx.repId,
          },
          details: { runId: ctx.runId, conversationId: ctx.conversationId },
        })
      } catch (auditErr) {
        console.error('[thumper] trade_action_audit write failed', {
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
              toolName: 'reject_trade',
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

      return {
        requestId: result.requestId,
        listingId: result.listingId,
        listingRestored: result.listingRestored,
      }
    },
  })
}

export const rejectTradeTool: ToolDefinition = {
  name: 'reject_trade',
  readOnly: false,
  build: (ctx) =>
    makeRejectTradeTool({
      repId: ctx.repId,
      supabase: ctx.supabase,
      conversationId: ctx.conversationId,
      runId: ctx.runId,
    }),
}
