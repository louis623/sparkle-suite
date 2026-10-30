import { expect, it, vi } from 'vitest'
import { runInNewContext } from 'node:vm'
import { HERO_MOTION_THEMES } from '@/lib/amethyst/hero-motion-config'
import { earlyHomepageControls } from '@/lib/amethyst/hero-motion-controls'

for (const [preset, config] of Object.entries(HERO_MOTION_THEMES)) {
  it(`honors reduced motion before hydration and on preference changes for ${preset}`, async () => {
    const events: Record<string, () => void> = {}
    const preference = { matches: true, addEventListener: (name: string, listener: () => void) => { events[name] = listener } }
    const video = { paused: true, autoplay: false, muted: false, defaultMuted: false, loop: false,
      play: vi.fn(() => { video.paused = false; return Promise.resolve() }), pause: vi.fn(() => { video.paused = true }), addEventListener: vi.fn() }
    const button = { textContent: '', setAttribute: vi.fn(), addEventListener: vi.fn() }
    const media = { dataset: { heroMedia: 'data-playing' }, removeAttribute: vi.fn() }
    const hero = { dataset: { ssrHero: preset } as Record<string, string>, querySelector: (selector: string) =>
      selector.includes('motion-toggle') ? button : selector.includes('hero-video') ? (config.kind === 'video' ? video : null) : selector.includes('hero-media') ? media : null }
    const window = { matchMedia: () => preference, sparkleStartHeroMotion: undefined as undefined | (() => void) }
    runInNewContext(earlyHomepageControls, { window, document: { querySelectorAll: (selector: string) => selector === '[data-ssr-hero]' ? [hero] : [] }, Promise })
    await Promise.resolve()
    expect(button.textContent).toBe('Play animation')
    expect(hero.dataset.visitorPaused).toBe('true')
    expect(video.play).not.toHaveBeenCalled()
    expect(video.autoplay).toBe(false)
    if (config.kind === 'video') expect(media.removeAttribute).toHaveBeenCalledWith('data-playing')
    window.sparkleStartHeroMotion!()
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
