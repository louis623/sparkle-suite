import { createHash } from 'node:crypto'

import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'

import {
  normalizeItemNumber,
  normalizeJewelryMainStoneKey,
  normalizeJewelryMaterialKey,
  resolveItemNumber,
  resolveJewelryTypeFromItemNumber,
} from '@/lib/services/jewelry-database'
import type { JewelryType } from '@/lib/services/types'

export const SPARKLE_FINDER_STUDIO_SCHEMA_VERSION = 2 as const
export const MAX_SPARKLE_FINDER_STUDIO_CANDIDATES = 50

type FinderJewelryType = 'ring' | 'necklace' | 'earrings' | 'stack' | 'bracelet'

export type SparkleFinderStudioCandidate = {
  designId: string
  itemNumber: string
  designName: string
  material: string | null
  mainStone: string | null
  jewelryType: FinderJewelryType
  collectionName: string | null
  collectionYear: number | null
  canonicalPhotoUrl: string | null
  description: null
}

export type SparkleFinderStudioCatalogDraft = {
  itemNumber: string
  designName?: string
  collectionName?: string
  collectionYear?: number
  jewelryType?: string
  mainStone?: string
  material?: string
  bpLabel?: string
}

export type SparkleFinderStudioReviewReceipt = {
  status: 'review_completed'
  reviewedAt: string
  canonicalPhotoControl: 'not_applicable' | 'not_automatically_verified'
}

export type SparkleFinderStudioReviewQueueItem = {
  finderSubmissionId: string
  submittedAt: string
  updatedAt: string
  catalogDraft: SparkleFinderStudioCatalogDraft
  photoEvidence: {
    trust: 'untrusted_manual_review'
    canonicalPhotoEligible: false
    assets: Array<{
      finderAssetId: string
      claimedKind: 'label' | 'jewelry'
    }>
  }
}

export type SparkleFinderStudioIntakeV2Result =
  | {
      schemaVersion: 2
      ok: true
      status: 'needs_variant_confirmation'
      retryable: false
      mutationReplayed: boolean
      variantCandidates: SparkleFinderStudioCandidate[]
    }
  | {
      schemaVersion: 2
      ok: true
      status: 'accepted'
      retryable: false
      mutationReplayed: boolean
      suiteDesignId: string
      resolvedDesign: SparkleFinderStudioCandidate
      reviewReceipt?: SparkleFinderStudioReviewReceipt
    }
  | {
      schemaVersion: 2
      ok: true
      status: 'publish_queued'
      retryable: false
      mutationReplayed: boolean
      catalogDraft: SparkleFinderStudioCatalogDraft
    }
  | {
      schemaVersion: 2
      ok: false
      status:
        | 'invalid_details'
        | 'invalid_selection'
        | 'photo_rejected'
        | 'storage_failed'
        | 'database_failed'
        | 'temporary_failure'
        | 'conflicting_replay'
      retryable: boolean
      errorCode: string
      customerMessage: string
      photoFeedback?: string[]
    }

export type SparkleFinderStudioEvidenceReview =
  | { status: 'manual_review_required' }
  | { status: 'suite_validated' }
  | { status: 'photo_rejected'; errorCode: string; customerMessage: string; photoFeedback?: string[] }
  | { status: 'storage_failed'; errorCode: string; customerMessage: string; retryable: boolean }

type StudioResolveRequest = z.infer<typeof resolveRequestSchema>
type StudioConfirmRequest = z.infer<typeof confirmRequestSchema>
type StudioResumeRequest = z.infer<typeof resumeRequestSchema>
type StudioRequest = StudioResolveRequest | StudioConfirmRequest | StudioResumeRequest

export type StudioLedgerClaim =
  | {
      kind: 'claimed'
      action: 'resolve'
      operationToken: string
    }
  | {
      kind: 'claimed'
      action: 'confirm'
      operationToken: string
      resolveResult: SparkleFinderStudioIntakeV2Result
    }
  | { kind: 'replay'; result: SparkleFinderStudioIntakeV2Result }
  | { kind: 'conflict' }
  | { kind: 'invalid_selection' }
  | { kind: 'in_progress' }
  | { kind: 'missing' }

export type StudioLedgerClaimInput = {
  action: StudioRequest['action']
  finderSubmissionId: string
  resolveFingerprint?: string
  resolveInput?: Record<string, unknown>
  selectedDesignId?: string
}

