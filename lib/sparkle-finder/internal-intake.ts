import type { SupabaseClient } from '@supabase/supabase-js'

import {
  createDesign as createSuiteDesign,
  normalizeItemNumber,
  resolveItemNumber as resolveSuiteItemNumber,
} from '@/lib/services/jewelry-database'
import type {
  CreateDesignInput,
  CreateDesignResult,
  PhotoPipelineStatePatch,
  ResolveItemNumberResult,
} from '@/lib/services/types'

type FinderIntakeLabel = {
  bpLabel?: 'standard' | 'diamond' | 'unicorn'
  collectionName?: string
  collectionYear?: number
  designName?: string
  itemNumber?: string
  jewelryType?: string
  mainStone?: string
  material?: string
}

export type SparkleFinderJewelryIntakePayload = {
  sourceProduct?: string
  finderSubmissionId?: string
  originalLabelImageDataUrl?: string
  jewelryFrontImageDataUrl?: string
  labelDetails?: FinderIntakeLabel
  customerNote?: string
  approvedForMasterCatalog?: boolean
  approvedCanonicalPhotoUrl?: string
  photoPipeline?: PhotoPipelineStatePatch
}

export type SparkleFinderIntakeResult =
  | {
      ok: true
      status: 'needs_confirmation' | 'needs_jewelry_photo' | 'accepted' | 'publish_queued' | 'published'
      message: string
      suiteDesignId?: string
      catalogDraft?: FinderIntakeLabel
    }
  | {
      ok: false
      status: 'photo_rejected' | 'rejected'
      message: string
      photoFeedback?: string[]
    }

type SparkleFinderIntakeDeps = {
  supabase: SupabaseClient
  resolveItemNumber?: (
    supabase: SupabaseClient,
    itemNumber: string,
    options?: { material?: string | null; mainStone?: string | null },
  ) => Promise<ResolveItemNumberResult>
  createDesign?: (
    supabase: SupabaseClient,
    input: CreateDesignInput,
  ) => Promise<CreateDesignResult>
}

const validPublishStatuses = new Set(['ready', 'approved', 'published'])

export function authorizeSparkleFinderIntakeRequest(
  request: Request,
  token: string | undefined,
): { ok: true } | { ok: false; reason: 'not_configured' | 'unauthorized'; status: 401 | 503 } {
  const expectedToken = token?.trim()

  if (!expectedToken) {
    return { ok: false, reason: 'not_configured', status: 503 }
  }

  if (request.headers.get('authorization') !== `Bearer ${expectedToken}`) {
    return { ok: false, reason: 'unauthorized', status: 401 }
  }

  return { ok: true }
}

export async function publishSparkleFinderJewelryIntake(
  rawPayload: unknown,
  deps: SparkleFinderIntakeDeps,
): Promise<SparkleFinderIntakeResult> {
  const payload = normalizePayload(rawPayload)

  if (payload.sourceProduct !== 'sparkle_finder') {
    return rejected('Sparkle Finder intake requests must identify their source product.')
  }

  if (!payload.finderSubmissionId) {
    return rejected('Sparkle Finder intake requests must include a submission id.')
  }

  const catalogDraft = payload.labelDetails
  const itemNumber = catalogDraft.itemNumber

  if (!itemNumber) {
    return {
      ok: true,
      status: 'needs_confirmation',
      message: 'Nic-Nac needs the original Bomb Party item number from the label before this can publish.',
      catalogDraft,
    }
  }

  const resolveItemNumber = deps.resolveItemNumber ?? resolveSuiteItemNumber
  const existing = await resolveItemNumber(deps.supabase, itemNumber, {
    ...(catalogDraft.material ? { material: catalogDraft.material } : {}),
    ...(catalogDraft.mainStone ? { mainStone: catalogDraft.mainStone } : {}),
  })

  if (existing.found) {
    return {
      ok: true,
      status: 'published',
      message: 'This piece already exists in the shared master jewelry database.',
      suiteDesignId: existing.design.id,
      catalogDraft: {
        bpLabel: existing.design.rarityClassification ?? 'standard',
        collectionName: existing.design.collectionName ?? catalogDraft.collectionName,
        collectionYear: existing.design.collectionYear ?? catalogDraft.collectionYear,
        designName: existing.design.designName,
        itemNumber: existing.design.itemNumber,
        mainStone: existing.design.mainStone ?? catalogDraft.mainStone,
        material: existing.design.material ?? catalogDraft.material,
      },
    }
  }

  if (!payload.approvedForMasterCatalog) {
    return {
      ok: true,
      status: 'needs_confirmation',
      message:
        'Nic-Nac received this missing-piece request and needs approval before it can publish to the master catalog.',
      catalogDraft,
    }
  }

  if (!catalogDraft.designName) {
    return rejected('Nic-Nac needs the design name from the original label before this can publish.')
  }

  if (!hasApprovedPhotoPipeline(payload)) {
    return {
      ok: false,
      status: 'photo_rejected',
      message: 'Nic-Nac needs a clean, approved light-box photo before this can publish.',
      photoFeedback: [
        'Use a clear, centered jewelry photo approved by Nic-Nac photo QA.',
        'Make sure the approved jewelry photo has completed Nic-Nac photo QA.',
      ],
    }
  }

  const createDesign = deps.createDesign ?? createSuiteDesign
  const created = await createDesign(deps.supabase, {
    bpMsrp: readOptionalNumber(readRecord(rawPayload).bpMsrp),
    collectionName: catalogDraft.collectionName,
    collectionYear: catalogDraft.collectionYear,
    conversationId: `sparkle-finder:${payload.finderSubmissionId}`,
    createdByRepId: null,
    designName: catalogDraft.designName,
    itemNumber,
    mainStone: catalogDraft.mainStone,
    material: catalogDraft.material,
    photoPipeline: payload.photoPipeline,
    piecePhotoUrl: payload.approvedCanonicalPhotoUrl,
    rarityClassification: catalogDraft.bpLabel ?? 'standard',
    searchTags: buildFinderSearchTags(),
    specialFeatures: cleanText(readString(readRecord(rawPayload).specialFeatures), 240) || undefined,
  })

  return {
    ok: true,
    status: 'published',
    message: 'This piece has been added to the shared master jewelry database.',
    suiteDesignId: created.designId,
    catalogDraft,
  }
}

