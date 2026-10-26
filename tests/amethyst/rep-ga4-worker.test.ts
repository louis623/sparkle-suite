import { createContext, runInContext } from 'node:vm'
import { beforeEach, expect, it, vi } from 'vitest'
const { bootstrap } = vi.hoisted(() => ({ bootstrap: vi.fn(() => 'window.__workerBootstrap=true;') }))
vi.mock('@qwik.dev/partytown/integration', () => ({ partytownSnippet: bootstrap }))
import { buildRepGa4Snippet } from '@/lib/amethyst/rep-ga4-tag'
import manifest from '@/public/amethyst/analytics-worker/manifest.json'
beforeEach(() => vi.clearAllMocks())

function run(embedded: boolean) {
  const appended: any[] = [], callbacks: Array<() => void> = []
  const state: any = { navigator: { serviceWorker: {} }, document: { addEventListener() {}, createElement: () => ({}), head: { appendChild: (node: unknown) => appended.push(node) } }, sparkleAfterHeroPaint: (fn: () => void) => callbacks.push(fn) }
  state.window = state; state.top = embedded ? {} : state
  const html = buildRepGa4Snippet({ measurementId: 'G-1234TEST', shopHref: 'https://example.com/shop' })
  runInContext(html.match(/<script id="sparkle-rep-ga4">([\s\S]*?)<\/script>/)![1], createContext(state))
  return { state, appended, callbacks, html }
}

it('queues consent and configuration once while the worker owns analytics execution', () => {
  const { state, appended, html } = run(false)
  expect(bootstrap).toHaveBeenCalledWith({ lib: manifest.lib, forward: ['dataLayer.push'] })
  expect(state.__workerBootstrap).toBe(true)
  expect(appended).toEqual([])
  expect(state.dataLayer).toEqual([])
  const worker: any = {}; worker.window = worker
  runInContext(html.match(/<script type="text\/partytown">([\s\S]*?)<\/script>/)![1], createContext(worker))
  expect(Array.from(worker.dataLayer, (args: any) => args[0])).toEqual(['consent', 'js', 'config'])
  expect(worker.dataLayer[0][2].ad_storage).toBe('denied')
  expect(worker.dataLayer[2][1]).toBe('G-1234TEST')
  expect(html).toContain('<script type="text/partytown" src="https://www.googletagmanager.com/gtag/js?id=G-1234TEST"></script>')
})

it('preserves native analytics in embedded contexts without service worker registration', () => {
  const { state, callbacks, appended } = run(true)
  expect(state.__workerBootstrap).toBeUndefined()
  expect(appended).toEqual([])
  callbacks[0]()
  expect(appended).toHaveLength(1)
  expect(appended[0].src).toBe('https://www.googletagmanager.com/gtag/js?id=G-1234TEST')
  expect(appended[0].async).toBe(true)
})
