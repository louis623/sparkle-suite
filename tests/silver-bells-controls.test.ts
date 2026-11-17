import { expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'

class Element extends EventTarget {
  children: Element[] = []
  parent: Element | null = null
  className = ''
  textContent = ''
  attrs = new Map<string, string>()
  dataset: Record<string, string> = {}
  paused = true
  muted = false
  defaultMuted = false
  loop = false
  playsInline = false
  preload = ''
  volume = 1
  disabled = false
  constructor(readonly tagName: string) { super() }
  matches(selector: string) { return selector.split(',').some(part => this.className.split(' ').includes(part.trim().replace(/^\./, ''))) }
  setAttribute(key: string, value: string) { this.attrs.set(key, value) }
  getAttribute(key: string) { return this.attrs.get(key) ?? null }
  hasAttribute(key: string) { return this.attrs.has(key) }
  removeAttribute(key: string) { this.attrs.delete(key) }
  set src(value: string) { this.setAttribute('src', value) }
  set poster(value: string) { this.setAttribute('poster', value) }
  append(...nodes: Element[]) { for (const node of nodes) { node.parent = this; this.children.push(node) } }
  prepend(node: Element) { node.parent = this; this.children.unshift(node) }
  after(node: Element) { if (!this.parent) return; node.parent = this.parent; this.parent.children.splice(this.parent.children.indexOf(this) + 1, 0, node) }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter(child => child !== this) }
  set innerHTML(html: string) {
    this.children = []
    const actions = new Element('div')
    actions.className = 'sb-actions'
    for (const match of html.matchAll(/<button\b([^>]*)>(.*?)<\/button>/g)) {
      const button = new Element('button')
      button.textContent = match[2]
      button.className = match[1].match(/class="([^"]*)"/)?.[1] ?? ''
      if (match[1].includes('data-hero-motion-toggle')) button.setAttribute('data-hero-motion-toggle', '')
      actions.append(button)
    }
    if (actions.children.length) this.append(actions)
    if (html.includes('sb-credit')) { const credit = new Element('small'); credit.className = 'sb-credit'; this.append(credit) }
    if (html.includes('sb-status')) { const status = new Element('span'); status.className = 'sb-status'; this.append(status) }
    if (html.includes('<video')) { const video = new Element('video'); video.className = 'sb-video'; this.append(video) }
  }
  querySelector(selector: string): Element | null {
    for (const child of this.children) {
      if (matches(child, selector)) return child
      const nested = child.querySelector(selector)
      if (nested) return nested
    }
    return null
  }
  play = vi.fn((): Promise<void> => { this.paused = false; return Promise.resolve() })
  pause = vi.fn(() => { this.paused = true })
}

function matches(element: Element, selector: string) {
  return selector.split(',').some(part => {
    const token = part.trim()
    if (token.startsWith('.')) return element.className.split(' ').includes(token.slice(1))
    if (token.startsWith('[')) return element.hasAttribute(token.slice(1, -1).split('=')[0])
    return element.tagName === token
  })
}

function descendants(element: Element): Element[] {
  return element.children.flatMap(child => [child, ...descendants(child)])
}

function harness() {
  const documentElement = new Element('html')
  const body = new Element('body')
  const hero = new Element('section')
  hero.className = 'hp-hero'
  hero.dataset.appearancePreset = 'silver_bells'
  documentElement.append(body)
  body.append(hero)
  const document = Object.assign(new EventTarget(), {
    body, documentElement, hidden: false, readyState: 'complete',
    createElement: (tag: string) => new Element(tag),
    querySelector: (selector: string) => documentElement.querySelector(selector),
  })
  const listeners = new EventTarget()
  const sandbox = {
    document, navigator: {}, Promise,
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    IntersectionObserver: class { observe() {} disconnect() {} },
    MutationObserver: class { observe() {} },
    requestIdleCallback: (callback: () => void) => { callback(); return 1 },
    cancelIdleCallback() {},
    addEventListener: listeners.addEventListener.bind(listeners),
    removeEventListener: listeners.removeEventListener.bind(listeners),
    dispatchEvent: listeners.dispatchEvent.bind(listeners),
  }
  Object.assign(sandbox, { window: sandbox })
  runInNewContext(readFileSync('public/amethyst/silver-bells.js', 'utf8'), sandbox)
  const controls = descendants(hero).find(element => element.className === 'sb-controls')!
  const buttons = descendants(controls).filter(element => element.tagName === 'button')
  const audio = descendants(body).find(element => element.tagName === 'audio')!
  return { hero, controls, buttons, audio, document }
}

const settle = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve() }

it('Silver Bells controls keep play and pause and omit mute', async () => {
  const { controls, buttons, audio } = harness()
  const animation = buttons.find(button => button.hasAttribute('data-hero-motion-toggle'))!
  const music = buttons.find(button => button.className === 'sb-music-toggle')!
  expect(buttons.map(button => button.textContent)).toEqual(['Pause animation', 'Play music'])
  expect(descendants(controls).some(element => element.className === 'sb-mute-toggle')).toBe(false)
  expect(descendants(controls).some(element => element.className === 'sb-credit')).toBe(true)
  expect(audio.volume).toBe(0.18)
  expect(audio.muted).toBe(false)

  music.dispatchEvent(new Event('click'))
  await settle()
  expect(music.textContent).toBe('Pause music')
  expect(audio.play).toHaveBeenCalledOnce()
  expect(audio.getAttribute('src')).toBe('/amethyst/skins/silver-bells/jingle-bells-calm.mp3')
  expect(audio.paused).toBe(false)

  animation.dispatchEvent(new Event('click'))
  expect(animation.textContent).toBe('Play animation')
  expect(music.textContent).toBe('Pause music')
  expect(audio.paused).toBe(false)

  music.dispatchEvent(new Event('click'))
  expect(music.textContent).toBe('Play music')
  expect(audio.pause).toHaveBeenCalled()
  expect(audio.muted).toBe(false)
})

it('Silver Bells source and compiled output have no mute control', () => {
  const files = [
    'lib/amethyst/v2/hero-motion.jsx',
    'public/amethyst/silver-bells.js',
    'public/amethyst/ssr-motion/silver-bells.js',
    'public/amethyst/compiled/homepage.js',
    'public/amethyst/compiled/trade.js',
    'public/amethyst/compiled/join.js',
    'lib/amethyst/generated/page-runtimes.json',
  ]
  for (const file of files) {
    const source = readFileSync(file, 'utf8')
    expect(source, file).not.toContain('sb-mute-toggle')
    expect(source, file).toContain('Play music')
  }
  const controls = readFileSync('lib/amethyst/v2/hero-motion.jsx', 'utf8')
  expect(controls).toContain('Kevin MacLeod')
  expect(controls).toContain('CC BY 4.0')
  expect(readFileSync('public/amethyst/silver-bells.js', 'utf8')).not.toContain('muteButton')
})