export type StudioLedgerCompleteInput = {
  action: 'resolve' | 'confirm'
  finderSubmissionId: string
  operationToken: string
  result: SparkleFinderStudioIntakeV2Result
  candidateIds?: string[]
}

type ExactResolveResult =
  | { found: false; itemNumber: string }
  | {
      found: true
      design: {
        id: string
        itemNumber: string
        designName: string
        material: string | null
        mainStone: string | null
        typePrefix: JewelryType
        collectionName: string | null
        collectionYear: number | null
        canonicalPhotoUrl: string | null
      }
    }

export type SparkleFinderStudioIntakeV2Deps = {
  supabase: SupabaseClient
  allowedAssetOrigins?: string[]
  claim?: (input: StudioLedgerClaimInput) => Promise<StudioLedgerClaim>
  complete?: (input: StudioLedgerCompleteInput) => Promise<void>
  reviewEvidence?: (input: {
    finderSubmissionId: string
    assets: Array<{
      finderAssetId: string
      claimedKind: 'label' | 'jewelry'
      temporaryReadUrl?: string
    }>
  }) => Promise<SparkleFinderStudioEvidenceReview>
  loadCandidates?: (
    supabase: SupabaseClient,
    itemNumber: string,
  ) => Promise<SparkleFinderStudioCandidate[]>
  resolveExact?: (
    supabase: SupabaseClient,
    itemNumber: string,
    options: { designId: string; material?: string | null; mainStone?: string | null },
  ) => Promise<ExactResolveResult>
}

const commonRequestShape = {
  schemaVersion: z.literal(SPARKLE_FINDER_STUDIO_SCHEMA_VERSION),
  sourceProduct: z.literal('sparkle_finder'),
  finderSubmissionId: z.string().uuid(),
}

const labelDetailsSchema = z.object({
  bpLabel: z.string().trim().min(1).max(40).optional(),
  collectionName: z.string().trim().min(1).max(120).optional(),
  collectionYear: z.number().int().min(1900).max(2100).optional(),
  designName: z.string().trim().min(1).max(160).optional(),
  itemNumber: z.string().trim().min(1).max(80),
  jewelryType: z.string().trim().min(1).max(40).optional(),
  mainStone: z.string().trim().min(1).max(120).optional(),
  material: z.string().trim().min(1).max(120).optional(),
}).strict()

const photoEvidenceSchema = z.object({
  finderSubmissionId: z.string().uuid(),
  finderAssetId: z.string().uuid(),
  claimedKind: z.enum(['label', 'jewelry']),
  temporaryReadUrl: z.string().url().max(2_000).optional(),
}).strict()

const resolveRequestSchema = z.object({
  ...commonRequestShape,
  action: z.literal('resolve'),
  labelDetails: labelDetailsSchema,
  customerNote: z.string().trim().max(500).optional(),
  photoEvidence: z.array(photoEvidenceSchema).length(2),
}).strict()

const confirmRequestSchema = z.object({
  ...commonRequestShape,
  action: z.literal('confirm'),
  selectedDesignId: z.string().uuid(),
}).strict()

const resumeRequestSchema = z.object({
  ...commonRequestShape,
  action: z.literal('resume'),
}).strict()

const requestSchema = z.discriminatedUnion('action', [
  resolveRequestSchema,
  confirmRequestSchema,
  resumeRequestSchema,
])

const storedCandidateSchema = z.object({
  designId: z.string().uuid(),
  itemNumber: z.string().min(1).max(80),
  designName: z.string().min(1).max(160),
  material: z.string().nullable(),
  mainStone: z.string().nullable(),
  jewelryType: z.enum(['ring', 'necklace', 'earrings', 'stack', 'bracelet']),
  collectionName: z.string().nullable(),
  collectionYear: z.number().int().nullable(),
  canonicalPhotoUrl: z.string().nullable(),
  description: z.null(),
}).strict()

const storedCatalogDraftSchema = labelDetailsSchema

const storedReviewReceiptSchema = z.object({
  status: z.literal('review_completed'),
  reviewedAt: z.string().datetime({ offset: true }),
  canonicalPhotoControl: z.enum([
    'not_applicable',
    'not_automatically_verified',
  ]),
}).strict()

const storedReviewInputSchema = z.object({
  labelDetails: labelDetailsSchema,
  photoEvidence: z.object({
    trust: z.literal('untrusted_manual_review'),
    canonicalPhotoEligible: z.literal(false),
    reviewMode: z.literal('manual_review'),
    assets: z.array(z.object({
      finderSubmissionId: z.string().uuid(),
      finderAssetId: z.string().uuid(),
      claimedKind: z.enum(['label', 'jewelry']),
    }).strict()).length(2),
  }).strict(),
  customerNoteHash: z.string().regex(/^[0-9a-f]{64}$/).nullable(),
}).strict()

