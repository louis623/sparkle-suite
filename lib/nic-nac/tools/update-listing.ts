// Tool: update_listing — write, NO HITL. Patches editable fields on a single
// listing the rep already owns. Reversible (the rep can re-patch), so no
// approval dialog. Authorization gate: repId from session closure; the
// service layer (updateListing) verifies the listing belongs to the rep
// before issuing the UPDATE.
//
// Auth client: updateListing is an auth-client function (lib/services/trade-board.ts:20)
// because the trade_listings UPDATE is rep-scoped via RLS. We pass ctx.supabase
// directly — never elevate to admin for a write that should be RLS-gated.
//
// Editable surface (matches lib/services/types.ts:121-127): repNotes,
// tradePreferences, listingPhotoUrl, useCanonicalPhoto. Design name,
// material, main stone, item number, and any other catalog/design metadata
// are NOT editable here — they live on jewelry_designs which is shared
// catalog data.

import { z } from 'zod'
import { tool } from 'ai'
import type { SupabaseClient } from '@supabase/supabase-js'
import { processRepCustomListingPhotoUrl } from '@/lib/services/listing-photo-processing'
import { updateListing } from '@/lib/services/trade-board'
import { ServiceError } from '@/lib/services/errors'
import { writeTradeActionAudit } from '@/lib/nic-nac/audit'
import { logIncident } from '@/lib/nic-nac/guardian-telemetry'
import { NicNacToolError } from '@/lib/nic-nac/errors'
import { isPositiveConfirmation } from '@/lib/nic-nac/workflows/trade-board-intake-context'
import {
  hashCustomerPhotoUrl,
  normalizePhotoConfirmationKey,
  photoConfirmationPieceKey,
} from '@/lib/nic-nac/workflows/photo-reuse-guard'
import {
  mainPhotoPreviewLocator,
  photoPreviewIsVisible,
} from '@/lib/nic-nac/workflows/main-photo-preview'
import {
  assertCustomerPhotoNotReused,
  confirmedPhotoSetSha,
} from './add-listing'
import type { ToolContext, ToolDefinition } from './types'

export const inputSchema = z
  .object({
    listingId: z.string().uuid(),
    repNotes: z.string().nullable().optional(),
    tradePreferences: z.string().nullable().optional(),
    listingPhotoUrl: z.string().nullable().optional(),
    useCanonicalPhoto: z.boolean().optional(),
  })
  .refine(
    (v) =>
      v.repNotes !== undefined ||
      v.tradePreferences !== undefined ||
      v.listingPhotoUrl !== undefined ||
      v.useCanonicalPhoto !== undefined,
    {
      message:
        'at least one of repNotes, tradePreferences, listingPhotoUrl, or useCanonicalPhoto is required',
    },
  )
  .refine(
    (v) =>
      !(
        v.useCanonicalPhoto === true &&
        v.listingPhotoUrl !== undefined &&
        v.listingPhotoUrl !== null
      ),
    {
      message:
        'cannot set listingPhotoUrl and useCanonicalPhoto:true at the same time — pick one',
    },
  )

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

