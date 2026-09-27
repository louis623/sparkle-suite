// Regenerates Portfolio carousel peeks from the local Homepage template.
// Forces each show's custom theme. Refuses live public-site hosts.
// Run with Playwright installed: npx tsx scripts/capture-portfolio-peeks.ts
import { createRequire } from 'node:module'
import { createServer, type Server } from 'node:http'
import { createReadStream, existsSync, mkdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join, normalize } from 'node:path'
import { spawnSync } from 'node:child_process'

import { buildAmethystHomepageBootstrapScript, defaultAmethystHomepageTemplateData, type AmethystHomepageTemplateData } from '@/lib/amethyst/homepage-template-data'
import type { AmethystAppearancePresetId } from '@/lib/amethyst/appearance-presets'
import { applyBlingKitchenHomepage } from '@/lib/bling-kitchen/profile'
import { applyBrittWithBlingHomepage } from '@/lib/britt-with-bling/profile'
import { applyMileHighFizzHomepage } from '@/lib/mile-high-fizz/profile'

const require = createRequire(import.meta.url)
const playwrightPackage = 'playwright'
const { chromium } = require(playwrightPackage) as {
  chromium: {
    launch: (options?: { args?: string[] }) => Promise<{
      close: () => Promise<void>
      newContext: (options: Record<string, unknown>) => Promise<{
        newPage: () => Promise<CapturePage>
        close: () => Promise<void>
      }>
    }>
  }
}

type CapturePage = {
  goto: (url: string, options: { waitUntil: 'load'; timeout: number }) => Promise<unknown>
  waitForSelector: (selector: string, options: { timeout: number }) => Promise<unknown>
  waitForFunction: (fn: () => boolean, options: { timeout: number }) => Promise<unknown>
  addStyleTag: (options: { content: string }) => Promise<unknown>
  evaluate: (fn: () => void) => Promise<void>
  screenshot: (options: { path: string; clip: { x: number; y: number; width: number; height: number } }) => Promise<unknown>
}

const ROOT = process.cwd()
const PUBLIC_DIR = join(ROOT, 'public')
const OUT_DIR = join(PUBLIC_DIR, 'sparkle-suite', 'portfolio')
const BLOCKED_HOSTS = [
  'milehighfizz.com',
  'brittwithbling.com',
  'theblingkitchen.com',
  'goforthebling.com',
  'sparklybutterflies.com',
  'yoursparklesuite.com',
]

const CONTENT_TYPES: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.jsx': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.mp4': 'video/mp4',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
}

type CaptureSpec = {
  id: string
  preset: AmethystAppearancePresetId
  homepage: AmethystHomepageTemplateData
  desktop: boolean
}

function stillHomepage(homepage: AmethystHomepageTemplateData): AmethystHomepageTemplateData {
  return { ...homepage, heroMotion: 'still' }
}

function communityHomepage(): AmethystHomepageTemplateData {
  return stillHomepage(defaultAmethystHomepageTemplateData)
}