const storedResultSchema = z.discriminatedUnion('status', [
  z.object({
    schemaVersion: z.literal(2),
    ok: z.literal(true),
    status: z.literal('needs_variant_confirmation'),
    retryable: z.literal(false),
    mutationReplayed: z.boolean(),
    variantCandidates: z.array(storedCandidateSchema).min(1).max(MAX_SPARKLE_FINDER_STUDIO_CANDIDATES),
  }).strict(),
  z.object({
    schemaVersion: z.literal(2),
    ok: z.literal(true),
    status: z.literal('accepted'),
    retryable: z.literal(false),
    mutationReplayed: z.boolean(),
    suiteDesignId: z.string().uuid(),
    resolvedDesign: storedCandidateSchema,
    reviewReceipt: storedReviewReceiptSchema.optional(),
  }).strict().refine((result) => result.suiteDesignId === result.resolvedDesign.designId),
  z.object({
    schemaVersion: z.literal(2),
    ok: z.literal(true),
    status: z.literal('publish_queued'),
    retryable: z.literal(false),
    mutationReplayed: z.boolean(),
    catalogDraft: storedCatalogDraftSchema,
  }).strict(),
  z.object({
    schemaVersion: z.literal(2),
    ok: z.literal(false),
    status: z.enum([
      'invalid_details',
      'invalid_selection',
      'photo_rejected',
      'storage_failed',
      'database_failed',
      'temporary_failure',
      'conflicting_replay',
    ]),
    retryable: z.boolean(),
    errorCode: z.string().min(1).max(160),
    customerMessage: z.string().min(1).max(500),
    photoFeedback: z.array(z.string().min(1).max(500)).max(10).optional(),
  }).strict(),
])

const TYPE_MAP: Record<JewelryType, FinderJewelryType> = {
  RG: 'ring',
  NK: 'necklace',
  ER: 'earrings',
  ST: 'stack',
  BR: 'bracelet',
}

export async function processSparkleFinderStudioIntakeV2(
  rawRequest: unknown,
  deps: SparkleFinderStudioIntakeV2Deps,
): Promise<SparkleFinderStudioIntakeV2Result> {
  const parsed = requestSchema.safeParse(rawRequest)
  if (!parsed.success) {
    return failure(
      'invalid_details',
      false,
      'invalid_request',
      'Showcase Studio received invalid or incomplete intake details.',
    )
  }

  const request = parsed.data
  const claim = deps.claim ?? ((input) => claimStudioLedger(deps.supabase, input))
  const complete = deps.complete ?? ((input) => completeStudioLedger(deps.supabase, input))

  if (request.action === 'resolve') {
    const evidenceError = validatePhotoEvidence(
      request,
      deps.allowedAssetOrigins ?? readAllowedAssetOrigins(),
    )
    if (evidenceError) return evidenceError
  }

  const normalizedResolve = request.action === 'resolve'
    ? normalizeResolveRequest(request)
    : null

  let claimResult: StudioLedgerClaim
  try {
    claimResult = await claim({
      action: request.action,
      finderSubmissionId: request.finderSubmissionId,
      ...(normalizedResolve
        ? {
            resolveFingerprint: fingerprint(normalizedResolve.fingerprintInput),
            resolveInput: normalizedResolve.persistedInput,
          }
        : {}),
      ...(request.action === 'confirm' ? { selectedDesignId: request.selectedDesignId } : {}),
    })
  } catch {
    return databaseFailure()
  }

  const earlyResult = resultForClaimDecision(claimResult)
  if (earlyResult) return earlyResult

  if (claimResult.kind !== 'claimed') {
    return failure(
      'temporary_failure',
      true,
      'intake_claim_unavailable',
      'Showcase Studio could not continue this step right now. Please try again.',
    )
  }

  try {
    if (request.action === 'resolve' && normalizedResolve && claimResult.action === 'resolve') {
      const evidenceFailure = await reviewClaimedPhotoEvidence(request, deps)
      if (evidenceFailure) {
        return await storeResult(complete, {
          action: 'resolve',
          finderSubmissionId: request.finderSubmissionId,
          operationToken: claimResult.operationToken,
          result: evidenceFailure,
        })
      }
      const result = await resolveStudioIntake(normalizedResolve.labelDetails, deps)
      return await storeResult(complete, {
        action: 'resolve',
        finderSubmissionId: request.finderSubmissionId,
        operationToken: claimResult.operationToken,
        result,
        ...(result.ok && result.status === 'needs_variant_confirmation'
          ? { candidateIds: result.variantCandidates.map((candidate) => candidate.designId) }
          : {}),
      })
    }

    if (request.action === 'confirm' && claimResult.action === 'confirm') {
      const result = await confirmStudioCandidate(
        request.selectedDesignId,
        claimResult.resolveResult,
        deps,
      )
      return await storeResult(complete, {
        action: 'confirm',
        finderSubmissionId: request.finderSubmissionId,
        operationToken: claimResult.operationToken,
        result,
      })
    }

    return failure(
      'temporary_failure',
      true,
      'intake_stage_mismatch',
      'Showcase Studio could not continue this step right now. Please try again.',
    )
  } catch {
    const result = databaseFailure()
    if (claimResult.action === 'resolve' || claimResult.action === 'confirm') {
      try {
        await complete({
          action: claimResult.action,
          finderSubmissionId: request.finderSubmissionId,
          operationToken: claimResult.operationToken,
          result,
        })
      } catch {
        // A lost completion response may still have committed the prior result.
        // The next same-key request will replay that durable receipt.
      }
    }
    return result
  }
}

