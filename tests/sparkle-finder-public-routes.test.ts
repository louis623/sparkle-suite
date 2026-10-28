import { beforeEach, describe, expect, it, vi } from 'vitest'

const listSparkleFinderCatalogItemsMock = vi.fn()
const listSparkleFinderCatalogFacetsMock = vi.fn()
const getSparkleFinderCatalogItemMock = vi.fn()
const getSparkleFinderAvailabilityMock = vi.fn()
const listSparkleFinderLiveShowsMock = vi.fn()
const listSparkleFinderPublicRepsMock = vi.fn()
const listSparkleFinderCatalogPageV2Mock = vi.fn()
const listSparkleFinderCatalogFacetsV2Mock = vi.fn()
const createAdminClientMock = vi.fn()

vi.mock('@/lib/sparkle-finder/public-api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/sparkle-finder/public-api')>(
    '@/lib/sparkle-finder/public-api',
  )

  return {
    ...actual,
    listSparkleFinderCatalogFacets: (...args: unknown[]) =>
      listSparkleFinderCatalogFacetsMock(...args),
    listSparkleFinderCatalogItems: (...args: unknown[]) =>
      listSparkleFinderCatalogItemsMock(...args),
    getSparkleFinderCatalogItem: (...args: unknown[]) =>
      getSparkleFinderCatalogItemMock(...args),
    getSparkleFinderAvailability: (...args: unknown[]) =>
      getSparkleFinderAvailabilityMock(...args),
    listSparkleFinderLiveShows: (...args: unknown[]) =>
      listSparkleFinderLiveShowsMock(...args),
    listSparkleFinderPublicReps: (...args: unknown[]) =>
      listSparkleFinderPublicRepsMock(...args),
  }
})

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => createAdminClientMock(),
}))

vi.mock('@/lib/sparkle-finder/catalog-v2', async () => {
  const actual = await vi.importActual<typeof import('@/lib/sparkle-finder/catalog-v2')>(
    '@/lib/sparkle-finder/catalog-v2',
  )
  return {
    ...actual,
    listSparkleFinderCatalogPageV2: (...args: unknown[]) =>
      listSparkleFinderCatalogPageV2Mock(...args),
    listSparkleFinderCatalogFacetsV2: (...args: unknown[]) =>
      listSparkleFinderCatalogFacetsV2Mock(...args),
  }
})

import { GET as getFinderAvailability } from '@/app/api/public/finder/availability/route'
import { GET as getFinderCatalog } from '@/app/api/public/finder/catalog/route'
import { GET as getFinderCatalogFacets } from '@/app/api/public/finder/catalog/facets/route'
import { GET as getFinderCatalogDetail } from '@/app/api/public/finder/catalog/[designId]/route'
import { GET as getFinderLiveShows } from '@/app/api/public/finder/live-shows/route'
import { GET as getFinderReps } from '@/app/api/public/finder/reps/route'
import {
  FinderAvailabilityConfigurationError,
  FinderAvailabilityCursorError,
} from '@/lib/sparkle-finder/availability-v2'

function defaultFinderRepFeedClient() {
  return {
    from(table: string) {
      return {
        select() {
          return {
            in(_column: string, ids: string[]) {
              if (table !== 'reps') return Promise.resolve({ data: [], error: null })
              return Promise.resolve({
                data: ids.map((id) => ({
                  id,
                  status: 'active',
                  account_classification: 'customer',
                  public_site_slug: 'blingkitchen',
                  custom_domain: null,
                  profile_photo_url: null,
                  finder_directory_visible: true,
                })),
                error: null,
              })
            },
          }
        },
      }
    },
  }
}

