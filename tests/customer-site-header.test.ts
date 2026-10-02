import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import vm from 'node:vm'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { build } from 'esbuild'
import { describe, expect, it } from 'vitest'

async function template(page: string, state: string, entries: unknown[] = []) {
  const content = { liveQueuePresentation: 'grouped-v1', liveQueueState: state, liveQueueEntries: entries, liveQueueSummary: 'Waiting for a recent update.', liveQueueLastUpdated: null }
  const source = readFileSync(`public/amethyst/${page}.jsx`, 'utf8')
  const compiled = await build({ stdin: { contents: source + '\nwindow.audit = { Ticker, LiveQueueStrip, LiveLineupContext };', loader: 'jsx', resolveDir: resolve('public/amethyst') }, bundle: true, write: false, format: 'iife', external: ['react'], jsx: 'transform' })
  const window = { location: new URL('http://localhost/'), AMETHYST_RUNTIME_CONTEXT: { targeted: true }, AMETHYST_HOMEPAGE_TEMPLATE_DATA: content, AMETHYST_TRADE_TEMPLATE_DATA: content, AMETHYST_JOIN_TEMPLATE_DATA: content }
  vm.runInNewContext(compiled.outputFiles[0].text, { window, React, ReactDOM: { createRoot: () => ({ render() {} }) }, document: { getElementById: () => ({}) }, URL, URLSearchParams, console, require: () => React })
  const api = (window as unknown as { audit: { Ticker: React.ElementType, LiveQueueStrip: React.ElementType, LiveLineupContext: React.Context<unknown> } }).audit
  return { render: (topText: string) => renderToStaticMarkup(React.createElement(api.LiveLineupContext.Provider, { value: content }, React.createElement(api.Ticker, { topText }), React.createElement(api.LiveQueueStrip, { state, live: state === 'live', onOpen() {} }))) }
}

describe('customer header uses one lineup beneath real announcements', () => {
  for (const page of ['homepage', 'trade', 'join']) {
    for (const state of ['offline', 'empty', 'live', 'delayed']) {
      it(`${page}: ${state} keeps one strip, status and drawer action`, async () => {
        const entries = ['live', 'delayed'].includes(state) ? [{ name: 'Sample Harper', position: 1, token: 'sample-one', remainingOrders: 2 }] : []
        const { render } = await template(page, state, entries)
        const html = render('A real announcement')
        expect(html.match(/<section[^>]*data-lineup-surface="list"/g)).toHaveLength(1)
        expect(html).not.toContain('hp-lineup-ticker')
        expect(html.indexOf('Announcements')).toBeLessThan(html.indexOf('data-lineup-surface="list"'))
        expect(html).toMatch(/<button[^>]*>View (full )?lineup<\/button>/)
        expect(html.includes('data-lineup-empty="true"')).toBe(entries.length === 0)
        if (entries.length) expect(html).toContain('Sample Harper')
      })
    }
    it(`${page}: whitespace-only announcements reserve no row and preserve Dance Floor and lineup`, async () => {
      const { render } = await template(page, 'offline')
      const html = render('  | \n  ')
      expect(html.match(/class="hp-ticker-row/g)).toHaveLength(1)
      expect(html).toContain('Dance Floor')
      expect(html).toContain('View')
      expect(html).toContain('data-lineup-surface="list"')
      expect(html).toContain('hp-ticker-window')
    })
  }
})