async function resolveStudioIntake(
  labelDetails: SparkleFinderStudioCatalogDraft,
  deps: SparkleFinderStudioIntakeV2Deps,
): Promise<SparkleFinderStudioIntakeV2Result> {
  const itemNumber = labelDetails.itemNumber
  if (!isRecognizedItemNumber(itemNumber)) {
    return failure(
      'invalid_details',
      false,
      'invalid_item_number',
      'Showcase Studio could not recognize that Bomb Party item number.',
    )
  }
  const loadCandidates = deps.loadCandidates ?? loadStudioCandidates
  const candidates = (await loadCandidates(deps.supabase, itemNumber))
    .slice()
    .sort((left, right) => left.designId.localeCompare(right.designId))

  if (candidates.length > MAX_SPARKLE_FINDER_STUDIO_CANDIDATES) {
    return failure(
      'temporary_failure',
      false,
      'candidate_set_too_large',
      'Showcase Studio found too many exact variants to confirm safely. Support can review this item.',
    )
  }

  if (candidates.length === 0) {
    if (!labelDetails.designName) {
      return failure(
        'invalid_details',
        false,
        'missing_design_name',
        'Showcase Studio needs the design name from the original label before review.',
      )
    }

    // The ledger is the durable review queue. Finder evidence never creates a
    // catalog row or supplies a canonical Suite photo directly.
    return {
      schemaVersion: 2,
      ok: true,
      status: 'publish_queued',
      retryable: false,
      mutationReplayed: false,
      catalogDraft: labelDetails,
    }
  }

  const requestedMaterial = normalizeJewelryMaterialKey(labelDetails.material)
  const requestedMainStone = normalizeJewelryMainStoneKey(labelDetails.mainStone)
  const filtered = candidates.filter(
    (candidate) =>
      (!requestedMaterial || normalizeJewelryMaterialKey(candidate.material) === requestedMaterial) &&
      (!requestedMainStone || normalizeJewelryMainStoneKey(candidate.mainStone) === requestedMainStone),
  )

  if ((requestedMaterial || requestedMainStone) && filtered.length === 0) {
    return failure(
      'invalid_details',
      false,
      'variant_evidence_mismatch',
      'Those stone or material details do not match an exact Suite catalog variant.',
    )
  }

  const eligible = requestedMaterial || requestedMainStone ? filtered : candidates
  if (eligible.length === 1) return accepted(eligible[0])

  return {
    schemaVersion: 2,
    ok: true,
    status: 'needs_variant_confirmation',
    retryable: false,
    mutationReplayed: false,
    variantCandidates: eligible,
  }
}

