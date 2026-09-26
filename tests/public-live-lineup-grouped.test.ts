import { afterEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { buildPublicLiveLineup, projectPublicLineup, publicSurnameInitial } from '@/lib/amethyst/public-live-lineup'
import { buildAmethystHomepageBootstrapScript, defaultAmethystHomepageTemplateData } from '@/lib/amethyst/homepage-template-data'

const now = Date.parse('2026-09-26T12:00:00Z')
const row = (id: string, name = 'April', lastName: string | undefined = 'Smith', identityEligible = true) => ({ id, name, lastName, identityEligible })
const project = (entries = [row('p:1'), row('p:2')], events: any[] = [], cursor = 0, scope = 'private-tenant:private-show') => projectPublicLineup({ entries, events, cursor, scope, now })
const event = (cursor = 1, ids = ['p:1', 'p:2']) => ({ cursor, entryId: 'p:1', groupEntryIds: ids, at: new Date(now - 1000).toISOString() })
const snapshot = (presentation = project(), ageSeconds = 1, revision = 1) => ({
  syncCode: 'PRIVATE-CODE', queue: ['April', 'April'], queueLength: 2, currentCustomer: 'April', onDeckCustomer: 'April',
  lastUpdated: new Date(now - ageSeconds * 1000).toISOString(), ageSeconds, staleAfterSeconds: 45, isFresh: ageSeconds < 45,
  sourceReady: true, serverTime: new Date(now).toISOString(), revision, presentation,
})
const payload = (presentation = project(), age = 1, revision = 1) => buildPublicLiveLineup(snapshot(presentation, age, revision), 'grouped-v1')
function runtime(fetch = vi.fn()) {
  const listeners: Record<string, Function> = {}
  const document: any = { visibilityState: 'visible', addEventListener: vi.fn((key, fn) => { listeners[key] = fn }), removeEventListener: vi.fn() }
  const window: any = { addEventListener: vi.fn((key, fn) => { listeners[key] = fn }), removeEventListener: vi.fn() }
  runInNewContext(readFileSync('public/amethyst/live-lineup.js', 'utf8'), { window, document, fetch, Date, AbortController, setTimeout, clearTimeout })
  return { api: window.SparkleLiveLineup, listeners, document }
}
afterEach(() => vi.useRealTimers())

describe('one privacy-safe public display projection', () => {
  it('counts distinct tuples and unresolved orders before collapsing exact adjacent tuples', () => {
    const onlyRepeats = project()
    expect(onlyRepeats.entries.map(e => [e.name, e.remainingOrders])).toEqual([['April', 2]])
    const distinct = project([row('p:1'), row('p:2'), row('p:3', 'April', 'Sanders'), row('p:4', 'April', undefined, false)])
    expect(distinct.entries.map(e => [e.name, e.remainingOrders])).toEqual([['April S', 2], ['April S', 1], ['April', 1]])
    expect(new Set(distinct.entries.map(e => e.token)).size).toBe(3)
  })
  it('missing or ineligible identity stays per-order and does not borrow a prior surname', () => {
    expect(project([row('p:1', 'April', 'Smith', false), row('p:2', 'April', 'Smith', false)]).entries).toHaveLength(2)
    expect(project([row('p:1', 'April', ''), row('p:2', 'April', '')]).entries.map(e => e.name)).toEqual(['April', 'April'])
  })
  it('preserves the one-order April drag fixture and assigns group positions after collapse', () => {
    const a = row('p:1'), b = row('p:2'), beth = row('p:3', 'Beth', 'Jones')
    expect(payload(project([a, b, beth])).liveQueueEntries.map(e => [e.name, e.position, e.remainingOrders])).toEqual([['April', 1, 2], ['Beth', 2, 1]])
    const moved = payload(project([b, beth, a]))
    expect(moved.liveQueueEntries.map(e => [e.name, e.position])).toEqual([['April', 1], ['Beth', 2], ['April', 3]])
    expect(moved.liveQueueGroupCount).toBe(3)
    expect(moved.liveQueueOrderCount).toBe(3)
    expect(moved.liveQueueCurrent).toBe(moved.liveQueueEntries[0].token)
    expect(moved.liveQueueOnDeck).toBe(moved.liveQueueEntries[1].token)
  })
  it('uses opaque show-scoped group anchors independent of position, count, labels and surname hashes', () => {
    const a = project([row('p:1'), row('p:2')])
    const b = project([row('p:3', 'Beth', 'Jones'), row('p:1')])
    expect(a.entries[0].token).toBe(b.entries[1].token)
    expect(project([row('p:1', 'Other', 'Changed')]).entries[0].token).toBe(a.entries[0].token)
    expect(project([row('p:1')], [], 0, 'other-show').entries[0].token).not.toBe(a.entries[0].token)
    expect(JSON.stringify(a)).not.toMatch(/Smith|p:1|p:2|private-tenant|private-show/)
  })
  it('targets only the surviving original group and suppresses split ambiguity', () => {
    const rows = [row('p:2'), row('p:b', 'Beth', 'Jones'), row('p:3')]
    const partial = project(rows, [event()], 1)
    expect(partial.events[0].target).toBe(partial.entries[0].token)
    expect(partial.events[0].target).not.toBe(partial.entries[2].token)
    const split = project(rows, [event(1, ['p:1', 'p:2', 'p:3'])], 1)
    expect(split.events).toEqual([])
    expect(split.cursor).toBe(1)
    const merged = project([row('p:2'), row('p:3')], [event(1, ['p:1', 'p:2', 'p:3'])], 1)
    expect(merged.events[0].target).toBe(merged.entries[0].token)
  })
  it('falls back to current and then container when the departing group has no survivor', () => {
    const next = project([row('p:3', 'Beth', 'Jones')], [event()], 1)
    expect(next.events[0].target).toBe(next.entries[0].token)
    expect(project([], [event()], 1).events[0].target).toBeNull()
  })
  it('bounds event output and excludes expired evidence while advancing the cursor', () => {
    const many = Array.from({ length: 100 }, (_, i) => event(i + 1))
    const result = project([row('p:2')], many, 100)
    expect(result.events).toHaveLength(64)
    expect(result.cursor).toBe(100)
    expect(project([], [{ ...event(), at: new Date(now - 45000).toISOString() }], 1).events).toEqual([])
  })
  it('uses a proper bounded Unicode initial, never a complete one-grapheme surname', () => {
    for (const name of ['S', '李', '\u{10400}', 'A\u0301']) expect(publicSurnameInitial(name, 'April')).toBeNull()
    expect(publicSurnameInitial('Smith', 'April')).toBe('S')
    expect(publicSurnameInitial('\u{10400}son', 'April')).toBe('\u{10400}')
    expect(publicSurnameInitial('Q\u0301son', 'April')).toBe('Q\u0301')
    expect(publicSurnameInitial('Q' + '\u0301'.repeat(10) + 'son', 'April')).toBeNull()
    expect(publicSurnameInitial('Q' + '\u0301'.repeat(7) + 'son', 'A'.repeat(100))).toBeNull()
  })
  it('keeps legacy first-name per-order output and makes new presentation explicit', () => {
    const value = snapshot()
    expect(buildPublicLiveLineup(value).liveQueueEntries).toHaveLength(2)
    expect(buildPublicLiveLineup(value).liveQueuePresentation).toBeUndefined()
    expect(payload().liveQueueEntries).toHaveLength(1)
  })
  it('serializes only safe output into HTML bootstrap and expires retained names honestly', () => {
    const result = payload(project([row('private-order-1'), row('private-order-2'), row('p:3', 'April', 'Stevens')]))
    const html = buildAmethystHomepageBootstrapScript({ ...defaultAmethystHomepageTemplateData, ...result })
    expect(html).not.toMatch(/Smith|Stevens|private-order|PRIVATE-CODE|lastName|identityEligible|groupEntryIds/)
    expect(payload(project(), 3601).liveQueueState).toBe('offline')
    expect(payload(project(), 3601).liveQueueEntries).toEqual([])
    expect(payload(project(), 45).liveQueueState).toBe('delayed')
  })
})

describe('accepted reveal consumption and conservative client evidence', () => {
  it('never infers effects from hydration, heartbeat, reorder, reversal or already-checked observations', () => {
    const { api } = runtime(), initial = payload(), revealed = payload(project([row('p:2')], [event()], 1), 1, 2)
    expect(api.revealUpdate(initial, revealed, true).liveQueueFlare).toBeNull()
    expect(api.revealUpdate(initial, payload(project(), 1, 2), false).liveQueueFlare).toBeNull()
    expect(api.revealUpdate(initial, payload(project([row('p:2'), row('p:1')]), 1, 2), false).liveQueueFlare).toBeNull()
    const effect = api.revealUpdate(initial, revealed, false)
    expect(effect.liveQueueFlare.cursor).toBe(1)
    expect(api.revealUpdate(effect, revealed, false).liveQueueFlare).toBeNull()
    const reversed = payload(project([row('p:1'), row('p:2')], [], 1), 1, 3)
    expect(api.revealUpdate(initial, reversed, false).liveQueueFlare).toBeNull()
    expect(api.revealUpdate(reversed, revealed, false).liveQueueFlare).toBeNull()
  })
  it('coalesces a burst and does not replay suppressed cursor values', () => {
    const { api } = runtime(), initial = payload()
    const burst = payload(project([row('p:2')], [event(1), event(2), event(3)], 3), 1, 2)
    expect(api.revealUpdate(initial, burst, false).liveQueueFlare.cursor).toBe(3)
    const suppressed = payload(project([row('p:2')], [], 3), 1, 2)
    expect(api.revealUpdate(suppressed, burst, false).liveQueueFlare).toBeNull()
  })
  it('subtracts total RTT from source and event budgets regardless of the browser clock', () => {
    const { api } = runtime(), value = payload(project([row('p:2')], [event()], 1), 40, 2)
    const expired = api.afterTransit(value, 6)
    expect(expired.liveQueueAgeSeconds).toBe(46)
    expect(expired.liveQueueEvents).toEqual([])
    expect(api.afterTransit({ ...value, liveQueueAgeSeconds: 1 }, 6).liveQueueEvents[0].ageSeconds).toBe(7)
    expect(expired.liveQueueState).toBe('delayed')
    expect(expired.liveQueueEntries[0].highlight).toBe(false)
    expect(api.unavailable(expired, now - 864000000, 1).liveQueueState).toBe('delayed')
    expect(api.revealUpdate(payload(), expired, false).liveQueueFlare).toBeNull()
  })
  it('rejects capability mixing, cursor rollback and same-revision count/name changes', () => {
    const { api } = runtime(), current = payload(project([row('p:2')], [], 3), 1, 4)
    expect(api.merge(current, buildPublicLiveLineup(snapshot(), 'legacy'))).toBe(current)
    expect(api.merge(current, payload(project([row('p:2')], [], 2), 1, 5))).toBe(current)
    expect(api.merge(current, payload(project([row('p:2'), row('p:3')], [], 3), 1, 4))).toBe(current)
  })
  it('makes returning data after retention expiry a baseline', () => {
    const { api } = runtime(), value = payload(), expired = api.unavailable(value, now, 3601)
    const returned = payload(project([row('p:2')], [event()], 1), 1, 2)
    expect(expired.liveQueueState).toBe('offline')
    expect(expired.liveQueueOrderCount).toBe(0)
    expect(expired.liveQueueCurrent).toBeNull()
    expect(api.revealUpdate(expired, returned, false).liveQueueFlare).toBeNull()
    expect(api.initialState(value).liveQueueEntries[0].highlight).toBe(false)
  })
  it('pins polling capability to the document and baselines the first accepted response', async () => {
    vi.useFakeTimers(); vi.setSystemTime(now)
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => payload(project([row('p:2')], [event()], 1), 1, 2) })
    const { api } = runtime(fetch), update = vi.fn()
    const stop = api.start({ url: '/api/amethyst/live-lineup?c=test&lineupPresentation=legacy', initial: payload(), onUpdate: update })
    await vi.advanceTimersByTimeAsync(0)
    expect(fetch.mock.calls[0][0]).toBe('/api/amethyst/live-lineup?c=test&lineupPresentation=grouped-v1')
    expect(update.mock.lastCall?.[0].liveQueueFlare).toBeNull()
    stop()
  })
  it('locks highlighting immediately on hide/resume and does not animate hidden reveals', async () => {
    vi.useFakeTimers(); vi.setSystemTime(now)
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => payload() }), update = vi.fn()
    const { api, document, listeners } = runtime(fetch)
    const stop = api.start({ url: '/api/amethyst/live-lineup', initial: payload(), onUpdate: update })
    await vi.advanceTimersByTimeAsync(0)
    document.visibilityState = 'hidden'; listeners.visibilitychange()
    expect(update.mock.lastCall?.[0].liveQueueEntries[0].highlight).toBe(false)
    fetch.mockResolvedValue({ ok: true, json: async () => payload(project([row('p:2')], [event()], 1), 1, 2) })
    document.visibilityState = 'visible'; listeners.visibilitychange()
    expect(update.mock.lastCall?.[0].liveQueueState).toBe('delayed')
    await vi.advanceTimersByTimeAsync(0)
    expect(update.mock.lastCall?.[0].liveQueueFlare).toBeNull()
    stop()
  })
  it('ages received source evidence during JSON download and expires without a network response', async () => {
    vi.useFakeTimers(); vi.setSystemTime(now)
    let monotonic = 0
    const fetch = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => { monotonic = 6000; return payload(project(), 40) } }).mockImplementation(() => new Promise(() => {}))
    const { api } = runtime(fetch), update = vi.fn()
    const stop = api.start({ url: '/api/amethyst/live-lineup', initial: payload(), onUpdate: update, monotonicNow: () => monotonic })
    await vi.advanceTimersByTimeAsync(0)
    expect(update.mock.lastCall?.[0].liveQueueState).toBe('delayed')
    expect(update.mock.lastCall?.[0].liveQueueAgeSeconds).toBe(46)
    monotonic = 3606001
    await vi.advanceTimersByTimeAsync(3600000)
    expect(update.mock.lastCall?.[0].liveQueueState).toBe('offline')
    stop()
  })
})

