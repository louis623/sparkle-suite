import { getPhotoroomConfig } from '@/lib/photoroom/config'
import { randomUUID } from 'crypto'
import { errors, ServiceError } from '@/lib/services/errors'
import { assessJewelryPhotoPreflight } from '@/lib/services/jewelry-photo-preflight'
import { executePhotoEnhancement } from '@/lib/services/photo-enhancement'
import { inspectEnhancedPhotoOutput } from '@/lib/services/photo-enhancement-qa'
import { analyzeServerImageQuality } from '@/lib/services/server-image-quality'
import {
  canUseConfirmedJewelryFront,
  classifyJewelryPhotoSemantics,
} from '@/lib/services/jewelry-photo-semantics'
import { createGuardedJewelryPhotoCrop } from '@/lib/services/jewelry-photo-crop'
import { uploadJewelryPhoto } from '@/lib/services/storage'

export interface ProcessRepListingPhotoUrlInput {
  repId: string
  sourceImageUrl: string
  filenameStem: string
  mutationAssetKey?: string
}

export interface ProcessRepListingPhotoUrlOptions {
  fetch?: typeof fetch
  confirmedJewelryFront?: boolean
}

export interface ProcessRepListingPhotoUrlResult {
  photoUrl: string
  originalPhotoUrl: string
  enhancedPhotoUrl: string | null
  selectedSource: 'original' | 'enhanced' | 'cropped' | 'cropped_enhanced'
  preflight: ReturnType<typeof assessJewelryPhotoPreflight>
  image: {
    contentType: string
    width: number
    height: number
    blurRisk: number
    lightingRisk: number
    detailRisk: number
    backgroundDistractionRisk: number
    subjectCoverage: number
    subjectCentered: boolean
    detailConfidence: number
    backgroundUniformity: number
    backgroundCleanliness: number
  }
  enhancement: {
    attempted: boolean
    selected?: boolean
    decision?: 'review' | 'hold' | 'error'
    errorMessage?: string
    preflight?: ReturnType<typeof assessJewelryPhotoPreflight>
  }
}

function toDataUrl(contentType: string, bytes: Uint8Array): string {
  return `data:${contentType};base64,${Buffer.from(bytes).toString('base64')}`
}

function isDataUrl(value: string): boolean {
  return /^data:[^;]+;base64,/i.test(value)
}

function decodeDataUrl(input: string): { bytes: Uint8Array; contentType: string } {
  const match = /^data:([^;]+);base64,(.+)$/i.exec(input)
  if (!match) {
    throw new ServiceError({
      code: 'LISTING_PHOTO_INVALID_DATA_URL',
      message: 'listing photo data URL is malformed',
      userMessage:
        "I couldn't read that uploaded listing photo. Please upload it again and I'll retry.",
      statusCode: 422,
    })
  }

  return {
    bytes: new Uint8Array(Buffer.from(match[2], 'base64')),
    contentType: match[1],
  }
}

async function fetchImageBytes(
  input: ProcessRepListingPhotoUrlInput,
  fetchImpl: typeof fetch,
): Promise<{ bytes: Uint8Array; contentType: string }> {
  if (isDataUrl(input.sourceImageUrl)) {
    return decodeDataUrl(input.sourceImageUrl)
  }

  const response = await fetchImpl(input.sourceImageUrl)
  if (!response.ok) {
    throw new ServiceError({
      code: 'LISTING_PHOTO_FETCH_FAILED',
      message: `listing photo fetch failed with status ${response.status}`,
      userMessage:
        "I couldn't read that uploaded listing photo. Please upload it again and I'll retry.",
      statusCode: 422,
    })
  }

  const buffer = await response.arrayBuffer()
  return {
    bytes: new Uint8Array(buffer),
    contentType: response.headers.get('content-type') ?? 'application/octet-stream',
  }
}

