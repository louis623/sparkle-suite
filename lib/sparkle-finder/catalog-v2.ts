import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  countListingsByDesignForQualifiedReps,
  loadPublicFinderEligibleRepIds,
  mapFinderShowRowsToNextShows,
  type FinderCatalogLabel,
  type FinderJewelryType,
  type FinderLeadShowRow,
  type SparkleFinderCatalogFacetOption,
  type SparkleFinderCatalogFacets,
  type SparkleFinderCatalogItem,
} from '@/lib/sparkle-finder/public-api'

export const FINDER_CATALOG_SCHEMA_VERSION = 2 as const
export const DEFAULT_FINDER_CATALOG_V2_LIMIT = 24
export const MAX_FINDER_CATALOG_V2_LIMIT = 50
export const MAX_FINDER_CATALOG_CURSOR_LENGTH = 2_048
export const MAX_FINDER_CATALOG_BATCH_BODY_BYTES = 8_192
export const MAX_FINDER_CATALOG_BATCH_IDS = 50

const FINDER_CATALOG_CURSOR_VERSION = 2 as const
const FINDER_CATALOG_SORT_VERSION = 'created_at_desc_nulls_last_id_desc_v1'
const FINDER_CATALOG_CURSOR_TTL_MS = 86_400_000
const MAX_QUERY_LENGTH = 120
const MAX_FILTER_LENGTH = 80
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const FINDER_CATALOG_TYPE_PREFIX: Record<FinderJewelryType, string> = {
  ring: 'RG',
  necklace: 'NK',
  earrings: 'ER',
  stack: 'ST',
  bracelet: 'BR',
}

const FINDER_JEWELRY_TYPE: Record<string, FinderJewelryType> = {
  RG: 'ring',
  NK: 'necklace',
  ER: 'earrings',
  ST: 'stack',
  BR: 'bracelet',
}

const finderJewelryTypes = new Set<FinderJewelryType>([
  'ring',
  'necklace',
  'earrings',
  'stack',
  'bracelet',
])
const finderCatalogLabels = new Set<FinderCatalogLabel>([
  'diamond',
  'unicorn',
  'standard',
])

export interface FinderCatalogFilters {
  query?: string
  jewelryType?: FinderJewelryType
  collection?: string
  material?: string
  mainStone?: string
  label?: FinderCatalogLabel
  collectionYear?: number
}

export interface FinderCatalogPosition {
  createdAt: string | null
  designId: string
}

export interface FinderCatalogPageInfo {
  totalCount: number
  hasMore: boolean
  nextCursor: string | null
}

export interface FinderCatalogItemV2 extends SparkleFinderCatalogItem {
  description: string | null
}

export interface FinderCatalogPageResponseV2 {
  schemaVersion: typeof FINDER_CATALOG_SCHEMA_VERSION
  items: FinderCatalogItemV2[]
  pageInfo: FinderCatalogPageInfo
}

export interface FinderCatalogBatchResponseV2 {
  schemaVersion: typeof FINDER_CATALOG_SCHEMA_VERSION
  items: FinderCatalogItemV2[]
  missingDesignIds: string[]
}

export interface FinderCatalogFacetsResponseV2 {
  schemaVersion: typeof FINDER_CATALOG_SCHEMA_VERSION
  facets: SparkleFinderCatalogFacets
}

export class CatalogV2RequestError extends Error {
  readonly status = 400

  constructor(message: string) {
    super(message)
    this.name = 'CatalogV2RequestError'
  }
}

export class CatalogV2ConfigurationError extends Error {
  readonly status = 503

  constructor(message: string) {
    super(message)
    this.name = 'CatalogV2ConfigurationError'
  }
}

interface CursorPayload {
  v: typeof FINDER_CATALOG_CURSOR_VERSION
  sort: typeof FINDER_CATALOG_SORT_VERSION
  filters: string
  issuedAt: number
  expiresAt: number
  position: FinderCatalogPosition
}

