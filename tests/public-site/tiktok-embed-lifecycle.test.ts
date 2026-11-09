import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { smokeReviewSelection, homepageSmokeReview } from '@/lib/amethyst/homepage-smoke-review'

const paths = ['public/amethyst/homepage.jsx', 'lib/amethyst/v2/homepage.jsx', 'lib/amethyst/legacy/assets/homepage.jsx']
const sources = paths.map(path => readFileSync(path, 'utf8'))
function environment(source: string) {
  type Entry = { isIntersecting: boolean; intersectionRatio: number }
  const intersections = new Map<object, (entries: Entry[]) => void>()
  const resizes = new Map<object, () => void>()
  const listeners = new Map<string, Set<(event?: unknown) => void>>()
  const addEventListener = (name: string, fn: (event?: unknown) => void) => {
    if (!listeners.has(name)) listeners.set(name, new Set())
    listeners.get(name)!.add(fn)
  }
  const removeEventListener = (name: string, fn: (event?: unknown) => void) => listeners.get(name)?.delete(fn)
  const window = { innerWidth: 344, innerHeight: 500, setTimeout, clearTimeout, addEventListener, removeEventListener }
  const createElement = vi.fn(() => {
    const events = new Map<string, () => void>()
    return { src: '', className: '', title: '', loading: '', allow: '', allowFullscreen: false,
      contentWindow: { postMessage: vi.fn() }, remove: vi.fn(),
      addEventListener: (name: string, fn: () => void) => events.set(name, fn),
      removeEventListener: (name: string) => events.delete(name),
      emit: (name: string) => events.get(name)?.() }
  })
  type Frame = ReturnType<typeof createElement>
  const document = { visibilityState: 'visible', addEventListener, removeEventListener, createElement }
  const disconnect = vi.fn()
  const start = runInNewContext('(() => { function connectTikTokPlayer(' +
    source.split('function connectTikTokPlayer(')[1].split('\nfunction TikTokEmbed(')[0] + '\nreturn connectTikTokPlayer; })()', {
    window, document,
    IntersectionObserver: class {
      target: object | undefined
      constructor(private cb: (entries: Entry[]) => void) {}
      observe(target: object) { this.target = target; intersections.set(target, this.cb) }
      disconnect() { if (this.target) intersections.delete(this.target); disconnect() }
    },
    ResizeObserver: class {
      target: object | undefined
      constructor(private cb: () => void) {}
      observe(target: object) { this.target = target; resizes.set(target, this.cb) }
      disconnect() { if (this.target) resizes.delete(this.target); disconnect() }
    },
  }) as (host: object, muted: () => boolean) => () => void
  const emit = (name: string, event?: unknown) => listeners.get(name)?.forEach(fn => fn(event))
  const mount = () => {
    const box = { width: 294, height: 523, top: 100, left: 24, right: 318, bottom: 623 }
    const history: Frame[] = []
    const host = { dataset: { src: 'https://www.tiktok.com/player/v1/7476510653268806958', title: 'Test TikTok' },
      // DOMRect measurements are snapshots, including when width changes later.
      getBoundingClientRect: () => ({ ...box }), appendChild: (frame: Frame) => history.push(frame) }
    const emptyPostMessage = vi.fn()
    let muted = true
    const cleanup = start(host, () => muted)
    const message = (type = 'onPlayerReady', origin = 'https://www.tiktok.com', source: object = history[0]?.contentWindow) => emit('message', {
      origin, source, data: { type, 'x-tiktok-player': true },
    })
    return { box, window, document, host, history, cleanup, emit, message, disconnect,
      get frame() { return history[0] },
      get postMessage() { return history[0]?.contentWindow.postMessage || emptyPostMessage },
      get navigations() { return history.map(frame => frame.src) },
      intersect: (visible: boolean, ratio = 0.2) => intersections.get(host)?.([{ isIntersecting: visible, intersectionRatio: ratio }]),
      resize: () => resizes.get(host)?.(), unmute: () => { muted = false } }
  }
  return { mount, createElement }
}
function mount(source: string) { return environment(source).mount() }
beforeEach(() => vi.useFakeTimers())
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs() })
for (const [index, path] of paths.entries()) describe(`TikTok embed lifecycle: ${path}`, () => {
  it('delays navigation until visible with settled nonzero dimensions and waits for readiness', () => {
    const components = sources.map(source => source.split('function connectTikTokPlayer(')[1].split('\nfunction CustomerVideoEmbed(')[0])
    expect(components[0]).toBe(components[1]); expect(components[1]).toBe(components[2])
    expect(components[index]).toContain('data-src={`https://www.tiktok.com/player/v1/${videoId}')
    expect(components[index].split('function TikTokEmbed(')[1]).not.toContain('<iframe')
    expect(components[index]).not.toContain('key=')
    const env = environment(sources[index]), m = env.mount()
    m.resize(); vi.advanceTimersByTime(200)
    expect(env.createElement).not.toHaveBeenCalled()
    m.intersect(true, 0.2); vi.advanceTimersByTime(119)
    expect(env.createElement).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(env.createElement).toHaveBeenCalledTimes(1); expect(env.createElement).toHaveBeenCalledWith('iframe')
    expect(m.navigations).toHaveLength(1)
    expect(m.postMessage).not.toHaveBeenCalled()
    m.frame.emit('load'); expect(m.postMessage).not.toHaveBeenCalled()
    m.message()
    expect(m.postMessage.mock.calls.map(call => call[0].type)).toEqual(['mute', 'play'])
  })
  it('waits through changing layout and zero width without assuming a minimum provider width', () => {
    const m = mount(sources[index]); m.box.width = 0; m.intersect(true)
    vi.advanceTimersByTime(200); expect(m.navigations).toHaveLength(0)
    m.box.width = 294; m.resize(); vi.advanceTimersByTime(60)
    m.box.width = 320; vi.advanceTimersByTime(60)
    expect(m.navigations).toHaveLength(0)
    vi.advanceTimersByTime(120); expect(m.navigations).toHaveLength(1)
  })
  it('initializes visible cards independently while each waits for its own readiness', () => {
    const env = environment(sources[index]), m = env.mount(), second = env.mount(), third = env.mount()
    m.intersect(true, 0.1); second.intersect(true); third.intersect(true); vi.advanceTimersByTime(120)
    // The first player remains silent: no load, ready, error, or timeout releases another.
    expect(env.createElement).toHaveBeenCalledTimes(3)
    expect(second.navigations).toHaveLength(1); expect(third.navigations).toHaveLength(1)
    expect(m.postMessage).not.toHaveBeenCalled(); expect(second.postMessage).not.toHaveBeenCalled()
    second.frame.emit('load'); second.message('onPlayerReady', 'https://other.example')
    second.message('onPlayerReady', 'https://www.tiktok.com', {})
    expect(second.postMessage).not.toHaveBeenCalled()
    second.message(); second.message()
    expect(second.postMessage.mock.calls.map(call => call[0].type)).toEqual(['mute', 'play'])
    expect(m.postMessage).not.toHaveBeenCalled(); expect(third.postMessage).not.toHaveBeenCalled()
    third.message('onPlayerError'); third.message('onError')
    expect(env.createElement).toHaveBeenCalledTimes(3)
    expect(third.postMessage).not.toHaveBeenCalled()
  })
  it('pauses offscreen and resumes after fold without replacing the iframe or resetting sound', () => {
    const m = mount(sources[index]); m.intersect(true); vi.advanceTimersByTime(120); m.message(); m.unmute()
    const original = m.frame
    m.intersect(false)
    expect(m.postMessage.mock.lastCall?.[0].type).toBe('pause')
    m.window.innerWidth = 880; m.box.width = 348; m.intersect(true); m.resize(); m.emit('resize'); m.emit('orientationchange'); m.emit('pageshow')
    vi.advanceTimersByTime(500)
    expect(m.frame).toBe(original); expect(m.navigations).toHaveLength(1)
    expect(m.postMessage.mock.calls.map(call => call[0].type)).toEqual(['mute', 'play', 'pause', 'unMute', 'play'])
  })
  it('does not start a player that reports readiness after scrolling away or hiding the page', () => {
    const env = environment(sources[index]), m = env.mount(), waiting = env.mount()
    m.intersect(true); waiting.intersect(true); vi.advanceTimersByTime(119)
    waiting.intersect(false); vi.advanceTimersByTime(1)
    m.intersect(false); m.message()
    expect(m.postMessage).not.toHaveBeenCalled(); expect(waiting.navigations).toHaveLength(0)
    m.intersect(true); m.document.visibilityState = 'hidden'; m.emit('visibilitychange')
    expect(m.postMessage.mock.lastCall?.[0].type).toBe('pause')
    m.document.visibilityState = 'visible'; m.emit('visibilitychange')
    expect(m.postMessage.mock.lastCall?.[0].type).toBe('play')
    waiting.intersect(true); vi.advanceTimersByTime(120); expect(waiting.navigations).toHaveLength(1)
  })
  it('cleans pending navigation, observers, and listeners on unmount or video change', () => {
    const env = environment(sources[index]), m = env.mount()
    m.intersect(true); m.cleanup(); vi.advanceTimersByTime(500)
    m.resize(); m.emit('resize'); m.message()
    expect(m.navigations).toHaveLength(0); expect(m.postMessage).not.toHaveBeenCalled()
    expect(m.disconnect).toHaveBeenCalledTimes(2)
    const active = env.mount(), pending = env.mount(), tail = env.mount()
    active.intersect(true); pending.intersect(true); tail.intersect(true); vi.advanceTimersByTime(119)
    pending.cleanup(); vi.advanceTimersByTime(1); active.cleanup()
    expect(active.frame.remove).toHaveBeenCalledOnce(); expect(pending.navigations).toHaveLength(0)
    expect(tail.navigations).toHaveLength(1)
    tail.frame.emit('error'); tail.message('onError')
    expect(env.createElement).toHaveBeenCalledTimes(2)
  })
})
it('TikTok embed lifecycle keeps the same-video review fixture disabled outside the approved Smoke preview', () => {
  const url = new URL('https://smoke.example/?ssrReviewTheme=amethyst&ssrReviewLayout=britt_with_bling&ssrReviewTikTok=same-videos')
  vi.stubEnv('VERCEL_ENV', 'preview'); vi.stubEnv('VERCEL_PROJECT_ID', 'prj_VTY0rpz2O3VBJqJv69iBz8tzLexQ')
  vi.stubEnv('NEXT_PUBLIC_SPARKLE_ENVIRONMENT', 'smoke'); vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://pukemqiwlyqmyytxkdmo.supabase.co')
  expect(smokeReviewSelection(url, 'dudesfizzfest')?.tiktok).toBe('same-videos')
  expect(smokeReviewSelection(url, 'brittwithbling')).toBeNull()
  vi.stubEnv('VERCEL_ENV', 'production')
  expect(smokeReviewSelection(url, 'dudesfizzfest')).toBeNull()
  const untouched = {} as Parameters<typeof homepageSmokeReview>[0]
  expect(homepageSmokeReview(untouched, url, 'dudesfizzfest')).toBe(untouched)
  vi.stubEnv('VERCEL_ENV', 'preview'); vi.stubEnv('NEXT_PUBLIC_SPARKLE_ENVIRONMENT', 'live')
  expect(smokeReviewSelection(url, 'dudesfizzfest')).toBeNull()
})
