import { createHash } from 'node:crypto'
import {
  resolveTimeZone,
  zonedCalendarDay,
  zonedMidnightToUtc,
  type CalendarDay,
} from '@/lib/services/rep-dashboard-math'

export const SITE_VISIT_PERIOD_DAYS = 28
export const SITE_VISIT_HASH_SALT_ENV = 'PUBLIC_SITE_VISIT_SALT'

export const US_STATE_NAMES: Record<string, string> = {
  AL: 'Alabama',
  AK: 'Alaska',
  AZ: 'Arizona',
  AR: 'Arkansas',
  CA: 'California',
  CO: 'Colorado',
  CT: 'Connecticut',
  DE: 'Delaware',
  DC: 'District of Columbia',
  FL: 'Florida',
  GA: 'Georgia',
  HI: 'Hawaii',
  ID: 'Idaho',
  IL: 'Illinois',
  IN: 'Indiana',
  IA: 'Iowa',
  KS: 'Kansas',
  KY: 'Kentucky',
  LA: 'Louisiana',
  ME: 'Maine',
  MD: 'Maryland',
  MA: 'Massachusetts',
  MI: 'Michigan',
  MN: 'Minnesota',
  MS: 'Mississippi',
  MO: 'Missouri',
  MT: 'Montana',
  NE: 'Nebraska',
  NV: 'Nevada',
  NH: 'New Hampshire',
  NJ: 'New Jersey',
  NM: 'New Mexico',
  NY: 'New York',
  NC: 'North Carolina',
  ND: 'North Dakota',
  OH: 'Ohio',
  OK: 'Oklahoma',
  OR: 'Oregon',
  PA: 'Pennsylvania',
  RI: 'Rhode Island',
  SC: 'South Carolina',
  SD: 'South Dakota',
  TN: 'Tennessee',
  TX: 'Texas',
  UT: 'Utah',
  VT: 'Vermont',
  VA: 'Virginia',
  WA: 'Washington',
  WV: 'West Virginia',
  WI: 'Wisconsin',
  WY: 'Wyoming',
}

/** Flat hex cartogram. One cell per state, including DC. */
export const US_STATE_HEX: Array<{ code: string; col: number; row: number }> = [
  { code: 'AK', col: 0, row: 0 },
  { code: 'ME', col: 10, row: 0 },
  { code: 'WI', col: 5, row: 1 },
  { code: 'VT', col: 9, row: 1 },
  { code: 'NH', col: 10, row: 1 },
  { code: 'WA', col: 0, row: 2 },
  { code: 'ID', col: 1, row: 2 },
  { code: 'MT', col: 2, row: 2 },
  { code: 'ND', col: 3, row: 2 },
  { code: 'MN', col: 4, row: 2 },
  { code: 'IL', col: 5, row: 2 },
  { code: 'MI', col: 6, row: 2 },
  { code: 'NY', col: 8, row: 2 },
  { code: 'MA', col: 9, row: 2 },
  { code: 'OR', col: 0, row: 3 },
  { code: 'NV', col: 1, row: 3 },
  { code: 'WY', col: 2, row: 3 },
  { code: 'SD', col: 3, row: 3 },
  { code: 'IA', col: 4, row: 3 },
  { code: 'IN', col: 5, row: 3 },
  { code: 'OH', col: 6, row: 3 },
  { code: 'PA', col: 7, row: 3 },
  { code: 'NJ', col: 8, row: 3 },
  { code: 'CT', col: 9, row: 3 },
  { code: 'RI', col: 10, row: 3 },
  { code: 'CA', col: 0, row: 4 },
  { code: 'UT', col: 1, row: 4 },
  { code: 'CO', col: 2, row: 4 },
  { code: 'NE', col: 3, row: 4 },
  { code: 'MO', col: 4, row: 4 },
  { code: 'KY', col: 5, row: 4 },
  { code: 'WV', col: 6, row: 4 },
  { code: 'VA', col: 7, row: 4 },
  { code: 'MD', col: 8, row: 4 },
  { code: 'DE', col: 9, row: 4 },
  { code: 'AZ', col: 1, row: 5 },
  { code: 'NM', col: 2, row: 5 },
  { code: 'KS', col: 3, row: 5 },
  { code: 'AR', col: 4, row: 5 },
  { code: 'TN', col: 5, row: 5 },
  { code: 'NC', col: 6, row: 5 },
  { code: 'SC', col: 7, row: 5 },
  { code: 'DC', col: 8, row: 5 },
  { code: 'OK', col: 3, row: 6 },
  { code: 'LA', col: 4, row: 6 },
  { code: 'MS', col: 5, row: 6 },
  { code: 'AL', col: 6, row: 6 },
  { code: 'GA', col: 7, row: 6 },
  { code: 'HI', col: 0, row: 7 },
  { code: 'TX', col: 3, row: 7 },
  { code: 'FL', col: 8, row: 7 },
]

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
}

