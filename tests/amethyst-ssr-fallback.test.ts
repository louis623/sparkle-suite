import { beforeEach, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { defaultAmethystHomepageTemplateData as homepage } from '@/lib/amethyst/homepage-template-data'
import { defaultAmethystJoinTemplateData as join } from '@/lib/amethyst/join-template-data'
import { defaultAmethystTradeTemplateData as trade } from '@/lib/amethyst/trade-template-data'
const mocks = vi.hoisted(() => ({ bootstrap: vi.fn(), render: vi.fn() }))
vi.mock('@/lib/amethyst/homepage-bootstrap-response', () => ({ buildHomepageBootstrapResponse: mocks.bootstrap }))
vi.mock('@/lib/amethyst/homepage-first-paint', () => ({ renderHomepageFirstPaint: mocks.render }))
vi.mock('@/lib/amethyst/preview-template-data', () => ({ loadAmethystPreviewTemplateData: async () => ({ appearancePreset: 'amethyst', homepage, join, trade }) }))
import { renderAmethystPublicAssetResponse } from '@/lib/amethyst/public-asset-response'
beforeEach(() => { mocks.bootstrap.mockReset().mockResolvedValue(new Response('window.QA=true;')); mocks.render.mockReset().mockImplementation(async html => html) })
it.each(['throw', 'timeout'])('returns the client page with 200 when bootstrap fails: %s', async mode => {
  mocks.bootstrap.mockImplementation(() => mode === 'throw' ? Promise.reject(Error('forced')) : new Promise(() => {}))
  const response = await renderAmethystPublicAssetResponse(new Request('https://example.test/shop'), ['Homepage.html'], { repIdOverride: 'test-rep' })
  expect(response.status).toBe(200)
  const html = await response.text()
  expect(html).toContain('compiled/homepage.js')
  expect(html).toContain('data-template-src=')
  expect(html).not.toContain('data-server-rendered="true"')
})
it('returns the client page with 200 when the SSR enhancement throws', async () => {
  mocks.render.mockRejectedValue(Error('forced render failure'))
  const response = await renderAmethystPublicAssetResponse(new Request('https://example.test/shop'), ['Homepage.html'], { repIdOverride: 'test-rep' })
  expect(response.status).toBe(200)
  expect(await response.text()).toContain('compiled/homepage.js')
})
it('a real VM CPU timeout returns the exact untouched client page', async () => {
  const { renderHomepageFirstPaint } = await vi.importActual<typeof import('@/lib/amethyst/homepage-first-paint')>('@/lib/amethyst/homepage-first-paint')
  const html = readFileSync('public/amethyst/Homepage.html', 'utf8')
  const result = await renderHomepageFirstPaint(html, { appearancePreset: 'amethyst', homepage, join, trade }, new URL('https://example.test/shop'), 'while (true) {}')
  expect(result).toBe(html)
})
