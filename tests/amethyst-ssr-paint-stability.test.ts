import { expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { renderAmethystPageFirstPaint } from '@/lib/amethyst/page-first-paint'
import { utilityPageFonts } from '@/lib/amethyst/utility-page-fonts'
import { buildAmethystHomepageBootstrapScript, defaultAmethystHomepageTemplateData as homepage } from '@/lib/amethyst/homepage-template-data'
import { buildAmethystTradeBootstrapScript, defaultAmethystTradeTemplateData as trade } from '@/lib/amethyst/trade-template-data'
import { buildAmethystJoinBootstrapScript, defaultAmethystJoinTemplateData as join } from '@/lib/amethyst/join-template-data'
import fontFaces from '@/lib/amethyst/generated/utility-fonts.json'

it('preloads and embeds the exact pinned legacy heading font and its variable weights', () => {
  const html = utilityPageFonts(new Map([
    ['--hp-display-font', '"Playfair Display", Georgia, serif'],
    ['--hp-body-font', '"DM Sans", sans-serif'],
  ]), '', 'gilded_autumn')
  const hint = html.match(/<link\b[^>]*data-ssr-heading-font>/)?.[0]
  expect(hint).toContain('rel="preload" as="font" type="font/woff2" crossorigin')
  const uri = hint?.match(/href="([^"]+)"/)?.[1]
  expect(uri).toMatch(/^data:font\/woff2;base64,/)
  const legacyFace = fontFaces['Playfair Display'].find(face => face.css.includes('U+0000-00FF'))!
  expect(Buffer.from(uri!.split(',')[1], 'base64')).toEqual(readFileSync(`public${legacyFace.src}`))
  expect(html).toContain(`src: url("${uri}")`)
  expect(html).toContain('font-weight: 400 700')
  expect(html).toContain("font-family: 'DM Sans'")
  expect(html).not.toContain('fonts.googleapis.com')
})

for (const preset of ['amethyst', 'gilded_autumn'] as const) {
  it(`ships ${preset} home fonts in the head before any hero markup`, async () => {
    const bootstrap = buildAmethystHomepageBootstrapScript(homepage, [], preset, { targeted: true })
    const html = await renderAmethystPageFirstPaint('homepage', readFileSync('public/amethyst/Homepage.html', 'utf8'),
      { homepage, trade, join, appearancePreset: preset }, new URL('https://sparkle-suite-smoke.vercel.app/milehighfizz'), bootstrap)
    expect(html.indexOf('data-ssr-fonts')).toBeGreaterThan(0)
    expect(html.indexOf('data-ssr-fonts')).toBeLessThan(html.indexOf('</head>'))
    expect(html.indexOf('data-ssr-heading-font')).toBeGreaterThan(0)
    expect(html.indexOf('data-ssr-heading-font')).toBeLessThan(html.indexOf('</head>'))
    expect(html).toContain(preset === 'amethyst' ? "font-family: 'Italiana'" : "font-family: 'Playfair Display'")
  })
}

for (const [name, targeted, listings, empty] of [
  ['targeted empty board', true, [], true],
  ['targeted populated board', true, [{ id: 'paint-only', name: 'Visible first-paint dancer', collection: 'Originals', type: 'Earrings', material: 'Silver', stone: 'CZ', size: null, note: '', glyph: 'S', tier: 'everyday', photoUrl: null, photoSource: 'missing' }], false],
  ['non-targeted sample board', false, [], false],
] as const) {
  it(`renders final ticker visibility before hydration for ${name}`, async () => {
    const bootstrap = buildAmethystTradeBootstrapScript(trade, [...listings], 'gilded_autumn', { targeted })
    const html = await renderAmethystPageFirstPaint('trade', readFileSync('public/amethyst/Trade.html', 'utf8'),
      { homepage, trade, join, appearancePreset: 'gilded_autumn' }, new URL('https://sparkle-suite-smoke.vercel.app/milehighfizz/trade'), bootstrap)
    const body = html.match(/<body\b[^>]*>/)?.[0]
    expect(html).toContain(`data-trade-board-empty="${empty}"`)
    expect(body?.includes('dance-floor-empty')).toBe(empty)
  })
}

