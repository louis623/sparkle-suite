import { expect, it } from 'vitest'
import { runInNewContext } from 'node:vm'
import { createRequire } from 'node:module'
const { heroReadiness } = createRequire(import.meta.url)('../scripts/lib/ssr-hero-readiness.cjs')

function fixture(video?: object, background = 'none') {
  const plate = { parentElement: null, getBoundingClientRect: () => ({ width: 390, height: 300 }) }
  const hero = { ...plate, querySelectorAll: (s: string) => s === 'video' ? (video ? [{ ...plate, ...video }] : []) : s === '*' ? [plate] : [] }
  const window = {}
  const frames: (() => void)[] = []
  const env = { document: { documentElement: {}, querySelector: () => hero }, window, URL, location: { href: 'https://baseline.test/milehighfizz' },
    getComputedStyle: (el: object) => ({ display: 'block', visibility: 'visible', opacity: '0', backgroundImage: el === plate ? background : 'none' }),
    matchMedia: () => ({ matches: false }), performance: { getEntriesByName: () => [] as { responseEnd: number, responseStatus?: number }[] },
    requestAnimationFrame: (fn: () => void) => frames.push(fn), Image: class { constructor() { throw new Error('Readiness must not fetch another image') } } }
  return { run: () => runInNewContext(`(${heroReadiness.toString()})()`, env), window, env, frames }
}

it('waits for opacity-zero legacy videos until their first frame and autoplay are real', () => {
  const pending = fixture({ currentSrc: '/hero.mp4', dataset: {}, readyState: 0, paused: false, currentTime: 0, getVideoPlaybackQuality: () => ({ totalVideoFrames: 0 }) }).run()
  expect(pending.ready).toBe(false)
  expect(pending.reasons[0]).toContain('video first frame pending')
  const settled = fixture({ currentSrc: '/hero.mp4', dataset: {}, readyState: 4, paused: false, currentTime: 1, getVideoPlaybackQuality: () => ({ totalVideoFrames: 24 }) }).run()
  expect(settled.ready).toBe(true)
  // Legacy Amethyst is a one-shot reference animation. Its completed final
  // frame is settled; report its lack of looping separately from paint timing.
  const ended = fixture({ currentSrc: '/hero.mp4', dataset: {}, readyState: 4, paused: true, ended: true, currentTime: 8, getVideoPlaybackQuality: () => ({ totalVideoFrames: 192 }) }).run()
  expect(ended.ready).toBe(true)
})

it('discovers legacy descendant CSS backgrounds without SSR attributes', () => {
  const f = fixture(undefined, 'url("/legacy-hero.png")')
  const pending = f.run()
  expect(pending.ready).toBe(false)
  expect(pending.backgrounds[0].url).toBe('https://baseline.test/legacy-hero.png')
  expect(pending.reasons).toContain('background pending: https://baseline.test/legacy-hero.png')
  f.env.performance.getEntriesByName = () => [{ responseEnd: 20, responseStatus: 200 }]
  expect(f.run().ready).toBe(false)
  f.frames.shift()!(); f.frames.shift()!()
  expect(f.run().ready).toBe(true)
  const set = fixture(undefined, 'image-set(url("/hero.avif") type("image/avif"), url("/hero.webp") type("image/webp"))')
  set.env.performance.getEntriesByName = (url?: string) => url?.endsWith('.avif') ? [{ responseEnd: 20, responseStatus: 200 }] : []
  const selected = set.run()
  expect(selected.backgrounds.every((b: { url: string }) => b.url.endsWith('.avif'))).toBe(true)
  set.frames.shift()!(); set.frames.shift()!()
  expect(set.run().ready).toBe(true)
})
