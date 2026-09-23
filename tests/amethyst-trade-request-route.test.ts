import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ServiceError, errors } from '@/lib/services/errors'

const createAdminClientMock = vi.fn(() => ({ admin: true }))
const submitTradeRequestMock = vi.fn()
const getTradeRequestNotificationSummaryMock = vi.fn()
const notifyRepOfTradeRequestMock = vi.fn()
const resolveAmethystPreviewRepMock = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => createAdminClientMock(),
}))

vi.mock('@/lib/services/trade-requests', () => ({
  TRADE_REQUEST_CUSTOMER_NAME_MAX_LENGTH: 100,
  TRADE_REQUEST_DESCRIPTION_MAX_LENGTH: 1000,
  TRADE_REQUEST_OFFERED_FAMILY_MAX_LENGTH: 100,
  submitTradeRequest: (...args: unknown[]) => submitTradeRequestMock(...args),
  getTradeRequestNotificationSummary: (...args: unknown[]) =>
    getTradeRequestNotificationSummaryMock(...args),
}))

vi.mock('@/lib/nic-nac/trade-request-notifications', () => ({
  notifyRepOfTradeRequest: (...args: unknown[]) =>
    notifyRepOfTradeRequestMock(...args),
}))

vi.mock('@/lib/amethyst/preview-rep', () => ({
  resolveAmethystPreviewRep: (...args: unknown[]) =>
    resolveAmethystPreviewRepMock(...args),
}))

import { resetTradeRequestRateLimitsForTests } from '@/lib/amethyst/trade-request-rate-limit'
import { POST } from '@/app/api/amethyst/trade-requests/route'

