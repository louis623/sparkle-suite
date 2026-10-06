import { createElement } from 'react'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { metadata } from '@/app/portfolio/page'
import { PortfolioExperience } from '@/app/_components/portfolio-experience'
import { sparkleSuitePortfolioContent } from '@/lib/sparkle-suite/portfolio-content'

const renderPortfolio = () => renderToStaticMarkup(createElement(PortfolioExperience))

describe('Sparkle Suite real-site portfolio', () => {
  it('renders all five real sites as directly accessible previews', () => {
    const html = renderPortfolio()
    const sites = sparkleSuitePortfolioContent.carousels[0].slides
    expect(sites).toHaveLength(5)
    expect(html.match(/<article /g)).toHaveLength(5)
    for (const site of sites) {
      expect(html).toContain(site.title)
      expect(html).toContain(`href="${site.href}"`)
      expect(html).toContain(site.linkLabel)
      expect(html).toContain(encodeURIComponent(site.src))
      expect(existsSync(join(process.cwd(), 'public', site.src))).toBe(true)
    }
  })

  it('uses show names only and does not substitute a theme gallery for real-site proof', () => {
    const html = renderPortfolio()
    expect(html).not.toMatch(/Lindsey|Brittany|Heather|Kim’s|Kelly|Placeholder|aria-roledescription="carousel"|<video/)
    expect(html).not.toContain('Community themes')
    expect(html).not.toContain('Halloween Pumpkin')
    expect(html).not.toContain('Schedule your build now')
    expect(html).toContain('Join the build queue')
    expect(html).toContain('href="/prelaunch#waitlist"')
    expect(html).toContain('No payment when you join the queue.')
    expect(html).toContain('quick 30-minute call')
  })

  it('keeps external visits explicit and portfolio metadata specific to real sites', () => {
    const html = renderPortfolio()
    expect(html.match(/target="_blank"/g)?.length).toBeGreaterThanOrEqual(10)
    expect(html).toContain('opens in a new tab')
    expect(metadata.title).toEqual({ absolute: 'Sparkle Suite Portfolio' })
    expect(metadata.alternates?.canonical).toBe('/portfolio')
    expect(metadata.description).toContain('real rep websites')
  })
})
