import { describe, expect, it } from 'vitest'
import {
  buildPublicSitePath,
  buildPublicSiteUrl,
  generatePublicSiteSlug,
  getPublicSiteSlugAlternatives,
  validatePublicSiteSlug,
} from '@/lib/public-site/show-link'

describe('public site show link rules', () => {
  it('generates a lowercase letters-and-numbers-only slug from the live show name', () => {
    expect(generatePublicSiteSlug("Gracie's Sparkle Party")).toBe(
      'graciesparkleparty',
    )
    expect(generatePublicSiteSlug("Macy's")).toBe('macy')
    expect(generatePublicSiteSlug('Bling & Fizz 24/7')).toBe('blingfizz247')
    expect(generatePublicSiteSlug('  The_Big-Live.Show!  ')).toBe(
      'thebigliveshow',
    )
  })

  it('rejects reserved paths and invalid generated values', () => {
    expect(validatePublicSiteSlug('login')).toEqual({
      ok: false,
      reason: 'reserved',
    })
    expect(validatePublicSiteSlug('learn')).toEqual({
      ok: false,
      reason: 'reserved',
    })
    expect(validatePublicSiteSlug('gracie-sparkle')).toEqual({
      ok: false,
      reason: 'format',
    })
    expect(validatePublicSiteSlug('ab')).toEqual({
      ok: false,
      reason: 'too_short',
    })
    expect(validatePublicSiteSlug('a'.repeat(49))).toEqual({
      ok: false,
      reason: 'too_long',
    })
  })

  it('accepts clean launch-ready slugs', () => {
    expect(validatePublicSiteSlug('graciesparkleparty')).toEqual({ ok: true })
    expect(validatePublicSiteSlug('gracie2026')).toEqual({ ok: true })
  })

  it('suggests clean alternatives when the generated slug is blocked', () => {
    expect(getPublicSiteSlugAlternatives('graciesparkleparty')).toEqual([
      'graciesparklepartylive',
      'graciesparklepartyshop',
      'graciesparklepartybp',
    ])
  })

  it('formats paths and full URLs consistently', () => {
    expect(buildPublicSitePath('graciesparkleparty')).toBe(
      '/graciesparkleparty',
    )
    expect(
      buildPublicSiteUrl('graciesparkleparty', 'https://www.yoursparklesuite.com'),
    ).toBe('https://www.yoursparklesuite.com/graciesparkleparty')
  })
})
