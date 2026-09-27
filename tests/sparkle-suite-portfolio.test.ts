import { createElement } from 'react'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { metadata } from '@/app/portfolio/page'
import { PortfolioExperience } from '@/app/_components/portfolio-experience'
import {
  sparkleSuitePortfolioContent,
  sparkleSuiteScheduleBuild,
} from '@/lib/sparkle-suite/portfolio-content'
import { sparkleSuitePublicLandingContent } from '@/lib/sparkle-suite/public-landing-content'

function renderPortfolio() {
  return renderToStaticMarkup(createElement(PortfolioExperience))
}

describe('Sparkle Suite portfolio page', () => {
  it('keeps the schedule action on the existing build-queue path', () => {
    expect(sparkleSuiteScheduleBuild).toEqual({
      label: 'Schedule your build now',
      href: sparkleSuitePublicLandingContent.hero.primaryCta.href,
      note: 'This opens the build queue. No payment to get in line.',
    })
    expect(sparkleSuiteScheduleBuild.href).toBe('/prelaunch#waitlist')
  })

  it('renders a static hero, three carousels, and a schedule action under each', () => {
    const html = renderPortfolio()

    expect(html).toContain('Shows we’re proud to put on the floor.')
    expect(html).toContain('Halloween · Pumpkin and Witch')
    expect(html).toContain('aria-roledescription="carousel"')
    expect(html.match(/aria-roledescription="carousel"/g)).toHaveLength(3)
    expect(html).toContain('Rep highlights')
    expect(html).toContain('Community themes')
    expect(html).toContain('Holiday and special occasion themes')
    expect(html.match(/Schedule your build now/g)?.length).toBeGreaterThanOrEqual(4)
    expect(html).toContain('href="/prelaunch#waitlist"')
    expect(html).toContain('href="/"')
    expect(html).toContain('aria-current="page"')
    expect(html).toContain('Demo soon')
    expect(html).not.toContain('setInterval')
  })

  it('uses real public captures for reps and marks unfinished holiday slots', () => {
    const html = renderPortfolio()
    const captures = sparkleSuitePortfolioContent.carousels.flatMap((carousel) => carousel.slides)

    for (const slide of captures) {
      if (slide.kind !== 'capture') {
        expect(slide.detail).toContain('Placeholder')
        continue
      }
      expect(existsSync(join(process.cwd(), 'public', ...slide.src.split('/').filter(Boolean)))).toBe(true)
      expect(html).toContain(encodeURIComponent(slide.src))
      expect(slide.alt.length).toBeGreaterThan(20)
    }

    const repSlides = sparkleSuitePortfolioContent.carousels.find((carousel) => carousel.id === 'rep-highlights')?.slides
    expect(repSlides?.map((slide) => slide.title)).toEqual([
      'Mile High Fizz',
      'Britt with Bling',
      'BlingKitchen',
      'Go for the Bling',
      'Sparkly Butterflies',
    ])
    expect(repSlides?.map((slide) => slide.kind === 'capture' ? slide.href : '')).toEqual([
      'https://milehighfizz.com/',
      'https://brittwithbling.com/',
      'https://theblingkitchen.com/',
      'https://goforthebling.com/',
      'https://sparklybutterflies.com/',
    ])
    for (const slide of repSlides ?? []) {
      expect(`${slide.title} ${slide.detail}`).not.toMatch(/halloween|pumpkin|witch/i)
      if (slide.kind === 'capture') expect(slide.alt).not.toMatch(/halloween|pumpkin|witch/i)
    }
    expect(html).toContain('href="https://milehighfizz.com/"')
    expect(html).toContain('href="https://brittwithbling.com/"')
    expect(html).toContain('href="https://theblingkitchen.com/"')
    expect(html).toContain('href="https://goforthebling.com/"')
    expect(html).toContain('href="https://sparklybutterflies.com/"')
    expect(html).toContain('Real capture still to come')
    expect(html.match(/Placeholder/g)?.length).toBeGreaterThanOrEqual(2)
  })

  it('stays on the customer-facing marketing surface', () => {
    const html = renderPortfolio()
    const source = readFileSync(join(process.cwd(), 'app/_components/portfolio-carousels.tsx'), 'utf8')

    expect(html).not.toContain('Workspace')
    expect(html).not.toContain('backend')
    expect(html).not.toContain('Nic-Nac')
    expect(source).not.toContain('setInterval')
    expect(source).not.toContain('setTimeout')
    expect(metadata.title).toEqual({ absolute: 'Sparkle Suite Portfolio' })
    expect(metadata.alternates?.canonical).toBe('/portfolio')
  })
})
