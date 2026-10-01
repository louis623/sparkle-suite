import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'

class Element extends EventTarget {
  attrs = new Map<string,string>(); dataset: Record<string,string> = {}; children: Element[] = []
  parent: Element | null = null; className = ''; textContent = ''; hidden = false; paused = true; currentTime = 0
  constructor(readonly tagName: string) { super() }
  setAttribute(key: string, value: string) { this.attrs.set(key,value) }
  getAttribute(key: string) { return this.attrs.get(key) ?? null }
  hasAttribute(key: string) { return this.attrs.has(key) }
  removeAttribute(key: string) { this.attrs.delete(key) }
  set src(value: string) { this.setAttribute('src',value) }
  append(...nodes: Element[]) { nodes.forEach(node => { node.parent = this; this.children.push(node) }) }
  prepend(node: Element) { node.parent = this; this.children.unshift(node) }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter(node => node !== this) }
  play = vi.fn((): Promise<void> => { this.paused = false; return Promise.resolve() })
  pause = vi.fn(() => { this.paused = true })
  load = vi.fn()
}
function harness({reduced = false, still = false, selected = true} = {}) {
  const hero = new Element('section'); hero.dataset.heroMotion = still ? 'off' : 'on'
  const doc = Object.assign(new EventTarget(), {body:new Element('body'), hidden:false, readyState:'complete', querySelector:() => selected ? hero : null, createElement:(tag: string) => new Element(tag)})
  const preference = Object.assign(new EventTarget(), {matches:reduced})
  let intersect: (entries:{isIntersecting:boolean}[]) => void = () => {}
  let mutate: (records?:{target:Element;attributeName:string}[]) => void = () => {}
  const disconnect = vi.fn()
  runInNewContext(readFileSync('public/amethyst/am01-unicorn.js','utf8'), {
    document:doc, matchMedia:() => preference,
    IntersectionObserver:class { constructor(fn:typeof intersect) {intersect=fn} observe(){} disconnect=disconnect },
    MutationObserver:class { constructor(fn:typeof mutate) {mutate=fn} observe(){} },
  })
  const art = hero.children.find(node => node.className === 'au-art')!
  const video = art?.children.find(node => node.tagName === 'video')!
  const poster = art?.children.find(node => node.tagName === 'img')!
  const controls = hero.children.find(node => node.className === 'au-controls')!
  const motion = controls?.children[0], sound = controls?.children[1]
  return {hero, doc, preference, art, video, poster, controls, motion, sound, disconnect,
    visible:(value:boolean) => intersect([{isIntersecting:value}]),
    still:(value:boolean) => {hero.dataset.heroMotion=value?'off':'on';mutate([{target:hero,attributeName:'data-hero-motion'}])},
    switchSkin:() => {selected=false;mutate()},
  }
}
const settle = async () => {await Promise.resolve();await Promise.resolve()}
describe('AM-01 visitor motion and sound controls', () => {
  it('does not mount or download unicorn media for another skin', () => {
    expect(harness({selected:false}).hero.children).toHaveLength(0)
  })
  it('loads only in view, starts muted, plays once, holds and replays only on request', async () => {
    const h=harness();expect(h.video.hasAttribute('src')).toBe(false)
    h.visible(true);await settle();h.video.dispatchEvent(new Event('playing'))
    expect(h.video).toMatchObject({muted:true,playsInline:true,loop:false,preload:'none'})
    expect(h.art.hasAttribute('data-video')).toBe(true)
    h.video.currentTime=10;h.video.dispatchEvent(new Event('ended'))
    expect(h.video.paused).toBe(true);expect(h.motion.textContent).toBe('Play again')
    const plays=h.video.play.mock.calls.length
    h.visible(false);h.visible(true);await settle()
    expect(h.video.play).toHaveBeenCalledTimes(plays)
    expect(h.hero.getAttribute('data-unicorn-motion')).toBe('paused')
    h.motion.dispatchEvent(new Event('click'));await settle()
    expect(h.video.currentTime).toBe(0);expect(h.video.paused).toBe(false)
  })
  it('requires a gesture for sound, restarts its fade, and mutes without stopping animation', async () => {
    const h=harness();h.visible(true);await settle();h.video.currentTime=8
    expect(h.sound.getAttribute('aria-label')).toBe('Play with sound')
    h.sound.dispatchEvent(new Event('click'));await settle()
    expect(h.video).toMatchObject({muted:false,currentTime:0,paused:false})
    h.sound.dispatchEvent(new Event('click'))
    expect(h.video).toMatchObject({muted:true,paused:false})
  })
  it.each([{reduced:true},{still:true}])('shows a final pose without downloading disabled motion: %j', options => {
    const h=harness(options);h.visible(true)
    expect(h.video.hasAttribute('src')).toBe(false)
    expect(h.poster.getAttribute('src')).toBe('/amethyst/skins/am01-unicorn/hero-poster.webp')
    expect(h.motion.textContent).toBe('Play animation')
  })
  it('pauses motion, ambience and the same audio timeline offscreen and preserves manual pause', async () => {
    const h=harness();h.visible(true);await settle()
    h.visible(false);expect(h.video.paused).toBe(true)
    expect(h.hero.getAttribute('data-unicorn-motion')).toBe('paused')
    h.visible(true);await settle();h.motion.dispatchEvent(new Event('click'))
    const plays=h.video.play.mock.calls.length
    h.doc.hidden=true;h.doc.dispatchEvent(new Event('visibilitychange'))
    h.doc.hidden=false;h.doc.dispatchEvent(new Event('visibilitychange'))
    h.visible(false);h.visible(true);await settle()
    expect(h.video.play).toHaveBeenCalledTimes(plays)
    expect(h.motion.textContent).toBe('Play animation')
  })
  it('handles blocked autoplay with manual play and returns to a final poster on failure', async () => {
    const h=harness();h.video.play.mockRejectedValueOnce(Object.assign(new Error('Blocked'),{name:'NotAllowedError'}))
    h.visible(true);await settle();expect(h.motion.textContent).toBe('Play animation')
    h.visible(false);h.visible(true);expect(h.video.play).toHaveBeenCalledTimes(1)
    h.motion.dispatchEvent(new Event('click'));await settle();h.video.dispatchEvent(new Event('playing'))
    h.video.dispatchEvent(new Event('error'))
    expect(h.video.paused).toBe(true);expect(h.controls.hidden).toBe(true)
    expect(h.art.hasAttribute('data-video')).toBe(false)
    expect(h.poster.getAttribute('src')).toContain('hero-poster.webp')
  })
  it.each(['pause','hidden','offscreen','dispose'] as const)('stops a late play completion after %s', async action => {
    const h=harness();let resolve!:()=>void
    h.video.play.mockImplementationOnce(() => new Promise<void>(done => {resolve=done}))
    h.visible(true)
    if(action==='pause')h.motion.dispatchEvent(new Event('click'))
    if(action==='hidden'){h.doc.hidden=true;h.doc.dispatchEvent(new Event('visibilitychange'))}
    if(action==='offscreen')h.visible(false)
    if(action==='dispose')h.switchSkin()
    h.video.paused=false;resolve();await settle()
    expect(h.video.paused).toBe(true);expect(h.video.play).toHaveBeenCalledTimes(1)
  })
  it('resumes safely after a visibility abort, then cleans up when the skin changes', async () => {
    const h=harness();let reject!:(reason:Error)=>void
    h.video.play.mockImplementationOnce(() => new Promise<void>((_done,fail) => {reject=fail}))
    h.visible(true);h.doc.hidden=true;h.doc.dispatchEvent(new Event('visibilitychange'))
    h.doc.hidden=false;h.doc.dispatchEvent(new Event('visibilitychange'))
    reject(Object.assign(new Error('Interrupted'),{name:'AbortError'}));await settle()
    expect(h.video.play).toHaveBeenCalledTimes(2)
    h.switchSkin();expect(h.hero.children).toHaveLength(0)
    expect(h.video.hasAttribute('src')).toBe(false);expect(h.disconnect).toHaveBeenCalledTimes(1)
    h.video.dispatchEvent(new Event('playing'));h.doc.dispatchEvent(new Event('visibilitychange'))
    expect(h.art.hasAttribute('data-video')).toBe(false)
  })
})
