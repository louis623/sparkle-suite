/** Local-only rendering inputs, never a public route. Generates ONE fixture per invocation.
 * npm exec tsx scripts/prepare-carousel-capture-fixtures.ts -- --theme mile-high-fizz --origin http://127.0.0.1:4177
 * Generation is not approval to record further themes: Lindsey's visual gate comes first.
 */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { runInNewContext } from 'node:vm'
import { buildSkinPreviewDocument, type SkinPreviewSkin } from '../lib/amethyst/skin-preview'
import { buildAmethystHomepageBootstrapScript, defaultAmethystHomepageTemplateData, type AmethystHomepageTemplateData } from '../lib/amethyst/homepage-template-data'
import { AMETHYST_APPEARANCE_PRESETS } from '../lib/amethyst/appearance-presets'
import { applyMileHighFizzHomepage } from '../lib/mile-high-fizz/profile'

export const CAPTURE_THEMES = ['mile-high-fizz', 'go-for-the-bling', 'sparkly-butterflies', 'amethyst', 'halloween_pumpkin_witch', 'halloween_pumpkin_cat', 'gilded_autumn', 'fall_owl_harvest_moon', 'gobble_and_fizz', 'pie_please', 'midnight_rose', 'pearl_rose', 'rose_champagne', 'sunset_beach', 'neon_butterfly'] as const
export type CaptureTheme = typeof CAPTURE_THEMES[number]
const root = process.cwd()
const safeHref = '#preview-action'
const emptyLineup = { liveQueueState: 'empty' as const, liveQueueEntries: [], liveQueueLastUpdated: null, liveQueueSummary: '', tradeBoardTickerItems: [] }

// Transcribed from the shipped October 20 actual customer-site recordings.
// Only the visible identity/hero copy is replayed; no current customer settings are read.
const repProfiles = {
  'go-for-the-bling': {
    skin: 'gnome_garden', repName: 'Kim', businessName: 'GofortheBling',
    heroHeadline: 'A little wonder, a lot of sparkle.',
    heroSub: 'Settle in for live reveals, friendly faces, and the joy of discovering something you love.',
    tickerTopText: '✨ Welcome to GoForTheBling!! 💎',
  },
  'sparkly-butterflies': {
    skin: 'neon_butterfly', repName: 'Kelly', businessName: 'Sparkly Butterflies',
    heroHeadline: 'Your Sparkle, Taking Flight',
    heroSub: 'Live jewelry reveals, electric color, and a welcoming place to find your next favorite.',
    // Verbatim evergreen phrase in the recording; omit its live schedule/shipping claims.
    tickerTopText: 'Pick your collection 💖',
  },
} as const

function localOrigin(raw: string) {
  const url = new URL(raw)
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname), 'Capture origin must be loopback')
  assert.equal(url.protocol, 'http:')
  assert.equal(url.username + url.password + url.search + url.hash, '')
  assert.equal(url.pathname, '/')
  return url.origin
}

function safePayload(data: AmethystHomepageTemplateData): AmethystHomepageTemplateData {
  return {
    ...data, ...emptyLineup,
    streamLinks: { shop: safeHref, watch: safeHref, tiktok: safeHref, facebook: '', whatnot: '' },
    socialLinks: [], socialHeroLinks: [], showFacebookVipHeroButton: false, facebookVipUrl: '',
    joinTeamUrl: safeHref, showcaseVideoUrl: '',
    footerLinks: Object.fromEntries(Object.keys(data.footerLinks).map(key => [key, safeHref])) as AmethystHomepageTemplateData['footerLinks'],
  }
}

function classicLindsey() {
  const data = applyMileHighFizzHomepage({
    ...defaultAmethystHomepageTemplateData,
    repName: 'Lindsey', businessName: 'Mile High Fizz', teamName: 'Diamond Peak Society',
    tagline: 'Revealing something magical together.', heroMotion: 'sparkle_rise',
    tickerTopText: 'Revealing something magical together.',
  })
  // The original source Hero has the instruction in its own paragraph. Do not duplicate it.
  return safePayload({ ...data, heroSub: 'REVEALING SOMETHING MAGICAL TOGETHER' })
}

/** Read the public fixture bootstrap without running any DOM/runtime or loading customer data. */
function payloadFromDocument(document: string) {
  const script = [...document.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)]
    .map(match => match[1]).find(source => source.includes('window.AMETHYST_RUNTIME_CONTEXT ='))
  assert.ok(script, 'Expected the actual customer bootstrap')
  const state: Record<string, unknown> = {}
  runInNewContext(script.slice(script.indexOf('window.AMETHYST_RUNTIME_CONTEXT =')), { window: state }, { timeout: 1000 })
  assert.ok(state.AMETHYST_HOMEPAGE_TEMPLATE_DATA)
  return state.AMETHYST_HOMEPAGE_TEMPLATE_DATA as AmethystHomepageTemplateData
}

