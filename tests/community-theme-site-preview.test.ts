import { describe, expect, it } from 'vitest'
import { GET } from '@/app/api/public/community-theme-preview/route'
import { sparkleSuitePortfolioContent } from '@/lib/sparkle-suite/portfolio-content'
import {
  COMMUNITY_CAROUSEL_THEME_IDS,
  communityThemeSiteDocument,
  isCommunityCarouselTheme,
} from '@/lib/sparkle-suite/community-theme-site-preview'

describe('community theme site previews', () => {
  it('keeps the locked carousel themes on real product skins', () => {
    const slides = sparkleSuitePortfolioContent.carousels.find((carousel) => carousel.id === 'community-themes')?.slides
    expect(slides?.map((slide) => slide.id)).toEqual([...COMMUNITY_CAROUSEL_THEME_IDS])
    expect(isCommunityCarouselTheme('rose_gold')).toBe(false)
    expect(isCommunityCarouselTheme('gnome_garden')).toBe(false)
    expect(isCommunityCarouselTheme('sparkle_suite_morganite')).toBe(false)
    expect(isCommunityCarouselTheme('rose_quartz')).toBe(false)
  })

  it('renders a sample customer homepage with the theme art, not the hero plate alone', async () => {
    const html = await communityThemeSiteDocument('halloween_pumpkin_witch', 'https://smoke.example')
    expect(html).toContain('"preset":"halloween_pumpkin_witch"')
    expect(html).toContain('Moonlit Pumpkin Sparkle')
    expect(html).toContain('A frightfully fun night to sparkle.')
    expect(html).toContain('hp-header')
    expect(html).toContain('Live Lineup')
    expect(html).toContain('Sample Harper')
    expect(html).toContain('Shop')
    expect(html).toContain('/amethyst/skins/halloween-pumpkin-witch/hero-desktop.webp')
    expect(html).toContain('media-src data:;')
    expect(html).toContain('sparkle-landing-ready')
    expect(html).toContain('dataset.previewReady')
    expect(html).toContain("connect-src 'none'")
    expect(html).not.toContain("return window.SparkleLiveLineup.start({ url:")
    expect(html).not.toContain('Theme preview · Sample content')
    expect(html).not.toContain('The Dudes Fizzfest')
    expect(html).not.toContain('Smoke mirror')
    expect(html).not.toContain("I'm Louis")
  })

  it('uses each theme profile inside the same customer homepage', async () => {
    const cat = await communityThemeSiteDocument('halloween_pumpkin_cat', 'https://smoke.example')
    expect(cat).toContain('"preset":"halloween_pumpkin_cat"')
    expect(cat).toContain('A little mystery. A lot of sparkle.')
    expect(cat).toContain('/amethyst/skins/halloween-pumpkin-cat/hero-desktop.webp')
    const owl = await communityThemeSiteDocument('fall_owl_harvest_moon', 'https://smoke.example')
    expect(owl).toContain('"preset":"fall_owl_harvest_moon"')
    expect(owl).toContain('Sparkle by Sasha')
    expect(owl).toContain('/amethyst/skins/fall-owl/hero-poster.webp')
    expect(owl).toContain('/amethyst/skins/fall-owl/hero-loop.mp4')
  })

  it('refuses themes that are not on the community carousel', async () => {
    const response = await GET(new Request('https://smoke.example/api/public/community-theme-preview?theme=rose_gold'))
    expect(response.status).toBe(404)
    const missing = await GET(new Request('https://smoke.example/api/public/community-theme-preview'))
    expect(missing.status).toBe(404)
  })
})
