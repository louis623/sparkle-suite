import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ rep: vi.fn(), code: vi.fn(), snapshot: vi.fn(), admin: vi.fn() }))
vi.mock('@/lib/amethyst/preview-rep', () => ({ resolveAmethystPreviewRep: mocks.rep }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: mocks.admin }))
vi.mock('@/lib/live-lineup/service', () => ({ getEffectiveLiveQueueSnapshot: mocks.snapshot }))
import { GET } from '@/app/api/amethyst/live-lineup/route'
beforeEach(() => {
  vi.resetAllMocks()
  mocks.admin.mockReturnValue({})
  mocks.rep.mockResolvedValue({ id: 'synthetic-britt', public_site_slug: 'brittwithbling' })
  mocks.code.mockResolvedValue('TEST-PRIVATE')
  mocks.snapshot.mockResolvedValue({ queue: ['Example One'], ageSeconds: 208, isFresh: false, lastUpdated: '2026-09-06T01:00:00Z' })
})
describe('read-only tenant-scoped lineup endpoint', () => {
  it('does not fall back to a demo rep or expose another rep', async () => {
    expect((await GET(new Request('https://www.yoursparklesuite.com/api/amethyst/live-lineup'))).status).toBe(404)
    expect(mocks.rep).not.toHaveBeenCalled()
    mocks.rep.mockResolvedValue(null)
    expect((await GET(new Request('https://www.yoursparklesuite.com/api/amethyst/live-lineup?c=other'))).status).toBe(404)
    expect(mocks.snapshot).not.toHaveBeenCalled()
  })
  it('supports other strictly resolved tenants, not only Brittany', async () => {
    mocks.rep.mockResolvedValue({ id: 'synthetic-other', public_site_slug: 'other' })
    const response = await GET(new Request('https://www.yoursparklesuite.com/api/amethyst/live-lineup?c=other'))
    expect(response.status).toBe(200)
    expect(mocks.snapshot).toHaveBeenCalledWith(expect.anything(), 'synthetic-other')
  })
  it('returns no-store customer data without codes or internal identities', async () => {
    const result = await GET(new Request('https://brittwithbling.com/api/amethyst/live-lineup'))
    expect(result.status).toBe(200)
    expect(result.headers.get('cache-control')).toBe('no-store')
    const body = await result.json()
    expect(body.liveQueueState).toBe('delayed')
    expect(body.liveQueueEntries).toHaveLength(1)
    expect(JSON.stringify(body)).not.toMatch(/TEST-PRIVATE|synthetic-britt/)
    expect(mocks.rep).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ repId: 'brittwithbling.com', strict: true }))
  })
  it('reports temporary failures rather than returning a successful empty queue', async () => {
    mocks.snapshot.mockRejectedValueOnce(new Error('database unavailable'))
    expect((await GET(new Request('https://brittwithbling.com/api/amethyst/live-lineup'))).status).toBe(503)
    mocks.snapshot.mockResolvedValueOnce(null)
    expect((await GET(new Request('https://brittwithbling.com/api/amethyst/live-lineup'))).status).toBe(503)
  })
})

it('selects grouped output only for explicit capability on custom domains and platform slugs', async () => {
  const { projectPublicLineup } = await import('@/lib/amethyst/public-live-lineup')
  const presentation = projectPublicLineup({ scope: 'private-tenant:show', entries: [
    { id: 'private:1', name: 'April', lastName: 'Smith', identityEligible: true },
    { id: 'private:2', name: 'April', lastName: 'Smith', identityEligible: true },
  ], events: [], cursor: 0, now: Date.parse('2026-09-26T12:00:00Z') })
  mocks.snapshot.mockResolvedValue({ queue: ['April', 'April'], ageSeconds: 1, staleAfterSeconds: 45, isFresh: true,
    lastUpdated: '2026-09-26T12:00:00Z', presentation })
  for (const url of ['https://brittwithbling.com/api/amethyst/live-lineup', 'https://www.yoursparklesuite.com/api/amethyst/live-lineup?publicSiteSlug=brittwithbling']) {
    const legacy = await GET(new Request(url, { headers: { referer: 'https://brittwithbling.com/?lineupPresentation=grouped-v1' } }))
    const oldBody = await legacy.json()
    expect(oldBody.liveQueueEntries).toHaveLength(2)
    expect(oldBody.liveQueuePresentation).toBeUndefined()
    const grouped = await GET(new Request(url + (url.includes('?') ? '&' : '?') + 'lineupPresentation=grouped-v1'))
    const body = await grouped.json()
    expect(body.liveQueuePresentation).toBe('grouped-v1')
    expect(body.liveQueueEntries).toHaveLength(1)
    expect(body.liveQueueEntries[0].remainingOrders).toBe(2)
    expect(grouped.headers.get('cache-control')).toBe('no-store')
    expect(JSON.stringify(body)).not.toMatch(/Smith|lastName|private:|private-tenant|identityEligible/)
  }
})
