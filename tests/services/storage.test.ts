import { beforeEach, describe, expect, it, vi } from 'vitest'

const createAdminClientMock = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: (...args: unknown[]) => createAdminClientMock(...args),
}))

import {
  getTradeRequestRevealScreenshotSignedUrl,
  publishApprovedPhoto,
  removeCatalogDesignPhotoAssets,
  removeTradeRequestRevealScreenshots,
  uploadCatalogDesignSourcePhoto,
  uploadTradeRequestRevealScreenshot,
  uploadJewelryPhoto,
  uploadPublicSiteMedia,
  uploadStagedOriginalPhoto,
} from '@/lib/services/storage'

function makeStorageBucket() {
  return {
    upload: vi.fn(),
    createSignedUrl: vi.fn(),
    getPublicUrl: vi.fn(),
    remove: vi.fn(),
  }
}

describe('storage service', () => {
  beforeEach(() => {
    createAdminClientMock.mockReset()
    vi.spyOn(global.Math, 'random').mockRestore()
  })

  it('uploads a staged original to the private bucket and returns object metadata for provider use', async () => {
    const stagedBucket = makeStorageBucket()
    stagedBucket.upload.mockResolvedValue({ error: null })
    stagedBucket.createSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://signed.example.com/original' },
      error: null,
    })

    createAdminClientMock.mockReturnValue({
      storage: {
        from: vi.fn((bucket: string) => {
          if (bucket === 'jewelry-photo-staging') {
            return stagedBucket
          }
          throw new Error(`Unexpected bucket ${bucket}`)
        }),
      },
    })

    const result = await uploadStagedOriginalPhoto(
      'rep-42',
      'data:image/png;base64,Zm9v',
      'Original ring!!.png',
    )

    expect(stagedBucket.upload).toHaveBeenCalledWith(
      expect.stringMatching(
        /^rep-42\/[0-9a-f-]+-Original_ring_+\.png$/,
      ),
      Buffer.from('foo'),
      {
        contentType: 'image/png',
        upsert: false,
      },
    )
    expect(stagedBucket.createSignedUrl).toHaveBeenCalledWith(
      expect.stringMatching(
        /^rep-42\/[0-9a-f-]+-Original_ring_+\.png$/,
      ),
      60 * 60,
    )
    expect(result).toEqual({
      objectPath: expect.stringMatching(
        /^rep-42\/[0-9a-f-]+-Original_ring_+\.png$/,
      ),
      signedUrl: 'https://signed.example.com/original',
    })
  })

  it('publishes an approved photo to the public bucket and returns the public URL', async () => {
    const publicBucket = makeStorageBucket()
    publicBucket.upload.mockResolvedValue({ error: null })
    publicBucket.getPublicUrl.mockReturnValue({
      data: { publicUrl: 'https://cdn.example.com/approved.jpg' },
    })

    createAdminClientMock.mockReturnValue({
      storage: {
        from: vi.fn((bucket: string) => {
          if (bucket === 'jewelry-photos') {
            return publicBucket
          }
          throw new Error(`Unexpected bucket ${bucket}`)
        }),
      },
    })

    const result = await publishApprovedPhoto('design-9', Buffer.from('bar'), {
      filename: 'enhanced shot',
      contentType: 'image/jpeg',
    })

    expect(publicBucket.upload).toHaveBeenCalledWith(
      expect.stringMatching(
        /^approved\/design-9\/enhanced_shot\.jpg$/,
      ),
      Buffer.from('bar'),
      {
        contentType: 'image/jpeg',
        upsert: true,
      },
    )
    expect(publicBucket.getPublicUrl).toHaveBeenCalledWith(
      expect.stringMatching(
        /^approved\/design-9\/enhanced_shot\.jpg$/,
      ),
    )
    expect(result).toBe('https://cdn.example.com/approved.jpg')
  })

  it('keeps the legacy jewelry photo upload behavior for public rep folders', async () => {
    const publicBucket = makeStorageBucket()
    publicBucket.upload.mockResolvedValue({ error: null })
    publicBucket.getPublicUrl.mockReturnValue({
      data: { publicUrl: 'https://cdn.example.com/rep-photo.jpg' },
    })

    createAdminClientMock.mockReturnValue({
      storage: {
        from: vi.fn((bucket: string) => {
          if (bucket === 'jewelry-photos') {
            return publicBucket
          }
          throw new Error(`Unexpected bucket ${bucket}`)
        }),
      },
    })

    const result = await uploadJewelryPhoto(
      'rep-7',
      'data:image/jpeg;base64,YmF6',
      'fresh-shot',
    )

    expect(publicBucket.upload).toHaveBeenCalledWith(
      'rep-7/fresh-shot.jpg',
      Buffer.from('baz'),
      {
        contentType: 'image/jpeg',
        upsert: false,
      },
    )
    expect(result).toBe('https://cdn.example.com/rep-photo.jpg')
  })

  it('scopes catalog source and staged objects to the internal design variant without overwriting', async () => {
    const publicBucket = makeStorageBucket()
    const stagedBucket = makeStorageBucket()
    publicBucket.upload.mockResolvedValue({ error: null })
    publicBucket.getPublicUrl
      .mockReturnValueOnce({ data: { publicUrl: 'https://cdn.example.com/rose.jpg' } })
      .mockReturnValueOnce({ data: { publicUrl: 'https://cdn.example.com/ruby.jpg' } })
    stagedBucket.upload.mockResolvedValue({ error: null })
    stagedBucket.createSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://signed.example.com/ruby-original' },
      error: null,
    })

    createAdminClientMock.mockReturnValue({
      storage: {
        from: vi.fn((bucket: string) => {
          if (bucket === 'jewelry-photos') return publicBucket
          if (bucket === 'jewelry-photo-staging') return stagedBucket
          throw new Error(`Unexpected bucket ${bucket}`)
        }),
      },
    })

    const rose = await uploadCatalogDesignSourcePhoto(
      'rep-7',
      'design-rose-quartz',
      'data:image/jpeg;base64,cm9zZQ==',
      'ER59000-source',
    )
    const ruby = await uploadCatalogDesignSourcePhoto(
      'rep-7',
      'design-ruby',
      'data:image/jpeg;base64,cnVieQ==',
      'ER59000-source',
    )
    const stagedRuby = await uploadStagedOriginalPhoto(
      'rep-7',
      'data:image/jpeg;base64,cnVieQ==',
      'ER59000-original',
      { designId: 'design-ruby' },
    )

    expect(rose.objectPath).toBe(
      'rep-7/designs/design-rose-quartz/ER59000-source.jpg',
    )
    expect(ruby.objectPath).toBe(
      'rep-7/designs/design-ruby/ER59000-source.jpg',
    )
    expect(rose.objectPath).not.toBe(ruby.objectPath)
    expect(stagedRuby.objectPath).toMatch(
      /^rep-7\/designs\/design-ruby\/[0-9a-f-]+-ER59000-original\.jpg$/,
    )
    expect(publicBucket.upload).toHaveBeenNthCalledWith(
      2,
      'rep-7/designs/design-ruby/ER59000-source.jpg',
      Buffer.from('ruby'),
      { contentType: 'image/jpeg', upsert: false },
    )
  })

  it('removes both public and staged assets for an abandoned design attempt', async () => {
    const publicBucket = makeStorageBucket()
    const stagedBucket = makeStorageBucket()
    publicBucket.remove.mockResolvedValue({ error: null })
    stagedBucket.remove.mockResolvedValue({ error: null })
    createAdminClientMock.mockReturnValue({
      storage: {
        from: vi.fn((bucket: string) => {
          if (bucket === 'jewelry-photos') return publicBucket
          if (bucket === 'jewelry-photo-staging') return stagedBucket
          throw new Error(`Unexpected bucket ${bucket}`)
        }),
      },
    })

    await removeCatalogDesignPhotoAssets({
      publicObjectPath: 'rep-7/designs/design-ruby/ER59000-source.jpg',
      stagedObjectPath:
        'rep-7/designs/design-ruby/uuid-ER59000-original.jpg',
    })

    expect(publicBucket.remove).toHaveBeenCalledWith([
      'rep-7/designs/design-ruby/ER59000-source.jpg',
    ])
    expect(stagedBucket.remove).toHaveBeenCalledWith([
      'rep-7/designs/design-ruby/uuid-ER59000-original.jpg',
    ])
  })

  it('uploads public site media to rep-scoped recipe folders', async () => {
    const publicSiteBucket = makeStorageBucket()
    publicSiteBucket.upload.mockResolvedValue({ error: null })
    publicSiteBucket.getPublicUrl.mockReturnValue({
      data: { publicUrl: 'https://cdn.example.com/recipe.jpg' },
    })

    createAdminClientMock.mockReturnValue({
      storage: {
        from: vi.fn((bucket: string) => {
          if (bucket === 'public-site-media') {
            return publicSiteBucket
          }
          throw new Error(`Unexpected bucket ${bucket}`)
        }),
      },
    })

    const result = await uploadPublicSiteMedia(
      'rep-7',
      'data:image/webp;base64,cmVjaXBl',
      {
        filename: 'Creamer hero.webp',
        folder: 'recipes',
      },
    )

    expect(publicSiteBucket.upload).toHaveBeenCalledWith(
      expect.stringMatching(
        /^rep-7\/recipes\/[0-9a-f-]+-Creamer_hero\.webp$/,
      ),
      Buffer.from('recipe'),
      {
        contentType: 'image/webp',
        upsert: false,
      },
    )
    expect(publicSiteBucket.getPublicUrl).toHaveBeenCalledWith(
      expect.stringMatching(
        /^rep-7\/recipes\/[0-9a-f-]+-Creamer_hero\.webp$/,
      ),
    )
    expect(result).toBe('https://cdn.example.com/recipe.jpg')
  })

  it('normalizes profile uploads to upright JPEGs before storing them', async () => {
    const { normalizeTeamProfilePhoto } = await import(
      '@/lib/services/team-profile-photo'
    )
    const upright = await (
      await import('sharp')
    ).default({
      create: {
        width: 32,
        height: 16,
        channels: 3,
        background: { r: 12, g: 80, b: 160 },
      },
    })
      .jpeg()
      .toBuffer()
    const sideways = await (
      await import('sharp')
    )
      .default(upright)
      .withMetadata({ orientation: 6 })
      .jpeg()
      .toBuffer()

    const publicSiteBucket = makeStorageBucket()
    publicSiteBucket.upload.mockResolvedValue({ error: null })
    publicSiteBucket.getPublicUrl.mockReturnValue({
      data: { publicUrl: 'https://cdn.example.com/profile.jpg' },
    })

    createAdminClientMock.mockReturnValue({
      storage: {
        from: vi.fn((bucket: string) => {
          if (bucket === 'public-site-media') {
            return publicSiteBucket
          }
          throw new Error(`Unexpected bucket ${bucket}`)
        }),
      },
    })

    const result = await uploadPublicSiteMedia(
      'rep-7',
      `data:image/jpeg;base64,${sideways.toString('base64')}`,
      {
        filename: 'IMG_7958.jpg',
        folder: 'profile',
      },
    )

    const uploaded = publicSiteBucket.upload.mock.calls[0]
    expect(uploaded[0]).toMatch(/^rep-7\/profile\/[0-9a-f-]+-IMG_7958\.jpg$/)
    expect(uploaded[2]).toEqual({
      contentType: 'image/jpeg',
      upsert: false,
    })
    const normalized = await normalizeTeamProfilePhoto(sideways)
    expect(Buffer.compare(uploaded[1] as Buffer, normalized.buffer)).toBe(0)
    expect(result).toBe('https://cdn.example.com/profile.jpg')
  })

  it('uploads a trade request reveal screenshot to the private temporary bucket', async () => {
    const screenshotBucket = makeStorageBucket()
    screenshotBucket.upload.mockResolvedValue({ error: null })

    createAdminClientMock.mockReturnValue({
      storage: {
        from: vi.fn((bucket: string) => {
          if (bucket === 'trade-request-screenshots') {
            return screenshotBucket
          }
          throw new Error(`Unexpected bucket ${bucket}`)
        }),
      },
    })

    const result = await uploadTradeRequestRevealScreenshot(
      'rep-7',
      'request-9',
      Buffer.from('screenshot'),
      {
        contentType: 'image/jpg',
        filename: 'Reveal shot!!.jpg',
        now: new Date('2026-06-17T12:00:00.000Z'),
      },
    )

    expect(screenshotBucket.upload).toHaveBeenCalledWith(
      expect.stringMatching(
        /^rep-7\/request-9\/[0-9a-f-]+-Reveal_shot_+\.jpg$/,
      ),
      Buffer.from('screenshot'),
      {
        contentType: 'image/jpeg',
        upsert: false,
      },
    )
    expect(result).toEqual({
      objectPath: expect.stringMatching(
        /^rep-7\/request-9\/[0-9a-f-]+-Reveal_shot_+\.jpg$/,
      ),
      contentType: 'image/jpeg',
      sizeBytes: Buffer.from('screenshot').byteLength,
      uploadedAt: '2026-06-17T12:00:00.000Z',
      expiresAt: '2026-06-24T12:00:00.000Z',
    })
  })

  it('rejects unsupported or oversized trade request screenshots before upload', async () => {
    await expect(
      uploadTradeRequestRevealScreenshot(
        'rep-7',
        'request-9',
        Buffer.from('svg'),
        { contentType: 'image/svg+xml' },
      ),
    ).rejects.toThrow('UNSUPPORTED_TRADE_REQUEST_SCREENSHOT_TYPE')

    await expect(
      uploadTradeRequestRevealScreenshot(
        'rep-7',
        'request-9',
        Buffer.alloc(25 * 1024 * 1024 + 1),
        { contentType: 'image/png' },
      ),
    ).rejects.toThrow('TRADE_REQUEST_SCREENSHOT_TOO_LARGE')
    expect(createAdminClientMock).not.toHaveBeenCalled()
  })

  it('creates signed URLs and removes trade request reveal screenshots from the private bucket', async () => {
    const screenshotBucket = makeStorageBucket()
    screenshotBucket.createSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://signed.example.com/reveal' },
      error: null,
    })
    screenshotBucket.remove.mockResolvedValue({ error: null })

    createAdminClientMock.mockReturnValue({
      storage: {
        from: vi.fn((bucket: string) => {
          if (bucket === 'trade-request-screenshots') {
            return screenshotBucket
          }
          throw new Error(`Unexpected bucket ${bucket}`)
        }),
      },
    })

    await expect(
      getTradeRequestRevealScreenshotSignedUrl('rep-7/request-9/reveal.jpg'),
    ).resolves.toBe('https://signed.example.com/reveal')
    await removeTradeRequestRevealScreenshots(['rep-7/request-9/reveal.jpg'])

    expect(screenshotBucket.createSignedUrl).toHaveBeenCalledWith(
      'rep-7/request-9/reveal.jpg',
      10 * 60,
    )
    expect(screenshotBucket.remove).toHaveBeenCalledWith([
      'rep-7/request-9/reveal.jpg',
    ])
  })
})
