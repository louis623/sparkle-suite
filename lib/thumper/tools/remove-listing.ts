// Tool: remove_listing — HITL. Needs user approval before executing.
// Authorization gate: repId from session closure; model cannot supply it.
// Server-side replay validation against approval_events happens in the route
// handler before the SDK resumes to execute this tool.

import { z } from 'zod'
import { tool } from 'ai'
import type { SupabaseClient } from '@supabase/supabase-js'
import { removeListing, type RemovalReason } from '@/lib/services/trade-board'

const inputSchema = z.object({
  listingId: z.string().uuid().optional(),
  itemNumber: z.string().optional(),
  reason: z.enum(['sold', 'keeping', 'mistake', 'other']),
}).refine((v) => !!(v.listingId || v.itemNumber), {
  message: 'listingId or itemNumber required',
})

export function makeRemoveListingTool(ctx: { repId: string; supabase: SupabaseClient }) {
  return tool({
    description:
      "Remove a listing from the authenticated rep's trade board (soft delete — sets status='removed' and records the reason). " +
      'Auto-cancels any pending trade request against the listing. ' +
      "Requires explicit user approval — never remove without asking first. Identify the listing by listingId OR itemNumber and capture the reason (sold | keeping | mistake | other).",
    inputSchema,
    needsApproval: true,
    execute: async ({ listingId, itemNumber, reason }) => {
      const result = await removeListing(ctx.supabase, ctx.repId, {
        listingId,
        itemNumber,
        reason: reason as RemovalReason,
      })
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
