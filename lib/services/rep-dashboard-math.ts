import { emptyDanceFloorInsights, type DanceFloorInsights } from '@/lib/services/dance-floor-insights'
import { emptySiteVisitSummary, type SiteVisitSummary } from '@/lib/services/site-visit-summary'

export const BIRTHDAY_WINDOW_DAYS = 30
export const COUNTDOWN_RING_WINDOW_MS = 7 * 24 * 60 * 60 * 1000
export const DASHBOARD_MONTH_COUNT = 6
export const DEFAULT_DASHBOARD_TIME_ZONE = 'America/New_York'

export type CalendarDay = {
  year: number
  month: number
  day: number
}

export type UpcomingBirthday = {
  customerId: string | null
  name: string
  initials: string
  recordHref: string | null
  month: number
  day: number
  dateLabel: string
  daysUntil: number
  isToday: boolean
  observedLeapDay: boolean
}

export type ShowCountdown = {
  totalMs: number
  days: number
  hours: number
  minutes: number
  seconds: number
  isPast: boolean
  ringProgress: number
}

export type GlanceDirection = 'up' | 'down' | 'flat' | 'none'

export type GlanceMetric = {
  key: string
  label: string
  value: number | null
  status?: string
}

export type GlanceRow = {
  key: string
  label: string
  value: number | null
  previous: number | null
  direction: GlanceDirection
}

export type MonthBucket = {
  key: string
  label: string
  startIso: string
  endIso: string
}

export type RepDashboardNextShow = {
  title: string
  platform: string
  eventTime: string
  timeZone: string
}

export type RepDashboardPayload = {
  generatedAt: string
  timeZone: string
  partial: boolean
  nextShow: RepDashboardNextShow | null
  customers: {
    total: number
    reachable: number
    monthly: number[]
    monthLabels: string[]
    addedThisMonth: number
  }
  danceFloor: {
    activeListings: number
    monthly: number[]
    monthLabels: string[]
    addedThisMonth: number
  }
  danceFloorInsights: DanceFloorInsights
  siteVisits: SiteVisitSummary
  pendingTrades: {
    count: number
  }
  birthdays: UpcomingBirthday[]
  platformMix: Array<{
    platform: string
    count: number
  }>
  monthAtAGlance: {
    periodLabel: string
    comparedToLabel: string | null
    rows: GlanceRow[]
  }
  unreadMessages: {
    count: number
    latestTitle: string | null
  } | null
  team: { count: number } | null
  recipes: { count: number } | null
  liveLineup: { count: number } | null
}

const DAY_MS = 24 * 60 * 60 * 1000

export function resolveTimeZone(timeZone?: string | null) {
  const requested = timeZone?.trim() || DEFAULT_DASHBOARD_TIME_ZONE
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: requested }).format(new Date())
    return requested
  } catch {
    return DEFAULT_DASHBOARD_TIME_ZONE
  }
}

export function zonedCalendarDay(date: Date, timeZone?: string | null): CalendarDay {
  const zone = resolveTimeZone(timeZone)
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
  }
}

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

function isLeapYear(year: number) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
}

function daysBetween(start: CalendarDay, end: CalendarDay) {
  const startUtc = Date.UTC(start.year, start.month - 1, start.day)
  const endUtc = Date.UTC(end.year, end.month - 1, end.day)
  return Math.round((endUtc - startUtc) / DAY_MS)
}

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

export function zonedMidnightToUtc(day: CalendarDay, timeZone?: string | null) {
  const zone = resolveTimeZone(timeZone)
  const desired = Date.UTC(day.year, day.month - 1, day.day, 0, 0, 0)
  let guess = desired

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const actual = zonedParts(new Date(guess), zone)
    const actualAsUtc = Date.UTC(
      actual.year,
      actual.month - 1,
      actual.day,
      actual.hour,
      actual.minute,
      actual.second,
    )
    const correction = desired - actualAsUtc
    guess += correction
    if (correction === 0) break
  }

  return new Date(guess)
}

export function isPastShowStatus(status: string | null | undefined) {
  return status === 'scheduled' || status === 'live' || status === 'completed'
}

const CONTACT_SHAPED_NAME = /\d[\d\s().-]{6,}\d/

export function initialsFromDisplayName(name: string) {
  const trimmed = name.trim()
  if (!trimmed || trimmed.includes('@') || CONTACT_SHAPED_NAME.test(trimmed)) return '?'
  const words = trimmed
    .split(/\s+/)
    .map((word) => word.replace(/[^A-Za-z]/g, ''))
    .filter(Boolean)
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0].slice(0, 1).toUpperCase()
  return `${words[0].slice(0, 1)}${words[words.length - 1].slice(0, 1)}`.toUpperCase()
}

