import { beforeEach, describe, expect, it, vi } from 'vitest'
import sharp from 'sharp'

const uploadJewelryPhotoMock = vi.fn()
const getPhotoroomConfigMock = vi.fn()
const executePhotoEnhancementMock = vi.fn()
const inspectEnhancedPhotoOutputMock = vi.fn()

vi.mock('@/lib/services/storage', () => ({
  uploadJewelryPhoto: (...args: unknown[]) => uploadJewelryPhotoMock(...args),
}))

vi.mock('@/lib/photoroom/config', () => ({
  getPhotoroomConfig: (...args: unknown[]) => getPhotoroomConfigMock(...args),
}))

vi.mock('@/lib/services/photo-enhancement', () => ({
  executePhotoEnhancement: (...args: unknown[]) =>
    executePhotoEnhancementMock(...args),
}))

vi.mock('@/lib/services/photo-enhancement-qa', () => ({
  inspectEnhancedPhotoOutput: (...args: unknown[]) =>
    inspectEnhancedPhotoOutputMock(...args),
}))

import { ServiceError } from '@/lib/services/errors'
import {
  listingPhotoEnhancementAssetId,
  processRepListingPhotoUrl,
} from '@/lib/services/listing-photo-processing'

type FixtureMode = 'cleanLightBox' | 'dimFlat' | 'offCenter'

function scale(value: number, base: number, target: number) {
  return Math.max(1, Math.round((value / base) * target))
}

