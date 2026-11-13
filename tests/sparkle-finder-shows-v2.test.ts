import type { SupabaseClient } from '@supabase/supabase-js'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GET } from '@/app/api/public/finder/live-shows/route'
import { listFinderShowsV2, parseFinderShowFilters } from '@/lib/sparkle-finder/shows-v2'
import { runSparkleSuiteFinderContractCheck } from '../apps/finder/scripts/check-sparkle-suite-finder-api'
import { buildDemoSmokePlan, runDemoSmoke } from '../scripts/smoke-demo-readiness'

const id = '11111111-1111-4111-8111-111111111111'
const now = new Date('2026-11-13T00:05:00Z')
const rep = { id, display_name: 'Ava Example', business_name: 'Example Sparkles',
  public_site_slug: 'examplesparkles', finder_directory_visible: true, status: 'active', account_classification: 'customer' }
const filters = { limit: 5, liveOnly: false }
function row(key: string, time: string, status = 'scheduled') {
  return { id: key, event_time: time, status, duration_minutes: 60, rep }
}

// Each response is one PostgREST page. Recording the actual filters makes the
// fixtures fail if rep visibility, entitlement, window, order or seek is dropped.
function fixture(pages: unknown[][], error = false) {
  const query = {
    select: vi.fn(), eq: vi.fn(), in: vi.fn(), or: vi.fn(), not: vi.fn(),
    gt: vi.fn(), lt: vi.fn(), lte: vi.fn(), order: vi.fn(), limit: vi.fn(),
  }
  for (const mock of Object.values(query)) mock.mockReturnValue(query)
  const responses = pages.slice()
  query.limit.mockImplementation(async () => {
    if (error) return { error: { message: 'synthetic private diagnostic' } }
    const data = responses.shift()
    if (!data) throw new Error('Unrecorded page')
    return { data, error: null }
  })
  const from = vi.fn(() => query)
  return { client: { from } as unknown as SupabaseClient, query }
}

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })

describe('v2 public show contract', () => {
  it('finds an overlapping scheduled show across midnight and across a raw page boundary', async () => {
    const expired = row('expired', '2026-11-12T20:00:00Z')
    const first = row('first', '2026-11-12T23:45:00Z')
    const second = row('second', first.event_time)
    const data = fixture([[], [expired], [first, second]])
    const window = { windowStart: Date.parse('2026-11-13T00:00:00Z'), windowEnd: Date.parse('2026-11-13T01:00:00Z') }
    const result = await listFinderShowsV2({ ...filters, limit: 1, liveOnly: true, repId: id, ...window }, data.client, now)
    expect(result.meta).toEqual({ status: 'partial', coverage: 'truncated', generatedAt: now.toISOString() })
    expect(result.shows).toMatchObject([{ showId: 'first', repId: id, publicLabel: 'Ava Example',
      businessName: rep.business_name, repFirstName: 'Ava', durationMinutes: 60, endTime: '2026-11-13T00:45:00.000Z' }])
    expect(data.query.eq).toHaveBeenCalledWith('rep_id', id)
    expect(data.query.eq).toHaveBeenCalledWith('rep.finder_directory_visible', true)
    expect(data.query.eq).toHaveBeenCalledWith('rep.account_classification', 'customer')
    expect(data.query.gt).toHaveBeenCalledWith('rep.trial.expires_at', now.toISOString())
    expect(data.query.or).toHaveBeenCalledWith('paid.not.is.null,trial.not.is.null', { referencedTable: 'rep' })
    expect(data.query.lt).toHaveBeenCalledWith('event_time', '2026-11-13T01:00:00.000Z')
    expect(data.query.lte).toHaveBeenCalledWith('event_time', now.toISOString())
    expect(data.query.or).toHaveBeenCalledWith(expect.stringContaining('id.gt.expired'))
    expect(data.query.order.mock.calls.slice(0, 2)).toEqual([['event_time'], ['id']])
  })

  it('uses fresh joined public eligibility, hides revoked/hidden rows, and proves a scoped empty', async () => {
    const event = row('show', '2026-11-13T01:00:00Z')
    const visible = fixture([[], [event], []])
    expect((await listFinderShowsV2(filters, visible.client, now)).shows).toHaveLength(1)
    const hidden = fixture([[], [{ ...event, rep: { ...rep, finder_directory_visible: false } }], []])
    const absent = fixture([[], []])
    const scoped = { ...filters, slug: rep.public_site_slug }
    const result = await listFinderShowsV2(scoped, hidden.client, now)
    expect(result).toEqual(await listFinderShowsV2(scoped, absent.client, now))
    expect(result).toEqual({ shows: [], meta: { status: 'ok', coverage: 'complete', generatedAt: now.toISOString() } })
    expect(hidden.query.eq).toHaveBeenCalledWith('rep.public_site_slug', rep.public_site_slug)
    expect(hidden.query.not).toHaveBeenCalledWith('rep.public_site_slug', 'in', expect.stringContaining('sparklebetademo'))
  })

  it('returns neutral unknown coverage for configuration failures and query errors', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')
    expect(await listFinderShowsV2(filters, undefined, now)).toEqual({
      shows: [], meta: { status: 'unconfigured', coverage: 'unknown', generatedAt: now.toISOString() },
    })
    expect(await listFinderShowsV2(filters, fixture([], true).client, now)).toEqual({
      shows: [], meta: { status: 'unavailable', coverage: 'unknown', generatedAt: now.toISOString() },
    })
  })

  it.each(['slug=a!', 'repId=invalid', 'repId=' + id + '&slug=examplesparkles', 'liveOnly=maybe',
    'limit=3&limit=2', 'windowStart=2026-11-13', 'windowStart=2026-02-30T00:00:00Z&windowEnd=2026-03-01T00:00:00Z',
    'windowStart=2026-11-14T00:00:00Z&windowEnd=2026-11-13T00:00:00Z',
    'windowStart=2026-11-13T00:00:00Z&windowEnd=2027-02-13T00:00:00Z'])('rejects invalid v2 parameters %s', async (params) => {
    const response = await GET(new Request('http://fixture.local/api/public/finder/live-shows?contract=v2&' + params))
    expect(response.status).toBe(400)
    expect(response.headers.get('cache-control')).toBe('no-store')
  })

  it('normalizes an explicit offset at the DST boundary', () => {
    const params = new URLSearchParams({ windowStart: '2026-11-01T01:30:00-04:00', windowEnd: '2026-11-01T01:30:00-05:00' })
    const parsed = parseFinderShowFilters(params, 5)!
    expect(parsed.windowEnd! - parsed.windowStart!).toBe(3600000)
  })
})

