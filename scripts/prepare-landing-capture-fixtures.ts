/** Local-only, synthetic captures of the real customer templates. Never deploy outputs. */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { runInNewContext } from 'node:vm'

import {
  AMETHYST_APPEARANCE_PRESETS,
  type AmethystAppearancePresetId,
} from '../lib/amethyst/appearance-presets'
import {
  buildAmethystHomepageBootstrapScript,
  defaultAmethystHomepageTemplateData,
  type AmethystHomepageTemplateData,
} from '../lib/amethyst/homepage-template-data'
import type { AmethystHomepageEventCard } from '../lib/amethyst/homepage-upcoming-shows'
import type { AmethystTradeBoardListing } from '../lib/amethyst/trade-board-listings'
import {
  buildAmethystTradeBootstrapScript,
  defaultAmethystTradeTemplateData,
} from '../lib/amethyst/trade-template-data'

const root = process.cwd()
const output = path.resolve(root, 'public/sparkle-suite/landing-capture')
const sampleDate = '2026-09-05T23:05:00.000Z'
const baseUrl = '/sparkle-suite/landing-capture'
const styles = [
  ['blush', 'sparkle_suite_morganite'],
  ['violet', 'amethyst'],
  ['night', 'black_diamond'],
] as const satisfies ReadonlyArray<readonly [string, AmethystAppearancePresetId]>

const events: AmethystHomepageEventCard[] = [
  {
    id: 'sample-saturday', title: 'Saturday Sparkle Night',
    description: 'A little sparkle, a few surprises, and a lovely night together.',
    eventTime: '2026-09-05T23:00:00.000Z', timeZone: 'America/New_York',
    durationMinutes: 90, featured: true, codes: [],
    collections: [{ label: 'Originals', href: '#sample' }],
    platforms: [{ kind: 'tt', label: 'Watch on TikTok', href: '#sample' }],
  },
  {
    id: 'sample-tuesday', title: 'Tuesday Night Reveals',
    description: 'Come say hello and discover your next favorite piece.',
    eventTime: '2026-09-08T23:00:00.000Z', timeZone: 'America/New_York',
    durationMinutes: 90, featured: false, codes: [],
    collections: [{ label: 'Birthday', href: '#sample' }],
    platforms: [{ kind: 'fb', label: 'Watch on Facebook', href: '#sample' }],
  },
  {
    id: 'sample-friday', title: 'Friday Sparkle Social',
    description: 'End the week with friendly faces and a fresh reveal.',
    eventTime: '2026-09-11T23:00:00.000Z', timeZone: 'America/New_York',
    durationMinutes: 60, featured: false, codes: [],
    collections: [{ label: 'Originals', href: '#sample' }],
    platforms: [{ kind: 'tt', label: 'Watch on TikTok', href: '#sample' }],
  },
]

const listings: AmethystTradeBoardListing[] = [
  ['Moonlit Wishes', 'Ring', 'OG', '8', 'M'],
  ['Petal Glow', 'Earrings', 'OG', null, 'P'],
  ['A Little Radiance', 'Necklace', 'OG', null, 'R'],
  ['September Sparkle', 'Ring', 'Birthday', '7', 'S'],
  ['Golden Hour', 'Earrings', 'OG', null, 'G'],
  ['Silver Lining', 'Necklace', 'OG', null, 'L'],
].map(([name, type, collection, size, glyph], index) => ({
  id: `sample-listing-${index + 1}`, name: name!, type: type!, collection: collection!,
  material: 'Sample finish', stone: 'Sample detail', msrp: null, size,
  tradePreferences: 'Sample dancer. Item-for-item, same collection and jewelry type.',
  glyph: glyph!, tier: 'everyday', photoUrl: null, photoSource: 'missing', quantityAvailable: 1,
}))