const captures: CaptureSpec[] = [
  {
    id: 'mile-high-fizz',
    preset: 'alpine_opal',
    desktop: false,
    homepage: applyMileHighFizzHomepage(stillHomepage({
      ...defaultAmethystHomepageTemplateData,
      repName: 'Lindsey',
      businessName: 'Mile High Fizz',
      teamName: 'Diamond Peak Society',
      heroHeadlineOverride: 'Mile High Fizz',
    })),
  },
  {
    id: 'britt-with-bling',
    preset: 'black_diamond',
    desktop: false,
    homepage: applyBrittWithBlingHomepage(stillHomepage({
      ...defaultAmethystHomepageTemplateData,
      repName: 'Brittany',
      businessName: 'Britt with Bling',
      teamName: 'The Virtuous Fizzers',
      danceFloorComingSoon: true,
      heroHeadlineOverride: 'Britt with Bling',
    })),
  },
  {
    id: 'blingkitchen',
    preset: 'moonstone',
    desktop: false,
    homepage: applyBlingKitchenHomepage(stillHomepage(defaultAmethystHomepageTemplateData)),
  },
  {
    id: 'go-for-the-bling',
    preset: 'gnome_garden',
    desktop: false,
    homepage: stillHomepage({
      ...defaultAmethystHomepageTemplateData,
      repName: 'Kim',
      businessName: 'Go for the Bling',
      teamName: 'Go for the Bling',
      heroEyebrow: 'With Kim',
      heroHeadline: 'Go for the Bling',
      heroSub: 'Settle in for live jewelry reveals, woodland sparkle, and a place that feels like home.',
      tagline: 'Woodland sparkle and live reveals with Kim.',
      tickerTopText: 'Welcome to Go for the Bling | Live reveals with Kim | Explore the Dance Floor',
    }),
  },
  {
    id: 'sparkly-butterflies',
    preset: 'neon_butterfly',
    desktop: false,
    homepage: stillHomepage({
      ...defaultAmethystHomepageTemplateData,
      repName: 'Kelly',
      businessName: 'Sparkly Butterflies',
      teamName: 'Sparkly Butterflies',
      heroEyebrow: 'With Kelly',
      heroHeadline: 'Sparkly Butterflies',
      heroSub: 'Live jewelry reveals, electric color, and a welcoming place to find your next favorite.',
      tagline: 'Bright color and live reveals with Kelly.',
      tickerTopText: 'Welcome to Sparkly Butterflies | Live reveals with Kelly | Explore the Dance Floor',
    }),
  },
  { id: 'emerald-garden', preset: 'emerald_garden', desktop: true, homepage: communityHomepage() },
  { id: 'amethyst', preset: 'amethyst', desktop: true, homepage: communityHomepage() },
  { id: 'rose-gold', preset: 'rose_gold', desktop: true, homepage: communityHomepage() },
  {
    id: 'halloween-pumpkin-witch',
    preset: 'halloween_pumpkin_witch',
    desktop: true,
    homepage: stillHomepage({
      ...defaultAmethystHomepageTemplateData,
      businessName: 'Moonlit Pumpkin Sparkle',
      repName: 'Sasha',
      teamName: 'The Moonlight Circle',
      heroEyebrow: 'Meet us beneath the pumpkin moon.',
      heroHeadline: 'A frightfully fun night to sparkle.',
      heroSub: 'Glowing jack-o-lanterns, silver moonlight, and a welcoming place to share the Halloween fun.',
      tagline: 'Bright pumpkins. Moonlit magic. A little mischief in every reveal.',
      tickerTopText: 'A sparkling Halloween is here | Glowing pumpkins and moonlit surprises | Explore the Dance Floor',
    }),
  },
]

function inlineScript(value: string) {
  return value.replace(/<\/script/gi, '<\\/script')
}

async function buildDocument(spec: CaptureSpec, origin: string) {
  const root = join(PUBLIC_DIR, 'amethyst')
  let document = readFileSync(join(root, 'Homepage.html'), 'utf8')
  document = document.replace(/<script\b[^>]*(?:data-template-src|src)="\/api\/amethyst\/[^"]+"[^>]*><\/script>/g, '')
  const runtimeNames = [
    'tweaks-panel.jsx',
    'homepage.jsx',
    'live-lineup.js',
    'neon-butterfly.js',
    'halloween-pumpkin-witch.js',
    'sparkle-suite-footer-credit.js',
  ]
  for (const name of runtimeNames) {
    const escaped = name.replace('.', '\\.')
    const pattern = new RegExp(`<script([^>]*?) src="(?:/amethyst/)?${escaped}(?:\\?[^"]*)?"([^>]*)><\\/script>`, 'g')
    if (!pattern.test(document)) continue
    pattern.lastIndex = 0
    const source = inlineScript(readFileSync(join(root, name), 'utf8'))
    document = document.replace(pattern, (_match, before, after) => `<script${before}${after}>${source}</script>`)
  }
  const bootstrap = buildAmethystHomepageBootstrapScript(spec.homepage, [], spec.preset, { targeted: true })
  const guard = `
    (function () {
      var blocked = ${JSON.stringify(BLOCKED_HOSTS)};
      var original = window.fetch ? window.fetch.bind(window) : null;
      window.fetch = function (input, options) {
        var url = String(input && input.url || input || '');
        var host = '';
        try { host = new URL(url, window.location.origin).hostname; } catch (error) { host = ''; }
        if (blocked.some(function (item) { return host === item || host.endsWith('.' + item); })) {
          throw new Error('Refusing live public host ' + host);
        }
        if (/\\/api\\/amethyst\\/(?:live-lineup|trade-board)(?:[?]|$)/.test(url)) {
          return Promise.resolve(new Response(JSON.stringify({ listings: [], liveQueueState: 'empty', liveQueueEntries: [] }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }));
        }
        if (!original) return Promise.reject(new Error('fetch unavailable'));
        return original(input, options);
      };
    })();
  `
  document = document.replace(
    '<head>',
    `<head><base href="${origin}/amethyst/"><meta name="robots" content="noindex,nofollow">`,
  )
  document = document.replace(
    '<div id="root"></div>',
    `<div id="root"></div><script>${inlineScript(guard)}\n${inlineScript(bootstrap)}</script>`,
  )
  return document
}

