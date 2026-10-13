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
