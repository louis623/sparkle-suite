import type { SupabaseClient } from '@supabase/supabase-js'

import {
  readGa4ReaderServiceAccount,
  runGa4DashboardReport,
  runGa4RealtimeReport,
  type Ga4Breakdown,
  type Ga4DashboardNumbers,
} from '@/lib/services/ga4-data-api'

export const GA4_DASHBOARD_REPORT_KEY = 'dashboard_28d'
export const GA4_TRAFFIC_REPORT_KEY = 'site_traffic'
export const GA4_REALTIME_REPORT_KEY = 'site_traffic_realtime'
export const GA4_DASHBOARD_DATE_RANGE = '28daysAgo:today'
export const GA4_REALTIME_DATE_RANGE = '30m'
export const GA4_CACHE_TTL_MS = 60 * 60 * 1000
export const GA4_SHORT_CACHE_TTL_MS = 5 * 60 * 1000
export const GA4_REALTIME_CACHE_TTL_MS = 60 * 1000
const PROPERTY_ID_PATTERN = /^[0-9]{6,15}$/
const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/

export type Ga4CacheQuality = 'ok' | 'empty' | 'failed'

export type RepGa4DashboardStatus = 'ready' | 'processing' | 'not_set_up' | 'unavailable'

export type RepGa4Dashboard = {
  status: RepGa4DashboardStatus
  updatedAt: string | null
  pageViews: number | null
  visitors: number | null
  topPages: Ga4Breakdown[]
  sources: Ga4Breakdown[]
  devices: Ga4Breakdown[]
  regions: Ga4Breakdown[]
  cities: Ga4Breakdown[]
  newVisitors: number | null
  returningVisitors: number | null
  realtimeUsers: number | null
}

type CacheRow = {
  payload: Ga4DashboardNumbers
  fetched_at: string
}

type AnalyticsRow = {
  ga4_property_id: string
  enabled: boolean
}

export function ga4CacheTtlMs(quality: Ga4CacheQuality, realtime = false) {
  if (realtime) return GA4_REALTIME_CACHE_TTL_MS
  return quality === 'ok' ? GA4_CACHE_TTL_MS : GA4_SHORT_CACHE_TTL_MS
}

export function ga4NumbersQuality(numbers: Partial<Ga4DashboardNumbers> | null | undefined): Ga4CacheQuality {
  if (!numbers) return 'failed'
  if (numbers.quality === 'failed') return 'failed'
  const lists = [numbers.topPages, numbers.sources, numbers.devices, numbers.regions, numbers.cities]
  const listed = lists.reduce((sum, rows) => {
    if (!Array.isArray(rows)) return sum
    return sum + rows.reduce((inner, row) => inner + (typeof row?.value === 'number' ? row.value : 0), 0)
  }, 0)
  const total =
    (typeof numbers.pageViews === 'number' ? numbers.pageViews : 0) +
    (typeof numbers.visitors === 'number' ? numbers.visitors : 0) +
    (typeof numbers.newVisitors === 'number' ? numbers.newVisitors : 0) +
    (typeof numbers.returningVisitors === 'number' ? numbers.returningVisitors : 0) +
    listed
  if (numbers.quality === 'empty' || total <= 0) return 'empty'
  return 'ok'
}

export function isGa4CacheFresh(fetchedAt: string, now: Date, quality: Ga4CacheQuality, realtime = false) {
  const time = Date.parse(fetchedAt)
  if (!Number.isFinite(time)) return false
  const age = now.getTime() - time
  return age >= -60_000 && age < ga4CacheTtlMs(quality, realtime)
}

export function emptyRepGa4Dashboard(
  status: Exclude<RepGa4DashboardStatus, 'ready' | 'processing'>,
): RepGa4Dashboard {
  return {
    status,
    updatedAt: null,
    pageViews: null,
    visitors: null,
    topPages: [],
    sources: [],
    devices: [],
    regions: [],
    cities: [],
    newVisitors: null,
    returningVisitors: null,
    realtimeUsers: null,
  }
}

function failedNumbers(): Ga4DashboardNumbers {
  return {
    pageViews: 0,
    visitors: 0,
    topPages: [],
    sources: [],
    devices: [],
    regions: [],
    cities: [],
    newVisitors: 0,
    returningVisitors: 0,
    quality: 'failed',
  }
}

