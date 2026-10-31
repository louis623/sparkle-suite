import { earlyHomepageLocalTime } from './homepage-local-time'
import { HERO_MOTION_THEMES } from './hero-motion-config'
import { earlyHomepageControls, earlyMileHighFizzControls } from './hero-motion-controls'
import homepageStyles from './generated/homepage-styles.json'
export { earlyHomepageControls } from './hero-motion-controls'
import runtimeSources from './generated/page-runtimes.json'
import { webcrypto } from 'node:crypto'
import { utilityPageFonts } from './utility-page-fonts'
import { responsiveHeroCss, heroImagePreload } from './hero-responsive-images'
import { join } from 'node:path'
import { Script, createContext } from 'node:vm'
import { createRequire } from 'node:module'
import type * as ReactTypes from 'react'
import type { AmethystPreviewTemplateData } from './preview-template-data'

export type SSRPage = 'homepage' | 'trade' | 'join'
const scripts = new Map<SSRPage, Script[]>()
function runtimeScripts(page: SSRPage) {
  if (!scripts.has(page)) scripts.set(page, ['compiled/tweaks-panel.js', 'dance-floor-ticker-label.js', 'live-lineup.js', 'responsive-image.js', 'sparkle-suite-footer-credit.js', 'compiled/' + page + '.js'].map(name => new Script(runtimeSources[name as keyof typeof runtimeSources], { filename: name })))
  return scripts.get(page)!
}
// Prepare immutable code once as soon as this module is imported.
const runtimeInitStarted = performance.now()
const preparedRuntime = Promise.resolve().then(async () => {
  const { React, renderToString } = createRequire(join(process.cwd(), 'package.json'))('./lib/amethyst/generated/homepage-server.cjs') as {
    React: typeof ReactTypes; renderToString: (element: ReactTypes.ReactNode) => string
  }
  const bundleMs = performance.now() - runtimeInitStarted
  for (const page of ['homepage', 'trade', 'join'] as const) runtimeScripts(page)
  console.info('homepage_ssr_runtime', JSON.stringify({ bundleMs, preparedMs: performance.now() - runtimeInitStarted }))
  return { React, renderToString }
})
// Import-time failures are handled by the request's safety boundary.
void preparedRuntime.catch(() => {})
const escapeAttribute = (value: string) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

