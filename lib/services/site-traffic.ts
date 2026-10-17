import {
  resolveTimeZone,
  zonedCalendarDay,
  type CalendarDay,
} from '@/lib/services/rep-dashboard-math'
import {
  isInternalSiteVisitSource,
  US_STATE_NAMES,
} from '@/lib/services/site-visit-summary'

/** First day either counter is allowed to show a rep. October 2026 is partial. */
export const SITE_TRAFFIC_HISTORY_START = '2026-10-17'
export const SITE_TRAFFIC_HISTORY_LABEL = 'October 17, 2026'

const HISTORY_DAY: CalendarDay = { year: 2026, month: 10, day: 17 }

export const SITE_TRAFFIC_INFO = {
  pageViews: {
    means:
      'Each time someone opens a page on your site, that\u2019s one page view. One person looking at three pages counts as three.',
    matters:
      'It\u2019s the simplest sign that people are finding your site, and the arrow shows whether that\u2019s growing compared to last month.',
    try: 'Mention your site link in every live and see if this number climbs the next day.',
  },
  dailyChart: {
    means: 'Each bar is one day. Taller bars mean more page views that day.',
    matters:
      'Spikes usually line up with something you did, like a live show or a post. Seeing which days spike shows what works.',
    try: 'Look at the tallest bar and think about what you did that day. Do more of it.',
  },
  rightNow: {
    means: 'How many people have been on your site in the last 30 minutes.',
    matters: 'During a live, it shows right away whether viewers are opening your link.',
    try: 'Say your site link out loud mid-show, then check this line a minute later.',
  },
  sources: {
    means:
      'The places people were before they landed on your site: TikTok, your QR cards, a Google search, Facebook or Instagram, or typing your address directly.',
    matters: 'It shows which of your efforts actually send people to your site.',
    try: 'If one source is tiny, give it one extra push this week, like pinning your link in your TikTok bio.',
  },
  pages: {
    means: 'Your most-opened pages this month, like the Dance Floor, your shows page and your Join page.',
    matters: 'It shows what your customers care about most.',
    try: 'Make sure your most-viewed page is up to date before your next live.',
  },
  join: {
    means: 'How many times your Join my team page was opened this month.',
    matters: 'These are people curious about joining your team. Even a few views mean real interest.',
    try: 'Mention your Join page in a live and watch whether this number moves that week.',
  },
  busiest: {
    means: 'The day and hour your site gets the most page views, in your time zone. Darker squares are busier.',
    matters: 'It shows when your customers are already looking.',
    try: 'Try scheduling a live, or a post with your link, close to your busiest hour.',
  },
  places: {
    means: 'The states (and top cities) your visitors are in. Darker states sent more visitors.',
    matters: 'It shows where your customers live, which helps with show times and shipping questions.',
    try: 'If many visitors are in another time zone, try a show time that works for them too.',
  },
  qr: {
    means: 'How many times someone opened your site by scanning a QR code you made in Cards & QR codes.',
    matters: 'It shows whether your printed cards and package inserts are being used.',
    try: 'Add a QR card to every package for a week and compare this number to the week before. (Codes printed before tracking started still work but count as regular page views.)',
  },
  months: {
    means:
      'One bar per month, so you can see your site grow over time. October 2026 is a partial month because counting started Oct 17.',
    matters: 'One month can be up or down for many reasons. Several months together show the real trend.',
    try: 'Check this on the 1st of each month and compare it to what you did that month.',
  },
  more: {
    means:
      'Devices shows whether people use a phone, tablet or computer. New vs returning shows how many are first-time visitors and how many came back.',
    matters: 'Most visitors use phones, so your site should look good on one. Returning visitors are your regulars.',
    try: 'Open your own site on your phone once a week and check that it looks right.',
  },
} as const

export const GA4_PROCESSING_COPY = 'Still processing, usually 24 to 48 hours'
export const PAGE_VIEWS_NOTE = 'Counts page openings, not people.'
export const ABOUT_NUMBERS_COPY =
  'Page views come from Sparkle Suite\u2019s own counter. Where visitors came from and where they are come from Google Analytics, so those totals can differ a little.'
