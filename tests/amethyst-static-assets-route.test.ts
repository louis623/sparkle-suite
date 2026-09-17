import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

vi.mock('@/lib/amethyst/join-page-access', () => ({
  canServeTargetedAmethystJoinPage: vi.fn(async () => true),
}))

import { GET } from '@/app/amethyst/[...asset]/route'

describe('Amethyst static asset route', () => {
  it.each([
    ['gnome-garden.css', 'text/css'],
    ['skins/gnome-garden/forest.webp', 'image/webp'],
    ['skins/gnome-garden/forest-mobile.webp', 'image/webp'],
    ['skins/gnome-garden/gnome.webp', 'image/webp'],
    ['skins/gnome-garden/lantern.webp', 'image/webp'],
    ['skins/gnome-garden/storybook-original.webp', 'image/webp'],
  ])('serves the approved nested skin asset %s with its correct media type', async (asset, contentType) => {
    const response = await GET(new Request(`https://www.yoursparklesuite.com/amethyst/${asset}`), {
      params: Promise.resolve({ asset: asset.split('/') }),
    })
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain(contentType)
    const content = Buffer.from(await response.arrayBuffer())
    expect(content.length).toBeGreaterThan(100)
    if (contentType === 'image/webp') {
      expect(content.toString('ascii', 0, 4)).toBe('RIFF')
      expect(content.toString('ascii', 8, 12)).toBe('WEBP')
    } else {
      expect(content.toString('utf8')).toContain('body.bg-gnome-garden')
    }
  })

  it.each([
    ['skins', 'gnome-garden', '..', '..', '..', 'package.json'],
    ['skins', 'gnome-garden', '%2e%2e', 'homepage.jsx'],
    ['skins', 'gnome-garden', 'unapproved.webp'],
    ['skins', 'gnome-garden', 'forest.webp', '..', 'homepage.jsx'],
  ])('rejects non-allowlisted nested skin path %j', async (...asset) => {
    const response = await GET(new Request('https://www.yoursparklesuite.com/amethyst/invalid'), {
      params: Promise.resolve({ asset }),
    })
    expect(response.status).toBe(404)
  })

  it('serves locked public Amethyst exports under the app/amethyst namespace', async () => {
    const response = await GET(
      new Request('http://localhost:3001/amethyst/Homepage.html'),
      { params: Promise.resolve({ asset: ['Homepage.html'] }) },
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('text/html')
    await expect(response.text()).resolves.toContain(
      'homepage.jsx?v=20260909-lineup-v2',
    )
  })

  it('rewrites public HTML canonicals and share URLs for custom domains', async () => {
    const response = await GET(
      new Request('https://sparklebysasha.example/amethyst/Homepage.html'),
      { params: Promise.resolve({ asset: ['Homepage.html'] }) },
    )
    const html = await response.text()

    expect(html).toContain(
      '<link rel="canonical" href="https://sparklebysasha.example/amethyst/Homepage.html" />',
    )
    expect(html).toContain(
      '<meta property="og:url" content="https://sparklebysasha.example/amethyst/Homepage.html" />',
    )
    expect(html).toContain(
      '<meta name="twitter:image" content="https://sparklebysasha.example/opengraph-image" />',
    )
    expect(html).toContain(
      '<link rel="icon" type="image/png" href="https://sparklebysasha.example/icon" />',
    )
  })

  it('keeps local and preview Amethyst HTML on the default Sparkle Suite canonical origin', async () => {
    const localResponse = await GET(
      new Request('http://localhost:3001/amethyst/Trade.html'),
      { params: Promise.resolve({ asset: ['Trade.html'] }) },
    )
    const previewResponse = await GET(
      new Request('https://sparkle-suite-git-wave-3.vercel.app/amethyst/Join.html'),
      { params: Promise.resolve({ asset: ['Join.html'] }) },
    )

    await expect(localResponse.text()).resolves.toContain(
      '<link rel="canonical" href="https://www.yoursparklesuite.com/amethyst/Trade.html" />',
    )
    await expect(previewResponse.text()).resolves.toContain(
      '<link rel="canonical" href="https://www.yoursparklesuite.com/amethyst/Join.html" />',
    )
  })

  it('injects host-aware JSON-LD into public Amethyst HTML responses', async () => {
    const response = await GET(
      new Request('https://sparklebysasha.example/amethyst/Join.html'),
      { params: Promise.resolve({ asset: ['Join.html'] }) },
    )
    const html = await response.text()

    expect(html).toContain('<script type="application/ld+json">')
    expect(html).toContain(
      '"@id":"https://sparklebysasha.example/amethyst/Join.html#webpage"',
    )
    expect(html).not.toContain('<script>alert')
  })

  it('carries customer targets into the unsubscribe bootstrap script', async () => {
    const response = await GET(
      new Request('https://preview.example/amethyst/Unsubscribe.html?c=rep-clean'),
      { params: Promise.resolve({ asset: ['Unsubscribe.html'] }) },
    )
    const html = await response.text()

    expect(html).toContain('/api/amethyst/homepage-template?c=rep-clean')
  })

  it.each([
    ['Homepage.html', 'homepage-template'],
    ['Trade.html', 'trade-template'],
    ['Join.html', 'join-template'],
  ])(
    'forwards preview rep targets through the %s template loader',
    async (assetName, endpoint) => {
      const response = await GET(
        new Request(
          `https://preview.example/amethyst/${assetName}?c=rep-clean&previewRefresh=7`,
        ),
        { params: Promise.resolve({ asset: [assetName] }) },
      )
      const html = await response.text()

      expect(html).toContain('src="/amethyst/template-loader.js"')
      if (assetName === 'Join.html') {
        expect(html).toContain('src="/amethyst/join-runtime.js?v=20260917-team-social-lead-photo-v1"')
        expect(html).toContain('href="/amethyst/join.css?v=20260917-team-social-lead-photo-v1"')
        expect(html).toContain('href="/amethyst/neon-butterfly.css?v=20260914-team-recruiting-v1"')
        expect(html).not.toContain('tweaks-panel.jsx')
      } else {
        expect(html).toContain('src="/amethyst/tweaks-panel.jsx?v=20260725-emerald-garden"')
      }
      expect(html).toContain(
        `data-template-src="/api/amethyst/${endpoint}?c=rep-clean"`,
      )
      expect(html).not.toContain(`src="/api/amethyst/${endpoint}"></script>`)
    },
  )

  it('ships the template loader that merges page query params before React renders', async () => {
    const response = await GET(
      new Request('https://preview.example/amethyst/template-loader.js'),
      { params: Promise.resolve({ asset: ['template-loader.js'] }) },
    )
    const script = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('text/javascript')
    expect(script).toContain('window.location.search')
    expect(script).toContain('document.write')
    expect(script).toContain(`"></scr' + 'ipt>'`)
    expect(script).not.toContain('<\\\\/script>')
    expect(script).toContain('data-template-src')
  })

  it('rejects path traversal outside the public Amethyst export folder', async () => {
    const response = await GET(
      new Request('http://localhost:3001/amethyst/../package.json'),
      { params: Promise.resolve({ asset: ['..', 'package.json'] }) },
    )

    expect(response.status).toBe(404)
  })

  it('keeps file tracing scoped to the public Amethyst export folder', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'lib/amethyst/public-asset-response.ts'),
      'utf8',
    )

    expect(source).toContain("join(process.cwd(), 'public', 'amethyst', assetPath)")
    expect(source).not.toContain('../../../public')
  })
})
