import { generateKeyPairSync } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'

import {
  chunkGa4ReportRequests,
  GA4_MAX_REPORTS_PER_BATCH,
  runGa4DashboardReport,
  type Ga4DashboardNumbers,
} from '@/lib/services/ga4-data-api'
import {
  GA4_CACHE_TTL_MS,
  GA4_SHORT_CACHE_TTL_MS,
  ga4NumbersQuality,
  isGa4CacheFresh,
  loadRepGa4Dashboard,
} from '@/lib/services/rep-ga4-dashboard'
import {
  bucketGa4Sources,
  buildSiteTrafficLedger,
  buildTrafficMonthBars,
  calendarDayKey,
  dailyChartAxisLabels,
  joinOpenedSentence,
  pageViewComparisonCopy,
  pickSiteTrafficTakeaway,
  plainPageName,
  resolveTrafficPeriod,
  siteTrafficAnalyticsKey,
  summarizeTrafficPeriod,
  takeawayHeading,
  type TakeawayFacts,
} from '@/lib/services/site-traffic'
import { dailyVisitorHash, interpretPublicSiteVisit } from '@/lib/services/site-visit-summary'

const NOW = new Date('2026-12-17T17:00:00.000Z')
const ZONE = 'America/New_York'

function facts(overrides: Partial<TakeawayFacts> = {}): TakeawayFacts {
  return {
    pageViews: 40,
    previousPageViews: 30,
    joinViews: 0,
    previousJoinViews: 0,
    qrVisits: 0,
    showDayCount: 0,
    showDayViews: 0,
    otherDayCount: 0,
    otherDayViews: 0,
    siteAgeDays: 40,
    ga4Processing: false,
    knownSessions: 0,
    topSourceLabel: null,
    topSourceSessions: 0,
    uniqueCounting: false,
    historyLabel: 'October 17, 2026',
    ...overrides,
  }
}

function adminFor(args: {
  properties?: Record<string, Record<string, unknown> | null>
  cache?: Record<string, Record<string, unknown> | null>
  onUpsert?: (row: Record<string, unknown>) => void
}) {
  return {
    from(table: string) {
      const filters: Record<string, string> = {}
      const api = {
        select() {
          return api
        },
        eq(column: string, value: string) {
          filters[column] = value
          return api
        },
        maybeSingle: async () => {
          if (table === 'rep_analytics_properties') {
            return { data: args.properties?.[filters.rep_id] ?? null, error: null }
          }
          if (table === 'rep_ga4_report_cache' && filters.report_key === 'site_traffic_realtime') {
            return { data: null, error: null }
          }
          if (table === 'rep_ga4_report_cache') {
            return { data: args.cache?.[filters.rep_id] ?? null, error: null }
          }
          return { data: null, error: null }
        },
        upsert: async (row: Record<string, unknown>) => {
          args.onUpsert?.(row)
          return { error: null }
        },
      }
      return api
    },
  }
}

const REP = '9a971c05-3631-443e-bcb8-4e9a26e15885'
const PROPERTY = '559313613'
const ENV = {
  GA4_READER_SERVICE_ACCOUNT_JSON: JSON.stringify({
    client_email: 'reader@example.iam.gserviceaccount.com',
    private_key: '-----BEGIN PRIVATE KEY-----\nnot-used\n-----END PRIVATE KEY-----\n',
  }),
}
const sampleReport: Ga4DashboardNumbers = {
  pageViews: 12,
  visitors: 4,
  topPages: [{ label: '/', value: 9 }],
  sources: [{ label: 'google', value: 3 }],
  devices: [{ label: 'Mobile', value: 3 }],
}