async function makePngBytes(
  width: number,
  height: number,
  mode: FixtureMode = 'cleanLightBox',
): Promise<Uint8Array> {
  if (mode === 'dimFlat') {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
        <defs>
          <radialGradient id="bg" cx="50%" cy="50%" r="75%">
            <stop offset="0%" stop-color="#343434" />
            <stop offset="100%" stop-color="#363636" />
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#bg)" />
      </svg>
    `

    return new Uint8Array(await sharp(Buffer.from(svg)).png().toBuffer())
  }

  const base = mode === 'offCenter'
    ? {
        left: 140,
        top: 220,
        subjectWidth: 520,
        subjectHeight: 520,
        stripeCount: 6,
        bandCount: 5,
        stripeStep: 70,
        bandStep: 88,
        outerRadius: 70,
      }
    : {
        left: 360,
        top: 360,
        subjectWidth: 1080,
        subjectHeight: 1080,
        stripeCount: 12,
        bandCount: 10,
        stripeStep: 80,
        bandStep: 92,
        outerRadius: 120,
      }

  const subjectLeft = scale(base.left, 1800, width)
  const subjectTop = scale(base.top, 1800, height)
  const subjectWidth = scale(base.subjectWidth, 1800, width)
  const subjectHeight = scale(base.subjectHeight, 1800, height)
  const outerRadius = scale(base.outerRadius, 1800, width)
  const innerInset = scale(70, 1800, width)
  const coreInset = scale(140, 1800, width)
  const innerRadius = scale(120, 1800, width)
  const coreRadius = scale(90, 1800, width)
  const stripeWidth = scale(26, 1800, width)
  const stripeHeight = Math.max(1, subjectHeight - scale(90, 1800, height))
  const stripeTop = subjectTop + scale(45, 1800, height)
  const bandLeft = subjectLeft + scale(55, 1800, width)
  const bandWidth = Math.max(1, subjectWidth - scale(110, 1800, width))
  const bandHeight = scale(12, 1800, height)

  const stripes = Array.from({ length: base.stripeCount }, (_, index) => {
    const x =
      subjectLeft +
      scale(30, 1800, width) +
      index * scale(base.stripeStep, 1800, width)

    return `<rect x="${x}" y="${stripeTop}" width="${stripeWidth}" height="${stripeHeight}" rx="${Math.max(1, Math.round(stripeWidth / 2))}" fill="#d9d9d9" opacity="0.95" />`
  }).join('')

  const bands = Array.from({ length: base.bandCount }, (_, index) => {
    const y =
      subjectTop +
      scale(45, 1800, height) +
      index * scale(base.bandStep, 1800, height)

    return `<rect x="${bandLeft}" y="${y}" width="${bandWidth}" height="${bandHeight}" rx="${Math.max(1, Math.round(bandHeight / 2))}" fill="#101010" opacity="0.85" />`
  }).join('')

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#fafafa" />
          <stop offset="100%" stop-color="#efefef" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg)" />
      <rect x="${subjectLeft}" y="${subjectTop}" width="${subjectWidth}" height="${subjectHeight}" rx="${outerRadius}" fill="#272727" />
      <rect x="${subjectLeft + innerInset}" y="${subjectTop + innerInset}" width="${Math.max(1, subjectWidth - innerInset * 2)}" height="${Math.max(1, subjectHeight - innerInset * 2)}" rx="${innerRadius}" fill="#ededed" />
      <rect x="${subjectLeft + coreInset}" y="${subjectTop + coreInset}" width="${Math.max(1, subjectWidth - coreInset * 2)}" height="${Math.max(1, subjectHeight - coreInset * 2)}" rx="${coreRadius}" fill="#2e2e2e" />
      ${stripes}
      ${bands}
    </svg>
  `

  return new Uint8Array(await sharp(Buffer.from(svg)).png().toBuffer())
}

function makeImageResponse(bytes: Uint8Array, contentType = 'image/png') {
  return new Response(Buffer.from(bytes), {
    status: 200,
    headers: {
      'content-type': contentType,
    },
  })
}

describe('listingPhotoEnhancementAssetId', () => {
  it('keeps same-item-number finish variants on separate enhancement identities', () => {
    expect(
      listingPhotoEnhancementAssetId({
        repId: 'rep-1',
        filenameStem: 'NK88350-listing-photo',
        variantAssetKey: 'design-nk88350-gold',
      }),
    ).toBe('rep-1:NK88350-listing-photo:design-nk88350-gold')
    expect(
      listingPhotoEnhancementAssetId({
        repId: 'rep-1',
        filenameStem: 'NK88350-listing-photo',
        variantAssetKey: 'design-nk88350-rhodium',
      }),
    ).toBe('rep-1:NK88350-listing-photo:design-nk88350-rhodium')
    expect(
      listingPhotoEnhancementAssetId({
        repId: 'rep-1',
        filenameStem: 'NK88350-listing-photo',
      }),
    ).toBe('rep-1:NK88350-listing-photo')
  })
})

describe('processRepListingPhotoUrl', () => {
  beforeEach(() => {
    uploadJewelryPhotoMock.mockReset()
    getPhotoroomConfigMock.mockReset()
    executePhotoEnhancementMock.mockReset()
    inspectEnhancedPhotoOutputMock.mockReset()
    getPhotoroomConfigMock.mockReturnValue(null)
  })

  it('throws a rewrite-friendly ServiceError when preflight fails on the fetched photo dimensions', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        makeImageResponse(await makePngBytes(640, 640, 'cleanLightBox')),
      )

    await expect(
      processRepListingPhotoUrl(
        {
          repId: 'rep-1',
          sourceImageUrl: 'https://images.example.com/tiny.png',
          filenameStem: 'tiny-listing',
        },
        { fetch: fetchMock },
      ),
    ).rejects.toMatchObject({
      code: 'LISTING_PHOTO_PREFLIGHT_FAILED',
      userMessage: expect.stringContaining('That listing photo needs one more try'),
    })

    expect(uploadJewelryPhotoMock).not.toHaveBeenCalled()
    expect(executePhotoEnhancementMock).not.toHaveBeenCalled()
  })

  it('uploads and returns the normalized original photo URL for a clean light-box-style source when enhancement is not configured', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        makeImageResponse(await makePngBytes(1800, 1800, 'cleanLightBox')),
      )

    uploadJewelryPhotoMock.mockResolvedValueOnce(
      'https://cdn.example.com/listings/rep-1/ring-source.png',
    )

    const result = await processRepListingPhotoUrl(
      {
        repId: 'rep-1',
        sourceImageUrl: 'https://images.example.com/ring.png',
        filenameStem: 'ring-shot',
      },
      { fetch: fetchMock },
    )

    expect(uploadJewelryPhotoMock).toHaveBeenCalledTimes(1)
    expect(uploadJewelryPhotoMock).toHaveBeenCalledWith(
      'rep-1',
      expect.stringMatching(/^data:image\/png;base64,/),
      expect.stringMatching(/^ring-shot-[0-9a-f-]+-source$/),
    )
    expect(result).toMatchObject({
      photoUrl: 'https://cdn.example.com/listings/rep-1/ring-source.png',
      originalPhotoUrl: 'https://cdn.example.com/listings/rep-1/ring-source.png',
      selectedSource: 'original',
      preflight: {
        passed: true,
        score: 100,
        issues: [],
      },
      image: {
        contentType: 'image/png',
        width: 1800,
        height: 1800,
        subjectCentered: true,
      },
      enhancement: {
        attempted: false,
      },
    })
    expect(result.preflight.coachingMessages).toEqual([
      'Nice start - this photo looks clear, bright enough, and framed well for the next step.',
    ])
    expect(result.image.blurRisk).toBeLessThan(0.05)
    expect(result.image.lightingRisk).toBeLessThan(0.05)
    expect(result.image.subjectCoverage).toBeGreaterThan(0.28)
    expect(executePhotoEnhancementMock).not.toHaveBeenCalled()
  })

  it('processes an uploaded data URL without asking fetch for a photo URL', async () => {
    const imageBytes = await makePngBytes(1800, 1800, 'cleanLightBox')
    const dataUrl = `data:image/png;base64,${Buffer.from(imageBytes).toString(
      'base64',
    )}`
    const fetchMock = vi.fn()

    uploadJewelryPhotoMock.mockResolvedValueOnce(
      'https://cdn.example.com/listings/rep-1/florence-boxed-source.png',
    )

    const result = await processRepListingPhotoUrl(
      {
        repId: 'rep-1',
        sourceImageUrl: dataUrl,
        filenameStem: 'florence-boxed',
      },
      { fetch: fetchMock, confirmedJewelryFront: true },
    )

    expect(fetchMock).not.toHaveBeenCalled()
    expect(uploadJewelryPhotoMock).toHaveBeenCalledWith(
      'rep-1',
      expect.stringMatching(/^data:image\/png;base64,/),
      expect.stringMatching(/^florence-boxed-[0-9a-f-]+-source$/),
    )
    expect(result.photoUrl).toBe(
      'https://cdn.example.com/listings/rep-1/florence-boxed-source.png',
    )
  })

  it('does not tell reps to use direct image links when a remote fetch fails', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('nope', {
        status: 403,
      }),
    )

    await expect(
      processRepListingPhotoUrl(
        {
          repId: 'rep-1',
          sourceImageUrl: 'https://images.example.com/blocked.png',
          filenameStem: 'blocked-listing',
        },
        { fetch: fetchMock },
      ),
    ).rejects.toMatchObject({
      code: 'LISTING_PHOTO_FETCH_FAILED',
      userMessage: expect.not.stringMatching(
        /\b(?:photo URL|direct image link|direct link|cloud link)\b/i,
      ),
    })
  })

  it('uses unique public object names when retrying the same listing photo input', async () => {
    const imageBytes = await makePngBytes(1800, 1800, 'cleanLightBox')
    const fetchMock = vi
      .fn()
      .mockImplementation(() => Promise.resolve(makeImageResponse(imageBytes)))

    uploadJewelryPhotoMock
      .mockResolvedValueOnce(
        'https://cdn.example.com/listings/rep-1/ring-source-1.png',
      )
      .mockResolvedValueOnce(
        'https://cdn.example.com/listings/rep-1/ring-source-2.png',
      )

    const input = {
      repId: 'rep-1',
      sourceImageUrl: 'https://images.example.com/ring.png',
      filenameStem: 'retry-ring',
    }

    await processRepListingPhotoUrl(input, { fetch: fetchMock })
    await processRepListingPhotoUrl(input, { fetch: fetchMock })

    const uploadedNames = uploadJewelryPhotoMock.mock.calls.map(
      (call) => call[2],
    )
    expect(uploadedNames[0]).toMatch(
      /^retry-ring-[0-9a-f-]+-source$/,
    )
    expect(uploadedNames[1]).toMatch(
      /^retry-ring-[0-9a-f-]+-source$/,
    )
    expect(uploadedNames[1]).not.toBe(uploadedNames[0])
  })

  it('keeps the original upload when optional Photoroom config throws in production', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        makeImageResponse(await makePngBytes(1800, 1800, 'cleanLightBox')),
      )

    uploadJewelryPhotoMock.mockResolvedValueOnce(
      'https://cdn.example.com/listings/rep-1/ring-source.png',
    )
    getPhotoroomConfigMock.mockImplementationOnce(() => {
      throw new Error(
        'Photoroom configuration is incomplete - cannot start in production',
      )
    })

    const result = await processRepListingPhotoUrl(
      {
        repId: 'rep-1',
        sourceImageUrl: 'https://images.example.com/ring.png',
        filenameStem: 'ring-shot',
      },
      { fetch: fetchMock },
    )

    expect(uploadJewelryPhotoMock).toHaveBeenCalledTimes(1)
    expect(executePhotoEnhancementMock).not.toHaveBeenCalled()
    expect(result).toMatchObject({
      photoUrl: 'https://cdn.example.com/listings/rep-1/ring-source.png',
      originalPhotoUrl: 'https://cdn.example.com/listings/rep-1/ring-source.png',
      enhancedPhotoUrl: null,
      selectedSource: 'original',
      enhancement: {
        attempted: true,
        selected: false,
        decision: 'error',
        errorMessage:
          'Photoroom configuration is incomplete - cannot start in production',
      },
    })
  })

  it('prefers the enhanced upload when Photoroom output lands in review and still clears image preflight', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        makeImageResponse(await makePngBytes(1800, 1800, 'cleanLightBox')),
      )

    getPhotoroomConfigMock.mockReturnValue({
      provider: 'photoroom',
      apiKey: 'phot_test_123',
      baseUrl: 'https://image-api.photoroom.test',
      timeoutMs: 8000,
    })
    uploadJewelryPhotoMock
      .mockResolvedValueOnce(
        'https://cdn.example.com/listings/rep-1/ring-source.png',
      )
      .mockResolvedValueOnce(
        'https://cdn.example.com/listings/rep-1/ring-enhanced.png',
      )
    executePhotoEnhancementMock.mockResolvedValue({
      provider: 'photoroom',
      output: { bytes: await makePngBytes(1800, 1800, 'cleanLightBox') },
      response: {
        statusCode: 200,
        contentType: 'image/png',
        contentLength: 24,
        requestId: 'req-1',
      },
    })
    inspectEnhancedPhotoOutputMock.mockReturnValue({
      assetId: 'rep-1:ring-shot',
      provider: 'photoroom',
      decision: 'review',
      flaggedChecks: [],
      reasons: ['review'],
    })

    const result = await processRepListingPhotoUrl(
      {
        repId: 'rep-1',
        sourceImageUrl: 'https://images.example.com/ring.png',
        filenameStem: 'ring-shot',
      },
      { fetch: fetchMock },
    )

    expect(executePhotoEnhancementMock).toHaveBeenCalledWith(
      {
        assetId: 'rep-1:ring-shot',
        sourceImageUrl: 'https://cdn.example.com/listings/rep-1/ring-source.png',
        output: {
          format: 'png',
          background: 'white',
        },
        operations: {
          removeBackground: true,
          relight: 'preserve-hue-and-saturation',
        },
        context: {
          repId: 'rep-1',
        },
      },
      {
        provider: {
          provider: 'photoroom',
          apiKey: 'phot_test_123',
          baseUrl: 'https://image-api.photoroom.test',
          timeoutMs: 8000,
        },
        fetch: fetchMock,
      },
    )
    const qaInput = inspectEnhancedPhotoOutputMock.mock.calls[0]?.[0]
    expect(qaInput).toEqual(
      expect.objectContaining({
        assetId: 'rep-1:ring-shot',
        provider: 'photoroom',
        outputWidth: 1800,
        outputHeight: 1800,
        contentType: 'image/png',
        subjectCentered: true,
      }),
    )
    expect(qaInput.blurRisk).toBeLessThan(0.05)
    expect(qaInput.lightingRisk).toBeLessThan(0.05)
    expect(qaInput.subjectCoverage).toBeGreaterThan(0.28)
    expect(uploadJewelryPhotoMock).toHaveBeenNthCalledWith(
      2,
      'rep-1',
      expect.stringMatching(/^data:image\/png;base64,/),
      expect.stringMatching(/^ring-shot-[0-9a-f-]+-enhanced$/),
    )
    expect(result).toMatchObject({
      photoUrl: 'https://cdn.example.com/listings/rep-1/ring-enhanced.png',
      originalPhotoUrl: 'https://cdn.example.com/listings/rep-1/ring-source.png',
      enhancedPhotoUrl: 'https://cdn.example.com/listings/rep-1/ring-enhanced.png',
      selectedSource: 'enhanced',
      enhancement: {
        attempted: true,
        selected: true,
        decision: 'review',
        preflight: {
          passed: true,
          score: 100,
          issues: [],
        },
      },
    })
  })

  it('does not share a Photoroom assetId across finish variants of the same item number', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        makeImageResponse(await makePngBytes(1800, 1800, 'cleanLightBox')),
      )
    getPhotoroomConfigMock.mockReturnValue({
      provider: 'photoroom',
      apiKey: 'phot_test_123',
      baseUrl: 'https://image-api.photoroom.test',
      timeoutMs: 8000,
    })
    uploadJewelryPhotoMock.mockResolvedValue(
      'https://cdn.example.com/listings/rep-1/ring-source.png',
    )
    executePhotoEnhancementMock.mockResolvedValue({
      provider: 'photoroom',
      output: { bytes: await makePngBytes(1800, 1800, 'cleanLightBox') },
      response: {
        statusCode: 200,
        contentType: 'image/png',
        contentLength: 24,
        requestId: 'req-1',
      },
    })
    inspectEnhancedPhotoOutputMock.mockReturnValue({
      assetId: 'rep-1:NK88350-listing-photo:design-nk88350-rhodium',
      provider: 'photoroom',
      decision: 'hold',
      flaggedChecks: [],
      reasons: ['hold'],
    })

    await processRepListingPhotoUrl(
      {
        repId: 'rep-1',
        sourceImageUrl: 'https://images.example.com/rhodium.png',
        filenameStem: 'NK88350-listing-photo',
        variantAssetKey: 'design-nk88350-rhodium',
      },
      { fetch: fetchMock },
    )

    expect(executePhotoEnhancementMock).toHaveBeenCalledWith(
      expect.objectContaining({
        assetId: 'rep-1:NK88350-listing-photo:design-nk88350-rhodium',
      }),
      expect.anything(),
    )
    expect(executePhotoEnhancementMock).not.toHaveBeenCalledWith(
      expect.objectContaining({
        assetId: 'rep-1:NK88350-listing-photo',
      }),
      expect.anything(),
    )
    expect(executePhotoEnhancementMock).not.toHaveBeenCalledWith(
      expect.objectContaining({
        assetId: 'rep-1:NK88350-listing-photo:design-nk88350-gold',
      }),
      expect.anything(),
    )
  })

  it('falls back to the original upload when enhancement output is held on the metadata gate', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        makeImageResponse(await makePngBytes(1800, 1800, 'cleanLightBox')),
      )

    getPhotoroomConfigMock.mockReturnValue({
      provider: 'photoroom',
      apiKey: 'phot_test_123',
      baseUrl: 'https://image-api.photoroom.test',
      timeoutMs: 8000,
    })
    uploadJewelryPhotoMock.mockResolvedValueOnce(
      'https://cdn.example.com/listings/rep-1/ring-source.png',
    )
    executePhotoEnhancementMock.mockResolvedValue({
      provider: 'photoroom',
      output: { bytes: await makePngBytes(900, 900, 'cleanLightBox') },
      response: {
        statusCode: 200,
        contentType: 'image/png',
        contentLength: 24,
        requestId: 'req-2',
      },
    })
    inspectEnhancedPhotoOutputMock.mockReturnValue({
      assetId: 'rep-1:ring-shot',
      provider: 'photoroom',
      decision: 'hold',
      flaggedChecks: ['resolution'],
      reasons: ['held'],
    })

    const result = await processRepListingPhotoUrl(
      {
        repId: 'rep-1',
        sourceImageUrl: 'https://images.example.com/ring.png',
        filenameStem: 'ring-shot',
      },
      { fetch: fetchMock },
    )

    expect(uploadJewelryPhotoMock).toHaveBeenCalledTimes(1)
    expect(result).toMatchObject({
      photoUrl: 'https://cdn.example.com/listings/rep-1/ring-source.png',
      originalPhotoUrl: 'https://cdn.example.com/listings/rep-1/ring-source.png',
      enhancedPhotoUrl: null,
      selectedSource: 'original',
      enhancement: {
        attempted: true,
        selected: false,
        decision: 'hold',
      },
    })
    expect(result.enhancement.preflight).toMatchObject({
      passed: false,
      issues: [
        expect.objectContaining({
          code: 'low_resolution',
          severity: 'critical',
        }),
      ],
    })
  })

  it('keeps the original upload when enhancement metadata is reviewable but the pixels still fail quality preflight', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        makeImageResponse(await makePngBytes(1800, 1800, 'cleanLightBox')),
      )

    getPhotoroomConfigMock.mockReturnValue({
      provider: 'photoroom',
      apiKey: 'phot_test_123',
      baseUrl: 'https://image-api.photoroom.test',
      timeoutMs: 8000,
    })
    uploadJewelryPhotoMock.mockResolvedValueOnce(
      'https://cdn.example.com/listings/rep-1/ring-source.png',
    )
    executePhotoEnhancementMock.mockResolvedValue({
      provider: 'photoroom',
      output: { bytes: await makePngBytes(1800, 1800, 'dimFlat') },
      response: {
        statusCode: 200,
        contentType: 'image/png',
        contentLength: 24,
        requestId: 'req-2b',
      },
    })
    inspectEnhancedPhotoOutputMock.mockReturnValue({
      assetId: 'rep-1:ring-shot',
      provider: 'photoroom',
      decision: 'review',
      flaggedChecks: [],
      reasons: ['review'],
    })

    const result = await processRepListingPhotoUrl(
      {
        repId: 'rep-1',
        sourceImageUrl: 'https://images.example.com/ring.png',
        filenameStem: 'ring-shot',
      },
      { fetch: fetchMock },
    )

    expect(uploadJewelryPhotoMock).toHaveBeenCalledTimes(1)
    expect(result).toMatchObject({
      photoUrl: 'https://cdn.example.com/listings/rep-1/ring-source.png',
      originalPhotoUrl: 'https://cdn.example.com/listings/rep-1/ring-source.png',
      enhancedPhotoUrl: null,
      selectedSource: 'original',
      enhancement: {
        attempted: true,
        selected: false,
        decision: 'review',
      },
    })
    expect(result.enhancement.preflight).toMatchObject({
      passed: false,
    })
    expect(result.enhancement.preflight?.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'blur_risk' }),
        expect.objectContaining({ code: 'subject_framing' }),
      ]),
    )
  })

  it('keeps the original processed upload when enhancement throws after the original already exists', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        makeImageResponse(await makePngBytes(1800, 1800, 'cleanLightBox')),
      )

    getPhotoroomConfigMock.mockReturnValue({
      provider: 'photoroom',
      apiKey: 'phot_test_123',
      baseUrl: 'https://image-api.photoroom.test',
      timeoutMs: 8000,
    })
    uploadJewelryPhotoMock.mockResolvedValueOnce(
      'https://cdn.example.com/listings/rep-1/ring-source.png',
    )
    executePhotoEnhancementMock.mockRejectedValue(
      new ServiceError({
        code: 'PHOTO_ENHANCEMENT_UPSTREAM_FAILED',
        message: 'provider timeout',
        userMessage: 'provider timeout',
        statusCode: 502,
      }),
    )

    const result = await processRepListingPhotoUrl(
      {
        repId: 'rep-1',
        sourceImageUrl: 'https://images.example.com/ring.png',
        filenameStem: 'ring-shot',
      },
      { fetch: fetchMock },
    )

    expect(uploadJewelryPhotoMock).toHaveBeenCalledTimes(1)
    expect(result).toMatchObject({
      photoUrl: 'https://cdn.example.com/listings/rep-1/ring-source.png',
      originalPhotoUrl: 'https://cdn.example.com/listings/rep-1/ring-source.png',
      enhancedPhotoUrl: null,
      selectedSource: 'original',
      enhancement: {
        attempted: true,
        selected: false,
        decision: 'error',
        errorMessage: 'provider timeout',
      },
    })
  })

  it('rejects a high-resolution but dim flat low-detail remote listing photo', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        makeImageResponse(await makePngBytes(1800, 1800, 'dimFlat')),
      )

    await expect(
      processRepListingPhotoUrl(
        {
          repId: 'rep-1',
          sourceImageUrl: 'https://images.example.com/bad-lighting-ring.png',
          filenameStem: 'bad-lighting-ring',
        },
        { fetch: fetchMock },
      ),
    ).rejects.toMatchObject({
      code: 'LISTING_PHOTO_PREFLIGHT_FAILED',
      userMessage: expect.stringContaining('That listing photo needs one more try'),
    })
    expect(uploadJewelryPhotoMock).not.toHaveBeenCalled()
  })

  it('rejects a high-resolution but cramped off-center remote listing photo', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        makeImageResponse(await makePngBytes(1800, 1800, 'offCenter')),
      )

    await expect(
      processRepListingPhotoUrl(
        {
          repId: 'rep-1',
          sourceImageUrl: 'https://images.example.com/off-center-ring.png',
          filenameStem: 'off-center-ring',
        },
        { fetch: fetchMock },
      ),
    ).rejects.toMatchObject({
      code: 'LISTING_PHOTO_PREFLIGHT_FAILED',
      userMessage: expect.stringContaining('That listing photo needs one more try'),
    })
    expect(uploadJewelryPhotoMock).not.toHaveBeenCalled()
  })
})
