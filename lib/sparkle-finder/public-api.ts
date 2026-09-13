import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import { PAID_WORKSPACE_STATUSES } from '@/lib/nic-nac/subscription-access'
import { buildPublicSiteUrl, validatePublicSiteSlug } from '@/lib/public-site/show-link'
import type { JewelryType } from '@/lib/services/types'
import {
  buildPostgrestIlikeAnyFilter,
  escapePostgrestIlikePattern,
} from '@/lib/services/postgrest-filter'
import {
  buildFinderAvailabilityPage,
  decodeFinderAvailabilityCursor,
  FinderAvailabilityConfigurationError,
  type FinderAvailabilityPageInfo,
} from '@/lib/sparkle-finder/availability-v2'

type FinderCollectionRelation =
  | { name: string | null; collection_year: number | null }
  | Array<{ name: string | null; collection_year: number | null }>
  | null

type FinderRepSingle = {
  id: string
  display_name: string | null
  business_name: string | null
  profile_photo_url: string | null
  custom_domain: string | null
  public_site_slug: string | null
  status: string | null
  finder_directory_visible?: boolean | null
}

export type FinderDirectoryRpcRow = {
  rep_id: string
  display_name: string | null
  business_name: string | null
  avatar_url: string | null
  public_site_slug: string | null
  next_show_id: string | null
  next_show_name: string | null
  next_show_starts_at: string | null
  next_show_status: string | null
  next_show_duration_minutes: number | null
}

type FinderDesignRow = {
  id: string
  item_number: string
  design_name: string
  material: string | null
  main_stone: string | null
  bp_msrp: number | null
  canonical_photo_url: string | null
  rarity_classification?: FinderCatalogLabel | null
  type_prefix: JewelryType
  search_tags: string[] | null
  collection: FinderCollectionRelation
  created_at?: string | null
}

type FinderRepRow =
  | FinderRepSingle
  | FinderRepSingle[]
  | null

type FinderListingRow = {
  id: string
  rep_id: string
  design_id: string | null
  listing_photo_url: string | null
  uses_canonical_photo: boolean | null
  listed_at: string | null
  status: string
  quantity_available?: number
  design: FinderDesignRow | FinderDesignRow[] | null
  rep: FinderRepRow
}

export type FinderLeadShowRow = {
  id: string
  rep_id: string
  event_time: string
  title: string | null
  status: string
  duration_minutes?: number | null
}

type FinderShowRow = FinderLeadShowRow

type FinderLiveShowRow = FinderLeadShowRow & {
  rep: FinderRepRow
}

export type FinderJewelryType =
  | 'ring'
  | 'necklace'
  | 'earrings'
  | 'stack'
  | 'bracelet'

export type FinderCatalogLabel = 'diamond' | 'unicorn' | 'standard'

export interface SparkleFinderCatalogItem {
  designId: string
  itemNumber: string
  designName: string
  collectionName: string | null
  collectionYear: number | null
  jewelryType: FinderJewelryType
  material: string | null
  mainStone: string | null
  bpMsrp: number | null
  canonicalPhotoUrl: string | null
  rarityClassification: FinderCatalogLabel
  searchTags: string[]
  /** Legacy eligible listing-row count retained during the Finder rollout. */
  availableListingCount: number
  /** Pending-adjusted listing opportunities for this item in this response context. */
  availableLeadCount: number
  /** Pending-adjusted physical dancer quantity for this item in this response context. */
  availableDancerCount: number
}

export interface SparkleFinderCatalogFacetOption {
  value: string
  count: number
}

export interface SparkleFinderCatalogFacets {
  collections: SparkleFinderCatalogFacetOption[]
  materials: SparkleFinderCatalogFacetOption[]
  stones: SparkleFinderCatalogFacetOption[]
  types: SparkleFinderCatalogFacetOption[]
  labels: SparkleFinderCatalogFacetOption[]
  years: SparkleFinderCatalogFacetOption[]
}

export interface SparkleFinderPublicRep {
  repId: string
  showName: string
  repFirstName: string
  customerSiteUrl: string
}

export interface SparkleFinderPublicShow {
  showId: string
  repId: string
  startsAt: string
  title: string | null
  status: 'scheduled' | 'live'
}

export interface SparkleFinderAvailabilityMatch {
  listingId: string
  quantityAvailable: number
  listedAt: string | null
  photoUrl: string | null
  photoSource: 'listing' | 'canonical' | 'missing'
  item: SparkleFinderCatalogItem
  rep: SparkleFinderPublicRep
  nextShow: SparkleFinderPublicShow
}

export interface SparkleFinderAvailabilityResult {
  schemaVersion: 2
  requestedItem: SparkleFinderCatalogItem | null
  exactMatches: SparkleFinderAvailabilityMatch[]
  similarMatches: SparkleFinderAvailabilityMatch[]
  exactPageInfo: FinderAvailabilityPageInfo
  similarPageInfo: FinderAvailabilityPageInfo
}

export interface SparkleFinderLiveShow {
  showId: string
  showName: string
  repFirstName: string
  startsAt: string
  status: 'scheduled' | 'live'
  customerSiteUrl: string
}

export interface SparkleFinderDirectoryShow {
  showId: string
  showName: string
  startsAt: string
  status: 'scheduled' | 'live'
  customerSiteUrl: string | null
  durationMinutes: number | null
}

export interface SparkleFinderDirectoryRep {
  repId: string
  displayName: string
  businessName: string | null
  avatarUrl: string | null
  state: string | null
  customerSiteUrl: string | null
  repBoardUrl: string | null
  nextShow: SparkleFinderDirectoryShow | null
}

export interface SparkleFinderCatalogListOptions {
  query?: string
  jewelryType?: FinderJewelryType
  collection?: string
  material?: string
  mainStone?: string
  label?: FinderCatalogLabel
  collectionYear?: number
  limit?: number
  supabase?: SupabaseClient
}

export type SparkleFinderCatalogFacetOptions = Omit<
  SparkleFinderCatalogListOptions,
  'limit'
>

export interface SparkleFinderCatalogDetailOptions {
  designId: string
  supabase?: SupabaseClient
}

export interface SparkleFinderAvailabilityOptions {
  designId: string
  limit?: number
  exactCursor?: string
  similarCursor?: string
  supabase?: SupabaseClient
}

