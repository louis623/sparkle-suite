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
    expect(metadata.description).toContain("You're in, you're in the right place for the bling.")
    expect(metadata.description).toContain('Now Pick Your Shine')
    expect(buildSparkleSitemap().map((entry) => entry.url)).toContain(
      'https://www.yoursparklesuite.com/adventure',
    )
  })

  it('uses the locked path copy and sends each product to its own front door', () => {
    const html = renderHub()

    expect(sparkleSuiteMarketingHubContent.support).toBe("You're in, you're in the right place for the bling.")
    expect(sparkleSuiteMarketingHubContent.prompt).toBe('Now Pick Your Shine')
    const readable = html.replaceAll('&#x27;', "'").replaceAll('&amp;', '&')
    const supportAt = readable.indexOf(`<h1 class="`)
    const promptAt = readable.indexOf(sparkleSuiteMarketingHubContent.prompt)
    expect(readable).toContain(`>${sparkleSuiteMarketingHubContent.support}</h1>`)
    expect(promptAt).toBeGreaterThan(supportAt)
    expect(readable).not.toContain('Are you here for the bling?')
    expect(readable).not.toContain('Choose your adventure')
    const suiteCard = readable.slice(readable.indexOf('data-path="suite"'), readable.indexOf('data-path="finder"'))
    const finderCard = readable.slice(readable.indexOf('data-path="finder"'), readable.indexOf('suite-continue-title'))
    const suiteBody =
      'Sparkle Suite gives reps a polished customer site, standout live-show tools, and built-in support that helps customers feel the difference.'
    const finderBody = 'Find the pieces you love, and build the collection that you adore.'
    expect(suiteCard.indexOf('Sparkle Suite')).toBeLessThan(suiteCard.indexOf('for the Bomb Party reps'))
    expect(suiteCard.indexOf('for the Bomb Party reps')).toBeLessThan(suiteCard.indexOf(suiteBody))
    expect(suiteCard.indexOf(suiteBody)).toBeLessThan(suiteCard.indexOf('>Sign In<'))
    expect(finderCard).not.toContain(suiteBody)
    expect(finderCard.indexOf('Sparkle Finder')).toBeLessThan(finderCard.indexOf('for the Bomb Party collectors'))
    expect(finderCard.indexOf('for the Bomb Party collectors')).toBeLessThan(finderCard.indexOf(finderBody))
    expect(finderCard.indexOf(finderBody)).toBeLessThan(finderCard.indexOf('Coming soon.'))
    expect(suiteCard).not.toContain(finderBody)
    expect(suiteCard).not.toContain('find & favorite')
    expect(finderCard).not.toContain('for the Bomb Party reps')
    expect(readable.toLowerCase()).not.toContain('selling tonight')
    expect(readable.toLowerCase()).not.toContain('shopping the show')
    expect(html).toContain('href="/"')
    expect(suiteCard).toContain('>Sign In<')
    expect(suiteCard).toContain('>Sign Up<')
    expect(suiteCard).not.toContain('Coming soon.')
    expect(suiteCard).not.toContain('Have an account?')
    expect(suiteCard).toContain('href="/login"')
    expect(suiteCard).toContain('href="/prelaunch#waitlist"')
    expect(finderCard.indexOf('Coming soon.')).toBeLessThan(finderCard.indexOf('>Get a sneak peek</a>'))
    expect(finderCard.indexOf('>Get a sneak peek</a>')).toBeLessThan(finderCard.indexOf('>Sign In<'))
    const sneakPeek = finderCard.slice(
      finderCard.lastIndexOf('<a', finderCard.indexOf('>Get a sneak peek</a>')),
      finderCard.indexOf('>Get a sneak peek</a>'),
    )
    expect(sneakPeek).toContain('href=""')
    expect(sneakPeek).not.toContain('http')
    expect(suiteCard).not.toContain('Get a sneak peek')
    expect(sparkleSuiteMarketingHubContent.finder.sneakPeekHref).toBe('')
    expect(finderCard).toContain('>Sign Up<')
    expect(finderCard).not.toContain("Don't have an account?")
    expect(finderCard).toContain('href="https://yoursparklefinder.com/auth/sign-in"')
    expect(finderCard).toContain('href="https://yoursparklefinder.com/auth/sign-up?next=/"')
    expect(readable).not.toContain('Have an account?')
    expect(readable).not.toContain("Don't have an account?")
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
    expect(css).toContain('justify-content: space-between;')
    expect(css).toContain('.finder .accountLink')
    expect(css).toContain('#9a93a3')
    expect(css).toContain('.sneakPeek')
    expect(css).toContain('text-decoration: underline;')
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
