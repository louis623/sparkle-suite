import { beforeEach, describe, expect, it, vi } from 'vitest'

const analyzeServerImageQualityMock = vi.fn()
const uploadJewelryPhotoMock = vi.fn()
const uploadCatalogDesignSourcePhotoMock = vi.fn()
const uploadStagedOriginalPhotoMock = vi.fn()
const removeCatalogDesignPhotoAssetsMock = vi.fn()
const createGuardedJewelryPhotoCropMock = vi.fn()

vi.mock('@/lib/services/server-image-quality', () => ({
  analyzeServerImageQuality: (...args: unknown[]) =>
    analyzeServerImageQualityMock(...args),
}))

vi.mock('@/lib/services/storage', () => ({
  uploadJewelryPhoto: (...args: unknown[]) => uploadJewelryPhotoMock(...args),
  uploadCatalogDesignSourcePhoto: (...args: unknown[]) =>
    uploadCatalogDesignSourcePhotoMock(...args),
  uploadStagedOriginalPhoto: (...args: unknown[]) =>
    uploadStagedOriginalPhotoMock(...args),
  removeCatalogDesignPhotoAssets: (...args: unknown[]) =>
    removeCatalogDesignPhotoAssetsMock(...args),
}))

vi.mock('@/lib/services/jewelry-photo-crop', () => ({
  createGuardedJewelryPhotoCrop: (...args: unknown[]) =>
    createGuardedJewelryPhotoCropMock(...args),
}))

vi.mock('@/lib/photoroom/config', () => ({
  getPhotoroomConfig: () => null,
}))

import { processRepListingPhotoUrl } from '@/lib/services/listing-photo-processing'
import { prepareDesignSourcePhoto } from '@/lib/services/design-source-photo-processing'

function makeImageResponse(bytes = new Uint8Array([1, 2, 3])) {
  return new Response(Buffer.from(bytes), {
    status: 200,
    headers: { 'content-type': 'image/jpeg' },
  })
}

