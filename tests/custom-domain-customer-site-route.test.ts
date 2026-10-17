import { beforeEach, describe, expect, it, vi } from 'vitest'

const renderAmethystPublicAssetResponseMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/amethyst/public-asset-response', () => ({
  renderAmethystPublicAssetResponse: renderAmethystPublicAssetResponseMock,
}))

vi.mock('@/lib/amethyst/customer-domain-site', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/amethyst/customer-domain-site')>()),
  resolveCustomerDomainSiteState: vi.fn().mockResolvedValue({ kind: 'serve', host: 'brisglowtique.com', repId: 'rep-1' }),
}))

import { GET } from '@/app/customer-site/[page]/route'

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
      { canonicalPathOverride },
    )
  })

  it('rejects an unknown customer-site page', async () => {
    const response = await GET(new Request('https://brisglowtique.com/customer-site/nope'), {
      params: Promise.resolve({ page: 'nope' }),
    })

    expect(response.status).toBe(404)
    expect(renderAmethystPublicAssetResponseMock).not.toHaveBeenCalled()
  })
})