const BOT_USER_AGENT =
  /bot|crawl|spider|slurp|preview|facebookexternal|embedly|pinterest|slackbot|whatsapp|telegrambot|headless|lighthouse|pingdom|uptimerobot|wget|curl\/|python-requests|go-http-client|axios|node-fetch|semrush|ahrefs|petalbot|bytespider/i

const TRACKING_PARAM =
  /^[a-z0-9][a-z0-9._~-]{0,79}$/i

export type SiteVisitSummary = {
  status: 'ready' | 'unavailable'
  periodDays: number
  periodLabel: string
  total: number
  daily: number[]
  dayLabels: string[]
  qrVisits: number
  directVisits: number
  qrShare: number | null
  heatmap: number[][]
  dayNames: string[]
  busiest: { day: string; hour: number; count: number } | null
  states: Array<{ code: string; name: string; count: number }>
}

export type PublicSiteVisitRow = {
  viewed_at: string
  src?: string | null
  us_state?: string | null
}

export type PublicSiteVisitInsert = {
  rep_id: string
  viewed_at: string
  path: string
  referrer: string | null
  src: string | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  us_state: string | null
  visitor_day_hash: string | null
}

export type PublicSiteVisitDecision =
  | { action: 'ignore'; reason: string }
  | { action: 'insert'; row: Omit<PublicSiteVisitInsert, 'rep_id'> }

function emptyHeatmap() {
  return Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0))
}

function addDays(day: CalendarDay, amount: number): CalendarDay {
  const date = new Date(Date.UTC(day.year, day.month - 1, day.day + amount, 12))
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  }
}

function dayKey(day: CalendarDay) {
  return `${day.year}-${String(day.month).padStart(2, '0')}-${String(day.day).padStart(2, '0')}`
}

function shortDayLabel(day: CalendarDay) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
  }).format(new Date(Date.UTC(day.year, day.month - 1, day.day, 12)))
}

export function emptySiteVisitSummary(
  now = new Date(),
  timeZone?: string | null,
  status: SiteVisitSummary['status'] = 'ready',
): SiteVisitSummary {
  const today = zonedCalendarDay(now, timeZone)
  const days = Array.from({ length: SITE_VISIT_PERIOD_DAYS }, (_, index) =>
    addDays(today, index - (SITE_VISIT_PERIOD_DAYS - 1)),
  )
  return {
    status,
    periodDays: SITE_VISIT_PERIOD_DAYS,
    periodLabel: `Last ${SITE_VISIT_PERIOD_DAYS} days`,
    total: 0,
    daily: days.map(() => 0),
    dayLabels: days.map(shortDayLabel),
    qrVisits: 0,
    directVisits: 0,
    qrShare: null,
    heatmap: emptyHeatmap(),
    dayNames: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    busiest: null,
    states: [],
  }
}

function zonedVisitParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return {
    key: `${values.year}-${values.month}-${values.day}`,
    weekday: WEEKDAY_INDEX[values.weekday] ?? 0,
    hour: Number(values.hour),
  }
}