for (const [preset, className, still] of [
  ['amethyst', 'au-poster', '/amethyst/skins/am01-unicorn/hero-poster.webp'],
  ['sunset_beach', 'beach-poster', '/amethyst/ssr-images/sunset-beach-hero-approved-1080.webp'],
] as const) {
  it(`uses the approved ${preset} still before starting its original video`, async () => {
    const bootstrap = buildAmethystHomepageBootstrapScript(homepage, [], preset, { targeted: true })
    const html = await renderAmethystPageFirstPaint('homepage', readFileSync('public/amethyst/Homepage.html', 'utf8'),
      { homepage, trade, join, appearancePreset: preset }, new URL('https://sparkle-suite-smoke.vercel.app/milehighfizz'), bootstrap)
    const poster = html.match(new RegExp(`<img\\b[^>]*class="${className}"[^>]*>`))?.[0]
    const video = html.match(/<video\b[^>]*data-hero-video=""[^>]*>/)?.[0]
    expect(poster).toContain(`src="${still}"`)
    expect(video).toContain('preload="none"')
    expect(video).toContain(`data-hero-video-src="/amethyst/skins/${preset === 'amethyst' ? 'am01-unicorn/hero-motion' : 'sunset-beach/hero-loop'}.mp4"`)
    expect(video).not.toMatch(/\ssrc=|\sposter=/)
  })
}

it('keeps Alpine Opal Trade on its two original fonts without inline home-layout font payloads', async () => {
  const saved = { ...trade, publicSiteVariant: 'mile_high_fizz_hybrid' as const }
  const html = await renderAmethystPageFirstPaint('trade', readFileSync('public/amethyst/Trade.html', 'utf8'),
    { homepage, trade: saved, join, appearancePreset: 'alpine_opal' }, new URL('http://localhost/review/trade'),
    buildAmethystTradeBootstrapScript(saved, [], 'alpine_opal', { targeted: true }))
  const embedded = [...html.matchAll(/data:font\/woff2;base64,[^"\s)]+/g)].map(match => match[0])
  expect(embedded).toHaveLength(2)
  for (const family of ['Playfair Display', 'DM Sans'] as const) {
    const face = fontFaces[family].find(face => face.css.includes('U+0000-00FF'))!
    expect(embedded.some(uri => Buffer.from(uri.split(',')[1], 'base64').equals(readFileSync(`public${face.src}`)))).toBe(true)
    expect(html).toContain(`font-family: '${family}'`)
  }
  expect(html.indexOf('data-ssr-fonts')).toBeLessThan(html.indexOf('data-ssr-style="tokens.css"'))
  const fontRules = html.match(/<style data-ssr-fonts>([\s\S]*?)<\/style>/)![1]
  expect(fontRules).not.toMatch(/Pacifico|Great Vibes|Cormorant Garamond/)
  expect(html).not.toMatch(/data-ssr-heading-font|<video\b|hero\.mp4/)
  expect(html).toContain('<span hidden id="ssr-first-paint-ready"></span>')
  expect(html).toContain('font-weight: 400 700')
})

it('keeps a customized Trade heading and the shared chrome on their pinned embedded faces', () => {
  const html = utilityPageFonts(new Map([['--hp-display-font', '"Italiana", serif'],
    ['--hp-body-font', '"DM Sans", sans-serif']]), '', 'alpine_opal', true)
  for (const family of ['Italiana', 'DM Sans', 'Playfair Display']) expect(html).toContain(`font-family: '${family}'`)
  expect(html).not.toContain('data-ssr-heading-font')
  expect([...html.matchAll(/data:font\/woff2;base64,/g)]).toHaveLength(3)
})

for (const [page, preset] of [
  ['homepage', 'fall_owl_harvest_moon'], ['homepage', 'midnight_rose'],
  ['homepage', 'rose_gold'], ['homepage', 'halloween_pumpkin_cat'],
  ['join', 'pearl_rose'], ['join', 'midnight_rose'],
] as const) {
  it(`sizes the complete ${preset} ${page} tree and controls before streamed first paint`, async () => {
    const bootstrap = page === 'homepage' ? buildAmethystHomepageBootstrapScript(homepage, [], preset, { targeted: true })
      : buildAmethystJoinBootstrapScript(join, preset, { targeted: true })
    const html = await renderAmethystPageFirstPaint(page, readFileSync(`public/amethyst/${page === 'homepage' ? 'Homepage' : 'Join'}.html`, 'utf8'),
      { homepage, trade, join, appearancePreset: preset }, new URL('http://localhost/review'), bootstrap)
    const expectation = html.indexOf('<link rel="expect" blocking="render" href="#ssr-first-paint-ready">')
    const ready = html.indexOf('<span hidden id="ssr-first-paint-ready"></span>')
    expect(expectation).toBeGreaterThan(0)
    expect(expectation).toBeLessThan(html.indexOf('</head>'))
    expect(ready).toBeGreaterThan(html.indexOf('window.sparkleStartHeroMotion=start;start();'))
    expect(ready).toBeLessThan(html.indexOf('<script defer'))
    expect(html).toContain('content:"Pause animation";display:block;height:0;visibility:hidden')
    expect(html).not.toMatch(/opacity:0[^}]*ssr-first-paint|visibility:hidden[^}]*hp-hero-inner/)
  })
}
