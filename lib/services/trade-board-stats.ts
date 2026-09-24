import type { SupabaseClient } from '@supabase/supabase-js'
import { DEFAULT_REP_TIME_ZONE } from './calendar-timezone'

function zonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  }
}

function zonedMidnightToUtc(year: number, month: number, day: number, timeZone: string) {
  const desired = Date.UTC(year, month - 1, day)
  let guess = desired
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const actual = zonedParts(new Date(guess), timeZone)
    const actualAsUtc = Date.UTC(
      actual.year, actual.month - 1, actual.day,
      actual.hour, actual.minute, actual.second,
    )
    const correction = desired - actualAsUtc
    guess += correction
    if (correction === 0) break
  }
  return new Date(guess)
}

export function getRepLocalDayBounds(
  now: Date = new Date(),
  timeZone = DEFAULT_REP_TIME_ZONE,
) {
  const { year, month, day } = zonedParts(now, timeZone)
  const next = new Date(Date.UTC(year, month - 1, day + 1))
  return {
    start: zonedMidnightToUtc(year, month, day, timeZone).toISOString(),
    end: zonedMidnightToUtc(
      next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate(), timeZone,
    ).toISOString(),
  }
}

/** Counts visible dancer cards, not physical copies grouped inside a card. */
export async function getDanceFloorDancerCounts(
  supabase: SupabaseClient,
  repId: string,
  timeZone = DEFAULT_REP_TIME_ZONE,
  now: Date = new Date(),
) {
  const today = getRepLocalDayBounds(now, timeZone)
  const [all, addedToday] = await Promise.all([
    supabase.from('trade_listings')
      .select('id', { count: 'exact', head: true })
      .eq('rep_id', repId).eq('status', 'available'),
    supabase.from('trade_listings')
      .select('id', { count: 'exact', head: true })
      .eq('rep_id', repId).eq('status', 'available')
      .gte('created_at', today.start).lt('created_at', today.end),
  ])
  if (all.error) throw all.error
  if (addedToday.error) throw addedToday.error
  if (all.count === null || addedToday.count === null) {
    throw new Error('Dance Floor dancer counts were unavailable')
  }
  return {
    availableDancerCount: all.count,
    newDancersTodayCount: addedToday.count,
  }
}
