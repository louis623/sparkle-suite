import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ServiceError, errors } from '@/lib/services/errors'

const createAdminClientMock = vi.fn(() => ({ admin: true }))
const submitTradeRequestMock = vi.fn()
const getTradeRequestNotificationSummaryMock = vi.fn()
const notifyRepOfTradeRequestMock = vi.fn()
const resolveAmethystPreviewRepMock = vi.fn()
const policy = vi.hoisted(() => vi.fn())
vi.mock('@/lib/amethyst/swap-photo-policy', () => ({readSwapPhotoPolicy:policy}))
vi.mock('@/lib/amethyst/trade-board-listings', () => ({loadAmethystTradeBoardPreviewListings: async () => []}))
import { GET as board } from '@/app/api/amethyst/trade-board/route'
import { GET as statusRoute } from '@/app/api/amethyst/trade-requests/status/route'
const receiptStatus=vi.hoisted(()=>vi.fn())

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => createAdminClientMock(),
}))

vi.mock('@/lib/services/trade-requests', () => ({
  TRADE_REQUEST_CUSTOMER_NAME_MAX_LENGTH: 100,
  TRADE_REQUEST_DESCRIPTION_MAX_LENGTH: 1000,
  TRADE_REQUEST_OFFERED_FAMILY_MAX_LENGTH: 100,
  getTradeRequestReceiptStatus: receiptStatus,
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
    policy.mockResolvedValue({required:false,photoOptionalUntil:"2099-01-01"})
    receiptStatus.mockReset()
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY","synthetic")
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
          'content-type': 'application/json', 'x-vercel-forwarded-for': '192.0.2.1',
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
    submitTradeRequestMock.mockResolvedValueOnce({outcome:'absent'}).mockResolvedValueOnce({ requestId: 'request-1', listingId: 'listing-1' })
    getTradeRequestNotificationSummaryMock.mockResolvedValueOnce(null)
    const response = await POST(new Request('https://www.yoursparklesuite.com/api/amethyst/trade-requests?publicSiteSlug=louisfizzfest', {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-vercel-forwarded-for': '192.0.2.1' },
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
    submitTradeRequestMock.mockResolvedValueOnce({outcome:'absent'}).mockRejectedValueOnce(new ServiceError({
      code: 'TRADE_UPLOAD_NOT_READY', message: 'Ticket not ready',
      userMessage: 'The photo is not attached yet. Try attaching your photo again.',
      statusCode: 409,
    }))
    const response = await POST(new Request('https://www.yoursparklesuite.com/api/amethyst/trade-requests', {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-vercel-forwarded-for': '192.0.2.1' },
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
          'content-type': 'application/json', 'x-vercel-forwarded-for': '192.0.2.1',
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
          'content-type': 'application/json', 'x-vercel-forwarded-for': '192.0.2.1',
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
          'content-type': 'application/json', 'x-vercel-forwarded-for': '192.0.2.1',
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
      error: 'That piece already has a pending swap request.',
    })
  })

  it('returns 400 for malformed JSON bodies', async () => {
    const response = await POST(
      new Request('http://localhost/api/amethyst/trade-requests', {
        method: 'POST',
        headers: {
          'content-type': 'application/json', 'x-vercel-forwarded-for': '192.0.2.1',
        },
        body: '{invalid',
      }),
    )

    expect(submitTradeRequestMock).not.toHaveBeenCalled()
    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: 'Invalid swap request.',
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
      headers: { 'content-type': 'application/json', 'x-vercel-forwarded-for': '192.0.2.1' },
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
        headers: { 'content-type': 'application/json', 'x-vercel-forwarded-for': '192.0.2.1' },
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
          'content-type': 'application/json', 'x-vercel-forwarded-for': '192.0.2.1',
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

  it('recovers the original receipt before applying a closed photo window', async () => {
    policy.mockResolvedValue({required:true,photoOptionalUntil:null})
    const payload = { listingId:'listing-1', customerName:'Jamie', submissionId:'00000000-0000-4000-8000-000000000001', intent:'retry' }
    submitTradeRequestMock.mockResolvedValueOnce({requestId:'request-1',listingId:'listing-1',mutationReplayed:true})
    const post = () => POST(new Request('http://localhost/api/amethyst/trade-requests',{method:'POST',headers:{'content-type':'application/json','x-vercel-forwarded-for':'192.0.2.4'},body:JSON.stringify(payload)}))
    expect((await post()).status).toBe(201)
    expect(submitTradeRequestMock.mock.calls[0][1].intent).toBe('recover')
    submitTradeRequestMock.mockResolvedValueOnce({outcome:'absent'}).mockResolvedValueOnce({outcome:'abandoned'})
    expect(await (await post()).json()).toMatchObject({code:'PHOTO_REQUIRED',attemptClosed:true})
  })

  const retryPost = () => POST(new Request('http://localhost/api/amethyst/trade-requests',{
    method:'POST',headers:{'content-type':'application/json','x-vercel-forwarded-for':'192.0.2.11'},
    body:JSON.stringify({intent:'retry',submissionId:'00000000-0000-4000-8000-000000000001',listingId:'listing-1',customerName:'Jamie'}),
  }))
  const saved = {requestId:'request-1',listingId:'listing-1',receiptUrl:'/trade-request/status/'+'a'.repeat(64)}

  it('returns the delayed original receipt when it wins the lock before a rejected Retry can close it',async()=>{
    policy.mockResolvedValue({required:true,photoOptionalUntil:null})
    submitTradeRequestMock.mockResolvedValueOnce({outcome:'absent'}).mockResolvedValueOnce({...saved,mutationReplayed:true})
    getTradeRequestNotificationSummaryMock.mockResolvedValue({requestId:'request-1'})
    const response=await retryPost()
    expect(response.status).toBe(201)
    expect(await response.json()).toMatchObject(saved)
    expect(submitTradeRequestMock.mock.calls.map(call=>call[1].intent)).toEqual(['recover','abandon'])
    expect(notifyRepOfTradeRequestMock).toHaveBeenCalledTimes(1)
  })

  it('closes the frozen identity before a failed explicit retry allows a corrected attempt',async()=>{
    const failure=new ServiceError({code:'MANUAL_REVIEW_REQUIRED',message:'manual review required',statusCode:409})
    submitTradeRequestMock.mockResolvedValueOnce({outcome:'absent'}).mockRejectedValueOnce(failure).mockResolvedValueOnce({outcome:'abandoned'})
    const response=await retryPost()
    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({code:'MANUAL_REVIEW_REQUIRED',attemptClosed:true})
    expect(submitTradeRequestMock.mock.calls.map(call=>call[1].intent)).toEqual(['recover','retry','abandon'])
    expect(notifyRepOfTradeRequestMock).not.toHaveBeenCalled()
  })

  it('explicitly retries a never-delivered POST and keeps a transient failure uncertain',async()=>{
    submitTradeRequestMock.mockResolvedValueOnce({outcome:'absent'}).mockRejectedValueOnce(
      new ServiceError({code:'TEMPORARILY_UNAVAILABLE',message:'Reconnect',statusCode:503}))
    const failed=await retryPost()
    expect(failed.status).toBe(503)
    expect(await failed.json()).not.toHaveProperty('attemptClosed')
    submitTradeRequestMock.mockResolvedValueOnce({outcome:'absent'}).mockResolvedValueOnce(saved)
    getTradeRequestNotificationSummaryMock.mockResolvedValue({requestId:'request-1'})
    const committed=await retryPost()
    expect(await committed.json()).toMatchObject(saved)
    expect(submitTradeRequestMock.mock.calls.map(call=>call[1].intent)).toEqual(['recover','retry','recover','retry'])
    expect(notifyRepOfTradeRequestMock).toHaveBeenCalledTimes(1)
  })

  it('requests the additive expiry projection for the private bearer route, retaining its historical fields',async()=>{
    const token='a'.repeat(64)
    const old={status:'denied',denialExplanation:'That dancer is unavailable.',updatedAt:'2026-09-23'}
    receiptStatus.mockResolvedValue({...old,photoExpired:true})
    const result=await statusRoute(new Request('http://localhost/api/amethyst/trade-requests/status?token='+token))
    expect(receiptStatus).toHaveBeenCalledWith({admin:true},token,true)
    expect(await result.json()).toEqual({...old,photoExpired:true})
    expect(result.headers.get('cache-control')).toContain('no-store')
  })

  it('preserves the default board and only publishes policy for the opt-in poll',async()=>{
    expect(await (await board(new Request('https://example.test/api/amethyst/trade-board'))).json()).toEqual({listings:[]})
    expect(await (await board(new Request('https://example.test/api/amethyst/trade-board?photoPolicy=1'))).json()).toEqual({listings:[],photoPolicy:{required:false,photoOptionalUntil:'2099-01-01'}})
  })

  it('rejects a cross-origin write before admin access',async()=>{
    const response = await POST(new Request('https://example.test/api/amethyst/trade-requests',{method:'POST',headers:{origin:'https://another.test','content-type':'application/json'},body:'{}'}))
    expect(response.status).toBe(403)
    expect(createAdminClientMock).not.toHaveBeenCalled()
  })
})