export const NEW_SITE_COPY =
  'Your site is brand new. Google Analytics takes 24 to 48 hours to show its first numbers. Your page view counter is already working.'

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const
const SHORT_WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

export type SiteTrafficDay = {
  key: string
  pageViews: number
  qrVisits: number
  joinViews: number
  visitorHashes: string[]
  hours: number[]
  pages: Record<string, number>
}

export type SiteTrafficLedger = {
  status: 'ready' | 'unavailable'
  historyStart: string
  timeZone: string
  uniqueCounting: boolean
  uniqueSince: string | null
  showDays: string[]
  days: SiteTrafficDay[]
}

export type TrafficVisitRow = {
  viewed_at: string
  src?: string | null
  path?: string | null
  visitor_day_hash?: string | null
}

export type TrafficPeriodId = 'this-month' | 'last-month' | 'last-7' | 'custom'

export type TrafficDaySpan = {
  start: CalendarDay
  end: CalendarDay
}

export type ResolvedTrafficPeriod = {
  id: TrafficPeriodId
  start: CalendarDay
  end: CalendarDay
  comparison: TrafficDaySpan | null
  firstMonth: boolean
  beforeHistory: boolean
  /** False when the chosen period has no counted days yet, such as Last month in October 2026. */
  countable: boolean
  label: string
}

export type TrafficDailyBar = {
  key: string
  label: string
  pageViews: number
  showDay: boolean
}

export type TrafficPeriodSummary = {
  period: ResolvedTrafficPeriod
  pageViews: number
  people: number | null
  peopleSince: string | null
  qrVisits: number
  joinViews: number
  daily: TrafficDailyBar[]
  pages: Array<{ name: string; count: number }>
  heatmap: number[][]
  dayNames: string[]
  busiest: { day: string; hour: number; count: number } | null
  comparisonPageViews: number | null
  comparisonJoinViews: number | null
  comparisonLabel: string | null
}

export type TrafficMonthBar = {
  key: string
  label: string
  pageViews: number
  partial: boolean
  current: boolean
}

export type TakeawayFacts = {
  pageViews: number
  previousPageViews: number | null
  joinViews: number
  previousJoinViews: number | null
  qrVisits: number
  showDayCount: number
  showDayViews: number
  otherDayCount: number
  otherDayViews: number
  siteAgeDays: number
  ga4Processing: boolean
  knownSessions: number
  topSourceLabel: string | null
  topSourceSessions: number
  uniqueCounting: boolean
  historyLabel: string
}

export type SiteTrafficTakeaway = {
  id: 'T1' | 'T2' | 'T3' | 'T4' | 'T5' | 'T6'
  text: string
}

const HASH_PATTERN = /^[a-f0-9]{32}$/

function dayStamp(day: CalendarDay) {
  return Date.UTC(day.year, day.month - 1, day.day)
}

export function compareCalendarDays(left: CalendarDay, right: CalendarDay) {
  return dayStamp(left) - dayStamp(right)
}

export function addCalendarDays(day: CalendarDay, amount: number): CalendarDay {
  const date = new Date(Date.UTC(day.year, day.month - 1, day.day + amount, 12))
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  }
}

export function daysInCalendarMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

export function calendarDayKey(day: CalendarDay) {
  return `${day.year}-${String(day.month).padStart(2, '0')}-${String(day.day).padStart(2, '0')}`
}

export function parseCalendarDayKey(value: string | null | undefined): CalendarDay | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value?.trim() ?? '')
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (month < 1 || month > 12) return null
  const max = daysInCalendarMonth(year, month)
  if (day < 1 || day > max) return null
  return { year, month, day }
}

export function readVisitSaltSince(value: string | null | undefined) {
  const day = parseCalendarDayKey(value)
  if (!day) return null
  if (compareCalendarDays(day, HISTORY_DAY) < 0) return SITE_TRAFFIC_HISTORY_START
  return calendarDayKey(day)
}

function clipToHistory(day: CalendarDay, today: CalendarDay) {
  let next = day
  if (compareCalendarDays(next, HISTORY_DAY) < 0) next = HISTORY_DAY
  if (compareCalendarDays(next, today) > 0) next = today
  return next
}

