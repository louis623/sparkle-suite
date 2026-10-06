import { createElement } from 'react'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { metadata } from '@/app/page'
import nextConfig from '@/next.config'
import { SparkleSuitePublicLanding } from '@/app/_components/sparkle-suite-public-landing'
import { sparkleSuitePublicLandingSafety } from '@/lib/sparkle-suite/public-landing-content'

const renderLanding = () => renderToStaticMarkup(createElement(SparkleSuitePublicLanding))
const publicAssetPath = (src: string) => join(process.cwd(), 'public', ...src.split('/').filter(Boolean))

describe('Sparkle Suite public landing page', () => {
  it('puts product proof, founder, and Watch before pricing and answers', () => {
    const html = renderLanding()
    let previous = -1
    for (const section of ['id="main-content"', 'id="customer-site-proof"', 'id="workspace-proof"', 'id="founder-title"', 'id="watch"', 'id="pricing"', 'id="questions"']) {
      const index = html.indexOf(section)
      expect(index).toBeGreaterThan(previous)
      previous = index
    }
    expect(html).toContain('Your brand.')
    expect(html).toContain('Your show.')
    expect(html).toContain('A setup that <em>shines.</em>')
    expect(html).toContain('href="/prelaunch#waitlist"')
    expect(html).toContain('Join the build queue')
    expect(html).toContain('No payment when you join the queue')
    expect(html).toContain('30-minute call')
    expect(html).toContain('first month and setup fee are paid')
    expect(html).toContain('Email and SMS updates: coming soon.')
    expect(html).toContain('aria-label="Included in Sparkle Suite"')
    expect(html).toContain('Dance Floor')
    expect(html).toContain('Live Lineup')
    expect(html.match(/<details>/g)).toHaveLength(3)
    expect(html).toContain('Read all FAQs')
  })

  it('shows founder pricing on the initial render without invented scarcity', () => {
    const html = renderLanding()
    expect(html).toContain('aria-label="Sparkle Suite founding rep pricing"')
    expect(html).toContain('$49.99')
    expect(html).toContain('$99.98')
    expect(html).toContain('first 12 paid months')
    expect(html).toContain('$74.99')
    expect(html).not.toContain('$124.98')
    expect(html).not.toContain('founder spots remaining')
    expect(html).toContain('Joining the queue does not reserve founder pricing.')
    expect(html).toContain('move forward after our call, while spots last')
    const counted = renderToStaticMarkup(createElement(SparkleSuitePublicLanding, {
      initialAvailability: { status: 'available', remaining: 18, checkedAt: '2026-10-03T21:40:20.623Z' },
    }))
    expect(counted).toContain('18 founder spots remaining.')
    expect(counted).not.toContain('18 of 20')
  })

  it('keeps the hero useful without a demo response and defers interactive frames', () => {
    const html = renderLanding()
    const hero = html.slice(html.indexOf('id="main-content"'), html.indexOf('id="customer-site-proof"'))
    expect(hero).toContain('/marketing/demo-poster.webp')
    expect(hero).not.toContain('Rose Gold')
    expect(hero).not.toContain('Bomb Party')
    expect(hero).not.toContain('$49.99')
    expect(hero).toContain('Interactive preview temporarily unavailable.')
    expect(hero).toContain('Join the build queue')
    expect(html).not.toContain('<iframe')
    expect(html).not.toMatch(/<video[^>]+src=/)
    expect(html).not.toContain('<source src=')
  })

  it('uses real-site proof and the approved founder story without personal rep labels', () => {
    const html = renderLanding()
    for (const domain of ['sparklybutterflies.com', 'goforthebling.com', 'milehighfizz.com']) expect(html).toContain(domain)
    expect(html).toContain('href="/portfolio"')
    expect(html).toContain('Louis, founder of Sparkle Suite')
    expect(html).toContain('My sister became a Bomb Party rep and asked me to help with her website.')
    expect(html).toContain('small, veteran-owned business')
    expect(html).not.toMatch(/Lindsey|Brittany|Heather|Kelly|louis@|346954|Chapman/)
    expect(html).not.toContain('aria-roledescription="carousel"')
    for (const src of ['/marketing/louis-headshot.webp', '/sparkle-suite/landing/dance-floor-sparkly-butterflies.webp', '/sparkle-suite/landing/calendar-upcoming-reveals.webp', '/marketing/team-management-preview.webp', '/marketing/new-rep-onboarding-preview.webp']) {
      expect(existsSync(publicAssetPath(src))).toBe(true)
      expect(html).toContain(encodeURIComponent(src))
    }
    expect(html).toContain('/marketing/live-lineup-preview.webp')
    expect(html).toContain('Try the Live Lineup')
    expect(html).toContain('Team Management and New Rep Onboarding are included')
  })

  it('sends Watch traffic to the correct featured clip and channels', () => {
    const html = renderLanding()
    expect(html).toContain('href="https://www.tiktok.com/@yoursparklesuite.com/video/7684058046800071966"')
    expect(html).toContain('href="https://www.tiktok.com/@yoursparklesuite.com"')
    expect(html).toContain('href="https://www.youtube.com/@SparkleSuite"')
    expect(html).not.toContain('tiktok.com/@sparklesuite')
    expect(html).not.toContain('href="/demo"')
    expect(html).not.toContain('Play the quick tour')
  })

  it('keeps approved header and footer navigation with affiliation only in the footer', () => {
    const html = renderLanding()
    expect(html).toContain('aria-label="Explore Sparkle Suite"')
    expect(html).toContain('aria-label="Account links"')
    for (const href of ['/portfolio', '/faq', '/privacy-policy', '/terms-and-conditions', 'https://yoursparklefinder.com']) expect(html).toContain(`href="${href}"`)
    expect(html).toContain('/brand/sparkle-suite-logo-transparent.png')
    expect(html).toContain('/brand/sparkle-finder-logo-transparent.png')
    expect(html).toContain(sparkleSuitePublicLandingSafety.disclaimer)
    expect(html.slice(0, html.indexOf('<footer'))).not.toContain(sparkleSuitePublicLandingSafety.disclaimer)
    expect(html).not.toContain('href="#"')
  })

  it('does not mount public Nic-Nac or revive rejected marketing copy', () => {
    const html = renderLanding()
    expect(html).not.toContain('Ask Nic-Nac')
    expect(html).not.toContain('public-nic-nac')
    expect(html).not.toContain('<form')
    for (const phrase of ['Join the waitlist', 'Coming Soon', 'One easier home for your Bomb Party business', 'AI-powered platform', 'backend', 'pipeline']) expect(html).not.toContain(phrase)
    expect(html).toContain('Nic-Nac rep assistant')
  })

  it('redirects retired marketing routes and keeps home available to signed-in reps', async () => {
    const redirects = await nextConfig.redirects?.()
    expect(redirects).toEqual(expect.arrayContaining([
      { source: '/learn', destination: '/', statusCode: 301 },
      { source: '/demo', destination: '/#watch', statusCode: 301 },
    ]))
    const pageSource = readFileSync(join(process.cwd(), 'app/page.tsx'), 'utf8')
    expect(pageSource).toContain('readLandingFounderAvailability')
    expect(pageSource).toContain('readLandingDemo')
    expect(pageSource).not.toContain("redirect('/nic-nac')")
    expect(pageSource).not.toContain('supabase.auth.getUser()')
    expect(metadata.title).toEqual({ absolute: 'Sparkle Suite' })
    expect(metadata.alternates?.canonical).toBe('/')
    expect(JSON.stringify(metadata.openGraph)).not.toMatch(/49\.99|74\.99/)
  })
})
