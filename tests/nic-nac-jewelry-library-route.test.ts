import { beforeEach, describe, expect, it, vi } from 'vitest'

const getAuthenticatedRepMock = vi.fn()
const searchJewelryDatabaseMock = vi.fn()
const addListingMock = vi.fn()
const processRepCustomListingPhotoUrlMock = vi.fn()
const getCatalogListingMutationReceiptMock = vi.fn()

vi.mock('@/lib/nic-nac/auth', () => ({
  AuthError: class AuthError extends Error {},
  getPaidNicNacContext: (...args: unknown[]) =>
    getAuthenticatedRepMock(...args),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({ marker: 'admin' })),
}))

vi.mock('@/lib/services/jewelry-database', () => ({
  searchJewelryDatabase: (...args: unknown[]) =>
    searchJewelryDatabaseMock(...args),
  normalizeJewelryMaterialKey: (value: string | null | undefined) =>
    value?.trim().replace(/\s+/g, ' ').toLowerCase() || null,
  normalizeJewelryMainStoneKey: (value: string | null | undefined) =>
    value?.trim().replace(/\s+/g, ' ').toLowerCase() || null,
}))

vi.mock('@/lib/services/trade-board', () => ({
  addListing: (...args: unknown[]) => addListingMock(...args),
  getCatalogListingMutationReceipt: (...args: unknown[]) =>
    getCatalogListingMutationReceiptMock(...args),
}))

vi.mock('@/lib/services/listing-photo-processing', () => ({
  processRepCustomListingPhotoUrl: (...args: unknown[]) =>
    processRepCustomListingPhotoUrlMock(...args),
}))

import { GET, POST } from '@/app/api/nic-nac/jewelry-library/route'

