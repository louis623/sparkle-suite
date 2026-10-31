import { expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { renderAmethystPageFirstPaint } from '@/lib/amethyst/page-first-paint'
import { utilityPageFonts } from '@/lib/amethyst/utility-page-fonts'
import { buildAmethystHomepageBootstrapScript, defaultAmethystHomepageTemplateData as homepage } from '@/lib/amethyst/homepage-template-data'
import { buildAmethystTradeBootstrapScript, defaultAmethystTradeTemplateData as trade } from '@/lib/amethyst/trade-template-data'
import { defaultAmethystJoinTemplateData as join } from '@/lib/amethyst/join-template-data'
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
  ['amethyst', 'au-poster', '/amethyst/skins/am01-unicorn/opening-poster.webp'],
  ['sunset_beach', 'beach-poster', '/amethyst/skins/sunset-beach/hero-approved.png'],
] as const) {
  it(`uses the approved legacy ${preset} still for both poster and video`, async () => {
    const bootstrap = buildAmethystHomepageBootstrapScript(homepage, [], preset, { targeted: true })
    const html = await renderAmethystPageFirstPaint('homepage', readFileSync('public/amethyst/Homepage.html', 'utf8'),
      { homepage, trade, join, appearancePreset: preset }, new URL('https://sparkle-suite-smoke.vercel.app/milehighfizz'), bootstrap)
    const poster = html.match(new RegExp(`<img\\b[^>]*class="${className}"[^>]*>`))?.[0]
    const video = html.match(/<video\b[^>]*data-hero-video=""[^>]*>/)?.[0]
    expect(poster).toContain(`src="${still}"`)
    expect(video).toContain(`poster="${still}"`)
  })
}