describe('site traffic periods', () => {
  it('compares this month with the same days last month in the rep time zone', () => {
    const october = resolveTrafficPeriod({
      period: 'this-month',
      now: new Date('2026-10-17T15:00:00.000Z'),
      timeZone: ZONE,
    })
    expect(october.firstMonth).toBe(true)
    expect(october.comparison).toBeNull()
    expect(october.start).toEqual({ year: 2026, month: 10, day: 17 })
    expect(october.end).toEqual({ year: 2026, month: 10, day: 17 })

    const november = resolveTrafficPeriod({
      period: 'this-month',
      now: new Date('2026-11-17T16:00:00.000Z'),
      timeZone: ZONE,
    })
    expect(november.start).toEqual({ year: 2026, month: 11, day: 1 })
    expect(november.end).toEqual({ year: 2026, month: 11, day: 17 })
    expect(november.comparison).toEqual({
      start: { year: 2026, month: 10, day: 1 },
      end: { year: 2026, month: 10, day: 17 },
    })

    const beforeMidnight = resolveTrafficPeriod({
      period: 'this-month',
      now: new Date('2026-11-01T03:30:00.000Z'),
      timeZone: ZONE,
    })
    expect(beforeMidnight.end).toEqual({ year: 2026, month: 10, day: 31 })

    const afterMidnight = resolveTrafficPeriod({
      period: 'this-month',
      now: new Date('2026-11-01T04:30:00.000Z'),
      timeZone: ZONE,
    })
    expect(afterMidnight.start).toEqual({ year: 2026, month: 11, day: 1 })
    expect(afterMidnight.end).toEqual({ year: 2026, month: 11, day: 1 })
  })

  it('clips 7 days and custom dates to the October 17 start', () => {
    const week = resolveTrafficPeriod({
      period: 'last-7',
      now: new Date('2026-10-20T18:00:00.000Z'),
      timeZone: ZONE,
    })
    expect(week.start).toEqual({ year: 2026, month: 10, day: 17 })
    expect(week.end).toEqual({ year: 2026, month: 10, day: 20 })
    expect(week.comparison).toBeNull()

    const custom = resolveTrafficPeriod({
      period: 'custom',
      now: NOW,
      timeZone: ZONE,
      customStart: '2026-09-01',
      customEnd: '2026-12-31',
    })
    expect(custom.start).toEqual({ year: 2026, month: 10, day: 17 })
    expect(custom.end).toEqual({ year: 2026, month: 12, day: 17 })

    const lastMonth = resolveTrafficPeriod({
      period: 'last-month',
      now: new Date('2026-10-20T18:00:00.000Z'),
      timeZone: ZONE,
    })
    expect(lastMonth.countable).toBe(false)
  })

  it('labels only months that have page views, and marks October partial', () => {
    const ledger = buildSiteTrafficLedger({
      now: NOW,
      timeZone: ZONE,
      rows: [
        { viewed_at: '2026-10-17T16:00:00.000Z', path: '/' },
        { viewed_at: '2026-10-18T16:00:00.000Z', path: '/' },
        { viewed_at: '2026-12-02T16:00:00.000Z', path: '/' },
      ],
    })
    const bars = buildTrafficMonthBars(ledger, NOW, ZONE)
    expect(bars.map((bar) => bar.label)).toEqual(['Oct*', 'Dec (so far)'])
    expect(bars.find((bar) => bar.partial)?.pageViews).toBe(2)
  })
})

