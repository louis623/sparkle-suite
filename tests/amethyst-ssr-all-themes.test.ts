import { afterEach, expect, it, vi } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { AMETHYST_APPEARANCE_PRESET_IDS } from '@/lib/amethyst/appearance-presets'
import { HERO_MOTION_THEMES } from '@/lib/amethyst/hero-motion-config'
import { earlyHomepageControls } from '@/lib/amethyst/hero-motion-controls'
import { homepageSmokeReview, SSR_REVIEW_LAYOUTS } from '@/lib/amethyst/homepage-smoke-review'
import { renderHomepageFirstPaint } from '@/lib/amethyst/homepage-first-paint'
import { buildAmethystHomepageBootstrapScript, defaultAmethystHomepageTemplateData as homepage } from '@/lib/amethyst/homepage-template-data'
import { defaultAmethystJoinTemplateData as join } from '@/lib/amethyst/join-template-data'
import { defaultAmethystTradeTemplateData as trade } from '@/lib/amethyst/trade-template-data'

const source = readFileSync('public/amethyst/Homepage.html', 'utf8')
afterEach(() => vi.unstubAllEnvs())

it('covers every preset with existing CSS, scripts, art and motion assets', () => {
  expect(Object.keys(HERO_MOTION_THEMES).sort()).toEqual([...AMETHYST_APPEARANCE_PRESET_IDS].sort())
  for (const theme of Object.values(HERO_MOTION_THEMES)) {
    for (const css of theme.css) expect(existsSync('public/amethyst/' + css), css).toBe(true)
    if (theme.script) expect(existsSync('public/amethyst/' + theme.script)).toBe(true)
    for (const asset of [theme.poster, theme.src].filter(Boolean)) expect(existsSync('public' + asset), asset).toBe(true)
  }
})

for (const preset of AMETHYST_APPEARANCE_PRESET_IDS) {
  for (const [layout, publicSiteVariant] of Object.entries(SSR_REVIEW_LAYOUTS)) {
    it(`server renders ${preset} / ${layout}, ignoring saved Still without fallback`, async () => {
      const saved = { ...homepage, heroMotion: 'still', publicSiteVariant }
      const bootstrap = buildAmethystHomepageBootstrapScript(saved, [], preset, { targeted: true })
      const html = await renderHomepageFirstPaint(source, { homepage: saved, join, trade, appearancePreset: preset }, new URL('https://sparkle-suite-smoke.vercel.app/dudesfizzfest'), bootstrap)
      expect(html).toContain(`data-ssr-hero="${preset}"`)
      expect(html).toContain('data-server-rendered="true"')
      expect(html.match(/<h1\b/g)).toHaveLength(1)
      expect(html).toContain('data-hero-motion-toggle=""')
      expect(html.match(/data-hero-motion-toggle=""/g)).toHaveLength(1)
      expect(html).toContain('>Pause animation</button>')
      if (HERO_MOTION_THEMES[preset].sound) {
        expect(html).toContain('>Enable ' + HERO_MOTION_THEMES[preset].sound + '</button>')
      }
      if (preset === 'sunset_beach') expect(html.indexOf('class="beach-motion-controls"')).toBeLessThan(html.indexOf('class="hp-hero-media"'))
      for (const css of HERO_MOTION_THEMES[preset].css) expect(html).toContain(css)
      expect(html).toContain('data-ssr-style="homepage.css"')
      expect(html).not.toMatch(/<link\b[^>]*rel="stylesheet"/)
      if (HERO_MOTION_THEMES[preset].script) expect(html).toMatch(new RegExp(`<script defer src="[^\"]*${HERO_MOTION_THEMES[preset].script}`))
      if (HERO_MOTION_THEMES[preset].kind === 'video') {
        const video = html.match(/<video\b[^>]*data-hero-video=""[^>]*>/)?.[0]
        for (const attribute of ['autoplay', 'muted', 'playsinline', 'loop']) expect(video).toMatch(new RegExp(`\\s${attribute}=""`, 'i'))
        expect(video).toContain(`poster="${HERO_MOTION_THEMES[preset].poster}"`)
        expect(video).toContain('preload="auto"')
      }
      expect(html).not.toMatch(/react\.development|babel|data-template-src=/)
      expect(saved.heroMotion).toBe('still')
    })
  }
}

it('starts muted before play, never inserts a loop rest, and retains early visitor pause', async () => {
  const listeners = new Map<string, () => void>()
  const video = { muted: false, defaultMuted: false, loop: false, paused: true,
    addEventListener: vi.fn(), play: vi.fn(() => { expect(video.muted).toBe(true); video.paused = false; return Promise.resolve() }),
    pause: vi.fn(() => { video.paused = true }) }
  const button = { textContent: '', setAttribute: vi.fn(), addEventListener: (name: string, listener: () => void) => listeners.set(name, listener) }
  const hero = { dataset: {} as Record<string, string>, querySelector: (selector: string) => selector.includes('motion-toggle') ? button : selector.includes('hero-video') ? video : null }
  const window: { sparkleStartHeroMotion?: () => void } = {}
  runInNewContext(earlyHomepageControls, { window, document: { hidden: true, querySelectorAll: () => [hero] }, Promise })
  await Promise.resolve(); await Promise.resolve()
  expect(video.play).toHaveBeenCalledOnce()
  expect(video.loop).toBe(true)
  expect(video.pause).not.toHaveBeenCalled()
  listeners.get('click')!({ preventDefault() {} } as never)
  expect(video.pause).toHaveBeenCalledOnce()
  expect(button.textContent).toBe('Play animation')
  window.sparkleStartHeroMotion!()
  expect(button.textContent).toBe('Play animation')
  expect(video.play).toHaveBeenCalledOnce()
  expect(earlyHomepageControls).not.toMatch(/setTimeout|setInterval|ended|IntersectionObserver|matchMedia/)
})

it('disables review overrides on Live, other projects, other databases and other reps; normal URL uses saved theme', () => {
  const data = { appearancePreset: 'sunset_beach' as const, homepage, join, trade }
  const url = new URL('https://sparkle-suite-smoke.vercel.app/dudesfizzfest?ssrReviewTheme=pearl_rose&ssrReviewLayout=mile_high_fizz')
  vi.stubEnv('VERCEL_ENV', 'preview'); vi.stubEnv('VERCEL_PROJECT_ID', 'prj_VTY0rpz2O3VBJqJv69iBz8tzLexQ')
  vi.stubEnv('NEXT_PUBLIC_SPARKLE_ENVIRONMENT', 'smoke'); vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://pukemqiwlyqmyytxkdmo.supabase.co')
  expect(homepageSmokeReview(data, url, 'dudesfizzfest').appearancePreset).toBe('pearl_rose')
  expect(homepageSmokeReview(data, new URL(url.origin + url.pathname), 'dudesfizzfest')).toBe(data)
  expect(homepageSmokeReview(data, url, 'blingkitchen')).toBe(data)
  for (const [key, value] of [['VERCEL_ENV', 'production'], ['VERCEL_PROJECT_ID', 'other'], ['NEXT_PUBLIC_SUPABASE_URL', 'https://other.supabase.co'], ['NEXT_PUBLIC_SPARKLE_ENVIRONMENT', 'live']]) {
    const original = process.env[key]; vi.stubEnv(key, value)
    expect(homepageSmokeReview(data, url, 'dudesfizzfest')).toBe(data)
    vi.stubEnv(key, original)
  }
})
