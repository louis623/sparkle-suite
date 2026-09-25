// Tool: update_fulfillment_status — write, NO HITL. Moves a fulfillment item
// through the approved / shipped / completed post-approval states.
//
// Auth client: updateFulfillmentStatus is auth-client only; RLS
// (fulfillment_own_data) scopes the update through request -> listing -> rep_id.
// The service itself also re-checks the rep's scope and transition rules.

import { z } from 'zod'
import { tool } from 'ai'
import type { SupabaseClient } from '@supabase/supabase-js'
import { updateFulfillmentStatus } from '@/lib/services/trade-fulfillment'
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
import type {
  FulfillmentStatus,
  UpdateFulfillmentInput,
} from '@/lib/services/types'
import type { ToolDefinition } from './types'

const inputSchema = z
  .object({
    requestId: z.string().uuid().optional(),
    customerName: z.string().trim().min(1).optional(),
    nextStatus: z.enum(['approved', 'shipped', 'completed']),
    shippingNotes: z.string().optional(),
    addToBoard: z.boolean().optional(),
  })
  .refine((v) => Boolean(v.requestId || v.customerName), {
    message: 'requestId or customerName is required',
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

function buildInput(args: {
  requestId?: string
  customerName?: string
  nextStatus: FulfillmentStatus
  shippingNotes?: string
  addToBoard?: boolean
}): UpdateFulfillmentInput {
  const shippingNotes = normalizeOptionalToolText(args.shippingNotes)
  const base = {
    nextStatus: args.nextStatus,
    ...(shippingNotes === undefined ? {} : { shippingNotes }),
    addToBoard: args.addToBoard,
  }

  if (args.requestId) {
    return {
      requestId: args.requestId,
      ...base,
    }
  }

  return {
    customerName: args.customerName ?? '',
    ...base,
  }
}

function normalizeOptionalToolText(value: string | undefined) {
  if (value === undefined) return undefined
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

export function makeUpdateFulfillmentStatusTool(ctx: {
  repId: string
  supabase: SupabaseClient
  conversationId: string
  runId: string
  activeTradeWorkflow?: TradeWorkflowSessionState | null
}) {
  return tool({
    description:
      'Update one fulfillment item for the authenticated rep. ' +
      'Use this after get_fulfillment_queue when the rep says a trade has shipped or logistics are done. ' +
      'Approved or shipped can move directly to completed; undo completed by moving to approved. ' +
      'Prefer requestId from the queue; customerName is only for clear one-off cases. ' +
      'shippingNotes can hold tracking or shipment details. ' +
      'If the rep already knows they want help adding the received piece to their board after completion, set addToBoard:true so Nic-Nac can follow up cleanly.',
    inputSchema,
    execute: async ({
      requestId,
      customerName,
      nextStatus,
      shippingNotes,
      addToBoard,
    }) => {
      assertTradeWorkflowInputMatches({
        workflow: ctx.activeTradeWorkflow,
        workflowType: 'trade_fulfillment_update',
        toolName: 'update_fulfillment_status',
        checks: [
          { field: 'requestId', value: requestId, label: 'fulfillment request' },
          {
            field: 'nextFulfillmentStatus',
            value: nextStatus,
            label: 'fulfillment status',
          },
        ],
      })
      const workflowRequestId = workflowKnownString(
        ctx.activeTradeWorkflow,
        'requestId',
      )
      const input = buildInput({
        requestId: requestId ?? workflowRequestId,
        customerName: requestId ?? workflowRequestId ? undefined : customerName,
        nextStatus: nextStatus as FulfillmentStatus,
        shippingNotes,
        addToBoard,
      })

      let result: Awaited<ReturnType<typeof updateFulfillmentStatus>>
      try {
        result = await updateFulfillmentStatus(ctx.supabase, ctx.repId, input)
      } catch (err) {
        explainServiceError(err)
      }

      try {
        await writeTradeActionAudit({
          actionType: 'fulfillment_status_updated',
          repId: ctx.repId,
          targetListingId: null,
          beforeState: {
            fulfillmentId: result.fulfillmentId,
            requestId: result.requestId,
            status: result.previousStatus,
            repId: ctx.repId,
          },
          afterState: {
            fulfillmentId: result.fulfillmentId,
            requestId: result.requestId,
            status: result.status,
            repId: ctx.repId,
            shippingNotes: shippingNotes ?? null,
            completedAt: result.completedAt,
            shouldPromptAddToBoard: result.shouldPromptAddToBoard,
          },
          details: {
            runId: ctx.runId,
            conversationId: ctx.conversationId,
            requestId: result.requestId,
          },
        })
      } catch (auditErr) {
        console.error('[nic-nac] trade_action_audit write failed', {
          requestId: result.requestId,
          fulfillmentId: result.fulfillmentId,
          auditErr,
        })
        try {
          await logIncident({
            errorType: 'audit_write_failed',
            repId: ctx.repId,
            conversationId: ctx.conversationId,
            severity: 'warn',
            details: {
              toolName: 'update_fulfillment_status',
              runId: ctx.runId,
              requestId: result.requestId,
              fulfillmentId: result.fulfillmentId,
              message: (auditErr as Error)?.message,
            },
          })
        } catch {
          /* swallow — observability must not affect outcome */
        }
      }

      if (ctx.activeTradeWorkflow?.workflowType === 'trade_fulfillment_update') {
        try {
          await completeTradeWorkflowSession(createAdminClient(), ctx.activeTradeWorkflow, {
            knownFields: {
              requestId: result.requestId,
              fulfillmentRequestId: result.fulfillmentId,
              nextFulfillmentStatus: result.status,
            },
            approvalState: 'not_required',
            dbAssertions: {
              fulfillment: {
                id: result.fulfillmentId,
                requestId: result.requestId,
                previousStatus: result.previousStatus,
                status: result.status,
                completedAt: result.completedAt,
                changed: result.changed,
              },
            },
            publicProof: {
              tradeBoardListingVisibilityUnaffected: true,
              shouldPromptAddToBoard: result.shouldPromptAddToBoard,
            },
            createdMutationIds: [
              { kind: 'fulfillment', id: result.fulfillmentId },
              { kind: 'trade_request', id: result.requestId },
            ],
          })
        } catch (workflowErr) {
          console.error('[nic-nac] trade workflow completion failed', {
            workflowId: ctx.activeTradeWorkflow.id,
            toolName: 'update_fulfillment_status',
            workflowErr,
          })
        }
      }

      return {
        fulfillmentId: result.fulfillmentId,
        requestId: result.requestId,
        previousStatus: result.previousStatus,
        status: result.status,
        completedAt: result.completedAt,
        shippingNotesApplied: shippingNotes ?? null,
        shouldPromptAddToBoard: result.shouldPromptAddToBoard,
        nextSuggestedTool: result.shouldPromptAddToBoard ? 'add_listing' : null,
      }
    },
  })
}

export const updateFulfillmentStatusTool: ToolDefinition = {
  name: 'update_fulfillment_status',
  readOnly: false,
  build: (ctx) =>
    makeUpdateFulfillmentStatusTool({
      repId: ctx.repId,
      supabase: ctx.supabase,
      conversationId: ctx.conversationId,
      runId: ctx.runId,
      activeTradeWorkflow: ctx.activeTradeWorkflow,
    }),
}
