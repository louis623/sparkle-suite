import { createElement } from 'react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { metadata } from '@/app/adventure/page'
import { MarketingHub } from '@/app/_components/marketing-hub'
import { sparkleSuiteMarketingHubContent } from '@/lib/sparkle-suite/marketing-hub-content'
import { sparkleSuitePublicLandingSafety } from '@/lib/sparkle-suite/public-landing-content'
import { buildSparkleSitemap } from '@/lib/seo/sparkle-crawl'

function renderHub() {
  return renderToStaticMarkup(createElement(MarketingHub))
}

describe('Sparkle Suite and Finder adventure hub', () => {
  it('keeps the existing Suite home and adds the hub on /adventure', () => {
    const home = readFileSync(join(process.cwd(), 'app/page.tsx'), 'utf8')
    const adventure = readFileSync(join(process.cwd(), 'app/adventure/page.tsx'), 'utf8')

    expect(home).toContain('<SparkleSuitePublicLanding />')
    expect(home).not.toContain('MarketingHub')
    expect(adventure).toContain('<MarketingHub />')
    expect(adventure).not.toContain("redirect('/prelaunch')")
    expect(metadata.alternates?.canonical).toBe('/adventure')
    expect(metadata.title).toEqual({ absolute: 'Sparkle Suite and Sparkle Finder' })
    expect(metadata.description).toContain('Are you here for the bling?')
    expect(metadata.description).toContain('Choose your adventure')
    expect(buildSparkleSitemap().map((entry) => entry.url)).toContain(
      'https://www.yoursparklesuite.com/adventure',
    )
  })

  it('uses the locked path copy and sends each product to its own front door', () => {
    const html = renderHub()

    expect(html).toContain(sparkleSuiteMarketingHubContent.headline)
    expect(html).toContain(sparkleSuiteMarketingHubContent.prompt)
    expect(html).toContain('Selling tonight?')
    expect(html).toContain('Sparkle Suite — for reps')
    expect(html).toContain('Shopping the show?')
    expect(html).toContain('Sparkle Finder — find &amp; favorite')
    expect(html).toContain('href="/"')
    expect(html).toContain('href="/login"')
    expect(html).toContain('href="https://yoursparklefinder.com/"')
    expect(html).toContain('href="https://yoursparklefinder.com/auth/sign-in"')
    expect(html).toContain('Open the Sparkle Suite site')
    expect(html).toContain('Open Sparkle Finder')
    expect(html).toContain('href="/prelaunch#waitlist"')
    expect(html).toContain('Join the build queue')
    expect(html).toContain('href="/portfolio"')
    expect(html).toContain('href="/demo"')
    expect(html).toContain('href="/faq"')
    expect(html).toContain(sparkleSuitePublicLandingSafety.disclaimer)
    expect(html).toContain('href="https://www.youtube.com/@SparkleSuite"')
    expect(html).toContain('href="https://www.tiktok.com/@yoursparklesuite.com"')
    expect(html).not.toContain('href="/finder')
    expect(sparkleSuiteMarketingHubContent.finder.deepLinks).toEqual([])
  })

  it('stays clear of Neon Rabbit, Amethyst, store badges, and Facebook', () => {
    const html = renderHub()
    const serialized = JSON.stringify(sparkleSuiteMarketingHubContent)

    for (const source of [html, serialized]) {
      expect(source).not.toContain('Neon Rabbit')
      expect(source).not.toContain('Amethyst')
      expect(source).not.toContain('App Store')
      expect(source).not.toContain('Google Play')
      expect(source.toLowerCase()).not.toContain('facebook')
    }
  })

  it('stacks the path cards on small screens and places them side by side on desktop', () => {
    const css = readFileSync(join(process.cwd(), 'app/_components/marketing-hub.module.css'), 'utf8')

    expect(css).toContain('grid-template-columns: 1fr;')
    expect(css).toContain('@media (min-width: 900px)')
    expect(css).toContain('grid-template-columns: 1fr 1fr;')
    expect(css).toContain('#1b1218')
    expect(css).toContain('#2a1822')
    expect(css).toContain('#fcf8f6')
    expect(css).toContain('#fff6fa')
    expect(css).toContain('#402924')
    expect(css).toContain('#ee2c9b')
    expect(css).toContain('#e8dff5')
    expect(css).toContain('var(--font-prelaunch-display)')
    expect(css).toContain('var(--font-prelaunch-sans)')
    expect(css).toContain('prefers-reduced-motion: reduce')
  })
})