describe('Sparkle Finder public routes', () => {
  beforeEach(() => {
    listSparkleFinderCatalogFacetsMock.mockReset()
    listSparkleFinderCatalogItemsMock.mockReset()
    getSparkleFinderCatalogItemMock.mockReset()
    getSparkleFinderAvailabilityMock.mockReset()
    listSparkleFinderLiveShowsMock.mockReset()
    listSparkleFinderPublicRepsMock.mockReset()
    listSparkleFinderCatalogPageV2Mock.mockReset()
    listSparkleFinderCatalogFacetsV2Mock.mockReset()
    createAdminClientMock.mockReset()
    createAdminClientMock.mockImplementation(() => defaultFinderRepFeedClient())
  })

  it('returns public catalog search results without caching', async () => {
    listSparkleFinderCatalogPageV2Mock.mockResolvedValueOnce({
      schemaVersion: 2,
      items: [
        {
          designId: 'design-1',
          itemNumber: 'RG100',
          designName: 'Aurora Ring',
          collectionYear: 2026,
          searchTags: ['ring'],
        },
      ],
      pageInfo: { totalCount: 1, hasMore: false, nextCursor: null },
    })

    const response = await getFinderCatalog(
      new Request('http://localhost/api/public/finder/catalog?query=aurora&limit=10'),
    )

    expect(listSparkleFinderCatalogPageV2Mock).toHaveBeenCalledWith({
      filters: { query: 'aurora' },
      limit: 10,
      position: null,
    })
    expect(response.headers.get('cache-control')).toBe('no-store')
    await expect(response.json()).resolves.toEqual({
      schemaVersion: 2,
      items: [
        {
          designId: 'design-1',
          itemNumber: 'RG100',
          designName: 'Aurora Ring',
          collectionYear: 2026,
          searchTags: ['ring'],
        },
      ],
      pageInfo: { totalCount: 1, hasMore: false, nextCursor: null },
    })
  })

  it('passes public catalog browse filters into the shared catalog service', async () => {
    listSparkleFinderCatalogPageV2Mock.mockResolvedValueOnce({
      schemaVersion: 2,
      items: [],
      pageInfo: { totalCount: 0, hasMore: false, nextCursor: null },
    })

    const response = await getFinderCatalog(
      new Request(
        'http://localhost/api/public/finder/catalog?query=opal&type=ring&collection=Midnight%20Garden&material=Rose%20gold&stone=Pink%20opal&label=diamond&year=2026&limit=12',
      ),
    )

    expect(response.status).toBe(200)
    expect(listSparkleFinderCatalogPageV2Mock).toHaveBeenCalledWith({
      filters: {
        query: 'opal',
        jewelryType: 'ring',
        collection: 'Midnight Garden',
        material: 'Rose gold',
        mainStone: 'Pink opal',
        label: 'diamond',
        collectionYear: 2026,
      },
      limit: 12,
      position: null,
    })
  })

  it('rejects malformed public catalog collection years', async () => {
    const response = await getFinderCatalog(
      new Request('http://localhost/api/public/finder/catalog?year=twenty-six'),
    )

    expect(response.status).toBe(400)
    expect(listSparkleFinderCatalogPageV2Mock).not.toHaveBeenCalled()
    await expect(response.json()).resolves.toEqual({
      error: 'year must be a four-digit collection year.',
    })
  })

  it('rejects invalid catalog limits', async () => {
    const response = await getFinderCatalog(
      new Request('http://localhost/api/public/finder/catalog?limit=bad'),
    )

    expect(response.status).toBe(400)
    expect(listSparkleFinderCatalogPageV2Mock).not.toHaveBeenCalled()
    await expect(response.json()).resolves.toEqual({
      error: 'limit must be a positive whole number.',
    })
  })

  it('returns dynamic public catalog facets without caching', async () => {
    listSparkleFinderCatalogFacetsV2Mock.mockResolvedValueOnce({
      schemaVersion: 2,
      facets: {
        collections: [{ value: 'Midnight Garden', count: 2 }],
        materials: [{ value: 'Rose gold', count: 2 }],
        stones: [{ value: 'Pearl', count: 1 }],
        types: [{ value: 'ring', count: 2 }],
        labels: [{ value: 'diamond', count: 1 }],
        years: [{ value: '2026', count: 2 }],
      },
    })

    const response = await getFinderCatalogFacets(
      new Request(
        'http://localhost/api/public/finder/catalog/facets?query=opal&type=ring&material=Rose%20gold&stone=Pearl&label=diamond&collection=Midnight%20Garden&year=2026',
      ),
    )

    expect(listSparkleFinderCatalogFacetsV2Mock).toHaveBeenCalledWith({
      filters: {
        query: 'opal',
        jewelryType: 'ring',
        collection: 'Midnight Garden',
        material: 'Rose gold',
        mainStone: 'Pearl',
        label: 'diamond',
        collectionYear: 2026,
      },
    })
    expect(response.headers.get('cache-control')).toBe('no-store')
    await expect(response.json()).resolves.toEqual({
      schemaVersion: 2,
      facets: {
        collections: [{ value: 'Midnight Garden', count: 2 }],
        materials: [{ value: 'Rose gold', count: 2 }],
        stones: [{ value: 'Pearl', count: 1 }],
        types: [{ value: 'ring', count: 2 }],
        labels: [{ value: 'diamond', count: 1 }],
        years: [{ value: '2026', count: 2 }],
      },
    })
  })

  it('rejects malformed public catalog facet years', async () => {
    const response = await getFinderCatalogFacets(
      new Request('http://localhost/api/public/finder/catalog/facets?year=ancient'),
    )

    expect(response.status).toBe(400)
    expect(listSparkleFinderCatalogFacetsV2Mock).not.toHaveBeenCalled()
    await expect(response.json()).resolves.toEqual({
      error: 'year must be a four-digit collection year.',
    })
  })

  it('returns a single public catalog item by design id', async () => {
    getSparkleFinderCatalogItemMock.mockResolvedValueOnce({
      designId: 'design-1',
      itemNumber: 'RG100',
      designName: 'Aurora Ring',
    })

    const response = await getFinderCatalogDetail(
      new Request('http://localhost/api/public/finder/catalog/design-1'),
      { params: Promise.resolve({ designId: 'design-1' }) },
    )

    expect(getSparkleFinderCatalogItemMock).toHaveBeenCalledWith({
      designId: 'design-1',
    })
    expect(response.headers.get('cache-control')).toBe('no-store')
    await expect(response.json()).resolves.toEqual({
      item: {
        designId: 'design-1',
        itemNumber: 'RG100',
        designName: 'Aurora Ring',
        description: null,
      },
    })
  })

  it('returns 404 when a public catalog item does not exist', async () => {
    getSparkleFinderCatalogItemMock.mockResolvedValueOnce(null)

    const response = await getFinderCatalogDetail(
      new Request('http://localhost/api/public/finder/catalog/missing'),
      { params: Promise.resolve({ designId: 'missing' }) },
    )

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({
      error: 'catalog item not found',
    })
  })

  it('requires designId for public availability lookups', async () => {
    const response = await getFinderAvailability(
      new Request('http://localhost/api/public/finder/availability'),
    )

    expect(response.status).toBe(400)
    expect(getSparkleFinderAvailabilityMock).not.toHaveBeenCalled()
    await expect(response.json()).resolves.toEqual({
      error: 'designId is required.',
    })
  })

  it('returns public exact and similar availability matches', async () => {
    const availability = {
      listingId: 'listing-1',
      rep: {
        repId: 'rep-1',
        showName: 'Gracie Test Studio',
        repFirstName: 'Gracie',
        customerSiteUrl: 'https://www.yoursparklesuite.com/gracieteststudio',
      },
      nextShow: {
        showId: 'show-1',
        repId: 'rep-1',
        startsAt: '2026-06-10T00:00:00.000Z',
        title: 'Wednesday Reveal',
        status: 'scheduled',
      },
    }
    getSparkleFinderAvailabilityMock.mockResolvedValueOnce({
      schemaVersion: 2,
      requestedItem: { designId: 'design-1', itemNumber: 'RG100' },
      exactMatches: [availability],
      similarMatches: [{ ...availability, listingId: 'listing-2' }],
      exactPageInfo: {
        totalLeadCount: 1,
        totalDancerCount: 2,
        hasMore: false,
        nextCursor: null,
      },
      similarPageInfo: {
        totalLeadCount: 1,
        totalDancerCount: 1,
        hasMore: false,
        nextCursor: null,
      },
    })

    const response = await getFinderAvailability(
      new Request(
        'http://localhost/api/public/finder/availability?designId=design-1&limit=8',
      ),
    )

    expect(getSparkleFinderAvailabilityMock).toHaveBeenCalledWith({
      designId: 'design-1',
      limit: 8,
    })
    expect(response.headers.get('cache-control')).toBe('no-store')
    const body = await response.json()
    expect(body).toEqual({
      schemaVersion: 2,
      requestedItem: { designId: 'design-1', itemNumber: 'RG100' },
      exactMatches: [availability],
      similarMatches: [{ ...availability, listingId: 'listing-2' }],
      exactPageInfo: {
        totalLeadCount: 1,
        totalDancerCount: 2,
        hasMore: false,
        nextCursor: null,
      },
      similarPageInfo: {
        totalLeadCount: 1,
        totalDancerCount: 1,
        hasMore: false,
        nextCursor: null,
      },
    })
    expect(JSON.stringify(body)).not.toContain('businessName')
    expect(JSON.stringify(body)).not.toContain('tradeBoardPath')
    expect(JSON.stringify(body)).not.toContain('customerSitePath')
  })

  it('passes independent availability cursors through to the service', async () => {
    getSparkleFinderAvailabilityMock.mockResolvedValueOnce({
      schemaVersion: 2,
      requestedItem: { designId: 'design-1' },
      exactMatches: [],
      similarMatches: [],
      exactPageInfo: {
        totalLeadCount: 0,
        totalDancerCount: 0,
        hasMore: false,
        nextCursor: null,
      },
      similarPageInfo: {
        totalLeadCount: 0,
        totalDancerCount: 0,
        hasMore: false,
        nextCursor: null,
      },
    })

    const response = await getFinderAvailability(
      new Request(
        'http://localhost/api/public/finder/availability?designId=design-1&limit=8&exactCursor=exact-token&similarCursor=similar-token',
      ),
    )

    expect(response.status).toBe(200)
    expect(getSparkleFinderAvailabilityMock).toHaveBeenCalledWith({
      designId: 'design-1',
      limit: 8,
      exactCursor: 'exact-token',
      similarCursor: 'similar-token',
    })
  })

  it('rejects oversized availability cursors before querying', async () => {
    const response = await getFinderAvailability(
      new Request(
        `http://localhost/api/public/finder/availability?designId=design-1&exactCursor=${'a'.repeat(1025)}`,
      ),
    )

    expect(response.status).toBe(400)
    expect(getSparkleFinderAvailabilityMock).not.toHaveBeenCalled()
    await expect(response.json()).resolves.toEqual({
      error: 'availability cursor must be 1024 characters or fewer.',
    })
  })

  it('returns a bounded client error for an invalid signed availability cursor', async () => {
    getSparkleFinderAvailabilityMock.mockRejectedValueOnce(
      new FinderAvailabilityCursorError(),
    )

    const response = await getFinderAvailability(
      new Request(
        'http://localhost/api/public/finder/availability?designId=design-1&exactCursor=tampered',
      ),
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: 'availability cursor is invalid or does not match this request.',
    })
  })

  it('returns 503 rather than 404 when availability storage is unavailable', async () => {
    getSparkleFinderAvailabilityMock.mockRejectedValueOnce(
      new FinderAvailabilityConfigurationError(),
    )

    const response = await getFinderAvailability(
      new Request('http://localhost/api/public/finder/availability?designId=design-1'),
    )

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toEqual({
      error: 'Availability storage is unavailable.',
    })
  })

  it('returns public live shows without requiring item availability', async () => {
    listSparkleFinderLiveShowsMock.mockResolvedValueOnce([
      {
        showId: 'show-1',
        showName: 'Gracie Test Studio',
        repFirstName: 'Gracie',
        startsAt: '2026-06-10T00:00:00.000Z',
        status: 'scheduled',
        customerSiteUrl: 'https://www.yoursparklesuite.com/gracieteststudio',
      },
    ])

    const response = await getFinderLiveShows(
      new Request('http://localhost/api/public/finder/live-shows?limit=12'),
    )

    expect(listSparkleFinderLiveShowsMock).toHaveBeenCalledWith({ limit: 12 })
    expect(getSparkleFinderAvailabilityMock).not.toHaveBeenCalled()
    expect(response.headers.get('cache-control')).toBe('no-store')
    await expect(response.json()).resolves.toEqual({
      shows: [
        {
          showId: 'show-1',
          showName: 'Gracie Test Studio',
          repFirstName: 'Gracie',
          startsAt: '2026-06-10T00:00:00.000Z',
          status: 'scheduled',
          customerSiteUrl: 'https://www.yoursparklesuite.com/gracieteststudio',
        },
      ],
    })
  })

  it('rejects invalid live show limits', async () => {
    const response = await getFinderLiveShows(
      new Request('http://localhost/api/public/finder/live-shows?limit=bad'),
    )

    expect(response.status).toBe(400)
    expect(listSparkleFinderLiveShowsMock).not.toHaveBeenCalled()
    await expect(response.json()).resolves.toEqual({
      error: 'limit must be a positive whole number.',
    })
  })

  it('returns the versioned public rep directory contract without caching', async () => {
    listSparkleFinderPublicRepsMock.mockResolvedValueOnce([
      {
        repId: 'rep-heather',
        displayName: 'Heather',
        businessName: 'BlingKitchen',
        avatarUrl: null,
        state: null,
        customerSiteUrl: 'https://www.yoursparklesuite.com/blingkitchen',
        repBoardUrl: 'https://www.yoursparklesuite.com/blingkitchen/trade',
        nextShow: null,
      },
    ])

    const response = await getFinderReps(
      new Request(
        'http://localhost/api/public/finder/reps?limit=200&query=Heather',
      ),
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('application/json')
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(listSparkleFinderPublicRepsMock).toHaveBeenCalledWith({
      limit: 200,
      query: 'Heather',
    })
    expect(body).toEqual({
      schemaVersion: 1,
      generatedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      reps: [expect.objectContaining({ repId: 'rep-heather' })],
      nextCursor: null,
    })
    expect(JSON.stringify(body)).not.toContain('favoriteCount')
    expect(JSON.stringify(body)).not.toContain('email')
    expect(JSON.stringify(body)).not.toContain('auth_user_id')
  })

  it('returns a healthy empty public rep directory as JSON', async () => {
    listSparkleFinderPublicRepsMock.mockResolvedValueOnce([])

    const response = await getFinderReps(
      new Request('http://localhost/api/public/finder/reps'),
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      schemaVersion: 1,
      generatedAt: expect.any(String),
      reps: [],
      nextCursor: null,
    })
  })

  it('rejects malformed rep-directory limits and oversized searches', async () => {
    const invalidLimitResponse = await getFinderReps(
      new Request('http://localhost/api/public/finder/reps?limit=10abc'),
    )
    const longQueryResponse = await getFinderReps(
      new Request(
        `http://localhost/api/public/finder/reps?query=${'a'.repeat(101)}`,
      ),
    )

    expect(invalidLimitResponse.status).toBe(400)
    expect(longQueryResponse.status).toBe(400)
    expect(listSparkleFinderPublicRepsMock).not.toHaveBeenCalled()
    await expect(invalidLimitResponse.json()).resolves.toEqual({
      error: 'limit must be a positive whole number.',
    })
    await expect(longQueryResponse.json()).resolves.toEqual({
      error: 'query must be 100 characters or fewer.',
    })
  })

  it('returns a JSON service-unavailable response when the directory read fails', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    listSparkleFinderPublicRepsMock.mockRejectedValueOnce(
      new Error('temporary database error'),
    )

    const response = await getFinderReps(
      new Request('http://localhost/api/public/finder/reps'),
    )

    expect(response.status).toBe(503)
    expect(response.headers.get('content-type')).toContain('application/json')
    await expect(response.json()).resolves.toEqual({
      error: 'Rep directory is temporarily unavailable.',
    })
    expect(errorSpy).toHaveBeenCalledWith(
      '[sparkle-finder/reps] Public rep directory failed:',
      expect.any(Error),
    )
    errorSpy.mockRestore()
  })

  it('adds public finder rep fields, photo and site fallbacks, and demo exclusions', async () => {
    const heatherShow = {
      showId: 'show-heather',
      showName: 'Friday Reveal',
      startsAt: '2026-10-30T23:00:00.000Z',
      status: 'scheduled' as const,
      customerSiteUrl: null,
      durationMinutes: 60,
      endTime: '2026-10-31T00:00:00.000Z',
    }
    const directoryReps = [
      {
        repId: 'rep-heather',
        displayName: 'Heather',
        businessName: 'BlingKitchen',
        avatarUrl: 'https://cdn.example.test/heather-avatar.png',
        state: null,
        customerSiteUrl: 'https://www.yoursparklesuite.com/blingkitchen',
        repBoardUrl: 'https://www.yoursparklesuite.com/blingkitchen/trade',
        nextShow: heatherShow,
      },
      {
        repId: 'rep-kim',
        displayName: 'Kim',
        businessName: 'Kim Goforth',
        avatarUrl: null,
        state: null,
        customerSiteUrl: 'https://www.yoursparklesuite.com/kimgoforth',
        repBoardUrl: 'https://www.yoursparklesuite.com/kimgoforth/trade',
        nextShow: null,
      },
      {
        repId: 'rep-mina',
        displayName: 'Mina',
        businessName: null,
        avatarUrl: null,
        state: null,
        customerSiteUrl: 'https://www.yoursparklesuite.com/minastudio',
        repBoardUrl: 'https://www.yoursparklesuite.com/minastudio/trade',
        nextShow: null,
      },
      directoryRep('rep-dudes', 'Dudes', 'dudesfizzfest'),
      directoryRep('rep-louis', 'Louis', 'louisfizzfest'),
      directoryRep('rep-demo-studio', 'Demo Studio', 'demosparklestudiod5decc'),
      directoryRep('rep-beta', 'Beta Demo', 'sparklebetademo'),
      directoryRep('rep-reviewer', 'Reviewer', 'sparkle-reviewer-preview'),
      directoryRep('rep-marked-demo', 'Marked Demo', 'markeddemo'),
      directoryRep('rep-paused', 'Paused', 'pausedstudio'),
      directoryRep('rep-hidden', 'Hidden', 'hiddenstudio'),
      directoryRep('rep-blank-slug', 'Blank Slug', 'blankstudio'),
    ]
    const queries: Array<{ table: string; columns: string }> = []
    listSparkleFinderPublicRepsMock.mockResolvedValueOnce(directoryReps)
    createAdminClientMock.mockReturnValue({
      from(table: string) {
        return {
          select(columns: string) {
            queries.push({ table, columns })
            return {
              in(_column: string, ids: string[]) {
                const data =
                  table === 'reps'
                    ? feedRepRows().filter((row) => ids.includes(row.id))
                    : feedSettingsRows().filter((row) => ids.includes(row.rep_id))
                return Promise.resolve({ data, error: null })
              },
            }
          },
        }
      },
    })

    const response = await getFinderReps(
      new Request('http://localhost/api/public/finder/reps?limit=50'),
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(queries).toEqual([
      {
        table: 'reps',
        columns:
          'id, status, account_classification, public_site_slug, custom_domain, profile_photo_url, finder_directory_visible',
      },
      {
        table: 'site_settings',
        columns: 'rep_id, about_narrative, homepage_media_slots',
      },
    ])
    expect(queries.every((query) => !/email|phone|address/i.test(query.columns))).toBe(true)
    expect(body.reps).toEqual([
      {
        repId: 'rep-heather',
        displayName: 'Heather',
        businessName: 'BlingKitchen',
        avatarUrl: 'https://cdn.example.test/heather-avatar.png',
        state: null,
        customerSiteUrl: 'https://www.yoursparklesuite.com/blingkitchen',
        repBoardUrl: 'https://www.yoursparklesuite.com/blingkitchen/trade',
        nextShow: heatherShow,
        about_text: 'Heather shares the story of her shows.',
        about_photo_url: 'https://cdn.example.test/heather-about.jpg',
        public_site_slug: 'blingkitchen',
        custom_domain: null,
        site_url: 'https://yoursparklesuite.com/blingkitchen',
      },
      {
        repId: 'rep-kim',
        displayName: 'Kim',
        businessName: 'Kim Goforth',
        avatarUrl: null,
        state: null,
        customerSiteUrl: 'https://www.yoursparklesuite.com/kimgoforth',
        repBoardUrl: 'https://www.yoursparklesuite.com/kimgoforth/trade',
        nextShow: null,
        about_text: null,
        about_photo_url: 'https://cdn.example.test/kim-profile.jpg',
        public_site_slug: 'kimgoforth',
        custom_domain: 'kimgoforth.com',
        site_url: 'https://kimgoforth.com/',
      },
      {
        repId: 'rep-mina',
        displayName: 'Mina',
        businessName: null,
        avatarUrl: null,
        state: null,
        customerSiteUrl: 'https://www.yoursparklesuite.com/minastudio',
        repBoardUrl: 'https://www.yoursparklesuite.com/minastudio/trade',
        nextShow: null,
        about_text: null,
        about_photo_url: null,
        public_site_slug: 'minastudio',
        custom_domain: null,
        site_url: 'https://yoursparklesuite.com/minastudio',
      },
    ])
    const serialized = JSON.stringify(body)
    for (const slug of [
      'dudesfizzfest',
      'louisfizzfest',
      'demosparklestudiod5decc',
      'sparklebetademo',
      'sparkle-reviewer-preview',
      'markeddemo',
      'pausedstudio',
      'hiddenstudio',
      'blankstudio',
    ]) {
      expect(serialized).not.toContain(slug)
    }
    expect(serialized).not.toContain('email')
    expect(serialized).not.toContain('phone')
    expect(serialized).not.toContain('address')
    expect(serialized).not.toContain('client_account_profiles')
  })
})