function spansOverlapHistory(span: TrafficDaySpan) {
  return compareCalendarDays(span.end, HISTORY_DAY) >= 0 && compareCalendarDays(span.start, span.end) <= 0
}

function previousMonth(year: number, month: number) {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 }
}

function monthStart(year: number, month: number): CalendarDay {
  return { year, month, day: 1 }
}

function monthEnd(year: number, month: number): CalendarDay {
  return { year, month, day: daysInCalendarMonth(year, month) }
}

export function formatTrafficDay(day: CalendarDay) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
  }).format(new Date(Date.UTC(day.year, day.month - 1, day.day, 12)))
}

export function formatTrafficRange(span: TrafficDaySpan) {
  const start = formatTrafficDay(span.start)
  const end = formatTrafficDay(span.end)
  if (span.start.year === span.end.year && span.start.month === span.end.month) {
    if (span.start.day === span.end.day) return start
    return `${start} to ${span.end.day}`
  }
  return `${start} to ${end}`
}

function monthName(year: number, month: number) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    month: 'long',
  }).format(new Date(Date.UTC(year, month - 1, 1, 12)))
}

function shortMonth(year: number, month: number) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    month: 'short',
  }).format(new Date(Date.UTC(year, month - 1, 1, 12)))
}

export function eachCalendarDay(span: TrafficDaySpan) {
  const days: CalendarDay[] = []
  if (compareCalendarDays(span.start, span.end) > 0) return days
  let cursor = span.start
  for (let guard = 0; guard < 800; guard += 1) {
    days.push(cursor)
    if (compareCalendarDays(cursor, span.end) === 0) break
    cursor = addCalendarDays(cursor, 1)
  }
  return days
}

function zonedVisitParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return {
    key: `${values.year}-${values.month}-${values.day}`,
    hour: Number(values.hour),
  }
}

export function plainPageName(path: string | null | undefined) {
  const raw = (path ?? '').split('?')[0]?.split('#')[0]?.trim() ?? ''
  const lower = raw.toLowerCase()
  if (!lower || lower === '/' || lower.endsWith('/index.html') || lower.endsWith('/homepage.html')) {
    return 'Home'
  }
  const file = lower.split('/').filter(Boolean).pop() ?? ''
  const stem = file.replace(/\.html$/, '')
  if (stem === 'join' || stem.endsWith('-join') || stem.includes('join-my-team')) return 'Join my team'
  if (stem === 'trade' || stem.includes('dance')) return 'Dance Floor'
  if (stem.includes('show') || stem.includes('event') || stem.includes('lineup')) return 'Shows'
  if (stem === 'pantry' || stem.includes('recipe')) return 'Recipes'
  if (stem === 'home' || stem === 'homepage' || stem === 'index') return 'Home'
  const segments = lower.split('/').filter(Boolean)
  if (segments.length <= 1 && !file.includes('.')) return 'Home'
  const words = stem.replace(/[-_]+/g, ' ').trim()
  if (!words) return 'Home'
  return words.replace(/\b[a-z]/g, (letter) => letter.toUpperCase())
}

export function isJoinPagePath(path: string | null | undefined) {
  return plainPageName(path) === 'Join my team'
}

export function emptySiteTrafficLedger(
  now = new Date(),
  timeZone?: string | null,
  status: SiteTrafficLedger['status'] = 'ready',
): SiteTrafficLedger {
  return {
    status,
    historyStart: SITE_TRAFFIC_HISTORY_START,
    timeZone: resolveTimeZone(timeZone),
    uniqueCounting: false,
    uniqueSince: null,
    showDays: [],
    days: [],
  }
}

function emptyHours() {
  return Array.from({ length: 24 }, () => 0)
}

