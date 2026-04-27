// Tool: list_my_trade_board — returns the authed rep's trade board.
// Authorization gate: repId comes from the authenticated session, bound into
// the tool closure at the route handler. The Zod input schema does NOT accept
// repId — any model-supplied rep ID in the prompt is ignored.

import { z } from 'zod'
import { tool } from 'ai'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  getMyBoard,
  TradeBoardError,
  type JewelryType,
  type ListingStatus,
} from '@/lib/services/trade-board'
import { ThumperToolError } from '@/lib/thumper/errors'
import type { ToolDefinition } from './types'

const inputSchema = z.object({
  statusFilter: z.enum(['available', 'pending_trade', 'traded', 'removed']).optional(),
  limit: z.number().int().min(1).max(100).optional(),
})

function explainTradeBoardError(err: unknown): never {
  if (err instanceof TradeBoardError) {
    const msg =
      err.code === 'LISTING_NOT_FOUND'
        ? "I couldn't find that listing on your board."
        : err.code === 'UNAUTHORIZED'
          ? "That listing isn't on your board, so I can't change it."
          : err.message
    throw new ThumperToolError({ code: err.code, userMessage: msg, cause: err })
  }
  throw err
}

export function makeListMyTradeBoardTool(ctx: { repId: string; supabase: SupabaseClient }) {
  return tool({
    description:
      "List the authenticated rep's trade board (their jewelry listings). " +
      'Use this whenever the user asks about their board, their listings, what they have up for trade, or their inventory. ' +
      'Optionally filter by status.',
    inputSchema,
    execute: async ({ statusFilter, limit }) => {
      try {
        const board = await getMyBoard(ctx.supabase, ctx.repId, {
          statusFilter: statusFilter as ListingStatus | undefined,
          limit,
        })
        return {
          count: board.listings.length,
          totalMsrp: board.summary.totalMsrp,
          typeBreakdown: board.summary.typeBreakdown as Record<JewelryType, number>,
          pendingRequestCount: board.summary.pendingRequestCount,
          listings: board.listings.map((l) => ({
            listingId: l.id,
            itemNumber: l.design.item_number,
            designName: l.design.design_name,
            type: l.design.type_prefix,
            material: l.design.material,
            mainStone: l.design.main_stone,
            msrp: l.design.bp_msrp,
            collection: l.design.collection?.name ?? null,
            status: l.status,
            tradePreferences: l.trade_preferences,
            repNotes: l.rep_notes,
            listedAt: l.listed_at,
          })),
        }
      } catch (err) {
        explainTradeBoardError(err)
      }
    },
  })
}

export const listMyTradeBoardTool: ToolDefinition = {
  name: 'list_my_trade_board',
  readOnly: true,
  build: (ctx) => makeListMyTradeBoardTool({ repId: ctx.repId, supabase: ctx.supabase }),
}
