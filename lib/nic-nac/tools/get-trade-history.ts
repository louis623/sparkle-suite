// Tool: get_trade_history — read-only. Returns the rep's past trade requests
// (approved + denied) plus summary analytics. Useful for "what trades have I
// done?", "who's traded with me before?", "how long do my trades take?".
//
// Auth client: getTradeHistory is auth-client only (lib/services/trade-requests.ts:13).
// RLS (requests_rep_read + designs_read_all + collections_read_all +
// fulfillment_own_data) restricts results to the rep's own listings.
//
// The service hardcodes the status filter to ['approved','denied'] internally
// — there is no statusFilter input here. Pending requests are surfaced via
// get_trade_requests, not this tool.

import { z } from 'zod'
import { tool } from 'ai'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getTradeHistory } from '@/lib/services/trade-requests'
import { ServiceError } from '@/lib/services/errors'
import { NicNacToolError } from '@/lib/nic-nac/errors'
import type { ToolDefinition } from './types'

const inputSchema = z.object({
  limit: z.number().int().min(1).max(100).optional(),
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

export function makeGetTradeHistoryTool(ctx: {
  repId: string
  supabase: SupabaseClient
}) {
  return tool({
    description:
      "List past trade requests against the authenticated rep's listings, with summary analytics. " +
      'Use this when the rep asks about past trades, completed swaps, rejected requests, who has traded with them before, or how their trade activity is trending. ' +
      'Returns approved + denied trade records (not pending — for pending use get_trade_requests). ' +
      'Summary includes totalCompleted, avgFulfillmentDays, and any repeat customers.',
    inputSchema,
    execute: async ({ limit }) => {
      let result: Awaited<ReturnType<typeof getTradeHistory>>
      try {
        result = await getTradeHistory(ctx.supabase, ctx.repId, { limit })
      } catch (err) {
        explainServiceError(err)
      }

      return {
        count: result.items.length,
        items: result.items.map((i) => ({
          requestId: i.requestId,
          listingId: i.listingId,
          customerName: i.customerName,
          status: i.status,
          fulfillmentStatus: i.fulfillmentStatus,
          createdAt: i.createdAt,
          completedAt: i.completedAt,
          fulfillmentDays: i.fulfillmentDays,
          design: {
            itemNumber: i.design.itemNumber,
            designName: i.design.designName,
            type: i.design.typePrefix,
            collectionName: i.design.collectionName,
          },
        })),
        summary: {
          totalCompleted: result.summary.totalCompleted,
          avgFulfillmentDays: result.summary.avgFulfillmentDays,
          repeatCustomers: result.summary.repeatCustomers,
        },
      }
    },
  })
}

export const getTradeHistoryTool: ToolDefinition = {
  name: 'get_trade_history',
  readOnly: true,
  build: (ctx) =>
    makeGetTradeHistoryTool({ repId: ctx.repId, supabase: ctx.supabase }),
}
