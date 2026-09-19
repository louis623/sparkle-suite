// Tool: add_listing — write. Adds one or more pieces to the rep's dance floor.
// Two modes: single (one item number) and batch (an array of items). Handles
// NEEDS_FULL_INFO (unknown design) by creating the design first when the rep
// supplies the new-design fields on a follow-up call.
//
// Service-role client: addListing/addListingBatch/createDesign all require
// admin permissions for jewelry_designs.times_listed UPDATE and INSERT on
// jewelry_designs/collections. We obtain createAdminClient() inside execute
// and pass it to every service call. ctx.repId stays closure-bound from the
// authenticated session — the model never supplies it.

import { z } from 'zod'
import { tool } from 'ai'
import { createHash, randomUUID } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  addListing,
  addListingBatch,
  addNonItemNumberListing,
} from '@/lib/services/trade-board'
import { resolveTradeSwapReplacementListing } from '@/lib/services/trade-swaps'
import {
  createDesign,
  resolveItemNumber,
  updateCanonicalPhoto,
  updatePhotoPipelineState,
} from '@/lib/services/jewelry-database'
import { prepareDesignSourcePhoto } from '@/lib/services/design-source-photo-processing'
import { assessJewelryPhotoPreflight } from '@/lib/services/jewelry-photo-preflight'
import { executePhotoEnhancement } from '@/lib/services/photo-enhancement'
import { decideCanonicalEnhancedPhoto } from '@/lib/services/photo-enhancement-qa'
import { analyzeServerImageQuality } from '@/lib/services/server-image-quality'
import { processRepListingPhotoUrl } from '@/lib/services/listing-photo-processing'
import { ServiceError } from '@/lib/services/errors'
import {
  publishApprovedPhoto,
  removeCatalogDesignPhotoAssets,
} from '@/lib/services/storage'
import { getPhotoroomConfig } from '@/lib/photoroom/config'
import { createAdminClient } from '@/lib/supabase/admin'
import { writeTradeActionAudit } from '@/lib/nic-nac/audit'
import { logIncident } from '@/lib/nic-nac/guardian-telemetry'
import { NicNacToolError } from '@/lib/nic-nac/errors'
import { NicNacMutationFailure } from '@/lib/nic-nac/tool-failure-classification'
import {
  computeTradeBoardAddAttemptReadiness,
  transitionTradeBoardIntake,
} from '@/lib/nic-nac/workflows/trade-board-intake-controller'
import { updateTradeBoardIntakeSession } from '@/lib/nic-nac/workflows/trade-board-intake-store'
import { completeTradeWorkflowSession } from '@/lib/nic-nac/workflows/trade-workflow-store'
import {
  catalogVariantPhotoAssetKey,
  hasUsableWorkflowJewelryPhoto,
  resolveWorkflowCustomerFacingPhoto,
  shouldFallBackToCatalogCanonicalPhoto,
} from '@/lib/nic-nac/workflows/workflow-photo-selection'
import { isAcceptedCustomerFacingWorkflowPhoto } from '@/lib/nic-nac/workflows/workflow-photo-roles'
import type { ToolContext, ToolDefinition } from './types'

const itemBaseShape = {
  itemNumber: z.string(),
  ringSize: z.string().optional(),
  repNotes: z.string().optional(),
  tradePreferences: z.string().optional(),
  listingPhotoUrl: z.string().optional(),
  listingPhotoIndex: z.number().int().min(1).max(10).optional(),
  selectedPhotoId: z.string().uuid().optional(),
  rarityClassification: z.enum(['standard', 'diamond', 'unicorn']),
}

const newDesignShape = {
  designName: z.string().optional(),
  piecePhotoUrl: z.string().optional(),
  piecePhotoIndex: z.number().int().min(1).max(10).optional(),
  material: z.string().optional(),
  mainStone: z.string().optional(),
  bpMsrp: z.number().optional(),
  collectionName: z.string().optional(),
  collectionYear: z.number().int().min(2020).max(2040).optional(),
  searchTags: z.array(z.string()).max(8).optional(),
  specialFeatures: z.string().optional(),
  lengthInfo: z.string().optional(),
}

const batchItem = z.object({
  ...itemBaseShape,
  ...newDesignShape,
})

const inputSchema = z.object({
  mode: z.enum(['single', 'batch']),
  catalogMode: z.enum(['item_number', 'non_item_number']).optional(),
  // Single-mode top-level fields. itemNumber is optional in the schema so
  // batch-mode calls can omit it; runtime validates presence per mode.
  itemNumber: z.string().optional(),
  jewelryType: z.enum(['RG', 'NK', 'ER', 'ST', 'BR']).optional(),
  collectionFamily: z.string().optional(),
  ringSize: z.string().optional(),
  repNotes: z.string().optional(),
  tradePreferences: z.string().optional(),
  listingPhotoUrl: z.string().optional(),
  listingPhotoIndex: z.number().int().min(1).max(10).optional(),
  selectedPhotoId: z.string().uuid().optional(),
  rarityClassification: z.enum(['standard', 'diamond', 'unicorn']).optional(),
  // New-design recovery fields (single-mode follow-up after NEEDS_FULL_INFO).
  ...newDesignShape,
  // Batch-mode array.
  items: z.array(batchItem).optional(),
})

type ToolInput = z.infer<typeof inputSchema>