export function fullCustomerName(name: string) {
  const trimmed = name.trim().replace(/\s+/g, ' ')
  if (!trimmed || trimmed.includes('@') || CONTACT_SHAPED_NAME.test(trimmed)) return ''
  return trimmed
}

export function customerRecordHref(customerId: string | null | undefined) {
  const id = customerId?.trim() ?? ''
  if (!id) return null
  return `/nic-nac?section=customer-list&customer=${encodeURIComponent(id)}`
}

export function birthdayTimingLabel(daysUntil: number) {
  if (daysUntil <= 0) return 'Today'
  return `in ${daysUntil} ${daysUntil === 1 ? 'day' : 'days'}`
}

export function showInDaysLabel(days: number) {
  if (!Number.isFinite(days) || days <= 0) return null
  return `in ${days} ${days === 1 ? 'day' : 'days'}`
}

function shortDateLabel(day: CalendarDay) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
  }).format(new Date(Date.UTC(day.year, day.month - 1, day.day, 12)))
}

function birthdayOccurrence(year: number, month: number, day: number) {
  if (!Number.isInteger(month) || !Number.isInteger(day)) return null
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  if (month === 2 && day === 29 && !isLeapYear(year)) {
    return { day: { year, month: 2, day: 28 }, observedLeapDay: true }
  }
  if (day > daysInMonth(year, month)) return null
  return { day: { year, month, day }, observedLeapDay: false }
}

export function listUpcomingBirthdays(args: {
  people: Array<{
    id?: string | null
    name?: string | null
    month: number | null
    day: number | null
  }>
  now?: Date
  timeZone?: string | null
  windowDays?: number
}): UpcomingBirthday[] {
  const now = args.now ?? new Date()
  const timeZone = resolveTimeZone(args.timeZone)
  const today = zonedCalendarDay(now, timeZone)
  const windowDays = args.windowDays ?? BIRTHDAY_WINDOW_DAYS
  const birthdays: UpcomingBirthday[] = []

  for (const person of args.people) {
    const month = Number(person.month)
    const day = Number(person.day)
    const thisYear = birthdayOccurrence(today.year, month, day)
    const nextYear = birthdayOccurrence(today.year + 1, month, day)
    const candidates = [thisYear, nextYear].flatMap((occurrence) => {
      if (!occurrence) return []
      const daysUntil = daysBetween(today, occurrence.day)
      if (daysUntil < 0 || daysUntil > windowDays) return []
      return [{ occurrence, daysUntil }]
    })
    const next = candidates[0]
    if (!next) continue
    const customerId = person.id?.trim() || null
    const name = fullCustomerName(person.name ?? '')
    birthdays.push({
      customerId,
      name: name || '?',
      initials: initialsFromDisplayName(person.name ?? ''),
      recordHref: customerRecordHref(customerId),
      month,
      day,
      dateLabel: shortDateLabel(next.occurrence.day),
      daysUntil: next.daysUntil,
      isToday: next.daysUntil === 0,
      observedLeapDay: next.occurrence.observedLeapDay,
    })
  }

  return birthdays.sort(
    (left, right) =>
      left.daysUntil - right.daysUntil ||
      left.dateLabel.localeCompare(right.dateLabel) ||
      left.name.localeCompare(right.name) ||
      left.initials.localeCompare(right.initials),
  )
}

export function getShowCountdown(eventTime: string | Date, now: Date = new Date()): ShowCountdown {
  const target = eventTime instanceof Date ? eventTime.getTime() : Date.parse(eventTime)
  if (!Number.isFinite(target) || target <= now.getTime()) {
    return {
      totalMs: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isPast: true,
      ringProgress: 1,
    }
  }

  const totalMs = target - now.getTime()
  return {
    totalMs,
    days: Math.floor(totalMs / 86_400_000),
    hours: Math.floor((totalMs % 86_400_000) / 3_600_000),
    minutes: Math.floor((totalMs % 3_600_000) / 60_000),
    seconds: Math.floor((totalMs % 60_000) / 1000),
    isPast: false,
    ringProgress:
      totalMs >= COUNTDOWN_RING_WINDOW_MS ? 0 : 1 - totalMs / COUNTDOWN_RING_WINDOW_MS,
  }
}