export function makeUpdateListingTool(ctx: {
  repId: string
  supabase: SupabaseClient
  conversationId: string
  runId: string
  activeTradeBoardWorkflow?: ToolContext['activeTradeBoardWorkflow']
}) {
  return tool({
    description:
      "Patch editable fields on one of the authenticated rep's existing listings. " +
      'Editable surface: repNotes, tradePreferences, listingPhotoUrl, useCanonicalPhoto. ' +
      'Design name, material, and other catalog/design metadata are NOT editable — that data is shared across reps. ' +
      'Identify the listing by listingId (use list_my_trade_board first if you need to look it up). ' +
      'Patch-style: only the fields you pass are changed. ' +
      'Setting useCanonicalPhoto:true reverts to the canonical design photo. ' +
      'At least one patch field is required — never call with just listingId.',
    inputSchema,
    execute: async ({
      listingId,
      repNotes,
      tradePreferences,
      listingPhotoUrl,
      useCanonicalPhoto,
    }) => {
      // Defense-in-depth: schema refines protect the model-supplied path,
      // but direct execute() callers (tests, future internal callers) bypass
      // schema parsing. Re-check the same invariants here.
      const hasAnyPatch =
        repNotes !== undefined ||
        tradePreferences !== undefined ||
        listingPhotoUrl !== undefined ||
        useCanonicalPhoto !== undefined
      if (!hasAnyPatch) {
        throw new NicNacToolError({
          code: 'NO_PATCH_FIELDS',
          userMessage:
            "I need at least one field to change — repNotes, trade preferences, or photo.",
        })
      }
      if (
        useCanonicalPhoto === true &&
        listingPhotoUrl !== undefined &&
        listingPhotoUrl !== null
      ) {
        throw new NicNacToolError({
          code: 'CONFLICTING_PHOTO_INPUTS',
          userMessage:
            "Tell me one or the other — use the canonical photo, or set a custom one. Not both.",
        })
      }

      // Build the patch + the audit field list in lockstep so the audit row
      // mirrors what the service actually applied. When useCanonicalPhoto is
      // true, the service ignores listingPhotoUrl in its branching — even if
      // a future schema relaxation lets the combo through, audit must reflect
      // service behavior, not the input.
      const patch: {
        repNotes?: string | null
        tradePreferences?: string | null
        listingPhotoUrl?: string | null
        useCanonicalPhoto?: boolean
      } = {}
      const patchedFields: string[] = []
      if (repNotes !== undefined) {
        patch.repNotes = repNotes
        patchedFields.push('repNotes')
      }
      if (tradePreferences !== undefined) {
        patch.tradePreferences = tradePreferences
        patchedFields.push('tradePreferences')
      }
      if (useCanonicalPhoto !== undefined) {
        patch.useCanonicalPhoto = useCanonicalPhoto
        patchedFields.push('useCanonicalPhoto')
      }
      if (
        listingPhotoUrl !== undefined &&
        !(useCanonicalPhoto === true && listingPhotoUrl !== null)
      ) {
        if (typeof listingPhotoUrl === 'string' && listingPhotoUrl.trim()) {
          const photoUrl = listingPhotoUrl.trim()
          const listing = await loadListingForPhotoGuard(
            ctx.supabase,
            ctx.repId,
            listingId,
          )
          const workflow = ctx.activeTradeBoardWorkflow ?? undefined
          const storedSha = workflow?.photos?.find(
            (photo) => photo.imageUrl?.trim() === photoUrl && photo.contentSha256?.trim(),
          )?.contentSha256
          const contentSha256 = await hashCustomerPhotoUrl({
            sourceImageUrl: photoUrl,
            storedSha256: storedSha,
          })
          if (!contentSha256) {
            throw new NicNacToolError({
              code: 'PHOTO_UNREADABLE',
              userMessage:
                'I could not read that photo, so I did not save it. Send it again and I will check it first.',
            })
          }
          const workflowPhoto = workflow?.photos?.find(
            (photo) => photo.imageUrl?.trim() === photoUrl,
          )
          const preview = mainPhotoPreviewLocator({
            id: workflowPhoto?.id,
            imageUrl: photoUrl,
          })
          await assertCustomerPhotoNotReused({
            repId: ctx.repId,
            itemNumber: listing.pieceKey,
            sourceImageUrl: photoUrl,
            contentSha256,
            workflowPhotos: workflow?.photos,
            setReuseConfirmedSha: confirmedPhotoSetSha(
              workflow,
              listing.pieceKey,
            ),
            conversation: {
              supabase: ctx.supabase,
              conversationId: ctx.conversationId,
            },
            reuseAsk: {
              listingId,
              itemNumber: listing.itemNumber,
              pieceKey: listing.pieceKey,
              previewImageUrl: preview.previewImageUrl,
              previewPhotoId: preview.previewPhotoId,
            },
          })
          const confirmed = await conversationConfirmsListingPhoto({
            supabase: ctx.supabase,
            conversationId: ctx.conversationId,
            listingId,
            photoUrl,
            contentSha256,
            pieceKey: listing.pieceKey,
          })
          if (!confirmed) {
            if (!photoPreviewIsVisible(preview)) {
              throw new NicNacToolError({
                code: 'PHOTO_PREVIEW_UNAVAILABLE',
                userMessage:
                  "I can't show you that photo before saving it, so I didn't save it. Upload it in the chat, or send a normal photo link, and I'll check it with you first.",
              })
            }
            const label = listing.pieceKey.startsWith('NON_ITEM:')
              ? 'this piece'
              : listing.pieceKey
            return {
              needsAction: 'confirm_main_photo' as const,
              code: 'MAIN_PHOTO_CONFIRMATION_REQUIRED' as const,
              listingId,
              itemNumber: listing.itemNumber,
              contentSha256,
              pieceKey: listing.pieceKey,
              ...preview,
              message: `This is the main photo I will save for ${label}. If this is the right piece, reply yes.`,
            }
          }
        }
        try {
          patch.listingPhotoUrl =
            listingPhotoUrl === null
              ? null
              : (
                  await processRepCustomListingPhotoUrl({
                    repId: ctx.repId,
                    sourceImageUrl: listingPhotoUrl,
                    filenameStem: `${listingId}-listing-photo`,
                  })
                ).photoUrl
        } catch (err) {
          explainServiceError(err)
        }
        patchedFields.push('listingPhotoUrl')
      }

      let result: Awaited<ReturnType<typeof updateListing>>
      try {
        result = await updateListing(ctx.supabase, ctx.repId, listingId, patch)
      } catch (err) {
        explainServiceError(err)
      }

      // Audit write is observability, not business logic. The mutation has
      // already succeeded; audit failure must NEVER reverse the rep's view of
      // success. Same isolation discipline as remove-listing.ts and
      // approve-trade.ts.
      try {
        await writeTradeActionAudit({
          actionType: 'listing_updated',
          repId: ctx.repId,
          targetListingId: result.listingId,
          beforeState: {
            listingId: result.listingId,
            status: result.status,
            repId: ctx.repId,
          },
          afterState: {
            listingId: result.listingId,
            status: result.status,
            repId: ctx.repId,
            patchedFields,
          },
          details: { runId: ctx.runId, conversationId: ctx.conversationId },
        })
      } catch (auditErr) {
        console.error('[nic-nac] trade_action_audit write failed', {
          listingId: result.listingId,
          auditErr,
        })
        try {
          await logIncident({
            errorType: 'audit_write_failed',
            repId: ctx.repId,
            conversationId: ctx.conversationId,
            severity: 'warn',
            details: {
              toolName: 'update_listing',
              runId: ctx.runId,
              listingId: result.listingId,
              message: (auditErr as Error)?.message,
            },
          })
        } catch {
          /* swallow — observability must not affect outcome */
        }
      }

      return {
        listingId: result.listingId,
        status: result.status,
        patchedFields,
      }
    },
  })
}

