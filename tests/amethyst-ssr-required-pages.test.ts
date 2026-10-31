import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { defaultAmethystHomepageTemplateData as homepage } from '@/lib/amethyst/homepage-template-data'
import { defaultAmethystJoinTemplateData as join } from '@/lib/amethyst/join-template-data'
import { defaultAmethystTradeTemplateData as trade } from '@/lib/amethyst/trade-template-data'
const mocks = vi.hoisted(() => ({ bootstrap: vi.fn(), render: vi.fn() }))
vi.mock('@/lib/amethyst/customer-page-bootstrap-response', () => ({ buildCustomerPageBootstrapResponse: mocks.bootstrap }))
vi.mock('@/lib/amethyst/homepage-first-paint', () => ({ renderAmethystPageFirstPaint: mocks.render }))
vi.mock('@/lib/amethyst/preview-template-data', () => ({ loadAmethystPreviewTemplateData: async () => ({ appearancePreset: 'gnome_garden', homepage, join, trade }) }))
import { renderAmethystPublicAssetResponse } from '@/lib/amethyst/public-asset-response'
beforeEach(() => {
  vi.stubEnv('REP_RENDER_V2_SLUGS', 'dudesfizzfest')
  mocks.render.mockReset().mockImplementation(async (_page, html) => html.replace('id="root"', 'id="root" data-server-rendered="true"'))
  mocks.bootstrap.mockReset().mockResolvedValue(new Response('window.QA=true;', { headers: { 'x-sparkle-page-data': 'ssr' } }))
})
afterEach(() => vi.unstubAllEnvs())
it.each(['Trade', 'Join'])('keeps %s in SSR when mandatory data exceeds the inherited homepage deadline', async page => {
  mocks.bootstrap.mockImplementationOnce(async () => {
    await new Promise(resolve => setTimeout(resolve, 5250))
    return new Response('window.QA=true;', { headers: { 'x-sparkle-page-data': 'ssr' } })
  })
  const response = await renderAmethystPublicAssetResponse(new Request(`https://sparkle-suite-smoke.vercel.app/dudesfizzfest/${page.toLowerCase()}`), [page + '.html'], { repIdOverride: 'test-rep', publicSiteSlugOverride: 'dudesfizzfest', joinVisibilityVerified: true })
  expect(response.headers.get('x-sparkle-page-data')).toBe('ssr')
  expect(await response.text()).toContain('data-server-rendered="true"')
}, 8000)
it('returns the legacy Dance Floor with HTTP 200 on mandatory render failure', async () => {
  mocks.render.mockRejectedValueOnce(Error('forced'))
  const response = await renderAmethystPublicAssetResponse(new Request('https://sparkle-suite-smoke.vercel.app/dudesfizzfest/trade'), ['Trade.html'], { repIdOverride: 'test-rep', publicSiteSlugOverride: 'dudesfizzfest' })
  expect(response.status).toBe(200)
  expect(await response.text()).toContain('babel')
})