export type FinderAvailabilityRpcRow = {
  bucket: 'exact' | 'similar'
  listing_id: string | null
  rep_id: string | null
  design_id: string | null
  net_quantity: number | null
  listed_at: string | null
  listing_photo_url: string | null
  uses_canonical_photo: boolean | null
  item_number: string | null
  design_name: string | null
  material: string | null
  main_stone: string | null
  bp_msrp: number | null
  canonical_photo_url: string | null
  type_prefix: JewelryType | null
  search_tags: string[] | null
  rarity_classification?: FinderCatalogLabel | null
  collection_name: string | null
  collection_year: number | null
  rep_display_name: string | null
  rep_business_name: string | null
  rep_public_site_slug: string | null
  rep_status: string | null
  total_lead_count: number | string
  total_dancer_count: number | string
}

export interface SparkleFinderLiveShowsOptions {
  limit?: number
  supabase?: SupabaseClient
}

export interface SparkleFinderDirectoryOptions {
  query?: string
  limit?: number
  supabase?: SupabaseClient
}

const FINDER_CATALOG_SELECT =
  'id, item_number, design_name, material, main_stone, bp_msrp, canonical_photo_url, rarity_classification, type_prefix, search_tags, created_at, collection:collections(name, collection_year)'

const FINDER_LIVE_SHOW_SELECT =
  'id, rep_id, event_time, title, status, duration_minutes, rep:reps(id, display_name, business_name, profile_photo_url, custom_domain, public_site_slug, status)'

export const DEFAULT_FINDER_CATALOG_LIMIT = 24
export const MAX_FINDER_CATALOG_LIMIT = 50
export const MAX_FINDER_CATALOG_FACET_SOURCE_LIMIT = 500
export const DEFAULT_FINDER_AVAILABILITY_LIMIT = 24
export const MAX_FINDER_AVAILABILITY_LIMIT = 50
export const DEFAULT_FINDER_LIVE_SHOW_LIMIT = 50
export const MAX_FINDER_LIVE_SHOW_LIMIT = 100
export const DEFAULT_FINDER_REP_DIRECTORY_LIMIT = 50
export const MAX_FINDER_REP_DIRECTORY_LIMIT = 200

const TYPE_MAP: Record<JewelryType, FinderJewelryType> = {
  RG: 'ring',
  NK: 'necklace',
  ER: 'earrings',
  ST: 'stack',
  BR: 'bracelet',
}

const TYPE_PREFIX_MAP: Record<FinderJewelryType, JewelryType> = {
  ring: 'RG',
  necklace: 'NK',
  earrings: 'ER',
  stack: 'ST',
  bracelet: 'BR',
}

export function parseSparkleFinderLimit(
  rawLimit: string | null,
  fallback: number,
  max: number,
): number | null {
  if (!rawLimit) return fallback
  const normalized = rawLimit.trim()
  if (!/^\d+$/.test(normalized)) return null
  const parsed = Number.parseInt(normalized, 10)
  if (!Number.isInteger(parsed) || parsed < 1) return null
  return Math.min(parsed, max)
}

export function mapSparkleFinderDesignRow(
  row: FinderDesignRow,
  availableListingCount = 0,
  availableLeadCount = 0,
  availableDancerCount = 0,
): SparkleFinderCatalogItem {
  const collection = readSingle(row.collection)

  return {
    designId: row.id,
    itemNumber: row.item_number,
    designName: row.design_name,
    collectionName: collection?.name?.trim() || null,
    collectionYear: collection?.collection_year ?? null,
    jewelryType: TYPE_MAP[row.type_prefix],
    material: row.material,
    mainStone: row.main_stone,
    bpMsrp: row.bp_msrp,
    canonicalPhotoUrl: row.canonical_photo_url,
    rarityClassification: normalizeFinderCatalogLabel(row.rarity_classification),
    searchTags: Array.isArray(row.search_tags) ? row.search_tags : [],
    availableListingCount,
    availableLeadCount,
    availableDancerCount,
  }
}

export async function listSparkleFinderCatalogItems(
  options: SparkleFinderCatalogListOptions = {},
): Promise<SparkleFinderCatalogItem[]> {
  if (!isFinderSupabaseConfigured(options.supabase)) return []

  const supabase = options.supabase ?? createAdminClient()
  const limit = Math.min(
    Math.max(options.limit ?? DEFAULT_FINDER_CATALOG_LIMIT, 1),
    MAX_FINDER_CATALOG_LIMIT,
  )
  const designs = filterCatalogRowsByLabel(
    await loadCatalogDesignRows(supabase, options, limit),
    options.label,
  )
  const counts = await countEligibleAvailableListings(supabase, designs.map((design) => design.id))

  return designs.map((design) =>
    mapSparkleFinderDesignRow(design, counts.get(design.id) ?? 0),
  )
}

export async function listSparkleFinderCatalogFacets(
  options: SparkleFinderCatalogFacetOptions = {},
): Promise<SparkleFinderCatalogFacets> {
  if (!isFinderSupabaseConfigured(options.supabase)) return emptySparkleFinderCatalogFacets()

  const supabase = options.supabase ?? createAdminClient()
  const rows = filterCatalogRowsByLabel(
    await loadCatalogDesignRows(supabase, options, MAX_FINDER_CATALOG_FACET_SOURCE_LIMIT),
    options.label,
  )

  return deriveSparkleFinderCatalogFacets(rows)
}

export function deriveSparkleFinderCatalogFacets(
  rows: FinderDesignRow[],
): SparkleFinderCatalogFacets {
  const collectionCounts = new Map<string, number>()
  const materialCounts = new Map<string, number>()
  const stoneCounts = new Map<string, number>()
  const typeCounts = new Map<string, number>()
  const labelCounts = new Map<string, number>()
  const yearCounts = new Map<string, number>()

  for (const row of rows) {
    const collection = readSingle(row.collection)
    incrementFacet(collectionCounts, collection?.name)
    incrementFacet(materialCounts, row.material)
    incrementFacet(stoneCounts, row.main_stone)
    incrementFacet(typeCounts, TYPE_MAP[row.type_prefix])
    incrementFacet(labelCounts, deriveSparkleFinderCatalogLabel(row))
    if (collection?.collection_year) {
      incrementFacet(yearCounts, String(collection.collection_year))
    }
  }

  return {
    collections: mapFacetCounts(collectionCounts),
    materials: mapFacetCounts(materialCounts),
    stones: mapFacetCounts(stoneCounts),
    types: mapFacetCounts(typeCounts),
    labels: mapFacetCounts(labelCounts),
    years: mapFacetCounts(yearCounts),
  }
}

