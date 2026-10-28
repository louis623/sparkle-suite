import { afterEach, expect, it, vi } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { renderHomepageFirstPaint } from '@/lib/amethyst/homepage-first-paint'
import { buildAmethystHomepageBootstrapScript, defaultAmethystHomepageTemplateData as homepage } from '@/lib/amethyst/homepage-template-data'
import { defaultAmethystJoinTemplateData as join } from '@/lib/amethyst/join-template-data'
import { defaultAmethystTradeTemplateData as trade } from '@/lib/amethyst/trade-template-data'
import { renderAmethystPublicAssetResponse } from '@/lib/amethyst/legacy/public-asset-response'
import { forceHomepageRenderFailure } from '@/lib/amethyst/homepage-preview-probe'
import { evaluateBranchPolicy } from '../scripts/check-active-branch.mjs'

afterEach(() => vi.unstubAllEnvs())
const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')
it('keeps public JSX at frozen Live, without a proxy/route substitution', () => {
  expect(hash(readFileSync('public/amethyst/homepage.jsx'))).toBe(hash(readFileSync('lib/amethyst/legacy/assets/homepage.jsx')))
  expect(readFileSync('proxy.ts', 'utf8')).not.toContain('homepage-source')
  expect(existsSync('app/api/amethyst/homepage-source/route.ts')).toBe(false)
})
it.each(['forest', 'forest-mobile', 'gnome', 'lantern', 'storybook-original'])('serves frozen shared gnome image %s', async name => {
  const path = `skins/gnome-garden/${name}.webp`
  const response = await renderAmethystPublicAssetResponse(new Request('https://example.test/amethyst/'+path), path.split('/'))
  expect(response.status).toBe(200)
  expect(hash(new Uint8Array(await response.arrayBuffer()))).toBe(hash(readFileSync('public/amethyst/'+path)))
})
it('preserves saved event zones and settings while the SSR video defaults to autoplay', async () => {
  const events = [
    { id: 'a', title: 'Eastern', eventTime: '2099-10-27T20:00:00Z', timeZone: 'America/New_York', durationMinutes: 60, featured: true, description: '', codes: [], collections: [], platforms: [] },
    { id: 'b', title: 'Pacific', eventTime: '2099-10-27T20:00:00Z', timeZone: 'America/Los_Angeles', durationMinutes: 60, featured: false, description: '', codes: [], collections: [], platforms: [] },
  ]
  const data = { ...homepage, heroMotion: 'still' }
  const bootstrap = buildAmethystHomepageBootstrapScript(data, events, 'halloween_pumpkin_cat', { targeted: true })
  const html = await renderHomepageFirstPaint(readFileSync('public/amethyst/Homepage.html','utf8'), { homepage: data, join, trade, appearancePreset: 'halloween_pumpkin_cat' }, new URL('https://example.test/dudesfizzfest'), bootstrap)
  expect(html).toContain('data-sparkle-local-time="true"')
  expect(html).toContain('data-time-zone="America/New_York"')
  expect(html).toContain('data-time-zone="America/Los_Angeles"')
  expect(html).not.toContain('4:00 PM EDT')
  expect(html).not.toContain('1:00 PM PDT')
  expect(html).toContain('aria-pressed="true">Pause animation')
  expect(html).toContain('data-hero-motion="on"')
  expect(data.heroMotion).toBe('still')
})
it('fault probe is impossible on production or the Live project', () => {
  const secret = 'test-only-probe-secret-32-characters'
  const request = new Request('https://example.test/dudesfizzfest', { headers: { 'x-ssr-render-failure': secret } })
  vi.stubEnv('SSR_PREVIEW_PROBE_SECRET', secret)
  vi.stubEnv('VERCEL_ENV', 'preview')
  vi.stubEnv('VERCEL_PROJECT_ID', 'prj_VTY0rpz2O3VBJqJv69iBz8tzLexQ')
  expect(forceHomepageRenderFailure(request)).toBe(true)
  vi.stubEnv('VERCEL_ENV', 'production')
  expect(forceHomepageRenderFailure(request)).toBe(false)
  vi.stubEnv('VERCEL_ENV', 'preview')
  vi.stubEnv('VERCEL_PROJECT_ID', 'prj_zCKmYDx1Sbs9hA1Lokzdv9Qm0TM3')
  expect(forceHomepageRenderFailure(request)).toBe(false)
})
it('requires an approved Windows workbench and the approved preview deployment project', () => {
  const context = { branch: 'codex/ssr-chunk1-fizzfest-home', remoteRepository: 'louis623/sparkle-suite', worktree: 'D:/disposable/verified-clone', platform: 'win32' }
  expect(evaluateBranchPolicy(context)).not.toEqual([])
  expect(evaluateBranchPolicy({ ...context, platform: "linux" })).toEqual([])
  expect(evaluateBranchPolicy({ ...context, isVercel: true, deploymentEnvironment: 'preview', deploymentProjectId: 'prj_zCKmYDx1Sbs9hA1Lokzdv9Qm0TM3' })).not.toEqual([])
  expect(evaluateBranchPolicy({ ...context, isVercel: true, deploymentEnvironment: 'preview', deploymentProjectId: 'prj_VTY0rpz2O3VBJqJv69iBz8tzLexQ' })).toEqual([])
})
