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
    expect(html).toContain('Now building Sparkle Suite sites')
    expect(html).toContain('for Bomb Party reps')
    expect(html).toContain('href="/prelaunch#waitlist"')
    expect(html).toContain('Join the build queue')
    expect(html).not.toContain('href="/start"')
    expect(html).toContain('No payment to join.')
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
    expect(counted).toContain('<strong>18</strong>')
    expect(counted).toContain('18 founder spots remaining.')
    expect(counted).toContain('>Portfolio<')
    expect(counted).toContain('>Demos<')
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
    expect(html).toContain('Ask Nic-Nac')
    expect(html).toContain('aria-expanded="false"')
  })

  it('renders real local proof with alternative text and user-controlled previews', () => {
    const html = renderLanding()
    for (const asset of Object.values(sparkleSuitePublicLandingContent.assets)) {
      expect(asset.src).toMatch(/^\/sparkle-suite\/landing\/.+\.(png|webp)$/)
      expect(existsSync(publicAssetPath(asset.src))).toBe(true)
      expect(asset.alt).not.toMatch(/Louis|Chapman/)
    }
    expect(html).toContain('id="site-style-preview"')
    expect(html).toContain('src="/marketing/chasing-unicorns"')
    expect(html).toContain('width="1200"')
    expect(html).toContain('height="1260"')
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

  it('leads with distinct real themes and jewelry while explaining mobile support', () => {
    const html = renderLanding()
    expect(html).not.toContain('hero-halloween-witch-live.webp')
    expect(html).toContain('hero-halloween-cat-live.webp')
    expect(html).not.toContain('hero-halloween-witch-live.mp4')
    expect(html).toContain('hero-halloween-cat-live.mp4')
    expect(html).toContain('muted')
    expect(html).toContain('playsInline')
    expect(html).toContain('loop')
    expect(html).not.toContain('poster="/sparkle-suite/landing/hero-halloween-witch-live.webp"')
    expect(html).toContain('poster="/sparkle-suite/landing/hero-halloween-cat-live.webp"')
    expect(html).not.toContain('Pause Halloween · Witch animation')
    expect(html).toContain('Pause Halloween · Cat animation')
    expect(html).not.toContain('hero-desktop-motion.mp4')
    expect(html).not.toContain('hero-halloween-witch-desktop-v3.webp')
    expect(html).not.toContain('hero-halloween-cat-desktop-v1.webp')
    expect(html).not.toContain('Halloween · Witch')
    expect(html).toContain('Halloween · Cat')
    expect(html).not.toContain('Halloween Pumpkin and Witch homepage hero')
    expect(html).toContain('Halloween Cat homepage hero')
    expect(html).toContain('src="/brand/sparkle-suite-logo-transparent.png"')
    expect(html).not.toContain('/email-signatures/sparkle-suite-logo.png')
    expect(existsSync(publicAssetPath('/email-signatures/sparkle-suite-logo.png'))).toBe(true)
    expect(existsSync(publicAssetPath('/email-signatures/sparkle-finder-logo.png'))).toBe(true)
    expect(existsSync(publicAssetPath('/brand/sparkle-suite-logo-transparent.png'))).toBe(true)
    expect(html).not.toContain('hero-halloween-desktop-v2.webp')
    expect(html).not.toContain('Desktop · Halloween')
    const heroMarkup = html.slice(html.indexOf('id="main-content"'), html.indexOf('id="customer-site-proof"'))
    expect(heroMarkup).not.toContain('hero-halloween-witch-live.webp')
    expect(heroMarkup).toContain('hero-halloween-cat-live.webp')
    expect(heroMarkup).not.toContain('Halloween · Witch')
    expect(heroMarkup).toContain('Halloween · Cat')
    expect(heroMarkup).not.toContain('flying witch')
    expect(heroMarkup).not.toContain('hero-rose-mobile')
    expect(heroMarkup).not.toContain('Mobile · Rose Gold')
    expect(heroMarkup).not.toContain('<span></span><span></span><span></span>')
    const header = html.slice(html.indexOf('<header'), html.indexOf('</header>'))
    const explore = header.match(/aria-label="Explore Sparkle Suite">([\s\S]*?)<\/nav>/)?.[1] ?? ''
    const exploreLabels = [...explore.matchAll(/>([^<]+)</g)].map((match) => match[1])
    expect(exploreLabels).toEqual(['Portfolio', 'Demos'])
    const moduleCss = readFileSync(join(process.cwd(), 'app/_components/landing-experience.module.css'), 'utf8')
    const headerRule = moduleCss.match(/\.header\{[^}]+\}/)?.[0] ?? ''
    expect(headerRule).toContain('justify-content:flex-start')
    expect(headerRule).not.toContain('justify-content:space-between')
    expect(moduleCss).toContain('.account{margin-left:auto')
    expect(header).not.toContain('Your site')
    expect(header).not.toContain('Show tools')
    expect(header).not.toContain('Founding offer')
    expect(header).not.toContain('>Demo<')
    expect(html).toContain('id="customer-site-proof"')
    expect(html).toContain('id="workspace-proof"')
    expect(html).toContain('id="pricing"')
    expect(html).toContain('href="/portfolio"')
    expect(html).toContain('href="/demo"')
    expect(html).toContain('href="https://www.youtube.com/@SparkleSuite"')
    expect(html).toContain('href="https://www.tiktok.com/@yoursparklesuite.com"')
    expect(html).toContain('aria-label="Sparkle Suite on TikTok"')
    expect(html).toContain('aria-label="Sparkle Suite on YouTube"')
    expect(html).not.toContain('href="#"')
    expect(html).not.toContain('Demo soon')
    expect(html).not.toContain('https://www.tiktok.com/@sparklesuite"')
    expect(html).not.toContain('site-black-diamond-v2.webp')
    expect(html).not.toContain('site-gnome-forest-v2.webp')
    expect(html).not.toContain('site-alpine-opal-v2.webp')
    expect(html).not.toContain('site-amethyst-v2.webp')
    expect(html).not.toContain('hero-motion.mp4')
    expect(html).not.toContain('Gnome Forest')
    expect(html).not.toContain('Alpine Opal')
    expect(html).not.toContain('Dudes Fizzfest')
    expect(html).toContain('Chasing Unicorns')
    expect(html).toContain('dance-floor-sparkly-butterflies.webp')
    // Only the selected preview is rendered initially; the other two load on selection.
    const toolsSource = readFileSync(join(process.cwd(), 'app/_components/landing-interactions.tsx'), 'utf8')
    expect(toolsSource).toContain('calendar-upcoming-reveals.webp')
    expect(toolsSource).toContain('nic-nac-add-show-chat.webp')
    expect(html).not.toContain('dance-floor-garnet-v2.webp')
    expect(html).not.toContain('calendar-emerald-garden-v2.webp')
    expect(html).toContain('phones, tablets, and desktop')
    expect(html).not.toContain('/landing/live-queue.webp')
    expect(html).toContain('Live queue &amp; Dance Floor')
    expect(html).toContain('Preview 1 of 3')
    const peekCss = readFileSync(join(process.cwd(), 'app/_components/product-peek-video.module.css'), 'utf8')
    expect(moduleCss).toContain('.page .styleMedia img{object-fit:contain}')
    expect(moduleCss).toContain('.unicornFigure{width:100%;max-width:1000px')
    expect(moduleCss).toContain('.unicornStage{container-type:inline-size;width:100%;max-width:100%;aspect-ratio:1200/1260')
    expect(moduleCss).toContain('transform:scale(calc(100cqw / 1200px))')
    expect(moduleCss).toContain('width:1200px;height:1260px')
    expect(peekCss).toContain('@media (prefers-reduced-motion: reduce)')
    expect(peekCss).toContain('.motion')
    expect(existsSync(publicAssetPath('/sparkle-suite/landing/hero-halloween-witch-live.mp4'))).toBe(true)
    expect(existsSync(publicAssetPath('/sparkle-suite/landing/hero-halloween-cat-live.mp4'))).toBe(true)
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

  it('routes public Nic-Nac questions through the landing-page API', () => {
    const source = readFileSync(
      join(process.cwd(), 'app', '_components', 'sparkle-suite-public-nic-nac.tsx'),
      'utf8',
    )

    expect(source).toContain("fetch('/api/public/nic-nac'")
    expect(source).not.toContain('answerPublicNicNacQuestion(trimmedQuestion)')
    expect(source).toContain('isLoading')
    expect(source).toContain('collectContact')
  })

  it('keeps the public Nic-Nac conversation scrolled to the newest message', () => {
    const source = readFileSync(
      join(process.cwd(), 'app', '_components', 'sparkle-suite-public-nic-nac.tsx'),
      'utf8',
    )

    expect(source).toContain('threadEndRef')
    expect(source).toContain('scrollIntoView')
    expect(source).toContain('prefers-reduced-motion: reduce')
    expect(source).toContain("? 'instant' : 'smooth'")
  })

  it('uses the shared Nic-Nac pink N mark in the public chat shell', () => {
    const source = readFileSync(
      join(process.cwd(), 'app', '_components', 'sparkle-suite-public-nic-nac.tsx'),
      'utf8',
    )
    const markSource = readFileSync(
      join(process.cwd(), 'app', '_components', 'nic-nac-mark.tsx'),
      'utf8',
    )

    expect(source).toContain('NicNacMark')
    expect(markSource).toContain('N')
    expect(markSource).toContain('aria-hidden')
  })

  it('gives public Nic-Nac visible ecosystem controls for close and minimize', () => {
    const source = readFileSync(
      join(process.cwd(), 'app', '_components', 'sparkle-suite-public-nic-nac.tsx'),
      'utf8',
    )

    expect(source).toContain('aria-label="Minimize Nic-Nac"')
    expect(source).toContain('aria-label="Close Nic-Nac"')
    expect(source).toContain('aria-label="Open Nic-Nac"')
    expect(source).toContain('onKeyDown')
    expect(source).toContain('Escape')
  })

  it('styles public Nic-Nac controls as icon-sized chat window controls', () => {
    const css = readGlobalCss()

    expect(css).toContain('.sparkle-landing-v2 .sl2-nic-nac-panel__icon-button')
    expect(css).toContain('.sparkle-landing-v2 .sl2-nic-nac-reopen')
    expect(css).toContain('width: 36px')
    expect(css).toContain('height: 36px')
  })

  it('keeps the public Nic-Nac panel structured as a real chat window', () => {
    const css = readGlobalCss()

    expect(css).toContain('grid-template-rows: auto auto minmax(0, 1fr) auto')
    expect(css).toContain('.sparkle-landing-v2 .sl2-nic-nac-thread')
    expect(css).toContain('overflow-y: auto')
    expect(css).toContain('overscroll-behavior: contain')
    expect(css).toContain('position: sticky')
  })

  it('treats public Nic-Nac as a mobile bottom sheet', () => {
    const css = readGlobalCss()

    expect(css).toContain('@media (max-width: 680px)')
    expect(css).toContain('max-height: min(85dvh')
    expect(css).toContain('border-radius: 22px 22px 0 0')
  })

  it('uses the Nic-Nac mark on public assistant messages and a richer thinking state', () => {
    const source = readFileSync(
      join(process.cwd(), 'app', '_components', 'sparkle-suite-public-nic-nac.tsx'),
      'utf8',
    )
    const css = readGlobalCss()

    expect(source).toContain('sl2-nic-nac-message-row--assistant')
    expect(source).toContain('NicNacMark size={22}')
    expect(source).toContain('sl2-nic-nac-thinking-dots')
    expect(css).toContain('.sparkle-landing-v2 .sl2-nic-nac-message-row')
    expect(css).toContain('@keyframes sl2-nic-nac-dot-pulse')
  })

  it('handles public Nic-Nac focus and keyboard closing like a chat dialog', () => {
    const source = readFileSync(
      join(process.cwd(), 'app', '_components', 'sparkle-suite-public-nic-nac.tsx'),
      'utf8',
    )

    expect(source).toContain('openerRef')
    expect(source).toContain('inputRef')
    expect(source).toContain('inputRef.current?.focus()')
    expect(source).toContain('openerRef.current?.focus()')
    expect(source).toContain('handlePanelKeyDown')
    expect(source).toContain("event.key === 'Escape'")
  })

  it('presents public Nic-Nac handoff as a polished mini-card', () => {
    const source = readFileSync(
      join(process.cwd(), 'app', '_components', 'sparkle-suite-public-nic-nac.tsx'),
      'utf8',
    )
    const css = readGlobalCss()

    expect(source).toContain('sl2-nic-nac-handoff__head')
    expect(source).toContain('Leave this for Louis')
    expect(css).toContain('.sparkle-landing-v2 .sl2-nic-nac-handoff')
    expect(css).toContain('background: #fff6fa')
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