const captureControls = '.beach-motion-controls,.gg-motion-control,.nb-motion-control,.au-controls,.hpc-motion-control,.hpw-motion-control,.ga-motion-control,.rgc-toggle,.mdr-toggle,.fow-controls,.prl-toggle,.tg-toggle,.tweaks-toggle,.tweaks-panel,#skin-preview-notice'
const localGuard = `
if (!['localhost','127.0.0.1','[::1]'].includes(location.hostname)) {
  window.stop(); document.documentElement.replaceChildren(); throw new Error('Local capture only');
}
window.__SPARKLE_LOCAL_CAPTURE__ = true;
window.open = function(){return null;};
navigator.sendBeacon = function(){return false;};
document.addEventListener('submit', function(e){e.preventDefault();e.stopImmediatePropagation();}, true);
document.addEventListener('click', function(e){
  if(e.target.closest && e.target.closest('.gg-motion-control,.nb-motion-control,.au-controls button,.hpc-motion-control,.hpw-motion-control,.ga-motion-control,.rgc-toggle,.mdr-toggle,.fow-controls button,.prl-toggle,.tg-toggle'))return;
  if(e.target.closest && e.target.closest('a,button,input')){e.preventDefault();e.stopImmediatePropagation();}
}, true);
`

export async function buildCarouselCaptureFixture(theme: CaptureTheme, rawOrigin: string) {
  assert.ok((CAPTURE_THEMES as readonly string[]).includes(theme), 'Unknown capture theme')
  const origin = localOrigin(rawOrigin)
  const isLindsey = theme === 'mile-high-fizz'
  const repProfile = theme === 'go-for-the-bling' || theme === 'sparkly-butterflies' ? repProfiles[theme] : null
  const skin = (isLindsey ? 'rose_gold' : repProfile?.skin ?? theme) as SkinPreviewSkin
  const preset = isLindsey ? 'alpine_opal' : skin
  const data = isLindsey ? classicLindsey() : safePayload(payloadFromDocument(await buildSkinPreviewDocument(skin, 'homepage', origin)))
  if (repProfile) {
    Object.assign(data, {
      repName: repProfile.repName, businessName: repProfile.businessName, teamName: '',
      heroHeadline: repProfile.heroHeadline, heroSub: repProfile.heroSub,
      tagline: repProfile.heroSub, tickerTopText: repProfile.tickerTopText, heroEyebrow: '',
      aboutHeadline: '', aboutParagraphs: ['', '', ''],
    })
    if (theme === 'sparkly-butterflies') {
      data.streamLinks.whatnot = safeHref
      data.showFacebookVipHeroButton = true
      data.facebookVipUrl = safeHref
    }
  }
  data.heroMotion = AMETHYST_APPEARANCE_PRESETS[preset].values.heroMotion
  const bootstrap = buildAmethystHomepageBootstrapScript(data, [], preset, { targeted: true }) + '\nObject.assign(window.HOMEPAGE_TWEAK_DEFAULTS,{showSlots:false,showNicNac:false});'
  let document = await buildSkinPreviewDocument(skin, 'homepage', origin, 'empty', bootstrap)
  if (isLindsey) document = document.replace(/media-src [^;]+;/, `media-src ${origin}/mile-high-fizz/hero.mp4;`)
  // Install guards after CSP and before any executable runtime. Keep all genuine layout CSS.
  document = document.replace(/(<meta http-equiv="Content-Security-Policy"[^>]+>)/, '$1<script>' + localGuard + '</script>')
  document = document.replace('</head>', `<style id="carousel-capture-controls">${captureControls}{display:none!important}</style></head>`)
  document = document.replace(/<title>[^<]*<\/title>/, `<title>Local capture fixture — ${theme}</title>`)
  assert.ok(!document.includes('data-template-src='), 'No live template endpoint may remain')
  assert.ok(document.includes("connect-src 'none'"))
  assert.ok(document.includes("form-action 'none'"))
  const payload = payloadFromDocument(document)
  assert.ok(Array.isArray(payload.liveQueueEntries) && payload.liveQueueEntries.length === 0)
  if (isLindsey) {
    assert.equal(payload.publicSiteVariant, 'mile_high_fizz_hybrid')
    assert.equal(payload.heroVideoUrl, '/mile-high-fizz/hero.mp4')
  }
  return { document, payload, preset, origin }
}

