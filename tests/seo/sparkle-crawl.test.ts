import { describe, expect, it } from 'vitest'

import {
  SPARKLE_PUBLIC_ORIGIN,
  buildSparkleRobots,
  buildSparkleSitemap,
  canonicalizeSparkleCrawlOrigin,
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
          url: 'https://www.yoursparklesuite.com/faq',
          priority: 0.8,
        }),
        expect.objectContaining({
          url: 'https://www.yoursparklesuite.com/faq/articles',
          priority: 0.8,
        }),
        expect.objectContaining({
          url: 'https://www.yoursparklesuite.com/privacy-policy',
        }),
        expect.objectContaining({
          url: 'https://www.yoursparklesuite.com/terms-and-conditions',
        }),
      ]),
    )
    const urls = buildSparkleSitemap().map((entry) => entry.url)
    expect(urls).toContain('https://www.yoursparklesuite.com/faq/articles')
    expect(urls).not.toContain('https://www.yoursparklesuite.com/learn')
    expect(urls).not.toContain('https://www.yoursparklesuite.com/demo')
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

  it('builds custom-domain crawl URLs on the apex and keeps Suite on www', () => {
    expect(canonicalizeSparkleCrawlOrigin('https://www.sparklybutterflies.com/sitemap.xml')).toBe(
      'https://sparklybutterflies.com',
    )
    expect(canonicalizeSparkleCrawlOrigin('https://www.yoursparklesuite.com/sitemap.xml')).toBe(
      'https://www.yoursparklesuite.com',
    )
    expect(canonicalizeSparkleCrawlOrigin('https://yoursparklesuite.com/robots.txt')).toBe(
      'https://www.yoursparklesuite.com',
    )

    expect(buildSparkleSitemap('https://www.sparklybutterflies.com')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          url: 'https://sparklybutterflies.com/prelaunch',
        }),
      ]),
    )
    expect(buildSparkleSitemap('https://www.sparklybutterflies.com')).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          url: expect.stringContaining('https://www.sparklybutterflies.com'),
        }),
      ]),
    )
    expect(buildSparkleRobots('https://www.theblingkitchen.com')).toEqual(
      expect.objectContaining({
        host: 'https://theblingkitchen.com',
        sitemap: 'https://theblingkitchen.com/sitemap.xml',
      }),
    )
    expect(
      resolveSparkleRequestOrigin(
        new Request('https://www.milehighfizz.com/sitemap.xml', {
          headers: { host: 'www.milehighfizz.com' },
        }),
      ),
    ).toBe('https://milehighfizz.com')
    expect(
      resolveSparkleRequestOriginFromHeaders(
        new Headers({
          host: 'www.goforthebling.com',
          'x-forwarded-host': 'www.yoursparklesuite.com',
        }),
      ),
    ).toBe('https://goforthebling.com')
  })

  it('rejects non-web origins before they can become crawl URLs', () => {
    expect(() => normalizeSparkleOrigin('javascript:alert(1)')).toThrow(
      /http or https/,
    )
  })
})