export function buildSiteTrafficLedger(args: {
  rows: TrafficVisitRow[]
  showTimes?: string[]
  now?: Date
  timeZone?: string | null
  uniqueCounting?: boolean
  uniqueSince?: string | null
  status?: SiteTrafficLedger['status']
}): SiteTrafficLedger {
  const now = args.now ?? new Date()
  const zone = resolveTimeZone(args.timeZone)
  const today = zonedCalendarDay(now, zone)
  const ledger = emptySiteTrafficLedger(now, zone, args.status ?? 'ready')
  ledger.uniqueCounting = Boolean(args.uniqueCounting)
  ledger.uniqueSince = ledger.uniqueCounting ? readVisitSaltSince(args.uniqueSince) : null
  const byDay = new Map<string, SiteTrafficDay>()

  for (const row of args.rows) {
    if (isInternalSiteVisitSource(row.src)) continue
    const viewed = new Date(row.viewed_at)
    if (!Number.isFinite(viewed.getTime()) || viewed > now) continue
    const parts = zonedVisitParts(viewed, zone)
    const day = parseCalendarDayKey(parts.key)
    if (!day || compareCalendarDays(day, HISTORY_DAY) < 0 || compareCalendarDays(day, today) > 0) continue
    let bucket = byDay.get(parts.key)
    if (!bucket) {
      bucket = {
        key: parts.key,
        pageViews: 0,
        qrVisits: 0,
        joinViews: 0,
        visitorHashes: [],
        hours: emptyHours(),
        pages: {},
      }
      byDay.set(parts.key, bucket)
    }
    bucket.pageViews += 1
    if (row.src?.trim().toLowerCase() === 'qr') bucket.qrVisits += 1
    const pageName = plainPageName(row.path)
    bucket.pages[pageName] = (bucket.pages[pageName] ?? 0) + 1
    if (pageName === 'Join my team') bucket.joinViews += 1
    if (parts.hour >= 0 && parts.hour < 24) bucket.hours[parts.hour] += 1
    const hash = row.visitor_day_hash?.trim().toLowerCase() ?? ''
    if (ledger.uniqueCounting && HASH_PATTERN.test(hash) && !bucket.visitorHashes.includes(hash)) {
      const since = ledger.uniqueSince
      if (!since || parts.key >= since) bucket.visitorHashes.push(hash)
    }
  }

  ledger.days = [...byDay.values()].sort((left, right) => left.key.localeCompare(right.key))
  const showDays = new Set<string>()
  for (const stamp of args.showTimes ?? []) {
    const viewed = new Date(stamp)
    if (!Number.isFinite(viewed.getTime()) || viewed > now) continue
    const key = zonedVisitParts(viewed, zone).key
    const day = parseCalendarDayKey(key)
    if (!day || compareCalendarDays(day, HISTORY_DAY) < 0 || compareCalendarDays(day, today) > 0) continue
    showDays.add(key)
  }
  ledger.showDays = [...showDays].sort()
  if (ledger.uniqueCounting && !ledger.uniqueSince) {
    const firstHashed = ledger.days.find((day) => day.visitorHashes.length > 0)
    ledger.uniqueSince = firstHashed?.key ?? null
  }
  return ledger
}

