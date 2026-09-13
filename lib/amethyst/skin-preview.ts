import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { buildAmethystHomepageBootstrapScript, defaultAmethystHomepageTemplateData } from './homepage-template-data'
import { buildAmethystTradeBootstrapScript, defaultAmethystTradeTemplateData } from './trade-template-data'
import { buildAmethystJoinBootstrapScript, defaultAmethystJoinTemplateData } from './join-template-data'
import type { AmethystTradeBoardListing } from './trade-board-listings'
import type { AmethystHomepageEventCard } from './homepage-upcoming-shows'

export const SKIN_PREVIEW_PAGES = ['homepage', 'trade', 'join', 'unsubscribe'] as const
export type SkinPreviewPage = (typeof SKIN_PREVIEW_PAGES)[number]
const FILES: Record<SkinPreviewPage, string> = {
  homepage: 'Homepage.html', trade: 'Trade.html', join: 'Join.html', unsubscribe: 'Unsubscribe.html',
}
const LABELS: Record<SkinPreviewPage, string> = {
  homepage: 'Home', trade: 'Dance Floor', join: 'Join', unsubscribe: 'Preferences',
}
const previewPath = (page: SkinPreviewPage) => `/skin-preview/gnome_garden/${page}`

// Explicit sample data only. The opaque preview never contacts the live lineup endpoint.
export const GNOME_PREVIEW_LINEUP = {
  liveQueueRevision: 0,
  liveQueueSourceReady: true,
  liveQueueServerTime: '2026-09-09T00:00:00.000Z',
  liveQueueLastUpdated: '2026-09-09T00:00:00.000Z',
  liveQueueAgeSeconds: 0,
  liveQueueStaleAfterSeconds: 45,
  liveQueueState: 'live' as const,
  liveQueueSummary: 'Sample lineup for appearance preview. No live show is connected.',
  liveQueueEntries: ['Sample Harper', 'Sample Rowan', 'Sample Sage'].map((name, index) => ({
    name, position: index + 1, highlight: false, label: 'Sample only',
  })),
}

// Fixture-only data: this module never resolves a rep or reads customer records.
export const GNOME_PREVIEW_LISTINGS: AmethystTradeBoardListing[] = [
  { id: 'sample-ring', name: 'Woodland Wishes', collection: 'OG', type: 'Ring', material: 'Rose gold plating', stone: 'Green crystal', msrp: 48, size: '8', note: 'Sample dancer. Same collection and jewelry type for requests.', glyph: 'W', tier: 'everyday', photoUrl: null, photoSource: 'missing', quantityAvailable: 2 },
  { id: 'sample-earrings', name: 'Lantern Light', collection: 'OG', type: 'Earrings', material: 'Gold plating', stone: 'Champagne crystal', msrp: 52, size: null, note: 'Sample dancer for appearance review.', glyph: 'L', tier: 'everyday', photoUrl: null, photoSource: 'missing', quantityAvailable: 1 },
  { id: 'sample-necklace', name: 'Moonlit Garden', collection: 'Birthday', type: 'Necklace', material: 'Silver plating', stone: 'Opal shimmer', msrp: 68, size: null, note: 'Sample dancer for appearance review.', glyph: 'M', tier: 'everyday', photoUrl: null, photoSource: 'missing', quantityAvailable: 1 },
]

export const GNOME_PREVIEW_EVENTS: AmethystHomepageEventCard[] = [
  { id: 'sample-garden-evening', title: 'A Little Woodland Sparkle', description: 'Pull up a chair for a cozy evening of live reveals.\nBring your favorite mug and see what the garden has in store.', eventTime: '2099-09-12T23:00:00.000Z', timeZone: 'America/New_York', durationMinutes: 90, featured: true, codes: [{ code: 'SAMPLE10', desc: 'Sample offer for this preview' }], collections: [{ label: 'OG Collection', href: previewPath('trade') }], platforms: [{ kind: 'tt', label: 'Watch on TikTok', href: '#preview-action' }] },
  { id: 'sample-morning-show', title: 'Coffee, Gnomes & a Little Surprise', description: 'A relaxed weekend gathering with new favorites, familiar faces, and plenty of sparkle.', eventTime: '2099-09-14T15:00:00.000Z', timeZone: 'America/New_York', durationMinutes: 60, featured: false, codes: [], collections: [], platforms: [{ kind: 'tt', label: 'Watch on TikTok', href: '#preview-action' }] },
]

