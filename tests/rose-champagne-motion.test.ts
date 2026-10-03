import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'

class Element extends EventTarget {
  attrs = new Map<string, string>()
  dataset: Record<string, string> = {}
  children: Element[] = []
  parent: Element | null = null
  className = ''; hidden = false; textContent = ''; paused = true
  classList = { contains: (name: string) => this.className.split(' ').includes(name) }
  constructor(readonly tagName: string) { super() }
  setAttribute(key: string, value: string) { this.attrs.set(key, value) }
  getAttribute(key: string) { return this.attrs.get(key) ?? null }
  hasAttribute(key: string) { return this.attrs.has(key) }
  removeAttribute(key: string) { this.attrs.delete(key) }
  set src(value: string) { this.setAttribute('src', value) }
  append(...nodes: Element[]) { nodes.forEach(node => { node.parent = this; this.children.push(node) }) }
  prepend(node: Element) { node.parent = this; this.children.unshift(node) }
  after(node: Element) { if (this.parent) { node.parent = this.parent; this.parent.children.splice(this.parent.children.indexOf(this) + 1, 0, node) } }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter(node => node !== this) }
  play = vi.fn((): Promise<void> => { this.paused = false; return Promise.resolve() })
  pause = vi.fn(() => { this.paused = true })
  load = vi.fn()
}

function harness({ mobile = false, reduced = false, still = false, otherTheme = false } = {}) {
  const hero = new Element('section'); hero.dataset.heroMotion = still ? 'off' : 'on'; hero.dataset.appearancePreset = 'rose_gold'
  const body = new Element('body'); body.className = otherTheme ? 'bg-amethyst' : 'bg-rose-gold-paper'
  const doc = Object.assign(new EventTarget(), { body, hidden: false, readyState: 'complete', querySelector: () => hero, createElement: (tag: string) => new Element(tag) })
  const motion = Object.assign(new EventTarget(), { matches: reduced })
  const queries: string[] = []
  let intersect: (entries: { isIntersecting: boolean }[]) => void = () => {}
  let mutate: (records?: { target: Element; attributeName: string }[]) => void = () => {}
  const disconnect = vi.fn()
  runInNewContext(readFileSync('public/amethyst/rose-champagne.js', 'utf8'), {
    document: doc, innerWidth: mobile ? 390 : 1440,
    matchMedia: (query: string) => { queries.push(query); return motion },
    IntersectionObserver: class { constructor(fn: typeof intersect) { intersect = fn } observe() {} disconnect = disconnect },
    MutationObserver: class { constructor(fn: typeof mutate) { mutate = fn } observe() {} },
  })
  const media = hero.children.find(node => node.tagName === 'div')!
  const video = media?.children.find(node => node.tagName === 'video') as Element
  const poster = media?.children.find(node => node.tagName === 'img') as Element
  const button = hero.children.find(node => node.tagName === 'button')!
  return { hero, body, doc, motion, media, video, poster, button, queries, disconnect,
    visible: (value: boolean) => intersect([{ isIntersecting: value }]),
    preference: (value: string) => { hero.dataset.heroMotion = value; mutate([{ target: hero, attributeName: 'data-hero-motion' }]) },
    switchSkin: () => { body.className = 'homepage'; mutate() },
  }
}
const settle = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve() }

