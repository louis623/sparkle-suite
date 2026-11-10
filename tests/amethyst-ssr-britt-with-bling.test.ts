import { afterEach, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { homepageSmokeReview } from '@/lib/amethyst/homepage-smoke-review'
import { renderAmethystPageFirstPaint } from '@/lib/amethyst/page-first-paint'
import { buildAmethystHomepageBootstrapScript, defaultAmethystHomepageTemplateData as homepage } from '@/lib/amethyst/homepage-template-data'
import { buildAmethystTradeBootstrapScript, defaultAmethystTradeTemplateData as trade } from '@/lib/amethyst/trade-template-data'
import { buildAmethystJoinBootstrapScript, defaultAmethystJoinTemplateData as join } from '@/lib/amethyst/join-template-data'
import { BRITT_WITH_BLING_PROFILE, BRITT_WITH_BLING_TEAM_MEMBERS } from '@/lib/britt-with-bling/profile'

const url = new URL('https://sparkle-suite-smoke.vercel.app/dudesfizzfest?ssrReviewTheme=black_diamond&ssrReviewLayout=britt_with_bling')
const original = { homepage, trade, join, appearancePreset: 'amethyst' as const }
function fixture() {
  vi.stubEnv('VERCEL_ENV', 'preview')
  vi.stubEnv('VERCEL_PROJECT_ID', 'prj_VTY0rpz2O3VBJqJv69iBz8tzLexQ')
  vi.stubEnv('NEXT_PUBLIC_SPARKLE_ENVIRONMENT', 'smoke')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://pukemqiwlyqmyytxkdmo.supabase.co')
  return homepageSmokeReview(original, url, 'dudesfizzfest')
}
afterEach(() => vi.unstubAllEnvs())

for (const page of ['homepage', 'trade', 'join'] as const) {
  it(`renders Britt's Black Diamond ${page} with the legacy custom hero`, async () => {
    const data = fixture()
    const bootstrap = page === 'homepage'
      ? buildAmethystHomepageBootstrapScript(data.homepage, [], data.appearancePreset, { targeted: true })
      : page === 'trade' ? buildAmethystTradeBootstrapScript(data.trade, [], data.appearancePreset, { targeted: true })
        : buildAmethystJoinBootstrapScript(data.join, data.appearancePreset, { targeted: true })
    const html = await renderAmethystPageFirstPaint(page, readFileSync(`public/amethyst/${{ homepage: 'Homepage', trade: 'Trade', join: 'Join' }[page]}.html`, 'utf8'), data, url, bootstrap)
    const tree = html.split('<div id="root" data-server-rendered="true">')[1]?.split('</div><script>')[0]
    expect(tree).toBeTruthy()
    expect(tree).not.toContain('data-ssr-hero=')
    expect(tree).not.toContain('class="hp-hero"')
    expect(html).toMatch(new RegExp(`<body class="[^"]*britt-with-bling${page === 'homepage' ? '' : '-' + page}`))
    if (page === 'homepage') {
      for (const css of ['bwb-hero', 'bwb-hero-image', 'bwb-hero-cta-stack']) expect(tree).toContain(`class="${css}"`)
      for (const cta of ['Shop Now', 'Join the Team', 'Watch', 'Dance Floor']) expect(tree).toContain(cta)
      expect(tree).toContain(encodeURIComponent(BRITT_WITH_BLING_PROFILE.heroImageUrl))
      expect(tree).toContain('The Rise of Her')
      expect(html).toContain('data-ssr-style="britt-hero-buttons.css"')
      expect(html).toContain('.bwb-hero-cta-stack')
    } else expect(tree).toContain(`bwb-${page}-page`)
  })
}

it('uses the repository profile and roster through the same guarded legacy API fixture', () => {
  const data = fixture()
  expect(data.homepage.heroImageUrl).toBe(BRITT_WITH_BLING_PROFILE.heroImageUrl)
  expect(data.homepage.businessName).toBe(BRITT_WITH_BLING_PROFILE.businessName)
  expect(data.join.teamMembers.map(member => member.name)).toEqual(BRITT_WITH_BLING_TEAM_MEMBERS.map(member => member.name))
  for (const page of ['homepage', 'trade', 'join']) {
    const route = readFileSync(`app/api/amethyst/${page}-template/route.ts`, 'utf8')
    expect(route).toContain('homepageSmokeReview(')
    expect(route).toContain('new URL(request.url), publicSiteSlug')
  }
  for (const slug of ['brittwithbling', 'otherrep', null]) expect(homepageSmokeReview(original, url, slug)).toBe(original)
  for (const [key, value] of [['VERCEL_ENV', 'production'], ['VERCEL_PROJECT_ID', 'other'], ['NEXT_PUBLIC_SPARKLE_ENVIRONMENT', 'live'], ['NEXT_PUBLIC_SUPABASE_URL', 'https://other.supabase.co']]) {
    const saved = process.env[key]
    vi.stubEnv(key, value)
    expect(homepageSmokeReview(original, url, 'dudesfizzfest')).toBe(original)
    vi.stubEnv(key, saved)
  }
})

it('keeps review parameters in the actual deferred URL only while the Smoke guard passes', async () => {
  fixture()
  vi.stubEnv('REP_RENDER_V2_SLUGS', 'dudesfizzfest')
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '')
  vi.resetModules()
  vi.doMock('@/lib/amethyst/preview-template-data', () => ({ loadAmethystPreviewTemplateData: async () => original }))
  vi.doMock('@/lib/amethyst/homepage-upcoming-shows', async () => ({
    ...await vi.importActual<object>('@/lib/amethyst/homepage-upcoming-shows'),
    loadAmethystHomepageUpcomingShows: async () => [],
  }))
  vi.doMock('@/lib/amethyst/trade-board-listings', async () => ({
    ...await vi.importActual<object>('@/lib/amethyst/trade-board-listings'),
    loadAmethystTradeBoardPreviewListings: async () => [],
  }))
  vi.doMock('@/lib/amethyst/public-join-index', () => ({ indexPublicJoinTemplate: async (data: unknown) => data }))
  vi.doMock('@/lib/amethyst/rep-ga4-tag', () => ({ injectRepGa4Tag: (html: string) => html, resolveRepGa4TagHtml: async () => '' }))
  vi.doMock('@/lib/public-site/signup-discount-settings', () => ({
    loadSavedSignupDiscount: async () => null, applySavedSignupDiscount: async (data: unknown) => data,
  }))
  vi.doMock('@/lib/amethyst/homepage-data-budget', async () => ({
    ...await vi.importActual<object>('@/lib/amethyst/homepage-data-budget'),
    // Exercise the real bootstrap/deferred script without slow or external reads.
    withinHomepageDataBudget: async () => undefined,
  }))
  const { renderAmethystPublicAssetResponse } = await import('@/lib/amethyst/public-asset-response')
  const parameters = []
  for (const environment of ['preview', 'production']) {
    vi.stubEnv('VERCEL_ENV', environment)
    const response = await renderAmethystPublicAssetResponse(new Request(url), ['Homepage.html'], {
      repIdOverride: 'fixture-rep', publicSiteSlugOverride: 'dudesfizzfest',
    })
    const html = await response.text()
    const match = html.match(/window\.SPARKLE_DEFERRED_PAGE_DATA=("[^"]+")/)
    const deferred = new URL(JSON.parse(match?.[1] ?? 'null'), url)
    parameters.push([Boolean(match), deferred.searchParams.get('ssrReviewTheme'), deferred.searchParams.get('ssrReviewLayout')])
  }
  expect(parameters).toEqual([[true, 'black_diamond', 'britt_with_bling'], [true, null, null]])
})

it('tiktok britt: saved showcase vs profile fallback and featured reveal card', async () => {
  const { applyBrittWithBlingHomepage } = await import('@/lib/britt-with-bling/profile')
  const { renderTikTokCard } = await import('./fixtures/tiktok-render')
  const source = readFileSync('lib/amethyst/v2/homepage.jsx','utf8')
  const fallback = {...applyBrittWithBlingHomepage({...homepage,showcaseVideoUrl:'#'}),tiktokHostedMode:true}
  expect(fallback.showcaseVideoExplicit).toBe(false)
  const fallbackHtml = renderTikTokCard(source,fallback,'BrittWithBlingRevealExplainer')
  expect(fallbackHtml).toContain(fallback.revealExplainer!.videoUrl.replace('/embed/', '/embed/v2/'))
  const saved = {...applyBrittWithBlingHomepage({...homepage,showcaseVideoUrl:'https://www.tiktok.com/@saved/video/12345678'}),tiktokHostedMode:true}
  expect(saved.showcaseVideoExplicit).toBe(true)
  expect(renderTikTokCard(source,saved,'BrittWithBlingRevealExplainer')).toContain('https://www.tiktok.com/@saved/video/12345678')
  const featured = renderTikTokCard(source,fallback,'BrittWithBlingFeaturedReveal')
  expect(featured).toContain('https://www.tiktok.com/embed/v2/7609434971228425486')
  expect(featured).not.toContain('<iframe')
  const bootstrap = buildAmethystHomepageBootstrapScript(fallback,[], 'black_diamond',{targeted:true})
  const html = await renderAmethystPageFirstPaint('homepage',readFileSync('public/amethyst/Homepage.html','utf8'),{...original,homepage:fallback,appearancePreset:'black_diamond'},url,bootstrap)
  expect(html).toContain('ss-hosted-link')
  expect(html).not.toContain('src="https://www.tiktok.com/player/v1')
})
