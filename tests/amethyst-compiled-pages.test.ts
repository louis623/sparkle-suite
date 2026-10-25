import { execSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { defaultAmethystHomepageTemplateData } from '@/lib/amethyst/homepage-template-data'
import { defaultAmethystJoinTemplateData } from '@/lib/amethyst/join-template-data'
import { defaultAmethystTradeTemplateData } from '@/lib/amethyst/trade-template-data'

vi.mock('@/lib/amethyst/preview-template-data', async () => {
  const actual = await vi.importActual<
    typeof import('@/lib/amethyst/preview-template-data')
  >('@/lib/amethyst/preview-template-data')
  const homepage = await import('@/lib/amethyst/homepage-template-data')
  const trade = await import('@/lib/amethyst/trade-template-data')
  const join = await import('@/lib/amethyst/join-template-data')
  return {
    ...actual,
    loadAmethystPreviewTemplateData: vi.fn(async () => ({
      appearancePreset: 'amethyst' as const,
      homepage: homepage.defaultAmethystHomepageTemplateData,
      trade: trade.defaultAmethystTradeTemplateData,
      join: join.defaultAmethystJoinTemplateData,
    })),
  }
})

import { GET } from '@/app/amethyst/[...asset]/route'

const COMPILED = [
  'tweaks-panel.js',
  'homepage.js',
  'trade.js',
  'pantry.js',
] as const

const PAGES = [
  {
    html: 'Homepage.html',
    page: 'homepage',
    loader: 'template-loader.js?v=20260928-lineup-always-on',
    scripts: ['tweaks-panel.js', 'homepage.js'],
  },
  {
    html: 'Trade.html',
    page: 'trade',
    loader: 'template-loader.js?v=20260928-lineup-always-on',
    scripts: ['tweaks-panel.js', 'trade.js'],
  },
  {
    html: 'Pantry.html',
    page: 'pantry',
    loader: 'template-loader.js',
    scripts: ['pantry.js'],
  },
] as const

function compiledPath(name: string) {
  return resolve(process.cwd(), 'public/amethyst/compiled', name)
}

function contentHash(name: string) {
  return createHash('sha256').update(readFileSync(compiledPath(name))).digest('hex').slice(0, 16)
}

function pageHtml(name: string) {
  return readFileSync(resolve(process.cwd(), 'public/amethyst', name), 'utf8')
}

describe('precompiled customer pages', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '')
  })

  it('rebuilds the committed esbuild transforms without imports, exports, or jsx-runtime', () => {
    const script = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8')).scripts['build:amethyst:pages'] as string
    expect(script).toContain('--loader:.jsx=jsx')
    expect(script).toContain('--jsx=transform')
    expect(script).toContain('--jsx-factory=React.createElement')
    expect(script).toContain('--jsx-fragment=React.Fragment')
    expect(script).toContain("--tsconfig-raw='{}'")
    expect(script).toContain('--minify')
    expect(script).toContain('--target=es2019')
    expect(script).not.toContain('--bundle')
    expect(script).not.toContain('--format')

    const before = Object.fromEntries(COMPILED.map((name) => [name, readFileSync(compiledPath(name))]))
    execSync('npm run build:amethyst:pages', { cwd: process.cwd(), stdio: 'pipe' })
    for (const name of COMPILED) {
      const source = readFileSync(compiledPath(name))
      expect(source.equals(before[name]), name).toBe(true)
      const text = source.toString('utf8')
      expect(text, name).not.toMatch(/\bimport\b/)
      expect(text, name).not.toMatch(/\bexport\b/)
      expect(text, name).not.toContain('jsx-runtime')
      expect(text, name).toContain('React.createElement')
    }
  })

  it('loads classic compiled scripts after the template loader and keeps the server text block', async () => {
    for (const page of PAGES) {
      const html = pageHtml(page.html)
      expect(html, page.html).not.toContain('babel')
      expect(html, page.html).not.toContain('react.development')
      expect(html, page.html).not.toContain('type="text/babel"')
      expect(html, page.html).toContain('<div id="root"></div>')
      expect(html, page.html).not.toContain('class="public-index"')

      const loaderAt = html.indexOf(page.loader)
      expect(loaderAt, page.html).toBeGreaterThan(-1)
      let previous = -1
      for (const name of page.scripts) {
        const src = `/amethyst/compiled/${name}?v=${contentHash(name)}`
        const tag = `<script src="${src}"></script>`
        expect(html, page.html).toContain(tag)
        const at = html.indexOf(tag)
        expect(at, name).toBeGreaterThan(previous)
        previous = at
        if (name !== 'tweaks-panel.js') {
          expect(loaderAt, name).toBeLessThan(at)
        }
      }

      const response = await GET(
        new Request(`https://preview.example/amethyst/${page.html}?c=rep-compiled`),
        { params: Promise.resolve({ asset: [page.html] }) },
      )
      const served = await response.text()
      expect(response.status).toBe(200)
      expect(served).toContain(`<main class="public-index" data-page="${page.page === 'trade' ? 'dance-floor' : page.page === 'pantry' ? 'pantry' : 'home'}">`)
      expect(served).toContain(page.loader.startsWith('template-loader.js?')
        ? 'src="/amethyst/template-loader.js?v=20260928-lineup-always-on"'
        : 'src="/amethyst/template-loader.js"')
      const servedLoaderAt = served.indexOf('/amethyst/template-loader.js')
      for (const name of page.scripts) {
        const src = `/amethyst/compiled/${name}?v=${contentHash(name)}`
        expect(served).toContain(`<script src="${src}"></script>`)
        if (name !== 'tweaks-panel.js') {
          expect(servedLoaderAt).toBeLessThan(served.indexOf(src))
        }
      }
    }

    expect(defaultAmethystHomepageTemplateData.businessName).toBeTruthy()
    expect(defaultAmethystTradeTemplateData.businessName).toBeTruthy()
    expect(defaultAmethystJoinTemplateData.businessName).toBeTruthy()
  })

  it('serves the compiled files from the Amethyst asset allowlist', async () => {
    for (const name of COMPILED) {
      const response = await GET(
        new Request(`https://preview.example/amethyst/compiled/${name}`),
        { params: Promise.resolve({ asset: ['compiled', name] }) },
      )
      expect(response.status, name).toBe(200)
      expect(response.headers.get('content-type')).toContain('text/javascript')
      expect(Buffer.from(await response.arrayBuffer()).equals(readFileSync(compiledPath(name)))).toBe(true)
    }
  })
})
