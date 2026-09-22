import type { SupabaseClient } from '@supabase/supabase-js'
import type { WorkspaceMessageBody } from '@/lib/services/workspace-message-permissions'

export const MONTHLY_REPORT_GENERATOR_VERSION = 'workspace-monthly-v2'
export const DEFAULT_WORKSPACE_TIME_ZONE = 'America/New_York'

export type MonthlyMetricStatus = 'tracked' | 'unavailable'

export interface MonthlyMetric {
  key: string
  label: string
  value: number | null
  status: MonthlyMetricStatus
  unavailableReason?: string
}

export interface MonthlyBirthday {
  audienceId: string
  name: string
  month: number
  day: number
}

export interface MonthlyReportPeriod {
  reportMonth: string
  timeZone: string
  previousMonthLabel: string
  currentMonthLabel: string
  periodStart: string
  periodEnd: string
  birthdayMonth: number
}

export interface MonthlyReportSnapshot {
  id: string
  repId: string
  period: MonthlyReportPeriod
  metrics: MonthlyMetric[]
  birthdays: MonthlyBirthday[]
  generatorVersion: string
  publicationId: string | null
  generatedAt: string
}

type DateParts = {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

function assertTimeZone(timeZone: string) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date())
    return timeZone
  } catch {
    return DEFAULT_WORKSPACE_TIME_ZONE
  }
}

function zonedParts(date: Date, timeZone: string): DateParts {
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

function zonedMidnightToUtc(
  year: number,
  month: number,
  day: number,
  timeZone: string,
) {
  const desired = Date.UTC(year, month - 1, day, 0, 0, 0)
  let guess = desired

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const actual = zonedParts(new Date(guess), timeZone)
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

function monthName(year: number, month: number, timeZone: string) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    month: 'long',
    year: 'numeric',
  }).format(new Date(Date.UTC(year, month - 1, 15, 12)))
}

export function getMonthlyReportPeriod(
  now: Date = new Date(),
  requestedTimeZone = DEFAULT_WORKSPACE_TIME_ZONE,
): MonthlyReportPeriod {
  const timeZone = assertTimeZone(requestedTimeZone.trim())
  const current = zonedParts(now, timeZone)
  const reportMonthDate = new Date(Date.UTC(current.year, current.month - 1, 1))
  const previousMonthDate = new Date(Date.UTC(current.year, current.month - 2, 1))
  const periodStart = zonedMidnightToUtc(
    previousMonthDate.getUTCFullYear(),
    previousMonthDate.getUTCMonth() + 1,
    1,
    timeZone,
  )
  const periodEnd = zonedMidnightToUtc(
    reportMonthDate.getUTCFullYear(),
    reportMonthDate.getUTCMonth() + 1,
    1,
    timeZone,
  )

  return {
    reportMonth: `${reportMonthDate.getUTCFullYear()}-${String(
      reportMonthDate.getUTCMonth() + 1,
    ).padStart(2, '0')}-01`,
    timeZone,
    previousMonthLabel: monthName(
      previousMonthDate.getUTCFullYear(),
      previousMonthDate.getUTCMonth() + 1,
      timeZone,
    ),
    currentMonthLabel: monthName(
      reportMonthDate.getUTCFullYear(),
      reportMonthDate.getUTCMonth() + 1,
      timeZone,
    ),
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    birthdayMonth: reportMonthDate.getUTCMonth() + 1,
  }
}

export function isMonthlyReportDue(
  now: Date,
  requestedTimeZone = DEFAULT_WORKSPACE_TIME_ZONE,
) {
  const timeZone = assertTimeZone(requestedTimeZone.trim())
  const local = zonedParts(now, timeZone)
  return local.day >= 1 && local.day <= 3 && local.hour >= 8
}

function tracked(key: string, label: string, value: number): MonthlyMetric {
  return { key, label, value, status: 'tracked' }
}

function unavailable(
  key: string,
  label: string,
  reason = 'Not tracked for this month',
): MonthlyMetric {
  return { key, label, value: null, status: 'unavailable', unavailableReason: reason }
}

async function safeCount(
  operation: () => PromiseLike<{ count: number | null; error: unknown }>,
  key: string,
  label: string,
) {
  try {
    const result = await operation()
    if (result.error) return unavailable(key, label)
    return tracked(key, label, result.count ?? 0)
  } catch {
    return unavailable(key, label)
  }
}

function countForPeriod(
  supabase: SupabaseClient,
  table: string,
  repId: string,
  period: MonthlyReportPeriod,
  dateColumn = 'created_at',
) {
  return supabase
    .from(table)
    .select('id', { head: true, count: 'exact' })
    .eq('rep_id', repId)
    .gte(dateColumn, period.periodStart)
    .lt(dateColumn, period.periodEnd)
}