it('paints one surviving target on list and ticker, leaving repeated ticker clones silent', () => {
  vi.useFakeTimers()
  const { api, document } = runtime()
  const target = 'opaque-safe-token'
  const node = (clone = false) => ({ dataset: { lineupToken: target, lineupClone: clone ? 'true' : undefined }, setAttribute: vi.fn(), removeAttribute: vi.fn() })
  const list = node(), ticker = node(), clone = node(true), hiddenStrip = node()
  const container = (children: any[], modal = false) => ({ getClientRects: () => [1], closest: () => modal ? {} : null, querySelectorAll: () => children, setAttribute: vi.fn(), removeAttribute: vi.fn() })
  const strip = container([hiddenStrip]), modal = container([list], true), tickerContainer = container([ticker, clone])
  document.querySelectorAll = vi.fn((selector: string) => selector.includes('"list"') ? [strip, modal] : [tickerContainer])
  const ref = { current: null }, React = { useRef: () => ref, useEffect: (effect: Function) => effect() }
  const state = { liveQueueFlare: { scope: 'show-token', cursor: 1, target } }
  api.useRevealFlare(React, state)
  api.useRevealFlare(React, state)
  expect(list.setAttribute).toHaveBeenCalledTimes(1)
  expect(ticker.setAttribute).toHaveBeenCalledTimes(1)
  expect(clone.setAttribute).not.toHaveBeenCalled()
  expect(hiddenStrip.setAttribute).not.toHaveBeenCalled()
  vi.advanceTimersByTime(1000)
  expect(list.removeAttribute).toHaveBeenCalledTimes(1)
})

