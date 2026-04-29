// Tool: get_trade_requests — read-only. Surfaces incoming trade requests for
// the authenticated rep so Thumper can answer "what trade requests do I have?"
// and feed the model the data it needs to talk through approvals.
//
// Authorization gate: repId comes from the authenticated session, bound into
// the tool closure at the route handler. ctx.supabase is the auth client —
// RLS (`requests_rep_read`) restricts results to the rep's own listings.

import { z } from 'zod'
import { tool } from 'ai'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getTradeRequests } from '@/lib/services/trade-requests'
import { ServiceError } from '@/lib/services/errors'
import { ThumperToolError } from '@/lib/thumper/errors'
import type { ToolDefinition } from './types'

const inputSchema = z.object({
  statusFilter: z
    .enum(['pending', 'approved', 'denied', 'cancelled'])
    .optional(),
  limit: z.number().int().min(1).max(100).optional(),
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

export function makeGetTradeRequestsTool(ctx: {
  repId: string
  supabase: SupabaseClient
}) {
  return tool({
    description:
      "List incoming trade requests against the authenticated rep's listings. " +
      "Use this whenever the rep asks about trade requests, pending offers, who's interested in their pieces, or what they need to approve. " +
      "Defaults to status='pending' inside the service. Pass statusFilter to surface approved/denied/cancelled history.",
    inputSchema,
    execute: async ({ statusFilter, limit }) => {
      let rows: Awaited<ReturnType<typeof getTradeRequests>>
      try {
        rows = await getTradeRequests(ctx.supabase, ctx.repId, {
          statusFilter,
          limit,
        })
      } catch (err) {
        explainServiceError(err)
      }

      return {
        count: rows.length,
        requests: rows.map((r) => ({
          requestId: r.id,
          status: r.status,
          customerName: r.customerName,
          customerDescription: r.customerDescription,
          rejectionReason: r.rejectionReason,
          repNotes: r.repNotes,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
          listing: {
            listingId: r.listing.id,
            // Prefer the rep's listing-specific photo; fall back to the
            // canonical design photo when uses_canonical_photo is true.
            photoUrl: r.listing.usesCanonicalPhoto
              ? r.listing.design.canonicalPhotoUrl
              : r.listing.listingPhotoUrl,
            design: {
              itemNumber: r.listing.design.itemNumber,
              designName: r.listing.design.designName,
              material: r.listing.design.material,
              mainStone: r.listing.design.mainStone,
              msrp: r.listing.design.bpMsrp,
              type: r.listing.design.typePrefix,
            },
          },
        })),
      }
    },
  })
}

export const getTradeRequestsTool: ToolDefinition = {
  name: 'get_trade_requests',
  readOnly: true,
  build: (ctx) =>
    makeGetTradeRequestsTool({ repId: ctx.repId, supabase: ctx.supabase }),
}