type ListingPhotoRow = {
  id?: string
  listing_source?: string | null
  design?:
    | { item_number?: string | null }
    | Array<{ item_number?: string | null }>
    | null
}

async function loadListingForPhotoGuard(
  supabase: SupabaseClient,
  repId: string,
  listingId: string,
): Promise<{ pieceKey: string; itemNumber: string | null }> {
  const { data, error } = await supabase
    .from('trade_listings')
    .select('id, listing_source, design:jewelry_designs(item_number)')
    .eq('id', listingId)
    .eq('rep_id', repId)
    .maybeSingle()
  if (error) throw error
  const row = data as ListingPhotoRow | null
  if (!row?.id) {
    throw new NicNacToolError({
      code: 'LISTING_NOT_FOUND',
      userMessage: 'I could not find that listing on your Dance Floor.',
    })
  }
  const design = Array.isArray(row.design) ? row.design[0] : row.design
  const itemNumber = design?.item_number?.trim() || ''
  const pieceKey = photoConfirmationPieceKey({
    itemNumber,
    catalogMode:
      row.listing_source === 'non_item_number' ? 'non_item_number' : 'item_number',
    intakeId: row.id,
  })
  return { pieceKey, itemNumber: itemNumber || null }
}

type ConversationPart = {
  type?: string
  text?: string
  output?: {
    needsAction?: string
    code?: string
    listingId?: string
    previewImageUrl?: string
    contentSha256?: string
    pieceKey?: string
  }
}

function reuseAskConfirmsListingPhoto(
  output: ConversationPart['output'],
  args: { listingId: string; contentSha256: string; pieceKey: string },
): boolean {
  if (output?.code !== 'PHOTO_REUSED_ON_OTHER_ITEM') return false
  return (
    output.listingId === args.listingId &&
    output.contentSha256?.trim() === args.contentSha256 &&
    normalizePhotoConfirmationKey(output.pieceKey) ===
      normalizePhotoConfirmationKey(args.pieceKey)
  )
}

async function conversationConfirmsListingPhoto(args: {
  supabase: SupabaseClient
  conversationId: string
  listingId: string
  photoUrl: string
  contentSha256: string
  pieceKey: string
}): Promise<boolean> {
  const { data, error } = await args.supabase
    .from('nic_nac_conversations')
    .select('role, parts, created_at')
    .eq('conversation_id', args.conversationId)
    .eq('status', 'complete')
    .order('created_at', { ascending: false })
    .limit(20)
  if (error || !Array.isArray(data)) return false
  const rows = data as Array<{ role?: string; parts?: ConversationPart[] | null }>
  const latestUserIndex = rows.findIndex((row) => (row.role ?? 'user') === 'user')
  if (latestUserIndex === -1) return false
  const text = (rows[latestUserIndex]?.parts ?? [])
    .map((part) => (typeof part.text === 'string' ? part.text : ''))
    .join('\n')
  if (!isPositiveConfirmation(text)) return false
  const assistant = rows
    .slice(latestUserIndex + 1)
    .find((row) => row.role === 'assistant')
  return (assistant?.parts ?? []).some((part) => {
    const output = part.output
    if (reuseAskConfirmsListingPhoto(output, args)) return true
    return (
      output?.needsAction === 'confirm_main_photo' &&
      output.listingId === args.listingId &&
      output.contentSha256?.trim() === args.contentSha256 &&
      normalizePhotoConfirmationKey(output.pieceKey) ===
        normalizePhotoConfirmationKey(args.pieceKey)
    )
  })
}

export const updateListingTool: ToolDefinition = {
  name: 'update_listing',
  readOnly: false,
  build: (ctx) =>
    makeUpdateListingTool({
      repId: ctx.repId,
      supabase: ctx.supabase,
      conversationId: ctx.conversationId,
      runId: ctx.runId,
      activeTradeBoardWorkflow: ctx.activeTradeBoardWorkflow,
    }),
}
