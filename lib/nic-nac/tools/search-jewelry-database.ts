// Tool: search_jewelry_database — read-only. Free-text search of the jewelry
// catalog for the rep so Nic-Nac can answer "find me <query>" questions.
//
// Service-role client: searchJewelryDatabase aggregates active listing counts
// across ALL reps (cross-rep COUNT requires admin), so we obtain
// createAdminClient() inside execute and pass it to the service. ctx.repId
// stays closure-bound and the service uses it ONLY for the per-rep
// isOnMyBoard flag — never returned PII for other reps.

import { z } from 'zod'
import { tool } from 'ai'
import { searchJewelryDatabase } from '@/lib/services/jewelry-database'
import { ServiceError } from '@/lib/services/errors'
import { createAdminClient } from '@/lib/supabase/admin'
import { NicNacToolError } from '@/lib/nic-nac/errors'
import type { ToolDefinition } from './types'

const inputSchema = z.object({
  query: z.string(),
  limit: z.number().int().min(1).max(50).optional(),
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

export function makeSearchJewelryDatabaseTool(ctx: { repId: string }) {
  return tool({
    description:
      'Look up Bomb Party jewelry before answering a piece question or putting a dancer on the Dance Floor. ' +
      'Use this when the rep asks to find a piece by name, item number, material, stone, collection year, practical tag, or other keywords — e.g. "do we have a sapphire ring?", "find RG31452", "search for emerald necklaces". ' +
      'Returns up to `limit` matching designs with isOnMyBoard (whether the requesting rep already has it listed and available) and activeListingsCount (how many reps total have it listed and available). ' +
      'This is the catalog, not the rep\'s own board — for the rep\'s board, use list_my_trade_board instead.',
    inputSchema,
    execute: async ({ query, limit }) => {
      const admin = createAdminClient()

      let results: Awaited<ReturnType<typeof searchJewelryDatabase>>
      try {
        results = await searchJewelryDatabase(admin, ctx.repId, {
          query,
          limit,
        })
      } catch (err) {
        explainServiceError(err)
      }

      return {
        count: results.length,
        results: results.map((r) => ({
          designId: r.designId,
          itemNumber: r.itemNumber,
          designName: r.designName,
          material: r.material,
          mainStone: r.mainStone,
          photoUrl: r.canonicalPhotoUrl,
          type: r.typePrefix,
          collectionName: r.collectionName,
          collectionYear: r.collectionYear,
          searchTags: r.searchTags,
          isOnMyBoard: r.isOnMyBoard,
          activeListingsCount: r.activeListingsCount,
          addListingGuidance: r.isOnMyBoard
            ? 'This rep already has at least one active listing for this design. Do not refuse as a duplicate. If they are adding an identical physical copy and did not already say so or give a quantity, ask: "That item number is already on your Dance Floor. Are we adding a second identical physical piece?" If they say yes or give quantity, call add_listing; it will increase that dancer\'s quantity instead of making a duplicate card. Different material, main stone/color, size, photo, note, or trade preference stays separate.'
            : undefined,
        })),
      }
    },
  })
}

export const searchJewelryDatabaseTool: ToolDefinition = {
  name: 'search_jewelry_database',
  readOnly: true,
  build: (ctx) => makeSearchJewelryDatabaseTool({ repId: ctx.repId }),
}
