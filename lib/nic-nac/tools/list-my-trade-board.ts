// Tool: list_my_trade_board — returns the authed rep's dance floor.
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
import { getTradeListingDisplayFields } from '@/lib/services/trade-listing-display'
import { NicNacToolError } from '@/lib/nic-nac/errors'
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
    throw new NicNacToolError({ code: err.code, userMessage: msg, cause: err })
  }
  throw err
}

export function makeListMyTradeBoardTool(ctx: { repId: string; supabase: SupabaseClient }) {
  return tool({
    description:
      "See which dancers are on the authenticated rep's Dance Floor right now. " +
      'Use this for questions about the rep’s dancers, pieces available for trade, or what is currently on their Dance Floor. ' +
      'This is a read only; optionally filter dancers by status.',
    inputSchema,
    execute: async ({ statusFilter, limit }) => {
      try {
        const board = await getMyBoard(ctx.supabase, ctx.repId, {
          statusFilter: statusFilter as ListingStatus | undefined,
          limit,
        })
        return {
          count: board.summary.totalPieces,
          typeBreakdown: board.summary.typeBreakdown as Record<JewelryType, number>,
          pendingRequestCount: board.summary.pendingRequestCount,
          listings: board.listings.map((l) => {
            const display = getTradeListingDisplayFields(l)
            return {
              listingId: l.id,
              listingSource: display.listingSource,
              itemNumber: display.itemNumber,
              designName: display.designName,
              type: display.typePrefix,
              material: display.material,
              mainStone: display.mainStone,
              collection: display.collectionName,
              ringSize: display.size,
              status: l.status,
              quantityAvailable: Math.max(0, l.quantity_available ?? 1),
              tradePreferences: l.trade_preferences,
              repNotes: l.rep_notes,
              repFacingNote: display.repFacingNote,
              listedAt: l.listed_at,
            }
          }),
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