describe('Rose Champagne motion lifecycle', () => {
  it('does not mount or load on another theme', () => { const h = harness({ otherTheme: true }); expect(h.hero.children).toHaveLength(0) })

  it.each([false, true])('defers identical inline media until visible on phone and desktop (mobile=%s)', async mobile => {
    const h = harness({ mobile })
    expect(h.video.hasAttribute('src')).toBe(false); expect(h.video.play).not.toHaveBeenCalled()
    h.visible(true); await settle()
    expect(h.video.getAttribute('src')).toBe('/amethyst/skins/rose-champagne/hero-loop.mp4')
    expect(h.poster.getAttribute('src')).toBe('/amethyst/skins/rose-champagne/hero-poster.webp')
    expect(h.video).toMatchObject({ muted: true, playsInline: true, loop: true, preload: 'none' })
    expect(h.queries).toEqual(['(prefers-reduced-motion:reduce)'])
    expect(h.video.play).toHaveBeenCalledTimes(1)
    h.video.dispatchEvent(new Event('playing'))
    expect(h.media.getAttribute('data-rgc-playing')).toBe('true')
    expect(h.media.getAttribute('aria-hidden')).toBe('true')
  })

  it.each([{ reduced: true }, { still: true }, { mobile: true, reduced: true }, { mobile: true, still: true }])('hard gates disabled motion even if manually clicked: %j', async options => {
    const h = harness(options); h.visible(true); h.button.dispatchEvent(new Event('click')); await settle()
    expect(h.video.hasAttribute('src')).toBe(false); expect(h.video.play).not.toHaveBeenCalled()
    expect(h.button.hidden).toBe(true)
    expect(h.media.hasAttribute('data-rgc-playing')).toBe(false)
  })

  it('allows manual Play after rejected autoplay without visibility retry storms', async () => {
    const h = harness(); h.video.play.mockRejectedValueOnce(Object.assign(new Error('Blocked'), { name: 'NotAllowedError' }))
    h.visible(true); await settle()
    expect(h.button.textContent).toBe('Play animation'); expect(h.button.hidden).toBe(false)
    h.visible(false); h.visible(true); expect(h.video.play).toHaveBeenCalledTimes(1)
    h.button.dispatchEvent(new Event('click')); await settle()
    expect(h.video.play).toHaveBeenCalledTimes(2); expect(h.button.textContent).toBe('Pause animation')
  })

  it('pauses hidden/offscreen video and preserves visitor pause across visibility and preference changes', async () => {
    const h = harness(); h.visible(true); await settle(); h.video.dispatchEvent(new Event('playing'))
    h.doc.hidden = true; h.doc.dispatchEvent(new Event('visibilitychange')); expect(h.video.paused).toBe(true)
    h.doc.hidden = false; h.doc.dispatchEvent(new Event('visibilitychange')); await settle(); expect(h.video.paused).toBe(false)
    h.visible(false); expect(h.video.paused).toBe(true); h.visible(true); await settle()
    h.button.dispatchEvent(new Event('click')); expect(h.video.paused).toBe(true)
    const plays = h.video.play.mock.calls.length
    h.visible(false); h.visible(true)
    h.preference('off'); h.preference('on')
    h.motion.matches = true; h.motion.dispatchEvent(new Event('change'))
    h.motion.matches = false; h.motion.dispatchEvent(new Event('change'))
    h.doc.hidden = true; h.doc.dispatchEvent(new Event('visibilitychange'))
    h.doc.hidden = false; h.doc.dispatchEvent(new Event('visibilitychange'))
    expect(h.video.play).toHaveBeenCalledTimes(plays); expect(h.button.getAttribute('aria-pressed')).toBe('false')
  })

  it.each(['reduced', 'saved-off'] as const)('unloads media and ignores late playing events when %s becomes active', async gate => {
    const h = harness(); h.visible(true); await settle(); h.video.dispatchEvent(new Event('playing'))
    if (gate === 'reduced') { h.motion.matches = true; h.motion.dispatchEvent(new Event('change')) } else h.preference('off')
    h.video.dispatchEvent(new Event('playing')); h.button.dispatchEvent(new Event('click'))
    expect(h.video.paused).toBe(true); expect(h.video.hasAttribute('src')).toBe(false)
    expect(h.media.hasAttribute('data-rgc-playing')).toBe(false); expect(h.button.hidden).toBe(true)
    expect(h.video.play).toHaveBeenCalledTimes(1)
  })

  it('keeps the poster after a media failure, including through subsequent preference changes', async () => {
    const h = harness(); h.visible(true); await settle(); h.video.dispatchEvent(new Event('playing')); h.video.dispatchEvent(new Event('error'))
    h.preference('off'); h.preference('on'); h.button.dispatchEvent(new Event('click'))
    expect(h.media.hasAttribute('data-rgc-playing')).toBe(false); expect(h.video.paused).toBe(true)
    expect(h.button.hidden).toBe(true); expect(h.video.play).toHaveBeenCalledTimes(1)
  })

  it.each(['pause', 'hidden', 'offscreen', 'dispose', 'off', 'reduced'] as const)('settles in-flight playback safely after %s', async action => {
    const h = harness(); let resolve!: () => void
    h.video.play.mockImplementationOnce(() => new Promise<void>(done => { resolve = done })); h.visible(true)
    if (action === 'pause') h.button.dispatchEvent(new Event('click'))
    if (action === 'hidden') { h.doc.hidden = true; h.doc.dispatchEvent(new Event('visibilitychange')) }
    if (action === 'offscreen') h.visible(false)
    if (action === 'dispose') h.switchSkin()
    if (action === 'off') h.preference('off')
    if (action === 'reduced') { h.motion.matches = true; h.motion.dispatchEvent(new Event('change')) }
    h.video.paused = false; resolve(); await settle(); h.video.dispatchEvent(new Event('playing'))
    expect(h.video.paused).toBe(true); expect(h.video.play).toHaveBeenCalledTimes(1)
  })

  it('resumes an interrupted pending play only after visibility has returned', async () => {
    const h = harness(); let reject!: (error: Error) => void
    h.video.play.mockImplementationOnce(() => new Promise<void>((_done, fail) => { reject = fail })); h.visible(true)
    h.doc.hidden = true; h.doc.dispatchEvent(new Event('visibilitychange'))
    h.doc.hidden = false; h.doc.dispatchEvent(new Event('visibilitychange'))
    expect(h.video.play).toHaveBeenCalledTimes(1)
    reject(Object.assign(new Error('Interrupted'), { name: 'AbortError' })); await settle()
    expect(h.video.play).toHaveBeenCalledTimes(2); expect(h.video.paused).toBe(false)
  })

  it('does not retry an unexplained AbortError repeatedly', async () => {
    const h = harness(); h.video.play.mockRejectedValueOnce(Object.assign(new Error('Interrupted'), { name: 'AbortError' }))
    h.visible(true); await settle(); h.visible(false); h.visible(true)
    expect(h.video.play).toHaveBeenCalledTimes(1); expect(h.button.textContent).toBe('Play animation')
  })

  it('removes media, cancels loading and ignores all late events after switching themes', async () => {
    const h = harness(); h.visible(true); await settle(); h.switchSkin()
    expect(h.hero.children).toHaveLength(0); expect(h.disconnect).toHaveBeenCalledTimes(1)
    expect(h.video.hasAttribute('src')).toBe(false); expect(h.video.load).toHaveBeenCalledTimes(1)
    h.motion.dispatchEvent(new Event('change')); h.doc.dispatchEvent(new Event('visibilitychange'))
    h.video.dispatchEvent(new Event('playing')); h.button.dispatchEvent(new Event('click'))
    expect(h.video.play).toHaveBeenCalledTimes(1); expect(h.media.hasAttribute('data-rgc-playing')).toBe(false)
  })
})
