import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  CatalogV2ConfigurationError,
  CatalogV2RequestError,
  decodeFinderCatalogCursor,
  encodeFinderCatalogCursor,
  listSparkleFinderCatalogBatchV2,
  listSparkleFinderCatalogFacetsV2,
  listSparkleFinderCatalogPageV2,
  normalizeFinderCatalogFilters,
  parseFinderCatalogBatchBody,
  parseFinderCatalogRequest,
} from '@/lib/sparkle-finder/catalog-v2'

const cursorSecret = 'catalog-test-secret-with-enough-entropy'

describe('Sparkle Finder catalog v2', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('normalizes bounded filters without changing an RBP item-number query', () => {
    expect(
      normalizeFinderCatalogFilters({
        query: '  RBP5902  ',
        jewelryType: 'necklace',
        collection: '  January 2026  ',
        material: '  Rhodium  ',
        mainStone: '  Rose Quartz  ',
        label: 'standard',
        collectionYear: 2026,
      }),
    ).toEqual({
      query: 'RBP5902',
      jewelryType: 'necklace',
      collection: 'January 2026',
      material: 'Rhodium',
      mainStone: 'Rose Quartz',
      label: 'standard',
      collectionYear: 2026,
    })
  })

  it('round-trips an integrity-protected cursor only for the same filters', () => {
    const filters = normalizeFinderCatalogFilters({ query: 'ruby', jewelryType: 'ring' })
    const cursor = encodeFinderCatalogCursor(
      {
        createdAt: '2026-08-25T12:00:00.000Z',
        designId: '00000000-0000-4000-8000-000000000002',
      },
      filters,
      cursorSecret,
      1_000,
    )

    expect(decodeFinderCatalogCursor(cursor, filters, cursorSecret, 2_000)).toEqual({
      createdAt: '2026-08-25T12:00:00.000Z',
      designId: '00000000-0000-4000-8000-000000000002',
    })
    expect(() =>
      decodeFinderCatalogCursor(
        cursor,
        normalizeFinderCatalogFilters({ query: 'rose quartz', jewelryType: 'ring' }),
        cursorSecret,
        2_000,
      ),
    ).toThrowError(CatalogV2RequestError)
  })

  it('rejects tampered and expired cursors', () => {
    const filters = normalizeFinderCatalogFilters({})
    const cursor = encodeFinderCatalogCursor(
      {
        createdAt: null,
        designId: '00000000-0000-4000-8000-000000000002',
      },
      filters,
      cursorSecret,
      1_000,
    )
    const replacement = cursor.endsWith('a') ? 'b' : 'a'

    expect(() =>
      decodeFinderCatalogCursor(`${cursor.slice(0, -1)}${replacement}`, filters, cursorSecret, 2_000),
    ).toThrowError(CatalogV2RequestError)
    expect(() =>
      decodeFinderCatalogCursor(cursor, filters, cursorSecret, 1_000 + 86_400_001),
    ).toThrowError(/expired/i)
  })

  it('parses bounded route inputs and rejects oversized filters and malformed cursors', () => {
    expect(
      parseFinderCatalogRequest(
        new URL(
          'https://suite.test/api/public/finder/catalog?query=RBP5902&type=necklace&limit=500',
        ),
        { cursorSecret },
      ),
    ).toMatchObject({
      filters: { query: 'RBP5902', jewelryType: 'necklace' },
      limit: 50,
      position: null,
    })

    expect(() =>
      parseFinderCatalogRequest(
        new URL(`https://suite.test/api/public/finder/catalog?query=${'x'.repeat(121)}`),
        { cursorSecret },
      ),
    ).toThrowError(/query/i)
    expect(() =>
      parseFinderCatalogRequest(
        new URL('https://suite.test/api/public/finder/catalog?cursor=not-a-cursor'),
        { cursorSecret },
      ),
    ).toThrowError(/cursor/i)
    expect(() =>
      parseFinderCatalogRequest(
        new URL('https://suite.test/api/public/finder/catalog?type=brooch'),
        { cursorSecret },
      ),
    ).toThrowError(/type/i)
    expect(() =>
      parseFinderCatalogRequest(
        new URL('https://suite.test/api/public/finder/catalog?label=featured'),
        { cursorSecret },
      ),
    ).toThrowError(/label/i)
  })

  it('fails closed when catalog storage is not configured', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '')
    const designId = '00000000-0000-4000-8000-000000000001'

    await expect(
      listSparkleFinderCatalogPageV2({
        filters: {},
        limit: 24,
        position: null,
        cursorSecret,
      }),
    ).rejects.toBeInstanceOf(CatalogV2ConfigurationError)
    await expect(
      listSparkleFinderCatalogFacetsV2({ filters: {} }),
    ).rejects.toBeInstanceOf(CatalogV2ConfigurationError)
    await expect(
      listSparkleFinderCatalogBatchV2({ designIds: [designId] }),
    ).rejects.toBeInstanceOf(CatalogV2ConfigurationError)
  })

  it('maps an exact page with authoritative totals and a next cursor', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        items: [
          {
            id: '00000000-0000-4000-8000-000000000001',
            item_number: 'ER13229',
            design_name: 'Rose Quartz Variant',
            collection_name: 'January 2026',
            collection_year: 2026,
            type_prefix: 'ER',
            material: 'Rhodium',
            main_stone: 'Rose Quartz',
            bp_msrp: 39.95,
            canonical_photo_url: 'https://cdn.example.test/rose.png',
            catalog_label: 'standard',
            search_tags: ['rose quartz'],
            created_at: '2026-08-25T12:00:00.000Z',
          },
        ],
        totalCount: 57,
        hasMore: true,
        nextPosition: {
          createdAt: '2026-08-25T12:00:00.000Z',
          designId: '00000000-0000-4000-8000-000000000001',
        },
      },
      error: null,
    })
    const countLegacyAvailableListings = vi.fn().mockResolvedValue(
      new Map([['00000000-0000-4000-8000-000000000001', 2]]),
    )

    const page = await listSparkleFinderCatalogPageV2({
      filters: normalizeFinderCatalogFilters({ query: 'ER13229' }),
      limit: 1,
      position: null,
      cursorSecret,
      supabase: { rpc } as never,
      countLegacyAvailableListings,
    })

    expect(page).toMatchObject({
      schemaVersion: 2,
      items: [
        {
          designId: '00000000-0000-4000-8000-000000000001',
          itemNumber: 'ER13229',
          designName: 'Rose Quartz Variant',
          mainStone: 'Rose Quartz',
          rarityClassification: 'standard',
          description: null,
          availableListingCount: 2,
          availableLeadCount: 0,
          availableDancerCount: 0,
        },
      ],
      pageInfo: { totalCount: 57, hasMore: true },
    })
    expect(page.pageInfo.nextCursor).toEqual(expect.any(String))
    expect(rpc).toHaveBeenCalledWith(
      'list_sparkle_finder_catalog_v2',
      expect.objectContaining({ p_limit: 1, p_query: 'ER13229' }),
    )
  })

  it('preserves same-number variants as distinct exact design IDs', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        items: [
          catalogRow('00000000-0000-4000-8000-000000000001', 'Rose Quartz'),
          catalogRow('00000000-0000-4000-8000-000000000002', 'Ruby'),
        ],
        totalCount: 2,
        hasMore: false,
        nextPosition: null,
      },
      error: null,
    })

    const page = await listSparkleFinderCatalogPageV2({
      filters: normalizeFinderCatalogFilters({ query: 'ER13229' }),
      limit: 24,
      position: null,
      cursorSecret,
      supabase: { rpc } as never,
      countLegacyAvailableListings: async () => new Map(),
    })

    expect(page.items.map((item) => [item.designId, item.itemNumber, item.mainStone])).toEqual([
      ['00000000-0000-4000-8000-000000000001', 'ER13229', 'Rose Quartz'],
      ['00000000-0000-4000-8000-000000000002', 'ER13229', 'Ruby'],
    ])
  })

  it('rejects inconsistent or over-limit RPC page metadata', async () => {
    const overLimitRpc = vi.fn().mockResolvedValue({
      data: {
        items: [
          catalogRow('00000000-0000-4000-8000-000000000001', 'Rose Quartz'),
          catalogRow('00000000-0000-4000-8000-000000000002', 'Ruby'),
        ],
        totalCount: 2,
        hasMore: false,
        nextPosition: null,
      },
      error: null,
    })
    await expect(
      listSparkleFinderCatalogPageV2({
        filters: {},
        limit: 1,
        position: null,
        cursorSecret,
        supabase: { rpc: overLimitRpc } as never,
        countLegacyAvailableListings: async () => new Map(),
      }),
    ).rejects.toThrow(/more items than requested/i)

    const inconsistentRpc = vi.fn().mockResolvedValue({
      data: {
        items: [catalogRow('00000000-0000-4000-8000-000000000001', 'Rose Quartz')],
        totalCount: 2,
        hasMore: true,
        nextPosition: {
          createdAt: '2026-08-25T12:00:00.000Z',
          designId: '00000000-0000-4000-8000-000000000002',
        },
      },
      error: null,
    })
    await expect(
      listSparkleFinderCatalogPageV2({
        filters: {},
        limit: 1,
        position: null,
        cursorSecret,
        supabase: { rpc: inconsistentRpc } as never,
        countLegacyAvailableListings: async () => new Map(),
      }),
    ).rejects.toThrow(/next position is inconsistent/i)
  })

  it('returns an unchanged legacy RBP item number with its stored necklace type', async () => {
    const row = {
      ...catalogRow('00000000-0000-4000-8000-000000000003', 'Cubic Zirconia'),
      item_number: 'RBP5902',
      type_prefix: 'NK',
    }
    const rpc = vi.fn().mockResolvedValue({
      data: {
        items: [row],
        totalCount: 1,
        hasMore: false,
        nextPosition: null,
      },
      error: null,
    })

    const page = await listSparkleFinderCatalogPageV2({
      filters: normalizeFinderCatalogFilters({ query: 'RBP5902' }),
      limit: 24,
      position: null,
      cursorSecret,
      supabase: { rpc } as never,
      countLegacyAvailableListings: async () => new Map(),
    })

    expect(page.items[0]).toMatchObject({
      itemNumber: 'RBP5902',
      jewelryType: 'necklace',
    })
  })

  it('bounds and deduplicates batch IDs while preserving first-request order', async () => {
    const idA = '00000000-0000-4000-8000-000000000001'
    const idB = '00000000-0000-4000-8000-000000000002'
    const parsed = parseFinderCatalogBatchBody({ designIds: [idB, idA, idB] })
    expect(parsed).toEqual([idB, idA])

    const rpc = vi.fn().mockResolvedValue({
      data: {
        items: [catalogRow(idA, 'Rose Quartz'), catalogRow(idB, 'Ruby')],
      },
      error: null,
    })
    const result = await listSparkleFinderCatalogBatchV2({
      designIds: parsed,
      supabase: { rpc } as never,
      countLegacyAvailableListings: async () => new Map(),
    })

    expect(result.items.map((item) => item.designId)).toEqual([idB, idA])
    expect(result.missingDesignIds).toEqual([])
    expect(result.schemaVersion).toBe(2)
  })

  it('reports missing batch IDs and rejects invalid or excessive bodies', async () => {
    const idA = '00000000-0000-4000-8000-000000000001'
    const missing = '00000000-0000-4000-8000-000000000099'
    const rpc = vi.fn().mockResolvedValue({
      data: { items: [catalogRow(idA, 'Rose Quartz')] },
      error: null,
    })
    const result = await listSparkleFinderCatalogBatchV2({
      designIds: [missing, idA],
      supabase: { rpc } as never,
      countLegacyAvailableListings: async () => new Map(),
    })

    expect(result.items.map((item) => item.designId)).toEqual([idA])
    expect(result.missingDesignIds).toEqual([missing])
    expect(() => parseFinderCatalogBatchBody({ designIds: ['not-a-uuid'] })).toThrowError(
      /designIds/i,
    )
    expect(() =>
      parseFinderCatalogBatchBody({
        designIds: Array.from(
          { length: 51 },
          (_, index) => `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
        ),
      }),
    ).toThrowError(/50/i)
  })
})

function catalogRow(id: string, stone: string) {
  return {
    id,
    item_number: 'ER13229',
    design_name: `${stone} Variant`,
    collection_name: 'January 2026',
    collection_year: 2026,
    type_prefix: 'ER',
    material: 'Rhodium',
    main_stone: stone,
    bp_msrp: 39.95,
    canonical_photo_url: `https://cdn.example.test/${stone.toLowerCase().replace(/\s+/g, '-')}.png`,
    search_tags: [stone.toLowerCase()],
    created_at: '2026-08-25T12:00:00.000Z',
  }
}
