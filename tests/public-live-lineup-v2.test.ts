import { afterEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { buildPublicLiveLineup } from '@/lib/amethyst/public-live-lineup'

const source = readFileSync('public/amethyst/live-lineup.js', 'utf8')
const now = Date.parse('2026-09-09T12:00:00Z')
function payload(revision = 1, names = ['Synthetic One']) {
  return { liveQueueRevision: revision, liveQueueSourceReady: true, liveQueueServerTime: new Date(now).toISOString(),
    liveQueueLastUpdated: new Date(now - 10000).toISOString(), liveQueueAgeSeconds: 10, liveQueueStaleAfterSeconds: 45,
    liveQueueState: names.length ? 'live' : 'empty', liveQueueSummary: 'Synthetic lineup',
    liveQueueEntries: names.map((name, i) => ({ name, position: i + 1, highlight: i === 0 })) }
}
function runtime(fetch = vi.fn()) {
  const listeners: Record<string, Function> = {}
  const document = { visibilityState: 'visible', addEventListener: vi.fn((key, fn) => { listeners[key] = fn }), removeEventListener: vi.fn() }
  const window: any = { addEventListener: vi.fn((key, fn) => { listeners[key] = fn }), removeEventListener: vi.fn() }
  runInNewContext(source, { window, document, fetch, Date, AbortController, setTimeout, clearTimeout })
  return { api: window.SparkleLiveLineup, document, listeners, fetch }
}
afterEach(() => vi.useRealTimers())
describe('server-ordered public lineup', () => {
  it('rejects stale revisions and equal-revision name replacement, accepts heartbeat and explicit newer empty', () => {
    const { api } = runtime(), current = payload(5)
    expect(api.merge(current, payload(4))).toBe(current)
    expect(api.merge(current, payload(5, []))).toBe(current)
    expect(api.merge(current, { ...payload(5), liveQueueAgeSeconds: 11 })).not.toBe(current)
    expect(api.merge(current, payload(6, [])).liveQueueEntries).toEqual([])
  })
  it('does not let legacy responses replace v2 or browser wall-clock skew age v2 entries', () => {
    const { api } = runtime(), current = payload()
    expect(api.merge(current, { ...payload(), liveQueueRevision: undefined })).toBe(current)
    expect(api.unavailable(current, now + 864000000, 20).liveQueueState).toBe('delayed')
    expect(api.unavailable(current, now - 864000000, 3600).liveQueueState).toBe('offline')
  })
  it('rejects malformed payloads and supports 2000 genuine orders without truncation', () => {
    const { api } = runtime(), current = payload()
    expect(api.merge(current, payload(2, Array.from({ length: 2000 }, (_, i) => `Order ${i}`))).liveQueueEntries).toHaveLength(2000)
    expect(api.merge(current, payload(2, Array(2001).fill('Order')))).toBe(current)
    expect(api.merge(current, { ...payload(2), liveQueueEntries: [{ name: 'Wrong', position: -1 }] })).toBe(current)
    expect(api.merge(current, { ...payload(2), liveQueueRevision: 1.5 })).toBe(current)
  })
  it('accepts server-confirmed never-connected state with no invented timestamp', () => {
    const { api } = runtime()
    const offline = { ...payload(0, []), liveQueueState: 'offline', liveQueueSourceReady: false, liveQueueLastUpdated: null, liveQueueAgeSeconds: null }
    expect(api.merge(null, offline)).toBe(offline)
  })
  it('recovers from a future-dated legacy initial snapshot instead of remaining pinned', () => {
    vi.useFakeTimers(); vi.setSystemTime(now)
    const { api } = runtime()
    const legacy = { ...payload(), liveQueueRevision: undefined }
    const poisoned = { ...legacy, liveQueueLastUpdated: new Date(now + 86400000).toISOString() }
    expect(api.merge(poisoned, legacy)).toBe(legacy)
    expect(api.merge(legacy, poisoned)).toBe(legacy)
  })
  it('does not emit a late update after the subscription has been disposed', async () => {
    vi.useFakeTimers(); vi.setSystemTime(now)
    let resolve!: (value: unknown) => void
    const fetch = vi.fn(() => new Promise(r => { resolve = r })), update = vi.fn()
    const { api } = runtime(fetch)
    const stop = api.start({ url: '/api/amethyst/live-lineup', initial: payload(), onUpdate: update })
    stop(); resolve({ ok: true, json: async () => payload(2) })
    await vi.advanceTimersByTimeAsync(60000)
    expect(update).not.toHaveBeenCalled()
    expect(fetch).toHaveBeenCalledTimes(1)
  })
  it('publishes source readiness and revision without exposing writer identity', () => {
    const result = buildPublicLiveLineup({ revision: 8, sourceReady: false, serverTime: new Date(now).toISOString(),
      syncCode: 'PRIVATE', queue: ['Example'], queueLength: 1, currentCustomer: 'Example', onDeckCustomer: null,
      lastUpdated: new Date(now - 10000).toISOString(), ageSeconds: 10, staleAfterSeconds: 45, isFresh: true })
    expect(result.liveQueueState).toBe('delayed')
    expect(result.liveQueueRevision).toBe(8)
    expect(result.liveQueueEntries[0].highlight).toBe(false)
    expect(JSON.stringify(result)).not.toContain('PRIVATE')
  })
  it('polls in five seconds, never overlaps and resumes once after visibility returns', async () => {
    vi.useFakeTimers(); vi.setSystemTime(now)
    let resolve!: (value: unknown) => void
    const fetch = vi.fn().mockImplementationOnce(() => new Promise(r => { resolve = r }))
      .mockResolvedValue({ ok: true, json: async () => payload(2) })
    const { api, document, listeners } = runtime(fetch)
    const stop = api.start({ url: '/api/amethyst/live-lineup', initial: payload(), onUpdate: vi.fn(), random: () => .5 })
    listeners.online(); listeners.visibilitychange()
    expect(fetch).toHaveBeenCalledTimes(1)
    resolve({ ok: true, json: async () => payload() })
    await vi.advanceTimersByTimeAsync(5000)
    expect(fetch).toHaveBeenCalledTimes(2)
    document.visibilityState = 'hidden'; listeners.visibilitychange()
    await vi.advanceTimersByTimeAsync(60000)
    expect(fetch).toHaveBeenCalledTimes(2)
    document.visibilityState = 'visible'; listeners.visibilitychange(); listeners.online()
    await vi.advanceTimersByTimeAsync(0)
    expect(fetch).toHaveBeenCalledTimes(3)
    stop()
  })
  it('wires all targeted pages to the shared runtime and accessible dialogs, with no floating status', () => {
    for (const page of ['homepage', 'join', 'trade']) {
      const jsx = readFileSync(`public/amethyst/${page}.jsx`, 'utf8')
      expect(jsx).toContain('if (!RUNTIME_CONTEXT.targeted || !window.SparkleLiveLineup) return;')
      expect(jsx).toContain('const LIVE_LINEUP_DIALOG_HOOK = window.SparkleLiveLineup?.useDialog || null;')
      expect(jsx).toContain('const dialogRef = useLiveLineupDialog(open, onClose);')
      expect(jsx).not.toContain('window.SparkleLiveLineup.useDialog(React, open, onClose)')
      expect(jsx).toContain('role="dialog" aria-modal="true" aria-labelledby="live-lineup-title"')
      expect(jsx).not.toContain('{t.showLrq && <LiveLineupStatus />}')
      expect(jsx).not.toContain('const previousOverflow = document.body.style.overflow')
      expect(jsx).not.toContain('if (queueOpen) body.classList.add("modal-open")')
      const html = readFileSync(`public/amethyst/${page === 'homepage' ? 'Homepage' : page === 'join' ? 'Join' : 'Trade'}.html`, 'utf8')
      expect(html).toContain('/amethyst/live-lineup.js?v=20260909-lineup-v2')
    }
  })
  it('serves the shared runtime through the explicit public-asset allowlist', async () => {
    const { renderAmethystPublicAssetResponse } = await import('@/lib/amethyst/public-asset-response')
    const response = await renderAmethystPublicAssetResponse(new Request('https://www.yoursparklesuite.com/amethyst/live-lineup.js'), ['live-lineup.js'])
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toContain('text/javascript')
    expect(await response.text()).toContain('root.SparkleLiveLineup =')
    expect((await renderAmethystPublicAssetResponse(new Request('https://www.yoursparklesuite.com/amethyst/not-allowed.js'), ['not-allowed.js'])).status).toBe(404)
  })
})
