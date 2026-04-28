// Tool: add_listing — write. Adds one or more pieces to the rep's trade board.
// Two modes: single (one item number) and batch (an array of items). Handles
// NEEDS_FULL_INFO (unknown design) by creating the design first when the rep
// supplies the new-design fields on a follow-up call. Clickwrap acceptance is
// the rep's confirmation gate (no HITL approval dialog).
//
// Service-role client: addListing/addListingBatch/createDesign all require
// admin permissions for jewelry_designs.times_listed UPDATE and INSERT on
// jewelry_designs/collections. We obtain createAdminClient() inside execute
// and pass it to every service call. ctx.repId stays closure-bound from the
// authenticated session — the model never supplies it.

import { z } from 'zod'
import { tool } from 'ai'
import type { SupabaseClient } from '@supabase/supabase-js'
import { addListing, addListingBatch } from '@/lib/services/trade-board'
import { createDesign } from '@/lib/services/jewelry-database'
import { ServiceError } from '@/lib/services/errors'
import { createAdminClient } from '@/lib/supabase/admin'
import { writeTradeActionAudit } from '@/lib/thumper/audit'
import { logIncident } from '@/lib/thumper/guardian-telemetry'
import { ThumperToolError } from '@/lib/thumper/errors'
import type { ToolDefinition } from './types'

const itemBaseShape = {
  itemNumber: z.string(),
  repNotes: z.string().optional(),
  tradePreferences: z.string().optional(),
  listingPhotoUrl: z.string().optional(),
}

const newDesignShape = {
  designName: z.string().optional(),
  piecePhotoUrl: z.string().optional(),
  material: z.string().optional(),
  mainStone: z.string().optional(),
  bpMsrp: z.number().optional(),
  collectionName: z.string().optional(),
  specialFeatures: z.string().optional(),
  lengthInfo: z.string().optional(),
}

const batchItem = z.object({
  ...itemBaseShape,
  ...newDesignShape,
})

const inputSchema = z.object({
  mode: z.enum(['single', 'batch']),
  clickwrapAccepted: z.boolean(),
  // Single-mode top-level fields. itemNumber is optional in the schema so
  // batch-mode calls can omit it; runtime validates presence per mode.
  itemNumber: z.string().optional(),
  repNotes: z.string().optional(),
  tradePreferences: z.string().optional(),
  listingPhotoUrl: z.string().optional(),
  // New-design recovery fields (single-mode follow-up after NEEDS_FULL_INFO).
  ...newDesignShape,
  // Batch-mode array.
  items: z.array(batchItem).optional(),
})

type ToolInput = z.infer<typeof inputSchema>

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

async function writeAuditIsolated(args: {
  actionType: string
  repId: string
  targetListingId?: string | null
  beforeState: Record<string, unknown>
  afterState: Record<string, unknown>
  conversationId: string
  runId: string
}) {
  // Audit write is observability, not business logic. The mutation has
  // already succeeded; audit failure must NEVER reverse the rep's view of
  // success. writeTradeActionAudit already swallows its own errors, so this
  // outer try/catch is defense-in-depth — matches remove-listing.ts.
  try {
    await writeTradeActionAudit({
      actionType: args.actionType,
      repId: args.repId,
      targetListingId: args.targetListingId ?? null,
      beforeState: args.beforeState,
      afterState: args.afterState,
      details: { runId: args.runId, conversationId: args.conversationId },
    })
  } catch (auditErr) {
    console.error('[thumper] trade_action_audit write failed', {
      actionType: args.actionType,
      auditErr,
    })
    try {
      await logIncident({
        errorType: 'audit_write_failed',
        repId: args.repId,
        conversationId: args.conversationId,
        severity: 'warn',
        details: {
          toolName: 'add_listing',
          runId: args.runId,
          actionType: args.actionType,
          message: (auditErr as Error)?.message,
        },
      })
    } catch {
      /* swallow — observability must not affect outcome */
    }
  }
}

