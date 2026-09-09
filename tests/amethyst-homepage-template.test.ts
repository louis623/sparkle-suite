import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import {
  buildAmethystHomepageBootstrapScript,
  buildAmethystHomepageTweakDefaults,
  defaultAmethystHomepageTemplateData,
  enrichAmethystHomepageFeatureData,
} from '@/lib/amethyst/homepage-template-data'
import { AMETHYST_APPEARANCE_PRESETS } from '@/lib/amethyst/appearance-presets'

describe('Amethyst homepage template data wiring', () => {

  it('stacks the customer-facing reveal explainer into compact readable rows on phones', () => {
    const css = readFileSync(
      resolve(process.cwd(), 'public/amethyst/homepage.css'),
      'utf8',
    )

    expect(css).toMatch(
      /@media \(max-width: 720px\) \{[\s\S]*?\.hp-steps\s*\{[\s\S]*?grid-template-columns:\s*1fr;/,
    )
    expect(css).toMatch(
      /@media \(max-width: 720px\) \{[\s\S]*?\.hp-step\s*\{[\s\S]*?grid-template-columns:\s*42px minmax\(0, 1fr\);/,
    )
    expect(css).toMatch(
      /@media \(max-width: 720px\) \{[\s\S]*?\.hp-step-num\s*\{[\s\S]*?grid-row:\s*span 2;/,
    )
  })

  it('keeps the customer-facing Nic-Nac launcher out of public Amethyst exports', () => {
    const homepage = readFileSync(
      resolve(process.cwd(), 'public/amethyst/homepage.jsx'),
      'utf8',
    )
    const trade = readFileSync(
      resolve(process.cwd(), 'public/amethyst/trade.jsx'),
      'utf8',
    )
    const join = readFileSync(
      resolve(process.cwd(), 'public/amethyst/join.jsx'),
      'utf8',
    )
    const css = readFileSync(
      resolve(process.cwd(), 'public/amethyst/homepage.css'),
      'utf8',
    )

    for (const jsx of [homepage, trade, join]) {
      expect(jsx).not.toContain('aria-label="Open Nic-Nac"')
      expect(jsx).not.toContain('className="hp-nic-nac"')
      expect(jsx).not.toContain('label="Nic-Nac launcher"')
    }
    expect(css).not.toContain('.hp-nic-nac')
    expect(css).not.toContain('hp-nic-nac-spark')
  })

  it('keeps locked public fallback exports on the shared demo identity', () => {
    const files = [
      'public/amethyst/Homepage.html',
      'public/amethyst/Trade.html',
      'public/amethyst/Join.html',
      'public/amethyst/Unsubscribe.html',
      'public/amethyst/homepage.jsx',
      'public/amethyst/trade.jsx',
      'public/amethyst/join.jsx',
      'public/amethyst/unsubscribe.jsx',
    ].map((file) => readFileSync(resolve(process.cwd(), file), 'utf8'))
    const serialized = files.join('\n')

    expect(serialized).toContain('Sparkle by Sasha')
    expect(serialized).not.toContain('Sasha Rivera')
    expect(serialized).not.toMatch(/\b(?:Rep Name|Show Name)\b/)
    expect(serialized).not.toContain("Jane's Sparkle Party")
  })

  it('loads legacy public JSX exports with Babel and ships Join as a production bundle', () => {
    const htmlFiles = [
      'public/amethyst/Homepage.html',
      'public/amethyst/Trade.html',
      'public/amethyst/Pantry.html',
      'public/amethyst/Unsubscribe.html',
    ]

    for (const file of htmlFiles) {
      const html = readFileSync(resolve(process.cwd(), file), 'utf8')
      const jsxScripts = html.match(
        /<script type="text\/babel"[^>]+\.jsx(?:\?[^"]*)?"><\/script>/g,
      ) ?? []

      expect(jsxScripts.length, file).toBeGreaterThan(0)
      for (const script of jsxScripts) {
        expect(script, file).toContain('data-presets="react"')
        expect(script, file).toMatch(/\?v=[^"\s]+/)
      }
    }

    const homepage = readFileSync(
      resolve(process.cwd(), 'public/amethyst/Homepage.html'),
      'utf8',
    )
    expect(homepage).toContain('homepage.jsx?v=20260905-lineup4')

    const join = readFileSync(
      resolve(process.cwd(), 'public/amethyst/Join.html'),
      'utf8',
    )
    expect(join).toContain('src="join-runtime.js?')
    expect(join).not.toContain('type="text/babel"')
    expect(join).not.toContain('react.development')
    expect(join).not.toContain('babel')
  })

  it('keeps the shared tweaks helper scoped while exporting controls on window', () => {
    const tweaksPanel = readFileSync(
      resolve(process.cwd(), 'public/amethyst/tweaks-panel.jsx'),
      'utf8',
    )

    expect(tweaksPanel).toContain('(function initAmethystTweaksPanel() {')
    expect(tweaksPanel).toContain('Object.assign(window, {')
    expect(tweaksPanel.trim()).toMatch(/\}\)\(\);$/)
  })

  it('marks animated ticker tracks as decorative and provides concise screen-reader summaries', () => {
    const homepage = readFileSync(
      resolve(process.cwd(), 'public/amethyst/homepage.jsx'),
      'utf8',
    )
    const trade = readFileSync(
      resolve(process.cwd(), 'public/amethyst/trade.jsx'),
      'utf8',
    )
    const join = readFileSync(
      resolve(process.cwd(), 'public/amethyst/join.jsx'),
      'utf8',
    )
    const css = readFileSync(
      resolve(process.cwd(), 'public/amethyst/homepage.css'),
      'utf8',
    )

    for (const jsx of [homepage, trade, join]) {
      expect(jsx).toContain('className="hp-ticker-sr"')
      expect(jsx).toContain('aria-hidden="true"')
      expect(jsx).toContain('aria-label="Customer site updates"')
      expect(jsx).toContain('function parseAnnouncementTickerItems(topText)')
      expect(jsx).toContain('target="_blank" rel="noreferrer"')
      expect(jsx).toContain('hp-ticker-item-link')
      expect(jsx).toContain('split(/\\n|\\|/)')
      expect(jsx).toContain('const linkPattern = /\\[([^\\]]+)\\]\\(([^()\\s]+)\\)/g')
      expect(jsx).toContain('item.parts.map((part, partIndex) => part.href')
      expect(jsx).not.toContain('item.href ? (')
    }
    expect(css).toContain('.hp-ticker-sr')
    expect(css).toMatch(/\.hp-ticker-sr[\s\S]*?clip:\s*rect\(0 0 0 0\);/)
  })

  it('keeps customer-facing ticker speeds content-length independent', () => {
    const css = readFileSync(
      resolve(process.cwd(), 'public/amethyst/homepage.css'),
      'utf8',
    )
    const componentsCss = readFileSync(
      resolve(process.cwd(), 'public/amethyst/components.css'),
      'utf8',
    )
    const homepage = readFileSync(
      resolve(process.cwd(), 'public/amethyst/homepage.jsx'),
      'utf8',
    )
    const trade = readFileSync(
      resolve(process.cwd(), 'public/amethyst/trade.jsx'),
      'utf8',
    )
    const join = readFileSync(
      resolve(process.cwd(), 'public/amethyst/join.jsx'),
      'utf8',
    )
    const shell = readFileSync(
      resolve(process.cwd(), 'components/amethyst/site-shell.tsx'),
      'utf8',
    )

    expect(css).toContain('--hp-ticker-speed-pps: 46;')
    expect(css).toContain('--hp-trade-ticker-speed-pps: 55.2;')
    expect(css).toContain('animation: hp-ticker-scroll var(--hp-ticker-dynamic-duration, var(--hp-ticker-duration, 72s)) linear infinite;')
    expect(css).toContain('animation-duration: calc(var(--hp-ticker-dynamic-duration, var(--hp-ticker-duration, 72s)) / var(--ticker-speed, 1));')
    expect(css).toContain('animation-duration: calc(var(--hp-ticker-dynamic-duration, var(--hp-trade-ticker-duration, 60s)) / var(--ticker-speed, 1));')
    expect(css).toContain('transform: translateX(var(--hp-ticker-scroll-offset, -50%));')
    expect(componentsCss).toContain('--ticker-speed-pps: 46;')
    expect(componentsCss).toContain('--trade-ticker-speed-pps: 55.2;')
    expect(shell).toContain("'use client'")
    expect(shell).toContain('data-ticker-pps={ANNOUNCEMENT_TICKER_SPEED_PPS}')
    expect(shell).toContain('data-ticker-pps={TRADE_TICKER_SPEED_PPS}')
    expect(shell).toContain('useDynamicTickerMotion()')
    expect(shell).toContain('`${distance / pixelsPerSecond}s`')
    expect(shell).not.toContain('Math.max(12, distance / pixelsPerSecond)')
    expect(shell).toContain('const EMPTY_TRADE_TICKER_ITEM = {')
    expect(shell).toContain(
      'const tradeTickerSource: TradeTickerItem[] = content.tradeBoardListings.length > 0',
    )
    expect(shell).toContain(
      'const tradeItems = buildTickerLoopItems(tradeTickerSource, 15)',
    )
    expect(shell).toContain('{listing.title} - {listing.type || \'Jewelry\'} - {listing.collection || \'Collection pending\'}')
    expect(shell).not.toContain('{listing.title} · {listing.msrpLabel}')
    expect(shell).not.toContain('amethyst-scroll 72s linear infinite')
    expect(shell).not.toContain('amethyst-scroll 60s linear infinite reverse')
    expect(shell).toContain(
      'className="inline-flex items-center whitespace-nowrap text-[13px] font-bold text-[var(--amethyst-fg)]"',
    )
    expect(shell).toContain(
      'className="inline-flex items-center gap-2 whitespace-nowrap text-[13px] font-bold text-[var(--amethyst-fg)] transition hover:text-[var(--amethyst-primary)]"',
    )

    for (const jsx of [homepage, trade, join]) {
      expect(jsx).toContain('tickerSpeed: 1')
      expect(jsx).toContain('`${distance / pixelsPerSecond}s`')
      expect(jsx).not.toContain('Math.max(12, distance / pixelsPerSecond)')
      expect(jsx).toContain('const EMPTY_TRADE_TICKER_ITEM = {')
      expect(jsx).toContain(
        'const tradeTickerSource = isBrittWithBlingHybrid ? [{ name: "Digital Dance Floor coming soon", isEmpty: true }] : trades.length > 0 ? trades : [EMPTY_TRADE_TICKER_ITEM];',
      )
      expect(jsx).toContain(
        'const tickerTrades = buildTickerLoopItems(tradeTickerSource, 15);',
      )
      expect(jsx).not.toContain(
        '<span className="hp-ticker-empty">Dance Floor listings will appear here after pieces are added.</span>',
      )
      expect(jsx).toMatch(
        /className="hp-ticker-empty"[\s\S]*?data-ticker-segment-start=[\s\S]*?data-ticker-segment-repeat-start=/,
      )
    }
    expect(css).toMatch(
      /\.hp-ticker-trade\s*\{[\s\S]*?font-weight:\s*700;/,
    )
    expect(css).toMatch(
      /\.hp-ticker-empty\s*\{[\s\S]*?font-weight:\s*700;/,
    )
    for (const preset of Object.values(AMETHYST_APPEARANCE_PRESETS)) {
      expect(preset.values.tickerSpeed).toBe(1)
    }
  })

  it('keeps Emerald Garden on the shared ticker contract with readable announcements and the standard hero composition', () => {
    const css = readFileSync(
      resolve(process.cwd(), 'public/amethyst/homepage.css'),
      'utf8',
    )
    const tradeCss = readFileSync(
      resolve(process.cwd(), 'public/amethyst/trade.css'),
      'utf8',
    )
    const emeraldCss = css.slice(css.indexOf('/* Emerald Garden'))
    const emeraldTradeCss = tradeCss.slice(
      tradeCss.indexOf('/* Emerald Garden trade-board continuation */'),
    )

    expect(AMETHYST_APPEARANCE_PRESETS.emerald_garden.values.tickerSpeed).toBe(1)
    expect(emeraldCss).not.toContain('--ticker-speed')
    expect(emeraldCss).not.toContain('animation-duration')
    expect(emeraldCss).toMatch(
      /body\.bg-emerald-garden \.hp-ticker-row:not\(\.reverse\) \.hp-ticker-item\s*\{[\s\S]*?color:\s*#ffffff;/,
    )
    expect(emeraldCss).toContain(
      'linear-gradient(135deg, #dce8dc 0%, #7fa58c 30%, #236c55 58%, #063b2e 100%)',
    )
    expect(emeraldTradeCss).toContain(
      'linear-gradient(135deg, #dce8dc 0%, #7fa58c 30%, #236c55 58%, #063b2e 100%)',
    )
    expect(emeraldCss).not.toContain(
      'radial-gradient(ellipse at 9% 48%, rgba(255, 255, 255, 0.94)',
    )
    expect(emeraldCss).toMatch(
      /body\.bg-emerald-garden \.hp-hero-inner > div\s*\{[\s\S]*?background:\s*transparent;[\s\S]*?backdrop-filter:\s*none;/,
    )
    expect(emeraldCss).not.toContain(
      'body.bg-emerald-garden .hp-signup .hp-signup-title,',
    )
  })

  it('builds duplicate ticker loops for measured pixel-speed animation', () => {
    const homepage = readFileSync(
      resolve(process.cwd(), 'public/amethyst/homepage.jsx'),
      'utf8',
    )
    const trade = readFileSync(
      resolve(process.cwd(), 'public/amethyst/trade.jsx'),
      'utf8',
    )
    const join = readFileSync(
      resolve(process.cwd(), 'public/amethyst/join.jsx'),
      'utf8',
    )

    expect(homepage).toContain('buildTickerLoopItems(tradeTickerSource, 15)')
    expect(trade).toContain('buildTickerLoopItems(tradeTickerSource, 15)')
    expect(join).toContain('buildTickerLoopItems(tradeTickerSource, 15)')

    for (const jsx of [homepage, trade, join]) {
      expect(jsx).toContain('const ANNOUNCEMENT_TICKER_SPEED_PPS = 46')
      expect(jsx).toContain('const TRADE_TICKER_SPEED_PPS = 55.2')
      expect(jsx).toContain('function buildTickerLoopItems(items, minimumSegmentItems)')
      expect(jsx).toContain('function useDynamicTickerMotion()')
      expect(jsx).toContain('CONTENT.tradeBoardTickerItems')
      expect(jsx).toContain('{tr.name} - {tr.type || "Jewelry"} - {tr.collection || "Collection pending"}')
      expect(jsx).toContain('data-ticker-segment-start')
      expect(jsx).toContain('data-ticker-segment-repeat-start')
      expect(jsx).toContain('data-ticker-pps={TRADE_TICKER_SPEED_PPS}')
      expect(jsx).not.toContain('[...trades, ...trades, ...trades]')
      expect(jsx).not.toContain('[...TICKER_TRADES, ...TICKER_TRADES, ...TICKER_TRADES]')
      expect(jsx).not.toContain('trade.name} - {trade.meta')
      expect(jsx).not.toContain('trade.name} Â· {trade.price')
    }
  })

  it('ships shared customer-facing mobile CSS containment and motion safeguards', () => {
    const tokensCss = readFileSync(
      resolve(process.cwd(), 'public/amethyst/tokens.css'),
      'utf8',
    )
    const css = readFileSync(
      resolve(process.cwd(), 'public/amethyst/homepage.css'),
      'utf8',
    )

    expect(tokensCss).toContain('overflow-x: clip;')
    expect(tokensCss).toContain('max-width: 100%;')
    expect(css).toMatch(/@media\s+\(max-width:\s*640px\)[\s\S]*?\.hp-ticker[\s\S]*?overflow-x:\s*clip;/)
    expect(css).toMatch(/@media\s+\(max-width:\s*640px\)[\s\S]*?\.hp-header-nav[\s\S]*?max-width:\s*100%;/)
    expect(css).toMatch(/@media\s+\(max-width:\s*640px\)[\s\S]*?\.hp-header-link[\s\S]*?font-size:\s*12px;/)
    expect(css).toMatch(/@media\s+\(max-width:\s*640px\)[\s\S]*?\.hp-ticker-track[\s\S]*?min-width:\s*max-content;/)
    expect(css).toContain('.hp-sticky-stack')
    expect(css).toMatch(/\.hp-sticky-stack\s*\{[\s\S]*?position:\s*sticky;/)
    expect(css).toMatch(/@media\s+\(max-width:\s*900px\)[\s\S]*?\.hp-sticky-stack,[\s\S]*?\.bk-home-header,[\s\S]*?\.mhf-header,[\s\S]*?\.bwb-header\s*\{[\s\S]*?position:\s*static;/)
    expect(css).toMatch(/body\.homepage\s+#root,[\s\S]*?body\.tradepage\s+#root,[\s\S]*?body\.joinpage\s+#root\s*\{[\s\S]*?overflow:\s*visible;/)
    expect(css).toMatch(/@media\s+\(pointer:\s*coarse\)[\s\S]*?\.hp-header-link[\s\S]*?min-height:\s*44px;/)
    expect(css).toMatch(/@media\s+\(pointer:\s*coarse\)[\s\S]*?\.hp-queue-modal-close[\s\S]*?min-width:\s*44px;/)
    expect(css).toMatch(/@media\s+\(prefers-reduced-motion:\s*reduce\)[\s\S]*?transition-duration:\s*0\.01ms\s*!important;/)
    expect(css).toMatch(/@media\s+\(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.hp-ticker-track[\s\S]*?animation:\s*none\s*!important;/)
    expect(css).toMatch(/@media\s+\(prefers-reduced-motion:\s*reduce\)[\s\S]*?body\.tex-sparkle::before[\s\S]*?animation:\s*none\s*!important;/)
    expect(css).toMatch(/@media\s+\(prefers-reduced-motion:\s*reduce\)[\s\S]*?body\.cta-pulse\s+\.hp-btn-primary:not\(\.outline\)[\s\S]*?animation:\s*none\s*!important;/)
    expect(css).toMatch(/\.hp-hero-headline\s*\{[\s\S]*?line-height:\s*1\.08;/)
    expect(css).toMatch(/\.hp-hero-headline\s*\{[\s\S]*?padding-block:\s*0\.04em 0\.12em;/)
    expect(css).toMatch(/\.hp-hero-headline\s*\{[\s\S]*?overflow:\s*visible;/)
    expect(css).toMatch(/\.hp-section-title\s*\{[\s\S]*?line-height:\s*1\.12;/)
    expect(css).toMatch(/\.hp-section-title\s*\{[\s\S]*?padding-block:\s*0\.03em 0\.09em;/)
    expect(css).toMatch(/\.hp-signup-title\s*\{[\s\S]*?line-height:\s*1\.14;/)
    expect(css).toMatch(/@media\s+\(max-width:\s*640px\)[\s\S]*?\.hp-hero-headline[\s\S]*?font-size:\s*clamp\(36px,\s*10\.5vw,\s*48px\);/)
    expect(css).toMatch(/@media\s+\(max-width:\s*640px\)[\s\S]*?\.hp-hero-inner[\s\S]*?width:\s*100vw;/)
    expect(css).toMatch(/@media\s+\(max-width:\s*640px\)[\s\S]*?\.hp-hero-inner[\s\S]*?margin-inline:\s*calc\(50% - 50vw\);/)
    expect(css).toMatch(/\.hp-hero-inner\s*\{[\s\S]*?justify-content:\s*center;/)
    expect(css).toMatch(/\.hp-hero-inner\s*\{[\s\S]*?text-align:\s*center;/)
    expect(css).toMatch(/\.hp-hero-ctas\s*\{[\s\S]*?justify-content:\s*center;/)
    expect(css).toMatch(/@media\s+\(max-width:\s*640px\)[\s\S]*?\.hp-hero-headline[\s\S]*?max-width:\s*11ch;/)
    expect(css).toMatch(/@media\s+\(max-width:\s*640px\)[\s\S]*?\.hp-hero-headline[\s\S]*?padding-block:\s*0\.04em 0\.12em;/)
    expect(css).toMatch(/@media\s+\(max-width:\s*640px\)[\s\S]*?\.hp-hero-headline[\s\S]*?overflow-wrap:\s*anywhere;/)
    expect(css).not.toContain('.hp-hero-media.placeholder::after')
  })

  it('maps structured editable content into the locked homepage tweak defaults', () => {
    const defaults = buildAmethystHomepageTweakDefaults(
      defaultAmethystHomepageTemplateData,
    )

    expect(defaults.repName).toBe(defaultAmethystHomepageTemplateData.repName)
    expect(defaults.businessName).toBe(
      defaultAmethystHomepageTemplateData.businessName,
    )
    expect(defaults.heroHeadline).toBe(
      defaultAmethystHomepageTemplateData.heroHeadline,
    )
    expect(defaults.heroSub).toBe(defaultAmethystHomepageTemplateData.heroSub)
    expect(defaults.heroMotion).toBe('sparkle_rise')
    expect(defaults.tickerTopText).toBe(
      defaultAmethystHomepageTemplateData.tickerTopText,
    )
  })

  it('serializes the full editable homepage payload for the locked export runtime', () => {
    const script = buildAmethystHomepageBootstrapScript(
      defaultAmethystHomepageTemplateData,
    )

    expect(script).toContain('window.AMETHYST_HOMEPAGE_TEMPLATE_DATA')
    expect(script).toContain('window.AMETHYST_HOMEPAGE_EVENTS')
    expect(script).toContain('"teamName"')
    expect(script).toContain('"aboutHeadline"')
    expect(script).toContain('"aboutParagraphs"')
    expect(script).toContain('"aboutMediaSlots"')
    expect(script).toContain('"typeLabel":"Portrait photo"')
    expect(script).toContain('"typeLabel":"Short video 1"')
    expect(script).toContain('"typeLabel":"Short video 3"')
    expect(script).toContain('"heroMotion"')
    expect(script).toContain('"streamLinks"')
    expect(script).toContain('"socialLinks"')
    expect(script).toContain('"eventTime"')
    expect(script).toContain('"durationMinutes"')
    expect(script).toContain('"/amethyst/Trade.html"')
    expect(script).toContain('"/amethyst/Join.html"')
  })

  it('loads the runtime bootstrap script before the locked homepage export', () => {
    const html = readFileSync(
      resolve(process.cwd(), 'public/amethyst/Homepage.html'),
      'utf8',
    )

    expect(html).toContain(
      '<script src="template-loader.js" data-template-src="/api/amethyst/homepage-template"></script>',
    )
    expect(html.indexOf('template-loader.js')).toBeLessThan(
      html.indexOf('homepage.jsx'),
    )
  })

  it('keeps the saved hero motion when a skin supplies its other visual defaults', () => {
    expect(
      buildAmethystHomepageTweakDefaults(
        { ...defaultAmethystHomepageTemplateData, heroMotion: 'sparkle_rise' },
        'sparkle_suite_morganite',
      ).heroMotion,
    ).toBe('sparkle_rise')
    expect(
      buildAmethystHomepageTweakDefaults(
        { ...defaultAmethystHomepageTemplateData, heroMotion: 'soft_glow' },
        'black_diamond',
      ).heroMotion,
    ).toBe('soft_glow')
    expect(
      buildAmethystHomepageTweakDefaults(
        { ...defaultAmethystHomepageTemplateData, heroMotion: 'still' },
        'rose_quartz',
      ).heroMotion,
    ).toBe('still')
  })

  it('serializes the saved hero motion into the public bootstrap for every skin', () => {
    const sparkleRiseScript = buildAmethystHomepageBootstrapScript(
      { ...defaultAmethystHomepageTemplateData, heroMotion: 'sparkle_rise' },
      undefined,
      'sparkle_suite_morganite',
    )
    const softGlowScript = buildAmethystHomepageBootstrapScript(
      { ...defaultAmethystHomepageTemplateData, heroMotion: 'soft_glow' },
      undefined,
      'black_diamond',
    )

    expect(sparkleRiseScript).toContain('"heroMotion":"sparkle_rise"')
    expect(softGlowScript).toContain('"heroMotion":"soft_glow"')
  })

  it('uses a subject-biased 4:5 About portrait crop followed by three portrait short-video cards', () => {
    const jsx = readFileSync(
      resolve(process.cwd(), 'public/amethyst/homepage.jsx'),
      'utf8',
    )
    const css = readFileSync(
      resolve(process.cwd(), 'public/amethyst/homepage.css'),
      'utf8',
    )

    expect(jsx).toContain('function AboutPortraitCard')
    expect(jsx).toContain('function AboutShortCard')
    expect(jsx).toContain('dataSlot={`about short ${index + 1}`}')
    expect(jsx).toContain('getYouTubeVideoId')
    expect(jsx).toContain('youtube-nocookie.com/embed')
    expect(jsx).toContain('getInstagramEmbedUrl')
    expect(jsx).toContain('instagram.com/${resource}/${match[2]}/embed/')
    expect(jsx).toContain('getFacebookVideoEmbedUrl')
    expect(jsx).toContain('facebook.com/plugins/video.php')
    expect(jsx).toContain('function CustomerVideoEmbed')
    expect(jsx).toMatch(
      /<CustomerVideoCard[\s\S]*?dataSlot="showcase video"[\s\S]*?variant="showcase"/,
    )
    expect(css).toContain('.hp-about-portrait-image')
    expect(css).toContain('aspect-ratio: 4 / 5')
    expect(css).toContain('object-fit: cover')
    expect(css).toContain('object-position: var(--hp-about-portrait-focus-x, 50%)')
    expect(css).toContain('transform: scale(var(--hp-about-portrait-zoom, 1.18))')
    expect(css).toContain('transform-origin: var(--hp-about-portrait-focus-x, 50%)')
    expect(css).toContain('border-radius: 0')
    expect(css).toMatch(/\.hp-about-shorts-grid\s*\{[\s\S]*?grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\);/)
    expect(css).toContain('aspect-ratio: 9 / 16')
    expect(css).toContain('width: min(100%, 348px)')
    expect(css).toContain('@media (max-width: 1100px)')
  })

  it('presents all five configurable media slots through one polished skin-aware card family', () => {
    const jsx = readFileSync(
      resolve(process.cwd(), 'public/amethyst/homepage.jsx'),
      'utf8',
    )
    const css = readFileSync(
      resolve(process.cwd(), 'public/amethyst/homepage.css'),
      'utf8',
    )
    const icons = readFileSync(
      resolve(process.cwd(), 'public/amethyst/media-icons.svg'),
      'utf8',
    )

    expect(jsx).toContain('function getCustomerVideoProvider')
    expect(jsx).toContain('function isCustomerVideoHost')
    expect(jsx).toContain('["tiktok.com"]')
    expect(jsx).toContain('["youtube.com", "youtube-nocookie.com", "youtu.be"]')
    expect(jsx).toContain('host === domain || host.endsWith(`.${domain}`)')
    expect(jsx).toContain('function getCustomerVideoPresentation')
    expect(jsx).toContain('const caption = String(subtitle || "").trim()')
    expect(jsx).toContain('icon="video"')
    expect(jsx).toContain('hp-customer-video-caption')
    expect(jsx).toContain('title="Watch a Live Reveal"')
    expect(jsx).not.toContain('title={explainer.videoCaption || "Watch a Live Reveal"}')
    expect(css).toContain('.hp-customer-video-footer::after')
    expect(css).toContain('background: var(--hp-media-card-header-bg)')
    expect(jsx).toContain('function CustomerMediaIcon')
    expect(jsx).toContain('function CustomerMediaCard')
    expect(jsx).toContain('<CustomerMediaIcon name="shopping-bag" />')
    expect(jsx).toContain('<CustomerMediaIcon name="video" />')
    expect(jsx).toContain('<CustomerMediaIcon name="gift" />')
    expect(jsx).not.toContain('hp-step-index')
    expect(jsx).toContain('variant="showcase"')
    expect(jsx).toContain('variant="short"')
    expect(jsx).toContain('variant="portrait"')
    expect(jsx).toContain('dataSlot="showcase video"')
    expect(jsx).toContain('dataSlot="about portrait"')
    expect(jsx).toContain('dataSlot={`about short ${index + 1}`}')
    expect(jsx).toContain('Watch on TikTok')
    expect(jsx).toContain('Watch on YouTube')
    expect(jsx).toContain('Open on Instagram')
    expect(jsx).toContain('Watch on Facebook')
    expect(jsx).toContain('href={presentation.outboundUrl}')
    expect(jsx).toContain('target="_blank"')
    expect(jsx).toContain('rel="noreferrer noopener"')
    const eventActions = jsx.slice(jsx.indexOf('<div className="hp-event-actions">'))
    expect(eventActions.indexOf('className="hp-event-add"')).toBeLessThan(
      eventActions.indexOf('event.platforms.map'),
    )
    expect(jsx).toContain('key={`${event.id}-${platform.kind}-${platform.href}`}')
    expect(jsx).toContain('/amethyst/media-icons.svg#')
    expect(jsx).toContain('mediaUrl ? footer : null')
    expect(jsx).toContain('Portrait photo coming soon')
    expect(buildAmethystHomepageBootstrapScript(defaultAmethystHomepageTemplateData)).toContain(
      "showcase.querySelector('.hp-customer-media-empty')",
    )

    expect(css).toContain('--hp-media-card-bg:')
    expect(css).toContain('--hp-media-card-header-bg:')
    expect(css).toContain('--hp-media-card-footer-bg:')
    expect(css).toContain('--hp-media-card-shadow:')
    expect(css).toContain('.hp-customer-media-card')
    expect(css).toContain('.hp-customer-media-header')
    expect(css).toContain('.hp-customer-media-action')
    expect(css).toContain('.hp-customer-media-empty')
    expect(css).toMatch(/@media\s+\(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.hp-customer-media-card/)
    expect(css).toMatch(/body\.surface-frosted-opal[\s\S]*?--hp-media-card-header-bg:/)
    expect(css).toMatch(/body\.surface-dark-metallic[\s\S]*?--hp-media-card-header-bg:/)
    expect(css).toContain('linear-gradient(135deg, #be185d, #7e22ce 52%, #1d4ed8)')
    expect(css).toContain('linear-gradient(135deg, var(--bk-plum), #8a2c68, #405a43)')

    for (const icon of ['video', 'camera', 'shopping-bag', 'gift', 'calendar', 'external-link', 'tiktok', 'youtube', 'instagram', 'facebook']) {
      expect(icons).toContain(`id="${icon}"`)
    }
  })

  it('renders show descriptions as polished skin-aware notes without duplicating fallback titles', () => {
    const jsx = readFileSync(
      resolve(process.cwd(), 'public/amethyst/homepage.jsx'),
      'utf8',
    )
    const css = readFileSync(
      resolve(process.cwd(), 'public/amethyst/homepage.css'),
      'utf8',
    )

    expect(jsx).toContain('function getVisibleEventDescription(event)')
    expect(jsx).toContain('const visibleDescription = getVisibleEventDescription(event);')
    expect(jsx).toContain('data-slot="event description"')
    expect(jsx).toContain('{visibleDescription}')
    expect(jsx).toContain('description.localeCompare(title, undefined, { sensitivity: "base" }) === 0')
    expect(css).toMatch(
      /\.hp-event-description\s*\{[\s\S]*?color:\s*var\(--hp-card-muted\);/,
    )
    expect(css).toMatch(
      /\.hp-event-description::before\s*\{[\s\S]*?background:\s*var\(--hp-card-accent\);/,
    )
  })

  it('ships crawl and sharing metadata with the locked homepage export', () => {
    const html = readFileSync(
      resolve(process.cwd(), 'public/amethyst/Homepage.html'),
      'utf8',
    )

    expect(html).toContain(
      '<meta name="description" content="Shop live jewelry reveals, dance floor highlights, and upcoming shows with Sparkle by Sasha." />',
    )
    expect(html).toContain(
      '<link rel="canonical" href="https://www.yoursparklesuite.com/amethyst/Homepage.html" />',
    )
    expect(html).toContain('<meta name="robots" content="index,follow" />')
    expect(html).toContain(
      '<meta property="og:title" content="Sparkle by Sasha - Live jewelry reveals" />',
    )
    expect(html).toContain('<meta name="twitter:card" content="summary_large_image" />')
  })

  it('uses real social media logo marks in the customer footer', () => {
    const homepage = readFileSync(
      resolve(process.cwd(), 'public/amethyst/homepage.jsx'),
      'utf8',
    )
    const unsubscribe = readFileSync(
      resolve(process.cwd(), 'public/amethyst/unsubscribe.jsx'),
      'utf8',
    )
    const css = readFileSync(
      resolve(process.cwd(), 'public/amethyst/homepage.css'),
      'utf8',
    )

    for (const jsx of [homepage, unsubscribe]) {
      expect(jsx).toContain('function SocialLogo')
      expect(jsx).toContain('hp-footer-social-logo')
      expect(jsx).toContain('aria-label={')
      expect(jsx).not.toContain('className="hp-footer-social">TT</a>')
      expect(jsx).not.toContain('className="hp-footer-social">FB</a>')
      expect(jsx).not.toContain('className="hp-footer-social">IG</a>')
      expect(jsx).not.toContain('className="hp-footer-social">YT</a>')
    }
    expect(css).toContain('.hp-footer-social-logo')
    expect(css).toContain('.hp-footer-social-logo-stroke')
  })

  it('renders only configured customer social links in the homepage footer', () => {
    const jsx = readFileSync(
      resolve(process.cwd(), 'public/amethyst/homepage.jsx'),
      'utf8',
    )

    expect(jsx).toContain('Array.isArray(CONTENT.socialLinks)')
    expect(jsx).toContain('CONTENT.socialLinks\n    : []')
    expect(jsx).not.toContain('const defaultSocials = [')
  })

  it('keeps the customer footer to two unlabeled navigation columns for launch', () => {
    const homepage = readFileSync(
      resolve(process.cwd(), 'public/amethyst/homepage.jsx'),
      'utf8',
    )
    const trade = readFileSync(
      resolve(process.cwd(), 'public/amethyst/trade.jsx'),
      'utf8',
    )
    const join = readFileSync(
      resolve(process.cwd(), 'public/amethyst/join.jsx'),
      'utf8',
    )
    const shell = readFileSync(
      resolve(process.cwd(), 'components/amethyst/site-shell.tsx'),
      'utf8',
    )
    const css = readFileSync(
      resolve(process.cwd(), 'public/amethyst/homepage.css'),
      'utf8',
    )

    const footerLabels = ['Home', 'Dance Floor', 'Join Team']

    for (const source of [homepage, trade, join]) {
      for (const label of footerLabels) {
        if (label === 'Dance Floor' && source.includes('isBrittWithBlingHybrid')) {
          expect(source).toContain('isBrittWithBlingHybrid ? "Dance Floor · Coming soon" : "Dance Floor"')
        } else {
          expect(source).toContain(`>${label}</a>`)
        }
      }
      expect(source).toContain('FAQ · Coming soon')
      expect(source).not.toContain('>Contact</a>')
      expect(source).not.toContain('>Shop Now</a>')
      expect(source).not.toContain('Bomb Party Catalog')
      expect(source).not.toContain('Pre-orders</a>')
      expect(source).not.toContain('Past shows</a>')
      expect(source).not.toContain('data-slot="optional 4th column"')
      expect(source).not.toContain('<h4>{FOOTER_COLUMN')
      expect(source).not.toContain('<h4>')
      expect(source).not.toContain('Hosting Soon')
    }
    expect(shell).toContain('lg:grid-cols-[1.4fr_1fr_1fr]')
    expect(shell).not.toContain('title:')
    expect(shell).not.toContain('<h2')
    expect(shell).not.toContain('FooterColumn title={content.footerColumn.title}')
    expect(css).toContain('grid-template-columns: minmax(260px, 1.4fr) repeat(2, minmax(120px, 1fr));')
    expect(css).not.toContain('.hp-footer-col h4')
    expect(css).toMatch(/\.hp-footer-col ul\s*\{[\s\S]*?gap:\s*4px;/)
    expect(css).toMatch(/\.hp-footer-col a\s*\{[\s\S]*?min-height:\s*26px;/)
    expect(css).toMatch(/\.hp-footer-bottom a\s*\{[\s\S]*?min-height:\s*24px;/)
  })

  it('wires the locked homepage export to Trade and parks Join Team as coming soon', () => {
    const jsx = readFileSync(
      resolve(process.cwd(), 'public/amethyst/homepage.jsx'),
      'utf8',
    )

    expect(jsx).toContain('className="hp-header-nav"')
    expect(jsx).toContain('getTradeBoardHref()')
    expect(jsx).toContain('function ComingSoonNavItem')
    expect(jsx).toContain('className="hp-header-link hp-header-link-disabled"')
    expect(jsx).not.toContain('function JoinCta')
    expect(jsx).not.toContain('showJoinCta')
  })

  it('renders one sticky live reveal queue strip under the ticker', () => {
    const jsx = readFileSync(
      resolve(process.cwd(), 'public/amethyst/homepage.jsx'),
      'utf8',
    )
    const css = readFileSync(
      resolve(process.cwd(), 'public/amethyst/homepage.css'),
      'utf8',
    )

    expect(jsx).toContain('function LiveQueueStrip')
    expect(jsx).toContain('className="hp-trade-preview"')
    expect(jsx).toContain('Live Lineup')
    expect(jsx).toContain('View full lineup')
    expect(jsx).toContain('function LiveQueueModal')
    expect(jsx).toContain('entries.slice(0, 4)')
    expect(jsx).not.toContain('Next to reveal')
    expect(jsx).not.toContain('Open dance floor')
    expect(jsx).not.toContain('<LiveQueueSection />')
    expect(jsx).toContain('className="hp-sticky-stack"')
    expect(css).toContain('.hp-trade-preview')
    expect(css).toContain('.hp-queue-modal-mask')
    expect(css).toMatch(/\.hp-queue-modal-close\s*\{[\s\S]*?color:\s*#2b1b1f;/)
    expect(css).toContain('.hp-queue-modal-close:focus-visible')
    expect(css).toContain('position: sticky;')
    expect(css).toMatch(/\.hp-sticky-stack\s*\{[\s\S]*?top:\s*0;/)
    expect(css).not.toContain('top: 144px;')
  })

  it('enriches targeted homepage data with workspace Dance Floor and Live Lineup state', () => {
    const data = enrichAmethystHomepageFeatureData(
      {
        ...defaultAmethystHomepageTemplateData,
        tickerTopText: 'Welcome to the live party',
      },
      {
        liveQueueSnapshot: {
          syncCode: 'MHF-7342',
          queue: ['Jamie', 'Priya'],
          queueLength: 2,
          currentCustomer: 'Jamie',
          onDeckCustomer: 'Priya',
          lastUpdated: '2026-06-20T18:00:00Z',
          ageSeconds: 20,
          staleAfterSeconds: 180,
          isFresh: true,
        },
        tradeBoardListings: [
          {
            id: 'listing-1',
            name: 'Opal Glow Ring',
            collection: 'OG',
            type: 'Ring',
            material: 'Sterling silver',
            stone: 'Opal',
            msrp: 88,
            size: '7',
            note: 'Item-for-item only',
            glyph: 'O',
            tier: 'diamond',
            photoUrl: null,
            photoSource: 'missing',
          },
        ],
      },
    )

    expect(data.tickerTopText).toBe('Welcome to the live party')
    expect(data.liveQueueState).toBe('live')
    expect(data.liveQueueEntries).toEqual([
      {
        position: 1,
        label: 'Currently Unboxing',
        name: 'Jamie',
        highlight: true,
      },
      {
        position: 2,
        label: 'On Deck',
        name: 'Priya',
        highlight: false,
      },
    ])
    expect(data.tradeBoardTickerItems).toEqual([
      {
        name: 'Opal Glow Ring',
        type: 'Ring',
        collection: 'OG',
      },
    ])
  })

  it('uses reassuring public copy when a Live Lineup has not opened or needs an update', () => {
    const noQueueYet = enrichAmethystHomepageFeatureData(
      defaultAmethystHomepageTemplateData,
    )
    const waitingForUpdate = enrichAmethystHomepageFeatureData(
      defaultAmethystHomepageTemplateData,
      {
        liveQueueSnapshot: {
          syncCode: 'MHF-7342',
          queue: ['Jamie'],
          queueLength: 1,
          currentCustomer: 'Jamie',
          onDeckCustomer: null,
          lastUpdated: '2026-06-20T18:00:00Z',
          ageSeconds: 240,
          staleAfterSeconds: 180,
          isFresh: false,
        },
      },
    )

    expect(noQueueYet.liveQueueSummary).toBe(
      'Live Lineup will open closer to the next show.',
    )
    expect(waitingForUpdate.liveQueueSummary).toBe(
      'Live Lineup is waiting for an update.',
    )
    expect(waitingForUpdate.liveQueueSummary).not.toContain('stale')
  })

  it('uses workspace-backed ticker and queue payloads in the public homepage export', () => {
    const jsx = readFileSync(
      resolve(process.cwd(), 'public/amethyst/homepage.jsx'),
      'utf8',
    )

    expect(jsx).toContain('CONTENT.liveQueueEntries')
    expect(jsx).toContain('CONTENT.liveQueueState')
    expect(jsx).toContain('CONTENT.liveQueueSummary')
    expect(jsx).toContain('CONTENT.tradeBoardTickerItems')
    expect(jsx).toContain('function SparkleSuiteHeaderStack')
    expect(jsx).toContain('<Ticker topText={t.tickerTopText} />')
    expect(jsx).toContain('<LiveQueueStrip state={effectiveLrqState} onOpen={onOpenQueue} />')
    expect(jsx).toContain('contentLiveQueueState || (scheduleIsLive ? t.lrqState : "offline")')
    expect(jsx).not.toContain('const LIVE_QUEUE_ENTRIES = RUNTIME_CONTEXT.targeted ? []')
    expect(jsx).not.toContain('const trades = RUNTIME_CONTEXT.targeted ? []')
    expect(jsx).not.toContain('function buildHybridTickerItems')
    expect(jsx).not.toContain('const tickerItems = [promoTickerText, promoTickerText, promoTickerText]')
  })

  it('renders customer TikTok media in an inline muted player instead of opening a new tab', () => {
    const jsx = readFileSync(
      resolve(process.cwd(), 'public/amethyst/homepage.jsx'),
      'utf8',
    )
    const templateData = readFileSync(
      resolve(process.cwd(), 'lib/amethyst/homepage-template-data.ts'),
      'utf8',
    )

    expect(jsx).toContain('function TikTokEmbed')
    expect(jsx).toContain('https://www.tiktok.com/player/v1/${videoId}')
    expect(jsx).toContain('autoplay=0&muted=0&loop=1&controls=0&volume_control=0')
    expect(jsx).toContain('autoplay=1&mute=1&loop=1&playlist=${youtubeVideoId}&controls=0')
    expect(jsx).not.toContain('send("pause")')
    expect(jsx).toContain('new IntersectionObserver')
    expect(jsx).toContain('message.type === "onPlayerReady"')
    expect(jsx).toContain('type: nextMuted ? "mute" : "unMute"')
    expect(jsx).toContain('<TikTokEmbed')
    expect(jsx).toContain('<CustomerVideoEmbed')
    expect(jsx).toContain('ss-tiktok-embed-fallback')
    expect(jsx).toContain('data-tiktok-embed="false"')
    expect(jsx).toContain('ss-tiktok-embed-coming-soon')
    expect(jsx).toContain('hp-customer-media-empty')
    expect(jsx).toContain('emptyLabel="Portrait photo coming soon"')
    expect(jsx).toContain('function AboutShortCard')
    expect(jsx).not.toContain('hp-about-media-type')
    expect(jsx).not.toContain('hp-about-media-play')
    expect(jsx).not.toContain('window.open(slot.href')
    expect(templateData).not.toContain("window.open(content.showcaseVideoUrl")
    expect(templateData).not.toContain("window.open(slot.href, '_blank', 'noopener,noreferrer')")
  })

  it('derives live indicators from scheduled show windows instead of permanent live chrome', () => {
    const jsx = readFileSync(
      resolve(process.cwd(), 'public/amethyst/homepage.jsx'),
      'utf8',
    )

    expect(jsx).toContain('function isScheduledShowLive')
    expect(jsx).toContain('function getActiveLiveShow')
    expect(jsx).toContain('const scheduleIsLive = Boolean(activeLiveShow)')
    expect(jsx).toContain('const contentLiveQueueState = lineup?.liveQueueState || getContentLiveQueueState()')
    expect(jsx).toContain('const effectiveLrqState = contentLiveQueueState || (scheduleIsLive ? t.lrqState : "offline")')
    expect(jsx).toContain('{scheduleIsLive && <span className="hp-live-dot"')
    expect(jsx).toContain('{scheduleIsLive ? "Live now" : "Jewelry reveals"}')
    expect(jsx).toContain('getWatchCtaLabel(isLive)')
    expect(jsx).toContain('Watch on TikTok')
    expect(jsx).toContain('Lineup opens when the next scheduled show starts.')
    expect(jsx).toContain('<LiveQueueStrip state={effectiveLrqState}')
    expect(jsx).toContain('state={effectiveLrqState}')
  })

  it('keeps hero visuals curated with controlled motion and intensity presets', () => {
    const jsx = readFileSync(
      resolve(process.cwd(), 'public/amethyst/homepage.jsx'),
      'utf8',
    )
    const css = readFileSync(
      resolve(process.cwd(), 'public/amethyst/homepage.css'),
      'utf8',
    )

    expect(jsx).toContain('function SparkleFx({ level, motion })')
    expect(jsx).toContain('<div className="hp-hero-media" aria-hidden="true" />')
    expect(jsx).not.toContain('className="hp-hero-eyebrow"')
    expect(jsx).not.toContain('Live schedule coming soon')
    expect(jsx).not.toContain('data-slot="hero photo"')
    expect(jsx).not.toContain('rep-swappable via Nic-Nac')
    expect(jsx).toContain('motion === "still"')
    expect(jsx).toContain('motion === "soft_glow"')
    expect(jsx).toContain('hp-fx-layer-glow')
    expect(jsx).toContain('<SparkleFx level={t.sparkleLevel} motion={t.heroMotion} />')
    expect(jsx).toContain('body.classList.add(`hero-motion-${t.heroMotion.replace("_", "-")}`)')
    expect(jsx).toContain('label="Hero motion"')
    expect(jsx).toContain('label: "Sparkle rise"')
    expect(jsx).toContain('label: "Soft glow"')
    expect(jsx).toContain('label: "Still"')
    expect(jsx).toContain('label="Hero sparkle intensity"')
    expect(css).toContain('.hp-fx-layer-glow::before')
    expect(css).toContain('.hp-fx-layer-glow::after')
    expect(css).toContain('.hp-hero .hp-hero-fx-layer')
    expect(css).toContain('@keyframes hp-fx-soft-glow')
    expect(css).toContain('body.hero-motion-soft-glow.tex-sparkle::before')
    expect(css).toContain('body.hero-motion-soft-glow.fx-confetti .hp-hero::before')
  })

  it('renders separate TikTok and Whatnot hero actions whenever those saved links exist', () => {
    const jsx = readFileSync(
      resolve(process.cwd(), 'public/amethyst/homepage.jsx'),
      'utf8',
    )

    expect(jsx).toContain('function getHeroWatchLinks(liveShow, isLive)')
    expect(jsx).toContain('id: "tiktok"')
    expect(jsx).toContain('id: "whatnot"')
    expect(jsx).toContain('label: "Watch on Whatnot"')
    expect(jsx).toContain('Watch on TikTok')
    expect(jsx).toContain('heroWatchLinks.map((link) =>')
    expect(jsx).toContain('className={`bwb-cta bwb-cta-watch')
    expect(jsx).toContain('className={`mhf-cta mhf-cta-watch')
    expect(jsx).toContain('bk-home-cta-label">{link.label}</span>')
  })

  it('keeps watch actions together and makes the Dance Floor hero action span their row', () => {
    const jsx = readFileSync(
      resolve(process.cwd(), 'public/amethyst/homepage.jsx'),
      'utf8',
    )
    const css = readFileSync(
      resolve(process.cwd(), 'public/amethyst/homepage.css'),
      'utf8',
    )
    const standardHero = jsx.slice(
      jsx.indexOf('function Hero({ t, isLive, liveShow })'),
      jsx.indexOf('function EventCard('),
    )

    expect(standardHero).toContain('className="hp-hero-cta-stack"')
    expect(standardHero).toContain('className="hp-hero-cta-primary-row"')
    expect(standardHero.indexOf('Shop Bomb Party')).toBeLessThan(
      standardHero.indexOf('Browse the dance floor'),
    )
    expect(standardHero.indexOf('heroWatchLinks.map((link) =>')).toBeLessThan(
      standardHero.indexOf('Browse the dance floor'),
    )
    expect(standardHero).toContain('hp-hero-trade-board-cta')
    expect(standardHero).toContain('isHeatherBlingKitchenSite && CONTENT.pantryPageUrl')
    expect(jsx).toContain('watch it revealed live on <span className="slot" data-slot="rep name">{repName}</span>&apos;s platform')
    expect(jsx).toContain('Watch the reveal on <span className="slot" data-slot="rep name">{repName}</span>&apos;s platform')
    expect(jsx).not.toContain('TikTok or Facebook')
    expect(standardHero).toContain('In the Pantry')
    expect(css).toMatch(/\.hp-hero-cta-stack\s*\{[\s\S]*?width:\s*fit-content;/)
    expect(css).toMatch(/\.hp-hero-trade-board-cta\s*\{[\s\S]*?width:\s*100%;/)
  })

  it('keeps the rendered Mile High Fizz hero actions together above the shared Dance Floor action', () => {
    const jsx = readFileSync(
      resolve(process.cwd(), 'public/amethyst/homepage.jsx'),
      'utf8',
    )
    const css = readFileSync(
      resolve(process.cwd(), 'public/amethyst/homepage.css'),
      'utf8',
    )
    const mileHighFizzHero = jsx.slice(
      jsx.indexOf('function MileHighFizzHomepage('),
      jsx.indexOf('function BrittWithBlingHomepage('),
    )

    expect(mileHighFizzHero).toContain('className="mhf-hero-cta-stack"')
    expect(mileHighFizzHero).toContain('className="mhf-hero-cta-primary-row"')
    expect(mileHighFizzHero).toContain('mhf-cta-dance-floor')
    expect(mileHighFizzHero.indexOf('Join My Team')).toBeLessThan(
      mileHighFizzHero.indexOf('Browse the Dance Floor'),
    )
    expect(mileHighFizzHero.indexOf('heroWatchLinks.map((link) =>')).toBeLessThan(
      mileHighFizzHero.indexOf('Browse the Dance Floor'),
    )
    expect(css).toMatch(/\.mhf-cta-dance-floor\s*\{[\s\S]*?width:\s*100%;/)
  })

  it('gives every custom customer-site hero the shared full-width Dance Floor action', () => {
    const jsx = readFileSync(resolve(process.cwd(), 'public/amethyst/homepage.jsx'), 'utf8')
    const css = readFileSync(resolve(process.cwd(), 'public/amethyst/homepage.css'), 'utf8')
    const brittHero = jsx.slice(
      jsx.indexOf('function BrittWithBlingHomepage('),
      jsx.indexOf('function BlingKitchenHomepage('),
    )
    const blingKitchenHero = jsx.slice(
      jsx.indexOf('function BlingKitchenHomepage('),
      jsx.indexOf('// ============================================================\n// Main App'),
    )

    expect(brittHero).toContain('className="bwb-hero-cta-stack"')
    expect(brittHero).toContain('className="bwb-hero-cta-primary-row"')
    expect(brittHero).toContain('bwb-cta-dance-floor')
    expect(brittHero.indexOf('heroWatchLinks.map((link) =>')).toBeLessThan(
      brittHero.indexOf('Dance Floor · Coming soon'),
    )
    expect(blingKitchenHero).toContain('className="bk-home-hero-cta-stack"')
    expect(blingKitchenHero).toContain('className="bk-home-hero-cta-primary-row"')
    expect(blingKitchenHero).toContain('bk-home-cta-dance-floor')
    expect(blingKitchenHero.indexOf('heroWatchLinks.map((link) =>')).toBeLessThan(
      blingKitchenHero.indexOf('Browse the Dance Floor'),
    )
    expect(css).toMatch(/\.bwb-cta-dance-floor\s*\{[\s\S]*?width:\s*100%;/)
    expect(css).toMatch(/\.bk-home-cta-dance-floor\s*\{[\s\S]*?width:\s*100%;/)
  })

  it('uses the live-show header grid with brand, centered nav, and primary shop CTA', () => {
    const css = readFileSync(
      resolve(process.cwd(), 'public/amethyst/homepage.css'),
      'utf8',
    )
    const jsx = readFileSync(
      resolve(process.cwd(), 'public/amethyst/homepage.jsx'),
      'utf8',
    )

    expect(jsx).toContain('className="hp-live-dot"')
    expect(jsx).toContain('Shop live')
    expect(css).toContain('grid-template-columns: minmax(190px, 1fr) auto minmax(160px, 1fr);')
    expect(css).toContain('justify-self: center;')
    expect(css).toContain('justify-self: end;')
    expect(css).toContain('backdrop-filter: blur(18px);')
  })

  it('hydrates the locked homepage events from runtime data and keeps the show-card behaviors wired', () => {
    const jsx = readFileSync(
      resolve(process.cwd(), 'public/amethyst/homepage.jsx'),
      'utf8',
    )

    expect(jsx).toContain('window.AMETHYST_HOMEPAGE_EVENTS')
    expect(jsx).toContain('Intl.DateTimeFormat')
    expect(jsx).toContain('Intl.DateTimeFormat(undefined')
    expect(jsx).toContain('timeZoneName: "short"')
    expect(jsx).not.toContain('timeZone: "UTC"')
    expect(jsx).toContain('downloadCalendarEvent')
    expect(jsx).toContain('text/calendar')
    expect(jsx).toContain('URL.createObjectURL')
    expect(jsx).toContain('function CalendarChooser')
    expect(jsx).toContain('Google Calendar')
    expect(jsx).toContain('Outlook Calendar')
    expect(jsx).toContain('Apple Calendar or another app')
    expect(jsx).toContain('setCalendarEvent(event)')
    expect(jsx).toContain('buildGoogleCalendarHref')
    expect(jsx).toContain('buildOutlookCalendarHref')
    expect(jsx).toContain('event.collections.map')
    expect(jsx).toContain('event.platforms.map')
    expect(jsx).toContain('Date TBD - Time TBD')
    expect(jsx).toContain('ev.when.split(" - ")')
    expect(jsx).not.toContain('Â')
    expect(jsx).not.toContain('Ã')
  })

  it('wires the customer signup form to the audience route with separate consent controls', () => {
    const jsx = readFileSync(
      resolve(process.cwd(), 'public/amethyst/homepage.jsx'),
      'utf8',
    )

    expect(jsx).toContain('withCurrentSearch("/api/amethyst/customer-audience")')
    expect(jsx).toContain('function buildContextSearch')
    expect(jsx).toContain('firstName')
    expect(jsx).toContain('lastName')
    expect(jsx).toContain('smsConsent')
    expect(jsx).toContain('emailConsent')
    expect(jsx).toContain('marketingConsent')
    expect(jsx).toContain('birthday')
    expect(jsx).toContain('favoriteGemOrStone')
    expect(jsx).toContain('favoriteMaterial')
    expect(jsx).toContain('favoriteCut')
    expect(jsx).toContain('favoriteCollection')
    expect(jsx).toContain('Only for birthday promotions and gift ideas. It will not be used for anything else.')
    expect(jsx).toContain('Choose SMS, email, or both')
    expect(jsx).toContain('/amethyst/Unsubscribe.html')
    expect(jsx).toContain('hp-signup-status')
    expect(jsx).toContain('role={submitState.status === "error" ? "alert" : "status"}')
    expect(jsx).toContain('Saving...')
    expect(jsx).toContain('Proud member of the {CONTENT.memberTeamName} team')
  })

  it('keeps signup submission state scoped to the signup form so the homepage can fresh-load', () => {
    const jsx = readFileSync(
      resolve(process.cwd(), 'public/amethyst/homepage.jsx'),
      'utf8',
    )
    const aboutStart = jsx.indexOf('function AboutSection')
    const signupStart = jsx.indexOf('function Signup')
    const aboutSectionSource = jsx.slice(aboutStart, signupStart)

    expect(aboutStart).toBeGreaterThan(-1)
    expect(signupStart).toBeGreaterThan(aboutStart)
    expect(aboutSectionSource).not.toContain('submitState')
  })

  it('ships the Sparkle Suite/Morganite skin in the local homepage preset picker', () => {
    const jsx = readFileSync(
      resolve(process.cwd(), 'public/amethyst/homepage.jsx'),
      'utf8',
    )
    const html = readFileSync(
      resolve(process.cwd(), 'public/amethyst/Homepage.html'),
      'utf8',
    )

    expect(jsx).toContain('sparkle_suite_morganite')
    expect(jsx).toContain('Sparkle Suite/Morganite')
    expect(html).toContain('DM+Sans')
    expect(html).toContain('Playfair+Display')
  })

  it('ships the Black Diamond skin in the local homepage preset picker', () => {
    const jsx = readFileSync(
      resolve(process.cwd(), 'public/amethyst/homepage.jsx'),
      'utf8',
    )
    const html = readFileSync(
      resolve(process.cwd(), 'public/amethyst/Homepage.html'),
      'utf8',
    )
    const css = readFileSync(
      resolve(process.cwd(), 'public/amethyst/homepage.css'),
      'utf8',
    )

    expect(jsx).toContain('black_diamond')
    expect(jsx).toContain('Black Diamond')
    expect(jsx).toContain('moonstone')
    expect(jsx).toContain('Moonstone')
    expect(html).toContain('DM+Sans')
    expect(html).toContain('Playfair+Display')
    expect(css).toContain('body.bg-black-velvet .hp-ticker')
    expect(css).toContain('body.bg-black-velvet .hp-ticker-row')
    expect(css).toContain('body.bg-black-velvet .hp-ticker-row:not(.reverse)')
    expect(css).toContain('width: 120px;')
    expect(css).toContain('padding-left: 120px;')
    expect(css).toContain('background: #d4af37;')
    expect(css).toContain('background: #050505;')
    expect(css).toContain('body.bg-black-velvet .hp-brand-name')
    expect(css).toContain('body.bg-black-velvet .hp-header-link')
    expect(css).toContain('body.bg-black-velvet .hp-trade-preview')
    expect(css).toContain('body.bg-black-velvet .hp-trade-preview-pill')
    expect(css).toContain('body.bg-black-velvet.tex-sparkle::before')
    expect(css).toContain('body.bg-black-velvet .hp-hero::after')
    expect(css).toContain('body.bg-black-velvet #events')
    expect(css).toContain('body.bg-black-velvet #wibp')
    expect(css).toContain('body.bg-black-velvet .hp-footer')
    expect(css).toContain('--hp-form-panel-bg: rgba(8, 8, 8, 0.66);')
    expect(css).toContain('body.bg-black-velvet .hp-signup-submit')
    expect(css).toContain('body.bg-moonstone-charcoal')
    expect(css).toContain('body.bg-moonstone-charcoal .hp-ticker-row:not(.reverse)')
    expect(css).toContain('background: #7c3aed;')
    expect(css).toContain('background: #0d0b13;')
    expect(css).toContain('body.surface-silver-pearl .hp-event-card')
    expect(css).toContain('--hp-form-panel-bg: rgba(255, 255, 255, 0.8);')
    expect(css).toContain('body.surface-silver-pearl .hp-about-copy')
    expect(css).toContain('body.surface-silver-pearl .hp-about-copy .hp-section-title')
    expect(css).not.toContain('body.surface-silver-pearl .hp-section-title,')
    expect(css).toContain('body.surface-silver-pearl .hp-step')
    expect(css).toContain('body.surface-silver-pearl .hp-signup-title')
    expect(css).toContain('body.surface-silver-pearl .hp-signup-consent-box')
    expect(css).toContain('body.surface-silver-pearl .jp-hero-pitch')
    expect(css).toContain('body.surface-silver-pearl .tp-card-meta')
    expect(css).toContain('color: #f9f3ec;')
    expect(css).toMatch(/\.hp-queue-modal-row\s*\{[\s\S]*?color:\s*#2b1b1f;/)
    expect(css).toMatch(/\.hp-queue-modal-row \.name\s*\{[\s\S]*?color:\s*#2b1b1f;/)
  })

  it('ships the Rose Gold skin in the local homepage preset picker', () => {
    const jsx = readFileSync(
      resolve(process.cwd(), 'public/amethyst/homepage.jsx'),
      'utf8',
    )
    const html = readFileSync(
      resolve(process.cwd(), 'public/amethyst/Homepage.html'),
      'utf8',
    )

    expect(jsx).toContain('rose_gold')
    expect(jsx).toContain('Rose Gold')
    expect(html).toContain('DM+Sans')
    expect(html).toContain('Playfair+Display')
  })

  it('ships the approved batch skins in the local homepage preset picker', () => {
    const jsx = readFileSync(
      resolve(process.cwd(), 'public/amethyst/homepage.jsx'),
      'utf8',
    )
    const html = readFileSync(
      resolve(process.cwd(), 'public/amethyst/Homepage.html'),
      'utf8',
    )
    const css = readFileSync(
      resolve(process.cwd(), 'public/amethyst/homepage.css'),
      'utf8',
    )

    expect(jsx).toContain('garnet')
    expect(jsx).toContain('Garnet')
    expect(jsx).toContain('amber')
    expect(jsx).toContain('Amber')
    expect(jsx).toContain('alpine_opal')
    expect(jsx).toContain('Alpine Opal')
    expect(jsx).toContain('emerald_garden')
    expect(jsx).toContain('Emerald Garden')
    expect(jsx).toContain('velvet')
    expect(jsx).toContain('Velvet')
    expect(jsx).toContain('rose_quartz')
    expect(jsx).toContain('Rose Quartz')
    expect(html).toContain('Bitter')
    expect(html).toContain('Nunito')
    expect(html).toContain('Great+Vibes')
    expect(html).toContain('Cormorant+Garamond')
    expect(html).toContain('Lato')
    expect(css).toContain('body.bg-suite-paper .hp-signup-submit')
    expect(css).toContain('body.bg-amber-paper .hp-signup-submit')
    expect(css).toContain('body.bg-quartz-paper .hp-signup-submit')
    expect(css).toContain('body.bg-emerald-garden')
    expect(css).toContain('body.surface-spa-ivory .hp-event-card')
    expect(css).toContain('body.btn-garden-lift .hp-btn-primary:hover')
    expect(css).toContain('body.champagne-botanical .tp-card.unicorn')
  })

  it('does not ship legacy placeholder skins in the local homepage preset picker', () => {
    const jsx = readFileSync(
      resolve(process.cwd(), 'public/amethyst/homepage.jsx'),
      'utf8',
    )

    expect(jsx).not.toContain('value: "editorial"')
    expect(jsx).not.toContain('value: "softGlam"')
    expect(jsx).not.toContain('value: "sparkleParty"')
    expect(jsx).not.toContain('value: "maximum", label: "Maximum"')
    expect(jsx).not.toContain('label: "Editorial"')
    expect(jsx).not.toContain('label: "Soft Glam"')
    expect(jsx).not.toContain('label: "Sparkle Party"')
  })

  it('ships a public unsubscribe export alongside the homepage', () => {
    const html = readFileSync(
      resolve(process.cwd(), 'public/amethyst/Unsubscribe.html'),
      'utf8',
    )
    const jsx = readFileSync(
      resolve(process.cwd(), 'public/amethyst/unsubscribe.jsx'),
      'utf8',
    )

    expect(html).toContain('unsubscribe.jsx')
    expect(jsx).toContain('/api/amethyst/customer-audience/unsubscribe')
  })

  it('uses large toggle-style unsubscribe rows for mobile preference changes', () => {
    const jsx = readFileSync(
      resolve(process.cwd(), 'public/amethyst/unsubscribe.jsx'),
      'utf8',
    )
    const css = readFileSync(
      resolve(process.cwd(), 'public/amethyst/homepage.css'),
      'utf8',
    )

    expect(jsx).toContain('className="hp-signup-check hp-unsubscribe-toggle"')
    expect(jsx).toContain('className="hp-toggle-control"')
    expect(css).toContain('.hp-unsubscribe-toggle')
    expect(css).toContain('.hp-toggle-control')
    expect(css).toMatch(/@media\s+\(pointer:\s*coarse\)[\s\S]*?\.hp-unsubscribe-toggle[\s\S]*?min-height:\s*56px;/)
  })
})
