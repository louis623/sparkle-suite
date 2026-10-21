// Tool: restore_listing - write, NO HITL. Restores one of the authenticated
// rep's recently removed listings if it is still inside the configured
// recovery window. Authorization gate: repId comes from the session closure;
// the service layer verifies ownership and recovery-window eligibility.

import { z } from 'zod'
import { tool } from 'ai'
import type { SupabaseClient } from '@supabase/supabase-js'
import { restoreListing } from '@/lib/services/trade-board'
import { ServiceError } from '@/lib/services/errors'
import { writeTradeActionAudit } from '@/lib/nic-nac/audit'
import { logIncident } from '@/lib/nic-nac/guardian-telemetry'
import { NicNacToolError } from '@/lib/nic-nac/errors'
import type { ToolDefinition } from './types'

export const inputSchema = z
  .object({
    listingId: z.string().uuid().optional(),
    itemNumber: z.string().optional(),
  })
  .refine((v) => !!(v.listingId || v.itemNumber), {
    message: 'listingId or itemNumber required',
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

export function makeRestoreListingTool(ctx: {
  repId: string
  supabase: SupabaseClient
  conversationId: string
  runId: string
}) {
  return tool({
    description:
      "Restore one of the authenticated rep's recently removed Dance Floor listings. " +
      'Use this only when the rep asks to bring back a listing they removed. ' +
      'Identify the listing by listingId, or by itemNumber after checking the board. ' +
      'Expired removed listings cannot be restored.',
    inputSchema,
    execute: async ({ listingId, itemNumber }) => {
      let result: Awaited<ReturnType<typeof restoreListing>>
      try {
        result = await restoreListing(ctx.supabase, ctx.repId, {
          listingId,
          itemNumber,
        })
      } catch (err) {
        explainServiceError(err)
      }

      try {
        await writeTradeActionAudit({
          actionType: 'restore_listing',
          repId: ctx.repId,
          targetListingId: result.listingId,
          beforeState: {
            listingId: result.listingId,
            status: 'removed',
            deletedAt: result.deletedAt,
            repId: ctx.repId,
          },
          afterState: {
            listingId: result.listingId,
            status: 'available',
            repId: ctx.repId,
          },
          details: {
            runId: ctx.runId,
            conversationId: ctx.conversationId,
            recoveryWindowDays: result.recoveryWindowDays,
          },
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
              toolName: 'restore_listing',
              runId: ctx.runId,
              listingId: result.listingId,
              message: (auditErr as Error)?.message,
            },
          })
        } catch {
          /* swallow - observability must not affect outcome */
        }
      }

      return {
        listingId: result.listingId,
        designName: result.designName,
        status: result.status,
        recoveryWindowDays: result.recoveryWindowDays,
      }
    },
  })
}

export const restoreListingTool: ToolDefinition = {
  name: 'restore_listing',
  readOnly: false,
  build: (ctx) =>
    makeRestoreListingTool({
      repId: ctx.repId,
      supabase: ctx.supabase,
      conversationId: ctx.conversationId,
      runId: ctx.runId,
    }),
}
