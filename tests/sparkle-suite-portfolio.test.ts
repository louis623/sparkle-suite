import { createElement } from 'react'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { metadata } from '@/app/portfolio/page'
import { PortfolioExperience } from '@/app/_components/portfolio-experience'
import { getAmethystAppearancePreset } from '@/lib/amethyst/appearance-presets'
import { halloweenHeroMotion } from '@/lib/sparkle-suite/halloween-hero-motion'
import { sparkleSuitePortfolioContent } from '@/lib/sparkle-suite/portfolio-content'
import { portfolioMotion } from '@/lib/sparkle-suite/portfolio-motion'

const renderPortfolio = () => renderToStaticMarkup(createElement(PortfolioExperience))
const publicFile = (src: string) => join(process.cwd(), 'public', ...src.split('/').filter(Boolean))

const communityThemes = [
  {
    id: 'amethyst',
    poster: '/amethyst/skins/am01-unicorn/hero-poster.webp',
    mp4: '/amethyst/skins/am01-unicorn/hero-motion.mp4',
  },
  {
    id: 'halloween_pumpkin_witch',
    poster: halloweenHeroMotion.witch.poster,
    mp4: halloweenHeroMotion.witch.mp4,
  },
  {
    id: 'halloween_pumpkin_cat',
    poster: halloweenHeroMotion.cat.poster,
    mp4: halloweenHeroMotion.cat.mp4,
  },
  {
    id: 'gilded_autumn',
    poster: '/amethyst/skins/gilded-autumn/hero-poster.webp',
    mp4: '/amethyst/skins/gilded-autumn/hero-motion.mp4',
  },
  {
    id: 'fall_owl_harvest_moon',
    poster: '/amethyst/skins/fall-owl/hero-poster.webp',
    mp4: '/amethyst/skins/fall-owl/hero-loop.mp4',
  },
  {
    id: 'gobble_and_fizz',
    poster: '/amethyst/skins/gobble-and-fizz/hero-poster.webp',
    mp4: '/amethyst/skins/gobble-and-fizz/hero-loop.mp4',
  },
  {
    id: 'pie_please',
    poster: '/amethyst/skins/pie-please/hero-poster-v4.webp',
    mp4: '/amethyst/skins/pie-please/hero-loop-v4.mp4',
  },
  {
    id: 'midnight_rose',
    poster: '/amethyst/skins/midnight-rose/hero-poster.webp',
    mp4: '/amethyst/skins/midnight-rose/hero-loop.mp4',
  },
  {
    id: 'pearl_rose',
    poster: '/amethyst/skins/pearl-rose/hero-poster.webp',
    mp4: '/amethyst/skins/pearl-rose/hero-loop.mp4',
  },
  {
    id: 'rose_champagne',
    poster: '/amethyst/skins/rose-champagne/hero-poster.webp',
    mp4: '/amethyst/skins/rose-champagne/hero-loop.mp4',
  },
] as const

const repIds = ['mile-high-fizz', 'britt-with-bling', 'go-for-the-bling', 'sparkly-butterflies'] as const

describe('Sparkle Suite portfolio carousels', () => {
  it('shows the ten community themes above the rep carousel', () => {
    const html = renderPortfolio()
    const themes = sparkleSuitePortfolioContent.carousels.find((carousel) => carousel.id === 'community-themes')
    const reps = sparkleSuitePortfolioContent.carousels.find((carousel) => carousel.id === 'rep-highlights')
    expect(themes?.slides.map((slide) => slide.id)).toEqual(communityThemes.map((theme) => theme.id))
    expect(html.indexOf('id="community-themes"')).toBeGreaterThan(-1)
    expect(html.indexOf('id="community-themes"')).toBeLessThan(html.indexOf('id="rep-highlights"'))
    expect(html.match(/aria-roledescription="carousel"/g)).toHaveLength(2)

    const themeHtml = html.slice(html.indexOf('id="community-themes"'), html.indexOf('id="rep-highlights"'))
    let previous = -1
    for (const theme of communityThemes) {
      const title = getAmethystAppearancePreset(theme.id).label.replaceAll('&', '&amp;')
      const index = themeHtml.indexOf(title)
      expect(index).toBeGreaterThan(previous)
      previous = index
      expect(themeHtml).toContain(`href="/skin-preview/${theme.id}/homepage"`)
      expect(themeHtml).toContain(theme.poster)
      expect(existsSync(publicFile(theme.poster))).toBe(true)
      expect(existsSync(publicFile(theme.mp4))).toBe(true)
      const slide = themes?.slides.find((item) => item.id === theme.id)
      expect(slide && slide.kind === 'capture' ? slide.video?.mp4 : undefined).toBe(theme.mp4)
    }
    expect(themeHtml).not.toMatch(/Morganite|Rose Gold|Garnet|Amber|Velvet|Moonstone|Emerald Garden|Rose Quartz|Black Diamond|Alpine Opal|Gnome Forest|Neon Butterfly/)
    expect(reps?.slides.map((slide) => slide.id)).toEqual([...repIds])
  })

  it('keeps four rep recordings and leaves removed shows out', () => {
    const html = renderPortfolio()
    const repHtml = html.slice(html.indexOf('id="rep-highlights"'), html.indexOf('id="portfolio-close-title"'))
    expect(repHtml).toContain('Mile High Fizz')
    expect(repHtml).toContain('Britt with Bling')
    expect(repHtml).toContain('Go for the Bling')
    expect(repHtml).toContain('Sparkly Butterflies')
    expect(repHtml).not.toMatch(/BlingKitchen|Bri’s Glowtique|theblingkitchen\.com|brisglowtique\.com/)
    for (const id of repIds) {
      const motion = portfolioMotion[id]
      expect(motion).toBeTruthy()
      expect(repHtml).toContain(motion.poster)
      expect(repHtml).toContain(`width="${motion.width}"`)
      expect(repHtml).toContain(`height="${motion.height}"`)
      expect(existsSync(publicFile(motion.poster))).toBe(true)
      expect(existsSync(publicFile(motion.mp4))).toBe(true)
    }
    expect(portfolioMotion['blingkitchen']).toBeUndefined()
    expect(portfolioMotion['bris-glowtique']).toBeUndefined()
    expect(existsSync(publicFile('/marketing/blingkitchen-site-preview.mp4'))).toBe(true)
    expect(existsSync(publicFile('/marketing/bris-glowtique-site-preview.mp4'))).toBe(true)
    expect(repHtml.match(/target="_blank"/g)).toHaveLength(4)
    expect(repHtml).toContain('opens in a new tab')
  })

  it('keeps portfolio metadata and the build queue close', () => {
    const html = renderPortfolio()
    expect(html).not.toMatch(/Lindsey|Brittany|Heather|Kelly|Placeholder/)
    expect(html).not.toMatch(/\b(trade|sold|sales|Live Queue|trial)\b/i)
    expect(html).toContain('Join the build queue')
    expect(html).toContain('href="/prelaunch#waitlist"')
    expect(html).toContain('No payment when you join the queue.')
    expect(html).toContain('quick 30-minute call')
    expect(metadata.title).toEqual({ absolute: 'Sparkle Suite Portfolio' })
    expect(metadata.alternates?.canonical).toBe('/portfolio')
    expect(metadata.description).toContain('real rep websites')
  })
})
