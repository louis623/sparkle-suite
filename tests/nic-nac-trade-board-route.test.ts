import { beforeEach, describe, expect, it, vi } from 'vitest'

const getAuthenticatedNicNacContextMock = vi.fn()
const getPaidNicNacContextMock = vi.fn()
const getAuthenticatedRepMock = vi.fn()
const getMyBoardMock = vi.fn()
const getDanceFloorDancerCountsMock = vi.fn()
const addListingMock = vi.fn()
const updateListingMock = vi.fn()
const removeListingMock = vi.fn()
const restoreListingMock = vi.fn()
const processRepCustomListingPhotoUrlMock = vi.fn()
const getCatalogListingMutationReceiptMock = vi.fn()

vi.mock('@/lib/nic-nac/auth', () => ({
  AuthError: class AuthError extends Error {},
  getAuthenticatedNicNacContext: (...args: unknown[]) =>
    getAuthenticatedNicNacContextMock(...args),
  getPaidNicNacContext: (...args: unknown[]) =>
    getPaidNicNacContextMock(...args),
}))

vi.mock('@/lib/supabase/auth', () => ({
  AuthError: class AuthError extends Error {},
  getAuthenticatedRep: (...args: unknown[]) => getAuthenticatedRepMock(...args),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({ marker: 'admin' })),
}))

vi.mock('@/lib/services/trade-board', () => ({
  getMyBoard: (...args: unknown[]) => getMyBoardMock(...args),
  addListing: (...args: unknown[]) => addListingMock(...args),
  updateListing: (...args: unknown[]) => updateListingMock(...args),
  removeListing: (...args: unknown[]) => removeListingMock(...args),
  restoreListing: (...args: unknown[]) => restoreListingMock(...args),
  getCatalogListingMutationReceipt: (...args: unknown[]) =>
    getCatalogListingMutationReceiptMock(...args),
}))

vi.mock('@/lib/services/trade-board-stats', () => ({
  getDanceFloorDancerCounts: (...args: unknown[]) => getDanceFloorDancerCountsMock(...args),
}))

vi.mock('@/lib/services/listing-photo-processing', () => ({
  processRepCustomListingPhotoUrl: (...args: unknown[]) =>
    processRepCustomListingPhotoUrlMock(...args),
}))

import {
  DELETE,
  GET,
  PATCH,
  POST,
} from '@/app/api/nic-nac/trade-board/route'
import { AuthError } from '@/lib/nic-nac/auth'
import { ServiceError } from '@/lib/services/errors'