describe('independent consumer recordings', () => {
  const recording = { shows: [{ showId: 'fixture-show', showName: 'Example Sparkles', repFirstName: 'Ava',
    startsAt: '2026-11-14T01:00:00Z', status: 'scheduled', customerSiteUrl: 'https://fixture.example/examplesparkles',
    durationMinutes: 60, endTime: '2026-11-14T02:00:00Z' }] }

  it('passes the unchanged shows recording through the exported embedded checker', async () => {
    const fetcher = vi.fn(async (input: string) => {
      const url = new URL(input)
      if (url.pathname.endsWith('/live-shows')) return Response.json(recording)
      if (url.pathname.endsWith('/catalog')) return Response.json({ items: [] })
      if (url.pathname.endsWith('/reps')) return Response.json({ reps: [] })
      return Response.json({}, { status: 404 })
    })
    const report = await runSparkleSuiteFinderContractCheck({ baseUrl: 'https://fixture.example', fetcher })
    expect(fetcher.mock.calls.some(([url]) => url.endsWith('/live-shows?limit=5'))).toBe(true)
    expect(report.failures.filter(message => /live.shows/i.test(message))).toEqual([])
  })

  it('passes the limit-only recording through Suite readiness and its calendar link', async () => {
    const fetcher = vi.fn(async (input: string) => {
      const url = new URL(input)
      if (url.origin !== 'https://fixture.example') throw new Error('Unexpected network')
      if (url.pathname.endsWith('/live-shows')) return Response.json(recording)
      return new Response('/api/amethyst/homepage-template /api/amethyst/trade-template /api/amethyst/join-template window.AMETHYST_HOMEPAGE_TEMPLATE_DATA window.AMETHYST_TRADE_TEMPLATE_DATA window.AMETHYST_JOIN_TEMPLATE_DATA')
    })
    vi.stubGlobal('fetch', fetcher)
    const result = await runDemoSmoke(buildDemoSmokePlan({ category: 'local_product' }), { NEXT_PUBLIC_APP_URL: 'https://fixture.example' })
    expect(result.ok).toBe(true)
    expect(fetcher.mock.calls.map(([url]) => new URL(url).pathname)).toContain('/examplesparkles')
  })
})
