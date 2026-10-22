import { z } from 'zod'
import { tool } from 'ai'
import type { SupabaseClient } from '@supabase/supabase-js'
import { reportJewelryCatalogIssue } from '@/lib/services/jewelry-catalog-corrections'
import { ServiceError } from '@/lib/services/errors'
import { createAdminClient } from '@/lib/supabase/admin'
import { NicNacToolError } from '@/lib/nic-nac/errors'
import { isPositiveConfirmation } from '@/lib/nic-nac/workflows/trade-board-intake-context'
import {
  hashCustomerPhotoUrl,
  isApprovedCatalogPhotoUrl,
  normalizePhotoConfirmationKey,
  photoConfirmationPieceKey,
} from '@/lib/nic-nac/workflows/photo-reuse-guard'
import {
  mainPhotoPreviewLocator,
  photoPreviewIsVisible,
} from '@/lib/nic-nac/workflows/main-photo-preview'
import { sanitizeCatalogCorrectionFields } from '@/lib/nic-nac/workflows/trade-workflow-sanitizers'
import { completeTradeWorkflowSession } from '@/lib/nic-nac/workflows/trade-workflow-store'
import { assertTradeWorkflowInputMatches } from '@/lib/nic-nac/workflows/trade-workflow-tool-guards'
import { assertCustomerPhotoNotReused } from './add-listing'
import type { ToolContext, ToolDefinition } from './types'

const inputSchema = z.object({
  itemNumber: z.string(),
  issueType: z.enum([
    'wrong_item_number',
    'wrong_collection',
    'wrong_collection_year',
    'wrong_design_name',
    'wrong_jewelry_type',
    'wrong_material',
    'wrong_stone',
    'wrong_tags',
    'bad_photo',
    'duplicate',
    'other',
  ]),
  reason: z.string(),
  correction: z
    .object({
      designName: z.string().optional(),
      collectionName: z.string().optional(),
      collectionYear: z.number().int().min(2020).max(2040).nullable().optional(),
      material: z.string().nullable().optional(),
      mainStone: z.string().nullable().optional(),
      specialFeatures: z.string().nullable().optional(),
      lengthInfo: z.string().nullable().optional(),
      searchTags: z.array(z.string()).max(8).optional(),
      canonicalPhotoUrl: z.string().optional(),
    })
    .optional(),
})

function sanitizeCorrectionForIssueType(
  issueType: z.infer<typeof inputSchema>['issueType'],
  correction: Record<string, unknown> | undefined,
) {
  if (!correction) return undefined
  const sanitized = sanitizeCatalogCorrectionFields(correction)
  if (issueType !== 'bad_photo') {
    delete sanitized.canonicalPhotoUrl
  }
  return sanitized
}

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

type ConversationPart = {
  type?: string
  text?: string
  mediaType?: string
  output?: {
    needsAction?: string
    code?: string
    itemNumber?: string
    previewImageUrl?: string
    contentSha256?: string
    pieceKey?: string
  }
}

async function conversationConfirmsCatalogPhoto(args: {
  supabase: SupabaseClient
  conversationId: string
  itemNumber: string
  photoUrl: string
  contentSha256: string
  pieceKey: string
}): Promise<boolean> {
  try {
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
    const latestParts = rows[latestUserIndex]?.parts ?? []
    if (
      latestParts.some(
        (part) =>
          part.type === 'file' &&
          typeof part.mediaType === 'string' &&
          part.mediaType.startsWith('image/'),
      )
    ) {
      return false
    }
    const text = latestParts
      .map((part) => (typeof part.text === 'string' ? part.text : ''))
      .join('\n')
    if (!isPositiveConfirmation(text)) return false
    const assistant = rows.slice(latestUserIndex + 1).find((row) => row.role === 'assistant')
    const itemNumber = args.itemNumber.trim().toUpperCase()
    const pieceKey = normalizePhotoConfirmationKey(args.pieceKey)
    return (assistant?.parts ?? []).some((part) => {
      const output = part.output
      if (
        output?.code === 'PHOTO_REUSED_ON_OTHER_ITEM' &&
        output.contentSha256?.trim() === args.contentSha256 &&
        normalizePhotoConfirmationKey(output.pieceKey) === pieceKey &&
        output.itemNumber?.trim().toUpperCase() === itemNumber
      ) {
        return true
      }
      return (
        output?.needsAction === 'confirm_main_photo' &&
        output.contentSha256?.trim() === args.contentSha256 &&
        normalizePhotoConfirmationKey(output.pieceKey) === pieceKey &&
        output.itemNumber?.trim().toUpperCase() === itemNumber
      )
    })
  } catch {
    return false
  }
}