export function summarizeSiteVisits(args: {
  rows: PublicSiteVisitRow[]
  now?: Date
  timeZone?: string | null
}): SiteVisitSummary {
  const now = args.now ?? new Date()
  const zone = resolveTimeZone(args.timeZone)
  const summary = emptySiteVisitSummary(now, zone, 'ready')
  const today = zonedCalendarDay(now, zone)
  const periodStart = zonedMidnightToUtc(addDays(today, -(SITE_VISIT_PERIOD_DAYS - 1)), zone)
  const dayIndex = new Map(
    Array.from({ length: SITE_VISIT_PERIOD_DAYS }, (_, index) => {
      const day = addDays(today, index - (SITE_VISIT_PERIOD_DAYS - 1))
      return [dayKey(day), index] as const
    }),
  )
  const stateCounts = new Map<string, number>()
  let busiest: SiteVisitSummary['busiest'] = null

  for (const row of args.rows) {
    const viewed = new Date(row.viewed_at)
    if (!Number.isFinite(viewed.getTime()) || viewed < periodStart || viewed > now) continue
    const parts = zonedVisitParts(viewed, zone)
    const index = dayIndex.get(parts.key)
    if (index == null) continue
    summary.total += 1
    summary.daily[index] += 1
    const fromQr = row.src?.trim().toLowerCase() === 'qr'
    if (fromQr) summary.qrVisits += 1
    else summary.directVisits += 1
    if (parts.hour >= 0 && parts.hour < 24) {
      summary.heatmap[parts.weekday][parts.hour] += 1
      const count = summary.heatmap[parts.weekday][parts.hour]
      if (!busiest || count > busiest.count) {
        busiest = { day: summary.dayNames[parts.weekday], hour: parts.hour, count }
      }
    }
    const state = row.us_state?.trim().toUpperCase() ?? ''
    if (US_STATE_NAMES[state]) stateCounts.set(state, (stateCounts.get(state) ?? 0) + 1)
  }

  summary.qrShare = summary.total > 0 ? summary.qrVisits / summary.total : null
  summary.busiest = busiest && busiest.count > 0 ? busiest : null
  summary.states = [...stateCounts.entries()]
    .map(([code, count]) => ({ code, name: US_STATE_NAMES[code], count }))
    .sort((left, right) => right.count - left.count || left.code.localeCompare(right.code))
  return summary
}

function header(headers: Headers, name: string) {
  return headers.get(name)?.split(',')[0]?.trim() ?? ''
}

export function isBotVisit(headers: Headers) {
  const userAgent = header(headers, 'user-agent')
  if (!userAgent || BOT_USER_AGENT.test(userAgent)) return true
  const purpose = `${header(headers, 'purpose')} ${header(headers, 'sec-purpose')} ${header(headers, 'sec-fetch-purpose')} ${header(headers, 'x-purpose')}`.toLowerCase()
  return purpose.includes('prefetch') || purpose.includes('preview')
}

export function usStateFromVercelHeaders(headers: Headers) {
  const country = header(headers, 'x-vercel-ip-country').toUpperCase()
  const region = header(headers, 'x-vercel-ip-country-region').toUpperCase()
  if (country !== 'US') return null
  if (!US_STATE_NAMES[region]) return null
  return region
}

function trackingValue(value: unknown, max: number) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed || trimmed.length > max || !TRACKING_PARAM.test(trimmed)) return null
  return trimmed
}

function safePath(value: unknown) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed.startsWith('/') || trimmed.length > 300) return null
  if (trimmed.includes('://') || /\s/.test(trimmed)) return null
  return trimmed
}

export function publicReferrer(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return null
  try {
    const url = new URL(value.trim())
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    const referrer = `${url.origin}${url.pathname}`.slice(0, 300)
    return referrer || null
  } catch {
    return null
  }
}

