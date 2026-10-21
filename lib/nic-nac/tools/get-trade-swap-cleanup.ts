// Tool: get_trade_swap_cleanup - read-only. Lists swapped-in reveal pieces
// that still need catalog details or ring size before returning to the board.

import { z } from 'zod'
import { tool } from 'ai'
import type { SupabaseClient } from '@supabase/supabase-js'

import { getTradeSwapCleanupQueue } from '@/lib/services/trade-swaps'
import { ServiceError } from '@/lib/services/errors'
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

export function makeGetTradeSwapCleanupTool(ctx: {
  repId: string
  supabase: SupabaseClient
}) {
  return tool({
    description:
      "List approved swaps where the customer's just-revealed item number still needs post-show cleanup before it can return to the Dance Floor. " +
      'Use this when the rep asks what swaps need cleanup after the show, which revealed pieces still need catalog details, or which rings still need a size.',
    inputSchema,
    execute: async () => {
      let items: Awaited<ReturnType<typeof getTradeSwapCleanupQueue>>
      try {
        items = await getTradeSwapCleanupQueue(ctx.supabase, ctx.repId)
      } catch (err) {
        explainServiceError(err)
      }

      return {
        count: items.length,
        items,
      }
    },
  })
}

export const getTradeSwapCleanupTool: ToolDefinition = {
  name: 'get_trade_swap_cleanup',
  readOnly: true,
  build: (ctx) =>
    makeGetTradeSwapCleanupTool({
      repId: ctx.repId,
      supabase: ctx.supabase,
    }),
}
