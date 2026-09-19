// Tool: prepare_trade_board_work - read-only resolver for Dance Floor work.
// It gives Nic-Nac the app-owned next path before write tools run.

import { z } from 'zod'
import { tool } from 'ai'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  normalizeJewelryMainStoneKey,
  normalizeJewelryMaterialKey,
  searchJewelryDatabase,
} from '@/lib/services/jewelry-database'
import { getMyBoard } from '@/lib/services/trade-board'
import { getTradeListingDisplayFields } from '@/lib/services/trade-listing-display'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ToolDefinition } from './types'
import type { TradeBoardIntakeSessionState } from '@/lib/nic-nac/workflows/trade-board-intake-types'
import { TRADE_BOARD_GUIDED_START_RESPONSE } from '@/lib/nic-nac/workflows/trade-board-guided-start'

const inputSchema = z.object({
  action: z.enum([
    'add_piece',
    'remove_piece',
    'facilitate_trade',
    'catalog_correction',
    'view_board',
    'unknown',
  ]),
  query: z.string().optional(),
  catalogMode: z.enum(['item_number', 'non_item_number']).optional(),
  itemNumber: z.string().optional(),
  designName: z.string().optional(),
  jewelryType: z.enum(['RG', 'NK', 'ER', 'ST', 'BR']).optional(),
  collectionFamily: z.string().optional(),
  material: z.string().optional(),
  mainStone: z.string().optional(),
  ringSize: z.string().optional(),
})

type ToolInput = z.infer<typeof inputSchema>

function searchQuery(input: ToolInput) {
  return input.itemNumber?.trim() || input.designName?.trim() || input.query?.trim() || ''
}

function appOwnedInput(
  input: ToolInput,
  workflow: TradeBoardIntakeSessionState | null | undefined,
  latestUserHasImage: boolean,
): ToolInput {
  if (!workflow || input.action !== 'add_piece') return input

  // Text-only turns must use durable app-owned facts so an unconstrained model
  // cannot invent an item number or jewelry attributes. On an image turn, the
  // provider is also the vision reader, so allow it to fill only fields the
  // durable workflow does not know yet. The resolver's database result is then
  // persisted back into the workflow on the next turn.
  const groundedVisionInput = latestUserHasImage ? input : ({} as ToolInput)

  return {
    action: input.action,
    catalogMode: workflow.catalogMode,
    itemNumber: workflow.known.itemNumber ?? groundedVisionInput.itemNumber,
    designName: workflow.known.designName ?? groundedVisionInput.designName,
    jewelryType: workflow.known.jewelryType ?? groundedVisionInput.jewelryType,
    collectionFamily:
      workflow.known.collectionFamily ?? groundedVisionInput.collectionFamily,
    material: workflow.known.material ?? groundedVisionInput.material,
    mainStone: workflow.known.mainStone ?? groundedVisionInput.mainStone,
    ringSize: workflow.known.ringSize ?? groundedVisionInput.ringSize,
  }
}

function variantCandidate(result: Awaited<ReturnType<typeof searchJewelryDatabase>>[number]) {
  return {
    designId: result.designId,
    itemNumber: result.itemNumber,
    designName: result.designName,
    material: result.material,
    mainStone: result.mainStone,
    collectionName: result.collectionName,
    collectionYear: result.collectionYear,
    isOnMyBoard: result.isOnMyBoard,
    activeListingsCount: result.activeListingsCount,
  }
}

function resolveCatalogMatch(
  results: Awaited<ReturnType<typeof searchJewelryDatabase>>,
  input: ToolInput,
) {
  const normalizedItem = input.itemNumber?.trim().toUpperCase()
  const materialKey = normalizeJewelryMaterialKey(input.material)
  const mainStoneKey = normalizeJewelryMainStoneKey(input.mainStone)
  if (normalizedItem) {
    const exactMatches = results.filter(
      (result) => result.itemNumber.toUpperCase() === normalizedItem,
    )
    if ((materialKey || mainStoneKey) && exactMatches.length > 0) {
      const variantMatches = exactMatches.filter(
        (result) =>
          (!materialKey || normalizeJewelryMaterialKey(result.material) === materialKey) &&
          (!mainStoneKey || normalizeJewelryMainStoneKey(result.mainStone) === mainStoneKey),
      )
      if (variantMatches.length === 1) {
        return { kind: 'match' as const, match: variantMatches[0] }
      }
      if (variantMatches.length > 1) {
        return {
          kind: 'variant_ambiguous' as const,
          candidates: variantMatches.map(variantCandidate),
        }
      }
      return {
        kind: 'variant_not_found' as const,
        candidates: exactMatches.map(variantCandidate),
      }
    }
    if (exactMatches.length === 1) {
      return { kind: 'match' as const, match: exactMatches[0] }
    }
    if (exactMatches.length > 1) {
      return {
        kind: 'variant_ambiguous' as const,
        candidates: exactMatches.map(variantCandidate),
      }
    }
  }
  if (results.length === 1) return { kind: 'match' as const, match: results[0] }
  if (results.length > 1) {
    return {
      kind: 'ambiguous' as const,
      candidates: results.map(variantCandidate),
    }
  }
  return { kind: 'not_found' as const }
}