it('new HTML pins template and runtime together, with privacy-safe counts and decorative sparkles', () => {
  for (const page of ['homepage', 'join', 'trade']) {
    const htmlName = page === 'homepage' ? 'Homepage' : page === 'join' ? 'Join' : 'Trade'
    const html = readFileSync(`public/amethyst/${htmlName}.html`, 'utf8')
    expect(html).toContain('data-lineup-presentation="grouped-v1"')
    expect(html).toContain('live-lineup.js?v=20260926-lineup-grouped-v1')
    const jsx = readFileSync(`public/amethyst/${page}.jsx`, 'utf8')
    expect(jsx).toContain('data-lineup-token={entry.token}')
    expect(jsx).toContain('key={entry.token || entry.position}')
    expect(jsx).toContain('hp-lineup-sparkle" aria-hidden="true"')
    expect(jsx).toContain('data-lineup-clone={index >= entries.length ? "true" : undefined}')
    expect(jsx).toContain('hp-ticker-track" data-ticker-pps="32" aria-hidden="true"')
    expect(jsx).not.toMatch(/entry\.lastName|entry\.birthday|entry\.preferences|entry\.groupEntryIds/)
  }
  expect(readFileSync('public/amethyst/homepage.css', 'utf8')).toContain('@media (prefers-reduced-motion: reduce)')
})