export function compareGlanceMetrics(
  current: GlanceMetric[],
  previous: GlanceMetric[] | null,
): GlanceRow[] {
  const previousByKey = new Map((previous ?? []).map((metric) => [metric.key, metric]))
  return current.map((metric) => {
    const earlier = previousByKey.get(metric.key)
    const previousValue =
      earlier && earlier.status !== 'unavailable' && typeof earlier.value === 'number'
        ? earlier.value
        : null
    const value = metric.status === 'unavailable' ? null : metric.value
    let direction: GlanceDirection = 'none'
    if (typeof value === 'number' && typeof previousValue === 'number') {
      if (value > previousValue) direction = 'up'
      else if (value < previousValue) direction = 'down'
      else direction = 'flat'
    }
    return {
      key: metric.key,
      label: metric.label,
      value: typeof value === 'number' ? value : null,
      previous: previousValue,
      direction,
    }
  })
}

export function recentMonthBuckets(
  now: Date = new Date(),
  timeZone?: string | null,
  count = DASHBOARD_MONTH_COUNT,
): MonthBucket[] {
  const zone = resolveTimeZone(timeZone)
  const today = zonedCalendarDay(now, zone)
  const currentStart = { year: today.year, month: today.month, day: 1 }
  const buckets: MonthBucket[] = []

  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const startDate = new Date(Date.UTC(currentStart.year, currentStart.month - 1 - offset, 1, 12))
    const start = {
      year: startDate.getUTCFullYear(),
      month: startDate.getUTCMonth() + 1,
      day: 1,
    }
    const endDate = new Date(Date.UTC(start.year, start.month, 1, 12))
    const end = {
      year: endDate.getUTCFullYear(),
      month: endDate.getUTCMonth() + 1,
      day: 1,
    }
    buckets.push({
      key: `${start.year}-${String(start.month).padStart(2, '0')}`,
      label: new Intl.DateTimeFormat('en-US', {
        timeZone: 'UTC',
        month: 'short',
      }).format(startDate),
      startIso: zonedMidnightToUtc(start, zone).toISOString(),
      endIso: zonedMidnightToUtc(end, zone).toISOString(),
    })
  }

  return buckets
}

export function formatPlatformLabel(platform: string | null | undefined) {
  const trimmed = platform?.trim() ?? ''
  if (!trimmed) return 'Other'
  const known: Record<string, string> = {
    tiktok: 'TikTok',
    whatnot: 'Whatnot',
    facebook: 'Facebook',
    instagram: 'Instagram',
    youtube: 'YouTube',
  }
  return known[trimmed.toLowerCase()] ?? trimmed
}

export function summarizePlatformMix(platforms: Array<string | null | undefined>) {
  const counts = new Map<string, number>()
  for (const platform of platforms) {
    const label = formatPlatformLabel(platform)
    counts.set(label, (counts.get(label) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([platform, count]) => ({ platform, count }))
    .sort((left, right) => right.count - left.count || left.platform.localeCompare(right.platform))
}

export function formatSnapshotMonthLabel(reportMonth: string) {
  const match = /^(\d{4})-(\d{2})/.exec(reportMonth)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  if (month < 1 || month > 12) return null
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    month: 'long',
    year: 'numeric',
  }).format(new Date(Date.UTC(year, month - 1, 1, 12)))
}

export function createEmptyRepDashboard(
  now = new Date(),
  timeZone = DEFAULT_DASHBOARD_TIME_ZONE,
): RepDashboardPayload {
  const zone = resolveTimeZone(timeZone)
  const months = recentMonthBuckets(now, zone)
  return {
    generatedAt: now.toISOString(),
    timeZone: zone,
    partial: false,
    nextShow: null,
    customers: {
      total: 0,
      reachable: 0,
      monthly: months.map(() => 0),
      monthLabels: months.map((month) => month.label),
      addedThisMonth: 0,
    },
    danceFloor: {
      activeListings: 0,
      monthly: months.map(() => 0),
      monthLabels: months.map((month) => month.label),
      addedThisMonth: 0,
    },
    danceFloorInsights: emptyDanceFloorInsights(),
    siteVisits: emptySiteVisitSummary(now, zone),
    pendingTrades: { count: 0 },
    birthdays: [],
    platformMix: [],
    monthAtAGlance: {
      periodLabel: '',
      comparedToLabel: null,
      rows: [],
    },
    unreadMessages: { count: 0, latestTitle: null },
    team: null,
    recipes: null,
    liveLineup: null,
  }
}
