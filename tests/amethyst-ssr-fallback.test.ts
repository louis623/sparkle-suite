import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createHash } from 'node:crypto'
import { defaultAmethystHomepageTemplateData as homepage } from '@/lib/amethyst/homepage-template-data'
import { defaultAmethystJoinTemplateData as join } from '@/lib/amethyst/join-template-data'
import { defaultAmethystTradeTemplateData as trade } from '@/lib/amethyst/trade-template-data'
const mocks = vi.hoisted(() => ({ bootstrap: vi.fn(), render: vi.fn(), template: vi.fn() }))
vi.mock('@/lib/amethyst/homepage-bootstrap-response', () => ({ buildHomepageBootstrapResponse: mocks.bootstrap }))
vi.mock('@/lib/amethyst/homepage-first-paint', () => ({ renderHomepageFirstPaint: mocks.render, renderAmethystPageFirstPaint: (_page: string, ...args: unknown[]) => mocks.render(...args) }))
vi.mock('@/lib/amethyst/customer-page-bootstrap-response', () => ({ buildCustomerPageBootstrapResponse: (...args: unknown[]) => mocks.bootstrap(...args) }))
vi.mock('@/lib/amethyst/join-page-access', () => ({ canServeTargetedAmethystJoinPage: async () => true }))
vi.mock('@/lib/amethyst/preview-template-data', () => ({ loadAmethystPreviewTemplateData: (...args: unknown[]) => mocks.template(...args) }))
import { renderAmethystPublicAssetResponse } from '@/lib/amethyst/public-asset-response'
import { renderAmethystPublicAssetResponse as frozenLive } from '@/lib/amethyst/legacy/public-asset-response'
const hash = (text: string) => createHash('sha256').update(text).digest('hex')
const options = { repIdOverride: 'test-rep', publicSiteSlugOverride: 'dudesfizzfest' }
const request = () => new Request('https://www.yoursparklesuite.com/dudesfizzfest')
beforeEach(() => {
  vi.stubEnv('REP_RENDER_V2_SLUGS', 'dudesfizzfest')
  mocks.template.mockReset().mockResolvedValue({ appearancePreset: 'halloween_pumpkin_cat', homepage, join, trade })
  mocks.bootstrap.mockReset().mockImplementation(async () => new Response('window.QA=true;'))
  mocks.render.mockReset().mockImplementation(async html => html.replace('id="root"', 'id="root" data-server-rendered="true"'))
})
afterEach(() => vi.unstubAllEnvs())
it.each(['throw', 'timeout'])('returns exact frozen Live response on bootstrap %s', async mode => {
  mocks.bootstrap.mockImplementation(() => mode === 'throw' ? Promise.reject(Error('forced')) : new Promise(() => {}))
  const expected = await (await frozenLive(request(), ['Homepage.html'], options)).text()
  const started = performance.now()
  const actual = await renderAmethystPublicAssetResponse(request(), ['Homepage.html'], options)
  expect(actual.status).toBe(200)
  expect(hash(await actual.text())).toBe(hash(expected))
  expect(performance.now() - started).toBeLessThan(5500)
}, 7000)
it('returns exact frozen Live response on render failure', async () => {
  mocks.render.mockRejectedValue(Error('forced render failure'))
  const actual = await (await renderAmethystPublicAssetResponse(request(), ['Homepage.html'], options)).text()
  const expected = await (await frozenLive(request(), ['Homepage.html'], options)).text()
  expect(hash(actual)).toBe(hash(expected))
})
it('rejects a non-OK data response and loads template only once', async () => {
  mocks.bootstrap.mockResolvedValue(new Response('unavailable', { status: 503 }))
  const actual = await (await renderAmethystPublicAssetResponse(request(), ['Homepage.html'], options)).text()
  expect(mocks.template).toHaveBeenCalledTimes(1)
  expect(mocks.render).not.toHaveBeenCalled()
  const expected = await (await frozenLive(request(), ['Homepage.html'], options)).text()
  expect(hash(actual)).toBe(hash(expected))
})
it('removing the allowlist restores the exact Live homepage without running SSR', async () => {
  vi.stubEnv('REP_RENDER_V2_SLUGS', '')
  const actual = await (await renderAmethystPublicAssetResponse(request(), ['Homepage.html'], options)).text()
  const expected = await (await frozenLive(request(), ['Homepage.html'], options)).text()
  expect(hash(actual)).toBe(hash(expected))
  expect(mocks.render).not.toHaveBeenCalled()
})
it.each(['milehighfizz', 'brisglowtique', 'goforthebling', 'brittwithbling', 'blingkitchen', 'blingwithkrissig', 'sparklybutterflies'])('hashes all three non-listed %s pages against frozen Live', async slug => {
  const opts = { ...options, publicSiteSlugOverride: slug, joinVisibilityVerified: true }
  for (const asset of ['Homepage.html', 'Trade.html', 'Join.html']) {
    const req = new Request('https://www.yoursparklesuite.com/' + slug)
    const response = await renderAmethystPublicAssetResponse(req, [asset], opts)
    expect(response.status).toBe(200)
    expect(hash(await response.text())).toBe(hash(await (await frozenLive(req, [asset], opts)).text()))
  }
  expect(mocks.render).not.toHaveBeenCalled()
})

