import { buildNonItemNumberTradeListingName } from '@/lib/services/trade-listing-display'
import type { JewelryType } from '@/lib/services/types'

export const DANCE_FLOOR_TYPE_LABELS: Record<string, string> = {
  ER: 'Earrings',
  NK: 'Necklaces',
  RG: 'Rings',
  BR: 'Bracelets',
  ST: 'Sets',
}

const JEWELRY_TYPES = new Set<JewelryType>(['RG', 'NK', 'ER', 'ST', 'BR'])
const DAY_MS = 24 * 60 * 60 * 1000

export type DanceFloorAgeBand = 'fresh' | 'aging' | 'slow' | 'unknown'

export type DanceFloorOutcomeKey = 'on_floor' | 'sold' | 'traded' | 'keeping' | 'other'

export type DanceFloorPointKind = 'listed' | 'swapped' | 'removed'

export type DanceFloorInsightInput = {
  id: string
  name: string
  itemNumber: string | null
  typePrefix: string | null
  collectionName: string | null
  price: number | null
  status: string | null
  removalReason: string | null
  listedAt: string | null
  createdAt: string | null
  updatedAt: string | null
  deletedAt: string | null
  requestCount: number
}

export type DanceFloorSittingRow = {
  id: string
  name: string
  itemNumber: string | null
  typeLabel: string
  priceLabel: string | null
  days: number | null
  barPercent: number
  ageBand: DanceFloorAgeBand
  requestCount: number
  collectionName: string
}

export type DanceFloorInsights = {
  empty: boolean
  pieceCount: number
  onFloor: number
  /** Completed dancer swaps (listing status 'traded'). */
  swapped: number
  sitting45: number
  sitting: DanceFloorSittingRow[]
  mix: {
    total: number
    types: Array<{ label: string; count: number }>
    collections: Array<{ name: string; onFloor: number; moved: number }>
  }
  movers: {
    swapCount: number
    earlyData: boolean
    medians: Array<{ label: string; days: number; count: number }>
    fastest: Array<{ name: string; typeLabel: string; collectionName: string; days: number }>
    slowest: Array<{ name: string; typeLabel: string; collectionName: string; days: number }>
  }
  strips: Array<{
    label: string
    count: number
    median: number | null
    axisMax: number
    points: Array<{ days: number; kind: DanceFloorPointKind }>
  }>
  outcomes: {
    total: number
    needsCleanup: boolean
    slices: Array<{ key: DanceFloorOutcomeKey; label: string; count: number; color: string }>
  }
}

type ClassifiedListing = DanceFloorInsightInput & {
  typeLabel: string
  collectionName: string
  outcome: DanceFloorOutcomeKey
  onFloor: boolean
  days: number | null
}

const OUTCOME_META: Record<DanceFloorOutcomeKey, { label: string; color: string }> = {
  on_floor: { label: 'Still on floor', color: '#7345ca' },
  // 'sold' is a legacy removal_reason value. Dance Floor pieces leave by swap only, so it is never labeled as a sale.
  sold: { label: 'Left the floor', color: '#e2198f' },
  traded: { label: 'Swapped', color: '#171034' },
  keeping: { label: 'Keeping', color: '#2f9e6b' },
  other: { label: 'Removed · "other"', color: '#c9b8ea' },
}

function clean(value: string | null | undefined) {
  const trimmed = value?.replace(/\s+/g, ' ').trim() ?? ''
  return trimmed || null
}

export function normalizeCollectionName(name: string | null | undefined) {
  const trimmed = clean(name)
  if (!trimmed) return 'Unsorted'
  const key = trimmed.toLowerCase()
  if (
    key === 'og' ||
    key === 'original' ||
    key === 'originals' ||
    key === 'original (og)' ||
    key === 'og original' ||
    key === 'og originals'
  ) {
    return 'Original (OG)'
  }
  if (key === 'exclusive bringback' || key.endsWith(' exclusive bringback')) {
    return 'Exclusive Bringback'
  }
  return trimmed
}

export function danceFloorTypeLabel(typePrefix: string | null | undefined) {
  const key = typePrefix?.trim().toUpperCase() ?? ''
  return DANCE_FLOOR_TYPE_LABELS[key] ?? 'Other'
}

function parseTime(value: string | null | undefined) {
  if (!value) return null
  const time = Date.parse(value)
  return Number.isFinite(time) ? time : null
}

function isJewelryType(value: string | null | undefined): value is JewelryType {
  return JEWELRY_TYPES.has(value as JewelryType)
}

