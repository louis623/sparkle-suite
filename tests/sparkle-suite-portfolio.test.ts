import { createElement } from 'react'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { metadata } from '@/app/portfolio/page'
import { PortfolioExperience } from '@/app/_components/portfolio-experience'
import { getAmethystAppearancePreset } from '@/lib/amethyst/appearance-presets'
import { sparkleSuitePortfolioContent } from '@/lib/sparkle-suite/portfolio-content'
import { portfolioMotion } from '@/lib/sparkle-suite/portfolio-motion'

const renderPortfolio = () => renderToStaticMarkup(createElement(PortfolioExperience))
const publicFile = (src: string) => join(process.cwd(), 'public', ...src.split('/').filter(Boolean))

const communityThemes = [
  { id: 'amethyst', title: 'Chasing Unicorns', pickerLabel: 'Chasing Unicorns (Amethyst)' },
  { id: 'halloween_pumpkin_witch', title: 'Pumpkin and Witch', pickerLabel: 'Halloween Pumpkin and Witch' },
  { id: 'halloween_pumpkin_cat', title: 'Pumpkin and Cat', pickerLabel: 'Halloween Pumpkin and Cat' },
  { id: 'gilded_autumn', title: 'The Golden Leaves of Autumn', pickerLabel: 'The Golden Leaves of Autumn' },
  { id: 'fall_owl_harvest_moon', title: 'Fall Owl Harvest Moon', pickerLabel: 'Fall Owl and Harvest Moon' },
  { id: 'gobble_and_fizz', title: 'Gobble & Fizz', pickerLabel: 'Gobble & Fizz' },
  { id: 'pie_please', title: 'Pumpkin Pie', pickerLabel: 'Pumpkin Pie' },
  { id: 'midnight_rose', title: 'Midnight Rose', pickerLabel: 'Midnight Rose' },
  { id: 'pearl_rose', title: 'Pearl Rose', pickerLabel: 'Pearl Rose' },
  { id: 'rose_champagne', title: 'Rose Champagne', pickerLabel: 'Rose Champagne' },
] as const

const repIds = ['mile-high-fizz', 'britt-with-bling', 'go-for-the-bling', 'sparkly-butterflies'] as const

