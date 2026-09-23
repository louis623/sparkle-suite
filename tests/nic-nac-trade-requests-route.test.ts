import { beforeEach, describe, expect, it, vi } from 'vitest'

const getAuthenticatedNicNacContextMock = vi.fn()
const getPaidNicNacContextMock = vi.fn()
const getAuthenticatedRepMock = vi.fn()
const getTradeRequestsMock = vi.fn()
const getPendingTradeRequestCountMock = vi.fn()
const approveTradeMock = vi.fn()
const rejectTradeMock = vi.fn()
const approveTradeWithRevealedItemCaptureMock = vi.fn()

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

vi.mock('@/lib/services/trade-requests', () => ({
  getTradeRequests: (...args: unknown[]) => getTradeRequestsMock(...args),
  getPendingTradeRequestCount: (...args: unknown[]) => getPendingTradeRequestCountMock(...args),
  approveTrade: (...args: unknown[]) => approveTradeMock(...args),
  rejectTrade: (...args: unknown[]) => rejectTradeMock(...args),
}))

vi.mock('@/lib/services/trade-swaps', () => ({
  approveTradeWithRevealedItemCapture: (...args: unknown[]) =>
    approveTradeWithRevealedItemCaptureMock(...args),
}))

import { GET, POST } from '@/app/api/nic-nac/trade-requests/route'
import { ServiceError } from '@/lib/services/errors'

describe('trade requests route', () => {
  beforeEach(() => {
    getAuthenticatedNicNacContextMock.mockReset()
    getPaidNicNacContextMock.mockReset()
    getAuthenticatedRepMock.mockReset()
    getTradeRequestsMock.mockReset()
    getPendingTradeRequestCountMock.mockReset()
    approveTradeMock.mockReset()
    rejectTradeMock.mockReset()
    approveTradeWithRevealedItemCaptureMock.mockReset()
  })

  it('approves a live-show swap when the revealed item number is supplied', async () => {
    getPaidNicNacContextMock.mockResolvedValueOnce({
      repId: 'rep-1',
      rep: { id: 'rep-1' },
      supabase: { marker: 'supabase' },
    })
    approveTradeWithRevealedItemCaptureMock.mockResolvedValueOnce({
      requestId: 'request-1',
      fulfillmentId: 'fulfillment-1',
      outgoingListingId: 'listing-1',
      customerName: 'Jamie',
      revealedItemNumber: 'RG12345',
      revealedDesignId: 'design-1',
      replacementListingId: 'replacement-listing-1',
      replacementStatus: 'added_to_board',
    })

    const response = await POST(
      new Request('http://localhost/api/nic-nac/trade-requests', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'approve',
          requestId: 'request-1',
          revealedItemNumber: ' rg12345 ',
          revealedRingSize: '8',
          repNotes: 'Approved from dashboard',
          verifiedOfferedFamily: 'Birthday',
          verifiedOfferedType: 'RG',
          verificationConfirmed: true,
          finalConfirmation: true,
        }),
      }),
    )

    expect(approveTradeMock).not.toHaveBeenCalled()
    expect(approveTradeWithRevealedItemCaptureMock).toHaveBeenCalledWith(
      { marker: 'admin' },
      'rep-1',
      {
        requestId: 'request-1',
        revealedItemNumber: 'rg12345',
        revealedRingSize: '8',
        repNotes: 'Approved from dashboard',
        verification: { verifiedOfferedFamily: 'Birthday', verifiedOfferedType: 'RG', verificationConfirmed: true, finalConfirmation: true },
      },
    )
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      result: {
        replacementStatus: 'added_to_board',
      },
    })
  })

  it('returns pending requests for the authenticated rep', async () => {
    getPaidNicNacContextMock.mockResolvedValueOnce({
      repId: 'rep-1',
      rep: { id: 'rep-1' },
      supabase: { marker: 'supabase' },
    })
    getTradeRequestsMock.mockResolvedValueOnce([{ id: 'request-1' }])

    const response = await GET(
      new Request(
        'http://localhost/api/nic-nac/trade-requests?status=pending&limit=12',
      ),
    )

    expect(getTradeRequestsMock).toHaveBeenCalledWith(
      { marker: 'supabase' },
      'rep-1',
      { statusFilter: 'pending', limit: 12, offset: 0, requestId: undefined },
    )
    expect(response.status).toBe(200)
  })

  it('approves a request through the fallback action when the revealed item number is skipped', async () => {
    getPaidNicNacContextMock.mockResolvedValueOnce({
      repId: 'rep-1',
      rep: { id: 'rep-1' },
      supabase: { marker: 'supabase' },
    })
    approveTradeMock.mockResolvedValueOnce({
      requestId: 'request-1',
      fulfillmentId: 'fulfillment-1',
      listingId: 'listing-1',
      customerName: 'Jamie',
    })

    const response = await POST(
      new Request('http://localhost/api/nic-nac/trade-requests', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'approve',
          requestId: 'request-1',
          repNotes: 'Approved from dashboard',
          verifiedOfferedFamily: 'OG',
          verifiedOfferedType: 'ER',
          verificationConfirmed: true,
          finalConfirmation: true,
        }),
      }),
    )

    expect(approveTradeMock).toHaveBeenCalledWith(
      { marker: 'admin' },
      'rep-1',
      'request-1',
      'Approved from dashboard',
      { verifiedOfferedFamily: 'OG', verifiedOfferedType: 'ER', verificationConfirmed: true, finalConfirmation: true },
    )
    expect(approveTradeWithRevealedItemCaptureMock).not.toHaveBeenCalled()
    expect(response.status).toBe(200)
  })

  it('rejects a request through the fallback action', async () => {
    getPaidNicNacContextMock.mockResolvedValueOnce({
      repId: 'rep-1',
      rep: { id: 'rep-1' },
      supabase: { marker: 'supabase' },
    })
    rejectTradeMock.mockResolvedValueOnce({
      requestId: 'request-2',
      listingId: 'listing-2',
      listingRestored: true,
    })

    const response = await POST(
      new Request('http://localhost/api/nic-nac/trade-requests', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'reject',
          requestId: 'request-2',
          reason: 'item_unavailable',
          repNotes: 'Not the right fit',
        }),
      }),
    )

    expect(rejectTradeMock).toHaveBeenCalledWith(
      { marker: 'admin' },
      'rep-1',
      'request-2',
      'item_unavailable',
      'Not the right fit',
      undefined,
    )
    expect(response.status).toBe(200)
  })

  it('requires a paid subscription before approving trade requests', async () => {
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
      new Request('http://localhost/api/nic-nac/trade-requests', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'approve', requestId: 'request-1' }),
      }),
    )

    expect(approveTradeMock).not.toHaveBeenCalled()
    expect(response.status).toBe(402)
    await expect(response.json()).resolves.toEqual({
      code: 'SPARKLE_SUBSCRIPTION_REQUIRED',
      error: 'Start your Sparkle Suite subscription before using workspace tools.',
    })
  })
})