describe('site traffic rows', () => {
  it('drops deploycheck and other internal sources from every rep-facing total', () => {
    const ledger = buildSiteTrafficLedger({
      now: NOW,
      timeZone: ZONE,
      rows: [
        { viewed_at: '2026-12-17T15:00:00.000Z', src: 'qr', path: '/amethyst/Join.html' },
        { viewed_at: '2026-12-17T15:05:00.000Z', src: 'deploycheck', path: '/amethyst/Join.html' },
        { viewed_at: '2026-12-17T15:06:00.000Z', src: 'internal-smoke', path: '/' },
        { viewed_at: '2026-12-16T15:00:00.000Z', src: null, path: '/Trade.html' },
        { viewed_at: '2026-10-01T15:00:00.000Z', src: 'qr', path: '/' },
      ],
    })
    const summary = summarizeTrafficPeriod(ledger, resolveTrafficPeriod({
      period: 'this-month',
      now: NOW,
      timeZone: ZONE,
    }))
    expect(summary.pageViews).toBe(2)
    expect(summary.qrVisits).toBe(1)
    expect(summary.joinViews).toBe(1)
    expect(summary.pages.map((page) => page.name)).toEqual(['Dance Floor', 'Join my team'])
    expect(plainPageName('/shows')).toBe('Shows')
    expect(JSON.stringify(summary)).not.toContain('deploycheck')
  })

  it('counts people only after the salt exists, and never stores a raw address', () => {
    const withoutSalt = dailyVisitorHash({ salt: '', userAgent: 'Browser', now: NOW })
    const userAgent = 'Mozilla/5.0 Chrome'
    const withSalt = dailyVisitorHash({
      salt: 'salt',
      userAgent,
      now: NOW,
      networkHint: '203.0.113.10',
    })
    const otherHint = dailyVisitorHash({
      salt: 'salt',
      userAgent,
      now: NOW,
      networkHint: '203.0.113.11',
    })
    expect(withoutSalt).toBeNull()
    expect(withSalt).toMatch(/^[a-f0-9]{32}$/)
    expect(withSalt).not.toBe(otherHint)
    expect(withSalt).not.toContain('203.0.113.10')

    const headers = new Headers({
      'user-agent': 'Mozilla/5.0 Chrome',
      'x-vercel-forwarded-for': '203.0.113.10',
    })
    const visit = interpretPublicSiteVisit({
      headers,
      body: { path: '/blingkitchen' },
      now: NOW,
      salt: 'salt',
    })
    expect(visit.action).toBe('insert')
    if (visit.action !== 'insert') return
    expect(JSON.stringify(visit.row)).not.toContain('203.0.113.10')
    expect(visit.row.visitor_day_hash).toBe(withSalt)

    const ledger = buildSiteTrafficLedger({
      now: NOW,
      timeZone: ZONE,
      uniqueCounting: true,
      uniqueSince: '2026-12-01',
      rows: [
        { viewed_at: '2026-11-20T15:00:00.000Z', path: '/', visitor_day_hash: 'a'.repeat(32) },
        { viewed_at: '2026-12-10T15:00:00.000Z', path: '/', visitor_day_hash: 'b'.repeat(32) },
        { viewed_at: '2026-12-11T15:00:00.000Z', path: '/', visitor_day_hash: 'b'.repeat(32) },
        { viewed_at: '2026-12-11T16:00:00.000Z', path: '/' },
      ],
    })
    const summary = summarizeTrafficPeriod(ledger, resolveTrafficPeriod({
      period: 'this-month',
      now: NOW,
      timeZone: ZONE,
    }))
    expect(summary.pageViews).toBe(3)
    expect(summary.people).toBe(1)
    expect(summary.peopleSince).toBe('2026-12-01')
  })
})