interface FinderCatalogRpcRow {
  id: string
  item_number: string
  design_name: string
  collection_name: string | null
  collection_year: number | null
  type_prefix: string
  material: string | null
  main_stone: string | null
  bp_msrp: number | string | null
  canonical_photo_url: string | null
  catalog_label: FinderCatalogLabel | null
  search_tags: string[] | null
  created_at: string | null
}

interface FinderCatalogPageRpcResult {
  items: FinderCatalogRpcRow[]
  totalCount: number
  hasMore: boolean
  nextPosition: FinderCatalogPosition | null
}

interface FinderCatalogBatchRpcResult {
  items: FinderCatalogRpcRow[]
}

type LegacyAvailabilityCounter = (
  supabase: SupabaseClient,
  designIds: string[],
) => Promise<Map<string, number>>

export function normalizeFinderCatalogFilters(
  filters: FinderCatalogFilters,
): FinderCatalogFilters {
  return compactObject({
    query: normalizeBoundedText(filters.query, 'query', MAX_QUERY_LENGTH),
    jewelryType: filters.jewelryType,
    collection: normalizeBoundedText(filters.collection, 'collection', MAX_FILTER_LENGTH),
    material: normalizeBoundedText(filters.material, 'material', MAX_FILTER_LENGTH),
    mainStone: normalizeBoundedText(filters.mainStone, 'stone', MAX_FILTER_LENGTH),
    label: filters.label,
    collectionYear: filters.collectionYear,
  })
}

export function parseFinderCatalogRequest(
  url: URL,
  options: { cursorSecret?: string; nowMs?: number } = {},
) {
  assertBoundedUrlParameter(url, 'query', MAX_QUERY_LENGTH)
  assertBoundedUrlParameter(url, 'collection', MAX_FILTER_LENGTH)
  assertBoundedUrlParameter(url, 'material', MAX_FILTER_LENGTH)
  assertBoundedUrlParameter(url, 'stone', MAX_FILTER_LENGTH)
  assertBoundedUrlParameter(url, 'type', 20)
  assertBoundedUrlParameter(url, 'label', 20)
  assertBoundedUrlParameter(url, 'limit', 10)
  const collectionYear = parseCollectionYear(url.searchParams.get('year'))
  const limit = parseLimit(url.searchParams.get('limit'))
  const filters = normalizeFinderCatalogFilters({
    query: parseOptionalText(url.searchParams.get('query')),
    jewelryType: parseJewelryType(url.searchParams.get('type')),
    collection: parseOptionalText(url.searchParams.get('collection')),
    material: parseOptionalText(url.searchParams.get('material')),
    mainStone: parseOptionalText(url.searchParams.get('stone')),
    label: parseCatalogLabel(url.searchParams.get('label')),
    collectionYear,
  })
  const rawCursor = url.searchParams.get('cursor')?.trim() || null
  if (rawCursor && rawCursor.length > MAX_FINDER_CATALOG_CURSOR_LENGTH) {
    throw new CatalogV2RequestError('cursor is too long.')
  }
  const position = rawCursor
    ? decodeFinderCatalogCursor(
        rawCursor,
        filters,
        requireCursorSecret(options.cursorSecret),
        options.nowMs,
      )
    : null

  return { filters, limit, position }
}

export function encodeFinderCatalogCursor(
  position: FinderCatalogPosition,
  filters: FinderCatalogFilters,
  secret: string,
  nowMs = Date.now(),
) {
  assertPosition(position)
  if (!secret) throw new CatalogV2ConfigurationError('Catalog cursor signing is unavailable.')
  const payload: CursorPayload = {
    v: FINDER_CATALOG_CURSOR_VERSION,
    sort: FINDER_CATALOG_SORT_VERSION,
    filters: fingerprintFilters(filters),
    issuedAt: nowMs,
    expiresAt: nowMs + FINDER_CATALOG_CURSOR_TTL_MS,
    position,
  }
  const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
  const signature = signCursorPayload(encodedPayload, secret)
  return `${encodedPayload}.${signature}`
}

