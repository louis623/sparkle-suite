import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { Script, createContext } from 'node:vm'
import { createRequire } from 'node:module'
import type * as ReactTypes from 'react'
import type { AmethystPreviewTemplateData } from './preview-template-data'
import { buildAmethystHomepageBootstrapScript } from './homepage-template-data'
import { selectHomepageThemeAssets } from './homepage-theme-assets'

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

export async function renderHomepageFirstPaint(html: string, data: AmethystPreviewTemplateData, requestUrl: URL, bootstrap?: string) {
  const properties = new Map<string, string>()
  const body = { className: 'homepage', classList: { add(...names: string[]) { body.className += ' ' + names.join(' ') } } }
  const document = { body, documentElement: { style: { setProperty(name: string, value: unknown) { properties.set(name, String(value)) } } }, getElementById: () => ({}) }
  let element: ReactTypes.ReactNode
  const window = { React, location: { search: requestUrl.search, origin: requestUrl.origin, hostname: requestUrl.hostname } }
  const context = createContext({
    window, document, React, URL, URLSearchParams, Intl, console,
    ReactDOM: { createRoot: () => ({ render(node: ReactTypes.ReactNode) { element = node } }) },
  })
  new Script(bootstrap ?? buildAmethystHomepageBootstrapScript(data.homepage, [], data.appearancePreset, { targeted: true })).runInContext(context, { timeout: 1000 })
  for (const script of await runtimeScripts()) script.runInContext(context, { timeout: 1000 })
  const markup = renderToString(element)
  new Script('applyHomepageTheme(window.HOMEPAGE_TWEAK_DEFAULTS, document)').runInContext(context, { timeout: 1000 })
  const style = Array.from(properties, ([key, value]) => `${key}:${value}`).join(';')
  const preset = new Script('window.HOMEPAGE_TWEAK_DEFAULTS.preset').runInContext(context) as string
  const themedHtml = selectHomepageThemeAssets(html, preset)
  const withBootstrap = bootstrap ? themedHtml.replace(/<script\b[^>]*data-template-src="[^"]+"[^>]*><\/script>/, () => `<script>${bootstrap.replace(/<\/script/gi, '<\\/script')}</script>`) : themedHtml
  return withBootstrap
    .replace(/<html\b([^>]*)>/, (_match, attrs) => `<html${attrs} style="${attribute(style)}">`)
    .replace('<body class="homepage">', () => `<body class="${attribute(body.className)}">`)
    .replace(/<div id="root">(?:[\s\S]*?<\/main>)?<\/div>/, () => `<div id="root" data-server-rendered="true">${markup}</div>`)
}
