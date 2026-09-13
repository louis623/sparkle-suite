import { beforeEach, describe, expect, it, vi } from 'vitest'

const createAdminClientMock = vi.fn(() => ({}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => createAdminClientMock(),
}))

import { POST as postSparkleFinderInternalIntake } from '@/app/api/internal/finder/jewelry-intake/route'
import {
  authorizeSparkleFinderIntakeRequest,
  publishSparkleFinderJewelryIntake,
} from '@/lib/sparkle-finder/internal-intake'

describe('Sparkle Finder internal jewelry intake', () => {
  beforeEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
    createAdminClientMock.mockClear()
  })

  it('requires the server-to-server Finder token without using customer auth', () => {
    expect(
      authorizeSparkleFinderIntakeRequest(
        new Request('http://localhost/api/internal/finder/jewelry-intake', {
          headers: { authorization: 'Bearer finder-token' },
          method: 'POST',
        }),
        'finder-token',
      ),
    ).toEqual({ ok: true })

    expect(
      authorizeSparkleFinderIntakeRequest(
        new Request('http://localhost/api/internal/finder/jewelry-intake', {
          headers: { authorization: 'Bearer wrong-token' },
          method: 'POST',
        }),
        'finder-token',
      ),
    ).toEqual({ ok: false, reason: 'unauthorized', status: 401 })
  })

  it('returns a review state instead of writing unapproved Silver submissions', async () => {
    const deps = makeDeps()

    const result = await publishSparkleFinderJewelryIntake(
      {
        sourceProduct: 'sparkle_finder',
        finderSubmissionId: 'finder-submission-1',
        labelDetails: {
          itemNumber: 'rg1234',
          designName: 'Moonlit Pearl Ring',
          collectionName: 'Midnight Garden',
          collectionYear: 2026,
        },
        originalLabelImageDataUrl: 'data:image/jpeg;base64,label',
        jewelryFrontImageDataUrl: 'data:image/jpeg;base64,jewelry',
      },
      deps,
    )

    expect(result).toEqual({
      ok: true,
      status: 'needs_confirmation',
      message:
        'Nic-Nac received this missing-piece request and needs approval before it can publish to the master catalog.',
      catalogDraft: {
        collectionName: 'Midnight Garden',
        collectionYear: 2026,
        designName: 'Moonlit Pearl Ring',
        itemNumber: 'RG1234',
      },
    })
    expect(deps.createDesign).not.toHaveBeenCalled()
  })

  it('reuses an existing master catalog design instead of creating duplicates', async () => {
    const deps = makeDeps()
    deps.resolveItemNumber.mockResolvedValueOnce({
      found: true,
      design: {
        id: 'design-existing',
        itemNumber: 'RG1234',
        designName: 'Moonlit Pearl Ring',
      },
    })

    const result = await publishSparkleFinderJewelryIntake(
      {
        sourceProduct: 'sparkle_finder',
        finderSubmissionId: 'finder-submission-1',
        labelDetails: {
          itemNumber: 'RG1234',
          designName: 'Moonlit Pearl Ring',
        },
        approvedForMasterCatalog: true,
        approvedCanonicalPhotoUrl: 'https://cdn.example.com/approved/moonlit.png',
        photoPipeline: {
          originalPath: 'finder/finder-submission-1/original.jpg',
          originalUrl: 'https://signed.example.com/original.jpg',
          status: 'ready',
        },
      },
      deps,
    )

    expect(result).toMatchObject({
      ok: true,
      status: 'published',
      suiteDesignId: 'design-existing',
    })
    expect(deps.createDesign).not.toHaveBeenCalled()
  })

  it('publishes approved Finder pieces through the existing Suite createDesign path', async () => {
    const deps = makeDeps()

    const result = await publishSparkleFinderJewelryIntake(
      {
        sourceProduct: 'sparkle_finder',
        finderSubmissionId: 'finder-submission-1',
        labelDetails: {
          bpLabel: 'diamond',
          collectionName: 'Midnight Garden',
          collectionYear: 2026,
          designName: 'Moonlit Pearl Ring',
          itemNumber: 'rg1234',
          mainStone: 'Pearl',
          material: 'Rose gold',
        },
        approvedForMasterCatalog: true,
        approvedCanonicalPhotoUrl: 'https://cdn.example.com/finder-approved/moonlit.png',
        photoPipeline: {
          originalPath: 'finder/finder-submission-1/original.jpg',
          originalUrl: 'https://signed.example.com/original.jpg',
          status: 'ready',
          preflightScore: 0.96,
          preflightIssues: [],
        },
      },
      deps,
    )

    expect(deps.createDesign).toHaveBeenCalledWith(deps.supabase, {
      bpMsrp: undefined,
      collectionName: 'Midnight Garden',
      collectionYear: 2026,
      conversationId: 'sparkle-finder:finder-submission-1',
      createdByRepId: null,
      designName: 'Moonlit Pearl Ring',
      itemNumber: 'RG1234',
      mainStone: 'Pearl',
      material: 'Rose gold',
      photoPipeline: {
        enhancedUrl: undefined,
        originalPath: 'finder/finder-submission-1/original.jpg',
        originalUrl: 'https://signed.example.com/original.jpg',
        processedAt: undefined,
        provider: undefined,
        qaConfidence: undefined,
        qaDecision: undefined,
        status: 'ready',
        preflightScore: 0.96,
        preflightIssues: [],
      },
      piecePhotoUrl: 'https://cdn.example.com/finder-approved/moonlit.png',
      rarityClassification: 'diamond',
      searchTags: ['sparkle finder'],
      specialFeatures: undefined,
    })
    expect(result).toEqual({
      ok: true,
      status: 'published',
      message: 'This piece has been added to the shared master jewelry database.',
      suiteDesignId: 'design-new',
      catalogDraft: {
        bpLabel: 'diamond',
        collectionName: 'Midnight Garden',
        collectionYear: 2026,
        designName: 'Moonlit Pearl Ring',
        itemNumber: 'RG1234',
        mainStone: 'Pearl',
        material: 'Rose gold',
      },
    })
  })

  it('rejects approved publish requests that do not include photo pipeline metadata', async () => {
    const deps = makeDeps()

    const result = await publishSparkleFinderJewelryIntake(
      {
        sourceProduct: 'sparkle_finder',
        finderSubmissionId: 'finder-submission-1',
        labelDetails: {
          itemNumber: 'RG1234',
          designName: 'Moonlit Pearl Ring',
        },
        approvedForMasterCatalog: true,
        approvedCanonicalPhotoUrl: 'https://cdn.example.com/finder-approved/moonlit.png',
      },
      deps,
    )

    expect(result).toEqual({
      ok: false,
      status: 'photo_rejected',
      message: 'Nic-Nac needs a clean, approved light-box photo before this can publish.',
      photoFeedback: [
        'Use a clear, centered jewelry photo approved by Nic-Nac photo QA.',
        'Make sure the approved jewelry photo has completed Nic-Nac photo QA.',
      ],
    })
    expect(deps.createDesign).not.toHaveBeenCalled()
  })

  it('pressure rejects invalid source products without catalog writes', async () => {
    const deps = makeDeps()

    const result = await publishSparkleFinderJewelryIntake(
      {
        sourceProduct: 'neon_rabbit_hq',
        finderSubmissionId: 'finder-submission-1',
        labelDetails: {
          itemNumber: 'RG1234',
          designName: 'Moonlit Pearl Ring',
        },
        approvedForMasterCatalog: true,
        approvedCanonicalPhotoUrl: 'https://cdn.example.com/finder-approved/moonlit.png',
        photoPipeline: {
          originalPath: 'finder/finder-submission-1/original.jpg',
          originalUrl: 'https://signed.example.com/original.jpg',
          status: 'ready',
        },
      },
      deps,
    )

    expect(result).toEqual({
      ok: false,
      status: 'rejected',
      message: 'Sparkle Finder intake requests must identify their source product.',
    })
    expect(deps.resolveItemNumber).not.toHaveBeenCalled()
    expect(deps.createDesign).not.toHaveBeenCalled()
  })

  it('pressure rejects pending photo pipeline states for approved publishes', async () => {
    const deps = makeDeps()

    const result = await publishSparkleFinderJewelryIntake(
      {
        sourceProduct: 'sparkle_finder',
        finderSubmissionId: 'finder-submission-1',
        labelDetails: {
          itemNumber: 'RG1234',
          designName: 'Moonlit Pearl Ring',
        },
        approvedForMasterCatalog: true,
        approvedCanonicalPhotoUrl: 'https://cdn.example.com/finder-approved/moonlit.png',
        photoPipeline: {
          originalPath: 'finder/finder-submission-1/original.jpg',
          originalUrl: 'https://signed.example.com/original.jpg',
          status: 'pending',
        },
      },
      deps,
    )

    expect(result).toMatchObject({
      ok: false,
      status: 'photo_rejected',
    })
    expect(deps.createDesign).not.toHaveBeenCalled()
  })

  it('pressure absorbs unapproved submission floods without master catalog writes', async () => {
    const deps = makeDeps()
    const payloads = Array.from({ length: 50 }, (_, index) => ({
      sourceProduct: 'sparkle_finder',
      finderSubmissionId: `finder-submission-${index}`,
      labelDetails: {
        itemNumber: `RG${1000 + index}`,
        designName: `Moonlit Pearl Ring ${index}`,
      },
      originalLabelImageDataUrl: 'data:image/jpeg;base64,label',
      jewelryFrontImageDataUrl: 'data:image/jpeg;base64,jewelry',
    }))

    const results = await Promise.all(
      payloads.map((payload) => publishSparkleFinderJewelryIntake(payload, deps)),
    )

    expect(results).toHaveLength(50)
    expect(results.every((result) => result.ok && result.status === 'needs_confirmation')).toBe(true)
    expect(deps.createDesign).not.toHaveBeenCalled()
  })

  it('pressure reuses existing designs during duplicate approved storms', async () => {
    const deps = makeDeps()
    deps.resolveItemNumber.mockResolvedValue({
      found: true,
      design: {
        id: 'design-existing',
        itemNumber: 'RG1234',
        designName: 'Moonlit Pearl Ring',
      },
    })

    const payload = {
      sourceProduct: 'sparkle_finder',
      finderSubmissionId: 'finder-submission-1',
      labelDetails: {
        itemNumber: 'RG1234',
        designName: 'Moonlit Pearl Ring',
      },
      approvedForMasterCatalog: true,
      approvedCanonicalPhotoUrl: 'https://cdn.example.com/finder-approved/moonlit.png',
      photoPipeline: {
        originalPath: 'finder/finder-submission-1/original.jpg',
        originalUrl: 'https://signed.example.com/original.jpg',
        status: 'ready',
      },
    }

    const results = await Promise.all(
      Array.from({ length: 25 }, () => publishSparkleFinderJewelryIntake(payload, deps)),
    )

    expect(results.every((result) => result.ok && result.suiteDesignId === 'design-existing')).toBe(
      true,
    )
    expect(deps.resolveItemNumber).toHaveBeenCalledTimes(25)
    expect(deps.createDesign).not.toHaveBeenCalled()
  })

  it('protects the HTTP endpoint with the Finder server token', async () => {
    vi.stubEnv('SPARKLE_FINDER_TO_SUITE_INTAKE_TOKEN', 'finder-token')

    const response = await postSparkleFinderInternalIntake(
      new Request('http://localhost/api/internal/finder/jewelry-intake', {
        body: JSON.stringify({ sourceProduct: 'sparkle_finder' }),
        headers: {
          authorization: 'Bearer wrong-token',
          'content-type': 'application/json',
        },
        method: 'POST',
      }),
    )

    expect(response.status).toBe(401)
    expect(createAdminClientMock).not.toHaveBeenCalled()
    await expect(response.json()).resolves.toEqual({ error: 'unauthorized' })
  })

  it('returns 503 when the HTTP endpoint token is not configured', async () => {
    const response = await postSparkleFinderInternalIntake(
      new Request('http://localhost/api/internal/finder/jewelry-intake', {
        body: JSON.stringify({ sourceProduct: 'sparkle_finder' }),
        method: 'POST',
      }),
    )

    expect(response.status).toBe(503)
    expect(createAdminClientMock).not.toHaveBeenCalled()
    await expect(response.json()).resolves.toEqual({
      error: 'Sparkle Finder intake is not configured.',
    })
  })

  it('rejects malformed JSON before creating the admin client', async () => {
    vi.stubEnv('SPARKLE_FINDER_TO_SUITE_INTAKE_TOKEN', 'finder-token')

    const response = await postSparkleFinderInternalIntake(
      new Request('http://localhost/api/internal/finder/jewelry-intake', {
        body: '{not-json',
        headers: {
          authorization: 'Bearer finder-token',
          'content-type': 'application/json',
        },
        method: 'POST',
      }),
    )

    expect(response.status).toBe(400)
    expect(createAdminClientMock).not.toHaveBeenCalled()
    await expect(response.json()).resolves.toEqual({
      error: 'Request body must be valid JSON.',
    })
  })

  it('returns no-store JSON from the authorized HTTP endpoint', async () => {
    vi.stubEnv('SPARKLE_FINDER_TO_SUITE_INTAKE_TOKEN', 'finder-token')

    const response = await postSparkleFinderInternalIntake(
      new Request('http://localhost/api/internal/finder/jewelry-intake', {
        body: JSON.stringify({
          sourceProduct: 'sparkle_finder',
          finderSubmissionId: 'finder-submission-1',
          labelDetails: {},
        }),
        headers: {
          authorization: 'Bearer finder-token',
          'content-type': 'application/json',
        },
        method: 'POST',
      }),
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(createAdminClientMock).toHaveBeenCalledTimes(1)
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      status: 'needs_confirmation',
    })
  })
})

function makeDeps() {
  return {
    supabase: {} as never,
    resolveItemNumber: vi.fn().mockResolvedValue({ found: false, itemNumber: 'RG1234' }),
    createDesign: vi.fn().mockResolvedValue({
      designId: 'design-new',
      itemNumber: 'RG1234',
      collectionId: 'collection-1',
      collectionName: 'Midnight Garden',
      collectionYear: 2026,
      searchTags: ['diamond', 'sparkle finder'],
      typePrefix: 'RG',
    }),
  }
}