function dashboardFromNumbers(
  numbers: Ga4DashboardNumbers,
  updatedAt: string,
  realtimeUsers: number | null,
): RepGa4Dashboard {
  const quality = ga4NumbersQuality(numbers)
  if (quality !== 'ok') {
    return {
      status: quality === 'empty' ? 'processing' : 'unavailable',
      updatedAt,
      pageViews: null,
      visitors: null,
      topPages: [],
      sources: [],
      devices: [],
      regions: [],
      cities: [],
      newVisitors: null,
      returningVisitors: null,
      realtimeUsers,
    }
  }
  return {
    status: 'ready',
    updatedAt,
    pageViews: numbers.pageViews,
    visitors: numbers.visitors,
    topPages: numbers.topPages,
    sources: numbers.sources,
    devices: numbers.devices,
    regions: numbers.regions ?? [],
    cities: numbers.cities ?? [],
    newVisitors: numbers.newVisitors ?? null,
    returningVisitors: numbers.returningVisitors ?? null,
    realtimeUsers,
  }
}

function asBreakdown(value: unknown): Ga4Breakdown[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const row = item as Partial<Ga4Breakdown>
    if (typeof row.label !== 'string' || typeof row.value !== 'number') return []
    return [{ label: row.label, value: row.value }]
  })
}

function asNumbers(payload: unknown): Ga4DashboardNumbers | null {
  if (!payload || typeof payload !== 'object') return null
  const record = payload as Partial<Ga4DashboardNumbers>
  if (typeof record.pageViews !== 'number' || typeof record.visitors !== 'number') return null
  const quality = record.quality === 'ok' || record.quality === 'empty' || record.quality === 'failed'
    ? record.quality
    : undefined
  return {
    pageViews: record.pageViews,
    visitors: record.visitors,
    topPages: asBreakdown(record.topPages),
    sources: asBreakdown(record.sources),
    devices: asBreakdown(record.devices),
    regions: asBreakdown(record.regions),
    cities: asBreakdown(record.cities),
    newVisitors: typeof record.newVisitors === 'number' ? record.newVisitors : 0,
    returningVisitors: typeof record.returningVisitors === 'number' ? record.returningVisitors : 0,
    quality,
  }
}

function asRealtime(payload: unknown): number | null {
  if (!payload || typeof payload !== 'object') return null
  const users = (payload as { activeUsers?: unknown }).activeUsers
  if (typeof users !== 'number' || users < 0) return null
  return Math.round(users)
}

async function readAnalyticsRow(supabase: SupabaseClient, repId: string) {
  const { data, error } = await supabase
    .from('rep_analytics_properties')
    .select('ga4_property_id, enabled')
    .eq('rep_id', repId)
    .maybeSingle()
  if (error || !data) return null
  return data as AnalyticsRow
}

async function readCache(
  supabase: SupabaseClient,
  repId: string,
  reportKey: string,
  dateRange: string,
): Promise<CacheRow | null> {
  const { data, error } = await supabase
    .from('rep_ga4_report_cache')
    .select('payload, fetched_at')
    .eq('rep_id', repId)
    .eq('report_key', reportKey)
    .eq('date_range', dateRange)
    .maybeSingle()
  if (error || !data?.fetched_at) return null
  const payload = asNumbers(data.payload)
  if (!payload) return null
  return { payload, fetched_at: data.fetched_at }
}

async function writeCache(
  supabase: SupabaseClient,
  repId: string,
  reportKey: string,
  dateRange: string,
  payload: unknown,
  fetchedAt: string,
) {
  await supabase.from('rep_ga4_report_cache').upsert(
    {
      rep_id: repId,
      report_key: reportKey,
      date_range: dateRange,
      payload,
      fetched_at: fetchedAt,
    },
    { onConflict: 'rep_id,report_key,date_range' },
  )
}

function trafficDateRange(startDate?: string, endDate?: string) {
  if (startDate && endDate && DAY_KEY.test(startDate) && DAY_KEY.test(endDate) && startDate <= endDate) {
    return {
      reportKey: GA4_TRAFFIC_REPORT_KEY,
      dateRange: `${startDate}:${endDate}`,
      startDate,
      endDate,
    }
  }
  return {
    reportKey: GA4_DASHBOARD_REPORT_KEY,
    dateRange: GA4_DASHBOARD_DATE_RANGE,
    startDate: undefined,
    endDate: undefined,
  }
}

