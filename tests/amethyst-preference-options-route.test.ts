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
    expect(body.options.material).toHaveLength(9)
    expect(body.options.cut).toHaveLength(14)
    expect(body.options.collection).toHaveLength(35)
  })
})
