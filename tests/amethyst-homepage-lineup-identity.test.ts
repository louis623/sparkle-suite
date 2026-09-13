import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  admin: vi.fn(),
  events: vi.fn(),
  listings: vi.fn(),
  preview: vi.fn(),
  resolveRep: vi.fn(),
  snapshot: vi.fn(),
}))

vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: mocks.admin }))
vi.mock('@/lib/amethyst/homepage-upcoming-shows', () => ({
  loadAmethystHomepageUpcomingShows: mocks.events,
}))
vi.mock('@/lib/amethyst/trade-board-listings', () => ({
  loadAmethystTradeBoardPreviewListings: mocks.listings,
}))
vi.mock('@/lib/amethyst/preview-template-data', () => ({
  loadAmethystPreviewTemplateData: mocks.preview,
}))
vi.mock('@/lib/amethyst/preview-rep', () => ({
  resolveAmethystPreviewRep: mocks.resolveRep,
}))
vi.mock('@/lib/live-lineup/service', () => ({
  getEffectiveLiveQueueSnapshot: mocks.snapshot,
}))

import { GET } from '@/app/api/amethyst/homepage-template/route'
import {
  defaultAmethystHomepageTemplateData,
} from '@/lib/amethyst/homepage-template-data'
import { defaultAmethystJoinTemplateData } from '@/lib/amethyst/join-template-data'
import { defaultAmethystTradeTemplateData } from '@/lib/amethyst/trade-template-data'

describe('homepage Live Lineup bootstrap identity', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://synthetic.supabase.test')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'synthetic-test-key')
    mocks.admin.mockReset().mockReturnValue({ marker: 'admin' })
    mocks.events.mockReset().mockResolvedValue([])
    mocks.listings.mockReset().mockResolvedValue([])
    mocks.preview.mockReset().mockResolvedValue({
      appearancePreset: 'amethyst',
      homepage: defaultAmethystHomepageTemplateData,
      join: defaultAmethystJoinTemplateData,
      trade: defaultAmethystTradeTemplateData,
    })
    mocks.resolveRep.mockReset()
    mocks.snapshot.mockReset()
  })

  afterEach(() => vi.unstubAllEnvs())

  it.each([
    ['does not resolve', null],
    ['throws', new Error('synthetic lookup failure')],
  ])('does not seed tenant features when corroboration %s', async (_label, result) => {
    if (result instanceof Error) mocks.resolveRep.mockRejectedValue(result)
    else mocks.resolveRep.mockResolvedValue(result)

    const response = await GET(new Request(
      'https://www.yoursparklesuite.com/api/amethyst/homepage-template?c=rep-a&publicSiteSlug=slugtwo',
    ))

    expect(response.status).toBe(200)
    expect(mocks.resolveRep).toHaveBeenCalledWith(
      { marker: 'admin' },
      expect.objectContaining({ repId: 'rep-a', publicSiteSlug: 'slugtwo' }),
    )
    expect(mocks.snapshot).not.toHaveBeenCalled()
    expect(mocks.listings).toHaveBeenCalledWith(expect.objectContaining({
      repId: null,
      publicSiteSlug: 'slugtwo',
      targeted: true,
    }))
  })

  it('uses only the corroborated tenant id for initial Lineup features', async () => {
    mocks.resolveRep.mockResolvedValue({ id: 'rep-a', email: 'a@example.test' })
    mocks.snapshot.mockResolvedValue({
      queue: ['Verified customer'],
      status: 'connected',
      updatedAt: '2026-09-09T20:00:00.000Z',
      sourceReady: true,
      isFresh: true,
      ageSeconds: 0,
    })

    const response = await GET(new Request(
      'https://www.yoursparklesuite.com/api/amethyst/homepage-template?c=rep-a&publicSiteSlug=slugone',
    ))
    const script = await response.text()

    expect(mocks.snapshot).toHaveBeenCalledWith({ marker: 'admin' }, 'rep-a')
    expect(mocks.listings).toHaveBeenCalledWith(expect.objectContaining({ repId: 'rep-a' }))
    expect(script).toContain('Verified customer')
  })
})
