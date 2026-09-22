import type { SupabaseClient } from '@supabase/supabase-js'
import type { WorkspaceMessageBody } from '@/lib/services/workspace-message-permissions'

export const WEEKLY_BIRTHDAY_REPORT_GENERATOR_VERSION =
  'workspace-weekly-birthdays-v1'
export const SPARKLE_ECOSYSTEM_TIME_ZONE = 'America/New_York'

type CalendarDay = {
  year: number
  month: number
  day: number
}

type BirthdayRow = {
  id: string
  name?: string | null
  display_name?: string | null
  birthday_month: number | null
  birthday_day: number | null
}

export type WeeklyBirthdayKind = 'customer' | 'team_member'

export interface WeeklyBirthdayEntry {
  recordId: string
  name: string
  kind: WeeklyBirthdayKind
  month: number
  day: number
  occurrenceDate: string
  occurrenceLabel: string
  isToday: boolean
  isLeapDayObserved: boolean
  actionUrl: string
}

export interface WeeklyBirthdayReportPeriod {
  weekStart: string
  weekEnd: string
  weekLabel: string
  timeZone: string
  reportDate: string
  dates: CalendarDay[]
}

function assertTimeZone(timeZone: string) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date())
    return timeZone
  } catch {
    return SPARKLE_ECOSYSTEM_TIME_ZONE
  }
}

function zonedParts(date: Date, timeZone: string) {
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
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
  }
}

function addCalendarDays(day: CalendarDay, amount: number): CalendarDay {
  const date = new Date(Date.UTC(day.year, day.month - 1, day.day + amount, 12))
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  }
}

function dateKey(day: CalendarDay) {
  return `${day.year}-${String(day.month).padStart(2, '0')}-${String(day.day).padStart(2, '0')}`
}

function displayDate(day: CalendarDay, weekday = false) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    ...(weekday ? { weekday: 'long' as const } : {}),
    month: 'long',
    day: 'numeric',
  }).format(new Date(Date.UTC(day.year, day.month - 1, day.day, 12)))
}

function isLeapYear(year: number) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
}

export function getWeeklyBirthdayReportPeriod(
  now: Date = new Date(),
  requestedTimeZone = SPARKLE_ECOSYSTEM_TIME_ZONE,
): WeeklyBirthdayReportPeriod {
  const timeZone = assertTimeZone(requestedTimeZone.trim())
  const current = zonedParts(now, timeZone)
  const localDay = {
    year: current.year,
    month: current.month,
    day: current.day,
  }
  const weekday = new Date(
    Date.UTC(localDay.year, localDay.month - 1, localDay.day, 12),
  ).getUTCDay()
  const sunday = addCalendarDays(localDay, -weekday)
  const dates = Array.from({ length: 7 }, (_, index) =>
    addCalendarDays(sunday, index),
  )
  const saturday = dates[6]

  return {
    weekStart: dateKey(sunday),
    weekEnd: dateKey(saturday),
    weekLabel: `${displayDate(sunday)}–${displayDate(saturday)}`,
    timeZone,
    reportDate: dateKey(localDay),
    dates,
  }
}

export function isWeeklyBirthdayReportDue(
  now: Date,
  requestedTimeZone = SPARKLE_ECOSYSTEM_TIME_ZONE,
) {
  const timeZone = assertTimeZone(requestedTimeZone.trim())
  const local = zonedParts(now, timeZone)
  const weekday = new Date(
    Date.UTC(local.year, local.month - 1, local.day, 12),
  ).getUTCDay()
  return weekday === 0 && local.hour >= 4
}

function occurrenceForBirthday(
  month: number,
  day: number,
  dates: CalendarDay[],
) {
  for (const [index, candidate] of dates.entries()) {
    if (candidate.month === month && candidate.day === day) {
      return { candidate, index, isLeapDayObserved: false }
    }
    if (
      month === 2 &&
      day === 29 &&
      candidate.month === 2 &&
      candidate.day === 28 &&
      !isLeapYear(candidate.year)
    ) {
      return { candidate, index, isLeapDayObserved: true }
    }
  }
  return null
}

export function mapWeeklyBirthdayEntries(
  rows: BirthdayRow[],
  kind: WeeklyBirthdayKind,
  period: WeeklyBirthdayReportPeriod,
): WeeklyBirthdayEntry[] {
  return rows
    .flatMap((row): WeeklyBirthdayEntry[] => {
      const month = Number(row.birthday_month)
      const day = Number(row.birthday_day)
      const name = String(
        kind === 'customer' ? row.name ?? '' : row.display_name ?? '',
      ).trim()
      if (!name || !Number.isInteger(month) || !Number.isInteger(day)) return []
      const occurrence = occurrenceForBirthday(month, day, period.dates)
      if (!occurrence) return []
      const occurrenceDate = dateKey(occurrence.candidate)
      const baseLabel = displayDate(occurrence.candidate, true)
      const occurrenceLabel = occurrence.isLeapDayObserved
        ? `${baseLabel} (February 29 birthday)`
        : baseLabel
      return [
        {
          recordId: String(row.id),
          name,
          kind,
          month,
          day,
          occurrenceDate,
          occurrenceLabel,
          isToday: occurrenceDate === period.reportDate,
          isLeapDayObserved: occurrence.isLeapDayObserved,
          actionUrl:
            kind === 'customer'
              ? `/nic-nac?section=customer-list&customer=${encodeURIComponent(String(row.id))}`
              : `/nic-nac?section=team-management&teamMember=${encodeURIComponent(String(row.id))}`,
        },
      ]
    })
    .sort(
      (left, right) =>
        left.occurrenceDate.localeCompare(right.occurrenceDate) ||
        left.name.localeCompare(right.name),
    )
}

