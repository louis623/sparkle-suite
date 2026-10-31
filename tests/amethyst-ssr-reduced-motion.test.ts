import { expect, it, vi } from 'vitest'
import { runInNewContext } from 'node:vm'
import { HERO_MOTION_THEMES } from '@/lib/amethyst/hero-motion-config'
import { earlyHomepageControls } from '@/lib/amethyst/hero-motion-controls'

for (const [preset, config] of Object.entries(HERO_MOTION_THEMES)) {
  it(`honors reduced motion before hydration and on preference changes for ${preset}`, async () => {
    const events: Record<string, () => void> = {}
    const preference = { matches: true, addEventListener: (name: string, listener: () => void) => { events[name] = listener } }
    const video = { dataset: {}, paused: true, autoplay: false, muted: false, defaultMuted: false, loop: false,
      play: vi.fn(() => { video.paused = false; return Promise.resolve() }), pause: vi.fn(() => { video.paused = true }), addEventListener: vi.fn() }
    const button = { textContent: '', style: { minInlineSize: '' }, getBoundingClientRect: vi.fn(() => ({ width: 120 })), setAttribute: vi.fn(), addEventListener: vi.fn() }
    const media = { dataset: { heroMedia: 'data-playing' }, removeAttribute: vi.fn() }
    const hero = { dataset: { ssrHero: preset } as Record<string, string>, querySelector: (selector: string) =>
      selector.includes('motion-toggle') ? button : selector.includes('hero-video') ? (config.kind === 'video' ? video : null) : selector.includes('hero-media') ? media : null }
    const window = { matchMedia: () => preference, sparkleStartHeroMotion: undefined as undefined | (() => void) }
    runInNewContext(earlyHomepageControls, { window, document: { querySelectorAll: (selector: string) => selector === '[data-ssr-hero]' ? [hero] : [] }, Promise })
    await Promise.resolve()
    expect(button.textContent).toBe('Play animation')
    expect(button.style.minInlineSize).toBe('120px')
    expect(hero.dataset.visitorPaused).toBe('true')
    expect(video.play).not.toHaveBeenCalled()
    expect(video.autoplay).toBe(false)
    if (config.kind === 'video') expect(media.removeAttribute).toHaveBeenCalledWith('data-playing')
    window.sparkleStartHeroMotion!()
    expect(button.getBoundingClientRect).toHaveBeenCalledOnce()
    expect(video.play).not.toHaveBeenCalled()
    preference.matches = false; events.change()
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve()
    expect(button.textContent).toBe('Pause animation')
    if (config.kind === 'video') expect(video.play).toHaveBeenCalledOnce()
    preference.matches = true; events.change()
    expect(button.textContent).toBe('Play animation')
    expect(hero.dataset.visitorPaused).toBe('true')
    if (config.kind === 'video') {
      expect(video.paused).toBe(true)
      expect(video.autoplay).toBe(false)
    }
  })
}

for (const initiallyReduced of [false, true]) {
  it(`switches Amethyst opening/final posters with visitor intent (initial reduced=${initiallyReduced}) without changing startup scheduling`, async () => {
    const config = HERO_MOTION_THEMES.amethyst
    const events: Record<string, () => void> = {}, clicks: Record<string, (e: unknown) => void> = {}
    const preference = { matches: initiallyReduced, addEventListener: (name: string, fn: () => void) => { events[name] = fn } }
    const frames: (() => void)[] = []
    const still = { src: config.poster, complete: true, decode: vi.fn(() => Promise.resolve()), getAttribute: () => still.src }
    const video = { dataset: { heroOpeningPoster: config.poster, heroPausedPoster: config.pausedPoster, heroVideoSrc: config.src },
      poster: config.poster, src: '', preload: 'none', autoplay: false, paused: true, muted: false, defaultMuted: false, loop: false,
      getAttribute: (key: string) => key === 'poster' ? video.poster : video.src,
      play: vi.fn(() => { video.paused = false; return Promise.resolve() }), pause: vi.fn(() => { video.paused = true }), addEventListener: vi.fn() }
    const button = { textContent: '', style: {}, getBoundingClientRect: () => ({ width: 120 }), setAttribute: vi.fn(), addEventListener: (name: string, fn: (e: unknown) => void) => { clicks[name] = fn } }
    const media = { dataset: { heroMedia: 'data-video' }, removeAttribute: vi.fn() }
    const hero = { dataset: {}, querySelector: (selector: string) => selector.includes('motion-toggle') ? button : selector.includes('hero-video') ? video : selector.includes('hero-still') ? still : selector.includes('hero-media') ? media : null }
    runInNewContext(earlyHomepageControls, { window: { matchMedia: () => preference }, document: { querySelectorAll: (s: string) => s === '[data-ssr-hero]' ? [hero] : [] }, requestAnimationFrame: (fn: () => void) => frames.push(fn), Promise })
    expect(still.src).toBe(initiallyReduced ? config.pausedPoster : config.poster)
    expect(video.poster).toBe(still.src)
    expect(video.play).not.toHaveBeenCalled()
    if (initiallyReduced) clicks.click({ preventDefault() {} })
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve()
    while (frames.length) frames.shift()!()
    expect(video.play).toHaveBeenCalledOnce()
    expect(video.src).toBe(config.src)
    expect(video.autoplay).toBe(true)
    expect(still.src).toBe(config.poster)
    expect(video.poster).toBe(config.poster)
    clicks.click({ preventDefault() {} })
    expect(video.paused).toBe(true)
    expect(still.src).toBe(config.pausedPoster)
    expect(video.poster).toBe(config.pausedPoster)
    preference.matches = false; events.change()
    expect(still.src).toBe(config.poster)
    expect(video.poster).toBe(config.poster)
  })
}
