export interface ImageQualitySignals {
  blurRisk: number
  lightingRisk: number
  subjectCoverage: number
  subjectCentered: boolean
  subjectCenterX: number
  subjectCenterY: number
  detailConfidence: number
  backgroundUniformity: number
  backgroundCleanliness: number
}

export interface ImageQualityInput {
  data: Uint8ClampedArray
  width: number
  height: number
}

const MIN_DIMENSION = 8
const BACKGROUND_DIFF_THRESHOLD = 18
const MAX_BORDER_BAND = 24

interface BorderStats {
  averageLuminance: number
  averageRed: number
  averageGreen: number
  averageBlue: number
  luminanceStd: number
  colorDeviation: number
  edgeStrength: number
  bandSize: number
  pixelCount: number
}

interface SubjectMaskSummary {
  count: number
  centroidX: number
  centroidY: number
  borderCount: number
  detailPixelRatio: number
}

export function measureImageQualitySignals(
  input: ImageQualityInput,
): ImageQualitySignals {
  const { data, width, height } = input
  if (width < MIN_DIMENSION || height < MIN_DIMENSION) {
    return {
      blurRisk: 1,
      lightingRisk: 1,
      subjectCoverage: 0,
      subjectCentered: false,
      subjectCenterX: 0.5,
      subjectCenterY: 0.5,
      detailConfidence: 0,
      backgroundUniformity: 0,
      backgroundCleanliness: 0,
    }
  }

  const luminance = new Float32Array(width * height)
  for (let i = 0, px = 0; i < data.length; i += 4, px += 1) {
    luminance[px] =
      data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722
  }

  const gradientMap = buildGradientMap(luminance, width, height)
  const laplacianMap = buildLaplacianMap(luminance, width, height)
  const brightness = average(luminance)
  const contrast = standardDeviation(luminance, brightness)
  const edgeStrength = average(gradientMap)
  const laplacianStrength = average(laplacianMap)

  const borderStats = collectBorderStats(
    data,
    luminance,
    gradientMap,
    width,
    height,
  )
  const subjectMask = buildSubjectMask(
    data,
    luminance,
    gradientMap,
    laplacianMap,
    borderStats,
    width,
    height,
  )
  const subjectCoverage = subjectMask.count / (width * height)
  const subjectCentered = isSubjectCentered(subjectMask, width, height)
  const detailConfidence = getDetailConfidence(
    edgeStrength,
    laplacianStrength,
    subjectMask.detailPixelRatio,
  )
  const backgroundUniformity = getBackgroundUniformity(borderStats)
  const backgroundCleanliness = getBackgroundCleanliness(
    borderStats,
    subjectMask.borderCount,
  )

  const blurRisk = clamp01(
    clamp01(1 - edgeStrength / 0.8) * 0.18 +
      clamp01(1 - laplacianStrength / 2.4) * 0.42 +
      clamp01(1 - detailConfidence) * 0.24 +
      clamp01(1 - backgroundCleanliness) * 0.08 -
      backgroundCleanliness * 0.04,
  )
  const darknessRisk = brightness < 85 ? (85 - brightness) / 85 : 0
  const overexposedRisk = brightness > 225 ? (brightness - 225) / 30 : 0
  const flatLightingRisk = contrast < 28 ? (28 - contrast) / 28 : 0
  const lightingRisk = clamp01(
    darknessRisk * 0.55 +
      overexposedRisk * 0.12 +
      flatLightingRisk * 0.25 +
      clamp01(1 - backgroundUniformity) * 0.22 +
      clamp01(1 - backgroundCleanliness) * 0.08,
  )

  return {
    blurRisk: round3(blurRisk),
    lightingRisk: round3(lightingRisk),
    subjectCoverage: round3(subjectCoverage),
    subjectCentered,
    subjectCenterX: round3(subjectMask.centroidX / width),
    subjectCenterY: round3(subjectMask.centroidY / height),
    detailConfidence: round3(detailConfidence),
    backgroundUniformity: round3(backgroundUniformity),
    backgroundCleanliness: round3(backgroundCleanliness),
  }
}