export function decodeFinderCatalogCursor(
  cursor: string,
  filters: FinderCatalogFilters,
  secret: string,
  nowMs = Date.now(),
): FinderCatalogPosition {
  if (!secret) throw new CatalogV2ConfigurationError('Catalog cursor signing is unavailable.')
  if (!cursor || cursor.length > MAX_FINDER_CATALOG_CURSOR_LENGTH) {
    throw new CatalogV2RequestError('Catalog cursor is invalid.')
  }
  const [encodedPayload, suppliedSignature, extra] = cursor.split('.')
  if (!encodedPayload || !suppliedSignature || extra) {
    throw new CatalogV2RequestError('Catalog cursor is invalid.')
  }

  const expectedSignature = signCursorPayload(encodedPayload, secret)
  const supplied = Buffer.from(suppliedSignature, 'utf8')
  const expected = Buffer.from(expectedSignature, 'utf8')
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    throw new CatalogV2RequestError('Catalog cursor is invalid.')
  }

  let payload: unknown
  try {
    payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'))
  } catch {
    throw new CatalogV2RequestError('Catalog cursor is invalid.')
  }
  if (!isCursorPayload(payload)) {
    throw new CatalogV2RequestError('Catalog cursor is invalid.')
  }
  if (payload.expiresAt < nowMs) {
    throw new CatalogV2RequestError('Catalog cursor has expired.')
  }
  if (payload.filters !== fingerprintFilters(filters)) {
    throw new CatalogV2RequestError('Catalog cursor does not match these filters.')
  }
  return payload.position
}

export async function listSparkleFinderCatalogPageV2(options: {
  filters: FinderCatalogFilters
  limit: number
  position: FinderCatalogPosition | null
  cursorSecret?: string
  supabase?: SupabaseClient
  countLegacyAvailableListings?: LegacyAvailabilityCounter
}): Promise<FinderCatalogPageResponseV2> {
  if (!isCatalogConfigured(options.supabase)) {
    throw new CatalogV2ConfigurationError('Catalog storage is unavailable.')
  }
  const supabase = options.supabase ?? createAdminClient()
  const filters = normalizeFinderCatalogFilters(options.filters)
  const limit = Math.min(Math.max(options.limit, 1), MAX_FINDER_CATALOG_V2_LIMIT)
  const { data, error } = await supabase.rpc('list_sparkle_finder_catalog_v2', {
    p_query: filters.query ?? null,
    p_type_prefix: filters.jewelryType
      ? FINDER_CATALOG_TYPE_PREFIX[filters.jewelryType]
      : null,
    p_collection: filters.collection ?? null,
    p_material: filters.material ?? null,
    p_main_stone: filters.mainStone ?? null,
    p_label: filters.label ?? null,
    p_collection_year: filters.collectionYear ?? null,
    p_limit: limit,
    p_cursor_created_at: options.position?.createdAt ?? null,
    p_cursor_design_id: options.position?.designId ?? null,
    p_cursor_created_at_is_null: options.position ? options.position.createdAt === null : false,
  })
  if (error) throw error
  const result = parsePageRpcResult(data, limit)
  const rows = result.items
  assertDistinctDesignIds(rows.map((row) => row.id))
  const counts = await (options.countLegacyAvailableListings ?? countLegacyAvailableListings)(
    supabase,
    rows.map((row) => row.id),
  )
  const hasMore = result.hasMore
  if (hasMore && options.position && positionsEqual(options.position, result.nextPosition)) {
    throw new Error('Sparkle Finder catalog returned a repeated cursor position.')
  }
  const nextCursor = hasMore
    ? encodeFinderCatalogCursor(
        requireNextPosition(result.nextPosition),
        filters,
        requireCursorSecret(options.cursorSecret),
      )
    : null

  return {
    schemaVersion: FINDER_CATALOG_SCHEMA_VERSION,
    items: rows.map((row) => mapCatalogRpcRow(row, counts.get(row.id) ?? 0)),
    pageInfo: {
      totalCount: result.totalCount,
      hasMore,
      nextCursor,
    },
  }
}