async function confirmStudioCandidate(
  selectedDesignId: string,
  resolveResult: SparkleFinderStudioIntakeV2Result,
  deps: SparkleFinderStudioIntakeV2Deps,
): Promise<SparkleFinderStudioIntakeV2Result> {
  if (!resolveResult.ok || resolveResult.status !== 'needs_variant_confirmation') {
    return invalidSelection('confirmation_stage_invalid')
  }

  const selected = resolveResult.variantCandidates.find(
    (candidate) => candidate.designId === selectedDesignId,
  )
  if (!selected) return invalidSelection('selection_not_offered')

  const resolveExact = deps.resolveExact ?? (async (supabase, itemNumber, options) => {
    const resolved = await resolveItemNumber(supabase, itemNumber, options)
    if (!resolved.found) return { found: false as const, itemNumber: resolved.itemNumber }
    return {
      found: true as const,
      design: {
        id: resolved.design.id,
        itemNumber: resolved.design.itemNumber,
        designName: resolved.design.designName,
        material: resolved.design.material,
        mainStone: resolved.design.mainStone,
        typePrefix: resolved.design.typePrefix,
        collectionName: resolved.design.collectionName,
        collectionYear: resolved.design.collectionYear,
        canonicalPhotoUrl: resolved.design.canonicalPhotoUrl,
      },
    }
  })
  const live = await resolveExact(deps.supabase, selected.itemNumber, {
    designId: selected.designId,
    material: selected.material,
    mainStone: selected.mainStone,
  })

  if (!live.found) return invalidSelection('selected_design_changed')
  const liveCandidate = mapExactDesign(live.design)
  if (!sameCandidateFacts(selected, liveCandidate)) {
    return invalidSelection('selected_design_changed')
  }

  return accepted(liveCandidate)
}

function normalizeResolveRequest(request: StudioResolveRequest) {
  const labelDetails = compactObject({
    bpLabel: request.labelDetails.bpLabel?.trim(),
    collectionName: request.labelDetails.collectionName?.trim(),
    collectionYear: request.labelDetails.collectionYear,
    designName: request.labelDetails.designName?.trim(),
    itemNumber: normalizeItemNumber(request.labelDetails.itemNumber),
    jewelryType: request.labelDetails.jewelryType?.trim(),
    mainStone: request.labelDetails.mainStone?.trim(),
    material: request.labelDetails.material?.trim(),
  }) as SparkleFinderStudioCatalogDraft
  const photoEvidence = {
    trust: 'untrusted_manual_review',
    canonicalPhotoEligible: false,
    reviewMode: 'manual_review',
    assets: request.photoEvidence
      .map((asset) => ({
        finderSubmissionId: asset.finderSubmissionId,
        finderAssetId: asset.finderAssetId,
        claimedKind: asset.claimedKind,
      }))
      .sort((left, right) => left.claimedKind.localeCompare(right.claimedKind)),
  }
  const noteHash = request.customerNote
    ? createHash('sha256').update(request.customerNote.trim()).digest('hex')
    : null

  return {
    labelDetails,
    persistedInput: {
      labelDetails,
      photoEvidence,
      customerNoteHash: noteHash,
    },
    fingerprintInput: {
      labelDetails,
      photoEvidence,
      customerNoteHash: noteHash,
    },
  }
}

async function reviewClaimedPhotoEvidence(
  request: StudioResolveRequest,
  deps: SparkleFinderStudioIntakeV2Deps,
): Promise<SparkleFinderStudioIntakeV2Result | null> {
  if (!deps.reviewEvidence) return null
  let review: SparkleFinderStudioEvidenceReview
  try {
    review = await deps.reviewEvidence({
      finderSubmissionId: request.finderSubmissionId,
      assets: request.photoEvidence.map((asset) => ({
        finderAssetId: asset.finderAssetId,
        claimedKind: asset.claimedKind,
        ...(asset.temporaryReadUrl ? { temporaryReadUrl: asset.temporaryReadUrl } : {}),
      })),
    })
  } catch {
    return failure(
      'storage_failed',
      true,
      'evidence_storage_unavailable',
      'Showcase Studio could not verify the submitted photos right now. Please try again.',
    )
  }
  if (review.status === 'photo_rejected') {
    return failure(
      'photo_rejected',
      false,
      review.errorCode,
      review.customerMessage,
      review.photoFeedback,
    )
  }
  if (review.status === 'storage_failed') {
    return failure(
      'storage_failed',
      review.retryable,
      review.errorCode,
      review.customerMessage,
    )
  }
  return null
}