export function classifyDanceFloorOutcome(listing: {
  status: string | null
  removalReason: string | null
}): DanceFloorOutcomeKey | 'mistake' {
  const reason = listing.removalReason?.trim().toLowerCase() ?? ''
  const status = listing.status?.trim().toLowerCase() ?? ''
  if (reason === 'mistake') return 'mistake'
  if (reason === 'sold') return 'sold'
  if (status === 'traded') return 'traded'
  if (reason === 'keeping') return 'keeping'
  if (status === 'available' || status === 'pending_trade') return 'on_floor'
  return 'other'
}

export function daysOnDanceFloor(
  listing: Pick<DanceFloorInsightInput, 'status' | 'listedAt' | 'createdAt' | 'updatedAt' | 'deletedAt'>,
  now: Date,
) {
  const start = parseTime(listing.listedAt) ?? parseTime(listing.createdAt)
  if (start == null) return null
  const stillListed = listing.status === 'available' || listing.status === 'pending_trade'
  if (stillListed) {
    const days = (now.getTime() - start) / DAY_MS
    return days >= 0 ? days : null
  }
  const exit = parseTime(listing.deletedAt) ?? parseTime(listing.updatedAt)
  if (exit == null || exit <= start) return null
  return (exit - start) / DAY_MS
}

function median(values: number[]) {
  if (values.length === 0) return null
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 1) return sorted[middle]
  return (sorted[middle - 1] + sorted[middle]) / 2
}

export function ageBandForDays(days: number | null): DanceFloorAgeBand {
  if (days == null) return 'unknown'
  if (days < 30) return 'fresh'
  if (days < 60) return 'aging'
  return 'slow'
}

function priceLabel(price: number | null) {
  if (price == null || !Number.isFinite(price)) return null
  const rounded = Math.round(price)
  return `$${rounded.toLocaleString('en-US')}`
}

function roundDays(days: number) {
  return Math.round(days)
}

function toClassified(listing: DanceFloorInsightInput, now: Date): ClassifiedListing | null {
  const outcome = classifyDanceFloorOutcome(listing)
  if (outcome === 'mistake') return null
  return {
    ...listing,
    name: clean(listing.name) ?? 'Untitled piece',
    typeLabel: danceFloorTypeLabel(listing.typePrefix),
    collectionName: normalizeCollectionName(listing.collectionName),
    outcome,
    onFloor: outcome === 'on_floor',
    days: daysOnDanceFloor(listing, now),
    requestCount: Number.isFinite(listing.requestCount) ? Math.max(0, listing.requestCount) : 0,
  }
}

function moverRow(listing: ClassifiedListing) {
  return {
    name: listing.name,
    typeLabel: listing.typeLabel,
    collectionName: listing.collectionName,
    days: roundDays(listing.days ?? 0),
  }
}

export function emptyDanceFloorInsights(): DanceFloorInsights {
  return {
    empty: true,
    pieceCount: 0,
    onFloor: 0,
    swapped: 0,
    sitting45: 0,
    sitting: [],
    mix: { total: 0, types: [], collections: [] },
    movers: { swapCount: 0, earlyData: true, medians: [], fastest: [], slowest: [] },
    strips: [],
    outcomes: { total: 0, needsCleanup: false, slices: [] },
  }
}

