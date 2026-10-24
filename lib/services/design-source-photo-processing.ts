import { analyzeListingPhoto } from './listing-photo-analysis'
import { assessJewelryPhotoPreflight } from '@/lib/services/jewelry-photo-preflight'
import { ServiceError } from '@/lib/services/errors'
import {
  type ServerImageQualityAnalysis,
} from '@/lib/services/server-image-quality'
import {
  canUseConfirmedJewelryFront,
  classifyJewelryPhotoSemantics,
} from '@/lib/services/jewelry-photo-semantics'
import { createGuardedJewelryPhotoCrop } from '@/lib/services/jewelry-photo-crop'
import {
  removeCatalogDesignPhotoAssets,
  uploadCatalogDesignSourcePhoto,
  uploadStagedOriginalPhoto,
} from '@/lib/services/storage'

export type DesignSourcePhotoInput =
  | {
      repId: string
      designId: string
      filenameStem: string
      sourceImageUrl: string
    }
  | {
      repId: string
      designId: string
      filenameStem: string
      sourceImageDataUrl: string
    }

export interface DesignSourcePhotoResult {
  publicPhotoUrl: string
  publicObjectPath: string
  stagedOriginal: {
    objectPath: string
    signedUrl: string
  }
  preflight: ReturnType<typeof assessJewelryPhotoPreflight>
  analysis: ServerImageQualityAnalysis
  selectedSource: 'original' | 'cropped'
}

export interface DesignSourcePhotoOptions {
  fetch?: typeof fetch
  confirmedJewelryFront?: boolean
  /** A rep listing saves the upload they confirmed, not a zoomed crop. */
  publishOriginalUpload?: boolean
}

/** The public catalog file for one design photo. Listing saves keep the upload. */
export function designSourcePublicFile(args: {
  filenameStem: string
  cropped: boolean
  publishOriginalUpload?: boolean
}): { filename: string; selectedSource: 'original' | 'cropped' } {
  if (args.publishOriginalUpload || !args.cropped) {
    return { filename: `${args.filenameStem}-source`, selectedSource: 'original' }
  }
  return { filename: `${args.filenameStem}-cropped`, selectedSource: 'cropped' }
}

function isDataUrl(value: string): boolean {
  return /^data:[^;]+;base64,/i.test(value)
}

function decodeDataUrl(input: string): { bytes: Uint8Array; contentType: string } {
  const match = /^data:([^;]+);base64,(.+)$/i.exec(input)
  if (!match) {
    throw new ServiceError({
      code: 'PIECE_PHOTO_INVALID_DATA_URL',
      message: 'piece photo data URL is malformed',
      userMessage:
        "I couldn't read that photo upload. Send the photo again and I'll retry it.",
      statusCode: 422,
    })
  }

  return {
    contentType: match[1],
    bytes: new Uint8Array(Buffer.from(match[2], 'base64')),
  }
}

function toDataUrl(contentType: string, bytes: Uint8Array): string {
  return `data:${contentType};base64,${Buffer.from(bytes).toString('base64')}`
}

async function fetchRemoteImage(
  url: string,
  fetchImpl: typeof fetch,
): Promise<{ bytes: Uint8Array; contentType: string }> {
  const response = await fetchImpl(url)
  if (!response.ok) {
    throw new ServiceError({
      code: 'PIECE_PHOTO_FETCH_FAILED',
      message: `piece photo fetch failed with status ${response.status}`,
      userMessage:
        "I couldn't read that uploaded piece photo. Please upload it again and I'll retry.",
      statusCode: 422,
    })
  }

  const buffer = await response.arrayBuffer()
  return {
    bytes: new Uint8Array(buffer),
    contentType:
      response.headers.get('content-type') ?? 'application/octet-stream',
  }
}