function validatePhotoEvidence(
  request: StudioResolveRequest,
  allowedOrigins: string[],
): SparkleFinderStudioIntakeV2Result | null {
  const kinds = new Set(request.photoEvidence.map((asset) => asset.claimedKind))
  if (kinds.size !== 2 || !kinds.has('label') || !kinds.has('jewelry')) {
    return failure(
      'invalid_details',
      false,
      'invalid_photo_evidence',
      'Showcase Studio needs one original-label photo and one jewelry photo.',
    )
  }
  if (request.photoEvidence.some((asset) => asset.finderSubmissionId !== request.finderSubmissionId)) {
    return failure(
      'invalid_details',
      false,
      'photo_identity_mismatch',
      'One or more Studio photos do not belong to this submission.',
    )
  }
  if (new Set(request.photoEvidence.map((asset) => asset.finderAssetId)).size !== 2) {
    return failure(
      'invalid_details',
      false,
      'invalid_photo_evidence',
      'Showcase Studio needs two distinct photo assets.',
    )
  }

  const normalizedOrigins = new Set(
    allowedOrigins.flatMap((origin) => {
      try {
        const url = new URL(origin)
        return url.protocol === 'https:' ? [url.origin] : []
      } catch {
        return []
      }
    }),
  )
  for (const asset of request.photoEvidence) {
    if (!asset.temporaryReadUrl) continue
    const url = new URL(asset.temporaryReadUrl)
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.hash ||
      !normalizedOrigins.has(url.origin)
    ) {
      return failure(
        'photo_rejected',
        false,
        'unsafe_photo_url',
        'Showcase Studio rejected an unsafe temporary photo link.',
        ['Use only the temporary HTTPS asset link issued for this Finder submission.'],
      )
    }
  }

  return null
}

export async function loadStudioCandidates(
  supabase: SupabaseClient,
  itemNumber: string,
): Promise<SparkleFinderStudioCandidate[]> {
  const { data, error } = await supabase
    .from('jewelry_designs')
    .select(
      'id, item_number, design_name, material, main_stone, canonical_photo_url, type_prefix, collection:collections(name, collection_year)',
    )
    .eq('item_number', normalizeItemNumber(itemNumber))
    .order('id', { ascending: true })
    .limit(MAX_SPARKLE_FINDER_STUDIO_CANDIDATES + 1)
  if (error) throw error

  return ((data ?? []) as unknown as StudioDesignRow[]).map(mapStudioDesignRow)
}

/**
 * Service-role review transition for a queued intake. This is intentionally
 * not exposed from the Finder HTTP route. The database builds the receipt
 * from the live Suite catalog so Finder evidence and candidate facts are
 * never publication authority.
 */
export async function finalizeSparkleFinderStudioReviewV2(options: {
  supabase: SupabaseClient
  finderSubmissionId: string
  suiteDesignId: string
  reviewerEmail: string
  reviewerRepId: string
  reviewNote?: string
}): Promise<SparkleFinderStudioIntakeV2Result> {
  try {
    const { data, error } = await options.supabase.rpc('rpc_finalize_finder_studio_review_v2', {
      p_finder_submission_id: options.finderSubmissionId,
      p_suite_design_id: options.suiteDesignId,
      p_reviewed_by_email: options.reviewerEmail,
      p_reviewed_by_rep_id: options.reviewerRepId,
      p_review_note: options.reviewNote?.trim() || null,
    })
    if (error) return databaseFailure()
    if (!data || typeof data !== 'object' || Array.isArray(data)) return databaseFailure()
    const record = data as Record<string, unknown>
    const result = parseStoredStudioResult(record.result)
    if ((record.decision === 'finalized' || record.decision === 'replay') && result) {
      if (!result.ok || result.status !== 'accepted' || !result.reviewReceipt) {
        return databaseFailure()
      }
      return record.decision === 'replay'
        ? { ...result, mutationReplayed: true }
        : result
    }
    if (record.decision === 'conflict') {
      return failure(
        'conflicting_replay',
        false,
        'review_already_finalized_differently',
        'This Studio review was already finalized with a different exact Suite design.',
      )
    }
    if (record.decision === 'missing') {
      return invalidSelection('submission_not_resolved')
    }
    if (record.decision === 'invalid_stage') {
      return invalidSelection('review_stage_invalid')
    }
    if (record.decision === 'invalid_selection') {
      return invalidSelection('review_design_not_exact')
    }
    return databaseFailure()
  } catch {
    return databaseFailure()
  }
}

