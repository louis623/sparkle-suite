import { afterEach, expect, it, vi } from 'vitest'
import { defaultAmethystHomepageTemplateData as homepage } from '@/lib/amethyst/homepage-template-data'
import { defaultAmethystJoinTemplateData as join } from '@/lib/amethyst/join-template-data'
import { defaultAmethystTradeTemplateData as trade } from '@/lib/amethyst/trade-template-data'
import type { AmethystPreviewTemplateData } from '@/lib/amethyst/preview-template-data'
const mocks = vi.hoisted(() => ({ shows: vi.fn(), trades: vi.fn(), lineup: vi.fn() }))
vi.mock('@/lib/amethyst/homepage-upcoming-shows', () => ({ loadAmethystHomepageUpcomingShows: mocks.shows }))
vi.mock('@/lib/amethyst/trade-board-listings', () => ({ loadAmethystTradeBoardPreviewListings: mocks.trades }))
vi.mock('@/lib/live-lineup/service', () => ({ getEffectiveLiveQueueSnapshot: mocks.lineup }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => ({}) }))
import { buildHomepageBootstrapResponse } from '@/lib/amethyst/homepage-bootstrap-response'
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs() })
it('starts parallel reads immediately, then caps extra data wait after a fresh template becomes ready', async () => {
  vi.useFakeTimers()
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.test')
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'synthetic-test-only')
  mocks.shows.mockResolvedValue([{ id: 'ready-show', title: 'Ready show', eventTime: '2099-10-27T20:00:00Z', timeZone: 'America/New_York', durationMinutes: 60, featured: true, description: '', codes: [], collections: [], platforms: [] }])
  mocks.trades.mockImplementation(() => new Promise(() => {}))
  mocks.lineup.mockImplementation(() => new Promise(() => {}))
  let ready!: (value: AmethystPreviewTemplateData) => void
  const templateData = new Promise<AmethystPreviewTemplateData>(resolve => { ready = resolve })
  const request = new Request('https://example.test/api/amethyst/homepage-template?c=synthetic-rep&publicSiteSlug=dudesfizzfest')
  let finished = false
  const work = buildHomepageBootstrapResponse(request, { templateData, repId: 'synthetic-rep' }).then(value => { finished = true; return value })
  expect(mocks.shows).toHaveBeenCalledTimes(1)
  expect(mocks.trades).toHaveBeenCalledTimes(1)
  expect(mocks.lineup).toHaveBeenCalledTimes(1)
  await vi.advanceTimersByTimeAsync(200)
  expect(finished).toBe(false)
  ready({ homepage, join, trade, appearancePreset: 'halloween_pumpkin_cat' })
  await vi.advanceTimersByTimeAsync(49)
  expect(finished).toBe(false)
  await vi.advanceTimersByTimeAsync(1)
  const response = await work
  expect(response.headers.get('x-sparkle-page-data')).toBe('deferred')
  const text = await response.text()
  expect(text).toContain('Ready show')
  expect(text).toContain('window.SPARKLE_DEFERRED_PAGE_DATA=')
  // A second request starts a new lineup read; no lineup state is cached.
  const next = buildHomepageBootstrapResponse(request, { templateData: Promise.resolve({ homepage: { ...homepage, businessName: 'Next saved setting' }, join, trade, appearancePreset: 'halloween_pumpkin_cat' }), repId: 'synthetic-rep' })
  await vi.advanceTimersByTimeAsync(50)
  expect(await (await next).text()).toContain('Next saved setting')
  expect(mocks.lineup).toHaveBeenCalledTimes(2)
})