export function resolveTrafficPeriod(args: {
  period: TrafficPeriodId
  now?: Date
  timeZone?: string | null
  customStart?: string | null
  customEnd?: string | null
}): ResolvedTrafficPeriod {
  const now = args.now ?? new Date()
  const zone = resolveTimeZone(args.timeZone)
  const today = zonedCalendarDay(now, zone)
  const beforeHistory = compareCalendarDays(today, HISTORY_DAY) < 0
  const firstMonth = today.year === HISTORY_DAY.year && today.month === HISTORY_DAY.month

  if (args.period === 'last-7') {
    const end = beforeHistory ? HISTORY_DAY : today
    const start = clipToHistory(addCalendarDays(end, -6), end)
    const comparisonEnd = addCalendarDays(start, -1)
    const comparisonStart = addCalendarDays(comparisonEnd, -6)
    const comparison = spansOverlapHistory({ start: comparisonStart, end: comparisonEnd })
      ? {
          start: comparisonStart,
          end: comparisonEnd,
        }
      : null
    return {
      id: 'last-7',
      start,
      end,
      comparison,
      firstMonth,
      beforeHistory,
      countable: !beforeHistory,
      label: 'Last 7 days',
    }
  }

  if (args.period === 'last-month') {
    const prev = previousMonth(today.year, today.month)
    const rawStart = monthStart(prev.year, prev.month)
    const rawEnd = monthEnd(prev.year, prev.month)
    const start = clipToHistory(rawStart, today)
    const end = compareCalendarDays(rawEnd, today) > 0 ? today : rawEnd
    const usable = compareCalendarDays(start, end) <= 0 && compareCalendarDays(end, HISTORY_DAY) >= 0
    const earlier = previousMonth(prev.year, prev.month)
    const earlierSpan = {
      start: monthStart(earlier.year, earlier.month),
      end: monthEnd(earlier.year, earlier.month),
    }
    return {
      id: 'last-month',
      start: usable ? start : HISTORY_DAY,
      end: usable ? end : HISTORY_DAY,
      comparison: usable && spansOverlapHistory(earlierSpan)
        ? {
            start: earlierSpan.start,
            end: earlierSpan.end,
          }
        : null,
      firstMonth,
      beforeHistory,
      countable: usable && !beforeHistory,
      label: usable ? monthName(prev.year, prev.month) : 'Last month',
    }
  }

  if (args.period === 'custom') {
    const startDay = parseCalendarDayKey(args.customStart)
    const endDay = parseCalendarDayKey(args.customEnd)
    if (startDay && endDay) {
      let start = clipToHistory(startDay, today)
      let end = clipToHistory(endDay, today)
      if (compareCalendarDays(start, end) > 0) {
        const swap = start
        start = end
        end = swap
      }
      const length = Math.round((dayStamp(end) - dayStamp(start)) / 86_400_000)
      const comparisonEnd = addCalendarDays(start, -1)
      const comparisonStart = addCalendarDays(comparisonEnd, -length)
      const comparison = spansOverlapHistory({ start: comparisonStart, end: comparisonEnd })
        ? {
            start: comparisonStart,
            end: comparisonEnd,
          }
        : null
      return {
        id: 'custom',
        start,
        end,
        comparison,
        firstMonth,
        beforeHistory,
        countable: !beforeHistory,
        label: 'Custom dates',
      }
    }
  }

  const end = beforeHistory ? HISTORY_DAY : today
  const start = beforeHistory ? HISTORY_DAY : clipToHistory(monthStart(today.year, today.month), today)
  const prev = previousMonth(end.year, end.month)
  const comparisonEnd = {
    year: prev.year,
    month: prev.month,
    day: Math.min(end.day, daysInCalendarMonth(prev.year, prev.month)),
  }
  const comparisonStart = monthStart(prev.year, prev.month)
  const comparison = spansOverlapHistory({ start: comparisonStart, end: comparisonEnd })
    ? {
        start: comparisonStart,
        end: comparisonEnd,
      }
    : null
  return {
    id: 'this-month',
    start,
    end,
    comparison,
    firstMonth,
    beforeHistory,
    countable: !beforeHistory,
    label: 'This month',
  }
}

function dayMap(ledger: SiteTrafficLedger) {
  return new Map(ledger.days.map((day) => [day.key, day]))
}

function countSpan(ledger: SiteTrafficLedger, span: TrafficDaySpan | null) {
  if (!span) return null
  const days = dayMap(ledger)
  let pageViews = 0
  let joinViews = 0
  let qrVisits = 0
  const hashes = new Set<string>()
  for (const day of eachCalendarDay(span)) {
    const bucket = days.get(calendarDayKey(day))
    if (!bucket) continue
    pageViews += bucket.pageViews
    joinViews += bucket.joinViews
    qrVisits += bucket.qrVisits
    for (const hash of bucket.visitorHashes) hashes.add(hash)
  }
  return { pageViews, joinViews, qrVisits, people: hashes.size }
}