function normalizePayload(rawPayload: unknown): Required<
  Pick<SparkleFinderJewelryIntakePayload, 'sourceProduct' | 'finderSubmissionId' | 'labelDetails'>
> &
  SparkleFinderJewelryIntakePayload {
  const record = readRecord(rawPayload)
  const labelDetails = normalizeLabelDetails(record.labelDetails)

  return {
    approvedCanonicalPhotoUrl:
      cleanText(readString(record.approvedCanonicalPhotoUrl), 2_000) || undefined,
    approvedForMasterCatalog: record.approvedForMasterCatalog === true,
    customerNote: cleanText(readString(record.customerNote), 500) || undefined,
    finderSubmissionId: cleanText(readString(record.finderSubmissionId), 120),
    jewelryFrontImageDataUrl: cleanText(readString(record.jewelryFrontImageDataUrl), 10_000) || undefined,
    labelDetails,
    originalLabelImageDataUrl: cleanText(readString(record.originalLabelImageDataUrl), 10_000) || undefined,
    photoPipeline: normalizePhotoPipeline(record.photoPipeline),
    sourceProduct: cleanText(readString(record.sourceProduct), 80),
  }
}

function normalizeLabelDetails(value: unknown): FinderIntakeLabel {
  const record = readRecord(value)
  const collectionYear = readOptionalNumber(record.collectionYear)
  const itemNumber = cleanText(readString(record.itemNumber), 80)

  return {
    bpLabel: normalizeBpLabel(record.bpLabel),
    collectionName: cleanText(readString(record.collectionName), 120) || undefined,
    collectionYear,
    designName: cleanText(readString(record.designName), 160) || undefined,
    itemNumber: itemNumber ? normalizeItemNumber(itemNumber) : undefined,
    jewelryType: cleanText(readString(record.jewelryType), 40) || undefined,
    mainStone: cleanText(readString(record.mainStone), 120) || undefined,
    material: cleanText(readString(record.material), 120) || undefined,
  }
}

function normalizePhotoPipeline(value: unknown): PhotoPipelineStatePatch | undefined {
  const record = readRecord(value)
  const status = cleanText(readString(record.status), 40)

  if (!record.originalPath || !record.originalUrl || !status) return undefined

  return {
    originalPath: cleanText(readString(record.originalPath), 2_000),
    originalUrl: cleanText(readString(record.originalUrl), 2_000),
    enhancedUrl: cleanText(readString(record.enhancedUrl), 2_000) || undefined,
    provider: cleanText(readString(record.provider), 80) || undefined,
    status: status as PhotoPipelineStatePatch['status'],
    preflightScore: readOptionalNumber(record.preflightScore),
    preflightIssues: Array.isArray(record.preflightIssues) ? record.preflightIssues : undefined,
    qaDecision: normalizeQaDecision(record.qaDecision),
    qaConfidence: readOptionalNumber(record.qaConfidence),
    processedAt: cleanText(readString(record.processedAt), 80) || undefined,
  }
}

function hasApprovedPhotoPipeline(payload: ReturnType<typeof normalizePayload>): payload is ReturnType<
  typeof normalizePayload
> & {
  approvedCanonicalPhotoUrl: string
  photoPipeline: PhotoPipelineStatePatch
} {
  return !!(
    payload.approvedCanonicalPhotoUrl &&
    payload.photoPipeline?.originalPath &&
    payload.photoPipeline?.originalUrl &&
    payload.photoPipeline.status &&
    validPublishStatuses.has(payload.photoPipeline.status)
  )
}

function buildFinderSearchTags(): string[] {
  return ['sparkle finder']
}

function normalizeBpLabel(value: unknown): FinderIntakeLabel['bpLabel'] {
  const label = cleanText(readString(value), 40).toLowerCase()

  if (label === 'standard' || label === 'diamond' || label === 'unicorn') return label
  return undefined
}

function normalizeQaDecision(value: unknown): PhotoPipelineStatePatch['qaDecision'] | undefined {
  if (value === 'approve' || value === 'review' || value === 'hold' || value === 'reject') {
    return value
  }

  return undefined
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function readOptionalNumber(value: unknown): number | undefined {
  const numberValue = typeof value === 'number' ? value : Number(value)

  return Number.isFinite(numberValue) ? numberValue : undefined
}

function cleanText(value: string | undefined, maxLength: number): string {
  return String(value ?? '').trim().slice(0, maxLength)
}

function rejected(message: string): SparkleFinderIntakeResult {
  return {
    ok: false,
    status: 'rejected',
    message,
  }
}
