import { readFileSync } from 'node:fs'
import { createContext, runInContext } from 'node:vm'
import { expect, it } from 'vitest'
import { homepageRuntimeLoader } from '@/lib/amethyst/homepage-runtime-loader'

it('preloads controllers but cannot execute them before the hydration commit', () => {
  const appended: any[] = []
  const window = Object.assign(new EventTarget(), { SPARKLE_FIRST_PAINT: {} as object | null, sparkleAfterHomepageStyles: (fn: () => void) => fn() })
  const urls = ['https://example.com/react.js', 'https://example.com/react-dom.js', '/amethyst/compiled/homepage.js?v=hash', '/amethyst/halloween-pumpkin-witch.js', '/amethyst/thanksgiving-motion.js']
  const sources = urls.map(src => ({ attributes: [{ name: 'data-runtime-src', value: src }, { name: 'nonce', value: 'unit-nonce' }], getAttribute: () => src }))
  const document = { querySelectorAll: () => sources, head: { appendChild: (node: any) => appended.push(node) }, createElement: (tag: string) => ({ tag, attrs: {} as Record<string, string>, setAttribute(name: string, value: string) { this.attrs[name] = value } }) }
  runInContext(homepageRuntimeLoader, createContext({ window, document, Event }))
  expect(appended.filter(n => n.tag === 'script').map(n => n.src)).toEqual(urls.slice(0, 3))
  expect(appended.filter(n => n.tag === 'link').map(n => [n.rel, n.as, n.href])).toEqual(urls.slice(3).map(src => ['preload', 'script', src]))
  window.SPARKLE_FIRST_PAINT = null
  window.dispatchEvent(new Event('sparkle:homepage-hydrated'))
  window.dispatchEvent(new Event('sparkle:homepage-hydrated'))
  expect(appended.filter(n => n.tag === 'script').map(n => n.src)).toEqual(urls)
  expect(appended.filter(n => n.tag === 'script').every(n => n.async === false && n.attrs.nonce === 'unit-nonce')).toBe(true)
})

it('reuses expensive date formatters without changing event timezone dates', () => {
  let constructions = 0
  function CountingDateTimeFormat(locale: string, options: Intl.DateTimeFormatOptions) { constructions++; return new Intl.DateTimeFormat(locale, options) }
  const source = readFileSync('public/amethyst/homepage.jsx', 'utf8').split('// Read tweaks panel components')[0]
  const window = { SPARKLE_FIRST_PAINT: { locale: 'en-US', timeZone: 'UTC' } }
  const context = createContext({ React: {}, window, Intl: { DateTimeFormat: CountingDateTimeFormat } })
  runInContext(source, context)
  const labels = runInContext(`Array.from({length:100},()=>homepageDateLabel('2026-10-25T01:00:00Z',{timeZone:'America/New_York',weekday:'short',month:'short',day:'numeric'}))`, context)
  expect(new Set(labels)).toEqual(new Set(['Sat, Oct 24']))
  expect(constructions).toBe(1)
  expect(runInContext(`Array.from({length:100},()=>homepageEventTimeZone('Not/AZone'))`, context)).toEqual(Array(100).fill('America/New_York'))
  expect(constructions).toBe(2)
  runInContext('window.SPARKLE_FIRST_PAINT=null', context)
  expect(runInContext(`homepageDateLabel('2026-10-25T01:00:00Z',{timeZone:'America/New_York',weekday:'short',month:'short',day:'numeric'})`, context)).toBe('Sat, Oct 24')
  expect(constructions).toBe(2)
})

it('yields React hydration and publishes its commit before controllers run', () => {
  const source = readFileSync('public/amethyst/homepage.jsx', 'utf8')
  expect(source).not.toContain('ReactDOM.flushSync(')
  expect(source).toContain('ReactDOM.hydrateRoot(homepageRoot, <App />)')
  expect(source).toContain('window.dispatchEvent(new Event("sparkle:homepage-hydrated"))')
  expect(source.match(/<React.Suspense fallback=\{null\}>/g)).toHaveLength(4)
  expect(source).toContain('onUpdate: value => React.startTransition(() => setLineup(value))')
})