export function summarizeTrafficPeriod(
  ledger: SiteTrafficLedger,
  period: ResolvedTrafficPeriod,
): TrafficPeriodSummary {
  const counted = period.countable ? countSpan(ledger, { start: period.start, end: period.end }) : null
  const comparison = period.countable && period.comparison ? countSpan(ledger, period.comparison) : null
  const days = dayMap(ledger)
  const showDays = new Set(ledger.showDays)
  const heatmap = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0))
  const pageCounts = new Map<string, number>()
  const daily: TrafficDailyBar[] = []
  let busiest: TrafficPeriodSummary['busiest'] = null
  const chartDays = period.countable ? eachCalendarDay({ start: period.start, end: period.end }) : []

  for (const day of chartDays) {
    const key = calendarDayKey(day)
    const bucket = days.get(key)
    const pageViews = bucket?.pageViews ?? 0
    daily.push({
      key,
      label: formatTrafficDay(day),
      pageViews,
      showDay: showDays.has(key),
    })
    const weekday = new Date(Date.UTC(day.year, day.month - 1, day.day, 12)).getUTCDay()
    const hours = bucket?.hours ?? []
    for (let hour = 0; hour < 24; hour += 1) {
      const count = hours[hour] ?? 0
      if (count <= 0) continue
      heatmap[weekday][hour] += count
      if (!busiest || count > busiest.count) {
        busiest = { day: WEEKDAYS[weekday], hour, count: heatmap[weekday][hour] }
      }
    }
    for (const [name, count] of Object.entries(bucket?.pages ?? {})) {
      pageCounts.set(name, (pageCounts.get(name) ?? 0) + count)
    }
  }

  if (busiest) {
    let best = 0
    for (let weekday = 0; weekday < 7; weekday += 1) {
      for (let hour = 0; hour < 24; hour += 1) {
        if (heatmap[weekday][hour] > best) {
          best = heatmap[weekday][hour]
          busiest = { day: WEEKDAYS[weekday], hour, count: best }
        }
      }
    }
  }

  return {
    period,
    pageViews: counted?.pageViews ?? 0,
    people: ledger.uniqueCounting ? counted?.people ?? 0 : null,
    peopleSince: ledger.uniqueSince,
    qrVisits: counted?.qrVisits ?? 0,
    joinViews: counted?.joinViews ?? 0,
    daily,
    pages: [...pageCounts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name))
      .slice(0, 6),
    heatmap,
    dayNames: [...SHORT_WEEKDAYS],
    busiest: busiest && busiest.count > 0 ? busiest : null,
    comparisonPageViews: comparison ? comparison.pageViews : null,
    comparisonJoinViews: comparison ? comparison.joinViews : null,
    comparisonLabel: period.comparison ? formatTrafficRange(period.comparison) : null,
  }
}

export function buildTrafficMonthBars(
  ledger: SiteTrafficLedger,
  now = new Date(),
  timeZone?: string | null,
): TrafficMonthBar[] {
  const zone = resolveTimeZone(timeZone ?? ledger.timeZone)
  const today = zonedCalendarDay(now, zone)
  const totals = new Map<string, number>()
  for (const day of ledger.days) {
    const monthKey = day.key.slice(0, 7)
    totals.set(monthKey, (totals.get(monthKey) ?? 0) + day.pageViews)
  }
  return [...totals.entries()]
    .filter(([, pageViews]) => pageViews > 0)
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([key, pageViews]) => {
      const [yearText, monthText] = key.split('-')
      const year = Number(yearText)
      const month = Number(monthText)
      const partial = year === HISTORY_DAY.year && month === HISTORY_DAY.month
      const current = year === today.year && month === today.month && today.day < daysInCalendarMonth(year, month)
      const name = shortMonth(year, month)
      let label = name
      if (partial && current) label = `${name}* (so far)`
      else if (partial) label = `${name}*`
      else if (current) label = `${name} (so far)`
      return { key, label, pageViews, partial, current }
    })
}

export function siteAgeDays(now = new Date(), timeZone?: string | null) {
  const today = zonedCalendarDay(now, timeZone)
  if (compareCalendarDays(today, HISTORY_DAY) < 0) return 0
  return Math.round((dayStamp(today) - dayStamp(HISTORY_DAY)) / 86_400_000)
}