describe('dance floor route', () => {
  beforeEach(() => {
    getAuthenticatedNicNacContextMock.mockReset()
    getPaidNicNacContextMock.mockReset()
    getAuthenticatedRepMock.mockReset()
    getMyBoardMock.mockReset()
    getDanceFloorDancerCountsMock.mockReset()
    getDanceFloorDancerCountsMock.mockResolvedValue({
      availableDancerCount: 7,
      newDancersTodayCount: 2,
    })
    addListingMock.mockReset()
    updateListingMock.mockReset()
    removeListingMock.mockReset()
    restoreListingMock.mockReset()
    processRepCustomListingPhotoUrlMock.mockReset()
    getCatalogListingMutationReceiptMock.mockReset()
    getCatalogListingMutationReceiptMock.mockResolvedValue(null)
  })

  it('returns the authenticated rep dance floor summary', async () => {
    getPaidNicNacContextMock.mockResolvedValueOnce({
      repId: 'rep-1',
      rep: { id: 'rep-1', time_zone: 'America/Chicago' },
      supabase: { marker: 'supabase' },
    })
    getMyBoardMock.mockResolvedValueOnce({
      listings: [{ id: 'listing-1' }],
      summary: {
        totalPieces: 1,
        totalMsrp: 75,
        typeBreakdown: { RG: 1, NK: 0, ER: 0, ST: 0, BR: 0 },
        pendingRequestCount: 1,
      },
    })

    const response = await GET(
      new Request(
        'http://localhost/api/nic-nac/trade-board?status=available&type=RG&collection=Birthday&sortBy=listed_at&sortOrder=asc&limit=8&offset=16',
      ),
    )

    expect(getMyBoardMock).toHaveBeenCalledWith(
      { marker: 'supabase' },
      'rep-1',
      {
        statusFilter: 'available',
        typeFilter: 'RG',
        collectionFilter: 'Birthday',
        sortBy: 'listed_at',
        sortOrder: 'asc',
        limit: 8,
        offset: 16,
      },
    )
    expect(getDanceFloorDancerCountsMock).toHaveBeenCalledWith(
      { marker: 'supabase' }, 'rep-1', 'America/Chicago',
    )
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      summary: { availableDancerCount: 7, newDancersTodayCount: 2 },
    })
  })

  it('keeps the Dance Floor available when the optional dancer counts cannot load', async () => {
    getPaidNicNacContextMock.mockResolvedValueOnce({
      repId: 'rep-1', rep: { id: 'rep-1', time_zone: 'America/New_York' },
      supabase: { marker: 'supabase' },
    })
    getMyBoardMock.mockResolvedValueOnce({
      listings: [], summary: { totalPieces: 0, typeBreakdown: {}, pendingRequestCount: 0 },
    })
    getDanceFloorDancerCountsMock.mockRejectedValueOnce(new Error('count unavailable'))
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    try {
      const response = await GET(new Request('http://localhost/api/nic-nac/trade-board'))
      expect(response.status).toBe(200)
      await expect(response.json()).resolves.toMatchObject({ listings: [] })
      expect(log).toHaveBeenCalledOnce()
    } finally {
      log.mockRestore()
    }
  })

  it('rejects malformed numeric paging params instead of partially parsing them', async () => {
    const response = await GET(
      new Request('http://localhost/api/nic-nac/trade-board?limit=12abc'),
    )

    expect(getPaidNicNacContextMock).not.toHaveBeenCalled()
    expect(getMyBoardMock).not.toHaveBeenCalled()
    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: 'limit must be a whole number.',
    })
  })

  it('adds a listing through the admin-backed fallback action without a confirmation checkbox', async () => {
    getPaidNicNacContextMock.mockResolvedValueOnce({
      repId: 'rep-1',
      rep: { id: 'rep-1' },
      supabase: { marker: 'supabase' },
    })
    addListingMock.mockResolvedValueOnce({
      listingId: 'listing-2',
      designId: 'design-2',
      itemNumber: 'RG100',
      designName: 'Aurora Ring',
      status: 'available',
      usesCanonicalPhoto: true,
    })

    const response = await POST(
      new Request('http://localhost/api/nic-nac/trade-board', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          itemNumber: 'RG100',
          repNotes: 'Front table piece',
          mutationKey: 'quick-add-1',
        }),
      }),
    )

    expect(addListingMock).toHaveBeenCalledWith({ marker: 'admin' }, 'rep-1', {
      itemNumber: 'RG100',
      repNotes: 'Front table piece',
      tradePreferences: undefined,
      listingPhotoUrl: undefined,
      idempotencyKey: 'trade-board-api:quick-add-1',
      inputSignature: expect.any(String),
    })
    expect(response.status).toBe(200)
  })

  it('updates a listing with the authenticated rep client', async () => {
    getPaidNicNacContextMock.mockResolvedValueOnce({
      repId: 'rep-1',
      rep: { id: 'rep-1' },
      supabase: { marker: 'supabase' },
    })
    updateListingMock.mockResolvedValueOnce({
      listingId: 'listing-1',
      status: 'available',
    })

    const response = await PATCH(
      new Request('http://localhost/api/nic-nac/trade-board', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          listingId: 'listing-1',
          tradePreferences: 'Looking for studs',
        }),
      }),
    )

    expect(updateListingMock).toHaveBeenCalledWith(
      { marker: 'supabase' },
      'rep-1',
      'listing-1',
      {
        repNotes: undefined,
        tradePreferences: 'Looking for studs',
        listingPhotoUrl: undefined,
        useCanonicalPhoto: undefined,
      },
    )
    expect(response.status).toBe(200)
  })

  it('restores a removed listing with the authenticated rep client', async () => {
    getPaidNicNacContextMock.mockResolvedValueOnce({
      repId: 'rep-1',
      rep: { id: 'rep-1' },
      supabase: { marker: 'supabase' },
    })
    restoreListingMock.mockResolvedValueOnce({
      listingId: 'listing-1',
      designName: 'Aurora Ring',
      status: 'available',
      recoveryWindowDays: 7,
    })

    const response = await PATCH(
      new Request('http://localhost/api/nic-nac/trade-board', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'restore',
          listingId: 'listing-1',
        }),
      }),
    )

    expect(restoreListingMock).toHaveBeenCalledWith(
      { marker: 'supabase' },
      'rep-1',
      {
        listingId: 'listing-1',
        itemNumber: undefined,
      },
    )
    expect(updateListingMock).not.toHaveBeenCalled()
    expect(response.status).toBe(200)
  })

  it('normalizes a custom listing photo before addListing sees it', async () => {
    getPaidNicNacContextMock.mockResolvedValueOnce({
      repId: 'rep-1',
      rep: { id: 'rep-1' },
      supabase: { marker: 'supabase' },
    })
    processRepCustomListingPhotoUrlMock.mockResolvedValueOnce({
      photoUrl: 'https://cdn.example.com/rep-1/ring-enhanced.png',
    })
    addListingMock.mockResolvedValueOnce({
      listingId: 'listing-2',
      designId: 'design-2',
      itemNumber: 'RG100',
      designName: 'Aurora Ring',
      status: 'available',
      usesCanonicalPhoto: false,
    })

    await POST(
      new Request('http://localhost/api/nic-nac/trade-board', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          itemNumber: 'RG100',
          listingPhotoUrl: 'https://dropbox.example.com/ring.png',
          mutationKey: 'quick-add-photo-1',
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
      repNotes: undefined,
      tradePreferences: undefined,
      listingPhotoUrl: 'https://cdn.example.com/rep-1/ring-enhanced.png',
      idempotencyKey: 'trade-board-api:quick-add-photo-1',
      inputSignature: expect.any(String),
    })
  })

  it('forwards exact designId so same-SKU finish/stone photos stay isolated', async () => {
    getPaidNicNacContextMock.mockResolvedValueOnce({
      repId: 'rep-1',
      rep: { id: 'rep-1' },
      supabase: { marker: 'supabase' },
    })
    processRepCustomListingPhotoUrlMock.mockResolvedValueOnce({
      photoUrl: 'https://cdn.example.com/rep-1/nk88350-gold.png',
    })
    addListingMock.mockResolvedValueOnce({
      listingId: 'listing-gold',
      designId: 'design-nk88350-gold',
      itemNumber: 'NK88350',
      designName: 'Half Moon Crescent',
      status: 'available',
      usesCanonicalPhoto: false,
    })

    await POST(
      new Request('http://localhost/api/nic-nac/trade-board', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          designId: 'design-nk88350-gold',
          itemNumber: 'NK88350',
          material: 'Gold Plating',
          mainStone: 'Lapis Magnesite',
          listingPhotoUrl: 'https://dropbox.example.com/gold.png',
          mutationKey: 'quick-add-gold',
        }),
      }),
    )

    expect(processRepCustomListingPhotoUrlMock).toHaveBeenCalledWith({
      repId: 'rep-1',
      sourceImageUrl: 'https://dropbox.example.com/gold.png',
      filenameStem: 'NK88350-listing-photo',
      mutationAssetKey: expect.any(String),
      variantAssetKey: 'design-nk88350-gold',
    })
    expect(addListingMock).toHaveBeenCalledWith({ marker: 'admin' }, 'rep-1', {
      designId: 'design-nk88350-gold',
      itemNumber: 'NK88350',
      material: 'Gold Plating',
      mainStone: 'Lapis Magnesite',
      repNotes: undefined,
      tradePreferences: undefined,
      listingPhotoUrl: 'https://cdn.example.com/rep-1/nk88350-gold.png',
      idempotencyKey: 'trade-board-api:quick-add-gold',
      inputSignature: expect.any(String),
    })
  })

  it('replays a committed custom-photo add before uploading another asset', async () => {
    getPaidNicNacContextMock.mockResolvedValueOnce({
      repId: 'rep-1',
      rep: { id: 'rep-1' },
      supabase: { marker: 'supabase' },
    })
    getCatalogListingMutationReceiptMock.mockResolvedValueOnce({
      listingId: 'listing-committed',
      designId: 'design-1',
      itemNumber: 'RG100',
      designName: 'Aurora Ring',
      status: 'available',
      usesCanonicalPhoto: false,
      quantityAvailable: 1,
      groupedWithExisting: false,
      mutationReplayed: true,
    })

    const response = await POST(
      new Request('http://localhost/api/nic-nac/trade-board', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          itemNumber: 'RG100',
          listingPhotoUrl: 'https://dropbox.example.com/ring.png',
          mutationKey: 'quick-add-photo-replay',
        }),
      }),
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      result: {
        listingId: 'listing-committed',
        itemNumber: 'RG100',
        quantityAvailable: 1,
        mutationReplayed: true,
      },
    })
    expect(processRepCustomListingPhotoUrlMock).not.toHaveBeenCalled()
    expect(addListingMock).not.toHaveBeenCalled()
  })

  it('normalizes a custom listing photo before updateListing sees it', async () => {
    getPaidNicNacContextMock.mockResolvedValueOnce({
      repId: 'rep-1',
      rep: { id: 'rep-1' },
      supabase: { marker: 'supabase' },
    })
    processRepCustomListingPhotoUrlMock.mockResolvedValueOnce({
      photoUrl: 'https://cdn.example.com/rep-1/ring-enhanced.png',
    })
    updateListingMock.mockResolvedValueOnce({
      listingId: 'listing-1',
      status: 'available',
    })

    await PATCH(
      new Request('http://localhost/api/nic-nac/trade-board', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          listingId: 'listing-1',
          listingPhotoUrl: 'https://dropbox.example.com/ring.png',
        }),
      }),
    )

    expect(processRepCustomListingPhotoUrlMock).toHaveBeenCalledWith({
      repId: 'rep-1',
      sourceImageUrl: 'https://dropbox.example.com/ring.png',
      filenameStem: 'listing-1-listing-photo',
    })
    expect(updateListingMock).toHaveBeenCalledWith(
      { marker: 'supabase' },
      'rep-1',
      'listing-1',
      {
        repNotes: undefined,
        tradePreferences: undefined,
        listingPhotoUrl: 'https://cdn.example.com/rep-1/ring-enhanced.png',
        useCanonicalPhoto: undefined,
      },
    )
  })

  it('removes a listing with a required reason', async () => {
    getPaidNicNacContextMock.mockResolvedValueOnce({
      repId: 'rep-1',
      rep: { id: 'rep-1' },
      supabase: { marker: 'supabase' },
    })
    removeListingMock.mockResolvedValueOnce({
      listingId: 'listing-1',
      designName: 'Aurora Ring',
      previousStatus: 'available',
    })

    const response = await DELETE(
      new Request('http://localhost/api/nic-nac/trade-board', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          listingId: 'listing-1',
          reason: 'keeping',
        }),
      }),
    )

    expect(removeListingMock).toHaveBeenCalledWith(
      { marker: 'supabase' },
      'rep-1',
      {
        listingId: 'listing-1',
        itemNumber: undefined,
        reason: 'keeping',
      },
    )
    expect(response.status).toBe(200)
  })

  it('returns 401 when the rep is not signed in', async () => {
    getPaidNicNacContextMock.mockRejectedValueOnce(
      new AuthError('Not authenticated'),
    )

    const response = await GET(
      new Request('http://localhost/api/nic-nac/trade-board'),
    )

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({
      error: 'unauthenticated',
    })
  })

  it('requires a paid subscription before loading the dance floor', async () => {
    getPaidNicNacContextMock.mockRejectedValueOnce(
      new ServiceError({
        code: 'SPARKLE_SUBSCRIPTION_REQUIRED',
        message: 'subscription required',
        userMessage:
          'Start your Sparkle Suite subscription before using workspace tools.',
        statusCode: 402,
      }),
    )

    const response = await GET(
      new Request('http://localhost/api/nic-nac/trade-board'),
    )

    expect(getMyBoardMock).not.toHaveBeenCalled()
    expect(response.status).toBe(402)
    await expect(response.json()).resolves.toEqual({
      code: 'SPARKLE_SUBSCRIPTION_REQUIRED',
      error: 'Start your Sparkle Suite subscription before using workspace tools.',
    })
  })

  it('requires a paid subscription before adding a dance floor listing', async () => {
    getPaidNicNacContextMock.mockRejectedValueOnce(
      new ServiceError({
        code: 'SPARKLE_SUBSCRIPTION_REQUIRED',
        message: 'subscription required',
        userMessage:
          'Start your Sparkle Suite subscription before using workspace tools.',
        statusCode: 402,
      }),
    )

    const response = await POST(
      new Request('http://localhost/api/nic-nac/trade-board', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ itemNumber: 'RG100' }),
      }),
    )

    expect(addListingMock).not.toHaveBeenCalled()
    expect(processRepCustomListingPhotoUrlMock).not.toHaveBeenCalled()
    expect(response.status).toBe(402)
  })
})