export async function listSparkleFinderCatalogFacetsV2(options: {
  filters: FinderCatalogFilters
  supabase?: SupabaseClient
}): Promise<FinderCatalogFacetsResponseV2> {
  if (!isCatalogConfigured(options.supabase)) {
    throw new CatalogV2ConfigurationError('Catalog storage is unavailable.')
  }
  const supabase = options.supabase ?? createAdminClient()
  const filters = normalizeFinderCatalogFilters(options.filters)
  const { data, error } = await supabase.rpc('list_sparkle_finder_catalog_facets_v2', {
    p_query: filters.query ?? null,
    p_type_prefix: filters.jewelryType
      ? FINDER_CATALOG_TYPE_PREFIX[filters.jewelryType]
      : null,
    p_collection: filters.collection ?? null,
    p_material: filters.material ?? null,
    p_main_stone: filters.mainStone ?? null,
    p_label: filters.label ?? null,
    p_collection_year: filters.collectionYear ?? null,
  })
  if (error) throw error
  return {
    schemaVersion: FINDER_CATALOG_SCHEMA_VERSION,
    facets: parseFacetsRpcResult(data),
  }
}

export function parseFinderCatalogBatchBody(value: unknown): string[] {
  if (!isRecord(value) || !Array.isArray(value.designIds)) {
    throw new CatalogV2RequestError('designIds must be an array of design IDs.')
  }
  const deduplicated: string[] = []
  const seen = new Set<string>()
  for (const valueId of value.designIds) {
    if (typeof valueId !== 'string') {
      throw new CatalogV2RequestError('designIds must contain only valid UUID design IDs.')
    }
    const designId = valueId.trim().toLowerCase()
    if (!UUID_PATTERN.test(designId)) {
      throw new CatalogV2RequestError('designIds must contain only valid UUID design IDs.')
    }
    if (seen.has(designId)) continue
    seen.add(designId)
    deduplicated.push(designId)
    if (deduplicated.length > MAX_FINDER_CATALOG_BATCH_IDS) {
      throw new CatalogV2RequestError('designIds may contain at most 50 distinct IDs.')
    }
  }
  return deduplicated
}

export async function listSparkleFinderCatalogBatchV2(options: {
  designIds: string[]
  supabase?: SupabaseClient
  countLegacyAvailableListings?: LegacyAvailabilityCounter
}): Promise<FinderCatalogBatchResponseV2> {
  if (options.designIds.length === 0) {
    return {
      schemaVersion: FINDER_CATALOG_SCHEMA_VERSION,
      items: [],
      missingDesignIds: [],
    }
  }
  if (!isCatalogConfigured(options.supabase)) {
    throw new CatalogV2ConfigurationError('Catalog storage is unavailable.')
  }
  const supabase = options.supabase ?? createAdminClient()
  const { data, error } = await supabase.rpc('get_sparkle_finder_catalog_batch_v2', {
    p_design_ids: options.designIds,
  })
  if (error) throw error
  const result = parseBatchRpcResult(data)
  assertDistinctDesignIds(result.items.map((row) => row.id))
  const rowById = new Map(result.items.map((row) => [row.id.toLowerCase(), row]))
  const orderedRows = options.designIds.flatMap((designId) => {
    const row = rowById.get(designId.toLowerCase())
    return row ? [row] : []
  })
  const counts = await (options.countLegacyAvailableListings ?? countLegacyAvailableListings)(
    supabase,
    orderedRows.map((row) => row.id),
  )

  return {
    schemaVersion: FINDER_CATALOG_SCHEMA_VERSION,
    items: orderedRows.map((row) => mapCatalogRpcRow(row, counts.get(row.id) ?? 0)),
    missingDesignIds: options.designIds.filter(
      (designId) => !rowById.has(designId.toLowerCase()),
    ),
  }
}

