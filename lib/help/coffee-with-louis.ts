const TIME_ZONE = 'America/New_York'
const ANCHOR_YEAR = 2026
const ANCHOR_MONTH = 10
const ANCHOR_DAY = 8
const SESSION_HOUR = 20
const INTERVAL_DAYS = 14
const DAY_MS = 24 * 60 * 60 * 1000

export const COFFEE_WITH_LOUIS_TIME_ZONE = TIME_ZONE
export const COFFEE_WITH_LOUIS_MEET_URL = 'https://meet.google.com/rzy-rqsd-qvo'
export const COFFEE_WITH_LOUIS_CADENCE = 'Every 14 days · Thursdays, 8–9 PM ET.'

export type CoffeeWithLouisSession = {
  index: number
  startsAt: Date
  label: string
  cadence: string
  meetUrl: string
}

type CoffeeVisibilityEnv = {
  NEXT_PUBLIC_SPARKLE_ENVIRONMENT?: string
}

/**
 * Smoke builds set NEXT_PUBLIC_SPARKLE_ENVIRONMENT=smoke. Production leaves it
 * unset, so the same tip can ship without showing Coffee with Louis on the
 * live customer domains.
 */
export function isCoffeeWithLouisVisible(
  env: CoffeeVisibilityEnv = process.env,
) {
  return env.NEXT_PUBLIC_SPARKLE_ENVIRONMENT === 'smoke'
}

function timeZoneOffsetMs(instant: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant)
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value)

  const wallClockAsUtc = Date.UTC(
    value('year'),
    value('month') - 1,
    value('day'),
    value('hour'),
    value('minute'),
    value('second'),
  )

  return wallClockAsUtc - instant.getTime()
}

function zonedWallTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
) {
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0))
  const offset = timeZoneOffsetMs(guess, timeZone)
  const adjusted = new Date(guess.getTime() - offset)
  const adjustedOffset = timeZoneOffsetMs(adjusted, timeZone)
  if (adjustedOffset === offset) return adjusted
  return new Date(guess.getTime() - adjustedOffset)
}

function addCalendarDays(year: number, month: number, day: number, days: number) {
  const shifted = new Date(Date.UTC(year, month - 1, day) + days * DAY_MS)
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  }
}

export function getCoffeeWithLouisSessionStart(index: number) {
  if (!Number.isInteger(index) || index < 0) {
    throw new Error('Coffee with Louis session index must be a non-negative integer.')
  }

  const date = addCalendarDays(
    ANCHOR_YEAR,
    ANCHOR_MONTH,
    ANCHOR_DAY,
    index * INTERVAL_DAYS,
  )

  return zonedWallTimeToUtc(
    date.year,
    date.month,
    date.day,
    SESSION_HOUR,
    0,
    TIME_ZONE,
  )
}

export function formatCoffeeWithLouisLabel(startsAt: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).formatToParts(startsAt)
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? ''
  const minute = value('minute')
  const clock =
    minute === '00'
      ? `${value('hour')} ${value('dayPeriod').toUpperCase()}`
      : `${value('hour')}:${minute} ${value('dayPeriod').toUpperCase()}`

  return `${value('weekday')}, ${value('month')} ${value('day')}, ${value('year')} · ${clock} ET`
}

function sessionView(index: number): CoffeeWithLouisSession {
  const startsAt = getCoffeeWithLouisSessionStart(index)
  return {
    index,
    startsAt,
    label: formatCoffeeWithLouisLabel(startsAt),
    cadence: COFFEE_WITH_LOUIS_CADENCE,
    meetUrl: COFFEE_WITH_LOUIS_MEET_URL,
  }
}

/**
 * Next session is the first 8:00 PM America/New_York occurrence in the
 * 2026-10-08 + 14-day series that is still strictly in the future.
 * At 8:00 PM on a session Thursday, including the rest of the 8–9 PM window
 * and any time after it, the following session is next.
 */
export function getNextCoffeeWithLouisSession(now: Date = new Date()) {
  const nowMs = now.getTime()
  if (!Number.isFinite(nowMs)) {
    throw new Error('Coffee with Louis needs a valid current time.')
  }

  const anchorMs = getCoffeeWithLouisSessionStart(0).getTime()
  if (nowMs < anchorMs) return sessionView(0)

  let index = Math.max(
    0,
    Math.floor((nowMs - anchorMs) / (INTERVAL_DAYS * DAY_MS)) - 1,
  )

  while (getCoffeeWithLouisSessionStart(index).getTime() <= nowMs) {
    index += 1
    if (index > 10000) {
      throw new Error('Coffee with Louis session search exceeded bounds.')
    }
  }

  return sessionView(index)
}
