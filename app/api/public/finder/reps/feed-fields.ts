import { createAdminClient } from '@/lib/supabase/admin'
import { validatePublicSiteSlug } from '@/lib/public-site/show-link'

/**
 * Extra public fields for GET /api/public/finder/reps.
 * Reads existing rep and site-settings columns. Does not change those tables.
 */
export const FINDER_PUBLIC_REP_FEED_EXCLUDED_SLUGS = new Set([
  'dudesfizzfest',
  'louisfizzfest',
  'demosparklestudiod5decc',
  'sparklebetademo',
  'sparkle-reviewer-preview',
])

const REP_FEED_COLUMNS =
  'id, status, account_classification, public_site_slug, custom_domain, profile_photo_url, finder_directory_visible'
const SETTINGS_FEED_COLUMNS = 'rep_id, about_narrative, homepage_media_slots'

export interface PublicFinderRepFeedFields {
  about_text: string | null
  about_photo_url: string | null
  public_site_slug: string
  custom_domain: string | null
  site_url: string
}

interface FinderRepFeedRepRow {
  id: string
  status: string | null
  account_classification: string | null
  public_site_slug: string | null
  custom_domain: string | null
  profile_photo_url: string | null
  finder_directory_visible: boolean
}

export type PublicFinderRepEligibility = Pick<
  FinderRepFeedRepRow,
  'status' | 'account_classification' | 'public_site_slug' | 'finder_directory_visible'
>

export function isPublicFinderRepEligible(rep: PublicFinderRepEligibility): boolean {
  const slug = normalizeSlug(rep.public_site_slug)
  return Boolean(
    slug &&
    !FINDER_PUBLIC_REP_FEED_EXCLUDED_SLUGS.has(slug) &&
    rep.finder_directory_visible === true &&
    normalizeToken(rep.status) === 'active' &&
    normalizeToken(rep.account_classification) === 'customer',
  )
}

interface FinderRepFeedSettingsRow {
  rep_id: string
  about_narrative: string | null
  homepage_media_slots: unknown
}

export interface PublicFinderRepFeedSources {
  reps: FinderRepFeedRepRow[]
  settings: FinderRepFeedSettingsRow[]
}

interface FinderRepFeedReadError {
  message?: string
}

interface FinderRepFeedQuery {
  select(columns: string): {
    in(
      column: string,
      values: string[],
    ): PromiseLike<{ data: unknown[] | null; error: FinderRepFeedReadError | null }>
  }
}

interface FinderRepFeedClient {
  from(table: string): FinderRepFeedQuery
}

export async function loadPublicFinderRepFeedSources(
  repIds: readonly string[],
  supabase?: FinderRepFeedClient,
): Promise<PublicFinderRepFeedSources> {
  const ids = [...new Set(repIds.filter((id) => id.trim()))]
  if (ids.length === 0) return { reps: [], settings: [] }
  const client = supabase ?? createAdminClient()

  const repsResult = await client.from('reps').select(REP_FEED_COLUMNS).in('id', ids)
  if (repsResult.error) {
    throw new Error(`Finder rep feed reps read failed: ${repsResult.error.message ?? 'unknown error'}`)
  }

  const settingsResult = await client
    .from('site_settings')
    .select(SETTINGS_FEED_COLUMNS)
    .in('rep_id', ids)
  if (settingsResult.error) {
    throw new Error(
      `Finder rep feed site settings read failed: ${settingsResult.error.message ?? 'unknown error'}`,
    )
  }

  return {
    reps: (repsResult.data ?? []).flatMap((row) => {
      const parsed = readRepRow(row)
      return parsed ? [parsed] : []
    }),
    settings: (settingsResult.data ?? []).flatMap((row) => {
      const parsed = readSettingsRow(row)
      return parsed ? [parsed] : []
    }),
  }
}

export function applyPublicFinderRepFeedFields<T extends { repId: string }>(
  reps: readonly T[],
  sources: PublicFinderRepFeedSources,
): Array<T & PublicFinderRepFeedFields> {
  const repRows = new Map(sources.reps.map((row) => [row.id, row]))
  const settingsRows = new Map(sources.settings.map((row) => [row.rep_id, row]))
  const feed: Array<T & PublicFinderRepFeedFields> = []

  for (const rep of reps) {
    const row = repRows.get(rep.repId)
    if (!row) continue
    const fields = buildPublicFinderRepFeedFields(row, settingsRows.get(rep.repId))
    if (!fields) continue
    feed.push({ ...rep, ...fields })
  }

  return feed
}

function buildPublicFinderRepFeedFields(
  rep: FinderRepFeedRepRow,
  settings: FinderRepFeedSettingsRow | undefined,
): PublicFinderRepFeedFields | null {
  const publicSiteSlug = normalizeSlug(rep.public_site_slug)
  if (!publicSiteSlug || !isPublicFinderRepEligible(rep)) return null

  const customDomain = readCustomDomain(rep.custom_domain)
  const aboutPhoto =
    readAboutSlotImageUrl(settings?.homepage_media_slots) ??
    readOptionalText(rep.profile_photo_url)

  return {
    about_text: readOptionalText(settings?.about_narrative),
    about_photo_url: aboutPhoto,
    public_site_slug: publicSiteSlug,
    custom_domain: customDomain,
    site_url: customDomain
      ? `https://${customDomain}/`
      : `https://yoursparklesuite.com/${publicSiteSlug}`,
  }
}

function readRepRow(value: unknown): FinderRepFeedRepRow | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Record<string, unknown>
  if (typeof row.id !== 'string' || !row.id.trim()) return null
  return {
    id: row.id,
    status: typeof row.status === 'string' ? row.status : null,
    account_classification:
      typeof row.account_classification === 'string' ? row.account_classification : null,
    public_site_slug: typeof row.public_site_slug === 'string' ? row.public_site_slug : null,
    custom_domain: typeof row.custom_domain === 'string' ? row.custom_domain : null,
    profile_photo_url: typeof row.profile_photo_url === 'string' ? row.profile_photo_url : null,
    finder_directory_visible: row.finder_directory_visible === true,
  }
}

function readSettingsRow(value: unknown): FinderRepFeedSettingsRow | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Record<string, unknown>
  if (typeof row.rep_id !== 'string' || !row.rep_id.trim()) return null
  return {
    rep_id: row.rep_id,
    about_narrative: typeof row.about_narrative === 'string' ? row.about_narrative : null,
    homepage_media_slots: row.homepage_media_slots,
  }
}

function readAboutSlotImageUrl(slots: unknown) {
  if (!Array.isArray(slots)) return null
  let imageUrl: string | null = null
  for (const slot of slots) {
    if (!slot || typeof slot !== 'object') continue
    const record = slot as Record<string, unknown>
    if (record.key !== 'about_1') continue
    imageUrl = readOptionalText(record.imageUrl)
  }
  return imageUrl
}

function readCustomDomain(value: string | null) {
  const trimmed = value?.trim() ?? ''
  if (!trimmed) return null
  const withoutScheme = trimmed.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '')
  const host = withoutScheme
    .split(/[/?#]/)[0]
    ?.trim()
    .toLowerCase()
    .replace(/\.$/, '')
    .replace(/:\d+$/, '')
  if (!host || host.includes('@') || host.includes(' ') || !host.includes('.')) return null
  return host
}

function readOptionalText(value: unknown) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed || null
}

function normalizeSlug(value: string | null) {
  const slug = value?.trim().toLowerCase() ?? ''
  return validatePublicSiteSlug(slug).ok ? slug : null
}

function normalizeToken(value: string | null) {
  return value?.trim().toLowerCase() ?? ''
}
