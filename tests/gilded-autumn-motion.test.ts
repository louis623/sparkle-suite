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

function harness({ mobile = false, reduced = false, still = false } = {}) {
  const hero = new Element('section'); hero.dataset.heroMotion = still ? 'off' : 'on'
  const body = new Element('body'); body.className = 'bg-gilded-autumn'
  const doc = Object.assign(new EventTarget(), { body, hidden: false, readyState: 'complete', querySelector: () => hero, createElement: (tag: string) => new Element(tag) })
  const motion = Object.assign(new EventTarget(), { matches: reduced })
  const queries: string[] = []
  let intersect: (entries: { isIntersecting: boolean }[]) => void = () => {}
  let mutate: (records?: { target: Element; attributeName: string }[]) => void = () => {}
  const disconnect = vi.fn()
  runInNewContext(readFileSync('public/amethyst/gilded-autumn.js', 'utf8'), {
    document: doc, innerWidth: mobile ? 390 : 1440,
    matchMedia: (query: string) => { queries.push(query); return query.includes('reduced-motion') ? motion : { matches: !mobile } },
    IntersectionObserver: class { constructor(fn: typeof intersect) { intersect = fn } observe() {} disconnect = disconnect },
    MutationObserver: class { constructor(fn: typeof mutate) { mutate = fn } observe() {} },
  })
  const media = hero.children.find(node => node.tagName === 'div')!
  const video = media.children.find(node => node.tagName === 'video')!
  const poster = media.children.find(node => node.tagName === 'img')!
  const button = hero.children.find(node => node.tagName === 'button')!
  return { hero, body, doc, motion, media, video, poster, button, queries, disconnect,
    visible: (value: boolean) => intersect([{ isIntersecting: value }]),
    preference: (value: string) => { hero.dataset.heroMotion = value; mutate([{ target: hero, attributeName: 'data-hero-motion' }]) },
    switchSkin: () => { body.className = 'homepage'; mutate() },
  }
}
const settle = async () => { await Promise.resolve(); await Promise.resolve() }