async function runSingle(
  input: ToolInput,
  ctx: { repId: string; conversationId: string; runId: string },
  admin: SupabaseClient,
) {
  const { itemNumber, designName, piecePhotoUrl, collectionName } = input

  if (!itemNumber) {
    throw new ThumperToolError({
      code: 'MISSING_ITEM_INPUT',
      userMessage: 'I need an item number to add a piece to your board.',
    })
  }

  let createdNewDesign = false

  // New-design recovery: rep is retrying after a prior NEEDS_FULL_INFO.
  // Require collectionName here even though the service layer accepts a
  // null collection — addListing rejects any design without a collection,
  // so creating one without it would dead-end on the very next call.
  if (designName && piecePhotoUrl) {
    if (!collectionName) {
      throw new ThumperToolError({
        code: 'NEEDS_COLLECTION_FOR_NEW_DESIGN',
        userMessage:
          "I also need a collection name for new pieces — without a collection I can create the design but can't list it.",
      })
    }

    let createResult: Awaited<ReturnType<typeof createDesign>>
    try {
      createResult = await createDesign(admin, {
        itemNumber,
        designName,
        piecePhotoUrl,
        collectionName,
        material: input.material,
        mainStone: input.mainStone,
        bpMsrp: input.bpMsrp,
        specialFeatures: input.specialFeatures,
        lengthInfo: input.lengthInfo,
      })
    } catch (err) {
      explainServiceError(err)
    }
    createdNewDesign = true

    await writeAuditIsolated({
      actionType: 'create_design',
      repId: ctx.repId,
      targetListingId: null,
      beforeState: { itemNumber },
      afterState: {
        designId: createResult.designId,
        itemNumber: createResult.itemNumber,
        collectionId: createResult.collectionId ?? '',
        collectionName: createResult.collectionName ?? '',
      },
      conversationId: ctx.conversationId,
      runId: ctx.runId,
    })
  }

  let result: Awaited<ReturnType<typeof addListing>>
  try {
    result = await addListing(admin, ctx.repId, {
      itemNumber,
      clickwrapAccepted: true,
      repNotes: input.repNotes,
      tradePreferences: input.tradePreferences,
      listingPhotoUrl: input.listingPhotoUrl,
    })
  } catch (err) {
    if (err instanceof ServiceError) {
      if (err.code === 'NEEDS_FULL_INFO') {
        return {
          needsAction: 'create_design' as const,
          itemNumber,
          requiredFields: ['designName', 'piecePhotoUrl', 'collectionName'],
          optionalFields: [
            'material',
            'mainStone',
            'bpMsrp',
            'specialFeatures',
            'lengthInfo',
          ],
          message: `I don't have ${itemNumber} on file yet. To add it I'll need three things: a design name, a photo, and a collection name. Optional: material, main stone, MSRP, special features, length.`,
        }
      }
      if (err.code === 'NEEDS_COLLECTION') {
        return {
          needsAction: 'cannot_complete' as const,
          code: 'NEEDS_COLLECTION' as const,
          itemNumber,
          message: `${itemNumber} is in our database but doesn't have a collection assigned. There's no way to patch a collection onto an existing design from this tool today, so it can't be listed right now. Worth flagging to Louis.`,
        }
      }
    }
    explainServiceError(err)
  }

  await writeAuditIsolated({
    actionType: 'add_listing',
    repId: ctx.repId,
    targetListingId: result.listingId,
    beforeState: { itemNumber, repId: ctx.repId, status: '' },
    afterState: {
      listingId: result.listingId,
      designId: result.designId,
      itemNumber: result.itemNumber,
      repId: ctx.repId,
      status: result.status,
    },
    conversationId: ctx.conversationId,
    runId: ctx.runId,
  })

  return {
    mode: 'single' as const,
    listingId: result.listingId,
    designId: result.designId,
    itemNumber: result.itemNumber,
    designName: result.designName,
    status: result.status,
    usesCanonicalPhoto: result.usesCanonicalPhoto,
    createdNewDesign,
  }
}