export function dailyVisitorHash(args: {
  salt: string | null | undefined
  userAgent: string
  now: Date
}) {
  const salt = args.salt?.trim() ?? ''
  if (!salt) return null
  const day = args.now.toISOString().slice(0, 10)
  return createHash('sha256')
    .update(`${salt}|${day}|${args.userAgent.slice(0, 300)}`)
    .digest('hex')
    .slice(0, 32)
}

export function interpretPublicSiteVisit(args: {
  headers: Headers
  body: unknown
  now?: Date
  salt?: string | null
}): PublicSiteVisitDecision {
  if (isBotVisit(args.headers)) return { action: 'ignore', reason: 'bot' }
  const now = args.now ?? new Date()
  const body = args.body && typeof args.body === 'object' ? (args.body as Record<string, unknown>) : null
  if (!body) return { action: 'ignore', reason: 'body' }
  const path = safePath(body.path)
  if (!path) return { action: 'ignore', reason: 'path' }
  const userAgent = header(args.headers, 'user-agent')
  return {
    action: 'insert',
    row: {
      viewed_at: now.toISOString(),
      path,
      referrer: publicReferrer(body.referrer),
      src: trackingValue(body.src, 40)?.toLowerCase() ?? null,
      utm_source: trackingValue(body.utmSource, 80),
      utm_medium: trackingValue(body.utmMedium, 80),
      utm_campaign: trackingValue(body.utmCampaign, 80),
      us_state: usStateFromVercelHeaders(args.headers),
      visitor_day_hash: dailyVisitorHash({ salt: args.salt, userAgent, now }),
    },
  }
}

const REP_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function readVisitIdentity(body: unknown) {
  const record = body && typeof body === 'object' ? (body as Record<string, unknown>) : null
  const slug = typeof record?.slug === 'string' ? record.slug.trim().toLowerCase() : ''
  const repId = typeof record?.repId === 'string' ? record.repId.trim().toLowerCase() : ''
  return {
    slug: SLUG_PATTERN.test(slug) && slug.length <= 80 ? slug : null,
    repId: REP_ID_PATTERN.test(repId) ? repId : null,
  }
}

export function buildPublicSiteVisitBeacon(args: { repId?: string | null; slug?: string | null }) {
  const repId = args.repId?.trim().toLowerCase() ?? ''
  const slug = args.slug?.trim().toLowerCase() ?? ''
  const safeRep = REP_ID_PATTERN.test(repId) ? repId : ''
  const safeSlug = SLUG_PATTERN.test(slug) && slug.length <= 80 ? slug : ''
  if (!safeRep && !safeSlug) return ''
  return `<script id="sparkle-site-visit">
(function(){
  try {
    var n = navigator;
    if (!n || !n.userAgent || /bot|crawl|spider|preview|headless/i.test(n.userAgent)) return;
    var p = new URLSearchParams(location.search);
    var body = JSON.stringify({
      slug: ${JSON.stringify(safeSlug)},
      repId: ${JSON.stringify(safeRep)},
      path: String(location.pathname || '/').slice(0, 300),
      referrer: String(document.referrer || '').slice(0, 300),
      src: String(p.get('src') || '').slice(0, 40),
      utmSource: String(p.get('utm_source') || '').slice(0, 80),
      utmMedium: String(p.get('utm_medium') || '').slice(0, 80),
      utmCampaign: String(p.get('utm_campaign') || '').slice(0, 80)
    });
    var url = '/api/public-site/visit';
    if (n.sendBeacon) n.sendBeacon(url, new Blob([body], { type: 'application/json' }));
    else fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: body, keepalive: true, credentials: 'omit' });
  } catch (e) {}
})();
</script>`
}

export function injectPublicSiteVisitBeacon(
  html: string,
  args: { repId?: string | null; slug?: string | null },
) {
  const beacon = buildPublicSiteVisitBeacon(args)
  if (!beacon || html.includes('id="sparkle-site-visit"')) return html
  if (html.includes('</body>')) return html.replace('</body>', `${beacon}\n</body>`)
  return `${html}\n${beacon}`
}