export function buildDanceFloorInsights(
  listings: DanceFloorInsightInput[],
  now: Date = new Date(),
): DanceFloorInsights {
  const rows = listings.flatMap((listing) => {
    const classified = toClassified(listing, now)
    return classified ? [classified] : []
  })
  if (rows.length === 0) return emptyDanceFloorInsights()

  const onFloorRows = rows.filter((row) => row.onFloor)
  // Movers and medians measure days to swap: completed swaps only (internal status 'traded').
  const swappedRows = rows.filter((row) => row.outcome === 'traded')
  const sittingKnown = onFloorRows
    .filter((row) => row.days != null)
    .sort((left, right) => (right.days ?? 0) - (left.days ?? 0) || left.name.localeCompare(right.name))
  const sitting45 = sittingKnown.filter((row) => (row.days ?? 0) >= 45).length

  const typeCounts = new Map<string, number>()
  const collectionCounts = new Map<string, { onFloor: number; moved: number }>()
  for (const row of rows) {
    typeCounts.set(row.typeLabel, (typeCounts.get(row.typeLabel) ?? 0) + 1)
    const current = collectionCounts.get(row.collectionName) ?? { onFloor: 0, moved: 0 }
    if (row.onFloor) current.onFloor += 1
    else current.moved += 1
    collectionCounts.set(row.collectionName, current)
  }

  const types = [...typeCounts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label))

  const knownDays = rows.flatMap((row) => (row.days == null ? [] : [row.days]))
  const axisMax = Math.max(60, Math.ceil(Math.max(0, ...knownDays) / 15) * 15)

  const strips = types.map((type) => {
    const pieces = rows.filter((row) => row.typeLabel === type.label && row.days != null)
    return {
      label: type.label,
      count: type.count,
      median: median(pieces.map((piece) => piece.days ?? 0)),
      axisMax,
      points: pieces
        .map((piece) => ({
          days: piece.days ?? 0,
          kind: (piece.onFloor ? 'listed' : piece.outcome === 'traded' ? 'swapped' : 'removed') as DanceFloorPointKind,
        }))
        .sort((left, right) => left.days - right.days),
    }
  })

  const outcomeOrder: DanceFloorOutcomeKey[] = ['on_floor', 'traded', 'keeping', 'sold', 'other']
  const slices = outcomeOrder.flatMap((key) => {
    const count = rows.filter((row) => row.outcome === key).length
    if (count === 0) return []
    return [{ key, count, ...OUTCOME_META[key] }]
  })

  const swappedWithDays = swappedRows
    .filter((row) => row.days != null)
    .sort((left, right) => (left.days ?? 0) - (right.days ?? 0) || left.name.localeCompare(right.name))

  const medians = types.flatMap((type) => {
    const sample = swappedWithDays.filter((row) => row.typeLabel === type.label).map((row) => row.days ?? 0)
    const value = median(sample)
    if (value == null) return []
    return [{ label: type.label, days: roundDays(value), count: sample.length }]
  })

  return {
    empty: false,
    pieceCount: rows.length,
    onFloor: onFloorRows.length,
    swapped: swappedRows.length,
    sitting45,
    sitting: sittingKnown.slice(0, 7).map((row) => ({
      id: row.id,
      name: row.name,
      itemNumber: row.itemNumber,
      typeLabel: row.typeLabel,
      priceLabel: priceLabel(row.price),
      days: row.days == null ? null : roundDays(row.days),
      barPercent: Math.max(6, Math.min(100, ((row.days ?? 0) / 60) * 100)),
      ageBand: ageBandForDays(row.days),
      requestCount: row.requestCount,
      collectionName: row.collectionName,
    })),
    mix: {
      total: rows.length,
      types,
      collections: [...collectionCounts.entries()]
        .map(([name, counts]) => ({ name, ...counts }))
        .sort(
          (left, right) =>
            right.onFloor + right.moved - (left.onFloor + left.moved) || left.name.localeCompare(right.name),
        )
        .slice(0, 6),
    },
    movers: {
      swapCount: swappedRows.length,
      earlyData: swappedRows.length < 15,
      medians,
      fastest: swappedWithDays.slice(0, 5).map(moverRow),
      slowest: sittingKnown.slice(0, 5).map(moverRow),
    },
    strips,
    outcomes: {
      total: rows.length,
      needsCleanup: slices.some((slice) => slice.key === 'other'),
      slices,
    },
  }
}

type DesignRelation = {
  item_number?: string | null
  design_name?: string | null
  bp_msrp?: number | string | null
  type_prefix?: string | null
  collection?: { name?: string | null } | Array<{ name?: string | null }> | null
} | null

export type DanceFloorInsightRow = {
  id: string
  status?: string | null
  removal_reason?: string | null
  listed_at?: string | null
  created_at?: string | null
  updated_at?: string | null
  deleted_at?: string | null
  listing_source?: string | null
  manual_type_prefix?: string | null
  manual_collection_family?: string | null
  manual_collection_name?: string | null
  manual_size?: string | null
  ring_size?: string | null
  design?: DesignRelation | DesignRelation[]
}

function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function priceNumber(value: number | string | null | undefined) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value !== 'string' || !value.trim()) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function toDanceFloorInsightInput(
  row: DanceFloorInsightRow,
  requestCount = 0,
): DanceFloorInsightInput {
  const design = one(row.design)
  const collection = one(design?.collection)
  const typePrefix = clean(row.manual_type_prefix) ?? clean(design?.type_prefix)
  const collectionName =
    clean(collection?.name) ?? clean(row.manual_collection_name) ?? clean(row.manual_collection_family)
  const catalogName = clean(design?.design_name)
  const manualName =
    isJewelryType(typePrefix)
      ? buildNonItemNumberTradeListingName({
          jewelryType: typePrefix,
          collectionFamily: clean(row.manual_collection_family) ?? collectionName ?? 'Jewelry',
          collectionName,
          size: clean(row.manual_size) ?? clean(row.ring_size),
        })
      : null

  return {
    id: row.id,
    name: catalogName ?? manualName ?? 'Untitled piece',
    itemNumber: clean(design?.item_number),
    typePrefix,
    collectionName,
    price: priceNumber(design?.bp_msrp),
    status: row.status ?? null,
    removalReason: row.removal_reason ?? null,
    listedAt: row.listed_at ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
    deletedAt: row.deleted_at ?? null,
    requestCount,
  }
}
