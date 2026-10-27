import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createHash } from 'node:crypto'
import { defaultAmethystHomepageTemplateData as homepage } from '@/lib/amethyst/homepage-template-data'
import { defaultAmethystJoinTemplateData as join } from '@/lib/amethyst/join-template-data'
import { defaultAmethystTradeTemplateData as trade } from '@/lib/amethyst/trade-template-data'
const mocks = vi.hoisted(() => ({ bootstrap: vi.fn(), render: vi.fn(), template: vi.fn() }))
vi.mock('@/lib/amethyst/homepage-template-cache', () => ({ loadHomepageV2Template: (...args: unknown[]) => mocks.template(...args) }))
vi.mock('@/lib/amethyst/homepage-bootstrap-response', () => ({ buildHomepageBootstrapResponse: mocks.bootstrap }))
vi.mock('@/lib/amethyst/homepage-first-paint', () => ({ renderHomepageFirstPaint: mocks.render }))
vi.mock('@/lib/amethyst/preview-template-data', () => ({ loadAmethystPreviewTemplateData: (...args: unknown[]) => mocks.template(...args) }))
import { renderAmethystPublicAssetResponse } from '@/lib/amethyst/public-asset-response'
import { renderAmethystPublicAssetResponse as frozenLive } from '@/lib/amethyst/legacy/public-asset-response'
const hash = (text: string) => createHash('sha256').update(text).digest('hex')
const options = { repIdOverride: 'test-rep', publicSiteSlugOverride: 'dudesfizzfest' }
const request = () => new Request('https://www.yoursparklesuite.com/dudesfizzfest')
beforeEach(() => {
  vi.stubEnv('REP_RENDER_V2_SLUGS', 'dudesfizzfest')
  mocks.template.mockReset().mockResolvedValue({ appearancePreset: 'halloween_pumpkin_cat', homepage, join, trade })
  mocks.bootstrap.mockReset().mockResolvedValue(new Response('window.QA=true;'))
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
  expect(performance.now() - started).toBeLessThan(1900)
})
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
it.each(['milehighfizz', 'brisglowtique', 'goforthebling', 'brittwithbling', 'theblingkitchen', 'blingwithkrissig', 'sparklybutterflies'])('hashes non-listed %s against the frozen Live renderer', async slug => {
  const opts = { ...options, publicSiteSlugOverride: slug }
  const req = new Request(`https://www.yoursparklesuite.com/${slug}`)
  const actual = await (await renderAmethystPublicAssetResponse(req, ['Homepage.html'], opts)).text()
  const expected = await (await frozenLive(req, ['Homepage.html'], opts)).text()
  expect(hash(actual)).toBe(hash(expected))
  expect(mocks.render).not.toHaveBeenCalled()
})