/** June 27 / August 23 `resolveItemNumber` options. Not a second matcher. */
function catalogVariantLookup(input: { material?: string; mainStone?: string }) {
  return {
    ...(input.material !== undefined ? { material: input.material } : {}),
    ...(input.mainStone !== undefined ? { mainStone: input.mainStone } : {}),
  }
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
    console.error('[nic-nac] trade_action_audit write failed', {
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

// Look up a user-uploaded image part in this conversation and return its
// client-compressed data URL. Explicit photo indexes are treated as 1-based
// numbers across recent conversation photos in normal conversation order, which
// matches how reps and Nic-Nac talk about "the second photo" across a guided
// add flow. Without an explicit index, choose the most recent user turn that
// contains exactly one image; still ask for a choice when a single turn includes
// multiple images and the model did not identify which one is jewelry-front.
async function resolvePhotoFromConversation(ctx: {
  supabase: SupabaseClient
  conversationId: string
  latestUserMessageOnly?: boolean
  photoIndex?: number
}): Promise<{
  imageDataUrl: string
} | null> {
  const { data, error } = await ctx.supabase
    .from('nic_nac_conversations')
    .select('message_id, parts, created_at')
    .eq('conversation_id', ctx.conversationId)
    .eq('role', 'user')
    .eq('status', 'complete')
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
  if (error) throw error
  const rows = ctx.latestUserMessageOnly ? (data ?? []).slice(0, 1) : (data ?? [])
  const rowsWithImages = rows
    .map((row) => {
      const parts = row.parts as Array<{
        type?: string
        mediaType?: string
        url?: string
      }> | null
      const imageParts = (parts ?? []).filter(
        (p) =>
          p?.type === 'file' &&
          typeof p.mediaType === 'string' &&
          p.mediaType.startsWith('image/') &&
          typeof p.url === 'string',
      )
      return { imageParts }
    })
    .filter((row) => row.imageParts.length > 0)

  if (ctx.photoIndex !== undefined) {
    const conversationPhotos = [...rowsWithImages]
      .reverse()
      .flatMap((row) => row.imageParts)
    const imagePart = conversationPhotos[ctx.photoIndex - 1]
    if (!imagePart?.url) {
      throw new NicNacToolError({
        code: 'PHOTO_CHOICE_REQUIRED',
        userMessage: `I found ${conversationPhotos.length} recent photo${
          conversationPhotos.length === 1 ? '' : 's'
        } in this add flow, so I couldn't use photo ${ctx.photoIndex}. Tell me which attached image is the jewelry-front photo.`,
      })
    }
    return {
      imageDataUrl: imagePart.url,
    }
  }

  for (const row of rowsWithImages) {
    const imageParts = row.imageParts
    if (imageParts.length > 1) {
      throw new NicNacToolError({
        code: 'PHOTO_CHOICE_REQUIRED',
        userMessage:
          'I see more than one photo here, so I need the actual jewelry photo before I save anything to the board. Send just the jewelry-front photo, or tell me which attached image is the jewelry photo.',
      })
    }
    const imagePart = imageParts[0]
    if (imagePart?.url) {
      return {
        imageDataUrl: imagePart.url,
      }
    }
  }
  return null
}

function requireRarityClassification(
  value: ToolInput['rarityClassification'],
): 'standard' | 'diamond' | 'unicorn' {
  if (value) return value
  throw new NicNacToolError({
    code: 'RARITY_CONFIRMATION_REQUIRED',
    userMessage:
      'Before I save this dancer, I need to ask: Is this piece a diamond or unicorn?',
  })
}

function resolveRarityClassification(
  value: ToolInput['rarityClassification'],
  workflow?: ToolContext['activeTradeBoardWorkflow'],
) {
  // Legacy/internal callers that do not run through conversational intake are
  // backfilled as standard. Every active Nic-Nac submission is still blocked
  // until the rep supplies the explicit answer stored on the workflow.
  if (!workflow && !value) return 'standard' as const
  return requireRarityClassification(
    value ??
      (workflow?.known.rarityClassification as ToolInput['rarityClassification']),
  )
}

function throwMutationFailure(
  err: unknown,
  args: {
    code: string
    stage: 'catalog_photo_storage' | 'database_write' | 'listing_write'
    retryable: boolean
  },
): never {
  if (err instanceof ServiceError) explainServiceError(err)
  throw new NicNacMutationFailure({ ...args, cause: err })
}

function addAttemptInputSummary(
  input: ToolInput,
  workflow?: ToolContext['activeTradeBoardWorkflow'],
) {
  const hashOptionalSource = (value: string | undefined | null) =>
    value
      ? createHash('sha256').update(value).digest('hex')
      : null
  const workflowJewelryUrl = getWorkflowConfirmedJewelryFrontImageUrl(
    workflow,
    input.listingPhotoIndex ?? input.piecePhotoIndex,
    input.selectedPhotoId,
  )
  return {
    mode: input.mode,
    catalogMode: input.catalogMode ?? 'item_number',
    itemNumber: input.itemNumber?.trim().toUpperCase() ?? null,
    designName: input.designName?.trim() ?? null,
    collectionName: input.collectionName?.trim() ?? null,
    collectionYear: input.collectionYear ?? null,
    material: input.material?.trim() ?? null,
    mainStone: input.mainStone?.trim() ?? null,
    ringSize: input.ringSize?.trim() ?? null,
    repNotes: input.repNotes?.trim() ?? null,
    tradePreferences: input.tradePreferences?.trim() ?? null,
    listingPhotoSource: hashOptionalSource(input.listingPhotoUrl),
    piecePhotoSource: hashOptionalSource(input.piecePhotoUrl),
    listingPhotoIndex: input.listingPhotoIndex ?? null,
    piecePhotoIndex: input.piecePhotoIndex ?? null,
    selectedPhotoId: input.selectedPhotoId ?? null,
    workflowJewelrySource: hashOptionalSource(workflowJewelryUrl),
    bpMsrp: input.bpMsrp ?? null,
    searchTags: input.searchTags ?? [],
    specialFeatures: input.specialFeatures?.trim() ?? null,
    lengthInfo: input.lengthInfo?.trim() ?? null,
  }
}

function catalogMutationIdentity(input: {
  toolInput: ToolInput
  workflow?: ToolContext['activeTradeBoardWorkflow']
  runId: string
  suffix?: string
}) {
  const inputSignature = createHash('sha256')
    .update(JSON.stringify(addAttemptInputSummary(input.toolInput, input.workflow)))
    .digest('hex')
  const scope = input.workflow?.id ?? `run:${input.runId}`
  return {
    idempotencyKey: `trade-board-add:${scope}:${input.suffix ?? 'single'}:${inputSignature}`,
    inputSignature,
  }
}

async function markActiveTradeBoardWorkflowAdding(input: {
  workflow?: ToolContext['activeTradeBoardWorkflow']
  admin: SupabaseClient
  toolInput: ToolInput
  runId: string
}) {
  if (input.workflow?.status !== 'active') return
  const acceptedInputs = addAttemptInputSummary(input.toolInput, input.workflow)
  const inputSignature = createHash('sha256')
    .update(JSON.stringify(acceptedInputs))
    .digest('hex')
  await updateTradeBoardIntakeSession(input.admin, {
    sessionId: input.workflow.id,
    patch: {
      current_phase: 'adding',
      metadata: {
        ...input.workflow.metadata,
        addAttempt: {
          ...((input.workflow.metadata.addAttempt as
            | Record<string, unknown>
            | undefined) ?? {}),
          toolName: 'add_listing',
          stage: 'mutation_authorized',
          lastAuthorizedRunId: input.runId,
          inputSignature,
          acceptedInputs,
        },
      },
    },
  })
}

async function addCatalogListingMutation(
  admin: SupabaseClient,
  repId: string,
  input: Parameters<typeof addListing>[2],
) {
  try {
    return await addListing(admin, repId, input)
  } catch (error) {
    if (error instanceof ServiceError) throw error
    throwMutationFailure(error, {
      code: 'CATALOG_LISTING_WRITE_FAILED',
      stage: 'listing_write',
      retryable: true,
    })
  }
}

function batchRepeatsOneItem(input: ToolInput) {
  if (input.mode !== 'batch' || !input.items || input.items.length < 2) return false
  const firstItemNumber = input.items[0]?.itemNumber?.trim().toUpperCase()
  if (!firstItemNumber) return false
  return input.items.every(
    (item) => item.itemNumber?.trim().toUpperCase() === firstItemNumber,
  )
}

function textHasExplicitQuantity(text: string) {
  return (
    /\b(qty|quantity|count|copies|pieces|units|all|both|pair|several|multiple)\b/i.test(
      text,
    ) ||
    /\b(two|three|four|five|six|seven|eight|nine|ten)\b/i.test(text) ||
    /\b\d+\b/.test(text.replace(/[A-Z]{1,3}\d{3,}/gi, ''))
  )
}

async function latestUserMessageHasExplicitQuantity(ctx: {
  supabase: SupabaseClient
  conversationId: string
}): Promise<boolean | null> {
  let data: { parts?: unknown } | null | undefined
  let error: unknown
  try {
    ;({ data, error } = await ctx.supabase
      .from('nic_nac_conversations')
      .select('parts')
      .eq('conversation_id', ctx.conversationId)
      .eq('role', 'user')
      .eq('status', 'complete')
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle())
  } catch (err) {
    if (err instanceof TypeError) return null
    throw err
  }
  if (error) throw error

  const parts = data?.parts as Array<{ type?: string; text?: string }> | null
  const text = (parts ?? [])
    .filter((part) => part?.type === 'text' && typeof part.text === 'string')
    .map((part) => part.text)
    .join('\n')
  return textHasExplicitQuantity(text)
}

function textConfirmsAdditionalPhysicalPiece(text: string) {
  return (
    textHasExplicitQuantity(text) ||
    /\b(another|additional|extra|second|third|fourth|fifth|copy|duplicate|same\s+one|again)\b/i.test(
      text,
    )
  )
}

function textIsAffirmative(text: string) {
  return /\b(yes|yep|yeah|yup|correct|right|exactly|please|do\s+it|go\s+ahead)\b/i.test(
    text,
  )
}

function textAsksDuplicatePhysicalPieceQuestion(text: string) {
  return (
    /\balready\s+on\s+your\s+(?:Dance\s+Floor|Trade\s+Board)\b/i.test(text) &&
    /\b(?:another|second|additional|extra)\s+(?:identical\s+)?physical\s+piece\b/i.test(text) &&
    (/(?:\b(?:same|that\s+same)\s+design\b)/i.test(text) || /\bidentical\b/i.test(text))
  )
}

function readTextFromParts(parts: unknown) {
  if (!Array.isArray(parts)) return ''
  return parts
    .filter(
      (part): part is { type?: string; text?: string } =>
        part &&
        typeof part === 'object' &&
        (part as { type?: unknown }).type === 'text' &&
        typeof (part as { text?: unknown }).text === 'string',
    )
    .map((part) => part.text)
    .join('\n')
}

async function latestConversationConfirmsAdditionalPhysicalPiece(ctx: {
  supabase: SupabaseClient
  conversationId: string
}): Promise<boolean | null> {
  let data:
    | Array<{ role?: unknown; parts?: unknown }>
    | null
    | undefined
  let error: unknown
  try {
    ;({ data, error } = await ctx.supabase
      .from('nic_nac_conversations')
      .select('role,parts')
      .eq('conversation_id', ctx.conversationId)
      .eq('status', 'complete')
      .in('role', ['user', 'assistant'])
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(4))
  } catch (err) {
    if (err instanceof TypeError) return null
    throw err
  }
  if (error) throw error

  const messages = (data ?? []).map((row) => ({
    role: typeof row.role === 'string' ? row.role : '',
    text: readTextFromParts(row.parts),
  }))
  const latestUserIndex = messages.findIndex((message) => message.role === 'user')
  const latestUser = messages[latestUserIndex]
  if (!latestUser) return false
  if (textConfirmsAdditionalPhysicalPiece(latestUser.text)) return true

  const priorAssistant = messages
    .slice(latestUserIndex + 1)
    .find((message) => message.role === 'assistant')

  return Boolean(
    priorAssistant &&
      textIsAffirmative(latestUser.text) &&
      textAsksDuplicatePhysicalPieceQuestion(priorAssistant.text),
  )
}

async function repAlreadyHasActiveListingForItem(input: {
  admin: SupabaseClient
  repId: string
  itemNumber: string
  material?: string
  mainStone?: string
  designId?: string
}) {
  let designId = input.designId
  if (!designId) {
    const resolved = await resolveItemNumber(
      input.admin,
      input.itemNumber,
      catalogVariantLookup(input),
    )
    if (!resolved?.found) return false
    designId = resolved.design.id
  }

  const { data, error } = await input.admin
    .from('trade_listings')
    .select('id')
    .eq('rep_id', input.repId)
    .eq('design_id', designId)
    .neq('status', 'removed')
    .limit(1)

  if (error) throw error
  return (data ?? []).length > 0
}

async function requireDuplicatePhysicalPieceConfirmationIfNeeded(input: {
  admin: SupabaseClient
  supabase: SupabaseClient
  repId: string
  conversationId: string
  itemNumber: string
  material?: string
  mainStone?: string
  designId?: string
  activeTradeBoardWorkflow?: ToolContext['activeTradeBoardWorkflow']
}) {
  const alreadyListed = await repAlreadyHasActiveListingForItem({
    admin: input.admin,
    repId: input.repId,
    itemNumber: input.itemNumber,
    material: input.material,
    mainStone: input.mainStone,
    designId: input.designId,
  })
  if (!alreadyListed) return
  if (input.activeTradeBoardWorkflow?.known.duplicatePhysicalConfirmed) return

  const confirmed = await latestConversationConfirmsAdditionalPhysicalPiece({
    supabase: input.supabase,
    conversationId: input.conversationId,
  })
  if (confirmed) return

  throw new NicNacToolError({
    code: 'DUPLICATE_PHYSICAL_CONFIRMATION_REQUIRED',
    userMessage:
      'That item number is already on your Dance Floor. Are we adding a second physical piece of that same design?',
  })
}

function getConfirmedJewelryFrontPhotos(
  workflow: ToolContext['activeTradeBoardWorkflow'] | undefined,
) {
  if (workflow?.status !== 'active') return []
  return workflow.photos.filter(isConfirmedJewelryFrontPhoto)
}

function isConfirmedJewelryFrontPhoto(
  photo:
    | NonNullable<ToolContext['activeTradeBoardWorkflow']>['photos'][number]
    | undefined,
): boolean {
  return isAcceptedCustomerFacingWorkflowPhoto(photo) && photo.roleConfirmed
}

function getWorkflowPhotoByModelIndex(
  workflow: ToolContext['activeTradeBoardWorkflow'] | undefined,
  photoIndex: number | undefined,
) {
  if (workflow?.status !== 'active' || photoIndex === undefined) return null
  const photo = workflow.photos[photoIndex - 1]
  return isConfirmedJewelryFrontPhoto(photo) ? photo : null
}

function workflowConfirmsJewelryFrontPhoto(
  workflow: ToolContext['activeTradeBoardWorkflow'] | undefined,
  photoIndex?: number,
): boolean {
  const confirmedPhotos = getConfirmedJewelryFrontPhotos(workflow)
  if (confirmedPhotos.length === 0) return false
  if (photoIndex === undefined) return true
  if (getWorkflowPhotoByModelIndex(workflow, photoIndex)) return true
  return (
    confirmedPhotos.some((photo) => photo.attachmentIndex === photoIndex) ||
    confirmedPhotos.length === 1
  )
}

function getWorkflowConfirmedJewelryFrontImageUrl(
  workflow: ToolContext['activeTradeBoardWorkflow'] | undefined,
  photoIndex?: number,
  selectedPhotoId?: string,
): string | null {
  return (
    resolveWorkflowCustomerFacingPhoto(workflow?.photos, {
      selectedPhotoId,
      modelIndex: photoIndex,
    })?.imageUrl ?? null
  )
}

function workflowHasUsableJewelryFrontRole(
  workflow: ToolContext['activeTradeBoardWorkflow'] | undefined,
): boolean {
  if (workflow?.status !== 'active') return false
  return workflow.photos.some(
    (photo) =>
      photo.declaredRole === 'jewelry_front' &&
      photo.visualRole !== 'label_or_packaging' &&
      photo.quality !== 'blocked',
  )
}

function workflowOwnedListingPhotoUrl(input: {
  listingPhotoUrl?: string
  activeTradeBoardWorkflow?: ToolContext['activeTradeBoardWorkflow']
}): string | undefined {
  const listingPhotoUrl = input.listingPhotoUrl?.trim()
  if (!listingPhotoUrl) return undefined
  const workflow = input.activeTradeBoardWorkflow
  if (workflow?.status !== 'active') return listingPhotoUrl
  const matchesAcceptedJewelry = workflow.photos.some(
    (photo) =>
      isAcceptedCustomerFacingWorkflowPhoto(photo) &&
      photo.imageUrl === listingPhotoUrl,
  )
  return matchesAcceptedJewelry ? listingPhotoUrl : undefined
}

async function processListingPhotoForAdd(input: {
  listingPhotoUrl?: string
  listingPhotoIndex?: number
  selectedPhotoId?: string
  itemNumber?: string
  designId?: string | null
  material?: string | null
  mainStone?: string | null
  activeTradeBoardWorkflow?: ToolContext['activeTradeBoardWorkflow']
  repId: string
  supabase: SupabaseClient
  conversationId: string
  photoIndex?: number
  allowImplicitConversationPhoto?: boolean
  mutationAssetKey?: string
}): Promise<string | undefined> {
  const itemNumber = input.itemNumber ?? 'listing'
  const photoIndex = input.photoIndex ?? input.listingPhotoIndex
  const variantAssetKey = catalogVariantPhotoAssetKey({
    designId: input.designId,
    material: input.material,
    mainStone: input.mainStone,
  })
  const listingPhotoProcessInput = {
    repId: input.repId,
    filenameStem: `${itemNumber}-listing-photo`,
    mutationAssetKey: input.mutationAssetKey,
    ...(variantAssetKey ? { variantAssetKey } : {}),
  }
  const workflowPhotoUrl = getWorkflowConfirmedJewelryFrontImageUrl(
    input.activeTradeBoardWorkflow,
    photoIndex,
    input.selectedPhotoId,
  )
  // In an active workflow the app-owned attachment is authoritative. Raw URLs
  // emitted by the model may be stale copies from an earlier piece or another
  // finish/stone of the same item number.
  if (workflowPhotoUrl) {
    try {
      return (
        await processRepListingPhotoUrl(
          {
            ...listingPhotoProcessInput,
            sourceImageUrl: workflowPhotoUrl,
          },
          { confirmedJewelryFront: true },
        )
      ).photoUrl
    } catch (err) {
      explainServiceError(err)
    }
  }
  const listingPhotoUrl = workflowOwnedListingPhotoUrl({
    listingPhotoUrl: input.listingPhotoUrl,
    activeTradeBoardWorkflow: input.activeTradeBoardWorkflow,
  })
  if (listingPhotoUrl) {
    try {
      const processInput = {
        ...listingPhotoProcessInput,
        sourceImageUrl: listingPhotoUrl,
      }
      const processed =
        workflowPhotoUrl === listingPhotoUrl
          ? await processRepListingPhotoUrl(processInput, {
              confirmedJewelryFront: true,
            })
          : await processRepListingPhotoUrl(processInput)
      return processed.photoUrl
    } catch (err) {
      explainServiceError(err)
    }
  }

  if (
    input.activeTradeBoardWorkflow?.status === 'active' &&
    !workflowHasUsableJewelryFrontRole(input.activeTradeBoardWorkflow)
  ) {
    return undefined
  }

  if (photoIndex === undefined && !input.allowImplicitConversationPhoto) {
    return undefined
  }

  const resolvedListingPhoto = await resolvePhotoFromConversation({
    supabase: input.supabase,
    conversationId: input.conversationId,
    photoIndex,
  })
  if (!resolvedListingPhoto) return undefined

  try {
    const processInput = {
      ...listingPhotoProcessInput,
      sourceImageUrl: resolvedListingPhoto.imageDataUrl,
    }
    const isWorkflowConfirmed = workflowConfirmsJewelryFrontPhoto(
      input.activeTradeBoardWorkflow,
      photoIndex,
    )
    const processed = isWorkflowConfirmed
      ? await processRepListingPhotoUrl(processInput, {
          confirmedJewelryFront: true,
        })
      : await processRepListingPhotoUrl(processInput)
    return processed.photoUrl
  } catch (err) {
    explainServiceError(err)
  }
}

async function markActiveTradeBoardWorkflowCompleted(input: {
  workflow?: ToolContext['activeTradeBoardWorkflow']
  admin: SupabaseClient
  listingId: string
  designId?: string | null
  repId: string
  conversationId: string
  runId: string
}) {
  const workflow = input.workflow
  if (workflow?.status !== 'active') return

  const completed = transitionTradeBoardIntake(workflow, {
    type: 'mark_completed',
    listingIds: [input.listingId],
    designId: input.designId ?? undefined,
  })

  try {
    await updateTradeBoardIntakeSession(input.admin, {
      sessionId: workflow.id,
      patch: {
        status: completed.status,
        current_phase: completed.phase,
        created_listing_ids: completed.createdListingIds ?? [input.listingId],
        created_design_id: completed.createdDesignId ?? input.designId ?? null,
        missing_fields: [],
        hard_blockers: [],
        soft_warnings: [],
        metadata: {
          ...workflow.metadata,
          addAttempt: {
            ...((workflow.metadata.addAttempt as Record<string, unknown> | undefined) ?? {}),
            toolName: 'add_listing',
            stage: 'completed',
            failureCount: 0,
            lastRunId: input.runId,
            completedAt: new Date().toISOString(),
          },
        },
      },
    })
  } catch (error) {
    try {
      await logIncident({
        errorType: 'trade_board_intake_completion_failed',
        repId: input.repId,
        conversationId: input.conversationId,
        severity: 'warn',
        details: {
          toolName: 'add_listing',
          runId: input.runId,
          workflowId: workflow.id,
          listingId: input.listingId,
          message:
            error instanceof Error
              ? error.message
              : 'unknown workflow completion error',
        },
      })
    } catch {
      /* swallow - workflow telemetry must not undo a successful listing */
    }
  }
}

function getSingleSwapCleanupCandidate(
  workflow: ToolContext['activeTradeWorkflow'] | undefined | null,
) {
  if (workflow?.workflowType !== 'trade_swap_cleanup') return null
  if (workflow.knownFields.swapId) {
    return {
      swapId: workflow.knownFields.swapId,
      requestId: workflow.knownFields.requestId,
      revealedItemNumber: workflow.knownFields.revealedItemNumber,
    }
  }
  const swapCandidates = workflow.candidates.filter(
    (candidate) => candidate.kind === 'swap',
  )
  if (swapCandidates.length !== 1) return null
  const [candidate] = swapCandidates
  return {
    swapId: candidate.id,
    requestId: undefined,
    revealedItemNumber: candidate.itemNumber,
  }
}

async function markActiveTradeSwapCleanupWorkflowCompleted(input: {
  workflow?: ToolContext['activeTradeWorkflow'] | null
  admin: SupabaseClient
  listingId: string
  itemNumber?: string | null
  repId: string
  conversationId: string
  runId: string
}) {
  const workflow = input.workflow
  const candidate = getSingleSwapCleanupCandidate(workflow)
  if (!workflow || !candidate) return

  try {
    const linked = await resolveTradeSwapReplacementListing(
      input.admin,
      input.repId,
      {
        swapId: candidate.swapId,
        replacementListingId: input.listingId,
      },
    )
    await completeTradeWorkflowSession(input.admin, workflow, {
      knownFields: {
        swapId: linked.swapId,
        requestId: linked.requestId,
        itemNumber: input.itemNumber ?? candidate.revealedItemNumber,
        revealedItemNumber:
          input.itemNumber ?? candidate.revealedItemNumber,
      },
      approvalState: 'not_required',
      dbAssertions: {
        tradeSwap: {
          id: linked.swapId,
          requestId: linked.requestId,
          replacementListingId: linked.replacementListingId,
          replacementStatus: linked.replacementStatus,
        },
        fulfillment: linked.fulfillmentId
          ? {
              id: linked.fulfillmentId,
              requestId: linked.requestId,
              receivedListingId: linked.replacementListingId,
            }
          : null,
      },
      publicProof: {
        replacementListingShouldBeVisible: true,
        replacementListingId: linked.replacementListingId,
      },
      createdMutationIds: [
        { kind: 'trade_swap', id: linked.swapId },
        { kind: 'listing', id: linked.replacementListingId },
        ...(linked.fulfillmentId
          ? [
              {
                kind: 'fulfillment' as const,
                id: linked.fulfillmentId,
              },
            ]
          : []),
      ],
    })
  } catch (error) {
    try {
      await logIncident({
        errorType: 'trade_swap_cleanup_completion_failed',
        repId: input.repId,
        conversationId: input.conversationId,
        severity: 'warn',
        details: {
          toolName: 'add_listing',
          runId: input.runId,
          workflowId: workflow.id,
          swapId: candidate.swapId,
          listingId: input.listingId,
          message:
            error instanceof Error
              ? error.message
              : 'unknown swap cleanup completion error',
        },
      })
    } catch {
      /* swallow - cleanup telemetry must not undo a successful listing */
    }
  }
}

async function shouldCollapseRepeatedBatchToSingle(
  input: ToolInput,
  ctx: { supabase: SupabaseClient; conversationId: string },
) {
  if (!batchRepeatsOneItem(input)) return false
  const latestHasQuantity = await latestUserMessageHasExplicitQuantity(ctx)
  if (latestHasQuantity === null) return false
  return !latestHasQuantity
}

function normalizeToolText(value: string | null | undefined): string | undefined {
  const normalized = value?.trim()
  return normalized ? normalized : undefined
}

function formatMissingFieldsForRep(missing: string[]) {
  if (missing.length === 0) return ''
  return missing.join(', ')
}

async function runNonItemNumberSingle(
  input: ToolInput,
  ctx: {
    repId: string
    conversationId: string
    runId: string
    supabase: SupabaseClient
    activeTradeBoardWorkflow?: ToolContext['activeTradeBoardWorkflow']
    activeTradeWorkflow?: ToolContext['activeTradeWorkflow']
    mutationSuffix?: string
  },
  admin: SupabaseClient,
) {
  const activeWorkflow = ctx.activeTradeBoardWorkflow
  const workflowKnown =
    activeWorkflow?.status === 'active' ? activeWorkflow.known : {}
  const jewelryType = input.jewelryType ?? workflowKnown.jewelryType
  const collectionFamily =
    normalizeToolText(input.collectionFamily) ??
    normalizeToolText(workflowKnown.collectionFamily)
  const collectionName =
    normalizeToolText(input.collectionName) ??
    normalizeToolText(workflowKnown.collectionName)
  const ringSize =
    normalizeToolText(input.ringSize) ?? normalizeToolText(workflowKnown.ringSize)

  if (activeWorkflow?.status === 'active') {
    const readiness = computeTradeBoardAddAttemptReadiness(activeWorkflow, {
      catalogMode: 'non_item_number',
      jewelryType,
      collectionFamily,
      collectionName,
      ringSize,
      rarityClassification: input.rarityClassification,
    })
    if (!readiness.ready) {
      const missing = formatMissingFieldsForRep(readiness.missing)
      throw new NicNacToolError({
        code: 'WORKFLOW_NOT_READY',
        userMessage: readiness.missing.includes('jewelryFrontPhoto')
          ? 'I still need the customer-facing jewelry photo before I can save this listing.'
          : `I still need Collection Type and Size details before I can save this listing: ${missing}.`,
      })
    }
  } else {
    const missing = [
      ...(jewelryType ? [] : ['jewelryType']),
      ...(collectionFamily ? [] : ['collectionFamily']),
      ...(jewelryType === 'RG' && !ringSize ? ['ringSize'] : []),
    ]
    if (missing.length > 0) {
      throw new NicNacToolError({
        code: 'MISSING_NON_ITEM_NUMBER_FIELDS',
        userMessage: `I still need Collection Type and Size details before I can save this listing: ${formatMissingFieldsForRep(missing)}.`,
      })
    }
  }

  if (!jewelryType || !collectionFamily) {
    throw new NicNacToolError({
      code: 'MISSING_NON_ITEM_NUMBER_FIELDS',
      userMessage:
        'I still need Collection Type and Size details before I can save this listing.',
    })
  }

  const processedListingPhotoUrl = await processListingPhotoForAdd({
    listingPhotoUrl: input.listingPhotoUrl,
    listingPhotoIndex: input.listingPhotoIndex,
    selectedPhotoId: input.selectedPhotoId,
    itemNumber: 'non-item-number-piece',
    activeTradeBoardWorkflow: activeWorkflow,
    repId: ctx.repId,
    supabase: ctx.supabase,
    conversationId: ctx.conversationId,
    photoIndex: input.listingPhotoIndex ?? input.piecePhotoIndex,
    allowImplicitConversationPhoto: true,
  })
  if (!processedListingPhotoUrl) {
    throw new NicNacToolError({
      code: 'MISSING_LISTING_PHOTO',
      userMessage:
        'I still need the customer-facing jewelry photo before I can save this listing.',
    })
  }

  let result: Awaited<ReturnType<typeof addNonItemNumberListing>>
  try {
    result = await addNonItemNumberListing(admin, ctx.repId, {
      jewelryType,
      collectionFamily,
      collectionName,
      size: ringSize,
      photoUrl: processedListingPhotoUrl,
      repNotes: input.repNotes,
      tradePreferences: input.tradePreferences,
      rarityClassification: resolveRarityClassification(input.rarityClassification, activeWorkflow),
    })
  } catch (err) {
    explainServiceError(err)
  }

  await markActiveTradeBoardWorkflowCompleted({
    workflow: activeWorkflow,
    admin,
    listingId: result.listingId,
    designId: null,
    repId: ctx.repId,
    conversationId: ctx.conversationId,
    runId: ctx.runId,
  })
  await markActiveTradeSwapCleanupWorkflowCompleted({
    workflow: ctx.activeTradeWorkflow,
    admin,
    listingId: result.listingId,
    itemNumber: null,
    repId: ctx.repId,
    conversationId: ctx.conversationId,
    runId: ctx.runId,
  })

  await writeAuditIsolated({
    actionType: 'add_listing',
    repId: ctx.repId,
    targetListingId: result.listingId,
    beforeState: {
      listingSource: 'non_item_number',
      repId: ctx.repId,
      status: '',
    },
    afterState: {
      listingId: result.listingId,
      listingSource: result.listingSource,
      displayName: result.displayName,
      repId: ctx.repId,
      status: result.status,
    },
    conversationId: ctx.conversationId,
    runId: ctx.runId,
  })

  return {
    mode: 'single' as const,
    listingId: result.listingId,
    designId: null,
    itemNumber: null,
    listingSource: result.listingSource,
    displayName: result.displayName,
    status: result.status,
    usesCanonicalPhoto: false,
    createdNewDesign: false,
  }
}

async function runSingle(
  input: ToolInput,
  ctx: {
    repId: string
    conversationId: string
    runId: string
    supabase: SupabaseClient
    activeTradeBoardWorkflow?: ToolContext['activeTradeBoardWorkflow']
    activeTradeWorkflow?: ToolContext['activeTradeWorkflow']
    mutationSuffix?: string
  },
  admin: SupabaseClient,
) {
  const { itemNumber, designName, piecePhotoUrl, collectionName } = input
  const activeWorkflow = ctx.activeTradeBoardWorkflow
  const mutationIdentity = catalogMutationIdentity({
    toolInput: input,
    workflow: activeWorkflow,
    runId: ctx.runId,
    suffix: ctx.mutationSuffix,
  })

  if (
    input.catalogMode === 'non_item_number' ||
    (!itemNumber && activeWorkflow?.catalogMode === 'non_item_number')
  ) {
    return runNonItemNumberSingle(input, ctx, admin)
  }

  if (!itemNumber) {
    throw new NicNacToolError({
      code: 'MISSING_ITEM_INPUT',
      userMessage: 'I need an item number to add a piece to your board.',
    })
  }

  let resolvedCatalogDesign: Awaited<ReturnType<typeof resolveItemNumber>> | null =
    null
  let useCatalogCanonicalFallback = false
  if (activeWorkflow?.status === 'active') {
    const readiness = computeTradeBoardAddAttemptReadiness(activeWorkflow, {
      itemNumber,
      designName: input.designName,
      collectionName: input.collectionName,
      collectionYear: input.collectionYear,
      rarityClassification: input.rarityClassification,
    })
    if (!readiness.ready) {
      const needsJewelryPhoto = readiness.missing.includes('jewelryFrontPhoto')
      if (
        needsJewelryPhoto &&
        readiness.blockers.length === 0 &&
        readiness.missing.every((field) => field === 'jewelryFrontPhoto')
      ) {
        try {
          resolvedCatalogDesign = await resolveItemNumber(
            admin,
            itemNumber,
            catalogVariantLookup(input),
          )
        } catch (err) {
          explainServiceError(err)
        }
        if (
          resolvedCatalogDesign.found &&
          resolvedCatalogDesign.design.canonicalPhotoUrl &&
          (resolvedCatalogDesign.hasCollection || input.collectionName?.trim())
        ) {
          useCatalogCanonicalFallback = true
        }
      }
      if (useCatalogCanonicalFallback) {
        // The label/details photo identified the catalog piece; the service
        // will validate and use the shared canonical jewelry photo.
      } else {
        const missing = readiness.missing.join(', ')
        throw new NicNacToolError({
          code: 'WORKFLOW_NOT_READY',
          userMessage: needsJewelryPhoto
            ? 'I still need the customer-facing jewelry photo before I can save this listing.'
            : `I still need these details before I can save this listing: ${missing}.`,
        })
      }
    }
  }

  let createdNewDesign = false
  let photoPreflight:
    | ReturnType<typeof assessJewelryPhotoPreflight>
    | null = null
  let sourcePhotoWidth = 0
  let sourcePhotoHeight = 0
  let sourcePhotoAnalysis:
    | {
        blurRisk: number
        lightingRisk: number
        detailRisk: number
        backgroundDistractionRisk: number
        subjectCoverage: number
        subjectCentered: boolean
      }
    | null = null
  let newDesignListingPhotoUrl: string | undefined

  // New-design recovery: rep is retrying after a prior NEEDS_FULL_INFO.
  // Require collectionName here even though the service layer accepts a
  // null collection — addListing rejects any design without a collection,
  // so creating one without it would dead-end on the very next call.
  // Photo uploads are resolved server-side from workflow state or recent chat
  // images; a manual source remains accepted only when explicitly provided.
  if (designName) {
    if (!collectionName) {
      throw new NicNacToolError({
        code: 'NEEDS_COLLECTION_FOR_NEW_DESIGN',
        userMessage:
          "I also need a collection name for new pieces — without a collection I can create the design but can't list it.",
      })
    }

    // Recovery fields can arrive after the design has already been created by
    // another attempt. Use a read-only catalog lookup before creating so stale
    // retries do not duplicate catalog designs.
    try {
      const existingDesign =
        resolvedCatalogDesign ??
        (await resolveItemNumber(admin, itemNumber, catalogVariantLookup(input)))
      if (existingDesign.found) {
        await requireDuplicatePhysicalPieceConfirmationIfNeeded({
          admin,
          supabase: ctx.supabase,
          repId: ctx.repId,
          conversationId: ctx.conversationId,
          itemNumber,
          material: input.material,
          mainStone: input.mainStone,
          designId: existingDesign.design.id,
          activeTradeBoardWorkflow: activeWorkflow,
        })
        await markActiveTradeBoardWorkflowAdding({
          workflow: activeWorkflow,
          admin,
          toolInput: input,
          runId: ctx.runId,
        })
        const useExistingCatalogCanonicalPhoto =
          shouldFallBackToCatalogCanonicalPhoto({
            listingPhotoUrl: input.listingPhotoUrl,
            hasWorkflowJewelryPhoto: hasUsableWorkflowJewelryPhoto(
              activeWorkflow?.photos,
              {
                selectedPhotoId: input.selectedPhotoId,
                modelIndex: input.listingPhotoIndex ?? input.piecePhotoIndex,
              },
            ),
            catalogHasCanonicalPhoto:
              existingDesign.hasCollection &&
              Boolean(existingDesign.design.canonicalPhotoUrl),
            resolvedDesignId: existingDesign.design.id,
          })
        const existingListingPhotoUrl = useExistingCatalogCanonicalPhoto
          ? undefined
          : await processListingPhotoForAdd({
              listingPhotoUrl: input.listingPhotoUrl,
              listingPhotoIndex: input.listingPhotoIndex,
              selectedPhotoId: input.selectedPhotoId,
              itemNumber,
              designId: existingDesign.design.id,
              material: input.material ?? existingDesign.design.material,
              mainStone: input.mainStone ?? existingDesign.design.mainStone,
              activeTradeBoardWorkflow: activeWorkflow,
              repId: ctx.repId,
              supabase: ctx.supabase,
              conversationId: ctx.conversationId,
              photoIndex: input.listingPhotoIndex ?? input.piecePhotoIndex,
              mutationAssetKey: mutationIdentity.inputSignature,
            })
        const existingResult = await addCatalogListingMutation(admin, ctx.repId, {
          itemNumber,
          material: input.material,
          mainStone: input.mainStone,
          collectionName,
          ringSize: input.ringSize,
          repNotes: input.repNotes,
          tradePreferences: input.tradePreferences,
          rarityClassification: resolveRarityClassification(input.rarityClassification, activeWorkflow),
          listingPhotoUrl: existingListingPhotoUrl,
          ...mutationIdentity,
        })
        await markActiveTradeBoardWorkflowCompleted({
          workflow: activeWorkflow,
          admin,
          listingId: existingResult.listingId,
          designId: existingResult.designId,
          repId: ctx.repId,
          conversationId: ctx.conversationId,
          runId: ctx.runId,
        })
        await markActiveTradeSwapCleanupWorkflowCompleted({
          workflow: ctx.activeTradeWorkflow,
          admin,
          listingId: existingResult.listingId,
          itemNumber: existingResult.itemNumber,
          repId: ctx.repId,
          conversationId: ctx.conversationId,
          runId: ctx.runId,
        })
        await writeAuditIsolated({
          actionType: 'add_listing',
          repId: ctx.repId,
          targetListingId: existingResult.listingId,
          beforeState: { itemNumber, repId: ctx.repId, status: '' },
          afterState: {
            listingId: existingResult.listingId,
            designId: existingResult.designId,
            itemNumber: existingResult.itemNumber,
            repId: ctx.repId,
            status: existingResult.status,
            quantityAvailable: existingResult.quantityAvailable,
          },
          conversationId: ctx.conversationId,
          runId: ctx.runId,
        })
        return {
          mode: 'single' as const,
          listingId: existingResult.listingId,
          designId: existingResult.designId,
          itemNumber: existingResult.itemNumber,
          designName: existingResult.designName,
          status: existingResult.status,
          usesCanonicalPhoto: existingResult.usesCanonicalPhoto,
          quantityAvailable: existingResult.quantityAvailable,
          groupedWithExisting: existingResult.groupedWithExisting,
          createdNewDesign: false,
        }
      }
    } catch (err) {
      explainServiceError(err)
    }

    await markActiveTradeBoardWorkflowAdding({
      workflow: activeWorkflow,
      admin,
      toolInput: input,
      runId: ctx.runId,
    })

    // Reserve the internal catalog variant identity before uploading photos.
    // The vendor item number stays unchanged and may be shared by multiple
    // stone/material variants; this UUID owns assets for one design row.
    const newDesignId = randomUUID()
    let publicPhotoObjectPath: string | null = null
    const designSourcePhotoIndex = input.piecePhotoIndex ?? input.listingPhotoIndex
    const workflowConfirmedDesignPhoto = workflowConfirmsJewelryFrontPhoto(
      activeWorkflow,
      designSourcePhotoIndex,
    )
    const workflowConfirmedPhotoUrl = getWorkflowConfirmedJewelryFrontImageUrl(
      activeWorkflow,
      designSourcePhotoIndex,
      input.selectedPhotoId,
    )
    const ownedPiecePhotoUrl = workflowOwnedListingPhotoUrl({
      listingPhotoUrl: piecePhotoUrl,
      activeTradeBoardWorkflow: activeWorkflow,
    })
    // Workflow-owned selection wins. A model-provided URL is a legacy fallback
    // only when no durable workflow is active.
    let resolvedPhotoUrl: string | null =
      workflowConfirmedPhotoUrl ??
      (activeWorkflow?.status === 'active' ? ownedPiecePhotoUrl : null) ??
      (activeWorkflow?.status === 'active' ? null : piecePhotoUrl?.trim() ?? null)
    let stagedOriginal:
      | {
          objectPath: string
          signedUrl: string
        }
      | null = null
    if (resolvedPhotoUrl) {
      let preparedSource: Awaited<ReturnType<typeof prepareDesignSourcePhoto>>
      try {
        preparedSource = await prepareDesignSourcePhoto(
          {
            repId: ctx.repId,
            designId: newDesignId,
            sourceImageUrl: resolvedPhotoUrl,
            filenameStem: itemNumber,
          },
          {
            confirmedJewelryFront:
              workflowConfirmedDesignPhoto &&
              workflowConfirmedPhotoUrl === resolvedPhotoUrl,
          },
        )
      } catch (err) {
        throwMutationFailure(err, {
          code: 'CATALOG_PHOTO_STORAGE_FAILED',
          stage: 'catalog_photo_storage',
          retryable: true,
        })
      }
      resolvedPhotoUrl = preparedSource.publicPhotoUrl
      publicPhotoObjectPath = preparedSource.publicObjectPath
      stagedOriginal = preparedSource.stagedOriginal
      photoPreflight = preparedSource.preflight
      sourcePhotoWidth = preparedSource.analysis.width
      sourcePhotoHeight = preparedSource.analysis.height
      sourcePhotoAnalysis = {
        blurRisk: preparedSource.analysis.blurRisk,
        lightingRisk: preparedSource.analysis.lightingRisk,
        detailRisk: preparedSource.analysis.detailRisk,
        backgroundDistractionRisk:
          preparedSource.analysis.backgroundDistractionRisk,
        subjectCoverage: preparedSource.analysis.subjectCoverage,
        subjectCentered: preparedSource.analysis.subjectCentered,
      }
    } else if (workflowConfirmedPhotoUrl) {
      let preparedSource: Awaited<ReturnType<typeof prepareDesignSourcePhoto>>
      try {
        preparedSource = await prepareDesignSourcePhoto(
          {
            repId: ctx.repId,
            designId: newDesignId,
            sourceImageUrl: workflowConfirmedPhotoUrl,
            filenameStem: itemNumber,
          },
          { confirmedJewelryFront: true },
        )
      } catch (err) {
        throwMutationFailure(err, {
          code: 'CATALOG_PHOTO_STORAGE_FAILED',
          stage: 'catalog_photo_storage',
          retryable: true,
        })
      }
      stagedOriginal = preparedSource.stagedOriginal
      resolvedPhotoUrl = preparedSource.publicPhotoUrl
      publicPhotoObjectPath = preparedSource.publicObjectPath
      photoPreflight = preparedSource.preflight
      sourcePhotoWidth = preparedSource.analysis.width
      sourcePhotoHeight = preparedSource.analysis.height
      sourcePhotoAnalysis = {
        blurRisk: preparedSource.analysis.blurRisk,
        lightingRisk: preparedSource.analysis.lightingRisk,
        detailRisk: preparedSource.analysis.detailRisk,
        backgroundDistractionRisk:
          preparedSource.analysis.backgroundDistractionRisk,
        subjectCoverage: preparedSource.analysis.subjectCoverage,
        subjectCentered: preparedSource.analysis.subjectCentered,
      }
    } else if (
      activeWorkflow?.status === 'active' &&
      !workflowHasUsableJewelryFrontRole(activeWorkflow)
    ) {
      throw new NicNacToolError({
        code: 'JEWELRY_FRONT_PHOTO_REQUIRED',
        userMessage:
          'I still need the customer-facing jewelry photo before I can save this listing. The label/details photo is only for reading the card.',
      })
    } else {
      const resolvedPhoto = await resolvePhotoFromConversation({
        supabase: ctx.supabase,
        conversationId: ctx.conversationId,
        latestUserMessageOnly: true,
        photoIndex: designSourcePhotoIndex,
      })
      if (!resolvedPhoto) {
        throw new NicNacToolError({
          code: 'MISSING_PIECE_PHOTO',
          userMessage:
            "I don't see a photo of this piece in our conversation. Send me a photo and I'll add it.",
        })
      }
      let preparedSource: Awaited<ReturnType<typeof prepareDesignSourcePhoto>>
      try {
        preparedSource = await prepareDesignSourcePhoto(
          {
            repId: ctx.repId,
            designId: newDesignId,
            sourceImageDataUrl: resolvedPhoto.imageDataUrl,
            filenameStem: itemNumber,
          },
          {
            confirmedJewelryFront: workflowConfirmedDesignPhoto,
          },
        )
      } catch (err) {
        throwMutationFailure(err, {
          code: 'CATALOG_PHOTO_STORAGE_FAILED',
          stage: 'catalog_photo_storage',
          retryable: true,
        })
      }
      stagedOriginal = preparedSource.stagedOriginal
      resolvedPhotoUrl = preparedSource.publicPhotoUrl
      publicPhotoObjectPath = preparedSource.publicObjectPath
      photoPreflight = preparedSource.preflight
      sourcePhotoWidth = preparedSource.analysis.width
      sourcePhotoHeight = preparedSource.analysis.height
      sourcePhotoAnalysis = {
        blurRisk: preparedSource.analysis.blurRisk,
        lightingRisk: preparedSource.analysis.lightingRisk,
        detailRisk: preparedSource.analysis.detailRisk,
        backgroundDistractionRisk:
          preparedSource.analysis.backgroundDistractionRisk,
        subjectCoverage: preparedSource.analysis.subjectCoverage,
        subjectCentered: preparedSource.analysis.subjectCentered,
      }
    }

    let createResult: Awaited<ReturnType<typeof createDesign>>
    try {
      createResult = await createDesign(admin, {
        designId: newDesignId,
        itemNumber,
        designName,
        piecePhotoUrl: resolvedPhotoUrl,
        collectionName,
        collectionYear: input.collectionYear,
        searchTags: input.searchTags,
        material: input.material,
        mainStone: input.mainStone,
        bpMsrp: input.bpMsrp,
        specialFeatures: input.specialFeatures,
        lengthInfo: input.lengthInfo,
        createdByRepId: ctx.repId,
        conversationId: ctx.conversationId,
        rarityClassification: resolveRarityClassification(input.rarityClassification, activeWorkflow),
        photoPipeline: stagedOriginal
          ? {
              originalPath: stagedOriginal.objectPath,
              originalUrl: stagedOriginal.signedUrl,
              status: 'ready',
              preflightScore: photoPreflight?.score ?? null,
              preflightIssues: photoPreflight?.issues ?? [],
            }
          : undefined,
      })
    } catch (err) {
      // A lost database response can hide a committed insert. The UUID was
      // reserved before upload, so read it back before compensating; deleting
      // the assets of a committed design would break the customer photo.
      const { data: committedDesign, error: readbackError } = await admin
        .from('jewelry_designs')
        .select(
          'id,item_number,design_name,type_prefix,collection_id,search_tags,material,main_stone,canonical_photo_url',
        )
        .eq('id', newDesignId)
        .maybeSingle()

      if (readbackError) {
        throwMutationFailure(readbackError, {
          code: 'CATALOG_DESIGN_COMMIT_UNCERTAIN',
          stage: 'database_write',
          retryable: true,
        })
      }

      const normalizeCatalogValue = (value: unknown) =>
        typeof value === 'string' && value.trim()
          ? value.trim().toLocaleLowerCase()
          : null
      const committedDesignMatches =
        committedDesign &&
        String(committedDesign.item_number).trim().toUpperCase() ===
          itemNumber.trim().toUpperCase() &&
        normalizeCatalogValue(committedDesign.design_name) ===
          normalizeCatalogValue(designName) &&
        normalizeCatalogValue(committedDesign.material) ===
          normalizeCatalogValue(input.material) &&
        normalizeCatalogValue(committedDesign.main_stone) ===
          normalizeCatalogValue(input.mainStone) &&
        String(committedDesign.canonical_photo_url) === resolvedPhotoUrl

      if (committedDesign && !committedDesignMatches) {
        throwMutationFailure(err, {
          code: 'CATALOG_DESIGN_COMMIT_MISMATCH',
          stage: 'database_write',
          retryable: false,
        })
      }

      if (committedDesignMatches) {
        createResult = {
          designId: String(committedDesign.id),
          itemNumber: String(committedDesign.item_number),
          collectionId:
            typeof committedDesign.collection_id === 'string'
              ? committedDesign.collection_id
              : null,
          collectionName: collectionName.trim(),
          collectionYear: input.collectionYear ?? null,
          searchTags: Array.isArray(committedDesign.search_tags)
            ? committedDesign.search_tags.map(String)
            : [],
          typePrefix: committedDesign.type_prefix as
            Awaited<ReturnType<typeof createDesign>>['typePrefix'],
        }
      } else {
        try {
          await removeCatalogDesignPhotoAssets({
            publicObjectPath: publicPhotoObjectPath,
            stagedObjectPath: stagedOriginal?.objectPath,
          })
        } catch (cleanupError) {
          // Keep the catalog write failure as the user-facing cause. Cleanup is
          // compensating best effort and never overwrites another variant.
          await logIncident({
            errorType: 'catalog_design_asset_cleanup_failed',
            repId: ctx.repId,
            conversationId: ctx.conversationId,
            severity: 'warn',
            details: {
              toolName: 'add_listing',
              runId: ctx.runId,
              itemNumber,
              designId: newDesignId,
              message: (cleanupError as Error)?.message,
            },
          })
        }
        throwMutationFailure(err, {
          code: 'CATALOG_DESIGN_WRITE_FAILED',
          stage: 'database_write',
          retryable: true,
        })
      }
    }
    createdNewDesign = true
    if (workflowConfirmedDesignPhoto && resolvedPhotoUrl) {
      newDesignListingPhotoUrl = resolvedPhotoUrl
    }
    if (stagedOriginal) {
      try {
        const photoroomConfig = getPhotoroomConfig()
        if (photoroomConfig) {
          await updatePhotoPipelineState(admin, createResult.designId, {
            provider: 'photoroom',
            status: 'processing',
          })
          const enhanced = await executePhotoEnhancement(
            {
              assetId: `${createResult.designId}:${itemNumber}`,
              sourceImageUrl: stagedOriginal.signedUrl,
              output: {
                format: 'png',
                background: 'white',
              },
              operations: {
                removeBackground: true,
                relight: 'preserve-hue-and-saturation',
              },
              context: {
                repId: ctx.repId,
                traceId: ctx.runId,
              },
            },
            {
              provider: photoroomConfig,
            },
          )
          const outputMetadata = await analyzeServerImageQuality(
            enhanced.output.bytes,
          )
          const outputPreflight = assessJewelryPhotoPreflight({
            width: outputMetadata.width,
            height: outputMetadata.height,
            blurRisk: outputMetadata.blurRisk,
            lightingRisk: outputMetadata.lightingRisk,
            detailRisk: outputMetadata.detailRisk,
            backgroundDistractionRisk:
              outputMetadata.backgroundDistractionRisk,
            subjectCoverage: outputMetadata.subjectCoverage,
            subjectCentered: outputMetadata.subjectCentered,
          })
          const outputQa = decideCanonicalEnhancedPhoto({
            assetId: `${createResult.designId}:${itemNumber}`,
            provider: 'photoroom',
            sourcePreflight: photoPreflight,
            sourceAnalysis: sourcePhotoAnalysis,
            outputPreflight,
            outputAnalysis: {
              blurRisk: outputMetadata.blurRisk,
              lightingRisk: outputMetadata.lightingRisk,
              detailRisk: outputMetadata.detailRisk,
              backgroundDistractionRisk:
                outputMetadata.backgroundDistractionRisk,
              subjectCoverage: outputMetadata.subjectCoverage,
              subjectCentered: outputMetadata.subjectCentered,
            },
            sourceWidth: sourcePhotoWidth,
            sourceHeight: sourcePhotoHeight,
            outputWidth: outputMetadata.width,
            outputHeight: outputMetadata.height,
            contentType:
              outputMetadata.contentType ??
              enhanced.response.contentType ??
              'application/octet-stream',
          })

          if (outputQa.decision !== 'hold') {
            const enhancedPhotoUrl = await publishApprovedPhoto(
              createResult.designId,
              enhanced.output.bytes,
              {
                contentType: outputMetadata.contentType,
                filename: `${itemNumber}-enhanced`,
              },
            )
            if (outputQa.decision === 'promote_canonical') {
              await updateCanonicalPhoto(
                admin,
                createResult.designId,
                enhancedPhotoUrl,
              )
              await updatePhotoPipelineState(admin, createResult.designId, {
                provider: 'photoroom',
                enhancedUrl: enhancedPhotoUrl,
                status: 'published',
                qaDecision: outputQa.qaDecision,
                processedAt: new Date().toISOString(),
              })
            } else {
              await updatePhotoPipelineState(admin, createResult.designId, {
                provider: 'photoroom',
                enhancedUrl: enhancedPhotoUrl,
                status: 'qa_review',
                qaDecision: outputQa.qaDecision,
                processedAt: new Date().toISOString(),
              })
            }
          } else {
            await updatePhotoPipelineState(admin, createResult.designId, {
              provider: 'photoroom',
              status: 'rejected',
              qaDecision: outputQa.qaDecision,
              processedAt: new Date().toISOString(),
            })
          }
        }
      } catch (photoErr) {
        try {
          await updatePhotoPipelineState(admin, createResult.designId, {
            provider: 'photoroom',
            status: 'error',
            processedAt: new Date().toISOString(),
          })
        } catch {
          /* swallow - listing itself already succeeded */
        }
        try {
          await logIncident({
            errorType: 'photo_pipeline_failed',
            repId: ctx.repId,
            conversationId: ctx.conversationId,
            severity: 'warn',
            details: {
              toolName: 'add_listing',
              runId: ctx.runId,
              itemNumber,
              designId: createResult.designId,
              message: (photoErr as Error)?.message,
            },
          })
        } catch {
          /* swallow - observability must not affect outcome */
        }
      }
    }

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

  if (!designName) {
    if (!resolvedCatalogDesign) {
      try {
        resolvedCatalogDesign = await resolveItemNumber(
          admin,
          itemNumber,
          catalogVariantLookup(input),
        )
      } catch (err) {
        explainServiceError(err)
      }
    }
    await requireDuplicatePhysicalPieceConfirmationIfNeeded({
      admin,
      supabase: ctx.supabase,
      repId: ctx.repId,
      conversationId: ctx.conversationId,
      itemNumber,
      material: input.material,
      mainStone: input.mainStone,
      designId: resolvedCatalogDesign?.found
        ? resolvedCatalogDesign.design.id
        : undefined,
      activeTradeBoardWorkflow: activeWorkflow,
    })
  }

  let result: Awaited<ReturnType<typeof addListing>>
  let processedListingPhotoUrl: string | undefined = newDesignListingPhotoUrl
  const shouldUseCatalogCanonicalPhoto = shouldFallBackToCatalogCanonicalPhoto({
    listingPhotoUrl: input.listingPhotoUrl,
    hasWorkflowJewelryPhoto: hasUsableWorkflowJewelryPhoto(
      activeWorkflow?.photos,
      {
        selectedPhotoId: input.selectedPhotoId,
        modelIndex: input.listingPhotoIndex ?? input.piecePhotoIndex,
      },
    ),
    catalogHasCanonicalPhoto: Boolean(
      !designName &&
        resolvedCatalogDesign?.found &&
        resolvedCatalogDesign.hasCollection &&
        resolvedCatalogDesign.design.canonicalPhotoUrl,
    ),
    resolvedDesignId: resolvedCatalogDesign?.found
      ? resolvedCatalogDesign.design.id
      : null,
  })
  if (!createdNewDesign) {
    await markActiveTradeBoardWorkflowAdding({
      workflow: activeWorkflow,
      admin,
      toolInput: input,
      runId: ctx.runId,
    })
  }
  if (input.listingPhotoUrl || (!designName && !shouldUseCatalogCanonicalPhoto)) {
    processedListingPhotoUrl =
      (await processListingPhotoForAdd({
        listingPhotoUrl: input.listingPhotoUrl,
        listingPhotoIndex: input.listingPhotoIndex,
        selectedPhotoId: input.selectedPhotoId,
        itemNumber,
        designId: resolvedCatalogDesign?.found
          ? resolvedCatalogDesign.design.id
          : undefined,
        material: input.material,
        mainStone: input.mainStone,
        activeTradeBoardWorkflow: activeWorkflow,
        repId: ctx.repId,
        supabase: ctx.supabase,
        conversationId: ctx.conversationId,
        photoIndex: input.listingPhotoIndex ?? input.piecePhotoIndex,
        allowImplicitConversationPhoto:
          !designName && !useCatalogCanonicalFallback,
        mutationAssetKey: mutationIdentity.inputSignature,
      })) ?? processedListingPhotoUrl
  }
  try {
    result = await addCatalogListingMutation(admin, ctx.repId, {
      itemNumber,
      material: input.material,
      mainStone: input.mainStone,
      collectionName: input.collectionName,
      ringSize: input.ringSize,
      repNotes: input.repNotes,
      tradePreferences: input.tradePreferences,
      rarityClassification: resolveRarityClassification(input.rarityClassification, activeWorkflow),
      listingPhotoUrl: processedListingPhotoUrl,
      ...mutationIdentity,
    })
  } catch (err) {
    if (err instanceof ServiceError) {
      if (err.code === 'NEEDS_FULL_INFO') {
        return {
          needsAction: 'create_design' as const,
          itemNumber,
          requiredFields: ['designName', 'collectionName'],
          optionalFields: [
            'piecePhotoIndex',
            'listingPhotoIndex',
            'material',
            'mainStone',
            'bpMsrp',
            'collectionYear',
            'searchTags',
            'specialFeatures',
            'lengthInfo',
          ],
          message: `${itemNumber} isn't in the Sparkle Suite jewelry database yet. Use vision on the rep's photos to extract designName and any optional metadata you can read, and accept clear rep-provided details such as collectionName or collectionYear. Birthday collection names must include the year; if a box clearly shows a Birthday Collection month/year, normalize it to collectionName like "March Birthday 2026" and collectionYear like 2026. Boxed display photos with clear jewelry are acceptable as the jewelry-front photo. Do not treat label/details photos as bad jewelry photos. A label/details photo is only a label/details photo. Visible jewelry in that label/details photo does not satisfy the jewelry photo requirement. Do not ask for unboxed, no-packaging, or plain-background retakes. Do not ask for retakes without the box/card or on a plain surface. When multiple photos are attached, pass piecePhotoIndex or listingPhotoIndex using recent add-flow photo order for the jewelry-front photo instead of asking for another upload. The handler uploads the photo from chat automatically.`,
        }
      }
      if (err.code === 'NEEDS_COLLECTION') {
        return {
          needsAction: 'provide_collection' as const,
          code: 'NEEDS_COLLECTION' as const,
          itemNumber,
          requiredFields: ['collectionName'],
          message: `${itemNumber} is in our database but needs an exact collection name before I can list it. Ask the rep for the exact collection name, then retry with collectionName. Do not guess it from vision.`,
        }
      }
    }
    explainServiceError(err)
  }

  await markActiveTradeBoardWorkflowCompleted({
    workflow: activeWorkflow,
    admin,
    listingId: result.listingId,
    designId: result.designId,
    repId: ctx.repId,
    conversationId: ctx.conversationId,
    runId: ctx.runId,
  })
  await markActiveTradeSwapCleanupWorkflowCompleted({
    workflow: ctx.activeTradeWorkflow,
    admin,
    listingId: result.listingId,
    itemNumber: result.itemNumber,
    repId: ctx.repId,
    conversationId: ctx.conversationId,
    runId: ctx.runId,
  })

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
      quantityAvailable: result.quantityAvailable,
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
    quantityAvailable: result.quantityAvailable,
    groupedWithExisting: result.groupedWithExisting,
    createdNewDesign,
  }
}

async function runBatch(
  input: ToolInput,
  ctx: {
    repId: string
    conversationId: string
    runId: string
    supabase: SupabaseClient
    activeTradeBoardWorkflow?: ToolContext['activeTradeBoardWorkflow']
  },
  admin: SupabaseClient,
) {
  const { items } = input

  if (!items || items.length === 0) {
    throw new NicNacToolError({
      code: 'MISSING_ITEM_INPUT',
      userMessage: 'I need at least one item to add.',
    })
  }

  const processedItems: Parameters<typeof addListingBatch>[2]['items'] = []
  for (const [itemIndex, item] of items.entries()) {
    const mutationIdentity = catalogMutationIdentity({
      toolInput: {
        mode: 'single',
        ...item,
      },
      workflow: ctx.activeTradeBoardWorkflow,
      runId: ctx.runId,
      suffix: `batch:${itemIndex}`,
    })
    let listingPhotoUrl: string | undefined
    if (item.listingPhotoUrl) {
      try {
        listingPhotoUrl = (
          await processRepListingPhotoUrl({
            repId: ctx.repId,
            sourceImageUrl: item.listingPhotoUrl,
            filenameStem: `${item.itemNumber}-listing-photo`,
            mutationAssetKey: mutationIdentity.inputSignature,
          })
        ).photoUrl
      } catch (err) {
        explainServiceError(err)
      }
    }

    processedItems.push({
      itemNumber: item.itemNumber,
      material: item.material,
      mainStone: item.mainStone,
      ringSize: item.ringSize,
      repNotes: item.repNotes,
      tradePreferences: item.tradePreferences,
      listingPhotoUrl,
      rarityClassification: item.rarityClassification,
      ...mutationIdentity,
    })
  }

  let result: Awaited<ReturnType<typeof addListingBatch>>
  try {
    result = await addListingBatch(admin, ctx.repId, {
      items: processedItems,
    })
  } catch (err) {
    explainServiceError(err)
  }

  // Audit each successful add. Loop, not Promise.all — one audit failure
  // must not cascade to siblings, and each call is already isolated.
  const recoveredNewDesignAdds: Array<{
    listingId: string
    itemNumber: string
    designName: string
    status: string
  }> = []
  if (result.pending.needFullInfo.length > 0) {
    const pendingByItem = new Set(
      result.pending.needFullInfo.map((p) => p.itemNumber),
    )
    const recoveredItemNumbers = new Set<string>()
    const retryItems: typeof processedItems = []

    for (const itemNumber of pendingByItem) {
      const candidates = items.filter((item) => item.itemNumber === itemNumber)
      const recoveryItem = candidates.find(
        (item) => item.designName?.trim() && item.collectionName?.trim(),
      )
      if (!recoveryItem) continue

      const firstResult = await runSingle(
        {
          mode: 'single',
          itemNumber: recoveryItem.itemNumber,
          ringSize: recoveryItem.ringSize,
          repNotes: recoveryItem.repNotes,
          tradePreferences: recoveryItem.tradePreferences,
          listingPhotoUrl: recoveryItem.listingPhotoUrl,
          listingPhotoIndex: recoveryItem.listingPhotoIndex,
          selectedPhotoId: recoveryItem.selectedPhotoId,
          rarityClassification: recoveryItem.rarityClassification,
          designName: recoveryItem.designName,
          piecePhotoUrl: recoveryItem.piecePhotoUrl,
          piecePhotoIndex: recoveryItem.piecePhotoIndex,
          material: recoveryItem.material,
          mainStone: recoveryItem.mainStone,
          bpMsrp: recoveryItem.bpMsrp,
          collectionName: recoveryItem.collectionName,
          specialFeatures: recoveryItem.specialFeatures,
          lengthInfo: recoveryItem.lengthInfo,
        },
        {
          ...ctx,
          mutationSuffix: `batch:${items.indexOf(recoveryItem)}`,
        },
        admin,
      )

      if (typeof firstResult.listingId === 'string') {
        recoveredNewDesignAdds.push({
          listingId: firstResult.listingId,
          itemNumber: firstResult.itemNumber ?? recoveryItem.itemNumber,
          designName:
            'designName' in firstResult
              ? firstResult.designName
              : (recoveryItem.designName ?? ''),
          status: firstResult.status ?? 'available',
        })
        recoveredItemNumbers.add(itemNumber)
        retryItems.push(
          ...candidates.slice(1).map((item) => ({
            itemNumber: item.itemNumber,
            material: item.material,
            mainStone: item.mainStone,
            ringSize: item.ringSize,
            repNotes: item.repNotes,
            tradePreferences: item.tradePreferences,
            listingPhotoUrl: undefined,
            ...catalogMutationIdentity({
              toolInput: { mode: 'single', ...item },
              workflow: ctx.activeTradeBoardWorkflow,
              runId: ctx.runId,
              suffix: `batch:${items.indexOf(item)}`,
            }),
          })),
        )
      }
    }

    if (retryItems.length > 0) {
      let retryResult: Awaited<ReturnType<typeof addListingBatch>>
      try {
        retryResult = await addListingBatch(admin, ctx.repId, {
          items: retryItems,
        })
      } catch (err) {
        explainServiceError(err)
      }
      result = {
        added: [...result.added, ...retryResult.added],
        pending: {
          needCollection: [
            ...result.pending.needCollection,
            ...retryResult.pending.needCollection,
          ],
          needFullInfo: [
            ...result.pending.needFullInfo.filter(
              (p) => !recoveredItemNumbers.has(p.itemNumber),
            ),
            ...retryResult.pending.needFullInfo,
          ],
        },
      }
    } else if (recoveredItemNumbers.size > 0) {
      result = {
        ...result,
        pending: {
          ...result.pending,
          needFullInfo: result.pending.needFullInfo.filter(
            (p) => !recoveredItemNumbers.has(p.itemNumber),
          ),
        },
      }
    }
  }

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
    added: [
      ...recoveredNewDesignAdds,
      ...result.added.map((r) => ({
        listingId: r.listingId,
        itemNumber: r.itemNumber,
        designName: r.designName,
        status: r.status,
      })),
    ],
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
      addedCount: recoveredNewDesignAdds.length + result.added.length,
      needCollectionCount: result.pending.needCollection.length,
      needFullInfoCount: result.pending.needFullInfo.length,
      note: 'Already-listed item numbers are physical inventory; each added unit gets its own Dance Floor listing.',
    },
  }
}

export function makeAddListingTool(ctx: {
  repId: string
  supabase: SupabaseClient
  conversationId: string
  runId: string
  activeTradeBoardWorkflow?: ToolContext['activeTradeBoardWorkflow']
  activeTradeWorkflow?: ToolContext['activeTradeWorkflow']
}) {
  return tool({
    description:
      "Put one or more dancers on the authenticated rep's Dance Floor. Supports one dancer or several at once. " +
      "Three entry paths are supported: item number, label photo, or item number + label photo. When photos are attached to the conversation, extract the item number and supporting fields from the reveal box via vision before calling — don't ask the rep to type fields you can read off the photo. " +
      "For rings (RG item numbers), capture ringSize before saving. Ring size is usually printed on the box instead of the label; if you cannot read it from a box/details photo, ask the rep for the ring size. " +
      "If the resolved item exists in the jewelry database, pass mode:'single' and itemNumber for one piece, or mode:'batch' and items[] for several pieces at once. " +
      "Every dancer requires the rep's explicit answer to: 'Is this piece a diamond or unicorn?' Pass rarityClassification:'standard' for No, 'diamond' for Diamond, or 'unicorn' for Unicorn. Never infer rarity from a name, description, stone, tag, price, or the word diamond. " +
      "Order does not matter; use photos and facts in whatever order the rep provides them. Only block on unreadable item details or a genuinely unusable jewelry image. Accept clear rep-provided collection, name, stone, material, MSRP, and ring size instead of requiring proof photos. " +
      "Label, box, and back-of-card photos can provide details; the saved listing/canonical image must show the jewelry clearly. Boxed display photos for earrings, rings, necklaces, and similar pieces count as jewelry-front photos when the jewelry is centered, close, and clear, even with Bomb Party packaging visible. Do not treat label/details photos as bad jewelry photos; a label/details photo is only a label/details photo, and visible jewelry in that label/details photo does not satisfy the jewelry photo requirement. If the only uploaded image is a label/details or back-of-card photo, ask for the first customer-facing jewelry photo. Do not ask for unboxed, no-packaging, or plain-background retakes. Do not ask for retakes without the box/card or on a plain surface. Select the app-owned workflow photo with selectedPhotoId when available; otherwise use listingPhotoIndex or piecePhotoIndex. Never copy or reuse a raw photo URL from another piece. Ask for another photo only when you cannot tell which attached image is the jewelry-front photo. " +
      "If the item isn't in the Sparkle Suite jewelry database, the tool returns needsAction:'create_design'. Use vision to extract designName and readable metadata, and use clear rep-provided fields. Birthday collection names must include the year. For Birthday boxes like 'Birthday Collection March 2026', use collectionName:'March Birthday 2026' and collectionYear:2026 when clear. The handler uploads the photo from chat automatically. " +
      "If the item exists but has no collection assigned, the tool returns needsAction:'provide_collection' (NEEDS_COLLECTION). Ask the rep for the exact collection name, then retry with collectionName. Do not guess it from vision. " +
      "If an item number is already on the rep's board, treat that as physical inventory, not a catalog duplicate: confirm whether this is an identical additional physical piece. After confirmation, add it to the same dancer and report the updated quantity available; a different material, main stone/color, size, photo, note, or trade preference remains a separate dancer. The same item number can ship as different finish or stone — those are separate listings and must keep their own jewelry-front photo. Never reuse one listing's photo across another listing just because the item numbers match. " +
      "Batch mode sorts results into ready adds plus pending needCollection and needFullInfo buckets.",
    inputSchema,
    execute: async (input) => {
      const admin = createAdminClient()

      if (input.mode === 'single') {
        return await runSingle(input, ctx, admin)
      }
      if (await shouldCollapseRepeatedBatchToSingle(input, ctx)) {
        const firstItem = input.items?.[0]
        return await runSingle(
          {
            ...firstItem,
            mode: 'single',
            itemNumber: firstItem?.itemNumber,
          },
          ctx,
          admin,
        )
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
      activeTradeBoardWorkflow: ctx.activeTradeBoardWorkflow,
      activeTradeWorkflow: ctx.activeTradeWorkflow,
    }),
}