export const reportJewelryCatalogIssueTool: ToolDefinition = {
  name: 'report_jewelry_catalog_issue',
  readOnly: false,
  build: (ctx: ToolContext) =>
    tool({
      description:
        'Report and, when the rep provides corrected information, fix inaccurate shared jewelry catalog data. Use for wrong collection, bad photo, wrong name, wrong stone/material, duplicates, or other catalog quality issues. Canonical catalog photo replacement must use an approved jewelry-front image; never replace the canonical catalog photo with a label/details or back-of-card photo. Requires explicit user approval because shared catalog corrections affect every rep.',
      inputSchema,
      needsApproval: true,
      execute: async (input) => {
        assertTradeWorkflowInputMatches({
          workflow: ctx.activeTradeWorkflow,
          workflowType: 'trade_catalog_correction',
          toolName: 'report_jewelry_catalog_issue',
          checks: [
            { field: 'itemNumber', value: input.itemNumber, label: 'catalog item' },
            {
              field: 'catalogIssueType',
              value: input.issueType,
              label: 'catalog issue type',
            },
          ],
        })
        const correction = sanitizeCorrectionForIssueType(input.issueType, input.correction)
        const canonicalPhotoUrl =
          typeof correction?.canonicalPhotoUrl === 'string'
            ? correction.canonicalPhotoUrl.trim()
            : ''
        if (input.issueType === 'bad_photo' && canonicalPhotoUrl) {
          const preview = mainPhotoPreviewLocator({ imageUrl: canonicalPhotoUrl })
          if (!photoPreviewIsVisible(preview)) {
            throw new NicNacToolError({
              code: 'PHOTO_PREVIEW_UNAVAILABLE',
              userMessage:
                "I can't show you that photo before saving it, so I didn't save it. Send a normal photo link I can show you, and I'll check it with you first.",
            })
          }
          if (!isApprovedCatalogPhotoUrl(canonicalPhotoUrl)) {
            throw new NicNacToolError({
              code: 'PHOTO_NOT_APPROVED',
              userMessage:
                "I can only use an approved jewelry photo, so I didn't save that one. Send the approved front photo and I'll check it with you first.",
            })
          }
          const storedSha = ctx.activeTradeBoardWorkflow?.photos?.find(
            (photo) =>
              photo.imageUrl?.trim() === canonicalPhotoUrl && photo.contentSha256?.trim(),
          )?.contentSha256
          const contentSha256 = await hashCustomerPhotoUrl({
            sourceImageUrl: canonicalPhotoUrl,
            storedSha256: storedSha,
          })
          if (!contentSha256) {
            throw new NicNacToolError({
              code: 'PHOTO_UNREADABLE',
              userMessage:
                'I could not read that photo, so I did not save it. Send it again and I will check it first.',
            })
          }
          const pieceKey = photoConfirmationPieceKey({
            itemNumber: input.itemNumber,
            catalogMode: 'item_number',
          })
          await assertCustomerPhotoNotReused({
            repId: ctx.repId,
            itemNumber: input.itemNumber,
            sourceImageUrl: canonicalPhotoUrl,
            contentSha256,
            workflowPhotos: ctx.activeTradeBoardWorkflow?.photos,
            conversation: {
              supabase: ctx.supabase,
              conversationId: ctx.conversationId,
            },
            reuseAsk: {
              itemNumber: pieceKey,
              pieceKey,
              previewImageUrl: preview.previewImageUrl,
              previewPhotoId: preview.previewPhotoId,
            },
          })
          const confirmed = await conversationConfirmsCatalogPhoto({
            supabase: ctx.supabase,
            conversationId: ctx.conversationId,
            itemNumber: input.itemNumber,
            photoUrl: canonicalPhotoUrl,
            contentSha256,
            pieceKey,
          })
          if (!confirmed) {
            return {
              needsAction: 'confirm_main_photo' as const,
              code: 'MAIN_PHOTO_CONFIRMATION_REQUIRED' as const,
              itemNumber: input.itemNumber.trim().toUpperCase(),
              contentSha256,
              pieceKey,
              ...preview,
              message: `This is the main photo I will save for ${input.itemNumber.trim().toUpperCase()}. If this is the right piece, reply yes.`,
            }
          }
        }
        const admin = createAdminClient()
        try {
          const result = await reportJewelryCatalogIssue(admin, {
            itemNumber: input.itemNumber,
            repId: ctx.repId,
            conversationId: ctx.conversationId,
            issueType: input.issueType,
            reason: input.reason,
            correction,
          })
          if (ctx.activeTradeWorkflow?.workflowType === 'trade_catalog_correction') {
            try {
              await completeTradeWorkflowSession(admin, ctx.activeTradeWorkflow, {
                knownFields: {
                  itemNumber: input.itemNumber,
                  catalogIssueType: input.issueType,
                  catalogCorrectionFields: correction,
                },
                approvalState: 'approved',
                dbAssertions: {
                  catalogIssue: {
                    itemNumber: input.itemNumber,
                    issueType: input.issueType,
                    issueLogged: true,
                    corrected: result.corrected,
                    changedFields: result.changedFields,
                  },
                  catalogDesign: {
                    id: result.designId,
                    itemNumber: result.itemNumber,
                  },
                },
                publicProof: {
                  publicTradeBoardMayUseUpdatedCatalogData: result.corrected,
                  itemNumber: result.itemNumber,
                },
                createdMutationIds: [
                  { kind: 'catalog_design', id: result.designId },
                  { kind: 'catalog_issue', id: result.itemNumber },
                ],
              })
            } catch (workflowErr) {
              console.error('[nic-nac] trade workflow completion failed', {
                workflowId: ctx.activeTradeWorkflow.id,
                toolName: 'report_jewelry_catalog_issue',
                workflowErr,
              })
            }
          }
          return result
        } catch (err) {
          explainServiceError(err)
        }
      },
    }),
}