function directoryRep(repId: string, displayName: string, slug: string) {
  return {
    repId,
    displayName,
    businessName: null,
    avatarUrl: null,
    state: null,
    customerSiteUrl: `https://www.yoursparklesuite.com/${slug}`,
    repBoardUrl: null,
    nextShow: null,
  }
}

function feedRepRows() {
  return [
    customerRow('rep-heather', 'blingkitchen', null, 'https://cdn.example.test/heather-profile.jpg'),
    customerRow('rep-kim', 'KimGoforth', 'HTTPS://KimGoforth.com/', ' https://cdn.example.test/kim-profile.jpg '),
    customerRow('rep-mina', 'minastudio', '   ', null),
    customerRow('rep-dudes', 'dudesfizzfest', null, null),
    customerRow('rep-louis', 'louisfizzfest', null, null),
    customerRow('rep-demo-studio', 'demosparklestudiod5decc', null, null),
    customerRow('rep-beta', 'sparklebetademo', null, null),
    customerRow('rep-reviewer', 'sparkle-reviewer-preview', null, null),
    { ...customerRow('rep-marked-demo', 'markeddemo', null, null), account_classification: 'demo' },
    { ...customerRow('rep-paused', 'pausedstudio', null, null), status: 'churned' },
    { ...customerRow('rep-hidden', 'hiddenstudio', null, null), finder_directory_visible: false },
    { ...customerRow('rep-blank-slug', 'blankstudio', null, null), public_site_slug: '   ' },
  ]
}

function customerRow(
  id: string,
  publicSiteSlug: string,
  customDomain: string | null,
  profilePhotoUrl: string | null,
) {
  return {
    id,
    status: 'active',
    account_classification: 'customer',
    public_site_slug: publicSiteSlug,
    custom_domain: customDomain,
    profile_photo_url: profilePhotoUrl,
    finder_directory_visible: true,
  }
}

function feedSettingsRows() {
  return [
    {
      rep_id: 'rep-heather',
      about_narrative: '  Heather shares the story of her shows.  ',
      homepage_media_slots: [
        { key: 'showcase', imageUrl: 'https://cdn.example.test/showcase.jpg', videoUrl: '' },
        { key: 'about_2', imageUrl: 'https://cdn.example.test/not-the-portrait.jpg' },
        { key: 'about_1', imageUrl: '  https://cdn.example.test/heather-about.jpg  ' },
      ],
    },
    {
      rep_id: 'rep-kim',
      about_narrative: '   ',
      homepage_media_slots: [
        { key: 'about_1', imageUrl: 'https://cdn.example.test/stale-kim.jpg' },
        { key: 'about_1', imageUrl: '   ' },
      ],
    },
  ]
}
