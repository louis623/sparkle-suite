import { z } from 'zod'
import { tool } from 'ai'
import { reportJewelryCatalogIssue } from '@/lib/services/jewelry-catalog-corrections'
import { ServiceError } from '@/lib/services/errors'
import { createAdminClient } from '@/lib/supabase/admin'
import { NicNacToolError } from '@/lib/nic-nac/errors'
import { sanitizeCatalogCorrectionFields } from '@/lib/nic-nac/workflows/trade-workflow-sanitizers'
import { completeTradeWorkflowSession } from '@/lib/nic-nac/workflows/trade-workflow-store'
import { assertTradeWorkflowInputMatches } from '@/lib/nic-nac/workflows/trade-workflow-tool-guards'
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
        const admin = createAdminClient()
        const correction = sanitizeCorrectionForIssueType(input.issueType, input.correction)
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
