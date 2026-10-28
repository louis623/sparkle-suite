import { earlyHomepageLocalTime } from './homepage-local-time'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { Script, createContext } from 'node:vm'
import { createRequire } from 'node:module'
import type * as ReactTypes from 'react'
import type { AmethystPreviewTemplateData } from './preview-template-data'

let scripts: Promise<Script[]> | undefined
function runtimeScripts() {
  return scripts ??= Promise.all([
    'compiled/tweaks-panel.js', 'dance-floor-ticker-label.js', 'live-lineup.js',
    'responsive-image.js', 'sparkle-suite-footer-credit.js', 'compiled/homepage.js',
  ].map(async name => new Script(await readFile(join(process.cwd(), 'public/amethyst', name), 'utf8'), { filename: name })))
}
// Prepare immutable code once as soon as this module is imported.
const runtimeInitStarted = performance.now()
const preparedRuntime = Promise.resolve().then(async () => {
  const { React, renderToString } = createRequire(join(process.cwd(), 'package.json'))('./lib/amethyst/generated/homepage-server.cjs') as {
    React: typeof ReactTypes; renderToString: (element: ReactTypes.ReactNode) => string
  }
  const bundleMs = performance.now() - runtimeInitStarted
  await runtimeScripts()
  console.info('homepage_ssr_runtime', JSON.stringify({ bundleMs, preparedMs: performance.now() - runtimeInitStarted }))
  return { React, renderToString }
})
// Import-time failures are handled by the request's safety boundary.
void preparedRuntime.catch(() => {})
const escapeAttribute = (value: string) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

// Native links already work before hydration. Pumpkin Cat has no Sound or menu
// toggle on pinned Live; adding either would change the approved presentation.
export const earlyHomepageControls = `(function(){
var ready=false,button=document.querySelector('.hpc-motion-control'),video=document.querySelector('.hpc-video');
var wanted=button?.getAttribute('aria-pressed')==='true';
function update(){if(!button||!video)return;button.textContent=wanted?'Pause animation':'Play animation';button.setAttribute('aria-pressed',String(wanted));if(wanted&&!document.hidden)video.play().catch(function(){});else video.pause()}
function click(e){if(ready||!e.target.closest('.hpc-motion-control'))return;e.preventDefault();e.stopImmediatePropagation();wanted=!wanted;update()}
document.addEventListener('click',click,true);
window.sparkleEarlyMotion=function(){return wanted};
if(video){video.muted=true;if(matchMedia('(prefers-reduced-motion:reduce)').matches)wanted=false;update()}
window.addEventListener('sparkle:homepage-hydrated',function(){ready=true;document.removeEventListener('click',click,true)},{once:true});
})();`

/** Called only inside the bounded best-effort boundary. Failure leaves Live HTML intact. */
export async function renderHomepageFirstPaint(html: string, data: AmethystPreviewTemplateData, requestUrl: URL, bootstrap: string) {
  if (data.appearancePreset !== 'halloween_pumpkin_cat') throw new Error('Chunk 1 requires the approved Pumpkin Cat theme')
  const { React, renderToString } = await preparedRuntime
  const properties = new Map<string, string>()
  const body = { className: 'homepage', classList: { add(...names: string[]) { body.className += ' ' + names.join(' ') } } }
  const document = { body, documentElement: { style: { setProperty(name: string, value: unknown) { properties.set(name, String(value)) } } }, getElementById: () => ({}) }
  let element: ReactTypes.ReactNode
  const firstPaint = { serverClock: true, now: Date.now() }
  const window = { React, SPARKLE_FIRST_PAINT: firstPaint, location: { search: requestUrl.search, origin: requestUrl.origin, hostname: requestUrl.hostname } }
  const context = createContext({ window, document, React, URL, URLSearchParams, Intl, console,
    ReactDOM: { createRoot: () => ({ render(node: ReactTypes.ReactNode) { element = node } }) },
  })
  const inlineBootstrap = bootstrap
  new Script(inlineBootstrap).runInContext(context, { timeout: 300 })
  for (const script of await runtimeScripts()) script.runInContext(context, { timeout: 300 })
  context.renderHomepageMarkup = () => renderToString(element)
  const markupStarted = performance.now()
  const rendered = new Script('renderHomepageMarkup()').runInContext(context, { timeout: 500 }) as string
  console.info('homepage_ssr_markup', JSON.stringify({ renderToStringMs: performance.now() - markupStarted }))
  const preloads = [...rendered.matchAll(/<link\b[^>]*rel="preload"[^>]*\/>/g)].map(match => match[0]).join('')
  const markup = rendered.replace(/<link\b[^>]*rel="preload"[^>]*\/>/g, '')
  new Script('applyHomepageTheme(window.HOMEPAGE_TWEAK_DEFAULTS, document)').runInContext(context, { timeout: 100 })
  const style = Array.from(properties, ([key, value]) => `${key}:${value}`).join(';')
  const allowedCss = new Set(['tokens.css', 'components.css', 'homepage.css', 'halloween-pumpkin-cat.css'])
  let result = html.replace(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"?]+)[^"]*"[^>]*>/g,
    (tag, href: string) => allowedCss.has(href.split('/').at(-1) ?? '') ? tag : '')
  // No split CSS, self-hosted fonts, runtime loader, or third-party worker.
  result = result.replace(/<script\b[^>]*src="[^"]+"[^>]*><\/script>/g, tag => {
    if (tag.includes('data-template-src=')) return `<script>${inlineBootstrap.replace(/<\/script/gi, '<\\/script')}</script>`
    const src = tag.match(/\bsrc="([^"]+)"/)?.[1] ?? ''
    if (/unpkg.com\/(?:react|@babel)/.test(src)) return ''
    const name = src.split('/').at(-1)?.split('?')[0]
    if (name === 'tweaks-panel.jsx') return '<script defer src="/amethyst/compiled/react.js"></script><script defer src="/amethyst/compiled/tweaks-panel.js"></script>'
    if (name === 'homepage.jsx') return '<script defer src="/amethyst/compiled/homepage.js"></script>'
    if (['live-lineup.js', 'responsive-image.js', 'sparkle-suite-footer-credit.js', 'dance-floor-ticker-label.js'].includes(name ?? '')) return tag.replace('<script ', '<script defer ')
    if (src.startsWith('/amethyst/')) return ''
    return tag // Preserve the original analytics tags exactly once.
  })
  return result
    .replace('</head>', preloads + `<script>window.SPARKLE_FIRST_PAINT=${JSON.stringify(firstPaint)}</script></head>`)
    .replace(/<html\b([^>]*)>/, (_match, attrs) => `<html${attrs} style="${escapeAttribute(style)}">`)
    .replace('<body class="homepage">', `<body class="${escapeAttribute(body.className)}">`)
    .replace(/<div id="root">(?:[\s\S]*?<\/main>)?<\/div>/, () => `<div id="root" data-server-rendered="true">${markup}</div><script>${earlyHomepageLocalTime}${earlyHomepageControls}</script>`)
}