export async function getSparkleFinderCatalogItem(
  options: SparkleFinderCatalogDetailOptions,
): Promise<SparkleFinderCatalogItem | null> {
  if (!options.designId.trim() || !isFinderSupabaseConfigured(options.supabase)) {
    return null
  }

  const supabase = options.supabase ?? createAdminClient()
  const { data, error } = await supabase
    .from('jewelry_designs')
    .select(FINDER_CATALOG_SELECT)
    .eq('id', options.designId)
    .maybeSingle()
  if (error) throw error
  if (!data) return null

  const counts = await countEligibleAvailableListings(supabase, [options.designId])
  return mapSparkleFinderDesignRow(
    data as unknown as FinderDesignRow,
    counts.get(options.designId) ?? 0,
  )
}

export async function getSparkleFinderAvailability(
  options: SparkleFinderAvailabilityOptions,
): Promise<SparkleFinderAvailabilityResult> {
  if (!options.designId.trim()) {
    return emptySparkleFinderAvailabilityResult(null)
  }
  if (!isFinderSupabaseConfigured(options.supabase)) {
    throw new FinderAvailabilityConfigurationError()
  }

  const exactPosition = options.exactCursor
    ? decodeFinderAvailabilityCursor({
        cursor: options.exactCursor,
        designId: options.designId,
        bucket: 'exact',
      })
    : null
  const similarPosition = options.similarCursor
    ? decodeFinderAvailabilityCursor({
        cursor: options.similarCursor,
        designId: options.designId,
        bucket: 'similar',
      })
    : null

  const supabase = options.supabase ?? createAdminClient()
  const requestedItem = await getSparkleFinderCatalogItem({
    designId: options.designId,
    supabase,
  })
  if (!requestedItem) return emptySparkleFinderAvailabilityResult(null)

  const eligibleRepIds = await loadPublicFinderEligibleRepIds(supabase)
  if (eligibleRepIds.length === 0) {
    return emptySparkleFinderAvailabilityResult(requestedItem)
  }
  const availabilityRepIds = await loadFinderAvailabilityEligibleRepIds(
    supabase,
    eligibleRepIds,
  )
  if (availabilityRepIds.length === 0) {
    return emptySparkleFinderAvailabilityResult(requestedItem)
  }
  const nextShows = await loadNextShowsByRepId(supabase, availabilityRepIds)
  if (nextShows.size === 0) {
    return emptySparkleFinderAvailabilityResult(requestedItem)
  }

  const limit = Math.min(
    Math.max(options.limit ?? DEFAULT_FINDER_AVAILABILITY_LIMIT, 1),
    MAX_FINDER_AVAILABILITY_LIMIT,
  )
  const { data, error } = await supabase.rpc(
    'list_sparkle_finder_availability_v2',
    {
      p_design_id: options.designId,
      p_eligible_rep_ids: Array.from(nextShows.keys()),
      p_limit: limit + 1,
      p_exact_after_listed_at: exactPosition?.listedAt ?? null,
      p_exact_after_listing_id: exactPosition?.listingId ?? null,
      p_similar_after_listed_at: similarPosition?.listedAt ?? null,
      p_similar_after_listing_id: similarPosition?.listingId ?? null,
    },
  )
  if (error) throw error

  const rows = parseFinderAvailabilityRpcRows(data, {
    requestedItem,
    eligibleRepIds: new Set(nextShows.keys()),
    exactAfter: exactPosition,
    similarAfter: similarPosition,
  })
  const exactRpcRows = rows.filter((row) => row.bucket === 'exact')
  const similarRpcRows = rows.filter((row) => row.bucket === 'similar')
  const exactMatches = mapFinderAvailabilityRpcRows(exactRpcRows, nextShows)
  const similarMatches = mapFinderAvailabilityRpcRows(similarRpcRows, nextShows)
  const exactTotals = readFinderAvailabilityTotals(exactRpcRows)
  const similarTotals = readFinderAvailabilityTotals(similarRpcRows)
  const exactPage = buildFinderAvailabilityPage({
    bucket: 'exact',
    designId: options.designId,
    rows: exactMatches,
    limit,
    ...exactTotals,
  })
  const similarPage = buildFinderAvailabilityPage({
    bucket: 'similar',
    designId: options.designId,
    rows: similarMatches,
    limit,
    ...similarTotals,
  })

  return {
    schemaVersion: 2,
    requestedItem: applyFinderAvailabilityTotalsToItem(
      requestedItem,
      exactPage.pageInfo,
    ),
    exactMatches: exactPage.matches,
    similarMatches: similarPage.matches,
    exactPageInfo: exactPage.pageInfo,
    similarPageInfo: similarPage.pageInfo,
  }
}

export function applyFinderAvailabilityTotalsToItem(
  item: SparkleFinderCatalogItem,
  totals: Pick<FinderAvailabilityPageInfo, 'totalLeadCount' | 'totalDancerCount'>,
): SparkleFinderCatalogItem {
  return {
    ...item,
    availableLeadCount: totals.totalLeadCount,
    availableDancerCount: totals.totalDancerCount,
  }
}

async function loadFinderAvailabilityEligibleRepIds(
  supabase: SupabaseClient,
  repIds: string[],
) {
  const { data, error } = await supabase
    .from('reps')
    .select(
      'id, display_name, business_name, profile_photo_url, custom_domain, public_site_slug, status, finder_directory_visible',
    )
    .in('id', repIds)
  if (error) throw error
  return filterFinderAvailabilityEligibleRepRows(
    (data ?? []) as FinderRepSingle[],
  ).map((rep) => rep.id)
}

export function filterFinderAvailabilityEligibleRepRows(rows: FinderRepSingle[]) {
  return rows.filter(
    (rep) =>
      isFinderPublicRepStatus(rep.status) && hasFinderResolvablePublicSite(rep),
  )
}