export async function processRepListingPhotoUrl(
  input: ProcessRepListingPhotoUrlInput,
  options: ProcessRepListingPhotoUrlOptions = {},
): Promise<ProcessRepListingPhotoUrlResult> {
  const fetchImpl = options.fetch ?? fetch
  const confirmedJewelryFront = options.confirmedJewelryFront === true
  const fetched = await fetchImageBytes(input, fetchImpl)
  const metadata = await analyzeServerImageQuality(fetched.bytes)
  const semantic = classifyJewelryPhotoSemantics(metadata)
  const preflight = assessJewelryPhotoPreflight({
    width: metadata.width,
    height: metadata.height,
    blurRisk: metadata.blurRisk,
    lightingRisk: metadata.lightingRisk,
    detailRisk: metadata.detailRisk,
    backgroundDistractionRisk: metadata.backgroundDistractionRisk,
    subjectCoverage: metadata.subjectCoverage,
    subjectCentered: metadata.subjectCentered,
  })
  const crop = semantic.canAttemptCrop
    ? await createGuardedJewelryPhotoCrop({
        bytes: fetched.bytes,
        analysis: metadata,
        allowReviewableOutput: confirmedJewelryFront,
      })
    : null
  const selectedBytes = crop?.bytes ?? fetched.bytes
  const selectedMetadata = crop?.analysis ?? metadata
  const selectedPreflight = crop?.preflight ?? preflight

  if (
    !selectedPreflight.passed &&
    !canUseConfirmedJewelryFront(
      selectedMetadata,
      classifyJewelryPhotoSemantics(selectedMetadata),
      confirmedJewelryFront,
    )
  ) {
    throw errors.LISTING_PHOTO_PREFLIGHT_FAILED(preflight.coachingMessages)
  }

  const deterministicMutationAsset = Boolean(input.mutationAssetKey)
  const uploadStem = `${input.filenameStem}-${input.mutationAssetKey ?? randomUUID()}`
  const uploadProcessedPhoto = (dataUrl: string, suffix: string) =>
    deterministicMutationAsset
      ? uploadJewelryPhoto(input.repId, dataUrl, `${uploadStem}-${suffix}`, {
          upsert: true,
        })
      : uploadJewelryPhoto(input.repId, dataUrl, `${uploadStem}-${suffix}`)
  const originalPhotoUrl = await uploadProcessedPhoto(
    toDataUrl(metadata.contentType, fetched.bytes),
    'source',
  )
  const croppedPhotoUrl = crop
    ? await uploadProcessedPhoto(
        toDataUrl(selectedMetadata.contentType, selectedBytes),
        'cropped',
      )
    : null

  const baseResult: ProcessRepListingPhotoUrlResult = {
    photoUrl: croppedPhotoUrl ?? originalPhotoUrl,
    originalPhotoUrl,
    enhancedPhotoUrl: null,
    selectedSource: crop ? 'cropped' : 'original',
    preflight: selectedPreflight,
    image: {
      contentType: selectedMetadata.contentType,
      width: selectedMetadata.width,
      height: selectedMetadata.height,
      blurRisk: selectedMetadata.blurRisk,
      lightingRisk: selectedMetadata.lightingRisk,
      detailRisk: selectedMetadata.detailRisk,
      backgroundDistractionRisk: selectedMetadata.backgroundDistractionRisk,
      subjectCoverage: selectedMetadata.subjectCoverage,
      subjectCentered: selectedMetadata.subjectCentered,
      detailConfidence: selectedMetadata.detailConfidence,
      backgroundUniformity: selectedMetadata.backgroundUniformity,
      backgroundCleanliness: selectedMetadata.backgroundCleanliness,
    },
    enhancement: {
      attempted: false,
    },
  }

  let photoroomConfig: ReturnType<typeof getPhotoroomConfig>
  try {
    photoroomConfig = getPhotoroomConfig()
  } catch (error) {
    return {
      ...baseResult,
      enhancement: {
        attempted: true,
        selected: false,
        decision: 'error',
        errorMessage:
          error instanceof Error
            ? error.message
            : 'unknown enhancement configuration error',
      },
    }
  }
  if (!photoroomConfig) {
    return baseResult
  }

  try {
    const enhanced = await executePhotoEnhancement(
      {
        assetId: `${input.repId}:${input.filenameStem}`,
        sourceImageUrl: baseResult.photoUrl,
        output: {
          format: 'png',
          background: 'white',
        },
        operations: {
          removeBackground: true,
          relight: 'preserve-hue-and-saturation',
        },
        context: {
          repId: input.repId,
        },
      },
      {
        provider: photoroomConfig,
        fetch: fetchImpl,
      },
    )

    const outputMetadata = await analyzeServerImageQuality(enhanced.output.bytes)
    const outputQa = inspectEnhancedPhotoOutput({
      assetId: `${input.repId}:${input.filenameStem}`,
      provider: 'photoroom',
      outputWidth: outputMetadata.width,
      outputHeight: outputMetadata.height,
      contentType:
        outputMetadata.contentType ??
        enhanced.response.contentType ??
        'application/octet-stream',
      blurRisk: outputMetadata.blurRisk,
      lightingRisk: outputMetadata.lightingRisk,
      detailRisk: outputMetadata.detailRisk,
      backgroundDistractionRisk: outputMetadata.backgroundDistractionRisk,
      subjectCoverage: outputMetadata.subjectCoverage,
      subjectCentered: outputMetadata.subjectCentered,
    })
    const outputPreflight = assessJewelryPhotoPreflight({
      width: outputMetadata.width,
      height: outputMetadata.height,
      blurRisk: outputMetadata.blurRisk,
      lightingRisk: outputMetadata.lightingRisk,
      detailRisk: outputMetadata.detailRisk,
      backgroundDistractionRisk: outputMetadata.backgroundDistractionRisk,
      subjectCoverage: outputMetadata.subjectCoverage,
      subjectCentered: outputMetadata.subjectCentered,
    })

    if (outputQa.decision !== 'review' || !outputPreflight.passed) {
      return {
        ...baseResult,
        enhancement: {
          attempted: true,
          selected: false,
          decision: outputQa.decision,
          preflight: outputPreflight,
        },
      }
    }

    const enhancedPhotoUrl = await uploadProcessedPhoto(
      toDataUrl(outputMetadata.contentType, enhanced.output.bytes),
      'enhanced',
    )

    return {
      ...baseResult,
      photoUrl: enhancedPhotoUrl,
      enhancedPhotoUrl,
      selectedSource: crop ? 'cropped_enhanced' : 'enhanced',
      enhancement: {
        attempted: true,
        selected: true,
        decision: outputQa.decision,
        preflight: outputPreflight,
      },
    }
  } catch (error) {
    return {
      ...baseResult,
      enhancement: {
        attempted: true,
        selected: false,
        decision: 'error',
        errorMessage: error instanceof Error ? error.message : 'unknown enhancement error',
      },
    }
  }
}

export const processRepCustomListingPhotoUrl = processRepListingPhotoUrl