const homepage: AmethystHomepageTemplateData = {
  ...defaultAmethystHomepageTemplateData,
  repName: 'Sasha', businessName: 'Your Sparkle Studio', teamName: 'Your Sparkle Studio',
  tagline: 'A little surprise. A lot to love.', heroEyebrow: 'Live jewelry reveals with Sasha',
  heroHeadline: 'Real jewelry. Live reveals. Pure sparkle.',
  heroSub: 'Welcome to Your Sparkle Studio. Join Sasha for live reveals, friendly faces, and the joy of discovering something you love.',
  announcementText: 'Sample show tonight at 7 PM Eastern',
  tickerTopText: 'Saturday Sparkle Night · 7 PM Eastern · Sample site',
  liveQueueState: 'live', liveQueueSummary: 'Sample live queue · Emma is currently unboxing',
  liveQueueEntries: ['Emma', 'Olivia', 'Mia', 'Ava'].map((name, index) => ({
    position: index + 1, name, highlight: index === 0,
    label: ['Currently Unboxing', 'On Deck', 'Up Next', 'In Queue'][index],
  })),
  tradeBoardSummary: 'Dance Floor: 6 sample pieces',
  tradeBoardTickerItems: listings.map(({ name, type, collection }) => ({ name, type, collection })),
  aboutHeadline: 'A warm welcome, with a little sparkle.',
  aboutParagraphs: [
    "I'm Sasha, and this is Your Sparkle Studio — a sample site showing how your own story can feel right at home.",
    'From your next live show to your latest Dance Floor pieces, customers can find the little details in one place.',
    'Your site can bring your colors, your voice, and your community together.',
  ],
  signupSub: 'Follow along for show updates from Your Sparkle Studio.',
  signupConsent: 'Sample signup only. This capture does not collect or send information.',
  footerTagline: 'Your Sparkle Studio · Sample customer site',
  legalDisclaimer: 'Sample site with fictional names, events, and inventory. No purchases, messages, or trade requests are accepted.',
  showcaseVideoCaption: 'Your story belongs here', showcaseVideoUrl: '', showJoinPage: false,
  streamLinks: { shop: '#sample', watch: '#sample', tiktok: '#sample', facebook: '#sample' },
  socialLinks: defaultAmethystHomepageTemplateData.socialLinks.map((link) => ({ ...link, href: '#sample' })),
  footerLinks: Object.fromEntries(Object.keys(defaultAmethystHomepageTemplateData.footerLinks).map((key) => [key, '#sample'])) as AmethystHomepageTemplateData['footerLinks'],
}

function safetyScript() {
  return `
  if (!['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)) {
    window.stop(); document.write('<plaintext>Local capture fixture unavailable.');
    throw new Error('Local-only capture fixture');
  }
  window.__SPARKLE_LOCAL_CAPTURE__ = true;
  const NativeDate = Date;
  window.Date = class extends NativeDate {
    constructor(...args) { super(...(args.length ? args : ['${sampleDate}'])); }
    static now() { return NativeDate.parse('${sampleDate}'); }
  };
  const nativeFetch = window.fetch.bind(window);
  window.fetch = function(input, init) {
    const url = new URL(typeof input === 'string' ? input : input.url, location.href);
    const method = String(init?.method || input?.method || 'GET').toUpperCase();
    if (url.pathname === '/api/amethyst/trade-board' && method === 'GET') {
      return Promise.resolve(new Response(JSON.stringify({ listings: ${JSON.stringify(listings)} }), { headers: { 'content-type': 'application/json' } }));
    }
    if (url.origin !== location.origin || method !== 'GET' || url.pathname.startsWith('/api/')) {
      return Promise.resolve(new Response(JSON.stringify({ error: 'Sample site: no request was sent.' }), { status: 403, headers: { 'content-type': 'application/json' } }));
    }
    return nativeFetch(input, init);
  };
  const nativeXhrOpen = XMLHttpRequest.prototype.open;
  const nativeXhrSend = XMLHttpRequest.prototype.send;
  const staticXhr = new WeakSet();
  XMLHttpRequest.prototype.open = function(method, rawUrl, ...args) {
    const url = new URL(rawUrl, location.href);
    if (String(method).toUpperCase() === 'GET' && url.origin === location.origin && url.pathname.startsWith('/amethyst/') && /\\.(jsx|js|css)$/.test(url.pathname)) staticXhr.add(this);
    else staticXhr.delete(this);
    return nativeXhrOpen.call(this, method, rawUrl, ...args);
  };
  XMLHttpRequest.prototype.send = function(body) {
    if (staticXhr.has(this)) return nativeXhrSend.call(this, body);
    throw new Error('Sample site: request disabled.');
  };
  navigator.sendBeacon = function() { return false; };
  window.open = function() { alert('Sample site — external actions are disabled.'); return null; };
  document.addEventListener('submit', function(event) {
    event.preventDefault(); event.stopImmediatePropagation(); alert('Sample site — no information was sent.');
  }, true);
  document.addEventListener('click', function(event) {
    const link = event.target.closest('a');
    if (link && (!link.getAttribute('href')?.startsWith('#') || link.getAttribute('href') === '#sample')) {
      event.preventDefault(); event.stopImmediatePropagation(); alert('Sample site — external actions are disabled.');
    }
  }, true);
  `
}