export async function listSparkleFinderLiveShows(
  options: SparkleFinderLiveShowsOptions = {},
): Promise<SparkleFinderLiveShow[]> {
  if (!isFinderSupabaseConfigured(options.supabase)) return []

  const supabase = options.supabase ?? createAdminClient()
  const limit = Math.min(
    Math.max(options.limit ?? DEFAULT_FINDER_LIVE_SHOW_LIMIT, 1),
    MAX_FINDER_LIVE_SHOW_LIMIT,
  )
  const eligibleRepIds = await loadPublicFinderEligibleRepIds(supabase)
  if (eligibleRepIds.length === 0) return []

  const rows = await loadFinderLiveShowRows(supabase, eligibleRepIds, limit)
  return mapSparkleFinderLiveShowRows(rows).slice(0, limit)
}

export async function listSparkleFinderPublicReps(
  options: SparkleFinderDirectoryOptions = {},
): Promise<SparkleFinderDirectoryRep[]> {
  if (!isFinderSupabaseConfigured(options.supabase)) return []

  const supabase = options.supabase ?? createAdminClient()
  const limit = Math.min(
    Math.max(options.limit ?? DEFAULT_FINDER_REP_DIRECTORY_LIMIT, 1),
    MAX_FINDER_REP_DIRECTORY_LIMIT,
  )
  const asOf = new Date().toISOString()
  const queryText = options.query?.trim().slice(0, 100) || null
  const { data, error } = await supabase.rpc(
    'list_sparkle_finder_public_reps',
    {
      p_limit: limit,
      p_query: queryText,
      p_as_of: asOf,
    },
  )
  if (error) throw error
  return mapSparkleFinderDirectoryRows(
    (data ?? []) as unknown as FinderDirectoryRpcRow[],
    asOf,
  ).slice(0, limit)
}

async function loadCatalogDesignRows(
  supabase: SupabaseClient,
  options: SparkleFinderCatalogListOptions,
  limit: number,
) {
  const queryText = options.query?.trim()
  const collectionIds = await loadCatalogFilterCollectionIds(supabase, options, limit)
  if (collectionIds && collectionIds.length === 0) return []

  if (!queryText) {
    let request = supabase
      .from('jewelry_designs')
      .select(FINDER_CATALOG_SELECT)
    request = applyCatalogBrowseFilters(request, options, collectionIds)
    const { data, error } = await request.order('created_at', { ascending: false }).limit(limit)
    if (error) throw error
    return ((data ?? []) as unknown as FinderDesignRow[])
  }

  let request = supabase
    .from('jewelry_designs')
    .select(FINDER_CATALOG_SELECT)
    .or(
      buildPostgrestIlikeAnyFilter(
        ['item_number', 'design_name', 'material', 'main_stone'],
        queryText,
      ),
    )
  request = applyCatalogBrowseFilters(request, options, collectionIds)
  const { data, error } = await request.order('created_at', { ascending: false }).limit(limit)
  if (error) throw error
  const rows = ((data ?? []) as unknown as FinderDesignRow[])
  if (rows.length > 0) return rows

  return loadCatalogFallbackRows(supabase, queryText, limit, options, collectionIds)
}

async function loadCatalogFallbackRows(
  supabase: SupabaseClient,
  queryText: string,
  limit: number,
  options: SparkleFinderCatalogListOptions,
  explicitCollectionIds: string[] | null,
) {
  const tag = queryText.trim().toLowerCase()
  if (tag.length >= 2 && tag.length <= 32) {
    let request = supabase
      .from('jewelry_designs')
      .select(FINDER_CATALOG_SELECT)
      .overlaps('search_tags', [tag])
    request = applyCatalogBrowseFilters(request, options, explicitCollectionIds)
    const { data, error } = await request.order('created_at', { ascending: false }).limit(limit)
    if (error) throw error
    const rows = ((data ?? []) as unknown as FinderDesignRow[])
    if (rows.length > 0) return rows
  }

  const collectionIds = await loadFallbackCollectionIds(supabase, queryText, limit)
  if (collectionIds.length > 0) {
    const narrowedCollectionIds = explicitCollectionIds
      ? collectionIds.filter((collectionId) => explicitCollectionIds.includes(collectionId))
      : collectionIds

    if (narrowedCollectionIds.length === 0) return []

    let request = supabase
      .from('jewelry_designs')
      .select(FINDER_CATALOG_SELECT)
      .in('collection_id', narrowedCollectionIds)
    request = applyCatalogBrowseFilters(request, options, null)
    const { data, error } = await request.order('created_at', { ascending: false }).limit(limit)
    if (error) throw error
    return ((data ?? []) as unknown as FinderDesignRow[])
  }

  return []
}

function applyCatalogBrowseFilters<TRequest extends FinderCatalogBrowseFilterRequest<TRequest>>(
  request: TRequest,
  options: SparkleFinderCatalogListOptions,
  collectionIds: string[] | null,
): TRequest {
  if (options.jewelryType) {
    request = request.eq('type_prefix', TYPE_PREFIX_MAP[options.jewelryType])
  }
  if (options.material?.trim()) {
    request = request.ilike(
      'material',
      `%${escapePostgrestIlikePattern(options.material)}%`,
    )
  }
  if (options.mainStone?.trim()) {
    request = request.ilike(
      'main_stone',
      `%${escapePostgrestIlikePattern(options.mainStone)}%`,
    )
  }
  if (collectionIds) {
    request = request.in('collection_id', collectionIds)
  }
  return request
}

async function loadCatalogFilterCollectionIds(
  supabase: SupabaseClient,
  options: SparkleFinderCatalogListOptions,
  limit: number,
) {
  const collection = options.collection?.trim()
  const hasCollectionFilter = Boolean(collection)
  const hasYearFilter = typeof options.collectionYear === 'number'
  if (!hasCollectionFilter && !hasYearFilter) return null

  let request = supabase.from('collections').select('id')
  if (collection) {
    request = request.ilike('name', `%${escapePostgrestIlikePattern(collection)}%`)
  }
  if (typeof options.collectionYear === 'number') {
    request = request.eq('collection_year', options.collectionYear)
  }

  const { data, error } = await request.limit(limit)
  if (error) throw error
  return ((data ?? []) as Array<{ id: string }>).map((row) => row.id)
}

async function loadFallbackCollectionIds(
  supabase: SupabaseClient,
  queryText: string,
  limit: number,
) {
  const pattern = `%${escapePostgrestIlikePattern(queryText)}%`
  let request = supabase.from('collections').select('id').ilike('name', pattern)
  if (/^20[2-4]\d$/.test(queryText)) {
    request = supabase.from('collections').select('id').eq('collection_year', Number(queryText))
  }

  const { data, error } = await request.limit(limit)
  if (error) throw error
  return ((data ?? []) as Array<{ id: string }>).map((collection) => collection.id)
}

