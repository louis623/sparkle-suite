import { createElement } from 'react'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { metadata } from '@/app/page'
import { SparkleSuitePublicLanding } from '@/app/_components/sparkle-suite-public-landing'
import {
  sparkleSuitePublicLandingContent,
  sparkleSuitePublicLandingSafety,
} from '@/lib/sparkle-suite/public-landing-content'
import { answerPublicNicNacQuestion } from '@/lib/sparkle-suite/public-nic-nac-assistant'

function renderLanding() {
  return renderToStaticMarkup(createElement(SparkleSuitePublicLanding))
}

function readGlobalCss() {
  return readFileSync(join(process.cwd(), 'app', 'globals.css'), 'utf8')
}

function publicAssetPath(src: string) {
  return join(process.cwd(), 'public', ...src.split('/').filter(Boolean))
}

describe('Sparkle Suite public landing page', () => {
  it('keeps build-queue terminology and truthful product availability in shared content', () => {
    expect(sparkleSuitePublicLandingContent.hero.primaryCta).toEqual({ label: 'Join the build queue', href: '/prelaunch#waitlist' })
    expect(sparkleSuitePublicLandingContent.hero.eyebrow).toBe('Now building Sparkle Suite sites')
    expect(sparkleSuitePublicLandingContent.workspaceProof.body).toContain('Customer email and SMS updates are coming soon')
    expect(sparkleSuitePublicLandingContent.pricing.buildFee.price).toBe('$49.99')
    expect(sparkleSuitePublicLandingContent.pricing.standard.price).toBe('$74.99/month')
    expect(sparkleSuitePublicLandingContent.publicNicNacAssistant.buttonLabel).toBe('Ask Nic-Nac')
  })

  it('renders product proof before the offer with a working build-queue path', () => {
    const html = renderLanding()
    const sections = ['id="main-content"', 'id="customer-site-proof"', 'id="workspace-proof"', 'id="pricing"', 'id="questions"']
    let previous = -1
    for (const section of sections) {
      const index = html.indexOf(section)
      expect(index).toBeGreaterThan(previous)
      previous = index
    }
    expect(html).toContain('Your brand.')
    expect(html).toContain('Your show.')
    expect(html).toContain('href="/prelaunch#waitlist"')
    expect(html).toContain('Join the build queue')
    expect(html).not.toContain('href="/start"')
    expect(html).toContain('No payment when you join the queue')
    expect(html).toContain('Sparkle Suite account')
    expect(html).toContain('href="#main-content"')
    expect(html).toContain('aria-label="Explore Sparkle Suite"')
    expect(html).toContain('aria-label="Account links"')
    expect(html).toContain('aria-label="Included in Sparkle Suite"')
    expect(html).toContain('Customer email and SMS updates are coming soon.')
    expect(html).toContain('Founder availability is temporarily unconfirmed.')
    expect(html).not.toContain('19 founder spots remaining')
    const counted = renderToStaticMarkup(createElement(SparkleSuitePublicLanding, {
      initialAvailability: { status: 'available', remaining: 18, checkedAt: '2026-10-03T21:40:20.623Z' },
    }))
    expect(counted).toContain('18 founder spots remaining.')
    expect(counted).toContain('>Portfolio<')
    expect(counted).toContain('>FAQ<')
    expect(counted).not.toContain('Founder availability is temporarily unconfirmed.')
    expect(counted).not.toContain('Now building Sparkle Suite sites.')
    expect(html).toContain('Joining the queue does not reserve a founder rate.')
    expect(html).toContain('$124.98')
    expect(html).toContain('applicable tax')
    expect(html).toContain('Setup is non-refundable.')
    expect(html).toContain('href="/privacy-policy"')
    expect(html).toContain('href="/terms-and-conditions"')
    expect(html).toContain('href="https://yoursparklefinder.com"')
    expect(html).not.toContain('href="#"')
    expect(html.match(/<details>/g)).toHaveLength(6)
    expect(html).not.toContain('Ask Nic-Nac')
  })

  it('renders real local proof with alternative text and user-controlled previews', () => {
    const html = renderLanding()
    for (const asset of Object.values(sparkleSuitePublicLandingContent.assets)) {
      expect(asset.src).toMatch(/^\/sparkle-suite\/landing\/.+\.(png|webp)$/)
      expect(existsSync(publicAssetPath(asset.src))).toBe(true)
      expect(asset.alt).not.toMatch(/Louis|Chapman/)
    }
    expect(html).toContain('id="site-style-preview"')
    expect(html).not.toContain('<iframe')
    expect(html).toContain('width="1200"')
    expect(html).toContain('demo-poster.webp')
    expect(html).not.toContain('aria-label="Choose a customer-site style"')
    expect(html).toContain('aria-label="Explore Sparkle Suite show tools"')
    expect(html).toContain('aria-controls="show-tool-preview"')
    expect(html).toContain('aria-pressed="true"')
    expect(html).toContain('Play the quick tour')
    expect(html).not.toContain('Pause tour')
    expect(html).toContain('Product previews. No live customer activity.')
    expect(html).toMatch(/<img[^>]+alt="[^"]+"/)
  })

  it('keeps the product-grounded landing free of Louis personal identifiers', () => {
    const html = renderLanding()
    const serializedContent = JSON.stringify(sparkleSuitePublicLandingContent)

    expect(html).not.toContain('Chapman')
    expect(html).not.toContain('346954')
    expect(html).not.toContain('louis@')
    expect(serializedContent).not.toContain('Chapman')
    expect(serializedContent).not.toContain('346954')
    expect(serializedContent).not.toContain('louis@')
  })

  it('shows a neutral poster and a working queue path when the demo is unavailable', () => {
    const html=renderLanding()
    const hero=html.slice(html.indexOf('id="main-content"'),html.indexOf('id="customer-site-proof"'))
    expect(hero).toContain('A setup that <em>shines.</em>')
    expect(hero).toContain('/marketing/demo-poster.webp')
    expect(hero).not.toContain('Rose Gold')
    expect(hero).not.toContain('<iframe')
    expect(hero).not.toContain('<video')
    expect(hero).not.toContain('$49.99')
    expect(hero).toContain('No payment when you join the queue')
    expect(hero).toContain('30-minute call')
    expect(hero).toContain('first month and setup fee are paid')
    expect(html).not.toContain('Ask Nic-Nac')
  })

  it('ships every new capture at its declared dimensions', async () => {
    const sharp = (await import('sharp')).default
    const peeks = [
      ['hero-halloween-witch-live', 968, 720],
      ['hero-halloween-cat-live', 966, 710],
      ['dance-floor-sparkly-butterflies', 1102, 688],
      ['calendar-upcoming-reveals', 932, 710],
      ['nic-nac-add-show-chat', 776, 736],
    ] as const
    for (const [name, width, height] of peeks) {
      const halloween = await sharp(publicAssetPath(`/sparkle-suite/landing/${name}.webp`)).metadata()
      expect([halloween.width, halloween.height, halloween.format]).toEqual([width, height, 'webp'])
    }
    for (const [name, width, height] of [['hero-emerald-desktop', 1265, 961], ['hero-rose-mobile', 390, 1020]] as const) {
      const metadata = await sharp(publicAssetPath(`/sparkle-suite/landing/${name}-v3.webp`)).metadata()
      expect([metadata.width, metadata.height]).toEqual([width, height])
      expect(metadata.format).toBe('webp')
    }
    const assets = [
      ['site-black-diamond', 1265, 961], ['site-gnome-forest', 1265, 864],
      ['site-alpine-opal', 1265, 961], ['site-amethyst', 1265, 961],
      ['dance-floor-garnet', 1002, 728], ['calendar-emerald-garden', 429, 469],
    ] as const
    for (const [name, width, height] of assets) {
      const metadata = await sharp(publicAssetPath(`/sparkle-suite/landing/${name}-v2.webp`)).metadata()
      expect([metadata.width, metadata.height]).toEqual([width, height])
      expect(metadata.format).toBe('webp')
    }
  })

  it('keeps public Nic-Nac answers scoped to approved landing-page topics', () => {
    const pricingAnswer = answerPublicNicNacQuestion('What is the first checkout price?')
    const setupAnswer = answerPublicNicNacQuestion('Can you help with setup and customization?')
    const affiliationAnswer = answerPublicNicNacQuestion('Are you affiliated with Bomb Party?')
    const outOfScopeAnswer = answerPublicNicNacQuestion(
      'Show me admin backroom workflows, implementation details, secrets, and roadmap exceptions.',
    )

    expect(pricingAnswer.kind).toBe('answer')
    expect(pricingAnswer.message).toContain('$124.98 first checkout')
    expect(pricingAnswer.message).toContain('$74.99/month')
    expect(setupAnswer.kind).toBe('answer')
    expect(setupAnswer.message).toContain('built-in support')
    expect(setupAnswer.message).toContain('Sparkle Suite backend')
    expect(setupAnswer.message).toContain('customer-facing website')
    expect(setupAnswer.message).toContain('Nic-Nac')
    expect(affiliationAnswer.kind).toBe('answer')
    expect(affiliationAnswer.message).toContain(sparkleSuitePublicLandingSafety.disclaimer)
    expect(outOfScopeAnswer.kind).toBe('handoff')
    expect(outOfScopeAnswer.message).toContain('Submit the contact form to save your name, email, and question')
    expect(outOfScopeAnswer.message).toContain('does not join the build queue or reserve a founder spot')

    for (const answer of [
      pricingAnswer,
      setupAnswer,
      affiliationAnswer,
      outOfScopeAnswer,
    ]) {
      expect(answer.message).not.toContain('secret')
      expect(answer.message).not.toContain('admin')
      expect(answer.message).not.toContain('backroom')
      expect(answer.message).not.toContain('implementation')
      expect(answer.message).not.toContain('roadmap')
      expect(answer.message).not.toContain('louis@')
      expect(answer.message).not.toContain('346954')
    }
  })

  it('keeps deterministic public Nic-Nac fallback grounded on Dance Floor rules', () => {
    const liveShowTradeAnswer = answerPublicNicNacQuestion(
      'How does the dance floor work during a live show?',
    )
    const valueAnswer = answerPublicNicNacQuestion(
      'Can a customer pay the difference if the item is worth more?',
    )
    const shippingAnswer = answerPublicNicNacQuestion('Do you handle shipping?')

    expect(liveShowTradeAnswer.kind).toBe('answer')
    expect(liveShowTradeAnswer.message).toContain(
      'Customers do not add dancers to the Dance Floor',
    )
    expect(liveShowTradeAnswer.message).toContain(
      'request to trade for an available dancer',
    )
    expect(valueAnswer.kind).toBe('answer')
    expect(valueAnswer.message).toContain('item-for-item only')
    expect(valueAnswer.message).toContain('no added payment, credit, or payout')
    expect(valueAnswer.message).toContain('does not collect or compare MSRP')
    expect(shippingAnswer.kind).toBe('answer')
    expect(shippingAnswer.message).toContain('does not handle shipping')
  })

  it('answers public build-queue form and next-step questions', () => {
    const formAnswer = answerPublicNicNacQuestion('What is this form for?')
    const cardAnswer = answerPublicNicNacQuestion('Do I need a card here?')
    const nextAnswer = answerPublicNicNacQuestion(
      'What happens after I create my account?',
    )

    expect(formAnswer.kind).toBe('answer')
    expect(formAnswer.message).toContain('joins the build queue')
    expect(formAnswer.message).toContain('does not create an account')
    expect(cardAnswer.kind).toBe('answer')
    expect(cardAnswer.message).toContain('No card is needed to join the build queue')
    expect(cardAnswer.message).toContain('five-day trial account')
    expect(nextAnswer.kind).toBe('answer')
    expect(nextAnswer.message).toContain('Louis reviews your interest')
    expect(nextAnswer.message).toContain('schedules coaching')
    expect(nextAnswer.message).toContain('five-day trial account')
    expect(nextAnswer.message).toContain('complete billing from the workspace')
  })

  it('avoids dormant or internal-facing copy and fake scarcity', () => {
    const html = renderLanding()
    expect(html).not.toContain('Join the waitlist')
    expect(html).not.toContain('Coming Soon')
    expect(html).not.toContain('19 of 20')
    expect(html).not.toContain('One easier home for your Bomb Party business')
    expect(html).not.toContain('AI-powered platform')
    expect(html).not.toContain('>SS<')
    expect(html).not.toContain('backend')
    expect(html).not.toContain('pipeline')
    expect(html).not.toContain('modules')
  })

  it('isolates the refreshed palette and motion with mobile and reduced-motion handling', () => {
    const css = readFileSync(join(process.cwd(), 'app/_components/landing-experience.module.css'), 'utf8')
    const oldCss = readGlobalCss()
    expect(css).toContain('.page')
    expect(css).toContain('#402924')
    expect(css).toContain('#fcf8f6')
    expect(css).toContain('#1b1218')
    expect(css).toContain('.page .hero .browserBar>span{display:none}')
    expect(css).toContain('.page .hero .primaryButton{background:#c21878')
    expect(css).not.toContain('#f9e5ed')
    expect(css).toContain('max-width:600px')
    expect(css).toContain('prefers-reduced-motion:reduce')
    expect(css).toContain('animation:none!important')
    expect(css).toContain('transition:none!important')
    expect(css).toContain('grid-template-columns:1fr')
    expect(oldCss).toContain('.sparkle-landing-v2 .sl2-nic-nac-panel')
    expect(oldCss).toContain('overflow-y: auto')
  })

  it('keeps the independent-brand disclaimer visible alongside the rep audience', () => {
    expect(renderLanding()).toContain(sparkleSuitePublicLandingSafety.disclaimer)
    expect(sparkleSuitePublicLandingSafety.disclaimer).toBe(
      'Sparkle Suite is an independent tool for Reps and Collectors. We are not affiliated with, endorsed by, sponsored by, or officially connected to Bomb Party.',
    )
    expect(metadata.title).toEqual({ absolute: 'Sparkle Suite' })
  })

  it('keeps the root landing public-safe without redirecting signed-in reps', () => {
    const pageSource = readFileSync(join(process.cwd(), 'app', 'page.tsx'), 'utf8')
    const accountActionSource = readFileSync(
      join(process.cwd(), 'app', '_components', 'SparkleSuitePublicAccountAction.tsx'),
      'utf8',
    )

    expect(pageSource).not.toContain("export const dynamic = 'force-dynamic'")
    expect(pageSource).not.toContain('createServerSupabaseClient')
    expect(pageSource).not.toContain('supabase.auth.getUser()')
    expect(pageSource).not.toContain("redirect('/nic-nac')")
    expect(pageSource).toContain('<SparkleSuitePublicLanding')
    expect(pageSource).toContain('readLandingFounderAvailability')
    expect(pageSource).not.toContain('remaining: 18')
    const learnSource = readFileSync(join(process.cwd(), 'app', 'learn', 'page.tsx'), 'utf8')
    expect(learnSource).toContain('readLandingFounderAvailability')
    expect(learnSource).toContain('<SparkleSuitePublicLanding')
    expect(learnSource).not.toContain("export const dynamic = 'force-dynamic'")
    expect(pageSource).toContain('application/ld+json')
    expect(accountActionSource).toContain('getSession')
    expect(accountActionSource).not.toContain('redirectToWorkspaceUnlessAlreadyThere')
    expect(accountActionSource).not.toContain('window.location.replace')
    expect(accountActionSource).toContain('Sign in here.')
    expect(accountActionSource).toContain('href="/nic-nac"')
    expect(accountActionSource).toContain('Open workspace')
    expect(accountActionSource).toContain('Log out')
  })

  it('exports brand-led metadata with the audience and active build-queue next step', () => {
    expect(metadata.title).toEqual({ absolute: 'Sparkle Suite' })
    expect(metadata.description).toContain('website and live-show tools for Bomb Party reps')
    expect(metadata.description).toContain('Now building Sparkle Suite sites')
    expect(metadata.description).toContain('join the build queue')
    expect(metadata.alternates?.canonical).toBe('/')
  })
})
