import { describe, expect, it } from 'vitest'

import {
  SPARKLE_PUBLIC_ORIGIN,
  buildSparkleRobots,
  buildSparkleSitemap,
  normalizeSparkleOrigin,
  resolveSparkleRequestOrigin,
  resolveSparkleRequestOriginFromHeaders,
} from '@/lib/seo/sparkle-crawl'

describe('Sparkle Suite crawl helpers', () => {
  it('keeps the production public origin as the default crawl base', () => {
    expect(SPARKLE_PUBLIC_ORIGIN).toBe('https://www.yoursparklesuite.com')

    expect(buildSparkleSitemap()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          url: 'https://www.yoursparklesuite.com/prelaunch',
          priority: 1,
        }),
        expect.objectContaining({
          url: 'https://www.yoursparklesuite.com/portfolio',
          priority: 0.9,
        }),
        expect.objectContaining({
          url: 'https://www.yoursparklesuite.com/demo',
          priority: 0.9,
        }),
        expect.objectContaining({
          url: 'https://www.yoursparklesuite.com/privacy-policy',
        }),
        expect.objectContaining({
          url: 'https://www.yoursparklesuite.com/terms-and-conditions',
        }),
      ]),
    )
    expect(buildSparkleRobots()).toEqual(
      expect.objectContaining({
        host: 'https://www.yoursparklesuite.com',
        sitemap: 'https://www.yoursparklesuite.com/sitemap.xml',
      }),
    )
  })

  it('can generate sitemap and robots payloads for a custom domain origin', () => {
    const origin = normalizeSparkleOrigin('https://sparklebysasha.example/')

    expect(origin).toBe('https://sparklebysasha.example')
    expect(buildSparkleSitemap(origin)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          url: 'https://sparklebysasha.example/prelaunch',
        }),
      ]),
    )
    expect(buildSparkleRobots(origin)).toEqual(
      expect.objectContaining({
        host: 'https://sparklebysasha.example',
        sitemap: 'https://sparklebysasha.example/sitemap.xml',
      }),
    )
  })

  it('resolves request hosts for crawl outputs while preserving local and preview defaults', () => {
    expect(
      resolveSparkleRequestOrigin(
        new Request('https://sparklebysasha.example/sitemap.xml'),
      ),
    ).toBe('https://sparklebysasha.example')

    expect(
      resolveSparkleRequestOrigin(
        new Request('https://sparkle-suite-git-wave-3.vercel.app/sitemap.xml'),
      ),
    ).toBe(SPARKLE_PUBLIC_ORIGIN)

    expect(
      resolveSparkleRequestOrigin(
        new Request('http://localhost:3001/sitemap.xml'),
      ),
    ).toBe(SPARKLE_PUBLIC_ORIGIN)
  })

  it('prefers a customer Host over Vercel’s internal forwarded host', () => {
    const headers = new Headers({
      host: 'theblingkitchen.com',
      'x-forwarded-host': 'www.yoursparklesuite.com',
    })
    expect(resolveSparkleRequestOriginFromHeaders(headers)).toBe(
      'https://theblingkitchen.com',
    )
  })

  it('rejects non-web origins before they can become crawl URLs', () => {
    expect(() => normalizeSparkleOrigin('javascript:alert(1)')).toThrow(
      /http or https/,
    )
  })
})