async function fixture(filename: string, kind: 'Homepage' | 'Trade', bootstrap: string, preset: AmethystAppearancePresetId) {
  const source = await readFile(path.join(root, 'public/amethyst', `${kind}.html`), 'utf8')
  const templateTag = /<script src="template-loader\.js" data-template-src="[^"]+"><\/script>/
  assert.match(source, templateTag)
  const state: Record<string, unknown> = {}
  runInNewContext(bootstrap, { window: state })
  assert.equal((state.AMETHYST_RUNTIME_CONTEXT as { targeted: boolean }).targeted, true)
  const defaults = state[kind === 'Homepage' ? 'HOMEPAGE_TWEAK_DEFAULTS' : 'TRADE_TWEAK_DEFAULTS'] as Record<string, unknown>
  assert.equal(defaults.preset, preset)
  assert.equal(defaults.businessName, 'Your Sparkle Studio')
  const html = source
    .replace(templateTag, () => `<script>${bootstrap}</script>`)
    .replace(/(src|href)="((?:tokens|components|homepage|trade|tweaks-panel)[^"/]*\.(?:css|jsx)[^"]*)"/g, '$1="/amethyst/$2"')
    .replace('<head>', `<head><script>${safetyScript()}</script>`)
    .replace('content="index,follow"', 'content="noindex,nofollow"')
    .replace(/<title>[^<]+<\/title>/, `<title>Sample site · ${AMETHYST_APPEARANCE_PRESETS[preset].label}</title>`)
    .replace('<div id="root"></div>', '<div style="position:relative;z-index:99999;padding:7px 12px;text-align:center;background:#402924;color:#fff6fa;font:600 12px/1.4 sans-serif" role="note">Sample site · Fictional details · No actions are sent</div><div id="root"></div>')
  assert.ok(!html.includes('data-template-src='), 'Fixture must not load a real template endpoint')
  await writeFile(path.join(output, filename), html)
  return { url: `${baseUrl}/${filename}`, kind, preset, source: `public/amethyst/${kind}.html`, sourceSha256: createHash('sha256').update(source).digest('hex') }
}

async function main() {
  assert.equal(path.basename(root), 'sparkle-suite-repo', 'Run from the approved repository root')
  assert.ok(output.startsWith(path.join(root, 'public') + path.sep))
  assert.ok(events.every((event) => event.eventTime.startsWith('2026-09-')))
  await mkdir(output, { recursive: true })
  const entries = []
  for (const [label, preset] of styles) {
    const data = { ...homepage, heroMotion: AMETHYST_APPEARANCE_PRESETS[preset].values.heroMotion }
    entries.push(await fixture(`home-${label}.html`, 'Homepage', buildAmethystHomepageBootstrapScript(data, events, preset, { targeted: true }), preset))
  }
  const trade = {
    ...defaultAmethystTradeTemplateData, repName: 'Sasha', businessName: homepage.businessName,
    tickerTopText: 'Sample Dance Floor · Same collection + jewelry type · Item-for-item only',
    shopUrl: '#sample', footerTagline: homepage.footerTagline, legalDisclaimer: homepage.legalDisclaimer,
    footerLinks: { ...defaultAmethystTradeTemplateData.footerLinks, ...homepage.footerLinks },
  }
  entries.push(await fixture('dance-floor.html', 'Trade', buildAmethystTradeBootstrapScript(trade, listings, 'sparkle_suite_morganite', { targeted: true }), 'sparkle_suite_morganite'))
  const manifest = { localOnly: true, generatedFromActualTemplates: true, sampleDate, sampleRep: 'Sasha', listingsUseNativePhotoPlaceholders: true, entries }
  await writeFile(path.join(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
  console.log(JSON.stringify(manifest, null, 2))
  console.log('Remove public/sparkle-suite/landing-capture before production release. Retain only final screenshots.')
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