describe('site traffic takeaway', () => {
  it('uses the too-early line until there is enough to compare', () => {
    expect(pickSiteTrafficTakeaway(facts({ pageViews: 4, siteAgeDays: 40 })).text).toContain('Your site is new')
    expect(pickSiteTrafficTakeaway(facts({ pageViews: 40, siteAgeDays: 2 })).id).toBe('T1')
  })

  it('skips the source rule while Google Analytics is still processing', () => {
    const ready = pickSiteTrafficTakeaway(facts({
      knownSessions: 25,
      topSourceLabel: 'TikTok',
      topSourceSessions: 15,
      ga4Processing: false,
    }))
    const processing = pickSiteTrafficTakeaway(facts({
      knownSessions: 25,
      topSourceLabel: 'TikTok',
      topSourceSessions: 15,
      ga4Processing: true,
      showDayCount: 2,
      showDayViews: 20,
      otherDayCount: 3,
      otherDayViews: 9,
    }))
    expect(ready.id).toBe('T2')
    expect(ready.text).toContain('page views')
    expect(ready.text).toContain('TikTok (60%)')
    expect(processing.id).toBe('T3')
    expect(processing.text).toContain('averaged 10 page views')
    expect(processing.text).toContain('compared with 3')
  })

  it('follows join, QR, and overall change rules, and says about the same under 5%', () => {
    expect(pickSiteTrafficTakeaway(facts({
      joinViews: 8,
      previousJoinViews: 3,
    })).text).toBe('8 Join page views so far this month, up from 3 at this point last month.')

    expect(pickSiteTrafficTakeaway(facts({
      previousPageViews: null,
      previousJoinViews: null,
      joinViews: 2,
      uniqueCounting: true,
    })).text).toBe('2 people opened your Join page this month.')

    expect(pickSiteTrafficTakeaway(facts({
      previousPageViews: null,
      previousJoinViews: null,
      qrVisits: 6,
      pageViews: 40,
    })).text).toBe('Your QR cards brought 6 visits this month, 15% of your page views.')

    expect(pickSiteTrafficTakeaway(facts({
      pageViews: 20,
      previousPageViews: 20,
    })).text).toContain('about the same')

    expect(pickSiteTrafficTakeaway(facts({
      pageViews: 30,
      previousPageViews: 20,
    })).text).toContain('50% more')

    expect(pickSiteTrafficTakeaway(facts({
      previousPageViews: null,
      previousJoinViews: null,
    })).text).toContain('since counting started on October 17, 2026')
  })

  it('buckets TikTok, Google, and Facebook without treating an unset source as known', () => {
    const buckets = bucketGa4Sources([
      { label: 'tiktok', value: 10 },
      { label: 'google', value: 4 },
      { label: 'instagram', value: 3 },
      { label: 'facebook', value: 2 },
      { label: '(direct)', value: 1 },
      { label: '(not set)', value: 9 },
    ])
    expect(buckets.knownSessions).toBe(20)
    expect(buckets.topSourceLabel).toBe('TikTok')
    expect(buckets.sources.find((row) => row.label === 'Facebook / IG')?.value).toBe(5)
  })
})

