import type { SupabaseClient } from '@supabase/supabase-js'

import { errors } from './errors'

/** Customers who ordered during a live lineup inside this window, and those who have gone quiet. */
export const LIVE_LINEUP_CUSTOMER_ACTIVITY_WINDOW_DAYS = 90

export interface LiveLineupCustomerActivity {
  /** Distinct customers with a lineup order time inside the last 90 days. */
  orderedDuringLiveLast90Days: number
  /**
   * Distinct customers who have a lineup order older than 90 days and none inside that window.
   * Customers who have never ordered are not included.
   */
  goneQuiet: number
  asOf: string
  windowDays: typeof LIVE_LINEUP_CUSTOMER_ACTIVITY_WINDOW_DAYS
}

function readCount(value: unknown, label: string) {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw errors.INVALID_INPUT(`invalid ${label}`)
  }
  return value
}

/**
 * Rep-dashboard counts for lineup purchases. Not wired to a screen.
 * Pass the authenticated rep id. The query is also limited to that rep, and
 * row security hides another rep's orders when the client is the rep's session.
 */
export async function getLiveLineupCustomerActivity(
  supabase: SupabaseClient,
  repId: string,
  asOf: Date = new Date(),
): Promise<LiveLineupCustomerActivity> {
  if (!repId) throw errors.UNAUTHORIZED('repId required')
  if (Number.isNaN(asOf.getTime())) throw errors.INVALID_INPUT('invalid asOf')

  const { data, error } = await supabase.rpc('live_lineup_customer_activity', {
    p_rep_id: repId,
    p_as_of: asOf.toISOString(),
  })
  if (error) throw error

  const payload = typeof data === 'string' ? JSON.parse(data) as unknown : data
  if (!payload || typeof payload !== 'object') {
    throw errors.INVALID_INPUT('invalid lineup customer activity')
  }
  const activity = payload as Record<string, unknown>
  if (activity.windowDays !== LIVE_LINEUP_CUSTOMER_ACTIVITY_WINDOW_DAYS) {
    throw errors.INVALID_INPUT('invalid lineup customer activity window')
  }

  return {
    orderedDuringLiveLast90Days: readCount(activity.orderedDuringLiveLast90Days, 'orderedDuringLiveLast90Days'),
    goneQuiet: readCount(activity.goneQuiet, 'goneQuiet'),
    asOf: asOf.toISOString(),
    windowDays: LIVE_LINEUP_CUSTOMER_ACTIVITY_WINDOW_DAYS,
  }
}

export async function countCustomersOrderedDuringLiveInLast90Days(
  supabase: SupabaseClient,
  repId: string,
  asOf: Date = new Date(),
) {
  return (await getLiveLineupCustomerActivity(supabase, repId, asOf)).orderedDuringLiveLast90Days
}

export async function countCustomersGoneQuiet(
  supabase: SupabaseClient,
  repId: string,
  asOf: Date = new Date(),
) {
  return (await getLiveLineupCustomerActivity(supabase, repId, asOf)).goneQuiet
}

export type LiveOrderActivityFilter = 'ordered_during_live_90' | 'gone_quiet'

export type RepLiveOrderActivity = {
  available: boolean
  orderedDuringLiveLast90Days: number | null
  goneQuiet: number | null
  /** Start of the 90-day window used for the counts. Null when the counts are unavailable. */
  windowStartIso: string | null
}

const LIVE_ORDER_WINDOW_MS = LIVE_LINEUP_CUSTOMER_ACTIVITY_WINDOW_DAYS * 24 * 60 * 60 * 1000

export function liveOrderWindowStart(asOf: Date) {
  return new Date(asOf.getTime() - LIVE_ORDER_WINDOW_MS)
}

export function liveOrderWindowStartIso(asOf: Date) {
  return liveOrderWindowStart(asOf).toISOString()
}

export function resolveLiveOrderWindowStart(since?: string | null, now = new Date()) {
  if (since) {
    const parsed = new Date(since)
    if (!Number.isNaN(parsed.getTime())) return parsed
  }
  return liveOrderWindowStart(now)
}

/**
 * Classifies a customer by the latest LIVE order time.
 * A time inside the window counts as ordered during a LIVE.
 * An earlier time, and no order inside the window, is gone quiet.
 * Customers with no LIVE order are neither.
 */
export function classifyLiveOrderLastSeen(
  lastSeen: string | null | undefined,
  windowStart: Date,
): LiveOrderActivityFilter | null {
  if (!lastSeen) return null
  const seen = Date.parse(lastSeen)
  const start = windowStart.getTime()
  if (!Number.isFinite(seen) || !Number.isFinite(start)) return null
  const end = start + LIVE_ORDER_WINDOW_MS
  if (seen >= start && seen <= end) return 'ordered_during_live_90'
  if (seen < start) return 'gone_quiet'
  return null
}

export function isMissingLiveOrderColumn(error: unknown) {
  const record = error as { code?: string; message?: string } | null
  const message = (
    record?.message ?? (error instanceof Error ? error.message : '')
  ).toLowerCase()
  if (!message.includes('last_seen_in_lineup_at')) return false
  return /does not exist|schema cache|could not find/.test(message)
}

const UNAVAILABLE_LIVE_ORDER_ACTIVITY: RepLiveOrderActivity = {
  available: false,
  orderedDuringLiveLast90Days: null,
  goneQuiet: null,
  windowStartIso: null,
}

/** Dashboard counts. A missing migration or failed query leaves the rest of the dashboard usable. */
export async function readRepLiveOrderActivity(
  supabase: SupabaseClient,
  repId: string,
  asOf: Date = new Date(),
): Promise<RepLiveOrderActivity> {
  try {
    const [orderedDuringLiveLast90Days, goneQuiet] = await Promise.all([
      countCustomersOrderedDuringLiveInLast90Days(supabase, repId, asOf),
      countCustomersGoneQuiet(supabase, repId, asOf),
    ])
    return {
      available: true,
      orderedDuringLiveLast90Days,
      goneQuiet,
      windowStartIso: liveOrderWindowStartIso(asOf),
    }
  } catch {
    return UNAVAILABLE_LIVE_ORDER_ACTIVITY
  }
}