async function main() {
  const args = process.argv.slice(2).filter(arg => arg !== '--')
  const flags: Record<string, string> = {}
  for (let index = 0; index < args.length; index += 2) {
    assert.ok(['--theme', '--origin'].includes(args[index]), 'Only --theme and --origin are supported; no batch mode')
    assert.ok(args[index + 1] && !args[index + 1].startsWith('--'), 'Missing flag value')
    assert.ok(!flags[args[index]], 'Duplicate flag')
    flags[args[index]] = args[index + 1]
  }
  const theme = (flags['--theme'] ?? 'mile-high-fizz') as CaptureTheme
  const fixture = await buildCarouselCaptureFixture(theme, flags['--origin'] ?? 'http://127.0.0.1:4177')
  const output = path.join(root, '.local', 'carousel-capture')
  const hash = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex')
  const mediaFolders: Record<string, string> = {
    'go-for-the-bling': 'gnome-garden',
    'sparkly-butterflies': 'neon-butterfly', neon_butterfly: 'neon-butterfly',
    amethyst: 'am01-unicorn', halloween_pumpkin_witch: 'halloween-pumpkin-witch',
    halloween_pumpkin_cat: 'halloween-pumpkin-cat', gilded_autumn: 'gilded-autumn',
    fall_owl_harvest_moon: 'fall-owl', gobble_and_fizz: 'gobble-and-fizz',
    pie_please: 'pie-please', midnight_rose: 'midnight-rose', pearl_rose: 'pearl-rose',
    rose_champagne: 'rose-champagne', sunset_beach: 'sunset-beach',
  }
  const mediaFolder = mediaFolders[theme] ? 'public/amethyst/skins/' + mediaFolders[theme] : null
  const mediaSources = mediaFolder ? (await readdir(path.join(root, mediaFolder), { withFileTypes: true }))
    .filter(entry => entry.isFile()).map(entry => mediaFolder + '/' + entry.name) : []
  const sourcePaths = [
    'scripts/prepare-carousel-capture-fixtures.ts', 'lib/amethyst/skin-preview.ts',
    'lib/amethyst/homepage-template-data.ts', 'lib/amethyst/appearance-presets.ts',
    'lib/mile-high-fizz/profile.ts', 'lib/public-site/visibility.ts',
    ...(await readdir(path.join(root, 'public/amethyst'))).filter(name => /\.(html|jsx|js|css)$/.test(name)).map(name => 'public/amethyst/' + name),
    ...(theme === 'mile-high-fizz' ? ['public/mile-high-fizz/hero.mp4'] : []),
    ...(theme === 'go-for-the-bling' || theme === 'sparkly-butterflies' ? ['public/marketing/' + theme + '-site-preview.mp4'] : []),
    ...mediaSources,
  ]
  const sources = await Promise.all(sourcePaths.map(async source => ({ path: source, sha256: hash(await readFile(path.join(root, source))) })))
  const manifest = {
    schemaVersion: 1, localOnly: true, theme, preset: fixture.preset, origin: fixture.origin,
    gitCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    renderer: 'public/amethyst/Homepage.html', fixture: theme + '.html', fixtureSha256: hash(fixture.document),
    payload: fixture.payload, sources,
    payloadProvenance: theme === 'mile-high-fizz' ? 'Classic bespoke profile plus original migrated hero copy and video' : theme === 'go-for-the-bling' || theme === 'sparkly-butterflies' ? 'Visible identity and hero copy transcribed from shipped actual customer-site recording; actual everyday theme renderer; empty synthetic activity and safe action links; evergreen recorded ticker excerpt' : 'Repository skin-preview profile with empty synthetic activity and safe action links',
    capture: { stationaryViewport: true, suggestedViewport: { width: 1440, height: 900 }, durationSeconds: 15, originalHeroDurationSeconds: theme === 'mile-high-fizz' ? 5.041667 : null },
    verificationRequired: theme === 'mile-high-fizz' ? ['Mountain backdrop', 'Aurora borealis', 'Reflective lake', 'Mile High Fizz branding', 'Header and Shop fully visible', 'Original video moves', 'Louis visual gate before batch capture'] : ['Actual theme motion', 'Complete site header and Shop', 'No sample notices', 'Full dwell and loop boundary'],
    removedControls: captureControls, layoutOverrides: [], customerDataLoaded: false,
  }
  await mkdir(output, { recursive: true })
  await writeFile(path.join(output, theme + '.html'), fixture.document)
  await writeFile(path.join(output, theme + '.manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
  console.log(JSON.stringify({ fixture: path.join(output, theme + '.html'), manifest: path.join(output, theme + '.manifest.json'), theme, renderedOrRecorded: false }))
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error); process.exitCode = 1 })
}
