import type { SupabaseClient } from '@supabase/supabase-js'
import { REACHABLE_CUSTOMER_FILTER } from '@/lib/services/site-analytics'
import {
  collectMonthlyReportData,
  type MonthlyMetric,
} from '@/lib/services/workspace-monthly-reports'
import {
  buildDanceFloorInsights,
  emptyDanceFloorInsights,
  toDanceFloorInsightInput,
  type DanceFloorInsightRow,
} from '@/lib/services/dance-floor-insights'
import {
  compareGlanceMetrics,
  createEmptyRepDashboard,
  formatPlatformLabel,
  formatSnapshotMonthLabel,
  isPastShowStatus,
  listUpcomingBirthdays,
  recentMonthBuckets,
  resolveTimeZone,
  summarizePlatformMix,
  type GlanceMetric,
  type RepDashboardPayload,
} from '@/lib/services/rep-dashboard-math'
import {
  emptySiteVisitSummary,
  summarizeSiteVisits,
  type PublicSiteVisitRow,
} from '@/lib/services/site-visit-summary'

const BLING_KITCHEN_RECIPE_REP_IDS = new Set([
  '9a971c05-3631-443e-bcb8-4e9a26e15885',
])
const BLING_KITCHEN_RECIPE_SLUGS = new Set(['blingkitchen', 'bling-kitchen'])

type BirthdayRow = {
  id: string | null
  name: string | null
  birthday_month: number | null
  birthday_day: number | null
}

function hasBlingKitchenRecipeAccess(repId: string, publicSiteSlug?: string | null) {
  return (
    BLING_KITCHEN_RECIPE_REP_IDS.has(repId.trim().toLowerCase()) ||
    BLING_KITCHEN_RECIPE_SLUGS.has(publicSiteSlug?.trim().toLowerCase() ?? '')
  )
}

async function exactCount(
  query: PromiseLike<{ count: number | null; error: { message?: string } | null }>,
) {
  const { count, error } = await query
  if (error) throw error
  return count ?? 0
}

async function listPages<T>(
  fetchPage: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: { message?: string } | null }>,
) {
  const pageSize = 1000
  const rows: T[] = []
  for (let from = 0; rows.length < 5000; from += pageSize) {
    const { data, error } = await fetchPage(from, from + pageSize - 1)
    if (error) throw error
    const page = data ?? []
    rows.push(...page)
    if (page.length < pageSize) break
  }
  return rows
}

function isMissingRelation(error: unknown, relation: string) {
  const record = error as { code?: string; message?: string } | null
  const code = record?.code ?? ''
  const message = record?.message ?? (error instanceof Error ? error.message : '')
  if (code === '42P01' || code === 'PGRST205') return message.toLowerCase().includes(relation)
  return message.toLowerCase().includes(relation) && /does not exist|schema cache|could not find/i.test(message)
}

async function optionalValue<T>(work: () => Promise<T>, fallback: T) {
  try {
    return { value: await work(), failed: false }
  } catch {
    return { value: fallback, failed: true }
  }
}

function snapshotMetrics(value: unknown): GlanceMetric[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const row = item as Partial<MonthlyMetric>
    if (typeof row.key !== 'string' || typeof row.label !== 'string') return []
    return [
      {
        key: row.key,
        label: row.label,
        value: typeof row.value === 'number' ? row.value : null,
        status: row.status,
      },
    ]
  })
}

function publicationTitle(value: unknown) {
  const row = value as {
    workspace_message_publications?: { title?: string | null } | Array<{ title?: string | null }> | null
  } | null
  const publication = Array.isArray(row?.workspace_message_publications)
    ? row?.workspace_message_publications[0]
    : row?.workspace_message_publications
  const title = publication?.title?.trim()
  return title || null
}