async function listBirthdayRows(
  supabase: SupabaseClient,
  table: 'customer_audience' | 'join_team_members',
  repId: string,
) {
  const select =
    table === 'customer_audience'
      ? 'id, name, birthday_month, birthday_day'
      : 'id, display_name, birthday_month, birthday_day'
  const rows: BirthdayRow[] = []
  const pageSize = 500
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .eq('rep_id', repId)
      .not('birthday_month', 'is', null)
      .not('birthday_day', 'is', null)
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1)
    if (error) throw error
    const page = (data ?? []) as unknown as BirthdayRow[]
    rows.push(...page)
    if (page.length < pageSize) break
  }
  return rows
}

export async function collectWeeklyBirthdayReportData(args: {
  supabase: SupabaseClient
  repId: string
  now?: Date
  timeZone?: string
}) {
  const period = getWeeklyBirthdayReportPeriod(args.now, args.timeZone)
  const [customerRows, teamRows] = await Promise.all([
    listBirthdayRows(args.supabase, 'customer_audience', args.repId),
    listBirthdayRows(args.supabase, 'join_team_members', args.repId),
  ])
  return {
    period,
    customerBirthdays: mapWeeklyBirthdayEntries(
      customerRows,
      'customer',
      period,
    ),
    teamBirthdays: mapWeeklyBirthdayEntries(teamRows, 'team_member', period),
  }
}

function linkItems(entries: WeeklyBirthdayEntry[]) {
  return entries.map((entry) => ({
    label: `${entry.name} — ${entry.isToday ? 'Today · ' : ''}${entry.occurrenceLabel}`,
    href: entry.actionUrl,
  }))
}

function linkBlocks(entries: WeeklyBirthdayEntry[]): WorkspaceMessageBody {
  const items = linkItems(entries)
  const blocks: WorkspaceMessageBody = []
  for (let index = 0; index < items.length; index += 100) {
    blocks.push({ type: 'link_list', links: items.slice(index, index + 100) })
  }
  return blocks
}

export function buildWeeklyBirthdayReportBlocks(input: {
  period: WeeklyBirthdayReportPeriod
  customerBirthdays: WeeklyBirthdayEntry[]
  teamBirthdays: WeeklyBirthdayEntry[]
}): WorkspaceMessageBody {
  return [
    { type: 'heading', text: 'Customer birthdays' },
    ...(input.customerBirthdays.length
      ? linkBlocks(input.customerBirthdays)
      : [{ type: 'paragraph' as const, text: 'No customer birthdays this week.' }]),
    { type: 'heading', text: 'Team-member birthdays' },
    ...(input.teamBirthdays.length
      ? linkBlocks(input.teamBirthdays)
      : [{ type: 'paragraph' as const, text: 'No team-member birthdays this week.' }]),
    {
      type: 'paragraph',
      text: `Week: Sunday, ${displayDate(input.period.dates[0])} through Saturday, ${displayDate(input.period.dates[6])}.`,
    },
  ]
}

export function buildWeeklyBirthdayReportTitle(
  period: WeeklyBirthdayReportPeriod,
) {
  return `Birthdays this week · ${period.weekLabel}`
}

export function buildWeeklyBirthdayReportSummary(input: {
  customerBirthdays: WeeklyBirthdayEntry[]
  teamBirthdays: WeeklyBirthdayEntry[]
}) {
  const customerCount = input.customerBirthdays.length
  const teamCount = input.teamBirthdays.length
  return `${customerCount} customer${customerCount === 1 ? '' : 's'} and ${teamCount} team member${teamCount === 1 ? '' : 's'} have birthdays this week.`
}

export async function saveWeeklyBirthdayReportSnapshot(args: {
  supabase: SupabaseClient
  repId: string
  period: WeeklyBirthdayReportPeriod
  customerBirthdays: WeeklyBirthdayEntry[]
  teamBirthdays: WeeklyBirthdayEntry[]
}) {
  const payload = {
    rep_id: args.repId,
    week_start: args.period.weekStart,
    week_end: args.period.weekEnd,
    time_zone: args.period.timeZone,
    customer_birthdays: args.customerBirthdays,
    team_birthdays: args.teamBirthdays,
    generator_version: WEEKLY_BIRTHDAY_REPORT_GENERATOR_VERSION,
  }
  const select =
    'id, rep_id, week_start, week_end, time_zone, customer_birthdays, team_birthdays, generator_version, publication_id, generated_at'
  const { data, error } = await args.supabase
    .from('workspace_weekly_birthday_report_snapshots')
    .upsert(payload, {
      onConflict: 'rep_id,week_start',
      ignoreDuplicates: true,
    })
    .select(select)
    .maybeSingle()
  if (error) throw error
  if (data) return data

  const { data: existing, error: existingError } = await args.supabase
    .from('workspace_weekly_birthday_report_snapshots')
    .select(select)
    .eq('rep_id', args.repId)
    .eq('week_start', args.period.weekStart)
    .single()
  if (existingError || !existing) {
    throw existingError ?? new Error('weekly birthday snapshot write failed')
  }
  return existing
}

export async function attachWeeklyBirthdayReportPublication(args: {
  supabase: SupabaseClient
  snapshotId: string
  publicationId: string
}) {
  const { data, error } = await args.supabase
    .from('workspace_weekly_birthday_report_snapshots')
    .update({ publication_id: args.publicationId })
    .eq('id', args.snapshotId)
    .is('publication_id', null)
    .select('id, publication_id')
    .maybeSingle()
  if (error) throw error
  return data
}