function filterCatalogRowsByLabel(
  rows: FinderDesignRow[],
  label: FinderCatalogLabel | undefined,
) {
  if (!label) return rows

  return rows.filter((row) => {
    return deriveSparkleFinderCatalogLabel(row) === label
  })
}

type FinderCatalogBrowseFilterRequest<TRequest> = {
  eq(column: string, value: string): TRequest
  ilike(column: string, pattern: string): TRequest
  in(column: string, values: string[]): TRequest
}

function deriveSparkleFinderCatalogLabel(row: FinderDesignRow): FinderCatalogLabel {
  return normalizeFinderCatalogLabel(row.rarity_classification)
}

function normalizeFinderCatalogLabel(value: unknown): FinderCatalogLabel {
  return value === 'diamond' || value === 'unicorn' ? value : 'standard'
}

function incrementFacet(counts: Map<string, number>, value: string | null | undefined) {
  const normalized = value?.trim()
  if (!normalized) return
  counts.set(normalized, (counts.get(normalized) ?? 0) + 1)
}

function mapFacetCounts(counts: Map<string, number>): SparkleFinderCatalogFacetOption[] {
  return Array.from(counts.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((left, right) => left.value.localeCompare(right.value))
}

function emptySparkleFinderCatalogFacets(): SparkleFinderCatalogFacets {
  return {
    collections: [],
    materials: [],
    stones: [],
    types: [],
    labels: [],
    years: [],
  }
}

async function countEligibleAvailableListings(
  supabase: SupabaseClient,
  designIds: string[],
) {
  const counts = new Map<string, number>()
  if (designIds.length === 0) return counts

  const eligibleRepIds = await loadPublicFinderEligibleRepIds(supabase)
  if (eligibleRepIds.length === 0) return counts
  const qualifiedRepIds = await loadRepIdsWithFinderShows(supabase, eligibleRepIds)
  if (qualifiedRepIds.size === 0) return counts

  const { data, error } = await supabase
    .from('trade_listings')
    .select(
      'design_id, rep_id, rep:reps(id, display_name, business_name, profile_photo_url, custom_domain, public_site_slug, status)',
    )
    .eq('status', 'available')
    .eq('listing_source', 'catalog')
    .in('design_id', designIds)
    .in('rep_id', Array.from(qualifiedRepIds))
  if (error) throw error

  return countListingsByDesignForQualifiedReps(
    (data ?? []) as Array<{ design_id: string | null; rep_id: string }>,
    qualifiedRepIds,
  )
}

export function countListingsByDesignForQualifiedReps(
  rows: Array<{ design_id: string | null; rep_id: string; rep?: FinderRepRow }>,
  qualifiedRepIds: Set<string>,
) {
  const counts = new Map<string, number>()
  for (const row of rows) {
    if (!qualifiedRepIds.has(row.rep_id)) continue
    if (!row.design_id) continue
    if (row.rep !== undefined) {
      const rep = readSingle(row.rep)
      if (
        !rep ||
        !isFinderPublicRepStatus(rep.status) ||
        !hasFinderResolvablePublicSite(rep)
      ) {
        continue
      }
    }
    counts.set(row.design_id, (counts.get(row.design_id) ?? 0) + 1)
  }
  return counts
}

export async function loadPublicFinderEligibleRepIds(supabase: SupabaseClient) {
  const paidRepIds = new Set<string>()
  const { data: subscriptions, error: subscriptionErr } = await supabase
    .from('subscriptions')
    .select('rep_id')
    .in('status', [...PAID_WORKSPACE_STATUSES])
  if (subscriptionErr) throw subscriptionErr

  for (const row of (subscriptions ?? []) as Array<{ rep_id: string | null }>) {
    if (row.rep_id) paidRepIds.add(row.rep_id)
  }

  try {
    const { data: trials, error: trialErr } = await supabase
      .from('workspace_trials')
      .select('rep_id')
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
    if (trialErr) throw trialErr

    for (const row of (trials ?? []) as Array<{ rep_id: string | null }>) {
      if (row.rep_id) paidRepIds.add(row.rep_id)
    }
  } catch {
    // Older/local databases may not have workspace trials yet. Paid
    // subscriptions remain sufficient for the public Finder boundary.
  }

  return Array.from(paidRepIds)
}

async function loadNextShowsByRepId(supabase: SupabaseClient, repIds: string[]) {
  const shows = new Map<string, SparkleFinderPublicShow>()
  if (repIds.length === 0) return shows

  const now = new Date().toISOString()
  const liveResult = await supabase
    .from('calendar_events')
    .select('id, rep_id, event_time, title, status, duration_minutes')
    .in('rep_id', repIds)
    .eq('status', 'live')
    .order('event_time', { ascending: true })
  if (liveResult.error) throw liveResult.error

  const { data, error } = await supabase
    .from('calendar_events')
    .select('id, rep_id, event_time, title, status, duration_minutes')
    .in('rep_id', repIds)
    .eq('status', 'scheduled')
    .gte('event_time', now)
    .order('event_time', { ascending: true })
  if (error) throw error

  return mapFinderShowRowsToNextShows([
    ...((liveResult.data ?? []) as FinderShowRow[]),
    ...((data ?? []) as FinderShowRow[]),
  ])
}

async function loadFinderLiveShowRows(
  supabase: SupabaseClient,
  eligibleRepIds: string[],
  limit: number,
) {
  const now = new Date().toISOString()
  const liveResult = await supabase
    .from('calendar_events')
    .select(FINDER_LIVE_SHOW_SELECT)
    .in('rep_id', eligibleRepIds)
    .eq('status', 'live')
    .order('event_time', { ascending: true })
    .limit(limit)
  if (liveResult.error) throw liveResult.error

  const scheduledResult = await supabase
    .from('calendar_events')
    .select(FINDER_LIVE_SHOW_SELECT)
    .in('rep_id', eligibleRepIds)
    .eq('status', 'scheduled')
    .gte('event_time', now)
    .order('event_time', { ascending: true })
    .limit(limit)
  if (scheduledResult.error) throw scheduledResult.error

  return [
    ...((liveResult.data ?? []) as unknown as FinderLiveShowRow[]),
    ...((scheduledResult.data ?? []) as unknown as FinderLiveShowRow[]),
  ]
}

async function loadRepIdsWithFinderShows(
  supabase: SupabaseClient,
  eligibleRepIds: string[],
) {
  const shows = await loadNextShowsByRepId(supabase, eligibleRepIds)
  return new Set(shows.keys())
}

function mapFinderShowRow(row: FinderShowRow): SparkleFinderPublicShow {
  return {
    showId: row.id,
    repId: row.rep_id,
    startsAt: row.event_time,
    title: row.title,
    status: row.status === 'live' ? 'live' : 'scheduled',
  }
}

export function mapFinderShowRowsToNextShows(
  rows: FinderLeadShowRow[],
  nowIso = new Date().toISOString(),
) {
  const shows = new Map<string, SparkleFinderPublicShow>()
  const sortedRows = rows
    .filter((row) => isFinderLeadShowRow(row, nowIso))
    .sort((left, right) => {
      if (left.status === 'live' && right.status !== 'live') return -1
      if (right.status === 'live' && left.status !== 'live') return 1
      return left.event_time.localeCompare(right.event_time)
    })

  for (const row of sortedRows) {
    if (shows.has(row.rep_id)) continue
    shows.set(row.rep_id, mapFinderShowRow(row))
  }

  return shows
}

function isFinderLeadShowRow(row: FinderShowRow, nowIso: string) {
  const startsAtMs = Date.parse(row.event_time)
  const nowMs = Date.parse(nowIso)
  if (!Number.isFinite(startsAtMs) || !Number.isFinite(nowMs)) return false

  if (row.status === 'live') {
    const durationMinutes = normalizeFinderDurationMinutes(
      row.duration_minutes ?? null,
    ) ?? 60
    return startsAtMs <= nowMs && startsAtMs + durationMinutes * 60_000 > nowMs
  }

  return row.status === 'scheduled' && startsAtMs >= nowMs
}

export function mapSparkleFinderLiveShowRows(
  rows: FinderLiveShowRow[],
  nowIso = new Date().toISOString(),
): SparkleFinderLiveShow[] {
  return rows
    .filter((row) => isFinderLeadShowRow(row, nowIso))
    .filter((row) => {
      const rep = readSingle(row.rep)
      return Boolean(
        rep?.id &&
          isFinderPublicRepStatus(rep.status) &&
          hasFinderResolvablePublicSite(rep),
      )
    })
    .sort((left, right) => {
      if (left.status === 'live' && right.status !== 'live') return -1
      if (right.status === 'live' && left.status !== 'live') return 1
      return left.event_time.localeCompare(right.event_time)
    })
    .map((row) => {
      const rep = readSingle(row.rep)
      if (!rep?.id) {
        throw new Error('Finder live show is missing a public rep relation.')
      }

      return {
        showId: row.id,
        showName: getFinderShowName(rep),
        repFirstName: getFinderRepFirstName(rep.display_name),
        startsAt: row.event_time,
        status: row.status === 'live' ? 'live' : 'scheduled',
        customerSiteUrl: buildFinderCustomerSiteUrl(rep),
      }
    })
}

export function mapSparkleFinderDirectoryRows(
  rows: FinderDirectoryRpcRow[],
  nowIso = new Date().toISOString(),
): SparkleFinderDirectoryRep[] {
  const reps = new Map<string, SparkleFinderDirectoryRep>()

  for (const row of rows) {
    const repId = row.rep_id?.trim()
    const displayName = row.display_name?.trim()
    if (!repId || !displayName || reps.has(repId)) continue

    const slug = getFinderValidatedPublicSiteSlug(row.public_site_slug)
    const customerSiteUrl = slug ? buildPublicSiteUrl(slug) : null

    reps.set(repId, {
      repId,
      displayName,
      businessName: row.business_name?.trim() || null,
      avatarUrl: normalizeFinderPublicHttpsUrl(row.avatar_url),
      state: null,
      customerSiteUrl,
      repBoardUrl: customerSiteUrl ? `${customerSiteUrl}/trade` : null,
      nextShow: mapSparkleFinderDirectoryShow(row, nowIso),
    })
  }

  return Array.from(reps.values()).sort((left, right) => {
    const leftRank = left.nextShow?.status === 'live' ? 0 : left.nextShow ? 1 : 2
    const rightRank = right.nextShow?.status === 'live' ? 0 : right.nextShow ? 1 : 2
    if (leftRank !== rightRank) return leftRank - rightRank

    const leftTime = left.nextShow?.startsAt ?? ''
    const rightTime = right.nextShow?.startsAt ?? ''
    if (leftTime !== rightTime) {
      if (!leftTime) return 1
      if (!rightTime) return -1
      return leftTime.localeCompare(rightTime)
    }

    const nameOrder = left.displayName.localeCompare(right.displayName, 'en', {
      sensitivity: 'base',
    })
    return nameOrder || left.repId.localeCompare(right.repId)
  })
}

function mapSparkleFinderDirectoryShow(
  row: FinderDirectoryRpcRow,
  nowIso: string,
): SparkleFinderDirectoryShow | null {
  const showId = row.next_show_id?.trim()
  const showName = row.next_show_name?.trim()
  const startsAt = row.next_show_starts_at?.trim()
  const status =
    row.next_show_status === 'live' || row.next_show_status === 'scheduled'
      ? row.next_show_status
      : null
  if (!showId || !showName || !startsAt || !status) return null

  const startsAtMs = Date.parse(startsAt)
  const nowMs = Date.parse(nowIso)
  if (!Number.isFinite(startsAtMs) || !Number.isFinite(nowMs)) return null

  const durationMinutes = normalizeFinderDurationMinutes(
    row.next_show_duration_minutes,
  )
  if (status === 'scheduled' && startsAtMs < nowMs) return null
  if (status === 'live') {
    const effectiveDurationMinutes = durationMinutes ?? 60
    const endsAtMs = startsAtMs + effectiveDurationMinutes * 60_000
    if (startsAtMs > nowMs || endsAtMs <= nowMs) return null
  }

  return {
    showId,
    showName,
    startsAt: new Date(startsAtMs).toISOString(),
    status,
    customerSiteUrl: null,
    durationMinutes,
  }
}

function normalizeFinderDurationMinutes(value: number | null) {
  if (!Number.isFinite(value) || value === null || value <= 0) return null
  return Math.floor(value)
}

function normalizeFinderPublicHttpsUrl(value: string | null) {
  const raw = value?.trim()
  if (!raw) return null

  try {
    const url = new URL(raw)
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.port
    ) {
      return null
    }
    return url.toString()
  } catch {
    return null
  }
}

