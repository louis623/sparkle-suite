import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getDanceFloorAttention, getMyBoard } from '@/lib/services/trade-board'
import { getTradeListingDisplayFields } from '@/lib/services/trade-listing-display'
import type { TradeListingWithDesign } from '@/lib/services/types'

const state = vi.hoisted(() => ({ client: null as any }))
vi.mock('@/lib/nic-nac/auth', () => ({ getPaidNicNacContext: async () => ({ repId: 'rep', rep: {}, supabase: state.client }), AuthError: class extends Error {} }))
vi.mock('@/lib/services/trade-board-stats', () => ({ getDanceFloorDancerCounts: async () => null }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => state.client }))
vi.mock('@/lib/services/listing-photo-processing', () => ({ processRepCustomListingPhotoUrl: vi.fn() }))
vi.mock('@/lib/nic-nac/workflows/workflow-photo-selection', () => ({ catalogVariantPhotoAssetKey: vi.fn() }))
vi.mock('@/lib/amethyst/preview-rep', () => ({ resolveAmethystPreviewRep: async () => ({ id: 'rep' }) }))
import { GET } from '@/app/api/nic-nac/trade-board/route'
import { loadAmethystTradeBoardPreviewListings, mapTradeListingToAmethystTradeBoardListing } from '@/lib/amethyst/trade-board-listings'

const rows = Array.from({ length: 25 }, (_, n) => ({
  id: String(n + 1), rep_id: 'rep', status: 'available', listing_source: 'non_item_number',
  manual_type_prefix: 'RG', manual_collection_family: 'Birthday', manual_photo_url: n === 24 ? null : '/photo.jpg',
  listing_photo_url: null, uses_canonical_photo: false, quantity_available: 1,
  created_at: '2026-11-14T12:00:00Z', listed_at: '2026-11-14T12:00:00Z',
  // An unused catalog image must not mask the missing manual photo.
  design: { id: 'd', canonical_photo_url: '/unused.jpg', type_prefix: 'RG', collection: { name: 'Birthday' } },
})) as unknown as TradeListingWithDesign[]
function fixture() {
  const calls: Array<{ table: string; equal: Array<[string, unknown]>; range?: number[]; select?: string }> = []
  const client = {
    from(table: string) {
      const call = { table, equal: [] as Array<[string, unknown]> } as typeof calls[number]
      calls.push(call)
      let ids: string[] | null = null
      let inColumn = 'id'
      const query: any = {
        select(columns: string) { call.select = columns; return query },
        eq(k: string, v: unknown) { call.equal.push([k, v]); return query },
        in(k: string, v: string[]) { inColumn=k; ids = v; return query },
        order() { return query },
        range(a: number, b: number) { call.range = [a, b]; return query },
        then(resolve: (result: unknown) => void) {
          let data = table === 'trade_listings' ? rows.filter(row => call.equal.every(([k, v]) => row[k as keyof typeof row] === v)) : []
          if (ids) data = data.filter(row => ids!.includes(row[inColumn as keyof typeof row] as string))
          if (call.range) data = data.slice(call.range[0], call.range[1] + 1)
          return Promise.resolve({ data, error: null, count: 0 }).then(resolve)
        },
      }
      return query
    },
    rpc: vi.fn(async () => ({ data: rows.map(row => ({ listing_id: row.id, net_quantity: 1 })), error: null })),
  }
  return { client: client as any, calls }
}
beforeEach(() => { vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://fixture.invalid'); vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'fixture-only') })
describe('rep-only whole-board attention', () => {
  it('route keeps whole-board sitting attention without a photo counter', async () => {
    const f = fixture(); state.client = f.client
    const response = await GET(new Request('https://fixture.invalid/api/nic-nac/trade-board?limit=24&status=available&type=NK&collection=Other'))
    expect(response.status).toBe(200)
    const result = await response.json()
    expect(result.listings).toEqual([])
    expect(result.attention).toEqual({ sitting: 0 })
    const aggregate = f.calls.find(call => call.range)
    expect(aggregate?.equal).toEqual([['rep_id', 'rep']])
    expect(getTradeListingDisplayFields(rows[24]).photoUrl).toBeNull()
  })
  it('keeps single-status/default getMyBoard queries and fields unchanged', async () => {
    const f = fixture()
    const board = await getMyBoard(f.client, 'rep', { statusFilter: 'available', limit: 24 })
    expect(board.listings).toHaveLength(24)
    expect(Object.keys(board).sort()).toEqual(['listings', 'summary'])
    expect(f.calls).toHaveLength(2)
    expect(f.calls[0].equal).toContainEqual(['status', 'available'])
    expect(f.calls.some(call => call.range)).toBe(false)
    const second = fixture()
    expect((await getMyBoard(second.client, 'rep', { statusFilter: 'pending_trade' })).listings).toEqual([])
    expect(second.calls[0].equal).toContainEqual(['status', 'pending_trade'])
  })
  it('public loader returns the same full fixture with no attention query or field', async () => {
    const f = fixture(); state.client = f.client
    const result = await loadAmethystTradeBoardPreviewListings({ repId: 'rep', targeted: true })
    expect(result).toEqual(rows.map(row => ({ ...mapTradeListingToAmethystTradeBoardListing(row), quantityAvailable: 1 })))
    expect(result).toHaveLength(25)
    expect(f.calls.map(call => call.table)).toEqual(['trade_listings', 'trade_requests'])
    expect(f.calls.some(call => call.range)).toBe(false)
    expect(result.some(row => 'attention' in row || 'daysOnFloor' in row || 'requestCount' in row)).toBe(false)
  })
})