async function countLegacyAvailableListings(
  supabase: SupabaseClient,
  designIds: string[],
) {
  const counts = new Map<string, number>()
  if (designIds.length === 0) return counts
  const eligibleRepIds = await loadPublicFinderEligibleRepIds(supabase)
  if (eligibleRepIds.length === 0) return counts
  const now = new Date().toISOString()
  const [liveResult, scheduledResult] = await Promise.all([
    supabase
      .from('calendar_events')
      .select('id, rep_id, event_time, title, status, duration_minutes')
      .in('rep_id', eligibleRepIds)
      .eq('status', 'live')
      .order('event_time', { ascending: true }),
    supabase
      .from('calendar_events')
      .select('id, rep_id, event_time, title, status, duration_minutes')
      .in('rep_id', eligibleRepIds)
      .eq('status', 'scheduled')
      .gte('event_time', now)
      .order('event_time', { ascending: true }),
  ])
  if (liveResult.error) throw liveResult.error
  if (scheduledResult.error) throw scheduledResult.error
  const nextShows = mapFinderShowRowsToNextShows([
    ...((liveResult.data ?? []) as FinderLeadShowRow[]),
    ...((scheduledResult.data ?? []) as FinderLeadShowRow[]),
  ])
  const qualifiedRepIds = new Set(nextShows.keys())
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
    (data ?? []) as never,
    qualifiedRepIds,
  )
}

function mapCatalogRpcRow(
  row: FinderCatalogRpcRow,
  availableListingCount: number,
): FinderCatalogItemV2 {
  const jewelryType = FINDER_JEWELRY_TYPE[row.type_prefix]
  if (!jewelryType) throw new Error('Sparkle Finder catalog returned an unknown jewelry type.')
  return {
    designId: row.id,
    itemNumber: row.item_number,
    designName: row.design_name,
    collectionName: cleanNullableText(row.collection_name),
    collectionYear: integerOrNull(row.collection_year),
    jewelryType,
    material: cleanNullableText(row.material),
    mainStone: cleanNullableText(row.main_stone),
    bpMsrp: finiteNumberOrNull(row.bp_msrp),
    canonicalPhotoUrl: cleanNullableText(row.canonical_photo_url),
    rarityClassification: normalizeFinderCatalogLabel(row.catalog_label),
    description: null,
    searchTags: Array.isArray(row.search_tags)
      ? row.search_tags.filter((tag): tag is string => typeof tag === 'string')
      : [],
    availableListingCount: nonnegativeInteger(availableListingCount),
    // The catalog contract has no pending-reservation context. Keep the new
    // quantity-aware fields neutral here; the availability v2 response
    // replaces them with its authoritative, pending-adjusted exact totals.
    availableLeadCount: 0,
    availableDancerCount: 0,
  }
}

function normalizeFinderCatalogLabel(value: unknown): FinderCatalogLabel {
  return value === 'diamond' || value === 'unicorn' ? value : 'standard'
}

function parsePageRpcResult(data: unknown, requestedLimit: number): FinderCatalogPageRpcResult {
  if (!isRecord(data) || !Array.isArray(data.items)) {
    throw new Error('Sparkle Finder catalog page query returned an invalid result.')
  }
  const totalCount = nonnegativeIntegerOrNull(data.totalCount)
  if (totalCount === null || typeof data.hasMore !== 'boolean') {
    throw new Error('Sparkle Finder catalog page metadata is invalid.')
  }
  const items = data.items.map(parseRpcRow)
  const nextPosition = data.nextPosition === null || data.nextPosition === undefined
    ? null
    : parsePosition(data.nextPosition)
  if (totalCount < items.length) {
    throw new Error('Sparkle Finder catalog total is smaller than the returned page.')
  }
  if (items.length > requestedLimit) {
    throw new Error('Sparkle Finder catalog returned more items than requested.')
  }
  if (data.hasMore) {
    if (items.length === 0 || !nextPosition) {
      throw new Error('Sparkle Finder catalog page metadata is inconsistent.')
    }
    const lastItem = items.at(-1)
    if (
      !lastItem ||
      lastItem.id.toLowerCase() !== nextPosition.designId.toLowerCase() ||
      lastItem.created_at !== nextPosition.createdAt ||
      totalCount <= items.length
    ) {
      throw new Error('Sparkle Finder catalog next position is inconsistent.')
    }
  } else if (nextPosition !== null) {
    throw new Error('Sparkle Finder catalog returned an unused next position.')
  }
  return { items, totalCount, hasMore: data.hasMore, nextPosition }
}

