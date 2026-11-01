import { describe, expect, it, vi } from 'vitest'

vi.mock('next/font/google', () => ({
  DM_Sans: () => ({ variable: '--font-prelaunch-sans' }),
  Geist: () => ({ variable: '--font-geist-sans' }),
  Geist_Mono: () => ({ variable: '--font-geist-mono' }),
  Italiana: () => ({ variable: '--font-amethyst-display' }),
  Playfair_Display: () => ({ variable: '--font-prelaunch-display' }),
}))

import { GET as robots } from '@/app/robots.txt/route'
import { buildSparkleSitemap } from '@/lib/seo/sparkle-crawl'
import { metadata as rootMetadata } from '@/app/layout'
import { metadata as prelaunchMetadata } from '@/app/prelaunch/page'
import { metadata as loginMetadata } from '@/app/login/page'
import { alt as openGraphImageAlt, size as openGraphImageSize } from '@/app/opengraph-image'

describe('Sparkle Suite crawl and metadata signals', () => {
  it('keeps global metadata neutral while using www as the canonical live host', () => {
    expect(rootMetadata.metadataBase).toEqual(
      new URL('https://www.yoursparklesuite.com'),
    )
    expect(rootMetadata.alternates).toBeUndefined()
    expect(rootMetadata.robots).toBeUndefined()
    expect(rootMetadata.openGraph).toBeUndefined()
    expect(rootMetadata.twitter).toBeUndefined()
  })

  it('sets the prelaunch canonical and sharing metadata', () => {
    expect(prelaunchMetadata.title).toEqual({
      absolute: 'Join the build queue | Sparkle Suite',
    })
    expect(prelaunchMetadata.alternates).toEqual({
      canonical: '/prelaunch',
    })
    expect(prelaunchMetadata.robots).toEqual({
      index: true,
      follow: true,
    })
    expect(prelaunchMetadata.openGraph).toEqual(
      expect.objectContaining({
        url: '/prelaunch',
        siteName: 'Sparkle Suite',
        images: [
          {
            url: '/opengraph-image',
            width: 1200,
            height: 630,
            alt: 'Sparkle Suite: now building sites for Bomb Party reps.',
          },
        ],
      }),
    )
    expect(prelaunchMetadata.twitter).toEqual(
      expect.objectContaining({
        card: 'summary_large_image',
        images: [
          {
            url: '/opengraph-image',
            alt: 'Sparkle Suite: now building sites for Bomb Party reps.',
          },
        ],
      }),
    )
  })

  it('generates a focused sitemap for public prelaunch pages', async () => {
    expect(buildSparkleSitemap()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          url: 'https://www.yoursparklesuite.com/prelaunch',
          priority: 1,
        }),
        expect.objectContaining({
          url: 'https://www.yoursparklesuite.com/privacy-policy',
        }),
        expect.objectContaining({
          url: 'https://www.yoursparklesuite.com/terms-and-conditions',
        }),
      ]),
    )
  })

  it('allows public crawl paths while keeping utility paths out', async () => {
    const response = await robots(new Request('https://www.yoursparklesuite.com/robots.txt'))
    expect(response.headers.get('content-type')).toBe('text/plain; charset=utf-8')
    expect(await response.text()).toBe(
      'User-Agent: *\nAllow: /\nDisallow: /api/\nDisallow: /internal/\nDisallow: /onboarding/\nSitemap: https://www.yoursparklesuite.com/sitemap.xml\n',
    )
    expect(loginMetadata.robots).toEqual({
      index: false,
      follow: false,
    })
  })

  it('defines a polished social share image for the public site', () => {
    expect(openGraphImageSize).toEqual({
      width: 1200,
      height: 630,
    })
    expect(openGraphImageAlt).toBe('Sparkle Suite: a polished website for your live-selling business.')
  })
})