const labelCardAnalysis = {
  contentType: 'image/jpeg',
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

const smallJewelryAnalysis = {
  contentType: 'image/jpeg',
  width: 1800,
  height: 1800,
  blurRisk: 0.05,
  lightingRisk: 0.05,
  detailRisk: 0.1,
  backgroundDistractionRisk: 0.08,
  subjectCoverage: 0.12,
  subjectCentered: true,
  detailConfidence: 0.9,
  backgroundUniformity: 0.96,
  backgroundCleanliness: 0.95,
}

const croppedJewelryAnalysis = {
  ...smallJewelryAnalysis,
  width: 1200,
  height: 1200,
  subjectCoverage: 0.34,
}

const boxedDisplayAnalysis = {
  contentType: 'image/jpeg',
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
}

const boxedDisplayCroppedAnalysis = {
  ...boxedDisplayAnalysis,
  width: 1300,
  height: 1300,
  backgroundDistractionRisk: 0.42,
  subjectCoverage: 0.3,
  backgroundUniformity: 0.55,
  backgroundCleanliness: 0.58,
}

const clearJewelryAnalysis = {
  ...boxedDisplayAnalysis,
  backgroundDistractionRisk: 0.12,
  subjectCoverage: 0.34,
  subjectCentered: true,
  backgroundUniformity: 0.9,
  backgroundCleanliness: 0.9,
}

const confirmedBoxedDisplayAnalysisClassifiedAsPackaging = {
  contentType: 'image/jpeg',
  width: 1512,
  height: 2016,
  blurRisk: 0.12,
  lightingRisk: 0.28,
  detailRisk: 0.22,
  backgroundDistractionRisk: 0.86,
  subjectCoverage: 0.07,
  subjectCentered: false,
  detailConfidence: 0.78,
  backgroundUniformity: 0.22,
  backgroundCleanliness: 0.22,
}

const workflowAcceptedPhotoWithSubjectivePreflightFailures = {
  contentType: 'image/jpeg',
  width: 640,
  height: 640,
  blurRisk: 0.9,
  lightingRisk: 0.88,
  detailRisk: 0.9,
  backgroundDistractionRisk: 0.9,
  subjectCoverage: 0.04,
  subjectCentered: true,
  detailConfidence: 0.82,
  backgroundUniformity: 0.2,
  backgroundCleanliness: 0.2,
}

describe('listing/design photo semantic integration', () => {
  beforeEach(() => {
    analyzeServerImageQualityMock.mockReset()
    uploadJewelryPhotoMock.mockReset()
    uploadCatalogDesignSourcePhotoMock.mockReset()
    uploadStagedOriginalPhotoMock.mockReset()
    removeCatalogDesignPhotoAssetsMock.mockReset()
    createGuardedJewelryPhotoCropMock.mockReset()
  })

  it('rejects an unconfirmed listing photo only when its usable-photo quality fails', async () => {
    analyzeServerImageQualityMock.mockResolvedValueOnce(labelCardAnalysis)

    await expect(
      processRepListingPhotoUrl(
        {
          repId: 'rep-1',
          sourceImageUrl: 'https://images.example.com/card-back.jpg',
          filenameStem: 'card-back',
        },
        { fetch: vi.fn().mockResolvedValueOnce(makeImageResponse()) },
      ),
    ).rejects.toMatchObject({ code: 'LISTING_PHOTO_PREFLIGHT_FAILED' })
    expect(uploadJewelryPhotoMock).not.toHaveBeenCalled()
  })

  it('does not reject a workflow-confirmed clear photo merely because packaging is visible', async () => {
    analyzeServerImageQualityMock.mockResolvedValueOnce(
      confirmedBoxedDisplayAnalysisClassifiedAsPackaging,
    )
    uploadJewelryPhotoMock.mockResolvedValueOnce('https://cdn.example.com/confirmed.jpg')
    await expect(processRepListingPhotoUrl(
      { repId: 'rep-1', sourceImageUrl: 'https://images.example.com/confirmed-boxed-display.jpg', filenameStem: 'confirmed-boxed-display' },
      { fetch: vi.fn().mockResolvedValueOnce(makeImageResponse()), confirmedJewelryFront: true },
    )).resolves.toMatchObject({ photoUrl: 'https://cdn.example.com/confirmed.jpg' })
    expect(uploadJewelryPhotoMock).toHaveBeenCalledTimes(1)
  })

  it('uses one deterministic upsert path for retries of the same listing mutation', async () => {
    analyzeServerImageQualityMock.mockResolvedValueOnce(
      clearJewelryAnalysis,
    )
    uploadJewelryPhotoMock.mockResolvedValueOnce(
      'https://cdn.example.com/deterministic-listing.jpg',
    )

    await processRepListingPhotoUrl(
      {
        repId: 'rep-1',
        sourceImageUrl: 'https://images.example.com/confirmed-boxed-display.jpg',
        filenameStem: 'ER59000-listing-photo',
        mutationAssetKey: 'stable-signature',
      },
      {
        fetch: vi.fn().mockResolvedValueOnce(makeImageResponse()),
        confirmedJewelryFront: true,
      },
    )

    expect(uploadJewelryPhotoMock).toHaveBeenCalledWith(
      'rep-1',
      expect.stringMatching(/^data:image\/jpeg;base64,/),
      'ER59000-listing-photo-stable-signature-source',
      { upsert: true },
    )
  })

  it('does not let workflow confirmation override critical quality failures', async () => {
    analyzeServerImageQualityMock.mockResolvedValueOnce(
      workflowAcceptedPhotoWithSubjectivePreflightFailures,
    )
    await expect(processRepListingPhotoUrl(
      { repId: 'rep-1', sourceImageUrl: 'https://images.example.com/rep-approved-boxed-display.jpg', filenameStem: 'rep-approved-boxed-display' },
      { fetch: vi.fn().mockResolvedValueOnce(makeImageResponse()), confirmedJewelryFront: true },
    )).rejects.toMatchObject({ code: 'LISTING_PHOTO_PREFLIGHT_FAILED' })
    expect(uploadJewelryPhotoMock).not.toHaveBeenCalled()
  })

  it('rejects an unconfirmed new-design photo only when its usable-photo quality fails', async () => {
    analyzeServerImageQualityMock.mockResolvedValueOnce(labelCardAnalysis)

    await expect(
      prepareDesignSourcePhoto({
        repId: 'rep-1',
        designId: 'design-card',
        filenameStem: 'card-back',
        sourceImageDataUrl: 'data:image/jpeg;base64,AQID',
      }),
    ).rejects.toMatchObject({ code: 'PHOTO_PREFLIGHT_FAILED' })
    expect(uploadJewelryPhotoMock).not.toHaveBeenCalled()
    expect(uploadCatalogDesignSourcePhotoMock).not.toHaveBeenCalled()
  })

  it('uses a guarded crop for clear small listing jewelry instead of rejecting the original framing', async () => {
    analyzeServerImageQualityMock.mockResolvedValueOnce(smallJewelryAnalysis)
    createGuardedJewelryPhotoCropMock.mockResolvedValueOnce({
      bytes: new Uint8Array([4, 5, 6]),
      selectedSource: 'cropped',
      analysis: croppedJewelryAnalysis,
      preflight: {
        passed: true,
        score: 90,
        issues: [],
        coachingMessages: ['crop passed'],
      },
      semantic: {
        role: 'jewelry',
        confidence: 0.82,
        reasons: ['cropped jewelry subject is clearer'],
        canAttemptCrop: false,
      },
    })
    uploadJewelryPhotoMock
      .mockResolvedValueOnce('https://cdn.example.com/original.jpg')
      .mockResolvedValueOnce('https://cdn.example.com/cropped.jpg')

    const result = await processRepListingPhotoUrl(
      {
        repId: 'rep-1',
        sourceImageUrl: 'https://images.example.com/small-jewelry.jpg',
        filenameStem: 'small-jewelry',
      },
      { fetch: vi.fn().mockResolvedValueOnce(makeImageResponse()) },
    )

    expect(createGuardedJewelryPhotoCropMock).toHaveBeenCalled()
    expect(uploadJewelryPhotoMock).toHaveBeenCalledTimes(2)
    expect(uploadJewelryPhotoMock).toHaveBeenNthCalledWith(
      2,
      'rep-1',
      expect.stringMatching(/^data:image\/jpeg;base64,/),
      expect.stringMatching(/^small-jewelry-[0-9a-f-]+-cropped$/),
    )
    expect(result).toMatchObject({
      photoUrl: 'https://cdn.example.com/cropped.jpg',
      originalPhotoUrl: 'https://cdn.example.com/original.jpg',
      selectedSource: 'cropped',
      image: {
        subjectCoverage: 0.34,
      },
    })
  })

  it('accepts boxed display listing photos when the jewelry is clear', async () => {
    analyzeServerImageQualityMock.mockResolvedValueOnce(boxedDisplayAnalysis)
    createGuardedJewelryPhotoCropMock.mockResolvedValueOnce({
      bytes: new Uint8Array([7, 8, 9]),
      selectedSource: 'cropped',
      analysis: boxedDisplayCroppedAnalysis,
      preflight: {
        passed: true,
        score: 78,
        issues: [],
        coachingMessages: ['boxed display passed'],
      },
      semantic: {
        role: 'jewelry',
        confidence: 0.75,
        reasons: ['boxed display jewelry is clear'],
        canAttemptCrop: false,
      },
    })
    uploadJewelryPhotoMock
      .mockResolvedValueOnce('https://cdn.example.com/boxed-original.jpg')
      .mockResolvedValueOnce('https://cdn.example.com/boxed-cropped.jpg')

    const result = await processRepListingPhotoUrl(
      {
        repId: 'rep-1',
        sourceImageUrl: 'https://images.example.com/boxed-earrings.jpg',
        filenameStem: 'boxed-earrings',
      },
      { fetch: vi.fn().mockResolvedValueOnce(makeImageResponse()) },
    )

    expect(result).toMatchObject({
      photoUrl: 'https://cdn.example.com/boxed-cropped.jpg',
      originalPhotoUrl: 'https://cdn.example.com/boxed-original.jpg',
      selectedSource: 'cropped',
    })
  })

  it('accepts boxed display new design photos when the jewelry is clear', async () => {
    analyzeServerImageQualityMock.mockResolvedValueOnce(boxedDisplayAnalysis)
    createGuardedJewelryPhotoCropMock.mockResolvedValueOnce({
      bytes: new Uint8Array([7, 8, 9]),
      selectedSource: 'cropped',
      analysis: boxedDisplayCroppedAnalysis,
      preflight: {
        passed: true,
        score: 78,
        issues: [],
        coachingMessages: ['boxed display passed'],
      },
      semantic: {
        role: 'jewelry',
        confidence: 0.75,
        reasons: ['boxed display jewelry is clear'],
        canAttemptCrop: false,
      },
    })
    uploadStagedOriginalPhotoMock.mockResolvedValueOnce({
      objectPath: 'rep-1/originals/boxed-earrings-original.jpg',
      signedUrl: 'https://signed.example.com/boxed-earrings-original.jpg',
    })
    uploadCatalogDesignSourcePhotoMock.mockResolvedValueOnce({
      objectPath: 'rep-1/designs/design-boxed/boxed-earrings-cropped.jpg',
      publicUrl: 'https://cdn.example.com/boxed-design.jpg',
    })

    const result = await prepareDesignSourcePhoto({
      repId: 'rep-1',
      designId: 'design-boxed',
      filenameStem: 'boxed-earrings',
      sourceImageDataUrl: 'data:image/jpeg;base64,AQID',
    })

    expect(result).toMatchObject({
      publicPhotoUrl: 'https://cdn.example.com/boxed-design.jpg',
      selectedSource: 'cropped',
      stagedOriginal: {
        objectPath: 'rep-1/originals/boxed-earrings-original.jpg',
      },
    })
  })

  it('does not let workflow confirmation override critical new-design failures', async () => {
    analyzeServerImageQualityMock.mockResolvedValueOnce(
      workflowAcceptedPhotoWithSubjectivePreflightFailures,
    )
    await expect(prepareDesignSourcePhoto(
      {
        repId: 'rep-1',
        designId: 'design-approved',
        filenameStem: 'rep-approved-design',
        sourceImageDataUrl: 'data:image/jpeg;base64,AQID',
      },
      { confirmedJewelryFront: true },
    )).rejects.toMatchObject({ code: 'PHOTO_PREFLIGHT_FAILED' })
    expect(uploadStagedOriginalPhotoMock).not.toHaveBeenCalled()
  })

  it('uses a guarded crop for clear small new design photos while staging the untouched original', async () => {
    analyzeServerImageQualityMock.mockResolvedValueOnce(smallJewelryAnalysis)
    createGuardedJewelryPhotoCropMock.mockResolvedValueOnce({
      bytes: new Uint8Array([4, 5, 6]),
      selectedSource: 'cropped',
      analysis: croppedJewelryAnalysis,
      preflight: {
        passed: true,
        score: 90,
        issues: [],
        coachingMessages: ['crop passed'],
      },
      semantic: {
        role: 'jewelry',
        confidence: 0.82,
        reasons: ['cropped jewelry subject is clearer'],
        canAttemptCrop: false,
      },
    })
    uploadStagedOriginalPhotoMock.mockResolvedValueOnce({
      objectPath: 'rep-1/originals/small-design-original.jpg',
      signedUrl: 'https://signed.example.com/small-design-original.jpg',
    })
    uploadCatalogDesignSourcePhotoMock.mockResolvedValueOnce({
      objectPath: 'rep-1/designs/design-small/small-design-cropped.jpg',
      publicUrl: 'https://cdn.example.com/design-cropped.jpg',
    })

    const result = await prepareDesignSourcePhoto({
      repId: 'rep-1',
      designId: 'design-small',
      filenameStem: 'small-design',
      sourceImageDataUrl: 'data:image/jpeg;base64,AQID',
    })

    expect(createGuardedJewelryPhotoCropMock).toHaveBeenCalled()
    expect(result).toMatchObject({
      publicPhotoUrl: 'https://cdn.example.com/design-cropped.jpg',
      selectedSource: 'cropped',
      analysis: {
        subjectCoverage: 0.34,
      },
    })
  })
})
