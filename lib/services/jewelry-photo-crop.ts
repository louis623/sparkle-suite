import sharp from 'sharp'

import { assessJewelryPhotoPreflight } from '@/lib/services/jewelry-photo-preflight'
import { classifyJewelryPhotoSemantics } from '@/lib/services/jewelry-photo-semantics'
import {
  analyzeServerImageQuality,
  type ServerImageQualityAnalysis,
} from '@/lib/services/server-image-quality'

export interface GuardedJewelryPhotoCropInput {
  bytes: Uint8Array
  analysis: ServerImageQualityAnalysis
  allowReviewableOutput?: boolean
}

export interface GuardedJewelryPhotoCropResult {
  bytes: Uint8Array
  selectedSource: 'cropped'
  analysis: ServerImageQualityAnalysis
  preflight: ReturnType<typeof assessJewelryPhotoPreflight>
  semantic: ReturnType<typeof classifyJewelryPhotoSemantics>
}

const MIN_CROP_EDGE = 760
const OUTPUT_EDGE = 1200
const MIN_COVERAGE_GAIN = 0.08
const MIN_CROP_COVERAGE = 0.12

export async function createGuardedJewelryPhotoCrop(
  input: GuardedJewelryPhotoCropInput,
): Promise<GuardedJewelryPhotoCropResult | null> {
  const originalSemantic = classifyJewelryPhotoSemantics(input.analysis)
  if (!originalSemantic.canAttemptCrop) return null

  const metadata = await sharp(Buffer.from(input.bytes), { failOn: 'error' })
    .rotate()
    .metadata()
  if (!metadata.width || !metadata.height) return null

  const cropBox = getSubjectCenteredCropBox(
    metadata.width,
    metadata.height,
    input.analysis.subjectCenterX,
    input.analysis.subjectCenterY,
  )
  if (!cropBox) return null

  const croppedBuffer = await sharp(Buffer.from(input.bytes), { failOn: 'error' })
    .rotate()
    .extract(cropBox)
    .resize({
      width: OUTPUT_EDGE,
      height: OUTPUT_EDGE,
      fit: 'contain',
      background: '#ffffff',
    })
    .jpeg({ quality: 92 })
    .toBuffer()
  const croppedBytes = new Uint8Array(croppedBuffer)
  const croppedAnalysis = await analyzeServerImageQuality(croppedBytes)
  const croppedSemantic = classifyJewelryPhotoSemantics(croppedAnalysis)
  if (croppedSemantic.role === 'label_or_packaging') return null
  const minimumCoverageGain = input.analysis.subjectCoverage < 0.08
    ? Math.max(0.005, input.analysis.subjectCoverage * 0.2)
    : MIN_COVERAGE_GAIN
  const noMaskPortraitFallback =
    input.allowReviewableOutput === true &&
    input.analysis.subjectCoverage === 0 &&
    metadata.height > metadata.width
  if (
    !noMaskPortraitFallback &&
    croppedAnalysis.subjectCoverage <
      input.analysis.subjectCoverage + minimumCoverageGain
  ) {
    return null
  }
  if (
    croppedAnalysis.subjectCoverage < MIN_CROP_COVERAGE &&
    input.allowReviewableOutput !== true
  ) return null
  if (croppedAnalysis.blurRisk > input.analysis.blurRisk + 0.12) return null
  if (croppedAnalysis.detailRisk > input.analysis.detailRisk + 0.12) return null

  const preflight = assessJewelryPhotoPreflight({
    width: croppedAnalysis.width,
    height: croppedAnalysis.height,
    blurRisk: croppedAnalysis.blurRisk,
    lightingRisk: croppedAnalysis.lightingRisk,
    detailRisk: croppedAnalysis.detailRisk,
    backgroundDistractionRisk: croppedAnalysis.backgroundDistractionRisk,
    subjectCoverage: croppedAnalysis.subjectCoverage,
    subjectCentered: croppedAnalysis.subjectCentered,
  })
  if (
    !preflight.passed &&
    !(
      input.allowReviewableOutput === true &&
      croppedAnalysis.width >= 720 &&
      croppedAnalysis.height >= 720 &&
      croppedAnalysis.blurRisk <= 0.45 &&
      croppedAnalysis.detailRisk <= 0.55 &&
      croppedAnalysis.detailConfidence >= 0.6
    )
  ) return null

  return {
    bytes: croppedBytes,
    selectedSource: 'cropped',
    analysis: croppedAnalysis,
    preflight,
    semantic: croppedSemantic,
  }
}

function getSubjectCenteredCropBox(
  width: number,
  height: number,
  subjectCenterX: number,
  subjectCenterY: number,
) {
  const shortestEdge = Math.min(width, height)
  const cropEdge = Math.max(MIN_CROP_EDGE, Math.round(shortestEdge * 0.42))
  if (cropEdge > width || cropEdge > height) return null

  return {
    left: Math.max(
      0,
      Math.min(width - cropEdge, Math.round(subjectCenterX * width - cropEdge / 2)),
    ),
    top: Math.max(
      0,
      Math.min(height - cropEdge, Math.round(subjectCenterY * height - cropEdge / 2)),
    ),
    width: cropEdge,
    height: cropEdge,
  }
}