function buildGradientMap(
  luminance: Float32Array,
  width: number,
  height: number,
): Float32Array {
  const map = new Float32Array(width * height)

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = y * width + x
      const horizontal =
        x < width - 1 ? Math.abs(luminance[i] - luminance[i + 1]) : 0
      const vertical =
        y < height - 1 ? Math.abs(luminance[i] - luminance[i + width]) : 0
      map[i] = (horizontal + vertical) / 2
    }
  }

  return map
}

function buildLaplacianMap(
  luminance: Float32Array,
  width: number,
  height: number,
): Float32Array {
  const map = new Float32Array(width * height)

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const i = y * width + x
      const laplacian =
        4 * luminance[i] -
        luminance[i - 1] -
        luminance[i + 1] -
        luminance[i - width] -
        luminance[i + width]
      map[i] = Math.abs(laplacian)
    }
  }

  return map
}

function collectBorderStats(
  data: Uint8ClampedArray,
  luminance: Float32Array,
  gradientMap: Float32Array,
  width: number,
  height: number,
): BorderStats {
  const bandSize = Math.min(
    Math.max(1, Math.round(Math.min(width, height) * 0.08)),
    MAX_BORDER_BAND,
  )
  let totalLuma = 0
  let totalRed = 0
  let totalGreen = 0
  let totalBlue = 0
  let totalEdge = 0
  let pixelCount = 0

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!isWithinBorderBand(x, y, width, height, bandSize)) continue
      const i = y * width + x
      const dataIndex = i * 4
      totalLuma += luminance[i]
      totalRed += data[dataIndex]
      totalGreen += data[dataIndex + 1]
      totalBlue += data[dataIndex + 2]
      totalEdge += gradientMap[i]
      pixelCount += 1
    }
  }

  if (pixelCount === 0) {
    return {
      averageLuminance: 255,
      averageRed: 255,
      averageGreen: 255,
      averageBlue: 255,
      luminanceStd: 0,
      colorDeviation: 0,
      edgeStrength: 0,
      bandSize,
      pixelCount: 0,
    }
  }

  const averageLuminance = totalLuma / pixelCount
  const averageRed = totalRed / pixelCount
  const averageGreen = totalGreen / pixelCount
  const averageBlue = totalBlue / pixelCount

  let luminanceVarianceTotal = 0
  let colorDeviationTotal = 0
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!isWithinBorderBand(x, y, width, height, bandSize)) continue
      const i = y * width + x
      const dataIndex = i * 4
      const delta = luminance[i] - averageLuminance
      luminanceVarianceTotal += delta * delta
      colorDeviationTotal +=
        (Math.abs(data[dataIndex] - averageRed) +
          Math.abs(data[dataIndex + 1] - averageGreen) +
          Math.abs(data[dataIndex + 2] - averageBlue)) /
        3
    }
  }

  return {
    averageLuminance,
    averageRed,
    averageGreen,
    averageBlue,
    luminanceStd: Math.sqrt(luminanceVarianceTotal / pixelCount),
    colorDeviation: colorDeviationTotal / pixelCount,
    edgeStrength: totalEdge / pixelCount,
    bandSize,
    pixelCount,
  }
}