/** Called only inside the bounded best-effort boundary. Failure leaves Live HTML intact. */
export async function renderAmethystPageFirstPaint(page: SSRPage, html: string, data: AmethystPreviewTemplateData, requestUrl: URL, bootstrap: string) {
  const theme = HERO_MOTION_THEMES[data.appearancePreset]
  const { React, renderToString } = await preparedRuntime
  const properties = new Map<string, string>()
  const body = { className: page === 'homepage' ? 'homepage' : page + 'page', classList: { add(...names: string[]) { body.className += ' ' + names.join(' ') } } }
  const document = { body, documentElement: { style: { setProperty(name: string, value: unknown) { properties.set(name, String(value)) } } }, getElementById: () => ({}) }
  let element: ReactTypes.ReactNode
  const firstPaint = { serverClock: true, now: Date.now() }
  const window = { React, SPARKLE_HERO_THEMES: HERO_MOTION_THEMES, SPARKLE_FIRST_PAINT: firstPaint, location: { search: requestUrl.search, origin: requestUrl.origin, hostname: requestUrl.hostname } }
  const context = createContext({ window, document, React, URL, URLSearchParams, Intl, console, crypto: webcrypto,
    ReactDOM: { createRoot: () => ({ render(node: ReactTypes.ReactNode) { element = node } }) },
  })
  const inlineBootstrap = `window.SPARKLE_HERO_THEMES=${JSON.stringify({ [data.appearancePreset]: theme })};` + bootstrap
  new Script(inlineBootstrap).runInContext(context, { timeout: 300 })
  for (const script of runtimeScripts(page)) script.runInContext(context, { timeout: 300 })
  context.renderHomepageMarkup = () => renderToString(element)
  const markupStarted = performance.now()
  const rendered = new Script('renderHomepageMarkup()').runInContext(context, { timeout: 500 }) as string
  console.info('homepage_ssr_markup', JSON.stringify({ renderToStringMs: performance.now() - markupStarted }))
  const preloads = [...rendered.matchAll(/<link\b[^>]*rel="preload"[^>]*\/>/g)].map(match => match[0]).join('')
  const markup = rendered.replace(/<link\b[^>]*rel="preload"[^>]*\/>/g, '')
  new Script('window.SPARKLE_APPLY_PAGE_THEME(window.' + ({ homepage: 'HOMEPAGE', trade: 'TRADE', join: 'JOIN' }[page]) + '_TWEAK_DEFAULTS, document)').runInContext(context, { timeout: 100 })
  // The client hides the reverse ticker for an empty board. Use the state
  // computed by that same React tree before first paint, rather than waiting
  // for its effect and shifting the entire page upward after hydration.
  if (page === 'trade' && markup.includes('data-trade-board-empty="true"')) body.classList.add('dance-floor-empty')
  const style = Array.from(properties, ([key, value]) => `${key}:${value}`).join(';')
  const allowedCss = new Set(['tokens.css', 'components.css', 'homepage.css', page + '.css', ...theme.css,
    ...(data.homepage.publicSiteVariant === 'britt_with_bling_hybrid' ? ['britt-hero-buttons.css'] : [])])
  const fontMarkup = utilityPageFonts(properties,
    [...allowedCss].map(name => homepageStyles[name as keyof typeof homepageStyles]).join('\n'), data.appearancePreset)
  let result = html.replace(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"?]+)[^"]*"[^>]*>/g,
    (_tag, href: string) => {
      const name = href.split('/').at(-1) ?? ''
      return allowedCss.has(name) ? `<style data-ssr-style="${name}">${responsiveHeroCss(homepageStyles[name as keyof typeof homepageStyles], page === 'homepage' && data.appearancePreset === 'sunset_beach')}</style>` : ''
    })
  // No split CSS, provider runtime loader, or third-party worker. The pinned
  // font faces above are already available when the browser lays out the hero.
  result = result.replace(/<script\b[^>]*src="[^"]+"[^>]*><\/script>/g, tag => {
    if (tag.includes('data-template-src=')) return `<script>${inlineBootstrap.replace(/<\/script/gi, '<\\/script')}</script>`
    const src = tag.match(/\bsrc="([^"]+)"/)?.[1] ?? ''
    if (/unpkg.com\/(?:react|@babel)/.test(src)) return ''
    const name = src.split('/').at(-1)?.split('?')[0]
    if (name === 'tweaks-panel.jsx') return '<script defer src="/amethyst/compiled/react.js"></script><script defer src="/amethyst/compiled/tweaks-panel.js"></script>'
    if (name === page + '.jsx') return '<script defer src="/amethyst/compiled/' + page + '.js"></script>'
    if (name === 'join-runtime.js') return '<script defer src="/amethyst/compiled/react.js"></script><script defer src="/amethyst/compiled/tweaks-panel.js"></script><script defer src="/amethyst/compiled/join.js"></script>'
    if (['live-lineup.js', 'responsive-image.js', 'sparkle-suite-footer-credit.js', 'dance-floor-ticker-label.js'].includes(name ?? '')) return tag.replace('<script ', '<script defer ')
    if (name === theme.script) return tag.replace(src, src.replace('/amethyst/', '/amethyst/ssr-motion/')).replace('<script ', '<script defer ')
    if (src.startsWith('/amethyst/')) return ''
    return tag // Preserve the original analytics tags exactly once.
  })
  const mileHighFizzControls = page === 'homepage' && data.homepage.publicSiteVariant === 'mile_high_fizz_hybrid' ? earlyMileHighFizzControls : ''
  return result
    .replace('</body>', ('ssrReview' in data ? '<aside data-ssr-review-label>Smoke demo · theme/layout review fixture · no saved changes</aside>' : '') + '</body>')
    .replace('</head>', fontMarkup + heroImagePreload(markup, data.appearancePreset) + preloads + `<style data-ssr-style="ssr-hero-motion.css">${homepageStyles['ssr-hero-motion.css']}</style><script>window.SPARKLE_FIRST_PAINT=${JSON.stringify(firstPaint)}</script></head>`)
    .replace(/<html\b([^>]*)>/, (_match, attrs) => `<html${attrs} style="${escapeAttribute(style)}">`)
    .replace('<body class="' + (page === 'homepage' ? 'homepage' : page + 'page') + '">', `<body class="${escapeAttribute(body.className)}">`)
    .replace(/<div id="root">(?:[\s\S]*?<\/main>)?<\/div>/, () => `<div id="root" data-server-rendered="true">${markup}</div><script>${earlyHomepageLocalTime}${earlyHomepageControls}${mileHighFizzControls}</script>`)
}
