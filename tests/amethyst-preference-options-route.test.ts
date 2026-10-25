import { afterEach, describe, expect, it } from 'vitest'

import { GET } from '@/app/api/amethyst/preference-options/route'
import { fallbackPreferenceOptions } from '@/lib/sparkle-suite/jewelry-preferences'
import { resetPreferenceOptionsCache } from '@/lib/sparkle-suite/load-preference-options'

describe('GET /api/amethyst/preference-options', () => {
  const originalUrl = process.env.SPARKLE_FINDER_PREFERENCE_OPTIONS_URL

  afterEach(() => {
    resetPreferenceOptionsCache()
    if (originalUrl === undefined) {
      delete process.env.SPARKLE_FINDER_PREFERENCE_OPTIONS_URL
    } else {
      process.env.SPARKLE_FINDER_PREFERENCE_OPTIONS_URL = originalUrl
    }
  })

  it('serves the bundled lists when Finder is not configured', async () => {
    delete process.env.SPARKLE_FINDER_PREFERENCE_OPTIONS_URL

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toContain('max-age=300')
    expect(body.source).toBe('fallback')
    expect(body.options.stone).toEqual(fallbackPreferenceOptions.stone)
    expect(body.options.material).toHaveLength(10)
    expect(body.options.material.map((option: { slug: string }) => option.slug)).toEqual(
      fallbackPreferenceOptions.material.map((option) => option.slug),
    )
    expect(body.options.material.find((option: { slug: string }) => option.slug === 'silver-plated')?.isHidden).toBe(
      true,
    )
    expect(body.options.material.find((option: { slug: string }) => option.slug === 'matte-rhodium')?.isHidden).toBe(
      true,
    )
    expect(body.options.cut).toHaveLength(14)
    expect(body.options.collection).toHaveLength(35)
    expect(body.options.collection.find((option: { slug: string }) => option.slug === 'gem-society')?.isHidden).toBe(
      true,
    )
    expect(body.options.collection.find((option: { slug: string }) => option.slug === 'originals')?.label).toBe('OGs')
    expect(body.options.collection.find((option: { slug: string }) => option.slug === 'exclusives')?.label).toBe(
      'Exclusives',
    )
  })

  it('keeps hidden ids in the payload with isHidden true when Finder omits the flag', async () => {
    process.env.SPARKLE_FINDER_PREFERENCE_OPTIONS_URL =
      'https://finder.example/api/public/finder/preference-options'
    const hiddenSlugs = new Set(['gem-society', 'silver-plated', 'matte-rhodium'])
    const unhide = (options: typeof fallbackPreferenceOptions.material) =>
      options.map((option) => (hiddenSlugs.has(option.slug) ? { ...option, isHidden: undefined } : option))
    const realFetch = globalThis.fetch
    globalThis.fetch = (async () =>
      Response.json({
        options: {
          stone: fallbackPreferenceOptions.stone,
          material: unhide(fallbackPreferenceOptions.material),
          cut: fallbackPreferenceOptions.cut,
          collection: unhide(fallbackPreferenceOptions.collection),
        },
      })) as typeof fetch

    try {
      const response = await GET()
      const body = await response.json()
      const materialSlugs = body.options.material.map((option: { slug: string }) => option.slug)
      const collectionSlugs = body.options.collection.map((option: { slug: string }) => option.slug)

      expect(response.status).toBe(200)
      expect(body.source).toBe('finder')
      expect(materialSlugs).toContain('matte-gold')
      expect(materialSlugs).toContain('sterling')
      expect(body.options.material.find((option: { slug: string }) => option.slug === 'silver-plated')?.isHidden).toBe(
        true,
      )
      expect(body.options.material.find((option: { slug: string }) => option.slug === 'matte-rhodium')?.isHidden).toBe(
        true,
      )
      expect(body.options.collection.find((option: { slug: string }) => option.slug === 'gem-society')?.isHidden).toBe(
        true,
      )
    } finally {
      globalThis.fetch = realFetch
    }
  })
})