function fixtureBootstrap(page: SkinPreviewPage) {
  const footerLinks = {
    ...defaultAmethystHomepageTemplateData.footerLinks,
    home: previewPath('homepage'), tradeBoard: previewPath('trade'), joinTeam: previewPath('join'),
    unsubscribe: previewPath('unsubscribe'), catalog: '#preview-action', preOrders: '#preview-action',
  }
  const common = {
    ...GNOME_PREVIEW_LINEUP,
    businessName: 'The Gnome Forest', repName: 'Sasha', footerLinks,
    tickerTopText: 'Welcome to the garden | Live reveals & lovely surprises | Explore the Dance Floor',
    footerTagline: 'A little wonder. A little sparkle. A place to feel at home.',
    tradeBoardTickerItems: GNOME_PREVIEW_LISTINGS.map(({ name, type, collection }) => ({ name, type, collection })),
  }
  const context = { targeted: true } as const
  if (page === 'trade') {
    return buildAmethystTradeBootstrapScript({ ...defaultAmethystTradeTemplateData, ...common, shopUrl: '#preview-action' }, GNOME_PREVIEW_LISTINGS, 'gnome_garden', context)
  }
  if (page === 'join') {
    return buildAmethystJoinBootstrapScript({
      ...defaultAmethystJoinTemplateData, ...common, teamName: 'The Garden Circle', heroTitle: 'Find your place in the garden.',
      shopUrl: '#preview-action', bpReferralUrl: '', hasRecruitingLink: false,
      teamMembers: [
        { name: 'Sasha', business: 'The Gnome Forest', state: 'Virginia', initials: 'S', socialLinks: {} },
        { name: 'Alex', business: 'Moonlit Sparkle', state: 'North Carolina', initials: 'A', socialLinks: {} },
        { name: 'Jamie', business: 'Little Lantern Reveals', state: 'Georgia', initials: 'J', socialLinks: {} },
      ],
    }, 'gnome_garden', context, GNOME_PREVIEW_LISTINGS)
  }
  return buildAmethystHomepageBootstrapScript({
    ...defaultAmethystHomepageTemplateData, ...common,
    teamName: 'The Garden Circle', tagline: 'Live reveals, lovely surprises, and a little woodland magic.',
    heroEyebrow: 'Come for the sparkle. Stay for the company.',
    heroHeadline: 'A little wonder. A lot of sparkle.',
    heroSub: 'Settle in for live jewelry reveals, friendly faces, and the joy of discovering something you love.',
    tickerTopText: 'Welcome to the garden | Live reveals & lovely surprises | Explore the Dance Floor',
    aboutHeadline: 'There is always room for you here.',
    aboutParagraphs: [
      'The best part of a reveal is sharing the surprise. This little corner of the garden is a place to unwind, chat, and discover a new favorite together.',
      'Whether you love a quiet shimmer or a statement piece, you are welcome just as you are. Bring your curiosity and make yourself at home.',
      'Our sample calendar shows how upcoming live gatherings, collection notes, and helpful details fit together on your site.',
    ],
    signupSub: 'A friendly heads-up for the next gathering in the garden.',
    streamLinks: { shop: '#preview-action', watch: '#preview-action', tiktok: '#preview-action', facebook: '#preview-action', whatnot: '#preview-action' },
    joinTeamUrl: previewPath('join'),
  }, GNOME_PREVIEW_EVENTS, 'gnome_garden', context)
}

