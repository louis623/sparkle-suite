import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

import { defaultAmethystHomepageTemplateData as homepage } from '@/lib/amethyst/homepage-template-data'
import { defaultAmethystJoinTemplateData as join } from '@/lib/amethyst/join-template-data'
import { defaultAmethystTradeTemplateData as trade } from '@/lib/amethyst/trade-template-data'
import { SitePreviewFrame, sitePreviewFrameAttributes } from '@/app/nic-nac/components/SitePreviewFrame'
import {
  prepareSitePreviewDocument,
  SITE_PREVIEW_LEGACY_ENGINE_NOTICE,
} from '@/lib/amethyst/site-preview'

const paid = vi.hoisted(() => vi.fn())
const skinAllowed = vi.hoisted(() => vi.fn())
const settings = vi.hoisted(() => vi.fn())
const ga4 = vi.hoisted(() => ({ calls: 0 }))
const mocks = vi.hoisted(() => ({
  bootstrap: vi.fn(),
  render: vi.fn(),
  template: vi.fn(),
  seen: [] as string[],
}))

vi.mock('@/lib/nic-nac/auth', () => ({
  AuthError: class AuthError extends Error {},
  getPaidNicNacContext: (...args: unknown[]) => paid(...args),
}))

vi.mock('@/lib/amethyst/skin-access', () => ({
  isAmethystSkinSelectionAvailableToRep: (...args: unknown[]) => skinAllowed(...args),
}))

vi.mock('@/lib/services/site-settings', () => ({
  getSiteSettingsDashboard: (...args: unknown[]) => settings(...args),
}))

vi.mock('@/lib/amethyst/homepage-bootstrap-response', () => ({
  buildHomepageBootstrapResponse: (...args: unknown[]) => mocks.bootstrap(...args),
}))

vi.mock('@/lib/amethyst/customer-page-bootstrap-response', () => ({
  buildCustomerPageBootstrapResponse: (...args: unknown[]) => mocks.bootstrap(...args),
}))

vi.mock('@/lib/amethyst/homepage-first-paint', () => ({
  renderHomepageFirstPaint: (...args: unknown[]) => mocks.render(...args),
  renderAmethystPageFirstPaint: (_page: string, ...args: unknown[]) => mocks.render(...args),
}))

vi.mock('@/lib/amethyst/preview-template-data', () => ({
  loadAmethystPreviewTemplateData: (...args: unknown[]) => mocks.template(...args),
}))

vi.mock('@/lib/amethyst/rep-ga4-tag', async () => {
  const actual = await vi.importActual<typeof import('@/lib/amethyst/rep-ga4-tag')>('@/lib/amethyst/rep-ga4-tag')
  return {
    ...actual,
    resolveRepGa4TagHtml: async () => {
      ga4.calls += 1
      return '<script>gtag("config","G-TEST")</script>'
    },
    injectRepGa4Tag: (html: string, snippet: string) => snippet ? html.replace('</head>', `${snippet}</head>`) : html,
  }
})

vi.mock('@/lib/services/site-visit-summary', async () => {
  const actual = await vi.importActual<typeof import('@/lib/services/site-visit-summary')>('@/lib/services/site-visit-summary')
  return {
    ...actual,
    injectPublicSiteVisitBeacon: (html: string) => html.includes('id="sparkle-site-visit"')
      ? html
      : html.replace('</body>', '<script id="sparkle-site-visit"></script></body>'),
  }
})

import { GET } from '@/app/nic-nac/site-preview/route'
import { AuthError } from '@/lib/nic-nac/auth'
import { ServiceError } from '@/lib/services/errors'

const origin = 'https://preview.example'
const repId = 'rep-signed-in'
const supabase = { marker: 'signed-in-supabase' }

function context(slug = 'dudesfizzfest') {
  return {
    repId,
    rep: { id: repId, public_site_slug: slug },
    supabase,
  }
}

