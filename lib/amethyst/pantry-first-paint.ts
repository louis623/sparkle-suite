import { webcrypto } from 'node:crypto'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { Script, createContext } from 'node:vm'
import type * as ReactTypes from 'react'
import type { AmethystPantryTemplateData } from './pantry-template-data'
import styles from './generated/homepage-styles.json'
import runtimeSources from './generated/page-runtimes.json'
import fonts from './generated/utility-fonts.json'
import { utilityPageFonts } from './utility-page-fonts'

const escapeAttribute = (value: string) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
let runtime: Script[] | undefined

/** Receives the frozen Pantry.html shell after the normal metadata rewrite. */
export async function renderAmethystPantryFirstPaint(html: string, bootstrapScript: string, data: AmethystPantryTemplateData) {
  const { React, renderToString } = createRequire(join(process.cwd(), 'package.json'))('./lib/amethyst/generated/homepage-server.cjs') as {
    React: typeof ReactTypes; renderToString: (element: ReactTypes.ReactNode) => string
  }
  runtime ??= ['responsive-image.js', 'compiled/pantry.js'].map(name =>
    new Script(runtimeSources[name as keyof typeof runtimeSources], { filename: name }))
  const properties = new Map<string, string>()
  const body = { className: 'bk-pantry-page', classList: { add(...names: string[]) { body.className += ' ' + names.join(' ') } } }
  const document = { body, documentElement: { style: { setProperty(name: string, value: unknown) { properties.set(name, String(value)) } } }, getElementById: () => ({}) }
  let element: ReactTypes.ReactNode
  const context = createContext({ window: { React }, document, React, URL, URLSearchParams, console, crypto: webcrypto,
    ReactDOM: { createRoot: () => ({ render(node: ReactTypes.ReactNode) { element = node } }) } })
  new Script(bootstrapScript).runInContext(context, { timeout: 300 })
  for (const script of runtime) script.runInContext(context, { timeout: 300 })
  context.renderPantryMarkup = () => renderToString(element)
  const rendered = new Script('renderPantryMarkup()').runInContext(context, { timeout: 500 }) as string
  new Script('window.SPARKLE_APPLY_PAGE_THEME(window.AMETHYST_PANTRY_TEMPLATE_DATA, document)').runInContext(context, { timeout: 100 })
  const cssNames = ['tokens.css', 'components.css', 'pantry.css'] as const
  // The font utility shares Home's property names; the page keeps its own vars.
  const fontProperties = new Map([
    ['--hp-display-font', properties.get('--bk-heading-font')!],
    ['--hp-body-font', properties.get('--bk-body-font')!],
  ])
  const primaryFamilies = [...fontProperties.values()].map(value => value.split(',')[0].replaceAll('"', '').trim())
  const embeddedFonts = primaryFamilies.every(family => Object.hasOwn(fonts, family))
  const fontMarkup = embeddedFonts ? utilityPageFonts(fontProperties, '', data.appearancePreset) : ''
  if (!embeddedFonts) console.info('pantry_ssr_fonts', 'Using original Google Fonts display=swap fallback')
  const preloads = [...rendered.matchAll(/<link\b[^>]*rel="preload"[^>]*\/>/g)].map(match => match[0]).join('')
  const markup = rendered.replace(/<link\b[^>]*rel="preload"[^>]*\/>/g, '')
  let result = html.replace(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"?]+)[^"]*"[^>]*\/?\s*>/g, (tag, href: string) => {
    const name = href.split('/').at(-1) as typeof cssNames[number]
    if (cssNames.includes(name)) return `<style data-ssr-style="${name}">${styles[name]}</style>`
    return !embeddedFonts && href.startsWith('https://fonts.googleapis.com/') ? tag : ''
  })
  result = result.replace(/<link\b[^>]*rel="preconnect"[^>]*\/?\s*>/g, '')
  result = result.replace(/<script\b[^>]*src="[^"]+"[^>]*><\/script>/g, tag => {
    if (tag.includes('data-template-src=')) return `<script>${bootstrapScript.replace(/<\/script/gi, '<\\/script')}</script>`
    const src = tag.match(/\bsrc="([^"]+)"/)?.[1] ?? ''
    if (src.includes('responsive-image.js')) return '<script defer src="/amethyst/responsive-image.js"></script>'
    if (src.includes('pantry.jsx')) return '<script defer src="/amethyst/compiled/react.js"></script><script defer src="/amethyst/compiled/pantry.js"></script>'
    if (/unpkg.com\/(?:react|@babel)/.test(src)) return ''
    return tag
  })
  const style = Array.from(properties, ([key, value]) => `${key}:${value}`).join(';')
  return result.replace('</title>', '</title>' + fontMarkup)
    .replace('</head>', preloads + '</head>')
    .replace(/<html\b([^>]*)>/, (_match, attrs) => `<html${attrs} style="${escapeAttribute(style)}">`)
    .replace('<body class="bk-pantry-page">', `<body class="${escapeAttribute(body.className)}">`)
    .replace(/<div id="root">[\s\S]*?<\/div>\s*(?=<script)/, () => `<div id="root" data-server-rendered="true">${markup}</div>\n`)
}
