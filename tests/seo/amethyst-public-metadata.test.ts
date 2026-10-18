import { describe, expect, it } from 'vitest'

import {
  AMETHYST_PUBLIC_PAGES,
  buildAmethystPublicMetadata,
  buildAmethystPublicMetaTags,
} from '@/lib/seo/amethyst-public-metadata'

describe('Amethyst public metadata helpers', () => {
  it('builds the default homepage metadata contract used by the locked export', () => {
    const metadata = buildAmethystPublicMetadata('homepage')

    expect(metadata).toEqual({
      page: 'homepage',
      path: '/amethyst/Homepage.html',
      title: "Jane's Sparkle Party - Live jewelry reveals",
      description:
        "Shop live jewelry reveals, dance floor highlights, and upcoming shows with Jane's Sparkle Party.",
      robots: 'index,follow',
      canonicalUrl: 'https://www.yoursparklesuite.com/amethyst/Homepage.html',
      openGraph: {
        type: 'website',
        siteName: 'Sparkle Suite',
        title: "Jane's Sparkle Party - Live jewelry reveals",
        description:
          "Shop live jewelry reveals, dance floor highlights, and upcoming shows with Jane's Sparkle Party.",
        url: 'https://www.yoursparklesuite.com/amethyst/Homepage.html',
        image: 'https://www.yoursparklesuite.com/opengraph-image',
      },
      twitter: {
        card: 'summary_large_image',
        title: "Jane's Sparkle Party - Live jewelry reveals",
        description:
          "Shop live jewelry reveals, dance floor highlights, and upcoming shows with Jane's Sparkle Party.",
        image: 'https://www.yoursparklesuite.com/opengraph-image',
      },
    })
  })

  it('builds canonical and sharing tags for a custom rep origin', () => {
    const tags = buildAmethystPublicMetaTags('trade', {
      origin: 'https://sparklebysasha.example/',
    })

    expect(tags).toEqual([
      {
        tag: 'title',
        text: "Jane's Sparkle Party - Dance Floor",
      },
      {
        tag: 'meta',
        name: 'description',
        content:
          "Browse dancers on Jane's Sparkle Party Dance Floor and swap dancers from live reveal shows.",
      },
      {
        tag: 'meta',
        name: 'robots',
        content: 'index,follow',
      },
      {
        tag: 'link',
        rel: 'canonical',
        href: 'https://sparklebysasha.example/amethyst/Trade.html',
      },
      {
        tag: 'meta',
        property: 'og:type',
        content: 'website',
      },
      {
        tag: 'meta',
        property: 'og:site_name',
        content: 'Sparkle Suite',
      },
      {
        tag: 'meta',
        property: 'og:title',
        content: "Jane's Sparkle Party - Dance Floor",
      },
      {
        tag: 'meta',
        property: 'og:description',
        content:
          "Browse dancers on Jane's Sparkle Party Dance Floor and swap dancers from live reveal shows.",
      },
      {
        tag: 'meta',
        property: 'og:url',
        content: 'https://sparklebysasha.example/amethyst/Trade.html',
      },
      {
        tag: 'meta',
        property: 'og:image',
        content: 'https://sparklebysasha.example/opengraph-image',
      },
      {
        tag: 'meta',
        name: 'twitter:card',
        content: 'summary_large_image',
      },
      {
        tag: 'meta',
        name: 'twitter:title',
        content: "Jane's Sparkle Party - Dance Floor",
      },
      {
        tag: 'meta',
        name: 'twitter:description',
        content:
          "Browse dancers on Jane's Sparkle Party Dance Floor and swap dancers from live reveal shows.",
      },
      {
        tag: 'meta',
        name: 'twitter:image',
        content: 'https://sparklebysasha.example/opengraph-image',
      },
    ])
  })

  it('covers the locked Amethyst public pages and rejects unsafe origins', () => {
    expect(Object.keys(AMETHYST_PUBLIC_PAGES)).toEqual([
      'homepage',
      'trade',
      'join',
      'pantry',
    ])
    expect(buildAmethystPublicMetadata('join').canonicalUrl).toBe(
      'https://www.yoursparklesuite.com/amethyst/Join.html',
    )
    expect(() =>
      buildAmethystPublicMetadata('join', { origin: 'javascript:alert(1)' }),
    ).toThrow('Sparkle crawl origins must use http or https.')
  })
})