export function makePrepareTradeBoardWorkTool(ctx: {
  repId: string
  supabase: SupabaseClient
  activeTradeBoardWorkflow?: TradeBoardIntakeSessionState | null
  latestUserHasImage?: boolean
}) {
  return tool({
    description:
      'Read-only preflight for ambiguous Dance Floor mutations and jewelry-identification work. Use it before adding, removing, correcting, or facilitating a dancer when the next safe path depends on catalog identity, photo roles, duplicate physical inventory, ring size, or trade-request state. Do not use it for a simple request to view the current Dance Floor; call list_my_trade_board directly. Do not call it merely because an earlier turn involved Dance Floor work.',
    inputSchema,
    execute: async (modelInput) => {
      const input = appOwnedInput(
        modelInput,
        ctx.activeTradeBoardWorkflow,
        ctx.latestUserHasImage === true,
      )
      if (input.action === 'remove_piece') {
        const board = await getMyBoard(ctx.supabase, ctx.repId, {
          statusFilter: 'available',
          limit: 50,
        })
        const needle = searchQuery(input).toUpperCase()
        const matches = board.listings.filter((listing) => {
          const display = getTradeListingDisplayFields(listing)
          const itemNumber = display.itemNumber?.toUpperCase() ?? ''
          const designName = display.designName.toUpperCase()
          return needle
            ? itemNumber.includes(needle) || designName.includes(needle)
            : true
        })
        return {
          action: input.action,
          allowedPath: 'remove_rep_trade_board_listing',
          nextTool: 'remove_listing',
          requiresApproval: true,
          requiresExactListing: matches.length !== 1,
          selectedListingId: matches.length === 1 ? matches[0].id : null,
          catalogDeletionAllowed: false,
          boardMatches: matches.map((listing) => ({
            listingId: listing.id,
            itemNumber: getTradeListingDisplayFields(listing).itemNumber,
            designName: getTradeListingDisplayFields(listing).designName,
            status: listing.status,
            listedAt: listing.listed_at,
            ringSize: listing.ring_size,
          })),
          nextQuestion:
            matches.length === 0
              ? "I don't see that exact piece on your board. Which listing did you want to remove?"
              : matches.length > 1
                ? 'I found more than one active physical piece for that item. Which exact listing should I remove?'
                : undefined,
          guidance:
            'Remove only the rep Dance Floor dancer, and use remove_listing because it has the approval dialog. If more than one active physical listing matches, ask the rep to choose the exact listingId before calling remove_listing. Do not remove or delete the shared jewelry database record.',
        }
      }

      if (input.action === 'facilitate_trade') {
        return {
          action: input.action,
          allowedPath: 'trade_request_workflow',
          nextTool: 'get_trade_requests',
          requiresApproval: false,
          catalogDeletionAllowed: false,
          guidance:
            'Use trade-request tools for customer swap facilitation. The rep approves or rejects the trade; Nic-Nac does not approve trades by judgment alone.',
        }
      }

      if (input.action === 'catalog_correction') {
        return {
          action: input.action,
          allowedPath: 'catalog_correction_request',
          nextTool: 'report_jewelry_catalog_issue',
          requiresApproval: true,
          catalogDeletionAllowed: false,
          guidance:
            'Use catalog correction tools for bad shared data or photos. Shared catalog corrections require approval before mutation. Destructive jewelry database deletion is not available to Nic-Nac.',
        }
      }

      if (input.catalogMode === 'non_item_number') {
        const requiredBeforeAction = [
          ...(input.jewelryType ? [] : ['jewelryType']),
          ...(input.collectionFamily ? [] : ['collectionFamily']),
          'jewelryFrontPhoto',
          ...(input.jewelryType === 'RG' && !input.ringSize ? ['ringSize'] : []),
        ]
        return {
          action: input.action,
          catalogStatus: 'not_applicable',
          allowedPath: 'add_non_item_number_trade_listing',
          requiredBeforeAction,
          nextTool: 'add_listing',
          catalogDeletionAllowed: false,
          nextQuestion:
            requiredBeforeAction.length > 0
              ? 'Collection Type and Size'
              : null,
          guidance:
            'Dance-floor-only vs catalog is Nic-Nac discretion, not a forced path. If you choose non_item_number, collect controlled jewelry type, collection, size when applicable, and a clear customer-facing jewelry photo, then call add_listing in non_item_number mode. Do not create or update jewelry_designs and do not invent an item number. Uncataloged stays off Finder. Catalog/Finder writes keep existing jewelry-facing quality; if the rep says the piece is Bomb Party, a good-quality-looking image is enough — do not invent extra proof hurdles.',
        }
      }

      const query = searchQuery(input)
      if (!query) {
        return {
          action: input.action,
          catalogStatus: 'needs_identifying_info',
          allowedPath: 'ask_for_identifier',
          requiredBeforeAction: ['itemNumberOrLabelOrDescription'],
          nextQuestion: TRADE_BOARD_GUIDED_START_RESPONSE,
          catalogDeletionAllowed: false,
        }
      }

      const admin = createAdminClient()
      const results = await searchJewelryDatabase(admin, ctx.repId, {
        query,
        limit: 5,
      })
      const catalogMatch = resolveCatalogMatch(results, input)

      if (catalogMatch.kind === 'variant_ambiguous') {
        const candidateMaterials = new Set(
          catalogMatch.candidates.map((candidate) =>
            normalizeJewelryMaterialKey(candidate.material),
          ),
        )
        const candidateMainStones = new Set(
          catalogMatch.candidates.map((candidate) =>
            normalizeJewelryMainStoneKey(candidate.mainStone),
          ),
        )
        const nextQuestion =
          !normalizeJewelryMaterialKey(input.material) && candidateMaterials.size > 1
            ? 'Which plating or material is this one?'
            : !normalizeJewelryMainStoneKey(input.mainStone) && candidateMainStones.size > 1
              ? 'Which main stone or color is this one?'
              : 'Which catalog variant is this one?'
        return {
          action: input.action,
          catalogStatus: 'variant_ambiguous',
          allowedPath: 'ask_for_variant_material',
          candidates: catalogMatch.candidates,
          nextQuestion,
          catalogDeletionAllowed: false,
          guidance:
            'This item number has multiple catalog variants. Ask only for the missing plating/material or main stone/color, then use the matching variant; do not treat a different variant as a catalog correction.',
        }
      }

      if (catalogMatch.kind === 'variant_not_found') {
        return {
          action: input.action,
          catalogStatus: 'variant_not_found',
          allowedPath: 'create_catalog_variant_then_add_listing',
          existingVariants: catalogMatch.candidates,
          requiredBeforeAction: [
            'itemNumber',
            'designName',
            'collectionName',
            'jewelryFrontPhoto',
          ],
          nextTool: 'add_listing',
          catalogDeletionAllowed: false,
          guidance:
            'This item number exists, but the provided plating/material or main stone/color is not one of the current catalog variants. A different variant is a new catalog design, not a correction to the existing variant. Collect the new variant facts and customer-facing jewelry photo, then call add_listing with the material and main stone.',
        }
      }

      if (catalogMatch.kind === 'ambiguous') {
        return {
          action: input.action,
          catalogStatus: 'ambiguous',
          allowedPath: 'ask_for_catalog_match',
          candidates: catalogMatch.candidates,
          nextQuestion: 'Which matching piece should I use?',
          catalogDeletionAllowed: false,
        }
      }

      if (catalogMatch.kind === 'not_found') {
        return {
          action: input.action,
          catalogStatus: 'not_found',
          allowedPath: 'create_catalog_design_then_add_listing',
          requiredBeforeAction: [
            'itemNumber',
            'designName',
            'collectionName',
            'jewelryFrontPhoto',
          ],
          nextTool: 'add_listing',
          catalogDeletionAllowed: false,
          guidance:
            'This looks new to the shared jewelry database. label/details photos are facts only; collect readable item facts plus a customer-facing jewelry photo before creating the catalog design and adding the rep listing.',
        }
      }

      const match = catalogMatch.match
      const requiredBeforeAction =
        match.typePrefix === 'RG' && !input.ringSize ? ['ringSize'] : []

      return {
        action: input.action,
        catalogStatus: 'found',
        allowedPath: 'add_existing_catalog_design',
        design: {
          designId: match.designId,
          itemNumber: match.itemNumber,
          designName: match.designName,
          material: match.material,
          mainStone: match.mainStone,
          type: match.typePrefix,
          collectionName: match.collectionName,
          collectionYear: match.collectionYear,
          canonicalPhotoUrl: match.canonicalPhotoUrl,
          isOnMyBoard: match.isOnMyBoard,
          activeListingsCount: match.activeListingsCount,
        },
        requiredBeforeAction,
        nextQuestion:
          requiredBeforeAction.includes('ringSize')
            ? 'What ring size is this physical piece?'
            : match.isOnMyBoard
              ? 'That item number is already on your Dance Floor. Are we adding a second identical physical piece?'
              : null,
        nextTool: 'add_listing',
        catalogDeletionAllowed: false,
        guidance:
          'This is already in the shared jewelry database. Use catalog metadata and the canonical catalog photo when available. Do not ask for a new jewelry photo unless the catalog has no usable photo or the rep specifically wants a custom listing photo.',
      }
    },
  })
}

export const prepareTradeBoardWorkTool: ToolDefinition = {
  name: 'prepare_trade_board_work',
  readOnly: true,
  build: (ctx) =>
    makePrepareTradeBoardWorkTool({
      repId: ctx.repId,
      supabase: ctx.supabase,
      activeTradeBoardWorkflow: ctx.activeTradeBoardWorkflow,
      latestUserHasImage: ctx.latestUserHasImage,
    }),
}