export async function loadRepGa4Dashboard(args: {
  supabase: SupabaseClient
  repId: string
  env?: Record<string, string | undefined>
  now?: Date
  startDate?: string
  endDate?: string
  includeRealtime?: boolean
  runReport?: typeof runGa4DashboardReport
  runRealtime?: typeof runGa4RealtimeReport
}): Promise<RepGa4Dashboard> {
  const now = args.now ?? new Date()
  const env = args.env ?? process.env
  const range = trafficDateRange(args.startDate, args.endDate)
  let row: AnalyticsRow | null = null
  try {
    row = await readAnalyticsRow(args.supabase, args.repId)
  } catch {
    return emptyRepGa4Dashboard('unavailable')
  }
  if (!row?.enabled || !PROPERTY_ID_PATTERN.test(row.ga4_property_id ?? '')) {
    return emptyRepGa4Dashboard('not_set_up')
  }

  const account = readGa4ReaderServiceAccount(env.GA4_READER_SERVICE_ACCOUNT_JSON)
  if (!account) return emptyRepGa4Dashboard('unavailable')

  let cache: CacheRow | null = null
  try {
    cache = await readCache(args.supabase, args.repId, range.reportKey, range.dateRange)
  } catch {
    cache = null
  }

  let numbers: Ga4DashboardNumbers | null = null
  let updatedAt: string | null = null
  const cacheQuality = cache ? ga4NumbersQuality(cache.payload) : null
  if (cache && cacheQuality && isGa4CacheFresh(cache.fetched_at, now, cacheQuality)) {
    numbers = cache.payload
    updatedAt = cache.fetched_at
  } else {
    try {
      const fresh = await (args.runReport ?? runGa4DashboardReport)({
        propertyId: row.ga4_property_id,
        account,
        now,
        startDate: range.startDate,
        endDate: range.endDate,
      })
      const fetchedAt = now.toISOString()
      if (!fresh) {
        const failed = failedNumbers()
        try {
          await writeCache(args.supabase, args.repId, range.reportKey, range.dateRange, failed, fetchedAt)
        } catch {
          // A short failure cache is optional. The next open still retries once it expires.
        }
        numbers = failed
        updatedAt = fetchedAt
      } else {
        const quality = ga4NumbersQuality(fresh)
        const stored = { ...fresh, quality }
        try {
          await writeCache(args.supabase, args.repId, range.reportKey, range.dateRange, stored, fetchedAt)
        } catch {
          // A cache write failure still returns the fresh numbers.
        }
        numbers = stored
        updatedAt = fetchedAt
      }
    } catch {
      if (cache && ga4NumbersQuality(cache.payload) === 'ok') {
        numbers = cache.payload
        updatedAt = cache.fetched_at
      } else {
        numbers = failedNumbers()
        updatedAt = now.toISOString()
      }
    }
  }

  const realtimeUsers = args.includeRealtime
    ? await loadRealtimeUsers({
        supabase: args.supabase,
        repId: args.repId,
        propertyId: row.ga4_property_id,
        account,
        now,
        runRealtime: args.runRealtime,
      })
    : null

  return dashboardFromNumbers(numbers ?? failedNumbers(), updatedAt ?? now.toISOString(), realtimeUsers)
}

async function loadRealtimeUsers(args: {
  supabase: SupabaseClient
  repId: string
  propertyId: string
  account: NonNullable<ReturnType<typeof readGa4ReaderServiceAccount>>
  now: Date
  runRealtime?: typeof runGa4RealtimeReport
}) {
  let cached: { activeUsers: number; fetchedAt: string } | null = null
  try {
    const { data, error } = await args.supabase
      .from('rep_ga4_report_cache')
      .select('payload, fetched_at')
      .eq('rep_id', args.repId)
      .eq('report_key', GA4_REALTIME_REPORT_KEY)
      .eq('date_range', GA4_REALTIME_DATE_RANGE)
      .maybeSingle()
    const users = !error && data?.fetched_at ? asRealtime(data.payload) : null
    if (users != null && data?.fetched_at && isGa4CacheFresh(data.fetched_at, args.now, 'ok', true)) {
      cached = { activeUsers: users, fetchedAt: data.fetched_at }
    }
  } catch {
    cached = null
  }
  if (cached) return cached.activeUsers

  try {
    const users = await (args.runRealtime ?? runGa4RealtimeReport)({
      propertyId: args.propertyId,
      account: args.account,
      now: args.now,
    })
    if (users == null) return null
    try {
      await writeCache(
        args.supabase,
        args.repId,
        GA4_REALTIME_REPORT_KEY,
        GA4_REALTIME_DATE_RANGE,
        { activeUsers: users },
        args.now.toISOString(),
      )
    } catch {
      // Realtime still returns when the short cache write fails.
    }
    return users
  } catch {
    return null
  }
}