describe('jewelry library route', () => {
  beforeEach(() => {
    getAuthenticatedRepMock.mockReset()
    searchJewelryDatabaseMock.mockReset()
    addListingMock.mockReset()
    processRepCustomListingPhotoUrlMock.mockReset()
    getCatalogListingMutationReceiptMock.mockReset()
    getCatalogListingMutationReceiptMock.mockResolvedValue(null)
  })

  it('searches the shared jewelry catalog for the authenticated rep', async () => {
    getAuthenticatedRepMock.mockResolvedValueOnce({
      repId: 'rep-1',
      rep: { id: 'rep-1' },
    })
    searchJewelryDatabaseMock.mockResolvedValueOnce([
      {
        designId: 'design-1',
        itemNumber: 'RG100',
        designName: 'Aurora Diamond Ring',
        material: 'Rose gold',
        mainStone: 'Pink opal',
        bpMsrp: 19.95,
        canonicalPhotoUrl: null,
        typePrefix: 'RG',
        collectionName: 'Birthday',
        collectionYear: 2026,
        searchTags: ['diamond'],
        isOnMyBoard: false,
        activeListingsCount: 1,
      },
    ])

    const response = await GET(
      new Request(
        'http://localhost/api/nic-nac/jewelry-library?query=aurora&type=ring&collection=Birthday&material=Rose%20gold&stone=Pink%20opal&label=diamond&year=2026&limit=10',
      ),
    )

    expect(searchJewelryDatabaseMock).toHaveBeenCalledWith(
      { marker: 'admin' },
      'rep-1',
      {
        query: 'aurora',
        jewelryType: 'RG',
        collection: 'Birthday',
        material: 'Rose gold',
        mainStone: 'Pink opal',
        label: 'diamond',
        collectionYear: 2026,
        limit: 10,
      },
    )
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      items: [
        expect.objectContaining({
          designId: 'design-1',
          itemNumber: 'RG100',
        }),
      ],
      facets: {
        collections: [{ value: 'Birthday', count: 1 }],
        labels: [{ value: 'diamond', count: 1 }],
        materials: [{ value: 'Rose gold', count: 1 }],
        stones: [{ value: 'Pink opal', count: 1 }],
        types: [{ value: 'ring', count: 1 }],
        years: [{ value: '2026', count: 1 }],
      },
    })
  })

  it('does not mark cubic zirconia diamond descriptions as diamond labels', async () => {
    getAuthenticatedRepMock.mockResolvedValueOnce({
      repId: 'rep-1',
      rep: { id: 'rep-1' },
    })
    searchJewelryDatabaseMock.mockResolvedValueOnce([
      {
        designId: 'design-elodie',
        itemNumber: 'ER76003',
        designName: 'The Elodie Luxe',
        material: 'Hematite Plating',
        mainStone: 'Diamond Cubic Zirconia',
        bpMsrp: 19.95,
        canonicalPhotoUrl: 'https://cdn.example.com/elodie.jpg',
        typePrefix: 'ER',
        collectionName: 'April 2026 birthday collection',
        collectionYear: null,
        searchTags: [],
        isOnMyBoard: false,
        activeListingsCount: 1,
      },
    ])

    const response = await GET(
      new Request('http://localhost/api/nic-nac/jewelry-library?query=ER76003'),
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      items: [
        expect.objectContaining({
          designName: 'The Elodie Luxe',
          mainStone: 'Diamond Cubic Zirconia',
        }),
      ],
      facets: expect.objectContaining({
        labels: [{ value: 'standard', count: 1 }],
      }),
    })
  })

  it('rejects malformed search limit params before loading the catalog', async () => {
    const response = await GET(
      new Request('http://localhost/api/nic-nac/jewelry-library?query=aurora&limit=16abc'),
    )

    expect(getAuthenticatedRepMock).not.toHaveBeenCalled()
    expect(searchJewelryDatabaseMock).not.toHaveBeenCalled()
    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: 'limit must be a whole number.',
    })
  })

  it('rejects malformed collection year params before loading the catalog', async () => {
    const response = await GET(
      new Request('http://localhost/api/nic-nac/jewelry-library?year=twenty-six'),
    )

    expect(getAuthenticatedRepMock).not.toHaveBeenCalled()
    expect(searchJewelryDatabaseMock).not.toHaveBeenCalled()
    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: 'year must be a four-digit year.',
    })
  })

  it('adds a searched design onto the rep board', async () => {
    getAuthenticatedRepMock.mockResolvedValueOnce({
      repId: 'rep-1',
      rep: { id: 'rep-1' },
    })
    addListingMock.mockResolvedValueOnce({
      listingId: 'listing-1',
      designId: 'design-1',
      itemNumber: 'RG100',
      designName: 'Aurora Ring',
      status: 'available',
      usesCanonicalPhoto: true,
    })

    const response = await POST(
      new Request('http://localhost/api/nic-nac/jewelry-library', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          designId: 'design-1',
          itemNumber: 'RG100',
          material: 'Rose gold',
          mainStone: 'Pink opal',
          mutationKey: 'library-add-1',
        }),
      }),
    )

    expect(addListingMock).toHaveBeenCalledWith({ marker: 'admin' }, 'rep-1', {
      designId: 'design-1',
      itemNumber: 'RG100',
      material: 'Rose gold',
      mainStone: 'Pink opal',
      repNotes: undefined,
      tradePreferences: undefined,
      listingPhotoUrl: undefined,
      idempotencyKey: 'jewelry-library-api:library-add-1',
      inputSignature: expect.any(String),
    })
    expect(response.status).toBe(200)
  })

  it('normalizes a custom listing photo before adding a searched design', async () => {
    getAuthenticatedRepMock.mockResolvedValueOnce({
      repId: 'rep-1',
      rep: { id: 'rep-1' },
    })
    processRepCustomListingPhotoUrlMock.mockResolvedValueOnce({
      photoUrl: 'https://cdn.example.com/rep-1/ring-enhanced.png',
    })
    addListingMock.mockResolvedValueOnce({
      listingId: 'listing-1',
      designId: 'design-1',
      itemNumber: 'RG100',
      designName: 'Aurora Ring',
      status: 'available',
      usesCanonicalPhoto: false,
    })

    await POST(
      new Request('http://localhost/api/nic-nac/jewelry-library', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          itemNumber: 'RG100',
          listingPhotoUrl: 'https://dropbox.example.com/ring.png',
          mutationKey: 'library-add-photo-1',
        }),
      }),
    )

    expect(processRepCustomListingPhotoUrlMock).toHaveBeenCalledWith({
      repId: 'rep-1',
      sourceImageUrl: 'https://dropbox.example.com/ring.png',
      filenameStem: 'RG100-listing-photo',
      mutationAssetKey: expect.any(String),
    })
    expect(addListingMock).toHaveBeenCalledWith({ marker: 'admin' }, 'rep-1', {
      itemNumber: 'RG100',
      material: undefined,
      mainStone: undefined,
      repNotes: undefined,
      tradePreferences: undefined,
      listingPhotoUrl: 'https://cdn.example.com/rep-1/ring-enhanced.png',
      idempotencyKey: 'jewelry-library-api:library-add-photo-1',
      inputSignature: expect.any(String),
    })
  })

  it('keeps same-item-number finish/stone listing photos on their own designId cache key', async () => {
    getAuthenticatedRepMock.mockResolvedValue({
      repId: 'rep-1',
      rep: { id: 'rep-1' },
    })
    processRepCustomListingPhotoUrlMock.mockResolvedValue({
      photoUrl: 'https://cdn.example.com/rep-1/half-moon.png',
    })
    addListingMock.mockResolvedValue({
      listingId: 'listing-1',
      designId: 'design-nk88350-gold',
      itemNumber: 'NK88350',
      designName: 'Half Moon Crescent',
      status: 'available',
      usesCanonicalPhoto: false,
    })

    await POST(
      new Request('http://localhost/api/nic-nac/jewelry-library', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          designId: 'design-nk88350-gold',
          itemNumber: 'NK88350',
          material: 'Gold Plating',
          mainStone: 'Lapis Magnesite',
          listingPhotoUrl: 'https://dropbox.example.com/gold.png',
          mutationKey: 'library-add-gold',
        }),
      }),
    )
    await POST(
      new Request('http://localhost/api/nic-nac/jewelry-library', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          designId: 'design-nk88350-rhodium',
          itemNumber: 'NK88350',
          material: 'Rhodium Plating',
          mainStone: 'Malachite Magnesite',
          listingPhotoUrl: 'https://dropbox.example.com/rhodium.png',
          mutationKey: 'library-add-rhodium',
        }),
      }),
    )

    expect(processRepCustomListingPhotoUrlMock).toHaveBeenNthCalledWith(1, {
      repId: 'rep-1',
      sourceImageUrl: 'https://dropbox.example.com/gold.png',
      filenameStem: 'NK88350-listing-photo',
      mutationAssetKey: expect.any(String),
      variantAssetKey: 'design-nk88350-gold',
    })
    expect(processRepCustomListingPhotoUrlMock).toHaveBeenNthCalledWith(2, {
      repId: 'rep-1',
      sourceImageUrl: 'https://dropbox.example.com/rhodium.png',
      filenameStem: 'NK88350-listing-photo',
      mutationAssetKey: expect.any(String),
      variantAssetKey: 'design-nk88350-rhodium',
    })
  })

  it('scopes PhotoRoom cache by official material|stone keys before a designId exists', async () => {
    getAuthenticatedRepMock.mockResolvedValueOnce({
      repId: 'rep-1',
      rep: { id: 'rep-1' },
    })
    processRepCustomListingPhotoUrlMock.mockResolvedValueOnce({
      photoUrl: 'https://cdn.example.com/rep-1/ruby.png',
    })
    addListingMock.mockResolvedValueOnce({
      listingId: 'listing-ruby',
      designId: 'design-new',
      itemNumber: 'RG100',
      designName: 'Aurora Ring',
      status: 'available',
      usesCanonicalPhoto: false,
    })

    await POST(
      new Request('http://localhost/api/nic-nac/jewelry-library', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          itemNumber: 'RG100',
          material: 'Silver Finish',
          mainStone: 'Red Ruby',
          listingPhotoUrl: 'https://dropbox.example.com/red-ruby.png',
          mutationKey: 'library-add-red-ruby',
        }),
      }),
    )

    expect(processRepCustomListingPhotoUrlMock).toHaveBeenCalledWith({
      repId: 'rep-1',
      sourceImageUrl: 'https://dropbox.example.com/red-ruby.png',
      filenameStem: 'RG100-listing-photo',
      mutationAssetKey: expect.any(String),
      variantAssetKey: 'silver finish|red ruby',
    })
  })
})