export function thisMonthTakeawayFacts(args: {
  ledger: SiteTrafficLedger
  now?: Date
  timeZone?: string | null
  ga4Processing?: boolean
  knownSessions?: number
  topSourceLabel?: string | null
  topSourceSessions?: number
}): TakeawayFacts {
  const now = args.now ?? new Date()
  const zone = args.timeZone ?? args.ledger.timeZone
  const period = resolveTrafficPeriod({ period: 'this-month', now, timeZone: zone })
  const summary = summarizeTrafficPeriod(args.ledger, period)
  const showDays = new Set(args.ledger.showDays)
  const views = dayMap(args.ledger)
  let showDayCount = 0
  let showDayViews = 0
  let otherDayCount = 0
  let otherDayViews = 0
  for (const day of eachCalendarDay({ start: period.start, end: period.end })) {
    const key = calendarDayKey(day)
    const pageViews = views.get(key)?.pageViews ?? 0
    if (showDays.has(key)) {
      showDayCount += 1
      showDayViews += pageViews
    } else if (pageViews > 0) {
      otherDayCount += 1
      otherDayViews += pageViews
    }
  }
  const comparisonAvailable = summary.comparisonPageViews != null
  return {
    pageViews: summary.pageViews,
    previousPageViews: comparisonAvailable ? summary.comparisonPageViews : null,
    joinViews: summary.joinViews,
    previousJoinViews: comparisonAvailable ? summary.comparisonJoinViews : null,
    qrVisits: summary.qrVisits,
    showDayCount,
    showDayViews,
    otherDayCount,
    otherDayViews,
    siteAgeDays: siteAgeDays(now, zone),
    ga4Processing: args.ga4Processing !== false,
    knownSessions: args.knownSessions ?? 0,
    topSourceLabel: args.topSourceLabel ?? null,
    topSourceSessions: args.topSourceSessions ?? 0,
    uniqueCounting: args.ledger.uniqueCounting,
    historyLabel: SITE_TRAFFIC_HISTORY_LABEL,
  }
}

function wholePercent(part: number, whole: number) {
  if (whole <= 0) return 0
  return Math.round((part / whole) * 100)
}

function changePercent(current: number, previous: number) {
  if (previous <= 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 100)
}

const TOO_EARLY = 'Your site is new, so there isn\u2019t enough to compare yet. Check back after a few more lives.'

export function pickSiteTrafficTakeaway(facts: TakeawayFacts): SiteTrafficTakeaway {
  if (facts.pageViews < 20 || facts.siteAgeDays < 7) {
    return { id: 'T1', text: TOO_EARLY }
  }

  const topShare = facts.knownSessions > 0 ? facts.topSourceSessions / facts.knownSessions : 0
  if (
    !facts.ga4Processing &&
    facts.knownSessions >= 20 &&
    facts.topSourceLabel &&
    topShare >= 0.4
  ) {
    const noun = facts.uniqueCounting ? 'visitors' : 'page views'
    return {
      id: 'T2',
      text: `Most of your ${noun} this month came from ${facts.topSourceLabel} (${wholePercent(facts.topSourceSessions, facts.knownSessions)}%).`,
    }
  }

  if (facts.showDayCount >= 2 && facts.otherDayCount >= 3) {
    const showAverage = Math.round(facts.showDayViews / facts.showDayCount)
    const otherAverage = Math.round(facts.otherDayViews / facts.otherDayCount)
    return {
      id: 'T3',
      text: `On days you had a live show, your site averaged ${showAverage} page views, compared with ${otherAverage} on other days.`,
    }
  }

  const previousJoin = facts.previousJoinViews
  if (previousJoin != null && facts.joinViews + previousJoin >= 5) {
    const delta = changePercent(facts.joinViews, previousJoin)
    const direction = Math.abs(delta) < 5
      ? 'about the same as'
      : facts.joinViews >= previousJoin
        ? 'up from'
        : 'down from'
    return {
      id: 'T4',
      text: `${facts.joinViews} Join page views so far this month, ${direction} ${previousJoin} at this point last month.`,
    }
  }
  if (facts.joinViews >= 1 && previousJoin == null) {
    return {
      id: 'T4',
      text: facts.uniqueCounting
        ? `${facts.joinViews} people opened your Join page this month.`
        : `${facts.joinViews} Join page views this month.`,
    }
  }

  if (facts.qrVisits >= 5) {
    return {
      id: 'T5',
      text: `Your QR cards brought ${facts.qrVisits} visits this month, ${wholePercent(facts.qrVisits, facts.pageViews)}% of your page views.`,
    }
  }

  const previous = facts.previousPageViews
  if (previous != null && facts.pageViews >= 20 && previous >= 20) {
    const delta = changePercent(facts.pageViews, previous)
    const change = Math.abs(delta) < 5
      ? 'about the same as the same days last month'
      : `${Math.abs(delta)}% ${delta >= 0 ? 'more' : 'fewer'} than the same days last month`
    return {
      id: 'T6',
      text: `Your site had ${facts.pageViews} page views so far this month, ${change}.`,
    }
  }
  if (previous == null) {
    return {
      id: 'T6',
      text: `Your site has had ${facts.pageViews} page views since counting started on ${facts.historyLabel}.`,
    }
  }

  return { id: 'T1', text: TOO_EARLY }
}