export async function listSparkleFinderStudioReviewQueue(options: {
  supabase: SupabaseClient
  limit?: number
}): Promise<{ items: SparkleFinderStudioReviewQueueItem[]; hasMore: boolean }> {
  const limit = Math.min(Math.max(options.limit ?? 25, 1), 50)
  const { data, error } = await options.supabase
    .from('finder_studio_intake_v2')
    .select(
      'finder_submission_id, resolve_input, resolve_result, created_at, updated_at',
    )
    .eq('stage', 'publish_queued')
    .is('review_result', null)
    .order('created_at', { ascending: true })
    .order('finder_submission_id', { ascending: true })
    .limit(limit + 1)
  if (error) throw error

  const rows = (data ?? []) as Array<{
    finder_submission_id: string
    resolve_input: unknown
    resolve_result: unknown
    created_at: string
    updated_at: string
  }>
  const items = rows.slice(0, limit).map(mapStudioReviewQueueRow)
  return { items, hasMore: rows.length > limit }
}

export function mapStudioReviewQueueRow(row: {
  finder_submission_id: string
  resolve_input: unknown
  resolve_result: unknown
  created_at: string
  updated_at: string
}): SparkleFinderStudioReviewQueueItem {
  const submissionId = z.string().uuid().parse(row.finder_submission_id)
  const input = storedReviewInputSchema.parse(row.resolve_input)
  const result = storedResultSchema.parse(row.resolve_result)
  if (!result.ok || result.status !== 'publish_queued') {
    throw new Error('Studio review queue contains an invalid queued result.')
  }
  if (input.photoEvidence.assets.some(
    (asset) => asset.finderSubmissionId !== submissionId,
  )) {
    throw new Error('Studio review queue contains mismatched evidence identity.')
  }

  return {
    finderSubmissionId: submissionId,
    submittedAt: z.string().datetime({ offset: true }).parse(row.created_at),
    updatedAt: z.string().datetime({ offset: true }).parse(row.updated_at),
    catalogDraft: result.catalogDraft,
    photoEvidence: {
      trust: 'untrusted_manual_review',
      canonicalPhotoEligible: false,
      assets: input.photoEvidence.assets.map((asset) => ({
        finderAssetId: asset.finderAssetId,
        claimedKind: asset.claimedKind,
      })),
    },
  }
}

async function claimStudioLedger(
  supabase: SupabaseClient,
  input: StudioLedgerClaimInput,
): Promise<StudioLedgerClaim> {
  const { data, error } = await supabase.rpc('rpc_claim_finder_studio_intake_v2', {
    p_finder_submission_id: input.finderSubmissionId,
    p_action: input.action,
    p_resolve_fingerprint: input.resolveFingerprint ?? null,
    p_resolve_input: input.resolveInput ?? null,
    p_selected_design_id: input.selectedDesignId ?? null,
  })
  if (error) throw error
  return parseLedgerClaim(data)
}

async function completeStudioLedger(
  supabase: SupabaseClient,
  input: StudioLedgerCompleteInput,
): Promise<void> {
  const { data, error } = await supabase.rpc('rpc_complete_finder_studio_intake_v2', {
    p_finder_submission_id: input.finderSubmissionId,
    p_action: input.action,
    p_operation_token: input.operationToken,
    p_result: input.result,
    p_candidate_ids: input.candidateIds ?? [],
  })
  if (error) throw error
  if (!data || typeof data !== 'object' || (data as Record<string, unknown>).ok !== true) {
    throw new Error('Studio intake ledger completion was not acknowledged.')
  }
}

function parseLedgerClaim(value: unknown): StudioLedgerClaim {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Invalid Studio intake ledger claim.')
  }
  const record = value as Record<string, unknown>
  if (record.decision === 'conflict') return { kind: 'conflict' }
  if (record.decision === 'invalid_selection') return { kind: 'invalid_selection' }
  if (record.decision === 'in_progress') return { kind: 'in_progress' }
  if (record.decision === 'missing') return { kind: 'missing' }
  const storedResult = parseStoredStudioResult(record.result)
  if (record.decision === 'replay' && storedResult) {
    return { kind: 'replay', result: storedResult }
  }
  if (
    record.decision === 'claimed' &&
    (record.action === 'resolve' || record.action === 'confirm') &&
    typeof record.operationToken === 'string'
  ) {
    if (record.action === 'confirm') {
      const resolveResult = parseStoredStudioResult(record.resolveResult)
      if (!resolveResult) throw new Error('Missing stored resolve result.')
      return {
        kind: 'claimed',
        action: 'confirm',
        operationToken: record.operationToken,
        resolveResult,
      }
    }
    return { kind: 'claimed', action: 'resolve', operationToken: record.operationToken }
  }
  throw new Error('Unknown Studio intake ledger claim.')
}

