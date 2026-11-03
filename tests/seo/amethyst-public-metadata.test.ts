import { describe, expect, it } from 'vitest'

import {
  AMETHYST_PUBLIC_PAGES,
  buildAmethystPublicMetadata,
  buildAmethystPublicMetaTags,
  buildRepPublicPageText,
} from '@/lib/seo/amethyst-public-metadata'
import { buildAmethystPublicPageJsonLd } from '@/lib/seo/amethyst-structured-data'
import { buildRenderedAmethystPublicMetadataForTest } from '@/lib/amethyst/public-asset-response'
import { defaultAmethystHomepageTemplateData } from '@/lib/amethyst/homepage-template-data'
import { defaultAmethystTradeTemplateData } from '@/lib/amethyst/trade-template-data'
import { defaultAmethystJoinTemplateData } from '@/lib/amethyst/join-template-data'

describe('Amethyst public metadata helpers', () => {
  it.each([
    { businessName: 'Main Gem Co.', repName: 'Katelin.', businessEnding: 'Main Gem Co.' },
    { businessName: 'Main Gem Company', repName: 'Katelin', businessEnding: 'Main Gem Company.' },
  ])('preserves sentence punctuation for "$businessName" without changing SEO wording', ({ businessName, repName, businessEnding }) => {
    const input = { businessName, repName, teamName: businessName }
    const homepage = buildRepPublicPageText({ ...input, page: 'homepage' })
    expect(homepage).toEqual({
      title: `${businessName} | Live jewelry reveals and Dance Floor`,
      description: `Independent Bomb Party rep site for ${businessEnding} Watch live jewelry reveals, follow the Live Lineup, and browse dancers on the Dance Floor.`,
    })
    expect(buildRepPublicPageText({ ...input, page: 'pantry' }).description).toBe(
      `Browse recipes, kitchen notes, and live-show favorites from ${businessEnding}`,
    )
    expect(buildRepPublicPageText({ ...input, page: 'join' }).description).toBe(
      `Learn how to join ${businessName} with Katelin.`,
    )
    expect(buildRepPublicPageText({ ...input, page: 'homepage', city: 'Columbus', state: 'Ohio' }).description).toBe(
      `Independent Bomb Party rep site for ${businessName} in Columbus, Ohio. Watch live jewelry reveals, follow the Live Lineup, and browse dancers on the Dance Floor.`,
    )
    const metadata = buildRenderedAmethystPublicMetadataForTest('homepage', 'https://maingemco.example', {
      appearancePreset: 'sparkle_suite_morganite',
      homepage: { ...defaultAmethystHomepageTemplateData, businessName, repName },
      trade: defaultAmethystTradeTemplateData,
      join: { ...defaultAmethystJoinTemplateData, businessName, repName, teamName: businessName, repCity: '', repState: '', indexCity: '', indexState: '' },
    }, '/')
    expect(metadata.description).toBe(homepage.description)
    expect(metadata.openGraph.description).toBe(homepage.description)
    expect(metadata.twitter.description).toBe(homepage.description)
    const jsonLd = buildAmethystPublicPageJsonLd({
      origin: 'https://maingemco.example', path: '/', title: metadata.title,
      description: metadata.description, businessName, repName,
    })
    expect(jsonLd['@graph'].find(node => node['@type'] === 'WebPage')?.description).toBe(homepage.description)
  })

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