describe('GA4 cache rules', () => {
  it('keeps a good result for about an hour and an empty or failed result for a few minutes', () => {
    const now = new Date('2026-12-17T18:00:00.000Z')
    expect(GA4_CACHE_TTL_MS).toBe(60 * 60 * 1000)
    expect(GA4_SHORT_CACHE_TTL_MS).toBeLessThanOrEqual(5 * 60 * 1000)
    expect(isGa4CacheFresh(new Date(now.getTime() - 30 * 60 * 1000).toISOString(), now, 'ok')).toBe(true)
    expect(isGa4CacheFresh(new Date(now.getTime() - 61 * 60 * 1000).toISOString(), now, 'ok')).toBe(false)
    expect(isGa4CacheFresh(new Date(now.getTime() - 2 * 60 * 1000).toISOString(), now, 'empty')).toBe(true)
    expect(isGa4CacheFresh(new Date(now.getTime() - 6 * 60 * 1000).toISOString(), now, 'empty')).toBe(false)
    expect(isGa4CacheFresh(new Date(now.getTime() - 6 * 60 * 1000).toISOString(), now, 'failed')).toBe(false)
    expect(ga4NumbersQuality({ pageViews: 0, visitors: 0, topPages: [], sources: [], devices: [] })).toBe('empty')
    expect(ga4NumbersQuality({ ...sampleReport, quality: 'failed' })).toBe('failed')
  })

  it('does not keep an empty result warm for an hour', async () => {
    const writes: Array<Record<string, unknown>> = []
    const runReport = vi.fn(async () => ({
      pageViews: 0,
      visitors: 0,
      topPages: [],
      sources: [],
      devices: [],
    }))
    const now = new Date('2026-12-17T18:00:00.000Z')
    await loadRepGa4Dashboard({
      supabase: adminFor({
        properties: { [REP]: { ga4_property_id: PROPERTY, enabled: true } },
        onUpsert: (row) => writes.push(row),
      }) as never,
      repId: REP,
      env: ENV,
      now,
      runReport,
    })
    expect(runReport).toHaveBeenCalledTimes(1)
    expect((writes[0]?.payload as { quality?: string }).quality).toBe('empty')

    const fetchedAt = now.toISOString()
    const again = vi.fn(async () => sampleReport)
    const cached = await loadRepGa4Dashboard({
      supabase: adminFor({
        properties: { [REP]: { ga4_property_id: PROPERTY, enabled: true } },
        cache: {
          [REP]: {
            payload: { pageViews: 0, visitors: 0, topPages: [], sources: [], devices: [], quality: 'empty' },
            fetched_at: fetchedAt,
          },
        },
      }) as never,
      repId: REP,
      env: ENV,
      now: new Date(now.getTime() + 2 * 60 * 1000),
      runReport: again,
    })
    expect(again).not.toHaveBeenCalled()
    expect(cached.status).toBe('processing')
    expect(cached.pageViews).toBeNull()

    const later = vi.fn(async () => sampleReport)
    const refreshed = await loadRepGa4Dashboard({
      supabase: adminFor({
        properties: { [REP]: { ga4_property_id: PROPERTY, enabled: true } },
        cache: {
          [REP]: {
            payload: { pageViews: 0, visitors: 0, topPages: [], sources: [], devices: [], quality: 'empty' },
            fetched_at: fetchedAt,
          },
        },
      }) as never,
      repId: REP,
      env: ENV,
      now: new Date(now.getTime() + 6 * 60 * 1000),
      runReport: later,
    })
    expect(later).toHaveBeenCalledTimes(1)
    expect(refreshed.status).toBe('ready')
    expect(refreshed.pageViews).toBe(12)
  })

  it('stores a failed fetch for a few minutes and does not present it as zero', async () => {
    const writes: Array<Record<string, unknown>> = []
    const summary = await loadRepGa4Dashboard({
      supabase: adminFor({
        properties: { [REP]: { ga4_property_id: PROPERTY, enabled: true } },
        onUpsert: (row) => writes.push(row),
      }) as never,
      repId: REP,
      env: ENV,
      now: new Date('2026-12-17T18:00:00.000Z'),
      runReport: async () => null,
    })
    expect((writes[0]?.payload as { quality?: string }).quality).toBe('failed')
    expect(summary.status).toBe('unavailable')
    expect(summary.pageViews).toBeNull()
  })
})

