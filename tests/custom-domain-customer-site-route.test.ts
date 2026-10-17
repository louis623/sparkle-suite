import { beforeEach, describe, expect, it, vi } from 'vitest'

const renderAmethystPublicAssetResponseMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/amethyst/public-asset-response', () => ({
  renderAmethystPublicAssetResponse: renderAmethystPublicAssetResponseMock,
}))

vi.mock('@/lib/amethyst/customer-domain-site', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/amethyst/customer-domain-site')>()),
  resolveCustomerDomainSiteState: vi.fn().mockResolvedValue({
    kind: 'serve',
    host: 'brisglowtique.com',
    repId: '2b5a27c5-9c05-4014-8d0b-754e19815bf6',
  }),
}))

import { GET } from '@/app/customer-site/[page]/route'
import { buildPublicSiteVisitBeacon } from '@/lib/services/site-visit-summary'

const RESOLVED_REP_ID = '2b5a27c5-9c05-4014-8d0b-754e19815bf6'

describe('custom-domain customer-site route', () => {
  beforeEach(() => {
    renderAmethystPublicAssetResponseMock.mockReset()
    renderAmethystPublicAssetResponseMock.mockResolvedValue(new Response('site'))
  })

  it.each([
    ['home', ['Homepage.html'], '/'],
    ['trade', ['Trade.html'], '/trade'],
    ['join', ['Join.html'], '/join'],
    ['in-the-pantry', ['Pantry.html'], '/in-the-pantry'],
  ])('renders %s using the custom-domain canonical path', async (page, asset, canonicalPathOverride) => {
    const request = new Request(`https://brisglowtique.com/customer-site/${page}`)
    const response = await GET(request, { params: Promise.resolve({ page }) })

    expect(response.status).toBe(200)
    expect(renderAmethystPublicAssetResponseMock).toHaveBeenCalledWith(
      request,
      asset,
      { canonicalPathOverride, repIdOverride: RESOLVED_REP_ID },
    )
  })

  it('gives the visit beacon a rep id instead of a domain string', () => {
    expect(buildPublicSiteVisitBeacon({ repId: 'brisglowtique.com' })).toBe('')
    const beacon = buildPublicSiteVisitBeacon({ repId: RESOLVED_REP_ID })
    expect(beacon).toContain('id="sparkle-site-visit"')
    expect(beacon).toContain(RESOLVED_REP_ID)
  })

  it('rejects an unknown customer-site page', async () => {
    const response = await GET(new Request('https://brisglowtique.com/customer-site/nope'), {
      params: Promise.resolve({ page: 'nope' }),
    })

    expect(response.status).toBe(404)
    expect(renderAmethystPublicAssetResponseMock).not.toHaveBeenCalled()
  })
})