it('publishes a valid waiting baseline during new-show bootstrap without exposing a prior lineup', () => {
  const { api } = runtime()
  const initial = payload()
  const bootstrapping = buildPublicLiveLineup({ ...snapshot(undefined, 1, 2), queue: [], presentation: undefined,
    lastUpdated: null, isFresh: false, sourceReady: false }, 'grouped-v1')
  expect(bootstrapping.liveQueueState).toBe('offline')
  expect(api.merge(initial, bootstrapping)).toEqual(bootstrapping)
})

it('template selection ignores page query capability unless the document explicitly opts in', () => {
  for (const optedIn of [false, true]) {
    const write = vi.fn()
    runInNewContext(readFileSync('public/amethyst/template-loader.js', 'utf8'), {
      URL, URLSearchParams,
      window: { location: { origin: 'https://synthetic.test', search: '?c=tenant&lineupPresentation=grouped-v1' } },
      document: { write, currentScript: { getAttribute: (name: string) => name === 'data-template-src' ? '/api/amethyst/homepage-template' : optedIn ? 'grouped-v1' : null } },
    })
    expect(write.mock.calls[0][0].includes('lineupPresentation=grouped-v1')).toBe(optedIn)
    expect(write.mock.calls[0][0]).toContain('c=tenant')
  }
})