describe('site traffic copy and fetch key', () => {
  it('names the comparison after the selected period', () => {
    const ledger = buildSiteTrafficLedger({ now: NOW, timeZone: ZONE, rows: [] })
    const week = summarizeTrafficPeriod(ledger, resolveTrafficPeriod({
      period: 'last-7',
      now: new Date('2026-10-20T18:00:00.000Z'),
      timeZone: ZONE,
    }))
    const dates = summarizeTrafficPeriod(ledger, resolveTrafficPeriod({
      period: 'custom',
      now: new Date('2026-10-20T18:00:00.000Z'),
      timeZone: ZONE,
      customStart: '2026-10-17',
      customEnd: '2026-10-20',
    }))
    expect(pageViewComparisonCopy(week)).toBe('Not enough counted days in the previous 7 days to compare yet.')
    expect(pageViewComparisonCopy(dates)).toBe('Not enough counted days in the previous equal span to compare yet.')
    expect(takeawayHeading(week.period)).toBe('Your takeaway for the last 7 days')
    expect(takeawayHeading(dates.period)).toBe('Your takeaway for these dates')
    expect(joinOpenedSentence(week.period)).toBe('Times your Join my team page was opened in the last 7 days.')
    expect(joinOpenedSentence(dates.period)).toBe('Times your Join my team page was opened in this date range.')
    expect(pickSiteTrafficTakeaway(facts({
      spanPhrase: 'in the last 7 days',
      comparisonPhrase: 'in the previous 7 days',
      samePeriodPhrase: 'the previous 7 days',
      joinViews: 8,
      previousJoinViews: 3,
    })).text).toBe('8 Join page views so far in the last 7 days, up from 3 in the previous 7 days.')
  })

  it('uses one axis label for a single day', () => {
    expect(dailyChartAxisLabels(['Oct 17'])).toEqual(['Oct 17'])
    expect(dailyChartAxisLabels(['Oct 17', 'Oct 18'])).toEqual(['Oct 17', 'Oct 18'])
    expect(dailyChartAxisLabels(['Oct 1', 'Oct 9', 'Oct 17'])).toEqual(['Oct 1', 'Oct 9', 'Oct 17'])
  })

  it('keeps the analytics request key stable when the clock ticks on the same days', () => {
    const morning = resolveTrafficPeriod({
      period: 'this-month',
      now: new Date('2026-12-17T15:00:00.000Z'),
      timeZone: ZONE,
    })
    const evening = resolveTrafficPeriod({
      period: 'this-month',
      now: new Date('2026-12-17T22:30:00.000Z'),
      timeZone: ZONE,
    })
    expect(morning.start).not.toBe(evening.start)
    const morningKey = siteTrafficAnalyticsKey({
      ga4Provided: false,
      countable: morning.countable,
      startKey: calendarDayKey(morning.start),
      endKey: calendarDayKey(morning.end),
    })
    const eveningKey = siteTrafficAnalyticsKey({
      ga4Provided: false,
      countable: evening.countable,
      startKey: calendarDayKey(evening.start),
      endKey: calendarDayKey(evening.end),
    })
    expect(morningKey).toBe('2026-12-01:2026-12-17')
    expect(eveningKey).toBe(morningKey)
    const week = resolveTrafficPeriod({
      period: 'last-7',
      now: new Date('2026-12-17T22:30:00.000Z'),
      timeZone: ZONE,
    })
    expect(siteTrafficAnalyticsKey({
      ga4Provided: false,
      countable: week.countable,
      startKey: calendarDayKey(week.start),
      endKey: calendarDayKey(week.end),
    })).not.toBe(morningKey)
    expect(siteTrafficAnalyticsKey({
      ga4Provided: true,
      countable: true,
      startKey: '2026-12-01',
      endKey: '2026-12-17',
    })).toBeNull()
  })
})

describe('GA4 batch size', () => {
  it('never sends more than 5 reports in one batch', async () => {
    expect(GA4_MAX_REPORTS_PER_BATCH).toBe(5)
    const oversized = chunkGa4ReportRequests(Array.from({ length: 7 }, (_, index) => index), 9)
    expect(oversized.map((chunk) => chunk.length)).toEqual([5, 2])
    expect(oversized.every((chunk) => chunk.length <= 5)).toBe(true)

    const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
    const sizes: number[] = []
    const result = await runGa4DashboardReport({
      propertyId: '123456789',
      account: {
        clientEmail: 'reader@example.iam.gserviceaccount.com',
        privateKey: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
      },
      fetchImpl: async (input, init) => {
        const url = String(input)
        if (url.includes('oauth2.googleapis.com')) {
          return new Response(JSON.stringify({ access_token: 'test-token' }), { status: 200 })
        }
        const body = JSON.parse(String(init?.body)) as { requests?: unknown[] }
        const count = body.requests?.length ?? 0
        sizes.push(count)
        expect(count).toBeLessThanOrEqual(GA4_MAX_REPORTS_PER_BATCH)
        return new Response(JSON.stringify({
          reports: Array.from({ length: count }, () => ({ rows: [] })),
        }), { status: 200 })
      },
    })

    expect(sizes).toEqual([5, 2])
    expect(result).not.toBeNull()
    expect(result?.regions).toEqual([])
    expect(result?.newVisitors).toBe(0)
  })
})