describe('POST /api/amethyst/trade-requests', () => {
  beforeEach(() => {
    createAdminClientMock.mockClear()
    submitTradeRequestMock.mockReset()
    getTradeRequestNotificationSummaryMock.mockReset()
    notifyRepOfTradeRequestMock.mockReset()
    resolveAmethystPreviewRepMock.mockReset()
    resetTradeRequestRateLimitsForTests()
  })

  it('submits the request through the trade-request service and returns 201', async () => {
    submitTradeRequestMock.mockResolvedValueOnce({
      requestId: 'request-1',
      listingId: 'listing-1',
    })
    getTradeRequestNotificationSummaryMock.mockResolvedValueOnce({
      requestId: 'request-1',
      repId: 'rep-1',
      customerName: 'Jamie',
      customerDescription: 'Birthday ring, size 8',
      listing: {
        id: 'listing-1',
        itemNumber: 'RG31452',
        designName: 'Celeste Ring',
        collectionName: 'Birthday',
        typePrefix: 'RG',
        bpMsrp: 128,
      },
    })

    const response = await POST(
      new Request('http://localhost/api/amethyst/trade-requests', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          listingId: 'listing-1',
          customerName: 'Jamie',
          customerDescription: 'Birthday ring, size 8',
        }),
      }),
    )

    expect(createAdminClientMock).toHaveBeenCalledTimes(1)
    expect(submitTradeRequestMock).toHaveBeenCalledWith(
      { admin: true },
      expect.objectContaining({
        listingId: 'listing-1',
        customerName: 'Jamie',
        customerDescription: 'Birthday ring, size 8',
      }),
    )
    expect(getTradeRequestNotificationSummaryMock).toHaveBeenCalledWith(
      { admin: true },
      'request-1',
    )
    expect(notifyRepOfTradeRequestMock).toHaveBeenCalledWith(
      { admin: true },
      expect.objectContaining({
        requestId: 'request-1',
        customerName: 'Jamie',
      }),
    )
    expect(response.status).toBe(201)
    await expect(response.json()).resolves.toEqual({
      requestId: 'request-1',
      listingId: 'listing-1',
    })
  })

  it('submits a confirmed direct-upload ticket with the same request identity', async () => {
    resolveAmethystPreviewRepMock.mockResolvedValueOnce({ id: 'rep-louis', email: 'louis@example.test' })
    submitTradeRequestMock.mockResolvedValueOnce({ requestId: 'request-1', listingId: 'listing-1' })
    getTradeRequestNotificationSummaryMock.mockResolvedValueOnce(null)
    const response = await POST(new Request('https://www.yoursparklesuite.com/api/amethyst/trade-requests?publicSiteSlug=louisfizzfest', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        listingId: 'listing-1', customerName: 'Jamie', customerDescription: 'OG earrings',
        submissionId: '00000000-0000-4000-8000-000000000001',
        uploadId: '00000000-0000-4000-8000-000000000002',
      }),
    }))
    expect(response.status).toBe(201)
    expect(submitTradeRequestMock).toHaveBeenCalledWith({ admin: true }, expect.objectContaining({
      expectedRepId: 'rep-louis',
      submissionId: '00000000-0000-4000-8000-000000000001',
      uploadId: '00000000-0000-4000-8000-000000000002',
    }))
  })

  it('rejects legacy multipart images before creating a request', async () => {
    const form = new FormData()
    form.set('listingId', 'listing-1')
    form.set('revealScreenshot', new File(['photo'], 'reveal.png', { type: 'image/png' }))
    const response = await POST(new Request('https://www.yoursparklesuite.com/api/amethyst/trade-requests', {
      method: 'POST', body: form,
    }))
    expect(response.status).toBe(415)
    expect(submitTradeRequestMock).not.toHaveBeenCalled()
  })

  it('does not claim success when the attached ticket cannot be committed', async () => {
    submitTradeRequestMock.mockRejectedValueOnce(new ServiceError({
      code: 'TRADE_UPLOAD_NOT_READY', message: 'Ticket not ready',
      userMessage: 'The photo is not attached yet. Try the upload again, or remove it and send a text-only request.',
      statusCode: 409,
    }))
    const response = await POST(new Request('https://www.yoursparklesuite.com/api/amethyst/trade-requests', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ listingId: 'listing-1', customerName: 'Jamie', customerDescription: 'OG earrings',
        submissionId: '00000000-0000-4000-8000-000000000001', uploadId: '00000000-0000-4000-8000-000000000002' }),
    }))
    expect(response.status).toBe(409)
    expect(getTradeRequestNotificationSummaryMock).not.toHaveBeenCalled()
    expect(await response.json()).toMatchObject({ code: 'TRADE_UPLOAD_NOT_READY' })
  })

  it('binds customer-site trade requests to the resolved public site rep', async () => {
    resolveAmethystPreviewRepMock.mockResolvedValueOnce({
      id: 'rep-louis',
      email: 'louis@example.test',
    })
    submitTradeRequestMock.mockResolvedValueOnce({
      requestId: 'request-1',
      listingId: 'listing-1',
    })
    getTradeRequestNotificationSummaryMock.mockResolvedValueOnce(null)

    const response = await POST(
      new Request('https://www.yoursparklesuite.com/api/amethyst/trade-requests', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          referer: 'https://www.yoursparklesuite.com/LouisFizzFest/trade',
        },
        body: JSON.stringify({
          listingId: 'listing-1',
          customerName: 'Jamie',
          customerDescription: 'Birthday ring, size 8',
        }),
      }),
    )

    expect(resolveAmethystPreviewRepMock).toHaveBeenCalledWith(
      { admin: true },
      expect.objectContaining({
        publicSiteSlug: 'louisfizzfest',
        repId: null,
      }),
    )
    expect(submitTradeRequestMock).toHaveBeenCalledWith(
      { admin: true },
      expect.objectContaining({
        expectedRepId: 'rep-louis',
        listingId: 'listing-1',
      }),
    )
    expect(response.status).toBe(201)
  })

  it('still returns 201 when the Nic-Nac notification follow-up fails', async () => {
    submitTradeRequestMock.mockResolvedValueOnce({
      requestId: 'request-1',
      listingId: 'listing-1',
    })
    getTradeRequestNotificationSummaryMock.mockResolvedValueOnce({
      requestId: 'request-1',
      repId: 'rep-1',
      customerName: 'Jamie',
      customerDescription: 'Birthday ring, size 8',
      listing: {
        id: 'listing-1',
        itemNumber: 'RG31452',
        designName: 'Celeste Ring',
        collectionName: 'Birthday',
        typePrefix: 'RG',
        bpMsrp: 128,
      },
    })
    notifyRepOfTradeRequestMock.mockRejectedValueOnce(
      new Error('notification insert failed'),
    )

    const response = await POST(
      new Request('http://localhost/api/amethyst/trade-requests', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          listingId: 'listing-1',
          customerName: 'Jamie',
          customerDescription: 'Birthday ring, size 8',
        }),
      }),
    )

    expect(response.status).toBe(201)
    await expect(response.json()).resolves.toEqual({
      requestId: 'request-1',
      listingId: 'listing-1',
    })
  })

  it('maps ServiceError responses to the right status and customer-safe message', async () => {
    submitTradeRequestMock.mockRejectedValueOnce(errors.REQUEST_ALREADY_EXISTS())

    const response = await POST(
      new Request('http://localhost/api/amethyst/trade-requests', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          listingId: 'listing-1',
          customerName: 'Jamie',
          customerDescription: 'Birthday ring, size 8',
        }),
      }),
    )

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toEqual({
      code: 'REQUEST_ALREADY_EXISTS',
      error: 'That piece already has a pending trade request.',
    })
  })

  it('returns 400 for malformed JSON bodies', async () => {
    const response = await POST(
      new Request('http://localhost/api/amethyst/trade-requests', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: '{invalid',
      }),
    )

    expect(submitTradeRequestMock).not.toHaveBeenCalled()
    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: 'Invalid request payload.',
    })
  })

  it('requires a supported content type and rejects streamed oversized JSON', async () => {
    const unsupported = await POST(
      new Request('http://localhost/api/amethyst/trade-requests', {
        method: 'POST',
        headers: { 'content-type': 'text/plain' },
        body: '{}',
      }),
    )
    expect(unsupported.status).toBe(415)

    const oversizedRequest = new Request('http://localhost/api/amethyst/trade-requests', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ padding: 'x'.repeat(17_000) }),
    })
    expect(oversizedRequest.headers.get('content-length')).toBeNull()
    const oversized = await POST(oversizedRequest)
    expect(oversized.status).toBe(413)
    expect(submitTradeRequestMock).not.toHaveBeenCalled()
  })

  it('rejects oversized customer text before creating an admin client', async () => {
    const response = await POST(
      new Request('http://localhost/api/amethyst/trade-requests', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          listingId: 'listing-1',
          customerName: 'x'.repeat(101),
          customerDescription: 'Birthday ring',
        }),
      }),
    )
    expect(response.status).toBe(400)
    expect(createAdminClientMock).not.toHaveBeenCalled()
    expect(submitTradeRequestMock).not.toHaveBeenCalled()
  })

  it('throttles repeated requests per client and listing', async () => {
    submitTradeRequestMock.mockResolvedValue({
      requestId: 'request-1',
      listingId: 'listing-1',
    })
    getTradeRequestNotificationSummaryMock.mockResolvedValue(null)
    const makeRequest = () =>
      new Request('http://localhost/api/amethyst/trade-requests', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': '203.0.113.9',
        },
        body: JSON.stringify({
          listingId: 'listing-1',
          customerName: 'Jamie',
          customerDescription: 'Birthday ring',
        }),
      })

    for (let index = 0; index < 5; index += 1) {
      expect((await POST(makeRequest())).status).toBe(201)
    }
    const response = await POST(makeRequest())
    expect(response.status).toBe(429)
    expect(response.headers.get('retry-after')).toBe('60')
    expect(submitTradeRequestMock).toHaveBeenCalledTimes(5)
  })
})
