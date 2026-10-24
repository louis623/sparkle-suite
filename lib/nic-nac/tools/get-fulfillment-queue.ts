// Tool: get_fulfillment_queue — read-only. Surfaces the rep's active
// post-approval work queue so Nic-Nac can answer "what still needs to ship?"
// and "what trades do I still need to finish?"
//
// Auth client: getFulfillmentQueue is auth-client only; RLS
// (fulfillment_own_data) scopes reads through request -> listing -> rep_id.

import { z } from 'zod'
import { tool } from 'ai'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getFulfillmentQueue } from '@/lib/services/trade-fulfillment'
import { ServiceError } from '@/lib/services/errors'
import type { FulfillmentQueueItem } from '@/lib/services/types'
import { NicNacToolError } from '@/lib/nic-nac/errors'
import type { ToolDefinition } from './types'

const inputSchema = z.object({})

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

function needsAttention(item: FulfillmentQueueItem): boolean {
  return (
    (item.status === 'approved' && item.daysSinceLastUpdate >= 3) ||
    (item.status === 'shipped' && item.daysSinceLastUpdate >= 5)
  )
}

function suggestedNextAction(item: FulfillmentQueueItem): 'mark_shipped' | 'mark_completed' {
  return item.status === 'approved' ? 'mark_shipped' : 'mark_completed'
}

export function makeGetFulfillmentQueueTool(ctx: {
  repId: string
  supabase: SupabaseClient
}) {
  return tool({
    description:
      "List the authenticated rep's active fulfillment queue after a swap is approved. " +
      'Use this when the rep asks what still needs to ship, what swaps are waiting on follow-through, or what approved swaps are still in progress. ' +
      'Returns active items only (approved + shipped, not completed), plus day-based follow-up nudges.',
    inputSchema,
    execute: async () => {
      let rows: Awaited<ReturnType<typeof getFulfillmentQueue>>
      try {
        rows = await getFulfillmentQueue(ctx.supabase, ctx.repId)
      } catch (err) {
        explainServiceError(err)
      }

      const approvedCount = rows.filter((row) => row.status === 'approved').length
      const shippedCount = rows.filter((row) => row.status === 'shipped').length
      const queue = rows.map((row) => ({
        fulfillmentId: row.fulfillmentId,
        requestId: row.requestId,
        status: row.status,
        customerName: row.customerName,
        designName: row.designName,
        itemNumber: row.itemNumber,
        statusUpdatedAt: row.statusUpdatedAt,
        daysSinceLastUpdate: row.daysSinceLastUpdate,
        needsAttention: needsAttention(row),
        suggestedNextAction: suggestedNextAction(row),
      }))

      return {
        count: queue.length,
        countsByStatus: {
          approved: approvedCount,
          shipped: shippedCount,
        },
        needsAttentionCount: queue.filter((row) => row.needsAttention).length,
        queue,
      }
    },
  })
}

export const getFulfillmentQueueTool: ToolDefinition = {
  name: 'get_fulfillment_queue',
  readOnly: true,
  build: (ctx) =>
    makeGetFulfillmentQueueTool({ repId: ctx.repId, supabase: ctx.supabase }),
}
