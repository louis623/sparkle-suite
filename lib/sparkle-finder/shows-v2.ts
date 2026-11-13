import type { SupabaseClient } from '@supabase/supabase-js'
import { FINDER_PUBLIC_REP_FEED_EXCLUDED_SLUGS, isPublicFinderRepEligible, type PublicFinderRepEligibility } from '@/app/api/public/finder/reps/feed-fields'
import { finderPublicShowWindow, type SparkleFinderLiveShow } from '@/lib/sparkle-finder/public-api'
import { buildPublicSiteUrl, validatePublicSiteSlug } from '@/lib/public-site/show-link'
import { WORKSPACE_PAID_SUBSCRIPTION_STATUSES } from '@/lib/services/workspace-access'
import { createAdminClient } from '@/lib/supabase/admin'

type Filters = {
  limit: number
  repId?: string
  slug?: string
  windowStart?: number
  windowEnd?: number
  liveOnly: boolean
}

type PublicRep = PublicFinderRepEligibility & { id: string; display_name: string | null; business_name: string | null }
type EventRow = { id: string; event_time: string; duration_minutes: number | null; status: 'live' | 'scheduled'; rep: PublicRep }
type Show = SparkleFinderLiveShow & { repId: string; publicLabel: string; businessName: string | null }
type Feed = { shows: Show[]; meta: {
  status: 'ok' | 'partial' | 'unavailable' | 'unconfigured'
  coverage: 'complete' | 'truncated' | 'unknown'
  generatedAt: string
} }

const pageSize = 128
const maxPagesPerStatus = 8
const dayMs = 86_400_000
const uuidPattern = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i
const paramNames = new Set(['contract', 'limit', 'repId', 'slug', 'windowStart', 'windowEnd', 'liveOnly'])

function instant(value: string): number | undefined {
  const match = /^(\d{4}-\d{2}-\d{2})T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.exec(value)
  if (!match) return
  const date = new Date(match[1] + 'T00:00:00Z')
  if (!Number.isFinite(date.valueOf()) || date.toISOString().slice(0, 10) !== match[1]) return
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? timestamp : undefined
}

export function parseFinderShowFilters(params: URLSearchParams, limit: number): Filters | undefined {
  for (const key of params.keys()) {
    if (!paramNames.has(key) || params.getAll(key).length !== 1) return
  }
  const repId = params.get('repId')
  const slug = params.get('slug')
  const liveOnly = params.get('liveOnly')
  if (repId !== null && (!uuidPattern.test(repId) || slug !== null)) return
  if (slug !== null && !validatePublicSiteSlug(slug).ok) return
  if (liveOnly !== null && liveOnly !== 'true' && liveOnly !== 'false') return
  const filters: Filters = { limit, liveOnly: liveOnly === 'true' }
  if (repId) filters.repId = repId.toLowerCase()
  if (slug) filters.slug = slug.trim().toLowerCase()
  if (params.has('windowStart') || params.has('windowEnd')) {
    const start = instant(params.get('windowStart') ?? '')
    const end = instant(params.get('windowEnd') ?? '')
    if (start === undefined || end === undefined || end <= start || end - start > 31 * dayMs) return
    filters.windowStart = start
    filters.windowEnd = end
  }
  return filters
}

// Empty entitlement embeds filter in Postgres without exposing subscription/trial data
// or trusting a stale list of rep ids from a previous read.
const projection = 'id,event_time,duration_minutes,status,rep:reps!inner(id,display_name,business_name,status,account_classification,finder_directory_visible,public_site_slug,paid:subscriptions!subscriptions_rep_id_fkey(),trial:workspace_trials!workspace_trials_rep_id_fkey())'

export async function listFinderShowsV2(filters: Filters, suppliedClient?: SupabaseClient, now = new Date()): Promise<Feed> {
  const generatedAt = now.toISOString()
  if (!suppliedClient && !(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)) {
    return { shows: [], meta: { status: 'unconfigured', coverage: 'unknown', generatedAt } }
  }
  try {
    const supabase = suppliedClient ?? createAdminClient()
    const shows: Show[] = []
    const earliestEnd = Math.max(now.valueOf(), filters.windowStart ?? now.valueOf())
    let truncated = false
    for (const status of ['live', 'scheduled'] as const) {
      let cursor: { eventTime: string; id: string } | undefined
      for (let page = 0; page < maxPagesPerStatus; page++) {
        let query = supabase.from('calendar_events').select(projection)
          .eq('status', status)
          .eq('rep.finder_directory_visible', true).eq('rep.status', 'active').eq('rep.account_classification', 'customer')
          .not('rep.public_site_slug', 'in', '(' + [...FINDER_PUBLIC_REP_FEED_EXCLUDED_SLUGS].join(',') + ')')
          .in('rep.paid.status', [...WORKSPACE_PAID_SUBSCRIPTION_STATUSES])
          .eq('rep.trial.status', 'active').gt('rep.trial.expires_at', generatedAt)
          .or('paid.not.is.null,trial.not.is.null', { referencedTable: 'rep' })
          // Include unusually long shows which started before the ordinary lookback.
          .or('event_time.gte.' + new Date(earliestEnd - dayMs).toISOString() + ',duration_minutes.gt.1440')
        if (filters.repId) query = query.eq('rep_id', filters.repId)
        if (filters.slug) query = query.eq('rep.public_site_slug', filters.slug)
        if (filters.windowEnd !== undefined) query = query.lt('event_time', new Date(filters.windowEnd).toISOString())
        if (status === 'live' || filters.liveOnly) query = query.lte('event_time', generatedAt)
        if (cursor) {
          query = query.or('event_time.gt.' + cursor.eventTime + ',and(event_time.eq.' + cursor.eventTime + ',id.gt.' + cursor.id + ')')
        }
        const { data, error } = await query.order('event_time').order('id').limit(pageSize)
        if (error || !Array.isArray(data)) throw new Error('Public shows unavailable')
        if (!data.length) break
        const rows = data as unknown as EventRow[]
        for (const row of rows) {
          const rep = row.rep
          if (!rep || !isPublicFinderRepEligible(rep)) continue
          const window = finderPublicShowWindow(row.event_time, row.duration_minutes)
          if (!window || window.endsAtMs <= earliestEnd) continue
          const publicLabel = rep.display_name?.trim()
          if (!publicLabel || !rep.public_site_slug) continue
          const businessName = rep.business_name?.trim() || null
          shows.push({
            showId: row.id, showName: businessName || publicLabel, repId: rep.id,
            publicLabel, businessName, repFirstName: publicLabel.split(/\s+/)[0],
            startsAt: row.event_time, status: row.status, customerSiteUrl: buildPublicSiteUrl(rep.public_site_slug),
            durationMinutes: window.durationMinutes, endTime: window.endTime,
          })
          if (shows.length > filters.limit) break
        }
        if (shows.length > filters.limit || page + 1 === maxPagesPerStatus) {
          truncated = true
          break
        }
        // Even a short page can be a server-imposed limit. Prove exhaustion with an empty page.
        const last = rows[rows.length - 1]
        // Preserve the database timestamp's full precision in the seek predicate.
        cursor = { eventTime: last.event_time, id: last.id }
      }
      if (shows.length > filters.limit) break
    }
    return { shows: shows.slice(0, filters.limit), meta: {
      status: truncated ? 'partial' : 'ok', coverage: truncated ? 'truncated' : 'complete', generatedAt,
    } }
  } catch {
    return { shows: [], meta: { status: 'unavailable', coverage: 'unknown', generatedAt } }
  }
}