describe('Sparkle Suite portfolio carousels', () => {
  it('shows the ten community themes above the rep carousel', () => {
    const html = renderPortfolio()
    const themes = sparkleSuitePortfolioContent.carousels.find((carousel) => carousel.id === 'community-themes')
    const reps = sparkleSuitePortfolioContent.carousels.find((carousel) => carousel.id === 'rep-highlights')
    expect(themes?.slides.map((slide) => slide.id)).toEqual(communityThemes.map((theme) => theme.id))
    expect(themes?.slides.map((slide) => slide.title)).toEqual(communityThemes.map((theme) => theme.title))
    expect(html.indexOf('id="community-themes"')).toBeGreaterThan(-1)
    expect(html.indexOf('id="community-themes"')).toBeLessThan(html.indexOf('id="rep-highlights"'))
    expect(html.match(/aria-roledescription="carousel"/g)).toHaveLength(2)

    const themeHtml = html.slice(html.indexOf('id="community-themes"'), html.indexOf('id="rep-highlights"'))
    let previous = -1
    for (const theme of communityThemes) {
      const title = theme.title.replaceAll('&', '&amp;')
      expect(getAmethystAppearancePreset(theme.id).label).toBe(theme.pickerLabel)
      const index = themeHtml.indexOf(title)
      expect(index).toBeGreaterThan(previous)
      previous = index
      expect(themeHtml).toContain(`href="/skin-preview/${theme.id}/homepage"`)
      expect(themeHtml).toContain(`data-community-theme="${theme.id}"`)
      expect(themeHtml).toContain(`/marketing/demo-themes/${theme.id}.webp`)
      expect(existsSync(publicFile(`/marketing/demo-themes/${theme.id}.webp`))).toBe(true)
      const slide = themes?.slides.find((item) => item.id === theme.id)
      expect(slide?.kind).toBe('site')
      expect(slide && slide.kind === 'site' ? slide.theme : undefined).toBe(theme.id)
      expect(themeHtml).not.toContain('hero-halloween-witch-live')
      expect(themeHtml).not.toContain('hero-halloween-cat-live')
      expect(themeHtml).not.toContain('milehighfizz.com')
      expect(themeHtml).not.toContain(`/amethyst/skins/`)
    }
    expect(themeHtml).not.toContain('Real capture still to come')
    expect(themeHtml).not.toContain('heroCopy')
    expect(themeHtml).not.toContain('<iframe')
    const previewProfiles = readFileSync(join(process.cwd(), 'lib/amethyst/skin-preview.ts'), 'utf8')
    expect(previewProfiles).toContain("headline: 'A frightfully fun night to sparkle.'")
    expect(previewProfiles).toContain(
      "heroSub: 'A little mystery. A lot of sparkle. Join Sasha for live jewelry reveals and find your next favorite.'",
    )
    expect(themeHtml).not.toMatch(/Morganite|Rose Gold|Garnet|Amber|Velvet|Moonstone|Emerald Garden|Rose Quartz|Black Diamond|Alpine Opal|Gnome Forest|Neon Butterfly/)
    expect(reps?.slides.map((slide) => slide.id)).toEqual([...repIds])
  })

  it('keeps four rep recordings and leaves removed shows out', () => {
    const html = renderPortfolio()
    const repHtml = html.slice(html.indexOf('id="rep-highlights"'), html.indexOf('id="portfolio-close-title"'))
    expect(repHtml).toContain('Real Sparkle Suite sites, live right now. Each one is built around its rep’s own look.')
    expect(repHtml).toContain('Mile High Fizz')
    expect(repHtml).toContain('Britt with Bling')
    expect(repHtml).toContain('Go for the Bling')
    expect(repHtml).toContain('Sparkly Butterflies')
    expect(repHtml).not.toMatch(/BlingKitchen|Bri’s Glowtique|theblingkitchen\.com|brisglowtique\.com/)
    for (const id of repIds) {
      const recording = portfolioMotion[id]
      expect(recording).toBeTruthy()
      expect(repHtml).toContain(recording.poster)
      expect(existsSync(publicFile(recording.poster))).toBe(true)
      expect(existsSync(publicFile(recording.mp4))).toBe(true)
    }
    expect(repHtml).toContain('milehighfizz.com')
    expect(repHtml).toContain('brittwithbling.com')
    expect(repHtml).toContain('goforthebling.com')
    expect(repHtml).toContain('sparklybutterflies.com')
    expect(repHtml).not.toContain('With Lindsey')
    expect(repHtml).not.toContain('Revealing something magical together.')
    expect(repHtml).not.toContain('The Virtuous Fizzers')
    expect(repHtml).not.toContain('Where Faith Meets Fizz')
    expect(repHtml).not.toContain('Shop Now')
    expect(repHtml).not.toContain('Join the Team')
    expect(repHtml).not.toContain('A little wonder, a lot of sparkle.')
    expect(repHtml).not.toContain('Your Sparkle Taking Flight')
    expect(repHtml).not.toContain('heroCopy')
    expect(repHtml).not.toContain('/mile-high-fizz/hero.mp4')
    expect(repHtml).not.toContain('mile-high-fizz-custom-hero.webp')
    expect(repHtml).not.toContain('/britt-with-bling/hero.jpeg')
    expect(repHtml).not.toContain('/amethyst/skins/gnome-garden/forest.webp')
    expect(repHtml).not.toContain('/amethyst/skins/neon-butterfly/kelly-studio-desktop.webp')
    expect(repHtml).not.toContain('Dance Floor · Coming soon')
    expect(repHtml).not.toContain('Coming soon')
    expect(portfolioMotion['mile-high-fizz']).toBeTruthy()
    expect(portfolioMotion['britt-with-bling']).toBeTruthy()
    expect(portfolioMotion['blingkitchen']).toBeUndefined()
    expect(portfolioMotion['bris-glowtique']).toBeUndefined()
    for (const removed of [
      '/marketing/blingkitchen-site-preview.mp4',
      '/marketing/blingkitchen-site-preview.webp',
      '/marketing/bris-glowtique-site-preview.mp4',
      '/marketing/bris-glowtique-site-preview.webp',
    ]) {
      expect(existsSync(publicFile(removed))).toBe(false)
    }
    const repPosters = [...repHtml.matchAll(/<img\b[^>]*>/g)].map((match) => match[0])
    expect(repPosters).toHaveLength(4)
    expect(repPosters[0]).toContain('mile-high-fizz-site-preview.webp')
    expect(repPosters[0]).toContain('loading="eager"')
    expect(repPosters[0]).toMatch(/fetchpriority="high"/i)
    for (const poster of repPosters.slice(1)) {
      expect(poster).toContain('loading="lazy"')
      expect(poster).not.toMatch(/fetchpriority="high"/i)
    }
    expect(repHtml.match(/target="_blank"/g)).toHaveLength(4)
    expect(repHtml).toContain('opens in a new tab')
  })

  it('keeps portfolio metadata and the build queue close', () => {
    const html = renderPortfolio()
    expect(html).not.toMatch(/Brittany|Heather|Kelly|Placeholder/)
    expect(html).not.toMatch(/\b(trade|sold|sales|Live Queue|trial)\b/i)
    expect(html).toContain('Join the build queue')
    expect(html).toContain('href="/prelaunch#waitlist"')
    expect(html).toContain('No payment when you join the queue.')
    expect(html).toContain('quick 30-minute call')
    expect(metadata.title).toEqual({ absolute: 'Sparkle Suite Portfolio' })
    expect(metadata.alternates?.canonical).toBe('/portfolio')
    expect(metadata.description).toContain('real rep websites')
  })

  it('keeps phone pause and arrow controls below the frame on both carousels', () => {
    const css = readFileSync(join(process.cwd(), 'app/_components/portfolio-experience.module.css'), 'utf8')
    const videoCss = readFileSync(join(process.cwd(), 'app/_components/product-peek-video.module.css'), 'utf8')
    const phoneControls = css.slice(css.indexOf('@media (max-width: 800px)'))
    const phoneHero = css.slice(css.indexOf('@media (max-width: 700px)'), css.indexOf('@media (max-width: 800px)'))
    expect(phoneHero).toContain('.browserBar')
    expect(phoneHero).not.toMatch(/heroCopy|-webkit-line-clamp|padding:\s*50%|padding:\s*46%/)
    expect(phoneControls).toContain('bottom: 8px')
    expect(phoneControls).not.toMatch(/community-themes|bandBlush|bandPaper/)
    expect(videoCss).toContain('top: calc(100% + 8px)')
    const html = renderPortfolio()
    expect(html.match(/aria-label="Previous /g)).toHaveLength(2)
    expect(html.match(/aria-label="Next /g)).toHaveLength(2)
    expect(html).toContain('Play animation')
  })

  it('reserves the tallest caption so both carousels keep a stable height', () => {
    const css = readFileSync(join(process.cwd(), 'app/_components/portfolio-experience.module.css'), 'utf8')
    const carousel = readFileSync(join(process.cwd(), 'app/_components/portfolio-carousels.tsx'), 'utf8')
    expect(css).toContain('grid-area: 1 / 1')
    expect(css).toMatch(/\.cardSizer\s*\{[^}]*visibility:\s*hidden/)
    expect(css).not.toMatch(/\.cardDetail[^{]*\{[^}]*line-clamp|text-overflow:\s*ellipsis/)
    expect(css).toContain('@media (prefers-reduced-motion: reduce)')
    expect(carousel).toContain('aria-hidden="true"')
    const html = renderPortfolio()
    expect(html.match(/aria-hidden="true"/g)?.length).toBeGreaterThanOrEqual(14)
    expect(html).toContain('The Golden Leaves of Autumn')
    expect(html).toContain('A custom Gnome Forest look for Go for the Bling.')
  })

  it('uses one shared media frame for every portfolio slide', () => {
    const css = readFileSync(join(process.cwd(), 'app/_components/portfolio-experience.module.css'), 'utf8')
    const carousel = readFileSync(join(process.cwd(), 'app/_components/portfolio-carousels.tsx'), 'utf8')
    expect(css.match(/aspect-ratio:\s*1200\s*\/\s*850/g)).toHaveLength(1)
    expect(css).toContain('object-fit: contain')
    expect(css).toContain('object-position: center')
    expect(css).not.toContain('object-fit: cover')
    expect(css).not.toContain('heroCopy')
    expect(css).not.toMatch(/data-theme|aspect-ratio:\s*var/)
    expect(carousel).not.toMatch(/fit="cover"|heroCopy|slide\.hero/)
  })
})
