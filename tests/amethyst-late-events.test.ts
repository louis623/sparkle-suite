import { expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createRequire } from 'node:module'
import { createContext, Script } from 'node:vm'
import { buildSync } from 'esbuild'
import { buildAmethystHomepageBootstrapScript, defaultAmethystHomepageTemplateData as homepage } from '@/lib/amethyst/homepage-template-data'

// Exercise the same production entry with test-only access to its private
// event functions. Bundling shared scenes now correctly keeps these out of
// the public global scope; the assertions below still use one live module.
const evaluatedPage = buildSync({
  stdin: { contents: readFileSync('lib/amethyst/v2/homepage.jsx', 'utf8') +
    '\nglobalThis.Events=Events;globalThis.homepageEventsView=homepageEventsView;globalThis.HOMEPAGE_EVENT_PAYLOAD=HOMEPAGE_EVENT_PAYLOAD;',
    resolveDir: join(process.cwd(), 'lib/amethyst/v2'), loader: 'jsx' },
  bundle: true, platform: 'browser', format: 'iife', write: false,
  jsx: 'transform', jsxFactory: 'React.createElement', jsxFragment: 'React.Fragment',
  tsconfigRaw: {}, define: { 'process.env.NODE_ENV': '"production"' },
}).outputFiles[0].text

// Keep one evaluated production module across pending -> loaded, so a sticky
// module-level reservation or cap cannot be hidden by constructing a fresh page.
function pendingPage() {
  const require = createRequire(join(process.cwd(), 'package.json'))
  const { React, renderToString } = require('./lib/amethyst/generated/homepage-server.cjs')
  const window = { React, SPARKLE_FIRST_PAINT: { serverClock: true, now: Date.now() }, location: { search: '', origin: 'https://example.test', hostname: 'example.test' } }
  const document = { body: { className: 'homepage', classList: { add() {} } }, documentElement: { style: { setProperty() {} } }, getElementById: () => ({}) }
  const context = createContext({ window, document, React, Intl, URL, URLSearchParams, console, renderToString, ReactDOM: { createRoot: () => ({ render() {} }) } })
  const run = (source: string) => new Script(source).runInContext(context, { timeout: 500 })
  run(buildAmethystHomepageBootstrapScript({ ...homepage, heroMotion: 'still' }, [], 'halloween_pumpkin_cat', { targeted: true }) + ';window.SPARKLE_PENDING_PAGE_DATA={events:true,trades:true};')
  for (const file of ['compiled/tweaks-panel.js', 'dance-floor-ticker-label.js', 'live-lineup.js', 'responsive-image.js', 'sparkle-suite-footer-credit.js', 'compiled/homepage.js']) {
    run(file === 'compiled/homepage.js' ? evaluatedPage : readFileSync(join('public/amethyst', file), 'utf8'))
  }
  return { run }
}

it.each([0, 1, 3])('late data with %i events releases reservations and uses exactly the loaded count', count => {
  const { run } = pendingPage()
  const before = run('renderToString(React.createElement(Events, {count:0}))') as string
  expect(before.match(/data-page-placeholder="events"/g)).toHaveLength(2)
  const events = Array.from({ length: count }, (_, index) => ({ id: 'late-' + index, title: 'Loaded event ' + index, eventTime: '2026-10-28T00:00:00Z', timeZone: 'America/New_York', durationMinutes: 60, featured: false, description: '', codes: [], collections: [], platforms: [] }))
  // The real completion callback splices this same array and clears the flag.
  // Deliberately retain stale tweak defaults to require recomputing the count.
  run('HOMEPAGE_EVENT_PAYLOAD.splice(0,HOMEPAGE_EVENT_PAYLOAD.length,...' + JSON.stringify(events) + ');window.SPARKLE_PENDING_PAGE_DATA=null;')
  const view = JSON.parse(run('JSON.stringify(homepageEventsView(window.HOMEPAGE_TWEAK_DEFAULTS,true))'))
  expect(view.showEvents).toBe(count > 0)
  expect(view.eventCount).toBe(count)
  const after = run('(() => { const view=homepageEventsView(window.HOMEPAGE_TWEAK_DEFAULTS,true); return view.showEvents ? renderToString(React.createElement(Events,{count:view.eventCount})) : ""; })()') as string
  expect(after.match(/<article[^>]*class="hp-event-card/g) || []).toHaveLength(count)
  expect(after).not.toContain('data-page-placeholder=')
  expect(after).not.toContain('height:42rem')
  expect(after).not.toContain('overflow-y:auto')
  if (!count) expect(after).not.toContain('id="events"')
})

it('preserves the on-time event view and its configured count', () => {
  const { run } = pendingPage()
  expect(run('homepageEventsView(window.HOMEPAGE_TWEAK_DEFAULTS,false) === window.HOMEPAGE_TWEAK_DEFAULTS')).toBe(true)
})