function parseBatchRpcResult(data: unknown): FinderCatalogBatchRpcResult {
  if (!isRecord(data) || !Array.isArray(data.items)) {
    throw new Error('Sparkle Finder catalog batch query returned an invalid result.')
  }
  return { items: data.items.map(parseRpcRow) }
}

function parseFacetsRpcResult(data: unknown): SparkleFinderCatalogFacets {
  if (!isRecord(data)) throw new Error('Sparkle Finder catalog facets query returned an invalid result.')
  return {
    collections: parseFacetOptions(data.collections),
    materials: parseFacetOptions(data.materials),
    stones: parseFacetOptions(data.stones),
    types: parseFacetOptions(data.types),
    labels: parseFacetOptions(data.labels),
    years: parseFacetOptions(data.years),
  }
}

function parseFacetOptions(value: unknown): SparkleFinderCatalogFacetOption[] {
  if (!Array.isArray(value)) throw new Error('Sparkle Finder catalog facet values are invalid.')
  return value.map((option) => {
    if (!isRecord(option) || typeof option.value !== 'string') {
      throw new Error('Sparkle Finder catalog facet option is invalid.')
    }
    const count = nonnegativeIntegerOrNull(option.count)
    if (count === null) throw new Error('Sparkle Finder catalog facet count is invalid.')
    return { value: option.value, count }
  })
}

function parseRpcRow(value: unknown): FinderCatalogRpcRow {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    !UUID_PATTERN.test(value.id) ||
    typeof value.item_number !== 'string' ||
    typeof value.design_name !== 'string' ||
    typeof value.type_prefix !== 'string'
  ) {
    throw new Error('Sparkle Finder catalog item is invalid.')
  }
  return value as unknown as FinderCatalogRpcRow
}

function parsePosition(value: unknown): FinderCatalogPosition {
  if (
    !isRecord(value) ||
    (value.createdAt !== null && typeof value.createdAt !== 'string') ||
    typeof value.designId !== 'string'
  ) {
    throw new Error('Sparkle Finder catalog next position is invalid.')
  }
  const position = { createdAt: value.createdAt, designId: value.designId }
  assertPosition(position)
  return position
}

function requireNextPosition(position: FinderCatalogPosition | null) {
  if (!position) throw new Error('Sparkle Finder catalog omitted its next page position.')
  return position
}

function assertDistinctDesignIds(designIds: string[]) {
  if (new Set(designIds.map((designId) => designId.toLowerCase())).size !== designIds.length) {
    throw new Error('Sparkle Finder catalog returned duplicate design IDs.')
  }
}

function assertPosition(position: FinderCatalogPosition) {
  if (!UUID_PATTERN.test(position.designId)) {
    throw new CatalogV2RequestError('Catalog cursor design ID is invalid.')
  }
  if (position.createdAt !== null && !Number.isFinite(Date.parse(position.createdAt))) {
    throw new CatalogV2RequestError('Catalog cursor timestamp is invalid.')
  }
}

function isCursorPayload(value: unknown): value is CursorPayload {
  if (
    !isRecord(value) ||
    value.v !== FINDER_CATALOG_CURSOR_VERSION ||
    value.sort !== FINDER_CATALOG_SORT_VERSION ||
    typeof value.filters !== 'string' ||
    typeof value.issuedAt !== 'number' ||
    typeof value.expiresAt !== 'number'
  ) {
    return false
  }
  try {
    parsePosition(value.position)
    return true
  } catch {
    return false
  }
}

function fingerprintFilters(filters: FinderCatalogFilters) {
  const normalized = normalizeFinderCatalogFilters(filters)
  return createHash('sha256')
    .update(
      JSON.stringify({
        query: normalized.query?.toLowerCase() ?? null,
        jewelryType: normalized.jewelryType ?? null,
        collection: normalized.collection?.toLowerCase() ?? null,
        material: normalized.material?.toLowerCase() ?? null,
        mainStone: normalized.mainStone?.toLowerCase() ?? null,
        label: normalized.label ?? null,
        collectionYear: normalized.collectionYear ?? null,
      }),
    )
    .digest('base64url')
}