function escapeAttribute(value: string) {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
function inlineScript(value: string) { return value.replace(/<\/script/gi, '<\\/script') }

export const SKIN_PREVIEW_GUARDS = `
(function () {
  var pages = { 'Homepage.html': 'homepage', 'Trade.html': 'trade', 'Join.html': 'join', 'Unsubscribe.html': 'unsubscribe' };
  function notice() {
    var node = document.getElementById('skin-preview-notice');
    if (!node) {
      node = document.createElement('div'); node.id = 'skin-preview-notice'; node.setAttribute('role', 'status');
      node.style.cssText = 'position:fixed;bottom:16px;left:50%;transform:translateX(-50%);z-index:2147483647;width:min(90%,420px);box-sizing:border-box;padding:14px 18px;border-radius:12px;background:#173126;color:#fff3d6;font:14px/1.5 sans-serif;box-shadow:0 6px 28px #0005;text-align:center';
      document.body.appendChild(node);
    }
    node.textContent = 'This is a sample preview. Nothing is submitted or sent.';
    clearTimeout(window.__previewNoticeTimer); window.__previewNoticeTimer = setTimeout(function () { node.remove(); }, 4500);
  }
  window.fetch = async function (input, options) {
    var method = String(options && options.method || input && input.method || 'GET').toUpperCase();
    var url = String(input && input.url || input);
    if (method === 'GET' && /^\\/api\\/amethyst\\/trade-board(?:[?]|$)/.test(url)) {
      return new Response(JSON.stringify({ listings: window.AMETHYST_TRADE_BOARD_LISTINGS || [] }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    if (method === 'GET' && /^\\/api\\/amethyst\\/live-lineup(?:[?]|$)/.test(url)) {
      var sample = ${JSON.stringify(GNOME_PREVIEW_LINEUP)};
      sample.liveQueueServerTime = sample.liveQueueLastUpdated = new Date().toISOString();
      return new Response(JSON.stringify(sample), { status: 200, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
    }
    notice(); throw new Error('Sample preview: requests are disabled. Nothing was sent.');
  };
  document.addEventListener('submit', function (event) { event.preventDefault(); event.stopImmediatePropagation(); notice(); }, true);
  document.addEventListener('click', function (event) {
    // A sandbox can suppress the submit event itself. Catch the action button first.
    var action = event.target.closest && event.target.closest('.tp-sheet-submit, .hp-signup-submit, input[type="file"]');
    if (action) { event.preventDefault(); event.stopImmediatePropagation(); notice(); return; }
    var link = event.target.closest && event.target.closest('a'); if (!link) return;
    var href = link.getAttribute('href') || '';
    if (href.charAt(0) === '#' && href !== '#' && href !== '#preview-action') return;
    event.preventDefault(); event.stopImmediatePropagation();
    var path = href.split('?')[0].split('#')[0];
    var page = pages[path.split('/').pop()] || (/^\\/skin-preview\\/gnome_garden\\/(homepage|trade|join|unsubscribe)$/.exec(path) || [])[1];
    if (page) window.parent.postMessage({ type: 'sparkle-skin-preview-page', page: page }, '*'); else notice();
  }, true);
  function disableUploads() {
    document.querySelectorAll('input[type="file"]').forEach(function (input) {
      if (!input.disabled) input.disabled = true;
      input.setAttribute('aria-label', 'Uploads are unavailable in this sample preview');
      input.title = 'Sample preview — uploads are disabled';
    });
  }
  if (typeof MutationObserver !== 'undefined') {
    new MutationObserver(disableUploads).observe(document.getElementById('root'), { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled'] });
    disableUploads();
  }
})();`

/** Renders the unchanged customer components with fixture data inside an opaque sandbox. */
export async function buildGnomeSkinPreviewDocument(page: SkinPreviewPage, origin: string) {
  const root = join(process.cwd(), 'public', 'amethyst')
  let document = await readFile(join(root, FILES[page]), 'utf8')
  document = document.replace(/<script\b[^>]*(?:data-template-src|src)="\/api\/amethyst\/[^\"]+"[^>]*><\/script>/g, '')
  // Inline only allowlisted repository runtime files. Inline Babel input does not need network XHR.
  const runtimeNames = ['tweaks-panel.jsx', 'homepage.jsx', 'trade.jsx', 'unsubscribe.jsx', 'join-runtime.js', 'live-lineup.js']
  for (const name of runtimeNames) {
    const escaped = name.replace('.', '\\.')
    const pattern = new RegExp(`<script([^>]*?) src="(?:/amethyst/)?${escaped}(?:\\?[^\"]*)?"([^>]*)><\\/script>`, 'g')
    if (!pattern.test(document)) continue
    pattern.lastIndex = 0
    const source = inlineScript(await readFile(join(root, name), 'utf8'))
    document = document.replace(pattern, (_match, before, after) => `<script${before}${after}>${source}</script>`)
  }
  const csp = `default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' https://unpkg.com; style-src 'unsafe-inline' ${origin} https://fonts.googleapis.com https://api.fontshare.com; font-src ${origin} https://fonts.gstatic.com https://cdn.fontshare.com https://api.fontshare.com data:; img-src ${origin} https: data: blob:; connect-src 'none'; form-action 'none'; frame-src 'none'; base-uri ${origin}; object-src 'none'`
  document = document.replace('<head>', `<head><meta http-equiv="Content-Security-Policy" content="${escapeAttribute(csp)}"><base href="${escapeAttribute(origin)}/amethyst/"><meta name="robots" content="noindex,nofollow">`)
  document = document.replace(/<meta name="robots" content="index,follow" \/>/g, '')
  const bootstrap = fixtureBootstrap(page).replaceAll('Sparkle by Sasha', 'The Gnome Forest')
  document = document.replace('<div id="root"></div>', `<div id="root"></div><script>${inlineScript(SKIN_PREVIEW_GUARDS)}\n${inlineScript(bootstrap)}</script>`)
  return document.replaceAll('Sparkle by Sasha', 'The Gnome Forest')
}

export async function renderGnomeSkinPreview(page: SkinPreviewPage, origin: string) {
  const document = await buildGnomeSkinPreviewDocument(page, origin)
  const navigation = SKIN_PREVIEW_PAGES.map((item) => `<a href="${previewPath(item)}"${item === page ? ' aria-current="page"' : ''}>${LABELS[item]}</a>`).join('')
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Gnome Forest · Skin preview</title><style>
  *{box-sizing:border-box}body{margin:0;background:#173126;color:#fff3d6;font:14px/1.4 system-ui,sans-serif}header{min-height:64px;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 24px;border-bottom:1px solid #f4c45e44}header strong{font-size:14px}header small{display:block;color:#dfd4ba;font-size:12px}nav{display:flex;gap:5px;flex-wrap:wrap}nav a{color:inherit;text-decoration:none;border-radius:20px;padding:8px 12px}nav a:hover,nav a[aria-current]{background:#fff3d6;color:#173126}a:focus-visible{outline:3px solid #f4c45e;outline-offset:3px}iframe{display:block;width:100%;height:calc(100dvh - 65px);border:0;background:#173126}@media(max-width:600px){header{padding:10px 12px;flex-direction:column;align-items:flex-start;gap:7px}header small{display:inline;margin-left:6px}nav{width:100%;justify-content:space-between}nav a{padding:7px 9px}iframe{height:calc(100dvh - 100px)}}
  html,body{height:100%;overflow:hidden}body{height:100dvh;display:flex;flex-direction:column}header{flex:0 0 auto}iframe{flex:1 1 0;min-height:0;height:auto}
  </style></head><body><header><div><strong>Skin preview · Sample content</strong><small>Gnome Forest</small></div><nav aria-label="Preview pages">${navigation}</nav></header><iframe id="skin-preview" title="${LABELS[page]} — sample Gnome Forest site" sandbox="allow-scripts" referrerpolicy="no-referrer" srcdoc="${escapeAttribute(document)}"></iframe><script>
  window.addEventListener('message',function(event){var frame=document.getElementById('skin-preview');if(event.source!==frame.contentWindow||event.data?.type!=='sparkle-skin-preview-page')return;var page=event.data.page;if(['homepage','trade','join','unsubscribe'].includes(page))window.location.assign('/skin-preview/gnome_garden/'+page);});
  </script></body></html>`
}
