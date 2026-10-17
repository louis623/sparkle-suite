import type { SupabaseClient } from '@supabase/supabase-js'

import {
  readGa4ReaderServiceAccount,
  runGa4DashboardReport,
  type Ga4Breakdown,
  type Ga4DashboardNumbers,
} from '@/lib/services/ga4-data-api'

export const GA4_DASHBOARD_REPORT_KEY = 'dashboard_28d'
export const GA4_DASHBOARD_DATE_RANGE = '28daysAgo:today'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000
const PROPERTY_ID_PATTERN = /^[0-9]{6,15}$/

export type RepGa4DashboardStatus = 'ready' | 'not_set_up' | 'unavailable'

export type RepGa4Dashboard = {
  status: RepGa4DashboardStatus
  updatedAt: string | null
  pageViews: number | null
  visitors: number | null
  topPages: Ga4Breakdown[]
  sources: Ga4Breakdown[]
  devices: Ga4Breakdown[]
}

type CacheRow = {
  payload: Ga4DashboardNumbers
  fetched_at: string
}

type AnalyticsRow = {
  ga4_property_id: string
  enabled: boolean
}

export function emptyRepGa4Dashboard(
  status: Exclude<RepGa4DashboardStatus, 'ready'>,
): RepGa4Dashboard {
  return {
    status,
    updatedAt: null,
    pageViews: null,
    visitors: null,
    topPages: [],
    sources: [],
    devices: [],
  }
}

function dashboardFromNumbers(
  numbers: Ga4DashboardNumbers,
  updatedAt: string,
): RepGa4Dashboard {
  return {
    status: 'ready',
    updatedAt,
    pageViews: numbers.pageViews,
    visitors: numbers.visitors,
    topPages: numbers.topPages,
    sources: numbers.sources,
    devices: numbers.devices,
  }
}

function isFresh(fetchedAt: string, now: Date) {
  const time = Date.parse(fetchedAt)
  if (!Number.isFinite(time)) return false
  const age = now.getTime() - time
  return age >= -60_000 && age < CACHE_TTL_MS
}

function asNumbers(payload: unknown): Ga4DashboardNumbers | null {
  if (!payload || typeof payload !== 'object') return null
  const record = payload as Partial<Ga4DashboardNumbers>
  if (typeof record.pageViews !== 'number' || typeof record.visitors !== 'number') return null
  return {
    pageViews: record.pageViews,
    visitors: record.visitors,
    topPages: Array.isArray(record.topPages) ? record.topPages : [],
    sources: Array.isArray(record.sources) ? record.sources : [],
    devices: Array.isArray(record.devices) ? record.devices : [],
  }
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

async function readCache(supabase: SupabaseClient, repId: string): Promise<CacheRow | null> {
  const { data, error } = await supabase
    .from('rep_ga4_report_cache')
    .select('payload, fetched_at')
    .eq('rep_id', repId)
    .eq('report_key', GA4_DASHBOARD_REPORT_KEY)
    .eq('date_range', GA4_DASHBOARD_DATE_RANGE)
    .maybeSingle()
  if (error || !data?.fetched_at) return null
  const payload = asNumbers(data.payload)
  if (!payload) return null
  return { payload, fetched_at: data.fetched_at }
}

async function writeCache(
  supabase: SupabaseClient,
  repId: string,
  numbers: Ga4DashboardNumbers,
  fetchedAt: string,
) {
  await supabase.from('rep_ga4_report_cache').upsert(
    {
      rep_id: repId,
      report_key: GA4_DASHBOARD_REPORT_KEY,
      date_range: GA4_DASHBOARD_DATE_RANGE,
      payload: numbers,
      fetched_at: fetchedAt,
    },
    { onConflict: 'rep_id,report_key,date_range' },
  )
}

export async function loadRepGa4Dashboard(args: {
  supabase: SupabaseClient
  repId: string
  env?: Record<string, string | undefined>
  now?: Date
  runReport?: typeof runGa4DashboardReport
}): Promise<RepGa4Dashboard> {
  const now = args.now ?? new Date()
  const env = args.env ?? process.env
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
    cache = await readCache(args.supabase, args.repId)
  } catch {
    cache = null
  }
  if (cache && isFresh(cache.fetched_at, now)) {
    return dashboardFromNumbers(cache.payload, cache.fetched_at)
  }

  try {
    const numbers = await (args.runReport ?? runGa4DashboardReport)({
      propertyId: row.ga4_property_id,
      account,
      now,
    })
    if (!numbers) {
      return cache
        ? dashboardFromNumbers(cache.payload, cache.fetched_at)
        : emptyRepGa4Dashboard('unavailable')
    }
    const fetchedAt = now.toISOString()
    try {
      await writeCache(args.supabase, args.repId, numbers, fetchedAt)
    } catch {
      // A cache write failure still returns the fresh numbers.
    }
    return dashboardFromNumbers(numbers, fetchedAt)
  } catch {
    return cache
      ? dashboardFromNumbers(cache.payload, cache.fetched_at)
      : emptyRepGa4Dashboard('unavailable')
  }
}