export function pageViewComparisonCopy(summary: TrafficPeriodSummary) {
  if (summary.period.firstMonth && summary.period.id === 'this-month') {
    return 'First month, comparison starts in November.'
  }
  if (summary.comparisonPageViews == null || !summary.comparisonLabel) {
    return 'Not enough counted days last month to compare yet.'
  }
  const delta = changePercent(summary.pageViews, summary.comparisonPageViews)
  if (Math.abs(delta) < 5) return `About the same vs ${summary.comparisonLabel}`
  const arrow = delta > 0 ? '\u25B2' : '\u25BC'
  return `${arrow} ${Math.abs(delta)}% vs ${summary.comparisonLabel}`
}

export function joinComparisonCopy(summary: TrafficPeriodSummary) {
  if (summary.comparisonJoinViews == null || !summary.comparisonLabel) return null
  const delta = summary.joinViews - summary.comparisonJoinViews
  if (Math.abs(delta) === 0) return `About the same vs ${summary.comparisonLabel}`
  const arrow = delta > 0 ? '\u25B2' : '\u25BC'
  return `${arrow} ${Math.abs(delta)} vs ${summary.comparisonLabel}`
}

export function bucketGa4Source(label: string) {
  const value = label.trim().toLowerCase()
  if (!value || value === '(not set)' || value === 'not set' || value === '(none)') return null
  if (value.includes('tiktok')) return 'TikTok'
  if (value.includes('google')) return 'Google'
  if (
    value.includes('facebook') ||
    value.includes('instagram') ||
    value === 'fb' ||
    value === 'ig' ||
    value.includes('meta')
  ) {
    return 'Facebook / IG'
  }
  return 'Direct / other'
}

export const GA4_SOURCE_ORDER = ['TikTok', 'Google', 'Facebook / IG', 'Direct / other'] as const

export function bucketGa4Sources(rows: Array<{ label: string; value: number }>) {
  const totals = new Map<string, number>()
  let knownSessions = 0
  for (const row of rows) {
    const bucket = bucketGa4Source(row.label)
    if (!bucket || row.value <= 0) continue
    totals.set(bucket, (totals.get(bucket) ?? 0) + row.value)
    knownSessions += row.value
  }
  const sources = GA4_SOURCE_ORDER.filter((label) => (totals.get(label) ?? 0) > 0).map((label) => ({
    label,
    value: totals.get(label) ?? 0,
  }))
  const top = [...sources].sort((left, right) => right.value - left.value)[0] ?? null
  return {
    sources,
    knownSessions,
    topSourceLabel: top?.label ?? null,
    topSourceSessions: top?.value ?? 0,
  }
}

export function plainDeviceName(label: string) {
  const value = label.trim().toLowerCase()
  if (value === 'mobile' || value === 'phone') return 'Phone'
  if (value === 'tablet') return 'Tablet'
  if (value === 'desktop' || value === 'computer') return 'Computer'
  if (!value) return 'Unknown'
  return label.charAt(0).toUpperCase() + label.slice(1).toLowerCase()
}

export function stateFromRegionLabel(label: string) {
  const trimmed = label.trim()
  if (!trimmed || trimmed === '(not set)') return null
  const code = trimmed.toUpperCase()
  if (US_STATE_NAMES[code]) return { code, name: US_STATE_NAMES[code] }
  const match = Object.entries(US_STATE_NAMES).find(([, name]) => name.toLowerCase() === trimmed.toLowerCase())
  if (!match) return null
  return { code: match[0], name: match[1] }
}

export function peopleSinceLabel(since: string | null) {
  const day = parseCalendarDayKey(since)
  if (!day) return null
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(Date.UTC(day.year, day.month - 1, day.day, 12)))
}