export async function getRepDashboard(args: {
  supabase: SupabaseClient
  repId: string
  publicSiteSlug?: string | null
  timeZone?: string | null
  now?: Date
}): Promise<RepDashboardPayload> {
  const now = args.now ?? new Date()
  const timeZone = resolveTimeZone(args.timeZone)
  const nowIso = now.toISOString()
  const months = recentMonthBuckets(now, timeZone)
  const platformStart = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString()
  const recipesEnabled = hasBlingKitchenRecipeAccess(args.repId, args.publicSiteSlug)
  let partial = false

  const [
    nextShowResult,
    customerTotal,
    reachableCustomers,
    customerMonthly,
    activeListings,
    listingMonthly,
    pendingTrades,
    birthdayRows,
    platformRows,
  ] = await Promise.all([
    args.supabase
      .from('calendar_events')
      .select('title, platform, event_time, time_zone')
      .eq('rep_id', args.repId)
      .eq('status', 'scheduled')
      .gt('event_time', nowIso)
      .order('event_time', { ascending: true })
      .limit(1)
      .maybeSingle(),
    exactCount(
      args.supabase
        .from('customer_audience')
        .select('id', { head: true, count: 'exact' })
        .eq('rep_id', args.repId),
    ),
    exactCount(
      args.supabase
        .from('customer_audience')
        .select('id', { head: true, count: 'exact' })
        .eq('rep_id', args.repId)
        .or(REACHABLE_CUSTOMER_FILTER),
    ),
    Promise.all(
      months.map((month) =>
        exactCount(
          args.supabase
            .from('customer_audience')
            .select('id', { head: true, count: 'exact' })
            .eq('rep_id', args.repId)
            .gte('created_at', month.startIso)
            .lt('created_at', month.endIso),
        ),
      ),
    ),
    exactCount(
      args.supabase
        .from('trade_listings')
        .select('id', { head: true, count: 'exact' })
        .eq('rep_id', args.repId)
        .eq('status', 'available')
        .is('deleted_at', null),
    ),
    Promise.all(
      months.map((month) =>
        exactCount(
          args.supabase
            .from('trade_listings')
            .select('id', { head: true, count: 'exact' })
            .eq('rep_id', args.repId)
            .gte('created_at', month.startIso)
            .lt('created_at', month.endIso),
        ),
      ),
    ),
    exactCount(
      args.supabase
        .from('trade_requests')
        .select('id, listing:trade_listings!inner(rep_id)', { head: true, count: 'exact' })
        .eq('status', 'pending')
        .eq('listing.rep_id', args.repId),
    ),
    listPages<BirthdayRow>((from, to) =>
      args.supabase
        .from('customer_audience')
        .select('id, name, birthday_month, birthday_day')
        .eq('rep_id', args.repId)
        .not('birthday_month', 'is', null)
        .not('birthday_day', 'is', null)
        .order('id', { ascending: true })
        .range(from, to),
    ),
    listPages<{ platform: string | null; status: string }>((from, to) =>
      args.supabase
        .from('calendar_events')
        .select('platform, status')
        .eq('rep_id', args.repId)
        .gte('event_time', platformStart)
        .lte('event_time', nowIso)
        .order('event_time', { ascending: true })
        .range(from, to),
    ),
  ])

  if (nextShowResult.error) throw nextShowResult.error
  const nextShowRow = nextShowResult.data

  const glance = await optionalValue(async () => {
    const collected = await collectMonthlyReportData({
      supabase: args.supabase,
      repId: args.repId,
      timeZone,
      now,
    })
    const { data, error } = await args.supabase
      .from('workspace_monthly_report_snapshots')
      .select('report_month, metrics')
      .eq('rep_id', args.repId)
      .lt('report_month', collected.period.reportMonth)
      .order('report_month', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw error
    return {
      periodLabel: collected.period.previousMonthLabel,
      comparedToLabel: data?.report_month
        ? formatSnapshotMonthLabel(String(data.report_month))
        : null,
      rows: compareGlanceMetrics(
        collected.metrics,
        data?.metrics ? snapshotMetrics(data.metrics) : null,
      ),
    }
  }, createEmptyRepDashboard(now, timeZone).monthAtAGlance)
  if (glance.failed) partial = true

  const unread = await optionalValue(async () => {
    const [countResult, latestResult] = await Promise.all([
      args.supabase
        .from('workspace_message_deliveries')
        .select('id', { head: true, count: 'exact' })
        .eq('rep_id', args.repId)
        .is('read_at', null)
        .is('archived_at', null),
      args.supabase
        .from('workspace_message_deliveries')
        .select('workspace_message_publications!inner(title)')
        .eq('rep_id', args.repId)
        .is('read_at', null)
        .is('archived_at', null)
        .order('delivered_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])
    if (countResult.error) throw countResult.error
    if (latestResult.error) throw latestResult.error
    return {
      count: countResult.count ?? 0,
      latestTitle: publicationTitle(latestResult.data),
    }
  }, null)
  if (unread.failed) partial = true

  const team = await optionalValue(async () => {
    const [roster, onboarding] = await Promise.all([
      exactCount(
        args.supabase
          .from('join_team_members')
          .select('id', { head: true, count: 'exact' })
          .eq('rep_id', args.repId),
      ),
      exactCount(
        args.supabase
          .from('team_onboarding_participants')
          .select('id', { head: true, count: 'exact' })
          .eq('owner_rep_id', args.repId),
      ),
    ])
    const count = roster + onboarding
    return count > 0 ? { count } : null
  }, null)
  if (team.failed) partial = true

  const recipes = await optionalValue(async () => {
    if (!recipesEnabled) return null
    const count = await exactCount(
      args.supabase
        .from('public_site_recipes')
        .select('id', { head: true, count: 'exact' })
        .eq('rep_id', args.repId),
    )
    return count > 0 ? { count } : null
  }, null)
  if (recipes.failed) partial = true

  const liveLineup = await optionalValue(async () => {
    const count = await exactCount(
      args.supabase
        .from('live_lineup_show_archives')
        .select('rep_id', { head: true, count: 'exact' })
        .eq('rep_id', args.repId),
    )
    return count > 0 ? { count } : null
  }, null)
  if (liveLineup.failed) partial = true

  const danceFloorInsights = await optionalValue(async () => {
    const [listingRows, requestRows] = await Promise.all([
      listPages<DanceFloorInsightRow>((from, to) =>
        args.supabase
          .from('trade_listings')
          .select(
            `id, status, removal_reason, listed_at, created_at, updated_at, deleted_at,
             listing_source, manual_type_prefix, manual_collection_family, manual_collection_name, manual_size, ring_size,
             design:jewelry_designs(item_number, design_name, bp_msrp, type_prefix, collection:collections(name))`,
          )
          .eq('rep_id', args.repId)
          .order('id', { ascending: true })
          .range(from, to),
      ),
      listPages<{ listing_id: string }>((from, to) =>
        args.supabase
          .from('trade_requests')
          .select('listing_id, listing:trade_listings!inner(rep_id)')
          .eq('listing.rep_id', args.repId)
          .order('id', { ascending: true })
          .range(from, to),
      ),
    ])
    const requests = new Map<string, number>()
    for (const row of requestRows) {
      if (!row.listing_id) continue
      requests.set(row.listing_id, (requests.get(row.listing_id) ?? 0) + 1)
    }
    return buildDanceFloorInsights(
      listingRows.map((row) => toDanceFloorInsightInput(row, requests.get(row.id) ?? 0)),
      now,
    )
  }, emptyDanceFloorInsights())
  if (danceFloorInsights.failed) partial = true

  let siteVisits = emptySiteVisitSummary(now, timeZone, 'unavailable')
  try {
    const periodStart = new Date(now.getTime() - 32 * 24 * 60 * 60 * 1000).toISOString()
    const rows = await listPages<PublicSiteVisitRow>((from, to) =>
      args.supabase
        .from('public_site_visits')
        .select('viewed_at, src, us_state')
        .eq('rep_id', args.repId)
        .gte('viewed_at', periodStart)
        .order('viewed_at', { ascending: true })
        .range(from, to),
    )
    siteVisits = summarizeSiteVisits({ rows, now, timeZone })
  } catch (error) {
    if (!isMissingRelation(error, 'public_site_visits')) partial = true
  }

  return {
    generatedAt: now.toISOString(),
    timeZone,
    partial,
    nextShow: nextShowRow
      ? {
          title: nextShowRow.title?.trim() || 'Upcoming show',
          platform: formatPlatformLabel(nextShowRow.platform),
          eventTime: nextShowRow.event_time,
          timeZone: nextShowRow.time_zone?.trim() || timeZone,
        }
      : null,
    customers: {
      total: customerTotal,
      reachable: reachableCustomers,
      monthly: customerMonthly,
      monthLabels: months.map((month) => month.label),
      addedThisMonth: customerMonthly[customerMonthly.length - 1] ?? 0,
    },
    danceFloor: {
      activeListings,
      monthly: listingMonthly,
      monthLabels: months.map((month) => month.label),
      addedThisMonth: listingMonthly[listingMonthly.length - 1] ?? 0,
    },
    pendingTrades: { count: pendingTrades },
    birthdays: listUpcomingBirthdays({
      people: birthdayRows.map((row) => ({
        id: row.id,
        name: row.name,
        month: row.birthday_month,
        day: row.birthday_day,
      })),
      now,
      timeZone,
    }),
    platformMix: summarizePlatformMix(
      platformRows
        .filter((row) => isPastShowStatus(row.status))
        .map((row) => row.platform),
    ),
    monthAtAGlance: glance.value,
    unreadMessages: unread.value,
    team: team.value,
    recipes: recipes.value,
    liveLineup: liveLineup.value,
    danceFloorInsights: danceFloorInsights.value,
    siteVisits,
  }
}
