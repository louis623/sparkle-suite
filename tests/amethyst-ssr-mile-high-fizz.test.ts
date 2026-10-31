import { afterEach, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join as pathJoin } from 'node:path'
import { createRequire } from 'node:module'
import { webcrypto } from 'node:crypto'
import { createContext, Script, runInNewContext } from 'node:vm'
import { transformSync } from 'esbuild'
import { renderHomepageFirstPaint } from '@/lib/amethyst/homepage-first-paint'
import { earlyMileHighFizzControls } from '@/lib/amethyst/hero-motion-controls'
import { buildAmethystHomepageBootstrapScript, defaultAmethystHomepageTemplateData as homepage } from '@/lib/amethyst/homepage-template-data'
import { defaultAmethystJoinTemplateData as join } from '@/lib/amethyst/join-template-data'
import { defaultAmethystTradeTemplateData as trade } from '@/lib/amethyst/trade-template-data'
import runtimeSources from '@/lib/amethyst/generated/page-runtimes.json'

const source = readFileSync('public/amethyst/Homepage.html', 'utf8')
const frozenCode = transformSync(readFileSync('lib/amethyst/legacy/assets/homepage.jsx', 'utf8'),
  { loader: 'jsx', jsxFactory: 'React.createElement', jsxFragment: 'React.Fragment' }).code
const hero = (html: string) => html.match(/<section class="mhf-hero"[\s\S]*?<\/section>/)?.[0]

function frozenHero(bootstrap: string) {
  const { React, renderToString } = createRequire(pathJoin(process.cwd(), 'package.json'))('./lib/amethyst/generated/homepage-server.cjs')
  let element: unknown
  const document = { body: { classList: { add() {} } }, getElementById: () => ({}),
    documentElement: { style: { setProperty() {} } } }
  const window = { React, location: { search: '', origin: 'https://milehighfizz.com', hostname: 'milehighfizz.com' } }
  const context = createContext({ window, document, React, URL, URLSearchParams, Intl, console, crypto: webcrypto,
    ReactDOM: { createRoot: () => ({ render(node: unknown) { element = node } }) } })
  new Script(bootstrap).runInContext(context)
  for (const name of ['compiled/tweaks-panel.js', 'dance-floor-ticker-label.js', 'live-lineup.js', 'responsive-image.js', 'sparkle-suite-footer-credit.js'] as const) {
    new Script(runtimeSources[name]).runInContext(context)
  }
  new Script(frozenCode).runInContext(context)
  return hero(renderToString(element))!
}

afterEach(() => vi.restoreAllMocks())

for (const motion of ['sparkle_rise', 'still', 'none']) {
  it(`ports the complete frozen alpine_opal MHF hero and CTA tree with saved ${motion}`, async () => {
    const saved = { ...homepage, publicSiteVariant: 'mile_high_fizz_hybrid' as const, heroMotion: motion,
      repName: 'Lindsey', businessName: 'Mile High Fizz', heroHeadline: 'Mile High Fizz',
      footerLinks: { ...homepage.footerLinks, home: '/', tradeBoard: '/trade', joinTeam: '/join' } }
    const bootstrap = buildAmethystHomepageBootstrapScript(saved, [], 'alpine_opal', { targeted: true })
    const html = await renderHomepageFirstPaint(source, { homepage: saved, join, trade, appearancePreset: 'alpine_opal' },
      new URL('https://milehighfizz.com/'), bootstrap)
    const actual = hero(html)!
    expect(actual).toBeTruthy()
    // The accessible SSR-only video control is the one intentional tree addition.
    expect(actual.replace(/<button\b[^>]*data-mhf-video-toggle[^>]*>[\s\S]*?<\/button>/, '').replace(/<video\b[^>]*>/, '<video>')).toBe(frozenHero(bootstrap).replace(/<video\b[^>]*>/, '<video>'))
    expect(actual).toMatch(/<button type="button" class="mhf-video-control" data-mhf-video-toggle="" aria-label="Pause background video">Pause background video<\/button>/)
    expect(actual).toContain('class="mhf-hero-title mhf-logo-gradient"')
    const withLine = actual.match(/<p class="mhf-hero-with">([\s\S]*?)<\/p>/)?.[1]
    // React's boundary comments do not contribute to the paragraph's text.
    expect(withLine?.replace(/<!--[\s\S]*?-->/g, '')).toBe('WITH LINDSEY')
    expect(actual).toContain('PLACE YOUR ORDER AND RETURN TO THE LIVE PARTY TO WATCH YOUR REVEAL')
    for (const label of ['Shop Bomb Party', 'Join My Team', 'Browse the Dance Floor']) expect(actual).toContain(label)
    expect(actual).toContain('src="/mile-high-fizz/hero.mp4"')
    expect(actual).toMatch(/<video[^>]*class="mhf-hero-video"[^>]*preload="metadata"/)
    expect(actual).toContain('aria-hidden="true"')
    expect(actual).toContain('tabindex="-1"')
    // With no server-side media preference, autoplay is enabled by the inline
    // controller only after checking reduced motion, before deferred hydration.
    expect(actual).not.toMatch(/<video[^>]*autoplay/)
    expect(actual).toContain(`data-hero-motion="${motion === 'sparkle_rise' ? 'on' : 'off'}"`)
    expect(actual).not.toContain('Pause animation')
    expect(html).not.toMatch(/<section class="hp-hero"/)
    expect(html).toContain(earlyMileHighFizzControls)
    expect(html).toContain('min-height: calc(100vh - 123px)')
    expect(html).toContain('font-family: "Pacifico", "Brush Script MT", cursive')
    expect(html).not.toMatch(/@font-face[^}]*Pacifico/)
  })
}

it.each([
  [false, 'on', true], [true, 'on', false], [false, 'off', false], [true, 'off', false],
] as const)('controls the aurora before hydration: reduced=%s motion=%s plays=%s', async (reduced, motion, plays) => {
  const listeners: Record<string, () => void> = {}
  const clicks: Record<string, () => void> = {}
  const button = { textContent: '', style: { minInlineSize: '' }, getBoundingClientRect: () => ({ width: 180 }), setAttribute: vi.fn(), addEventListener: (name: string, fn: () => void) => { clicks[name] = fn } }
  const video = { autoplay: false, muted: false, defaultMuted: false, loop: false,
    play: vi.fn(() => Promise.resolve()), pause: vi.fn(), addEventListener: vi.fn() }
  const media = { matches: reduced, addEventListener: (name: string, fn: () => void) => { listeners[name] = fn } }
  const element = { dataset: { heroMotion: motion }, querySelector: (selector: string) => selector.includes('video-toggle') ? button : video }
  runInNewContext(earlyMileHighFizzControls, { window: { matchMedia: () => media }, document: { querySelectorAll: () => [element] }, Promise })
  await Promise.resolve()
  expect(video.autoplay).toBe(plays)
  expect(video.play).toHaveBeenCalledTimes(plays ? 1 : 0)
  expect(video.muted).toBe(true)
  expect(button.textContent).toBe(plays ? 'Pause background video' : 'Play background video')
  expect(button.style.minInlineSize).toBe('180px')
  if (!plays) expect(video.pause).toHaveBeenCalled()
  if (plays) {
    clicks.click()
    expect(video.autoplay).toBe(false)
    expect(button.textContent).toBe('Play background video')
    clicks.click()
    expect(video.autoplay).toBe(true)
    expect(button.textContent).toBe('Pause background video')
    media.matches = true
    listeners.change()
    expect(video.autoplay).toBe(false)
    expect(video.pause).toHaveBeenCalled()
  }
})