export async function collectMonthlyReportData(args: {
  supabase: SupabaseClient
  repId: string
  timeZone?: string | null
  now?: Date
}) {
  const period = getMonthlyReportPeriod(
    args.now,
    args.timeZone || DEFAULT_WORKSPACE_TIME_ZONE,
  )

  const [
    customersAdded,
    listingsAdded,
    showsInMonth,
    recipesAdded,
    supportReports,
    teamParticipants,
  ] = await Promise.all([
    safeCount(
      () => countForPeriod(args.supabase, 'customer_audience', args.repId, period),
      'customers_added',
      'Customers added',
    ),
    safeCount(
      () => countForPeriod(args.supabase, 'trade_listings', args.repId, period),
      'trade_listings_added',
      'Dance Floor listings added',
    ),
    safeCount(
      () =>
        args.supabase
          .from('calendar_events')
          .select('id', { head: true, count: 'exact' })
          .eq('rep_id', args.repId)
          .gte('event_time', period.periodStart)
          .lt('event_time', period.periodEnd),
      'shows_scheduled',
      'Shows on your calendar',
    ),
    safeCount(
      () => countForPeriod(args.supabase, 'public_site_recipes', args.repId, period),
      'recipes_added',
      'Recipes added',
    ),
    safeCount(
      () => countForPeriod(args.supabase, 'support_reports', args.repId, period),
      'support_reports',
      'Support reports filed',
    ),
    safeCount(
      () => countForPeriod(args.supabase, 'team_onboarding_participants', args.repId, period),
      'team_participants_added',
      'Team onboarding participants added',
    ),
  ])

  const [totalCustomers, activeListings, pendingRequests, upcomingShows] =
    await Promise.all([
      safeCount(
        () =>
          args.supabase
            .from('customer_audience')
            .select('id', { head: true, count: 'exact' })
            .eq('rep_id', args.repId)
            .lt('created_at', period.periodEnd),
        'total_customers',
        'Customers at month end',
      ),
      safeCount(
        () =>
          args.supabase
            .from('trade_listings')
            .select('id', { head: true, count: 'exact' })
            .eq('rep_id', args.repId)
            .eq('status', 'available'),
        'active_trade_listings',
        'Active Dance Floor listings',
      ),
      safeCount(
        () =>
          args.supabase
            .from('trade_requests')
            .select('id, listing:trade_listings!inner(rep_id)', {
              head: true,
              count: 'exact',
            })
            .eq('listing.rep_id', args.repId)
            .eq('status', 'pending'),
        'pending_trade_requests',
        'Pending trade requests',
      ),
      safeCount(
        () =>
          args.supabase
            .from('calendar_events')
            .select('id', { head: true, count: 'exact' })
            .eq('rep_id', args.repId)
            .eq('status', 'scheduled')
            .gte('event_time', period.periodEnd),
        'upcoming_shows',
        'Upcoming shows',
      ),
    ])

  return {
    period,
    metrics: [
      customersAdded,
      totalCustomers,
      listingsAdded,
      activeListings,
      pendingRequests,
      showsInMonth,
      upcomingShows,
      recipesAdded,
      teamParticipants,
      supportReports,
    ],
    birthdays: [] as MonthlyBirthday[],
  }
}

export function buildMonthlyReportBody(input: {
  period: MonthlyReportPeriod
  metrics: MonthlyMetric[]
  birthdays: MonthlyBirthday[]
}) {
  const metricLines = input.metrics.map((metric) =>
    metric.status === 'tracked'
      ? `• ${metric.label}: ${metric.value ?? 0}`
      : `• ${metric.label}: ${metric.unavailableReason || 'Not tracked for this month'}`,
  )
  return [
    `${input.period.previousMonthLabel} at a glance`,
    ...metricLines,
  ].join('\n')
}

export function buildMonthlyReportBlocks(input: {
  period: MonthlyReportPeriod
  metrics: MonthlyMetric[]
  birthdays: MonthlyBirthday[]
}): WorkspaceMessageBody {
  return [
    { type: 'heading', text: `${input.period.previousMonthLabel} at a glance` },
    ...input.metrics.map((metric) => ({
      type: 'metric' as const,
      label: metric.label,
      value:
        metric.status === 'tracked'
          ? (metric.value ?? 0)
          : metric.unavailableReason || 'Not tracked for this month',
    })),
    {
      type: 'paragraph',
      text: `Reporting period: ${input.period.periodStart} through ${input.period.periodEnd}`,
    },
  ]
}

export async function saveMonthlyReportSnapshot(args: {
  supabase: SupabaseClient
  repId: string
  period: MonthlyReportPeriod
  metrics: MonthlyMetric[]
  birthdays: MonthlyBirthday[]
}) {
  const { data, error } = await args.supabase
    .from('workspace_monthly_report_snapshots')
    .upsert(
      {
        rep_id: args.repId,
        report_month: args.period.reportMonth,
        time_zone: args.period.timeZone,
        period_start: args.period.periodStart,
        period_end: args.period.periodEnd,
        metrics: args.metrics,
        birthdays: args.birthdays,
        generator_version: MONTHLY_REPORT_GENERATOR_VERSION,
      },
      { onConflict: 'rep_id,report_month', ignoreDuplicates: true },
    )
    .select(
      'id, rep_id, report_month, time_zone, period_start, period_end, metrics, birthdays, generator_version, publication_id, generated_at',
    )
    .maybeSingle()

  if (error) throw error
  if (data) return data

  const { data: existing, error: existingError } = await args.supabase
    .from('workspace_monthly_report_snapshots')
    .select(
      'id, rep_id, report_month, time_zone, period_start, period_end, metrics, birthdays, generator_version, publication_id, generated_at',
    )
    .eq('rep_id', args.repId)
    .eq('report_month', args.period.reportMonth)
    .single()
  if (existingError || !existing) {
    throw existingError ?? new Error('monthly report snapshot write failed')
  }
  return existing
}

export async function attachMonthlyReportPublication(args: {
  supabase: SupabaseClient
  snapshotId: string
  publicationId: string
}) {
  const { data, error } = await args.supabase
    .from('workspace_monthly_report_snapshots')
    .update({ publication_id: args.publicationId })
    .eq('id', args.snapshotId)
    .is('publication_id', null)
    .select('id, publication_id')
    .maybeSingle()
  if (error) throw error
  return data
}