it('reflects a changed saved setting on the very next render without a template cache', async () => {
  mocks.template.mockResolvedValueOnce({ appearancePreset: 'halloween_pumpkin_cat', homepage: { ...homepage, businessName: 'Before save' }, join, trade })
  const before = await (await renderAmethystPublicAssetResponse(request(), ['Homepage.html'], options)).text()
  mocks.template.mockResolvedValueOnce({ appearancePreset: 'halloween_pumpkin_cat', homepage: { ...homepage, businessName: 'After save' }, join, trade })
  const after = await (await renderAmethystPublicAssetResponse(request(), ['Homepage.html'], options)).text()
  expect(before).toContain('Before save')
  expect(after).toContain('After save')
  expect(after).not.toContain('Before save')
  expect(mocks.template).toHaveBeenCalledTimes(2)
  expect(mocks.render.mock.calls[1][1].homepage.businessName).toBe('After save')
})

it('keeps SSR when a cold template read exceeds the old 1.5 second total budget', async () => {
  mocks.template.mockImplementationOnce(async () => {
    await new Promise(resolve => setTimeout(resolve, 1700))
    return { appearancePreset: 'halloween_pumpkin_cat', homepage, join, trade }
  })
  const started = performance.now()
  const response = await renderAmethystPublicAssetResponse(request(), ['Homepage.html'], options)
  expect(performance.now() - started).toBeGreaterThanOrEqual(1650)
  expect(await response.text()).toContain('data-server-rendered="true"')
})

it('keeps SSR when the first renderer load takes longer than the former safety budget', async () => {
  mocks.render.mockImplementationOnce(async html => {
    await new Promise(resolve => setTimeout(resolve, 1700))
    return html.replace('id="root"', 'id="root" data-server-rendered="true"')
  })
  const response = await renderAmethystPublicAssetResponse(request(), ['Homepage.html'], options)
  expect(await response.text()).toContain('data-server-rendered="true"')
})

for (const asset of ['Homepage.html', 'Trade.html', 'Join.html']) {
  for (const failure of ['throw', 'invalid render', 'failed data response']) {
    it('returns HTTP 200 and exact legacy bytes for ' + asset + ' on SSR ' + failure, async () => {
      if (failure === 'throw') mocks.render.mockRejectedValue(Error('forced render failure'))
      if (failure === 'invalid render') mocks.render.mockResolvedValue(null)
      if (failure === 'failed data response') mocks.bootstrap.mockImplementation(async () => new Response('unavailable', { status: 503 }))
      const opts = { ...options, joinVisibilityVerified: true }
      const response = await renderAmethystPublicAssetResponse(request(), [asset], opts)
      expect(response.status).toBe(200)
      expect(response.status).not.toBe(503)
      expect(hash(await response.text())).toBe(hash(await (await frozenLive(request(), [asset], opts)).text()))
    })
  }
}