function previewRequest(query: string) {
  return new Request(`${origin}/nic-nac/site-preview?${query}`, {
    headers: {
      host: 'evil.example',
      'x-forwarded-host': 'evil.example',
      referer: `${origin}/other-rep?c=attacker&publicSiteSlug=evilslug`,
    },
  })
}

const fixture = [
  '<form class="hp-signup-form"><button type="submit" class="hp-signup-submit">Continue<span class="hp-signup-submit-arrow">→</span></button></form>',
  '<video class="hp-theme-sample-video" autoplay preload="metadata" src="/amethyst/skins/rose-champagne/hero.mp4" poster="/amethyst/skins/rose-champagne/poster.webp"></video>',
  '<button type="button" class="sb-music-toggle" aria-pressed="false">Play music</button>',
  '<button type="button" data-hero-sound-toggle="music">Enable music</button>',
  '<img src="https://example.supabase.co/storage/v1/object/public/photos/hero.jpg" alt="">',
  '<script>window.sparkleStartHeroMotion=start;start();</script>',
  '<script>window.SPARKLE_DEFERRED_PAGE_DATA="/api/amethyst/homepage-template?c=attacker";</script>',
].join('')

describe('signed-in theme preview route', () => {
  beforeEach(() => {
    vi.stubEnv('REP_RENDER_V2_SLUGS', 'dudesfizzfest')
    ga4.calls = 0
    mocks.seen = []
    paid.mockReset().mockResolvedValue(context())
    skinAllowed.mockReset().mockResolvedValue(true)
    settings.mockReset().mockResolvedValue({ showJoinPage: true, danceFloorVisible: true })
    mocks.template.mockReset().mockResolvedValue({ appearancePreset: 'amethyst', homepage, join, trade })
    mocks.bootstrap.mockReset().mockImplementation(async (...args: unknown[]) => {
      const request = args.find((value): value is Request => value instanceof Request)
      if (request) mocks.seen.push(request.url)
      const loaded = args.at(-1) as { templateData?: Promise<unknown> } | undefined
      if (loaded?.templateData) await loaded.templateData
      return new Response('window.QA=true;', { headers: { 'x-sparkle-page-data': 'complete' } })
    })
    mocks.render.mockReset().mockImplementation(async (html: string) => html
      .replace('id="root"', 'id="root" data-server-rendered="true"')
      .replace('</body>', `${fixture}</body>`))
  })

  it('renders the signed-in rep in the requested theme and ignores identity query values', async () => {
    const response = await GET(previewRequest('theme=rose_champagne&page=homepage&rep=attacker&c=attacker&slug=evilslug&publicSiteSlug=evilslug&host=evil.example&ssrReviewTheme=garnet&ssrReviewLayout=mile_high_fizz'))
    const html = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get('X-Preview-Live-Engine')).toBe('ssr')
    expect(mocks.template).toHaveBeenCalledWith({ repId, publicSiteSlug: 'dudesfizzfest' })
    expect(skinAllowed).toHaveBeenCalledWith(supabase, 'rose_champagne', repId)
    expect(mocks.render.mock.calls[0][1].appearancePreset).toBe('rose_champagne')
    expect(mocks.render.mock.calls[0][1].ssrReview).toBeUndefined()
    const bootstrap = new URL(mocks.seen[0])
    expect(bootstrap.searchParams.get('c')).toBe(repId)
    expect(bootstrap.searchParams.get('publicSiteSlug')).toBe('dudesfizzfest')
    expect(bootstrap.searchParams.get('ssrReviewTheme')).toBeNull()
    expect(bootstrap.searchParams.get('ssrReviewLayout')).toBeNull()
    expect(mocks.seen[0]).not.toContain('attacker')
    expect(mocks.seen[0]).not.toContain('evilslug')
    expect(mocks.seen[0]).not.toContain('garnet')
    expect(html).toContain('data-server-rendered="true"')
    expect(html).not.toContain('data-template-src')
    expect(ga4.calls).toBe(0)
    expect(html).not.toContain('sparkle-site-visit')
    expect(html).not.toContain('G-TEST')
    expect(html).not.toContain('gtag(')
    expect(html).not.toContain('googletagmanager')
    expect(html).not.toContain('unpkg.com')
  })

  it('sends the preview headers, meta CSP, and base href', async () => {
    const response = await GET(previewRequest('theme=rose_champagne&page=homepage'))
    const html = await response.text()
    const header = response.headers.get('Content-Security-Policy') ?? ''

    expect(response.headers.get('Cache-Control')).toBe('no-store, private')
    expect(response.headers.get('X-Robots-Tag')).toBe('noindex, nofollow')
    expect(response.headers.get('Referrer-Policy')).toBe('no-referrer')
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(response.headers.get('X-Frame-Options')).toBe('SAMEORIGIN')
    expect(header).toContain("connect-src 'none'")
    expect(header).toContain("form-action 'none'")
    expect(header).toContain("frame-ancestors 'self'")
    expect(header).toContain("object-src 'none'")
    expect(header).toContain('https://example.supabase.co')
    expect(html.startsWith('<meta http-equiv="Content-Security-Policy"')).toBe(true)
    expect(html).not.toContain('frame-ancestors')
    expect(html).toContain(`<base href="${origin}/">`)
    expect(html).toContain("connect-src 'none'")
    expect(html).toContain("form-action 'none'")
    expect(html).toContain("object-src 'none'")
    expect(html).toContain('<button type="submit" class="hp-signup-submit" disabled>Preview only</button>')
    expect(html).not.toMatch(/<video\b[^>]*\sautoplay/i)
    expect(html).not.toMatch(/<video\b[^>]*\ssrc=/i)
    expect(html).toContain('preload="none"')
    expect(html).toContain('<button type="button" class="sb-music-toggle" aria-pressed="false" disabled>')
    expect(html).toContain('data-hero-sound-toggle="music" disabled>')
    expect(html).toContain('window.sparkleStartHeroMotion=function(){};')
    expect(html).not.toContain('window.sparkleStartHeroMotion=start;start();')
    expect(html).toContain('window.SPARKLE_DEFERRED_PAGE_DATA=""')
    expect(html).not.toContain('/api/amethyst/homepage-template')
  })

  it('renders an off-list rep with the SSR engine and the legacy header', async () => {
    paid.mockResolvedValue(context('offlistfizz'))
    const response = await GET(previewRequest('theme=rose_champagne&page=trade'))
    const html = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get('X-Preview-Live-Engine')).toBe('legacy')
    expect(mocks.render).toHaveBeenCalled()
    expect(html).toContain('data-server-rendered="true"')
    expect(html).not.toContain('data-template-src')
    expect(mocks.template).toHaveBeenCalledWith({ repId, publicSiteSlug: 'offlistfizz' })
    expect(new URL(mocks.seen[0]).search).toBe('')
    expect(mocks.seen[0]).toBe(`${origin}/offlistfizz/trade`)
  })

  it('shows the Join and Dance Floor off sentences without rendering', async () => {
    settings.mockResolvedValueOnce({ showJoinPage: false, danceFloorVisible: true })
    const joinResponse = await GET(previewRequest('theme=rose_champagne&page=join'))
    expect(joinResponse.status).toBe(200)
    expect(await joinResponse.text()).toContain('Your Join page is off.')

    settings.mockResolvedValueOnce({ showJoinPage: true, danceFloorVisible: false })
    const tradeResponse = await GET(previewRequest('theme=rose_champagne&page=trade'))
    expect(tradeResponse.status).toBe(200)
    expect(await tradeResponse.text()).toContain('Your Dance Floor page is off.')
    expect(mocks.render).not.toHaveBeenCalled()
  })

  it('returns 503 with an empty body when SSR fails', async () => {
    mocks.render.mockRejectedValue(new Error('forced render failure with secret detail'))
    const response = await GET(previewRequest('theme=rose_champagne&page=homepage'))
    expect(response.status).toBe(503)
    expect(await response.text()).toBe('')
    expect(response.headers.get('X-Robots-Tag')).toBe('noindex, nofollow')
  })

  it('returns 503 when the template read throws instead of the legacy page', async () => {
    mocks.template.mockRejectedValue(new Error('template unavailable'))
    const response = await GET(previewRequest('theme=rose_champagne&page=homepage'))
    expect(response.status).toBe(503)
    expect(await response.text()).toBe('')
    expect(mocks.render).not.toHaveBeenCalled()
  })

  it('uses the same auth statuses as site settings and hides themes the rep cannot use', async () => {
    paid.mockRejectedValueOnce(new AuthError('signed out'))
    expect((await GET(previewRequest('theme=rose_champagne&page=homepage'))).status).toBe(401)

    paid.mockRejectedValueOnce(new ServiceError({
      code: 'SPARKLE_SUBSCRIPTION_REQUIRED',
      message: 'paid Sparkle Suite subscription required',
      statusCode: 402,
    }))
    expect((await GET(previewRequest('theme=rose_champagne&page=homepage'))).status).toBe(402)

    expect((await GET(previewRequest('theme=not_a_theme&page=homepage'))).status).toBe(404)
    expect((await GET(previewRequest('theme=RG-04&page=homepage'))).status).toBe(404)
    expect((await GET(previewRequest('theme=rose_champagne&page=pantry'))).status).toBe(404)
    expect(skinAllowed).not.toHaveBeenCalled()

    skinAllowed.mockResolvedValueOnce(false)
    expect((await GET(previewRequest('theme=black_diamond&page=homepage'))).status).toBe(404)
    expect(mocks.render).not.toHaveBeenCalled()
  })

  it('keeps the iframe sandbox to allow-scripts only', () => {
    const frame = sitePreviewFrameAttributes('Rose Champagne')
    expect(frame.sandbox).toBe('allow-scripts')
    expect(frame.title).toBe('Preview of your site in Rose Champagne')
    expect(frame.referrerPolicy).toBe('no-referrer')
    const markup = renderToStaticMarkup(createElement(SitePreviewFrame, {
      html: '<p>Preview</p>',
      themeLabel: 'Rose Champagne',
    }))
    expect(markup).toContain('sandbox="allow-scripts"')
    expect(markup.toLowerCase()).toContain('referrerpolicy="no-referrer"')
    expect(markup).toContain('title="Preview of your site in Rose Champagne"')
    expect(markup).not.toContain('allow-same-origin')
    expect(markup).not.toContain('allow-forms')
    expect(markup).not.toContain('allow-popups')
    expect(markup).not.toContain('allow-top-navigation')
    expect(SITE_PREVIEW_LEGACY_ENGINE_NOTICE).toBe('Preview uses our newest page engine; small spacing differences from your live site are possible.')
  })

  it('does not add a public previewTheme switch', () => {
    const preview = readFileSync('lib/amethyst/site-preview.ts', 'utf8')
    const renderer = readFileSync('lib/amethyst/public-asset-response.ts', 'utf8')
    const headers = readFileSync('next.config.ts', 'utf8')
    expect(headers).toContain("source: '/nic-nac/site-preview'")
    expect(headers.slice(headers.lastIndexOf("source: '/nic-nac/site-preview'"))).toContain("value: 'no-referrer'")
    expect(preview).not.toMatch(/searchParams\.get\(['"](?:rep|c|slug|host|ssrReviewTheme|ssrReviewLayout|previewTheme)['"]\)/)
    expect(renderer).not.toContain('previewTheme')
    expect(renderer).toContain('omitTracking')
    expect(renderer).toContain('failClosed')
    const prepared = prepareSitePreviewDocument('<head></head><body><script id="sparkle-site-visit">gtag("config","G-LEAK")</script></body>', origin)
    expect(prepared.html.startsWith('<meta http-equiv="Content-Security-Policy"')).toBe(true)
    expect(prepared.html).not.toContain('sparkle-site-visit')
    expect(prepared.html).not.toContain('gtag(')
    expect(prepared.policy.header).toContain("frame-ancestors 'self'")
    expect(prepared.policy.meta).not.toContain('frame-ancestors')
  })
})