function buildSubjectMask(
  data: Uint8ClampedArray,
  luminance: Float32Array,
  gradientMap: Float32Array,
  laplacianMap: Float32Array,
  borderStats: BorderStats,
  width: number,
  height: number,
): SubjectMaskSummary {
  const dynamicThreshold = Math.max(
    BACKGROUND_DIFF_THRESHOLD,
    borderStats.luminanceStd * 1.7 + borderStats.colorDeviation * 0.8,
  )
  const detailThreshold = Math.max(
    8,
    borderStats.edgeStrength * 2 + borderStats.luminanceStd * 0.3,
  )
  let count = 0
  let totalX = 0
  let totalY = 0
  let borderCount = 0
  let detailPixels = 0

  for (let i = 0; i < luminance.length; i += 1) {
    const x = i % width
    const y = Math.floor(i / width)
    const dataIndex = i * 4
    const luminanceDiff = Math.abs(luminance[i] - borderStats.averageLuminance)
    const colorDiff =
      (Math.abs(data[dataIndex] - borderStats.averageRed) +
        Math.abs(data[dataIndex + 1] - borderStats.averageGreen) +
        Math.abs(data[dataIndex + 2] - borderStats.averageBlue)) /
      3
    const separation = Math.max(luminanceDiff, colorDiff * 0.9)
    if (separation < dynamicThreshold) continue

    count += 1
    totalX += x
    totalY += y
    if (isWithinBorderBand(x, y, width, height, borderStats.bandSize)) {
      borderCount += 1
    }

    if (
      gradientMap[i] >= detailThreshold ||
      laplacianMap[i] >= detailThreshold * 2.2
    ) {
      detailPixels += 1
    }
  }

  return {
    count,
    // A missing foreground mask means localization is uncertain, not that the
    // subject is in the top-left corner. A neutral center fallback prevents a
    // guarded crop from cutting toward an arbitrary edge.
    centroidX: count > 0 ? totalX / count : width / 2,
    centroidY: count > 0 ? totalY / count : height / 2,
    borderCount,
    detailPixelRatio: count > 0 ? detailPixels / count : 0,
  }
}

function isSubjectCentered(
  subjectMask: SubjectMaskSummary,
  width: number,
  height: number,
): boolean {
  if (subjectMask.count === 0) return false
  const dx = Math.abs(subjectMask.centroidX - width / 2) / width
  const dy = Math.abs(subjectMask.centroidY - height / 2) / height
  return dx <= 0.18 && dy <= 0.18
}

function average(values: Float32Array): number {
  let total = 0
  for (const value of values) total += value
  return values.length > 0 ? total / values.length : 0
}

function standardDeviation(values: Float32Array, mean: number): number {
  let total = 0
  for (const value of values) {
    const delta = value - mean
    total += delta * delta
  }
  return values.length > 0 ? Math.sqrt(total / values.length) : 0
}

function getDetailConfidence(
  edgeStrength: number,
  laplacianStrength: number,
  detailPixelRatio: number,
): number {
  const edgeScore = clamp01(edgeStrength / 0.8)
  const laplacianScore = clamp01(laplacianStrength / 2.4)
  const detailDensityScore = clamp01(detailPixelRatio / 0.012)

  return clamp01(
    edgeScore * 0.25 + laplacianScore * 0.45 + detailDensityScore * 0.3,
  )
}

function getBackgroundUniformity(borderStats: BorderStats): number {
  const luminanceVariationRisk = clamp01(borderStats.luminanceStd / 20)
  const colorVariationRisk = clamp01(borderStats.colorDeviation / 18)
  const textureRisk = clamp01(borderStats.edgeStrength / 10)

  return clamp01(
    1 -
      (luminanceVariationRisk * 0.45 +
        colorVariationRisk * 0.3 +
        textureRisk * 0.25),
  )
}

function getBackgroundCleanliness(
  borderStats: BorderStats,
  subjectBorderCount: number,
): number {
  const uniformity = getBackgroundUniformity(borderStats)
  const borderIntrusionRatio =
    borderStats.pixelCount > 0 ? subjectBorderCount / borderStats.pixelCount : 1
  const borderIntrusionRisk = clamp01(borderIntrusionRatio / 0.12)

  return clamp01(uniformity - borderIntrusionRisk * 0.3)
}

function isWithinBorderBand(
  x: number,
  y: number,
  width: number,
  height: number,
  bandSize: number,
): boolean {
  return (
    x < bandSize ||
    y < bandSize ||
    x >= width - bandSize ||
    y >= height - bandSize
  )
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000
}
