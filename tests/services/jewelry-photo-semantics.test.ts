import { describe, expect, it } from 'vitest'

import {
  canUseConfirmedJewelryFront,
  classifyJewelryPhotoSemantics,
} from '@/lib/services/jewelry-photo-semantics'

describe('jewelry photo semantics', () => {
  it('accepts a clean centered jewelry-forward image', () => {
    expect(
      classifyJewelryPhotoSemantics({
        width: 1800,
        height: 1800,
        blurRisk: 0.04,
        lightingRisk: 0.04,
        detailRisk: 0.04,
        backgroundDistractionRisk: 0.08,
        subjectCoverage: 0.36,
        subjectCentered: true,
        detailConfidence: 0.94,
        backgroundUniformity: 0.92,
        backgroundCleanliness: 0.9,
      }),
    ).toMatchObject({
      role: 'jewelry',
      canAttemptCrop: false,
    })
  })

  it('flags a box/card photo where jewelry is tiny and packaging dominates', () => {
    expect(
      classifyJewelryPhotoSemantics({
        width: 768,
        height: 1024,
        blurRisk: 0.059,
        lightingRisk: 0.235,
        detailRisk: 0,
        backgroundDistractionRisk: 0.801,
        subjectCoverage: 0.042,
        subjectCentered: false,
        detailConfidence: 1,
        backgroundUniformity: 0.231,
        backgroundCleanliness: 0.178,
      }),
    ).toMatchObject({
      role: 'label_or_packaging',
      canAttemptCrop: false,
      reasons: expect.arrayContaining([
        'jewelry subject is too small in the frame',
        'background or packaging dominates the image',
      ]),
    })
  })

  it('does not classify a clear centered boxed display photo as packaging only', () => {
    expect(
      classifyJewelryPhotoSemantics({
        width: 1512,
        height: 2016,
        blurRisk: 0.12,
        lightingRisk: 0.28,
        detailRisk: 0.22,
        backgroundDistractionRisk: 0.72,
        subjectCoverage: 0.14,
        subjectCentered: true,
        detailConfidence: 0.78,
        backgroundUniformity: 0.3,
        backgroundCleanliness: 0.38,
      }),
    ).toMatchObject({
      role: 'uncertain',
      canAttemptCrop: true,
      reasons: expect.arrayContaining(['boxed display jewelry appears clear enough']),
    })
  })

  it('marks a clear but small centered subject as a crop candidate instead of auto-approving it', () => {
    expect(
      classifyJewelryPhotoSemantics({
        width: 1800,
        height: 1800,
        blurRisk: 0.05,
        lightingRisk: 0.05,
        detailRisk: 0.08,
        backgroundDistractionRisk: 0.12,
        subjectCoverage: 0.16,
        subjectCentered: true,
        detailConfidence: 0.91,
        backgroundUniformity: 0.9,
        backgroundCleanliness: 0.88,
      }),
    ).toMatchObject({
      role: 'uncertain',
      canAttemptCrop: true,
      reasons: expect.arrayContaining(['jewelry appears clear but small']),
    })
  })

  it('keeps a high-detail tiny boxed display reviewable instead of falsely labeling it', () => {
    const input = {
      width: 768,
      height: 1024,
      blurRisk: 0.04,
      lightingRisk: 0.2,
      detailRisk: 0,
      backgroundDistractionRisk: 0.69,
      subjectCoverage: 0.049,
      subjectCentered: true,
      detailConfidence: 1,
      backgroundUniformity: 0.31,
      backgroundCleanliness: 0.31,
    }
    const semantic = classifyJewelryPhotoSemantics(input)

    expect(semantic).toMatchObject({
      role: 'uncertain',
      canAttemptCrop: true,
    })
    expect(canUseConfirmedJewelryFront(input, semantic, true)).toBe(true)
  })

  it('keeps packaging classification informational once a clear photo role is confirmed', () => {
    const input = {
      width: 768,
      height: 1024,
      blurRisk: 0.059,
      lightingRisk: 0.235,
      detailRisk: 0,
      backgroundDistractionRisk: 0.801,
      subjectCoverage: 0.042,
      subjectCentered: false,
      detailConfidence: 1,
      backgroundUniformity: 0.231,
      backgroundCleanliness: 0.178,
    }
    const semantic = classifyJewelryPhotoSemantics(input)

    expect(semantic.role).toBe('label_or_packaging')
    expect(canUseConfirmedJewelryFront(input, semantic, true)).toBe(true)
  })
})