export function filterListingsWithNextShows<T extends { rep_id: string }>(
  rows: T[],
  nextShows: Map<string, SparkleFinderPublicShow>,
) {
  return rows.filter((row) => nextShows.has(row.rep_id))
}

function emptySparkleFinderAvailabilityResult(
  requestedItem: SparkleFinderCatalogItem | null,
): SparkleFinderAvailabilityResult {
  const emptyPageInfo: FinderAvailabilityPageInfo = {
    totalLeadCount: 0,
    totalDancerCount: 0,
    hasMore: false,
    nextCursor: null,
  }
  return {
    schemaVersion: 2,
    requestedItem,
    exactMatches: [],
    similarMatches: [],
    exactPageInfo: { ...emptyPageInfo },
    similarPageInfo: { ...emptyPageInfo },
  }
}

export function mapFinderAvailabilityRpcRows(
  rows: FinderAvailabilityRpcRow[],
  nextShows: Map<string, SparkleFinderPublicShow>,
) {
  return rows.flatMap((row) => {
    if (!row.listing_id) return []
    const quantityAvailable = Number(row.net_quantity)
    if (!Number.isInteger(quantityAvailable) || quantityAvailable < 1) return []
    if (
      !row.rep_id ||
      !row.design_id ||
      !row.item_number ||
      !row.design_name ||
      !row.type_prefix
    ) {
      return []
    }
    const nextShow = nextShows.get(row.rep_id)
    if (!nextShow) return []

    const listing: FinderListingRow = {
      id: row.listing_id,
      rep_id: row.rep_id,
      design_id: row.design_id,
      listing_photo_url: row.listing_photo_url,
      uses_canonical_photo: row.uses_canonical_photo,
      listed_at: row.listed_at,
      status: 'available',
      quantity_available: quantityAvailable,
      design: {
        id: row.design_id,
        item_number: row.item_number,
        design_name: row.design_name,
        material: row.material,
        main_stone: row.main_stone,
        bp_msrp: row.bp_msrp,
        canonical_photo_url: row.canonical_photo_url,
        type_prefix: row.type_prefix,
        search_tags: row.search_tags,
        rarity_classification: row.rarity_classification,
        collection: row.collection_name
          ? {
              name: row.collection_name,
              collection_year: row.collection_year,
            }
          : null,
      },
      rep: {
        id: row.rep_id,
        display_name: row.rep_display_name,
        business_name: row.rep_business_name,
        profile_photo_url: null,
        custom_domain: null,
        public_site_slug: row.rep_public_site_slug,
        status: row.rep_status,
      },
    }
    if (!isFinderPublicRepStatus(row.rep_status)) return []
    const rep = readSingle(listing.rep)
    if (!rep || !hasFinderResolvablePublicSite(rep)) return []

    return [
      mapSparkleFinderAvailabilityListingRow(
        listing,
        nextShow,
        quantityAvailable,
      ),
    ]
  })
}

