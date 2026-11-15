import type { SupabaseClient } from '@supabase/supabase-js'
import type { GetMyBoardFilters, TradeListingWithDesign } from './types'
import { getMyBoard } from './trade-board'
import { getTradeListingDisplayFields } from './trade-listing-display'
import { getBoardInventoryResults, getBoardInventoryOptions, type BoardInventoryFilters } from '@/lib/nic-nac/board-inventory-view'

export function daysOnDanceFloor(listedAt: string | null, timeZone = 'America/New_York', now = new Date()) {
  if (!listedAt || !Number.isFinite(Date.parse(listedAt))) return 0
  let format: Intl.DateTimeFormat
  try { format = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }) }
  catch { format = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }) }
  const day = (date: Date) => {
    const parts = Object.fromEntries(format.formatToParts(date).map(part => [part.type, part.value]))
    return Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day))
  }
  return Math.max(0, Math.round((day(now) - day(new Date(listedAt))) / 86400000))
}
export type DanceFloorFilters = GetMyBoardFilters & {
  search?: string; needsPhoto?: boolean; sitting?: boolean; browse?: Partial<BoardInventoryFilters>
}
export async function getRepDanceFloorBoard(supabase: SupabaseClient, repId: string, timeZone: string | null | undefined, filters: DanceFloorFilters) {
  const board = await getMyBoard(supabase, repId, { ...filters, typeFilter: undefined, collectionFilter: undefined, limit: undefined, offset: undefined })
  const filterOptions = getBoardInventoryOptions(board.listings.map(row => ({ ...row, status: 'available' as const })))
  filterOptions.collections = [...new Set(board.listings.map(row => getTradeListingDisplayFields(row).collectionName).filter((name): name is string => Boolean(name)))].sort()
  let rows = board.listings
  if (filters.typeFilter) rows = rows.filter(row => getTradeListingDisplayFields(row).typePrefix === filters.typeFilter)
  if (filters.collectionFilter) rows = rows.filter(row => getTradeListingDisplayFields(row).collectionName === filters.collectionFilter)
  if (filters.needsPhoto) rows = rows.filter(row => !getTradeListingDisplayFields(row).photoUrl)
  if (filters.sitting) rows = rows.filter(row => row.status === 'available' && row.listed_at && Date.parse(row.listed_at) < Date.now() - 30 * 86400000)
  if (filters.search || filters.browse) {
    const originals = new Map(rows.map(row => [row.id, row]))
    const matched = getBoardInventoryResults(rows.map(row => ({ ...row, status: 'available' as const })), {
      search: filters.search ?? '', jewelryType: '', collection: '', ...filters.browse,
    }).map(row => originals.get(row.id)!)
    const included = new Set(matched.map(row => row.id))
    rows = filters.browse?.sortMode ? matched : rows.filter(row => included.has(row.id))
  }
  const total = rows.length
  const offset = filters.offset ?? 0
  rows = rows.slice(offset, filters.limit ? offset + filters.limit : undefined)
  const counts = new Map<string, { total: number; pending: number }>()
  if (rows.length) {
    // One explicit-column, rep-scoped query for the page, never one per dancer.
    const { data, error } = await supabase.from('trade_requests')
      .select('listing_id, status, listing:trade_listings!inner(rep_id)')
      .eq('listing.rep_id', repId).in('listing_id', rows.map(row => row.id)).neq('status', 'cancelled')
    if (error) throw error
    for (const request of data ?? []) {
      const count = counts.get(request.listing_id) ?? { total: 0, pending: 0 }
      count.total++; if (request.status === 'pending') count.pending++
      counts.set(request.listing_id, count)
    }
  }
  const listings: TradeListingWithDesign[] = rows.map(row => ({
    ...row, daysOnFloor: daysOnDanceFloor(row.listed_at, timeZone ?? undefined),
    requestCount: counts.get(row.id)?.total ?? 0, pendingRequestCount: counts.get(row.id)?.pending ?? 0,
  }))
  return { ...board, listings, total, filterOptions, hasMore: offset + listings.length < total }
}