async function runBatch(
  input: ToolInput,
  ctx: { repId: string; conversationId: string; runId: string },
  admin: SupabaseClient,
) {
  const { items } = input

  if (!items || items.length === 0) {
    throw new ThumperToolError({
      code: 'MISSING_ITEM_INPUT',
      userMessage: 'I need at least one item to add.',
    })
  }

  let result: Awaited<ReturnType<typeof addListingBatch>>
  try {
    result = await addListingBatch(admin, ctx.repId, {
      items: items.map((i) => ({
        itemNumber: i.itemNumber,
        repNotes: i.repNotes,
        tradePreferences: i.tradePreferences,
        listingPhotoUrl: i.listingPhotoUrl,
      })),
      clickwrapAccepted: true,
    })
  } catch (err) {
    explainServiceError(err)
  }

  // Audit each successful add. Loop, not Promise.all — one audit failure
  // must not cascade to siblings, and each call is already isolated.
  for (const r of result.added) {
    await writeAuditIsolated({
      actionType: 'add_listing',
      repId: ctx.repId,
      targetListingId: r.listingId,
      beforeState: { itemNumber: r.itemNumber, repId: ctx.repId, status: '' },
      afterState: {
        listingId: r.listingId,
        designId: r.designId,
        itemNumber: r.itemNumber,
        repId: ctx.repId,
        status: r.status,
      },
      conversationId: ctx.conversationId,
      runId: ctx.runId,
    })
  }

  return {
    mode: 'batch' as const,
    added: result.added.map((r) => ({
      listingId: r.listingId,
      itemNumber: r.itemNumber,
      designName: r.designName,
      status: r.status,
    })),
    pending: {
      needCollection: result.pending.needCollection.map((p) => ({
        itemNumber: p.itemNumber,
        designId: p.designId,
        designName: p.designName,
        message:
          'Design exists but has no collection — cannot list today.',
      })),
      needFullInfo: result.pending.needFullInfo.map((p) => ({
        itemNumber: p.itemNumber,
        message:
          "Not in our database yet — we'll need design name, photo, and collection name.",
      })),
    },
    summary: {
      addedCount: result.added.length,
      needCollectionCount: result.pending.needCollection.length,
      needFullInfoCount: result.pending.needFullInfo.length,
      note: 'Items already on your board are silently skipped — they are not in this report.',
    },
  }
}

export function makeAddListingTool(ctx: {
  repId: string
  supabase: SupabaseClient
  conversationId: string
  runId: string
}) {
  return tool({
    description:
      "Adds one or more pieces to the authenticated rep's trade board. " +
      'Two modes: single (one item number) or batch (an array of items). ' +
      "Requires clickwrap acceptance — the rep must confirm in conversation that they own the piece and the MSRP is accurate before this is set true. " +
      "If a piece isn't in the jewelry database, the tool returns NEEDS_FULL_INFO requiring designName, piecePhotoUrl, and collectionName from the rep on the next call (collection name is mandatory — without it the listing fails). " +
      "If a piece exists in the database but has no collection assigned, the tool returns NEEDS_COLLECTION as a hard limitation (no service path to patch the collection from this tool). " +
      'In batch mode, items already on the board are silently skipped — never invent a dedup list.',
    inputSchema,
    execute: async (input) => {
      const admin = createAdminClient()

      if (!input.clickwrapAccepted) {
        throw new ThumperToolError({
          code: 'CLICKWRAP_REQUIRED',
          userMessage:
            'Before I list this, I need you to confirm you own the piece and the MSRP is accurate.',
        })
      }

      if (input.mode === 'single') {
        return await runSingle(input, ctx, admin)
      }
      return await runBatch(input, ctx, admin)
    },
  })
}

export const addListingTool: ToolDefinition = {
  name: 'add_listing',
  readOnly: false,
  build: (ctx) =>
    makeAddListingTool({
      repId: ctx.repId,
      supabase: ctx.supabase,
      conversationId: ctx.conversationId,
      runId: ctx.runId,
    }),
}
