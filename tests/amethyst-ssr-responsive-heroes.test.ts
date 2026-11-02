import { expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { runInNewContext } from 'node:vm'
import images from '@/lib/amethyst/generated/hero-images.json'
import { earlyHomepageControls } from '@/lib/amethyst/hero-motion-controls'
import { heroImagePreload, responsiveHeroCss } from '@/lib/amethyst/hero-responsive-images'
import { renderAmethystPageFirstPaint } from '@/lib/amethyst/page-first-paint'
import { buildAmethystHomepageBootstrapScript, defaultAmethystHomepageTemplateData as homepage } from '@/lib/amethyst/homepage-template-data'
import { defaultAmethystTradeTemplateData as trade } from '@/lib/amethyst/trade-template-data'
import { defaultAmethystJoinTemplateData as join } from '@/lib/amethyst/join-template-data'

it('keeps the approved originals intact and ships bounded responsive codecs without upscaling', () => {
  for (const [source, image] of Object.entries(images)) {
    expect(createHash('sha256').update(readFileSync('public' + source)).digest('hex')).toBe(image.sha256)
    for (const v of image.variants) {
      expect(v.width).toBeLessThanOrEqual(image.width)
      expect(v.height).toBe(Math.round(image.height * v.width / image.width))
      for (const f of ['avif', 'webp'] as const) {
        expect(readFileSync('public' + v[f].src).length).toBe(v[f].bytes)
        expect(v[f].bytes).toBeLessThan(v.width <= 1080 ? 250000 : 500000)
      }
    }
  }
})

it('replaces only SSR background URLs while preserving the exact gradient, crop and breakpoints', () => {
  const source = `@media(max-width:600px){.jp-hero-media{background:linear-gradient(red,transparent),url('/amethyst/skins/sunset-beach/hero-approved.png') center top / 100% auto no-repeat}}`
  const css = responsiveHeroCss(source)
  expect(css).toContain('@media(max-width:600px){.jp-hero-media{background:linear-gradient(red,transparent),var(--ssr-hero-image-0) center top / 100% auto no-repeat}}')
  expect(css).toContain('type("image/avif")')
  expect(css).toContain('type("image/webp")')
  expect(css).not.toContain('hero-approved.png')
  expect(responsiveHeroCss(source, true)).toBe(source.replace("url('/amethyst/skins/sunset-beach/hero-approved.png')", 'none'))
  expect(heroImagePreload('<div class="jp-hero-media slot">', 'sunset_beach')).toContain('imagesizes="100vw"')
  expect(heroImagePreload('<div class="tp-hero">', 'sunset_beach')).toBe('')
})

it('renders an AVIF/WebP picture, exact source dimensions and matching high-priority preload', async () => {
  const html = await renderAmethystPageFirstPaint('homepage', readFileSync('public/amethyst/Homepage.html', 'utf8'),
    { homepage, trade, join, appearancePreset: 'sunset_beach' }, new URL('https://sparkle-suite-smoke.vercel.app/milehighfizz'),
    buildAmethystHomepageBootstrapScript(homepage, [], 'sunset_beach', { targeted: true }))
  expect(html).toMatch(/<picture><source type="image\/avif"[^>]*640w[^>]*1672w[^>]*sizes="100vw"/)
  expect(html).toMatch(/<source type="image\/webp"[^>]*sizes="100vw"/)
  expect(html).toMatch(/<img[^>]*class="beach-poster"[^>]*width="1672" height="941" fetchPriority="high" data-hero-still=""/i)
  const preload = html.match(/<link[^>]*data-ssr-hero-preload>/)?.[0]
  expect(preload).toContain('type="image/avif"')
  expect(html.indexOf(preload!)).toBeLessThan(html.indexOf('</head>'))
  expect(html).not.toMatch(/url\(['"]?\/amethyst\/skins\/sunset-beach\/hero-approved.png/)
})

for (const pauseEarly of [false, true]) {
  it(`waits for the still to decode and paint, then autoplays without a click (early Pause=${pauseEarly})`, async () => {
    const events: Record<string, (event: { preventDefault(): void }) => void> = {}, frames: (() => void)[] = []
    let decoded!: () => void
    const still = { complete: true, decode: vi.fn(() => new Promise<void>(r => { decoded = r })) }
    const video = { dataset: { heroVideoSrc: '/unchanged-loop.mp4' }, src: '', paused: true, preload: 'none', autoplay: false,
      muted: false, defaultMuted: false, loop: false, getAttribute: () => video.src,
      play: vi.fn(() => { video.paused = false; return Promise.resolve() }), pause: vi.fn(() => { video.paused = true }), addEventListener: vi.fn() }
    const button = { style: {}, getBoundingClientRect: () => ({ width: 120 }), setAttribute: vi.fn(), addEventListener: (type: string, fn: () => void) => { events[type] = fn } }
    const media = { dataset: { heroMedia: 'data-playing' }, removeAttribute: vi.fn() }
    const hero = { dataset: {}, querySelector: (s: string) => s.includes('motion-toggle') ? button : s.includes('hero-video') ? video : s.includes('hero-still') ? still : s.includes('hero-media') ? media : null }
    runInNewContext(earlyHomepageControls, { window: { matchMedia: () => ({ matches: false, addEventListener() {} }) },
      document: { querySelectorAll: (s: string) => s === '[data-ssr-hero]' ? [hero] : [] }, Promise, requestAnimationFrame: (fn: () => void) => frames.push(fn) })
    expect(video.src).toBe('')
    expect(video.play).not.toHaveBeenCalled()
    if (pauseEarly) events.click({ preventDefault() {} })
    decoded(); await Promise.resolve(); await Promise.resolve(); await Promise.resolve()
    frames.shift()!(); expect(video.src).toBe(''); frames.shift()!()
    expect(video.loop).toBe(true)
    if (pauseEarly) { expect(video.src).toBe(''); expect(video.play).not.toHaveBeenCalled() }
    else { expect(video.src).toBe('/unchanged-loop.mp4'); expect(video.preload).toBe('auto'); expect(video.play).toHaveBeenCalledOnce(); expect(video.muted).toBe(true) }
  })
}