function signCursorPayload(payload: string, secret: string) {
  return createHmac('sha256', secret).update(payload).digest('base64url')
}

function requireCursorSecret(explicit?: string) {
  const secret = explicit?.trim() || process.env.SPARKLE_FINDER_CURSOR_SECRET?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!secret) throw new CatalogV2ConfigurationError('Catalog cursor signing is unavailable.')
  return secret
}

function parseLimit(rawValue: string | null) {
  if (!rawValue) return DEFAULT_FINDER_CATALOG_V2_LIMIT
  const value = rawValue.trim()
  if (!/^\d+$/.test(value)) {
    throw new CatalogV2RequestError('limit must be a positive whole number.')
  }
  const parsed = Number.parseInt(value, 10)
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new CatalogV2RequestError('limit must be a positive whole number.')
  }
  return Math.min(parsed, MAX_FINDER_CATALOG_V2_LIMIT)
}

function parseCollectionYear(rawValue: string | null) {
  const value = parseOptionalText(rawValue)
  if (!value) return undefined
  if (!/^\d{4}$/.test(value)) {
    throw new CatalogV2RequestError('year must be a four-digit collection year.')
  }
  const year = Number.parseInt(value, 10)
  if (year < 2020 || year > 2040) {
    throw new CatalogV2RequestError('year must be a four-digit collection year.')
  }
  return year
}

function parseJewelryType(rawValue: string | null): FinderJewelryType | undefined {
  const value = parseOptionalText(rawValue)
  if (!value) return undefined
  if (!finderJewelryTypes.has(value as FinderJewelryType)) {
    throw new CatalogV2RequestError('type must be a supported jewelry type or all.')
  }
  return value as FinderJewelryType
}

function parseCatalogLabel(rawValue: string | null): FinderCatalogLabel | undefined {
  const value = parseOptionalText(rawValue)
  if (!value) return undefined
  if (!finderCatalogLabels.has(value as FinderCatalogLabel)) {
    throw new CatalogV2RequestError('label must be diamond, unicorn, standard, or all.')
  }
  return value as FinderCatalogLabel
}

function parseOptionalText(rawValue: string | null) {
  const value = rawValue?.trim()
  return value && value !== 'all' ? value : undefined
}

function normalizeBoundedText(
  value: string | null | undefined,
  field: string,
  maxLength: number,
) {
  if (value && value.length > maxLength) {
    throw new CatalogV2RequestError(`${field} is too long.`)
  }
  const normalized = value?.trim()
  if (!normalized) return undefined
  if (normalized.length > maxLength) {
    throw new CatalogV2RequestError(`${field} is too long.`)
  }
  return normalized
}

function assertBoundedUrlParameter(url: URL, key: string, maxLength: number) {
  const value = url.searchParams.get(key)
  if (value !== null && value.length > maxLength) {
    throw new CatalogV2RequestError(`${key} is too long.`)
  }
}

function positionsEqual(
  left: FinderCatalogPosition,
  right: FinderCatalogPosition | null,
) {
  return Boolean(
    right &&
      left.designId.toLowerCase() === right.designId.toLowerCase() &&
      left.createdAt === right.createdAt,
  )
}

function compactObject<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as T
}

function cleanNullableText(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function finiteNumberOrNull(value: unknown) {
  if (value === null || value === undefined || value === '') return null
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function integerOrNull(value: unknown) {
  return Number.isInteger(value) ? (value as number) : null
}

function nonnegativeInteger(value: unknown) {
  return Number.isInteger(value) && Number(value) >= 0 ? Number(value) : 0
}

function nonnegativeIntegerOrNull(value: unknown) {
  return Number.isInteger(value) && Number(value) >= 0 ? Number(value) : null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function isCatalogConfigured(supabase?: SupabaseClient) {
  return Boolean(
    supabase ||
      (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
  )
}