describe('Gilded Autumn motion lifecycle', () => {
  it.each([false, true])('defers the same inline loop until the hero enters view (mobile=%s)', async mobile => {
    const h = harness({ mobile })
    expect(h.video.hasAttribute('src')).toBe(false)
    expect(h.video.play).not.toHaveBeenCalled()
    h.visible(true); await settle()
    expect(h.video.getAttribute('src')).toBe('/amethyst/skins/gilded-autumn/hero-motion.mp4')
    expect(h.poster.getAttribute('src')).toBe('/amethyst/skins/gilded-autumn/hero-poster.webp')
    expect(h.video).toMatchObject({ muted: true, playsInline: true, loop: true, preload: 'none' })
    expect(h.queries).toEqual(['(prefers-reduced-motion:reduce)'])
    expect(h.video.play).toHaveBeenCalledTimes(1)
    h.video.dispatchEvent(new Event('playing'))
    expect(h.media.hasAttribute('data-playing')).toBe(true)
    expect(h.media.getAttribute('aria-hidden')).toBe('true')
  })

  it.each([{ reduced: true }, { still: true }, { mobile: true, reduced: true }, { mobile: true, still: true }])('does not download motion when disabled: %j', options => {
    const h = harness(options); h.visible(true)
    expect(h.video.hasAttribute('src')).toBe(false)
    expect(h.video.play).not.toHaveBeenCalled()
    expect(h.button.textContent).toBe('Play animation')
    expect(h.button.hidden).toBe(false)
  })

  it('offers manual Play after autoplay rejection instead of repeatedly retrying', async () => {
    const h = harness({ mobile: true })
    h.video.play.mockRejectedValueOnce(Object.assign(new Error('Blocked'), { name: 'NotAllowedError' }))
    h.visible(true); await settle()
    expect(h.button.textContent).toBe('Play animation')
    expect(h.media.hasAttribute('data-playing')).toBe(false)
    h.visible(false); h.visible(true)
    expect(h.video.play).toHaveBeenCalledTimes(1)
    h.button.dispatchEvent(new Event('click')); await settle()
    expect(h.video.play).toHaveBeenCalledTimes(2)
    expect(h.button.textContent).toBe('Pause animation')
  })

  it('pauses hidden or offscreen media and preserves a visitor pause through both transitions', async () => {
    const h = harness(); h.visible(true); await settle()
    h.doc.hidden = true; h.doc.dispatchEvent(new Event('visibilitychange'))
    expect(h.video.paused).toBe(true)
    h.doc.hidden = false; h.doc.dispatchEvent(new Event('visibilitychange')); await settle()
    expect(h.video.paused).toBe(false)
    h.visible(false); expect(h.video.paused).toBe(true)
    h.visible(true); await settle(); expect(h.video.paused).toBe(false)
    h.button.dispatchEvent(new Event('click'))
    const plays = h.video.play.mock.calls.length
    h.visible(false); h.visible(true)
    h.doc.hidden = true; h.doc.dispatchEvent(new Event('visibilitychange'))
    h.doc.hidden = false; h.doc.dispatchEvent(new Event('visibilitychange'))
    expect(h.video.play).toHaveBeenCalledTimes(plays)
    expect(h.button.textContent).toBe('Play animation')
    expect(h.button.getAttribute('aria-pressed')).toBe('false')
  })

  it('returns to the matching poster for reduced motion, saved off, or media failure', async () => {
    const h = harness(); h.visible(true); await settle()
    h.video.dispatchEvent(new Event('playing'))
    h.motion.matches = true; h.motion.dispatchEvent(new Event('change'))
    expect(h.video.paused).toBe(true)
    expect(h.media.hasAttribute('data-playing')).toBe(false)
    h.motion.matches = false; h.motion.dispatchEvent(new Event('change')); await settle()
    h.video.dispatchEvent(new Event('playing'))
    h.preference('off')
    expect(h.media.hasAttribute('data-playing')).toBe(false)
    expect(h.video.paused).toBe(true)
    h.preference('on'); await settle()
    h.video.dispatchEvent(new Event('playing')); h.video.dispatchEvent(new Event('error'))
    expect(h.media.hasAttribute('data-playing')).toBe(false)
    expect(h.video.paused).toBe(true)
    expect(h.button.hidden).toBe(true)
  })

  it.each(['pause', 'hidden', 'offscreen', 'dispose'] as const)('settles an in-flight play safely after %s', async action => {
    const h = harness()
    let resolve!: () => void
    h.video.play.mockImplementationOnce(() => new Promise<void>(done => { resolve = done }))
    h.visible(true)
    if (action === 'pause') h.button.dispatchEvent(new Event('click'))
    if (action === 'hidden') { h.doc.hidden = true; h.doc.dispatchEvent(new Event('visibilitychange')) }
    if (action === 'offscreen') h.visible(false)
    if (action === 'dispose') h.switchSkin()
    h.video.paused = false; resolve(); await settle()
    expect(h.video.paused).toBe(true)
    expect(h.video.play).toHaveBeenCalledTimes(1)
  })

  it('resumes when a hidden-page abort settles after the page is already visible again', async () => {
    const h = harness()
    let reject!: (reason: Error) => void
    h.video.play.mockImplementationOnce(() => new Promise<void>((_resolve, fail) => { reject = fail }))
    h.visible(true)
    h.doc.hidden = true; h.doc.dispatchEvent(new Event('visibilitychange'))
    h.doc.hidden = false; h.doc.dispatchEvent(new Event('visibilitychange'))
    expect(h.video.play).toHaveBeenCalledTimes(1)
    reject(Object.assign(new Error('Playback interrupted'), { name: 'AbortError' }))
    await settle()
    expect(h.video.play).toHaveBeenCalledTimes(2)
    expect(h.video.paused).toBe(false)
    expect(h.button.textContent).toBe('Pause animation')
  })

  it.each(['pause', 'hidden', 'offscreen', 'dispose'] as const)('does not retry an aborted play while %s still prevents playback', async action => {
    const h = harness()
    let reject!: (reason: Error) => void
    h.video.play.mockImplementationOnce(() => new Promise<void>((_resolve, fail) => { reject = fail }))
    h.visible(true)
    if (action === 'pause') h.button.dispatchEvent(new Event('click'))
    if (action === 'hidden') { h.doc.hidden = true; h.doc.dispatchEvent(new Event('visibilitychange')) }
    if (action === 'offscreen') h.visible(false)
    if (action === 'dispose') h.switchSkin()
    reject(Object.assign(new Error('Playback interrupted'), { name: 'AbortError' }))
    await settle()
    expect(h.video.play).toHaveBeenCalledTimes(1)
    expect(h.video.paused).toBe(true)
  })

  it('removes media and listeners on skin switch and ignores late playback events', async () => {
    const h = harness(); h.visible(true); await settle(); h.switchSkin()
    expect(h.hero.children).toHaveLength(0)
    expect(h.disconnect).toHaveBeenCalledTimes(1)
    expect(h.video.hasAttribute('src')).toBe(false)
    expect(h.video.load).toHaveBeenCalledTimes(1)
    const plays = h.video.play.mock.calls.length
    h.motion.matches = true; h.motion.dispatchEvent(new Event('change'))
    h.motion.matches = false; h.motion.dispatchEvent(new Event('change'))
    h.doc.dispatchEvent(new Event('visibilitychange'))
    h.video.dispatchEvent(new Event('playing'))
    expect(h.video.play).toHaveBeenCalledTimes(plays)
    expect(h.media.hasAttribute('data-playing')).toBe(false)
  })
})
