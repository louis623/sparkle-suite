import sharp from 'sharp'

import { measureImageQualitySignals } from '@/lib/nic-nac/image-quality'

export interface ServerImageQualityAnalysis {
  contentType: string
  width: number
  height: number
  blurRisk: number
  lightingRisk: number
  detailRisk: number
  backgroundDistractionRisk: number
  subjectCoverage: number
  subjectCentered: boolean
  subjectCenterX: number
  subjectCenterY: number
  detailConfidence: number
  backgroundUniformity: number
  backgroundCleanliness: number
}

const MIME_BY_FORMAT: Record<string, string> = {
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  avif: 'image/avif',
  gif: 'image/gif',
  heif: 'image/heif',
  heic: 'image/heic',
  tiff: 'image/tiff',
}

const DEFAULT_MAX_ANALYSIS_DIMENSION = 512

function toBuffer(data: Buffer | Uint8Array | ArrayBuffer): Buffer {
  if (Buffer.isBuffer(data)) return data
  if (data instanceof Uint8Array) return Buffer.from(data)
  return Buffer.from(data)
}

export async function analyzeServerImageQuality(
  data: Buffer | Uint8Array | ArrayBuffer,
  options: {
    maxAnalysisDimension?: number
  } = {},
): Promise<ServerImageQualityAnalysis> {
  const buffer = toBuffer(data)
  const maxAnalysisDimension =
    options.maxAnalysisDimension ?? DEFAULT_MAX_ANALYSIS_DIMENSION

  const image = sharp(buffer, { failOn: 'error' }).rotate()
  const metadata = await image.metadata()
  if (!metadata.width || !metadata.height || !metadata.format) {
    throw new Error('Unable to decode image metadata for quality analysis.')
  }

  const decoded = await image
    .clone()
    .resize({
      width: maxAnalysisDimension,
      height: maxAnalysisDimension,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const signals = measureImageQualitySignals({
    data: new Uint8ClampedArray(decoded.data),
    width: decoded.info.width,
    height: decoded.info.height,
  })

  return {
    contentType: MIME_BY_FORMAT[metadata.format] ?? 'application/octet-stream',
    width: metadata.width,
    height: metadata.height,
    detailRisk: toRisk(signals.detailConfidence),
    backgroundDistractionRisk: getBackgroundDistractionRisk(
      signals.backgroundUniformity,
      signals.backgroundCleanliness,
    ),
    ...signals,
  }
}

function toRisk(confidence: number): number {
  return round3(clamp01(1 - confidence))
}

function getBackgroundDistractionRisk(
  backgroundUniformity: number,
  backgroundCleanliness: number,
): number {
  return round3(
    clamp01(
      clamp01(1 - backgroundUniformity) * 0.4 +
        clamp01(1 - backgroundCleanliness) * 0.6,
    ),
  )
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000
}
