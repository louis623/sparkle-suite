import { beforeEach, describe, expect, it, vi } from 'vitest'

const getAuthenticatedNicNacContextMock = vi.fn()
const getFulfillmentLogPageMock = vi.fn()
const updateFulfillmentStatusMock = vi.fn()

vi.mock('@/lib/nic-nac/auth', () => ({
  AuthError: class AuthError extends Error {},
  getAuthenticatedNicNacContext: (...args: unknown[]) =>
    getAuthenticatedNicNacContextMock(...args),
  getPaidNicNacContext: (...args: unknown[]) =>
    getAuthenticatedNicNacContextMock(...args),
}))

vi.mock('@/lib/services/trade-fulfillment', () => ({
  getFulfillmentLogPage: (...args: unknown[]) => getFulfillmentLogPageMock(...args),
  updateFulfillmentStatus: (...args: unknown[]) =>
    updateFulfillmentStatusMock(...args),
}))

import { GET, POST } from '@/app/api/nic-nac/fulfillment-queue/route'

describe('fulfillment queue route', () => {
  beforeEach(() => {
    getAuthenticatedNicNacContextMock.mockReset()
    getFulfillmentLogPageMock.mockReset()
    updateFulfillmentStatusMock.mockReset()
  })

  it('returns the authenticated rep fulfillment queue', async () => {
    getAuthenticatedNicNacContextMock.mockResolvedValueOnce({
      repId: 'rep-1',
      rep: { id: 'rep-1' },
      supabase: { marker: 'supabase' },
    })
    getFulfillmentLogPageMock.mockResolvedValueOnce({ items: [{ fulfillmentId: 'ful-1' }], total: 1, totalOpen: 1, page: 1, pageSize: 10 })

    const response = await GET(new Request('http://localhost/api/nic-nac/fulfillment-queue?filter=open&page=1'))

    expect(getFulfillmentLogPageMock).toHaveBeenCalledWith(
      { marker: 'supabase' },
      'rep-1',
      'open',
      1,
    )
    expect(response.status).toBe(200)
  })

  it('updates fulfillment status from the dashboard fallback action', async () => {
    getAuthenticatedNicNacContextMock.mockResolvedValueOnce({
      repId: 'rep-1',
      rep: { id: 'rep-1' },
      supabase: { marker: 'supabase' },
    })
    updateFulfillmentStatusMock.mockResolvedValueOnce({
      fulfillmentId: 'ful-1',
      requestId: 'request-1',
      previousStatus: 'approved',
      status: 'shipped',
      completedAt: null,
      shouldPromptAddToBoard: false,
    })

    const response = await POST(
      new Request('http://localhost/api/nic-nac/fulfillment-queue', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          requestId: 'request-1',
          nextStatus: 'shipped',
          shippingNotes: 'Dropped at USPS',
        }),
      }),
    )

    expect(updateFulfillmentStatusMock).toHaveBeenCalledWith(
      { marker: 'supabase' },
      'rep-1',
      {
        requestId: 'request-1',
        nextStatus: 'shipped',
        shippingNotes: 'Dropped at USPS',
        addToBoard: false,
      },
    )
    expect(response.status).toBe(200)
  })
})