function startServer(pages: Map<string, string>) {
  const server = createServer((request, response) => {
    const url = new URL(request.url || '/', 'http://127.0.0.1')
    const page = pages.get(url.pathname)
    if (page) {
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' })
      response.end(page)
      return
    }
    const relative = decodeURIComponent(url.pathname)
    const filePath = normalize(join(PUBLIC_DIR, relative))
    if (!filePath.startsWith(PUBLIC_DIR) || !existsSync(filePath) || statSync(filePath).isDirectory()) {
      response.writeHead(404)
      response.end('not found')
      return
    }
    const stat = statSync(filePath)
    const contentType = CONTENT_TYPES[extname(filePath)] || 'application/octet-stream'
    const range = request.headers.range
    const match = range ? /bytes=(\d+)-(\d*)/.exec(range) : null
    if (match) {
      const start = Number(match[1])
      const end = match[2] ? Number(match[2]) : stat.size - 1
      response.writeHead(206, {
        'content-type': contentType,
        'accept-ranges': 'bytes',
        'content-range': `bytes ${start}-${end}/${stat.size}`,
        'content-length': end - start + 1,
        'cache-control': 'no-store',
      })
      createReadStream(filePath, { start, end }).pipe(response)
      return
    }
    response.writeHead(200, {
      'content-type': contentType,
      'accept-ranges': 'bytes',
      'content-length': stat.size,
      'cache-control': 'no-store',
    })
    createReadStream(filePath).pipe(response)
  })
  return new Promise<{ server: Server; origin: string }>((resolvePromise) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      if (!address || typeof address === 'string') throw new Error('Missing capture server port')
      resolvePromise({ server, origin: `http://127.0.0.1:${address.port}` })
    })
  })
}

function toWebp(pngPath: string, webpPath: string) {
  const result = spawnSync('ffmpeg', [
    '-y',
    '-hide_banner',
    '-loglevel',
    'error',
    '-i',
    pngPath,
    '-c:v',
    'libwebp',
    '-quality',
    '76',
    webpPath,
  ], { stdio: 'inherit' })
  if (result.status !== 0) throw new Error(`ffmpeg failed for ${webpPath}`)
}

async function shoot(
  page: CapturePage,
  origin: string,
  spec: CaptureSpec,
  kind: 'mobile' | 'desktop',
) {
  const viewport = kind === 'mobile'
    ? { width: 390, height: 844 }
    : { width: 1440, height: 820 }
  const url = `${origin}/capture/${spec.id}?viewport=${kind}`
  await page.goto(url, { waitUntil: 'load', timeout: 60000 })
  await page.waitForSelector('h1', { timeout: 30000 })
  await page.waitForFunction(() => {
    const pending = Array.from(document.images).filter((image) => !image.complete || image.naturalWidth === 0)
    const video = document.querySelector('video')
    const videoReady = !video || video.readyState >= 2
    return pending.length === 0 && videoReady
  }, { timeout: 30000 }).catch(() => undefined)
  await page.evaluate(() => {
    document.querySelectorAll('video').forEach((video) => {
      video.pause()
    })
    document.querySelectorAll('button').forEach((button) => {
      if ((button.textContent || '').includes('Pause animation')) button.click()
    })
  })
  await page.addStyleTag({
    content: '*,*::before,*::after{animation:none !important;transition:none !important;caret-color:transparent}',
  })
  const pngPath = join('/tmp/portfolio-peeks', `${spec.id}-${kind}.png`)
  await page.screenshot({
    path: pngPath,
    clip: { x: 0, y: 0, width: viewport.width, height: viewport.height },
  })
  const webpPath = join(OUT_DIR, `${spec.id}-${kind}.webp`)
  toWebp(pngPath, webpPath)
  console.log(`${spec.id} ${kind} ${viewport.width}x${viewport.height} -> ${webpPath}`)
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true })
  mkdirSync('/tmp/portfolio-peeks', { recursive: true })
  const pages = new Map<string, string>()
  const { server, origin } = await startServer(pages)
  for (const spec of captures) {
    pages.set(`/capture/${spec.id}`, await buildDocument(spec, origin))
  }
  const browser = await chromium.launch({ args: ['--hide-scrollbars'] })
  try {
    for (const spec of captures) {
      for (const kind of spec.desktop ? (['mobile', 'desktop'] as const) : (['mobile'] as const)) {
        const viewport = kind === 'mobile'
          ? { width: 390, height: 844 }
          : { width: 1440, height: 820 }
        const context = await browser.newContext({
          viewport,
          deviceScaleFactor: 1,
          reducedMotion: 'reduce',
          colorScheme: 'light',
        })
        const page = await context.newPage()
        await shoot(page, origin, spec, kind)
        await context.close()
      }
    }
  } finally {
    await browser.close()
    await new Promise<void>((done) => server.close(() => done()))
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