function resultForClaimDecision(
  claim: StudioLedgerClaim,
): SparkleFinderStudioIntakeV2Result | null {
  if (claim.kind === 'replay') {
    return claim.result.ok
      ? { ...claim.result, mutationReplayed: true }
      : claim.result
  }
  if (claim.kind === 'conflict') {
    return failure(
      'conflicting_replay',
      false,
      'submission_reused_with_different_input',
      'This Studio submission was already used with different details.',
    )
  }
  if (claim.kind === 'invalid_selection') return invalidSelection('selection_not_offered')
  if (claim.kind === 'missing') return invalidSelection('submission_not_resolved')
  if (claim.kind === 'in_progress') {
    return failure(
      'temporary_failure',
      true,
      'intake_in_progress',
      'Showcase Studio is still processing this submission. Please try again shortly.',
    )
  }
  return null
}

async function storeResult(
  complete: (input: StudioLedgerCompleteInput) => Promise<void>,
  input: StudioLedgerCompleteInput,
): Promise<SparkleFinderStudioIntakeV2Result> {
  await complete(input)
  return input.result
}

function accepted(candidate: SparkleFinderStudioCandidate): SparkleFinderStudioIntakeV2Result {
  return {
    schemaVersion: 2,
    ok: true,
    status: 'accepted',
    retryable: false,
    mutationReplayed: false,
    suiteDesignId: candidate.designId,
    resolvedDesign: candidate,
  }
}

function invalidSelection(errorCode: string): SparkleFinderStudioIntakeV2Result {
  return failure(
    'invalid_selection',
    false,
    errorCode,
    'That exact Suite design is no longer valid for this Studio submission.',
  )
}

function databaseFailure(): SparkleFinderStudioIntakeV2Result {
  return failure(
    'database_failed',
    true,
    'intake_ledger_unavailable',
    'Showcase Studio could not save this step right now. Please try again.',
  )
}

function failure(
  status: Extract<SparkleFinderStudioIntakeV2Result, { ok: false }>['status'],
  retryable: boolean,
  errorCode: string,
  customerMessage: string,
  photoFeedback?: string[],
): SparkleFinderStudioIntakeV2Result {
  return {
    schemaVersion: 2,
    ok: false,
    status,
    retryable,
    errorCode,
    customerMessage,
    ...(photoFeedback?.length ? { photoFeedback } : {}),
  }
}

function fingerprint(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex')
}

function readAllowedAssetOrigins(): string[] {
  return (process.env.SPARKLE_FINDER_ASSET_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
}

function isRecognizedItemNumber(itemNumber: string): boolean {
  return /^[A-Z]{2,4}\d{1,12}$/.test(itemNumber)
    && resolveJewelryTypeFromItemNumber(itemNumber) !== null
}

function sameCandidateFacts(
  stored: SparkleFinderStudioCandidate,
  live: SparkleFinderStudioCandidate,
): boolean {
  return JSON.stringify(stored) === JSON.stringify(live)
}

function mapExactDesign(design: Extract<ExactResolveResult, { found: true }>['design']) {
  return {
    designId: design.id,
    itemNumber: design.itemNumber,
    designName: design.designName,
    material: design.material,
    mainStone: design.mainStone,
    jewelryType: TYPE_MAP[design.typePrefix],
    collectionName: design.collectionName,
    collectionYear: design.collectionYear,
    canonicalPhotoUrl: design.canonicalPhotoUrl,
    description: null,
  } satisfies SparkleFinderStudioCandidate
}

type StudioDesignRow = {
  id: string
  item_number: string
  design_name: string
  material: string | null
  main_stone: string | null
  canonical_photo_url: string | null
  type_prefix: JewelryType
  collection:
    | { name: string | null; collection_year: number | null }
    | Array<{ name: string | null; collection_year: number | null }>
    | null
}

function mapStudioDesignRow(row: StudioDesignRow): SparkleFinderStudioCandidate {
  const collection = Array.isArray(row.collection) ? row.collection[0] : row.collection
  return {
    designId: row.id,
    itemNumber: row.item_number,
    designName: row.design_name,
    material: row.material,
    mainStone: row.main_stone,
    jewelryType: TYPE_MAP[row.type_prefix],
    collectionName: collection?.name?.trim() || null,
    collectionYear: collection?.collection_year ?? null,
    canonicalPhotoUrl: row.canonical_photo_url,
    description: null,
  }
}

function compactObject<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as Partial<T>
}

function parseStoredStudioResult(value: unknown): SparkleFinderStudioIntakeV2Result | null {
  const parsed = storedResultSchema.safeParse(value)
  return parsed.success ? parsed.data : null
}