export function parseFinderAvailabilityRpcRows(
  value: unknown,
  context: {
    requestedItem: SparkleFinderCatalogItem
    eligibleRepIds: Set<string>
    exactAfter?: { listedAt: string | null; listingId: string } | null
    similarAfter?: { listedAt: string | null; listingId: string } | null
  },
): FinderAvailabilityRpcRow[] {
  if (!Array.isArray(value) || value.length < 2) {
    throw new Error('Finder availability RPC returned an invalid result.')
  }
  const rows = value as FinderAvailabilityRpcRow[]
  const listingIds = new Set<string>()
  const bucketTotals = new Map<string, { leads: number; dancers: number }>()
  const bucketRows = new Map<'exact' | 'similar', FinderAvailabilityRpcRow[]>([
    ['exact', []],
    ['similar', []],
  ])

  for (const rawRow of rows) {
    if (!rawRow || typeof rawRow !== 'object') {
      throw new Error('Finder availability RPC returned an invalid row.')
    }
    const row = rawRow as FinderAvailabilityRpcRow
    if (row.bucket !== 'exact' && row.bucket !== 'similar') {
      throw new Error('Finder availability RPC returned an invalid bucket.')
    }
    const leads = Number(row.total_lead_count)
    const dancers = Number(row.total_dancer_count)
    if (
      !Number.isSafeInteger(leads) ||
      leads < 0 ||
      !Number.isSafeInteger(dancers) ||
      dancers < 0
    ) {
      throw new Error('Finder availability RPC returned invalid totals.')
    }
    const priorTotals = bucketTotals.get(row.bucket)
    if (priorTotals && (priorTotals.leads !== leads || priorTotals.dancers !== dancers)) {
      throw new Error('Finder availability RPC returned inconsistent totals.')
    }
    bucketTotals.set(row.bucket, { leads, dancers })
    bucketRows.get(row.bucket)!.push(row)

    if (row.listing_id === null) continue
    if (
      typeof row.listing_id !== 'string' ||
      !row.listing_id.trim() ||
      listingIds.has(row.listing_id) ||
      typeof row.rep_id !== 'string' ||
      !context.eligibleRepIds.has(row.rep_id) ||
      typeof row.design_id !== 'string' ||
      !row.design_id.trim() ||
      !Number.isSafeInteger(Number(row.net_quantity)) ||
      Number(row.net_quantity) < 1 ||
      (row.listed_at !== null &&
        (typeof row.listed_at !== 'string' || !Number.isFinite(Date.parse(row.listed_at)))) ||
      typeof row.item_number !== 'string' ||
      !row.item_number.trim() ||
      typeof row.design_name !== 'string' ||
      !row.design_name.trim() ||
      (row.collection_name !== null && typeof row.collection_name !== 'string') ||
      typeof row.type_prefix !== 'string' ||
      !Object.hasOwn(TYPE_MAP, row.type_prefix) ||
      typeof row.rep_public_site_slug !== 'string' ||
      !getFinderValidatedPublicSiteSlug(row.rep_public_site_slug) ||
      typeof row.rep_status !== 'string' ||
      !isFinderPublicRepStatus(row.rep_status)
    ) {
      throw new Error('Finder availability RPC returned an invalid listing row.')
    }
    if (row.bucket === 'exact' && row.design_id !== context.requestedItem.designId) {
      throw new Error('Finder availability RPC returned a mismatched exact design.')
    }
    if (
      row.bucket === 'similar' &&
      (row.design_id === context.requestedItem.designId ||
        TYPE_MAP[row.type_prefix as JewelryType] !== context.requestedItem.jewelryType ||
        (row.collection_name?.trim() || null) !== context.requestedItem.collectionName)
    ) {
      throw new Error('Finder availability RPC returned a mismatched similar design.')
    }
    listingIds.add(row.listing_id)
  }

  for (const bucket of ['exact', 'similar'] as const) {
    const candidates = bucketRows.get(bucket)!
    if (candidates.length === 0 || !bucketTotals.has(bucket)) {
      throw new Error('Finder availability RPC omitted a required bucket.')
    }
    const realRows = candidates.filter((row) => row.listing_id !== null)
    const placeholders = candidates.length - realRows.length
    if ((realRows.length > 0 && placeholders > 0) || placeholders > 1) {
      throw new Error('Finder availability RPC returned an invalid bucket placeholder.')
    }
    const totals = bucketTotals.get(bucket)!
    const currentDancers = realRows.reduce(
      (sum, row) => sum + Number(row.net_quantity),
      0,
    )
    if (totals.leads < realRows.length || totals.dancers < currentDancers) {
      throw new Error('Finder availability RPC totals are smaller than its page.')
    }
    assertFinderAvailabilityOrder(
      realRows,
      bucket === 'exact' ? context.exactAfter : context.similarAfter,
    )
  }

  return rows
}

