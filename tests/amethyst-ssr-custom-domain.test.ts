import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createHash } from 'node:crypto'
import { buildAmethystHomepageBootstrapScript, defaultAmethystHomepageTemplateData as homepage } from '@/lib/amethyst/homepage-template-data'
import { buildAmethystJoinBootstrapScript, defaultAmethystJoinTemplateData as join } from '@/lib/amethyst/join-template-data'
import { buildAmethystTradeBootstrapScript, defaultAmethystTradeTemplateData as trade } from '@/lib/amethyst/trade-template-data'

const mocks = vi.hoisted(() => ({ site: vi.fn(), template: vi.fn(), joinAccess: vi.fn() }))
vi.mock('@/lib/amethyst/customer-domain-site', async original => ({
  ...await original<typeof import('@/lib/amethyst/customer-domain-site')>(), resolveCustomerDomainSiteState: mocks.site,
}))
vi.mock('@/lib/amethyst/preview-template-data', () => ({ loadAmethystPreviewTemplateData: (...args: unknown[]) => mocks.template(...args) }))
vi.mock('@/lib/amethyst/join-page-access', () => ({ canServeTargetedAmethystJoinPage: mocks.joinAccess }))
vi.mock('@/lib/amethyst/rep-ga4-tag', () => ({ resolveRepGa4TagHtml: async () => '', injectRepGa4Tag: (html: string) => html }))
vi.mock('@/lib/amethyst/public-join-index', () => ({ indexPublicJoinTemplate: async (data: unknown) => data }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient() { throw new Error('No database access in SSR fixture tests') } }))
vi.mock('@/lib/amethyst/homepage-bootstrap-response', () => ({ buildHomepageBootstrapResponse: async () =>
  new Response(buildAmethystHomepageBootstrapScript(data.homepage, [], data.appearancePreset, { targeted: true })) }))
vi.mock('@/lib/amethyst/customer-page-bootstrap-response', () => ({ buildCustomerPageBootstrapResponse: async (page: string) =>
  new Response(page === 'trade'
    ? buildAmethystTradeBootstrapScript(data.trade, [], data.appearancePreset, { targeted: true })
    : buildAmethystJoinBootstrapScript(data.join, data.appearancePreset, { targeted: true }, [])) }))

import { GET } from '@/app/customer-site/[page]/route'
import { renderAmethystPublicAssetResponse } from '@/lib/amethyst/public-asset-response'
import { renderAmethystPublicAssetResponse as frozenLive } from '@/lib/amethyst/legacy/public-asset-response'

const footerLinks = { ...homepage.footerLinks, home: '/', tradeBoard: '/trade', joinTeam: '/join' }
const data = { appearancePreset: 'alpine_opal' as const,
  homepage: { ...homepage, businessName: 'Mile High Fizz', repName: 'Lindsey', publicSiteVariant: 'mile_high_fizz_hybrid' as const, footerLinks, tradeBoardUrl: '/trade' },
  trade: { ...trade, footerLinks: { ...trade.footerLinks, ...footerLinks }, publicSiteVariant: 'mile_high_fizz_hybrid' as const },
  join: { ...join, footerLinks: { ...join.footerLinks, ...footerLinks }, publicSiteVariant: 'mile_high_fizz_hybrid' as const } }
const cases = [['home', 'Homepage.html', '/'], ['trade', 'Trade.html', '/trade'], ['join', 'Join.html', '/join']] as const
const hash = (body: string) => createHash('sha256').update(body).digest('hex')

beforeEach(() => {
  vi.stubEnv('REP_RENDER_V2_SLUGS', 'dudesfizzfest')
  mocks.site.mockReset().mockResolvedValue({ kind: 'serve', host: 'milehighfizz.com', repId: 'fixture-mhf', publicSiteSlug: 'milehighfizz' })
  mocks.template.mockReset().mockResolvedValue(data)
  mocks.joinAccess.mockReset().mockResolvedValue(true)
})
afterEach(() => vi.unstubAllEnvs())

for (const [page, asset, canonicalPathOverride] of cases) {
  it(`keeps the non-listed custom-domain ${page} byte-identical to frozen Live`, async () => {
    const request = new Request(`https://milehighfizz.com/customer-site/${page}`)
    const actual = await GET(request, { params: Promise.resolve({ page }) })
    const expected = await frozenLive(request, [asset], { repIdOverride: 'fixture-mhf', canonicalPathOverride })
    expect(actual.status).toBe(200)
    const html = await actual.text()
    expect(hash(html)).toBe(hash(await expected.text()))
    expect(html).not.toContain('data-server-rendered=')
  })
  it(`switches only the listed custom-domain ${page}, preserving custom links and canonical`, async () => {
    vi.stubEnv('REP_RENDER_V2_SLUGS', 'milehighfizz')
    const response = await GET(new Request(`https://milehighfizz.com/customer-site/${page}?ssrReviewTheme=gnome_garden&ssrReviewLayout=standard`), { params: Promise.resolve({ page }) })
    expect(response.status).toBe(200)
    const html = await response.text()
    expect(html).toContain('data-server-rendered="true"')
    expect(html).toContain(`rel="canonical" href="https://milehighfizz.com${canonicalPathOverride}"`)
    expect(html).not.toContain('href="/milehighfizz')
    expect(html).toContain('href="/trade"')
    expect(html).toContain('href="/join"')
    // CSS may define the label selector even when no review element exists.
    expect(html).not.toMatch(/<[a-z][^>]*\sdata-ssr-review-label(?:\s|=|>)/i)
    expect(mocks.template).toHaveBeenCalledWith({ repId: 'fixture-mhf', publicSiteSlug: '' })
  })
}

it('enforces Join visibility before rendering an allowlisted custom domain', async () => {
  vi.stubEnv('REP_RENDER_V2_SLUGS', 'milehighfizz')
  mocks.joinAccess.mockResolvedValue(false)
  const response = await GET(new Request('https://milehighfizz.com/customer-site/join'), { params: Promise.resolve({ page: 'join' }) })
  expect(response.status).toBe(404)
  expect(mocks.joinAccess).toHaveBeenCalledOnce()
  expect(mocks.template).not.toHaveBeenCalled()
})

it('never enables SSR from query strings, URL paths, or headers without server route identity', async () => {
  vi.stubEnv('REP_RENDER_V2_SLUGS', 'milehighfizz')
  const request = new Request('https://www.yoursparklesuite.com/milehighfizz?publicSiteSlug=milehighfizz&c=milehighfizz',
    { headers: { 'x-sparkle-public-site-slug': 'milehighfizz', 'x-sparkle-render-gate-slug': 'milehighfizz' } })
  for (const [, asset] of cases) {
    const response = await renderAmethystPublicAssetResponse(request, [asset], { joinVisibilityVerified: true })
    expect(await response.text()).not.toContain('data-server-rendered=')
  }
})

it('never renders Pantry through SSR on the custom-domain route', async () => {
  vi.stubEnv('REP_RENDER_V2_SLUGS', 'milehighfizz')
  const response = await GET(new Request('https://milehighfizz.com/customer-site/in-the-pantry'), { params: Promise.resolve({ page: 'in-the-pantry' }) })
  expect(response.status).toBe(404)
  expect(await response.text()).not.toContain('data-server-rendered=')
})