export async function prepareDesignSourcePhoto(
  input: DesignSourcePhotoInput,
  options: DesignSourcePhotoOptions = {},
): Promise<DesignSourcePhotoResult> {
  const fetchImpl = options.fetch ?? fetch
  const confirmedJewelryFront = options.confirmedJewelryFront === true
  const fetched =
    'sourceImageDataUrl' in input
      ? decodeDataUrl(input.sourceImageDataUrl)
      : isDataUrl(input.sourceImageUrl)
        ? decodeDataUrl(input.sourceImageUrl)
        : await fetchRemoteImage(input.sourceImageUrl, fetchImpl)

  const analysis = await analyzeListingPhoto(fetched.bytes)
  const semantic = classifyJewelryPhotoSemantics(analysis)
  const preflight = assessJewelryPhotoPreflight({
    width: analysis.width,
    height: analysis.height,
    blurRisk: analysis.blurRisk,
    lightingRisk: analysis.lightingRisk,
    detailRisk: analysis.detailRisk,
    backgroundDistractionRisk: analysis.backgroundDistractionRisk,
    subjectCoverage: analysis.subjectCoverage,
    subjectCentered: analysis.subjectCentered,
  })
  const publishOriginalUpload = options.publishOriginalUpload === true
  const crop = !publishOriginalUpload && semantic.canAttemptCrop
      ? await createGuardedJewelryPhotoCrop({
          bytes: fetched.bytes,
          analysis,
          allowReviewableOutput: confirmedJewelryFront,
        })
    : null
  const useCrop = Boolean(crop) && !publishOriginalUpload
  const selectedBytes = useCrop && crop ? crop.bytes : fetched.bytes
  const selectedAnalysis = useCrop && crop ? crop.analysis : analysis
  const selectedPreflight = useCrop && crop ? crop.preflight : preflight

  if (
    !selectedPreflight.passed &&
    !canUseConfirmedJewelryFront(
      selectedAnalysis,
      classifyJewelryPhotoSemantics(selectedAnalysis),
      confirmedJewelryFront,
    )
  ) {
    throw new ServiceError({
      code: 'PHOTO_PREFLIGHT_FAILED',
      message: `piece photo preflight failed: ${selectedPreflight.coachingMessages.join(' ')}`,
      userMessage: `That photo needs one more try before I can list it. ${selectedPreflight.coachingMessages.join(' ')}`.trim(),
      statusCode: 422,
    })
  }

  const normalizedDataUrl = toDataUrl(
    analysis.contentType || fetched.contentType,
    fetched.bytes,
  )
  const publicFile = designSourcePublicFile({
    filenameStem: input.filenameStem,
    cropped: useCrop,
    publishOriginalUpload,
  })
  const selectedDataUrl =
    publicFile.selectedSource === 'cropped'
      ? toDataUrl(selectedAnalysis.contentType, selectedBytes)
      : normalizedDataUrl
  const stagedOriginal = await uploadStagedOriginalPhoto(
    input.repId,
    normalizedDataUrl,
    `${input.filenameStem}-original`,
    { designId: input.designId },
  )
  let publicPhotoAsset: Awaited<
    ReturnType<typeof uploadCatalogDesignSourcePhoto>
  >
  try {
    publicPhotoAsset = await uploadCatalogDesignSourcePhoto(
      input.repId,
      input.designId,
      selectedDataUrl,
      publicFile.filename,
    )
  } catch (error) {
    try {
      await removeCatalogDesignPhotoAssets({
        stagedObjectPath: stagedOriginal.objectPath,
      })
    } catch {
      // Preserve the actionable upload error. Retention tooling can retry an
      // isolated cleanup failure without obscuring the original cause.
    }
    throw error
  }

  return {
    publicPhotoUrl: publicPhotoAsset.publicUrl,
    publicObjectPath: publicPhotoAsset.objectPath,
    stagedOriginal,
    preflight: selectedPreflight,
    analysis: selectedAnalysis,
    selectedSource: publicFile.selectedSource,
  }
}