function assertFinderAvailabilityOrder(
  rows: FinderAvailabilityRpcRow[],
  after?: { listedAt: string | null; listingId: string } | null,
) {
  let previous = after
    ? { listedAt: after.listedAt, listingId: after.listingId }
    : null
  for (const row of rows) {
    const current = { listedAt: row.listed_at, listingId: row.listing_id! }
    if (previous && !isFinderAvailabilityPositionAfter(current, previous)) {
      throw new Error('Finder availability RPC ordering is invalid or repeated.')
    }
    previous = current
  }
}

function isFinderAvailabilityPositionAfter(
  current: { listedAt: string | null; listingId: string },
  previous: { listedAt: string | null; listingId: string },
) {
  if (previous.listedAt === null) {
    return current.listedAt === null && current.listingId < previous.listingId
  }
  if (current.listedAt === null) return true
  const currentTime = Date.parse(current.listedAt)
  const previousTime = Date.parse(previous.listedAt)
  return currentTime < previousTime ||
    (currentTime === previousTime && current.listingId < previous.listingId)
}

function readFinderAvailabilityTotals(rows: FinderAvailabilityRpcRow[]) {
  const source = rows[0]
  if (!source) return { totalLeadCount: 0, totalDancerCount: 0 }
  const totalLeadCount = Number(source.total_lead_count)
  const totalDancerCount = Number(source.total_dancer_count)
  if (
    !Number.isSafeInteger(totalLeadCount) ||
    totalLeadCount < 0 ||
    !Number.isSafeInteger(totalDancerCount) ||
    totalDancerCount < 0
  ) {
    throw new Error('Finder availability RPC returned invalid totals.')
  }
  return { totalLeadCount, totalDancerCount }
}

export function mapSparkleFinderAvailabilityListingRow(
  row: FinderListingRow,
  nextShow: SparkleFinderPublicShow,
  quantityAvailable = row.quantity_available ?? 1,
): SparkleFinderAvailabilityMatch {
  const design = readSingle(row.design)
  const rep = readSingle(row.rep)
  if (!design || !rep?.id) {
    throw new Error('Finder availability listing is missing required relations.')
  }
  // A match is one listing opportunity, while its dancer count is the exact
  // pending-adjusted quantity that can still be reserved from that listing.
  const item = mapSparkleFinderDesignRow(design, 0, 1, quantityAvailable)
  const canonicalPhotoUrl =
    row.uses_canonical_photo !== false ? item.canonicalPhotoUrl : null
  const photoUrl = row.listing_photo_url || canonicalPhotoUrl

  return {
    listingId: row.id,
    quantityAvailable,
    listedAt: row.listed_at,
    photoUrl,
    photoSource: row.listing_photo_url
      ? 'listing'
      : canonicalPhotoUrl
        ? 'canonical'
        : 'missing',
    item,
    rep: {
      repId: rep.id,
      showName: getFinderShowName(rep),
      repFirstName: getFinderRepFirstName(rep.display_name),
      customerSiteUrl: buildFinderCustomerSiteUrl(rep),
    },
    nextShow,
  }
}

function getFinderShowName(rep: FinderRepSingle) {
  return (
    rep.business_name?.trim() ||
    rep.display_name?.trim() ||
    'Sparkle Suite Rep'
  )
}

function getFinderRepFirstName(displayName: string | null) {
  const first = displayName?.trim().split(/\s+/)[0]?.trim()
  return first || 'Sparkle Suite Rep'
}

function buildFinderCustomerSiteUrl(rep: FinderRepSingle) {
  const slug = getFinderResolvablePublicSiteSlug(rep)
  if (!slug) {
    throw new Error('Finder public rep is missing a resolvable public site slug.')
  }
  return buildPublicSiteUrl(slug)
}

function isFinderPublicRepStatus(status: string | null) {
  return status !== 'suspended' && status !== 'churned'
}

function hasFinderResolvablePublicSite(rep: FinderRepSingle) {
  return Boolean(getFinderResolvablePublicSiteSlug(rep))
}

function getFinderResolvablePublicSiteSlug(rep: FinderRepSingle) {
  return getFinderValidatedPublicSiteSlug(rep.public_site_slug)
}

function getFinderValidatedPublicSiteSlug(value: string | null) {
  const slug = value?.trim().toLowerCase() ?? ''
  return validatePublicSiteSlug(slug).ok ? slug : null
}

function readSingle<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value
}

function isFinderSupabaseConfigured(supabase?: SupabaseClient) {
  return Boolean(
    supabase ||
      (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
  )
}
