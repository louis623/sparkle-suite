import { afterEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const source = readFileSync('public/amethyst/live-lineup.js', 'utf8')
const now = Date.parse('2026-09-06T01:30:00Z')
const payload = (age = 60, names = ['Example One']) => ({
  liveQueueState: names.length ? 'live' : 'empty',
  liveQueueLastUpdated: new Date(now - age * 1000).toISOString(),
  liveQueueEntries: names.map((name, index) => ({ name, position: index + 1, highlight: true })),
  liveQueueSummary: 'Synthetic lineup',
})
function runtime(fetch = vi.fn()) {
  const document = { visibilityState: 'visible', addEventListener: vi.fn(), removeEventListener: vi.fn() }
  const window: any = { addEventListener: vi.fn(), removeEventListener: vi.fn() }
  runInNewContext(source, { window, document, fetch, Date, AbortController, setTimeout, clearTimeout })
  return { api: window.SparkleLiveLineup, document, window, fetch }
}
afterEach(() => vi.useRealTimers())
describe('public lineup refresh without reloading or writing', () => {
  it('shows customer numbers and names without repetitive per-person status labels', () => {
    for (const file of ['homepage.jsx', 'join.jsx', 'trade.jsx']) {
      const page = readFileSync(`public/amethyst/${file}`, 'utf8')
      expect(page).not.toContain('<span className="label">{entry.label}</span>')
      expect(page).toContain('<span className="name">{entry.name}</span>')
    }
  })
  it('marks only Brittanys Dance Floor as coming soon across customer pages', () => {
    for (const file of ['homepage.jsx', 'join.jsx', 'trade.jsx']) {
      const page = readFileSync(`public/amethyst/${file}`, 'utf8')
      expect(page).toContain('isBrittDanceFloorComingSoon ? [{ name: "Digital Dance Floor coming soon", isEmpty: true }] : trades.length > 0 ? trades : [EMPTY_TRADE_TICKER_ITEM]')
      expect(page).toContain('isBrittDanceFloorComingSoon ? "Dance Floor · Coming soon" : "Dance Floor"')
    }
  })
  it('accepts fresh empty snapshots, rejects malformed and older responses', () => {
    const { api } = runtime()
    const current = payload()
    expect(api.merge(current, payload(90))).toBe(current)
    expect(api.merge(current, {})).toBe(current)
    expect(api.merge(current, payload(20, [])).liveQueueEntries).toEqual([])
  })
  it('retains delayed names honestly and expires them after two hours', () => {
    const { api } = runtime()
    const retained = api.unavailable(payload(), now)
    expect(retained.liveQueueEntries[0].highlight).toBe(false)
    expect(retained.liveQueueState).toBe('delayed')
    expect(retained.liveQueueSummary).toBe('Live Lineup is updating automatically.')
    expect(retained.liveQueueSummary).not.toContain('I have an open lineup.')
    expect(retained.liveQueueSummary).not.toMatch(/issue|difficult/i)
    const emptyDelayed = api.unavailable(payload(60, []), now)
    expect(emptyDelayed.liveQueueState).toBe('delayed')
    expect(emptyDelayed.liveQueueSummary).toBe('I have an open lineup.')
    const expired = api.unavailable(payload(7201), now)
    expect(expired.liveQueueEntries).toEqual([])
    expect(expired.liveQueueSummary).toBe('Check the calendar for the next show.')
  })
  it('puts the Live Lineup label first in calendar, open, and delayed rows', () => {
    const { api } = runtime()
    const rows = {
      calendar: api.renderEmpty(React, '/shows#events', { liveQueueState: 'offline' }),
      empty: api.renderEmpty(React, null, { liveQueueState: 'empty' }),
      delayed: api.renderEmpty(React, null, { liveQueueState: 'delayed' }),
    }
    for (const html of Object.values(rows).map((row) => renderToStaticMarkup(row))) {
      expect(html).toMatch(/^<section[^>]*>\s*<span class="hp-ticker-label hp-lineup-label">/)
      expect(html).toContain('>Live Lineup<')
      expect(html).not.toContain('hp-trade-preview-head')
    }
    const calendar = renderToStaticMarkup(rows.calendar)
    const empty = renderToStaticMarkup(rows.empty)
    const delayed = renderToStaticMarkup(rows.delayed)
    expect(calendar).toContain('Check the calendar for the next show.')
    expect(calendar).toContain('href="/shows#events"')
    expect(calendar).not.toContain('live-dot')
    const upcoming = renderToStaticMarkup(api.renderEmpty(React, '/shows#events', {
      liveQueueState: 'offline',
      liveQueueNextShow: { title: 'A very long holiday reveal that should not wrap the bar', time: 'Sun, Nov 30, 8:00 PM EST' },
    }))
    expect(upcoming).toContain('class="hp-lineup-next"')
    expect(upcoming).not.toMatch(/hp-lineup-next"[^>]*style=/)
    expect(upcoming.indexOf('Sun, Nov 30, 8:00 PM EST')).toBeLessThan(upcoming.indexOf('A very long holiday reveal'))
    expect(readFileSync('public/amethyst/homepage.css', 'utf8')).toMatch(/\.hp-lineup-next\s*\{[^}]*white-space:\s*nowrap;[^}]*overflow:\s*hidden;[^}]*text-overflow:\s*ellipsis/)
    expect(empty).toContain('I have an open lineup.')
    expect(empty).toContain('class="live-dot"')
    expect(delayed).toContain('I have an open lineup.')
    expect(delayed).not.toContain('live-dot')
    expect(delayed).not.toContain('href=')
  })
  it('backs off failures then returns to five-second polling, and cleans up', async () => {
    vi.useFakeTimers(); vi.setSystemTime(now)
    const fetch = vi.fn().mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue({ ok: true, json: async () => payload(10, []) })
    const { api, document, window } = runtime(fetch)
    const update = vi.fn()
    const stop = api.start({ url: '/api/amethyst/live-lineup?c=test', initial: payload(), onUpdate: update, random: () => 0.5 })
    await vi.advanceTimersByTimeAsync(0)
    expect(update.mock.lastCall?.[0].liveQueueState).toBe('delayed')
    await vi.advanceTimersByTimeAsync(10000)
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(fetch.mock.lastCall?.[1].cache).toBe('no-store')
    expect(fetch.mock.lastCall?.[1].method).toBeUndefined()
    expect(update.mock.lastCall?.[0].liveQueueState).toBe('empty')
    stop()
    await vi.advanceTimersByTimeAsync(60000)
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(document.removeEventListener).toHaveBeenCalledWith('visibilitychange', expect.any(Function))
    expect(window.removeEventListener).toHaveBeenCalledWith('online', expect.any(Function))
    expect(source).not.toMatch(/location\.(reload|assign|replace)|method:\s*['"]POST/)
  })
  it('pauses network requests while the page is hidden', async () => {
    vi.useFakeTimers(); vi.setSystemTime(now)
    const { api, document, fetch } = runtime()
    document.visibilityState = 'hidden'
    const stop = api.start({ url: '/api/amethyst/live-lineup', initial: payload(), onUpdate: vi.fn() })
    await vi.advanceTimersByTimeAsync(60000)
    expect(fetch).not.toHaveBeenCalled()
    stop()
  })
})
