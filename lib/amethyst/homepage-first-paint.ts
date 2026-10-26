import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { Script, createContext } from 'node:vm'
import { createRequire } from 'node:module'
import type * as ReactTypes from 'react'
import type { AmethystPreviewTemplateData } from './preview-template-data'
import { buildAmethystHomepageBootstrapScript } from './homepage-template-data'
import { selectHomepageThemeAssets, inlineHomepageStyles, inlineHomepageFonts } from './homepage-theme-assets'
import { pageFacts } from './public-page-index-html'
import { bestEffortHomepage } from './homepage-render-safety'

const { React, renderToString } = createRequire(join(process.cwd(), 'package.json'))('./lib/amethyst/generated/homepage-server.cjs') as {
  React: typeof ReactTypes
  renderToString: (element: ReactTypes.ReactNode) => string
}

// Only repository-owned, precompiled code is evaluated. Each request receives
// its own globals; no rep data or rendered HTML is cached between requests.
let scripts: Promise<Script[]> | undefined
function runtimeScripts() {
  return scripts ??= Promise.all([
    'compiled/tweaks-panel.js', 'dance-floor-ticker-label.js', 'live-lineup.js', 'responsive-image.js', 'sparkle-suite-footer-credit.js', 'compiled/homepage.js',
  ].map(async name => new Script(await readFile(join(process.cwd(), 'public/amethyst', name), 'utf8'), { filename: name })))
}

function attribute(value: string) {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export async function renderHomepageFirstPaint(html: string, data: AmethystPreviewTemplateData, requestUrl: URL, bootstrap?: string, options: { deferExternalScripts?: boolean } = {}) {
  return await bestEffortHomepage(() => renderFirstPaint(html, data, requestUrl, bootstrap, options)) ?? html
}

async function renderFirstPaint(html: string, data: AmethystPreviewTemplateData, requestUrl: URL, bootstrap?: string, options: { deferExternalScripts?: boolean } = {}) {
  const publicIdentity = pageFacts(data)
  const properties = new Map<string, string>()
  const body = { className: 'homepage', classList: { add(...names: string[]) { body.className += ' ' + names.join(' ') } } }
  const document = { body, documentElement: { style: { setProperty(name: string, value: unknown) { properties.set(name, String(value)) } } }, getElementById: () => ({}) }
  let element: ReactTypes.ReactNode
  const { locale, timeZone } = new Intl.DateTimeFormat().resolvedOptions()
  const firstPaint = { locale, timeZone, now: Date.now() }
  const window = { React, AMETHYST_PUBLIC_IDENTITY: publicIdentity, SPARKLE_FIRST_PAINT: firstPaint, location: { search: requestUrl.search, origin: requestUrl.origin, hostname: requestUrl.hostname } }
  const context = createContext({
    window, document, React, URL, URLSearchParams, Intl, console,
    ReactDOM: { createRoot: () => ({ render(node: ReactTypes.ReactNode) { element = node } }) },
  })
  new Script(bootstrap ?? buildAmethystHomepageBootstrapScript(data.homepage, [], data.appearancePreset, { targeted: true })).runInContext(context, { timeout: 1000 })
  for (const script of await runtimeScripts()) script.runInContext(context, { timeout: 1000 })
  // React's server renderer emits resource hints ahead of the tree. Keep them
  // in <head>, outside the node hydrated by the classic browser React runtime.
  // Keep component execution inside the VM's CPU deadline as well as bootstrap.
  context.renderHomepageMarkup = () => renderToString(element)
  const rendered = new Script('renderHomepageMarkup()').runInContext(context, { timeout: 1000 }) as string
  const preloads = [...rendered.matchAll(/<link\b[^>]*rel="preload"[^>]*\/>/g)].map(match => match[0]).join('')
  const markup = rendered.replace(/<link\b[^>]*rel="preload"[^>]*\/>/g, '')
  new Script('applyHomepageTheme(window.HOMEPAGE_TWEAK_DEFAULTS, document)').runInContext(context, { timeout: 1000 })
  const style = Array.from(properties, ([key, value]) => `${key}:${value}`).join(';')
  const preset = new Script('window.HOMEPAGE_TWEAK_DEFAULTS.preset').runInContext(context) as string
  const variant = new Script('window.AMETHYST_HOMEPAGE_TEMPLATE_DATA.publicSiteVariant').runInContext(context) as string | undefined
  const fonts = [properties.get('--hp-display-font') ?? '', properties.get('--hp-body-font') ?? '']
  const heading = { family: fonts[0].split(',')[0].replaceAll('"', '').trim().toLowerCase(), weight: Number(properties.get('--hp-heading-weight')) }
  const themedHtml = await inlineHomepageFonts(await inlineHomepageStyles(selectHomepageThemeAssets(html, preset, variant, fonts), preset, heading, body.className.split(/\s+/), variant), fonts, heading.weight)
  const withBootstrap = bootstrap ? themedHtml.replace(/<script\b[^>]*data-template-src="[^"]+"[^>]*><\/script>/, () => `<script>${bootstrap.replace(/<\/script/gi, '<\\/script')}</script>`) : themedHtml
  // The complete bootstrap is already inline and independent of React. Fetch
  // classic dependencies in parallel; defer preserves their execution order.
  // Give the already complete server page a paint before React and the theme
  // controllers execute. Async=false preserves classic dependency order while
  // the browser fetches all dependencies concurrently. This needs no gesture.
  const withOrderedScripts = bootstrap && options.deferExternalScripts !== false
    ? withBootstrap.replace(/<script\s+src=/g, '<script type="application/x-sparkle-runtime" data-runtime-src=')
      .replace('</body>', '<script>(function(){var started=false;function start(){if(started)return;started=true;document.querySelectorAll("script[data-runtime-src]").forEach(function(source){var script=document.createElement("script");script.async=false;Array.from(source.attributes).forEach(function(a){if(a.name!=="type"&&a.name!=="data-runtime-src")script.setAttribute(a.name,a.value)});script.src=source.getAttribute("data-runtime-src");script.fetchPriority="low";document.head.appendChild(script)})}if(window.sparkleAfterHomepageStyles)window.sparkleAfterHomepageStyles(start);else if(window.sparkleAfterHeroPaint)window.sparkleAfterHeroPaint(start);else if(document.hidden)start();else requestAnimationFrame(function(){setTimeout(start,0)})})();</script></body>')
    : withBootstrap
  return withOrderedScripts
    .replace('</head>', preloads + `<script>window.AMETHYST_PUBLIC_IDENTITY=${JSON.stringify(publicIdentity).replace(/</g, '\\u003c')};window.SPARKLE_FIRST_PAINT=${JSON.stringify(firstPaint)}</script></head>`)
    .replace(/<html\b([^>]*)>/, (_match, attrs) => `<html${attrs} style="${attribute(style)}">`)
    .replace('<body class="homepage">', () => `<body class="${attribute(body.className)}">`)
    .replace(/<div id="root">(?:[\s\S]*?<\/main>)?<\/div>/, () => `<div id="root" data-server-rendered="true">${markup}</div>`)
}
