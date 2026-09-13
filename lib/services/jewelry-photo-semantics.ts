export type JewelryPhotoSemanticRole =
  | 'jewelry'
  | 'label_or_packaging'
  | 'uncertain'

export interface JewelryPhotoSemanticInput {
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

export interface JewelryPhotoSemanticResult {
  role: JewelryPhotoSemanticRole
  confidence: number
  reasons: string[]
  canAttemptCrop: boolean
}

export function classifyJewelryPhotoSemantics(
  input: JewelryPhotoSemanticInput,
): JewelryPhotoSemanticResult {
  const reasons: string[] = []
  const tinySubject = input.subjectCoverage < 0.08
  const smallSubject =
    input.subjectCoverage >= 0.025 && input.subjectCoverage < 0.22
  const packagingDominates =
    input.backgroundDistractionRisk >= 0.65 ||
    input.backgroundUniformity <= 0.35 ||
    input.backgroundCleanliness <= 0.35

  if (tinySubject) reasons.push('jewelry subject is too small in the frame')
  if (packagingDominates) {
    reasons.push('background or packaging dominates the image')
  }

  // Low subject coverage plus a busy card/box is not enough to call an image a
  // label. Small earrings on a Bomb Party display produce the same signals.
  // Reserve the hard label result for a measurable, off-center foreground
  // region; zero-coverage and centered cases need workflow confirmation.
  const strongLabelSignal =
    tinySubject &&
    packagingDominates &&
    !input.subjectCentered &&
    input.subjectCoverage >= 0.015

  if (strongLabelSignal) {
    return {
      role: 'label_or_packaging',
      confidence: 0.9,
      reasons,
      canAttemptCrop: false,
    }
  }

  const reviewableDisplayCropCandidate =
    tinySubject &&
    packagingDominates &&
    input.detailConfidence >= 0.6 &&
    input.blurRisk <= 0.45 &&
    input.detailRisk <= 0.55
  if (reviewableDisplayCropCandidate) {
    return {
      role: 'uncertain',
      confidence: 0.58,
      reasons: ['small boxed display jewelry needs workflow confirmation'],
      canAttemptCrop: true,
    }
  }

  const boxedDisplayCropCandidate =
    packagingDominates &&
    input.subjectCentered &&
    input.subjectCoverage >= 0.08 &&
    input.detailConfidence >= 0.65 &&
    input.blurRisk <= 0.45 &&
    input.detailRisk <= 0.55

  if (boxedDisplayCropCandidate) {
    return {
      role: 'uncertain',
      confidence: 0.68,
      reasons: ['boxed display jewelry appears clear enough'],
      canAttemptCrop: true,
    }
  }

  const clearSmallCropCandidate =
    smallSubject &&
    input.subjectCentered &&
    input.detailConfidence >= 0.7 &&
    input.blurRisk <= 0.25 &&
    input.detailRisk <= 0.3 &&
    input.backgroundDistractionRisk <= 0.25 &&
    input.backgroundCleanliness >= 0.75

  if (clearSmallCropCandidate) {
    return {
      role: 'uncertain',
      confidence: 0.72,
      reasons: ['jewelry appears clear but small'],
      canAttemptCrop: true,
    }
  }

  const jewelryForward =
    input.subjectCoverage >= 0.24 &&
    input.subjectCentered &&
    input.blurRisk <= 0.45 &&
    input.detailRisk <= 0.45 &&
    input.backgroundDistractionRisk <= 0.35 &&
    input.backgroundCleanliness >= 0.55

  if (jewelryForward) {
    return {
      role: 'jewelry',
      confidence: 0.86,
      reasons: [],
      canAttemptCrop: false,
    }
  }

  return {
    role: 'uncertain',
    confidence: 0.5,
    reasons: reasons.length ? reasons : ['photo needs human confirmation'],
    canAttemptCrop: false,
  }
}

export function canUseConfirmedJewelryFront(
  input: JewelryPhotoSemanticInput,
  _semantic: JewelryPhotoSemanticResult,
  confirmedJewelryFront: boolean,
): boolean {
  if (!confirmedJewelryFront) return false
  return (
    Math.min(input.width, input.height) >= 720 &&
    input.width * input.height >= 700_000 &&
    input.blurRisk <= 0.45 &&
    input.detailRisk <= 0.55 &&
    input.detailConfidence >= 0.6
  )
}
