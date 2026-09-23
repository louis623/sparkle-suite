import { beforeEach, describe, expect, it, vi } from 'vitest'

const createAdminClientMock = vi.fn(() => ({ admin: true }))
const resolveAmethystPreviewRepMock = vi.fn()
const createTradeUploadTicketMock = vi.fn()
const confirmTradeUploadMock = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => createAdminClientMock() }))
vi.mock('@/lib/amethyst/preview-rep', () => ({
  resolveAmethystPreviewRep: (...args: unknown[]) => resolveAmethystPreviewRepMock(...args),
}))
vi.mock('@/lib/services/trade-request-uploads', () => ({
  tradeUploadIpHash: () => 'a'.repeat(64),
  createTradeUploadTicket: (...args: unknown[]) => createTradeUploadTicketMock(...args),
  confirmTradeUpload: (...args: unknown[]) => confirmTradeUploadMock(...args),
}))

import { POST as ticketPOST } from '@/app/api/amethyst/trade-requests/uploads/route'
import { POST as confirmPOST } from '@/app/api/amethyst/trade-requests/uploads/confirm/route'

const url = 'https://www.yoursparklesuite.com/api/amethyst/trade-requests/uploads?publicSiteSlug=louisfizzfest'
const base = {
  listingId: '8ad67c12-9840-47be-8398-c9d1445fce15',
  submissionId: 'c09ca847-9c84-4539-8ff2-9ff49d5f718b',
}

describe('customer direct trade image routes', () => {
  beforeEach(() => {
    resolveAmethystPreviewRepMock.mockReset()
    createTradeUploadTicketMock.mockReset()
    confirmTradeUploadMock.mockReset()
    createAdminClientMock.mockClear()
    resolveAmethystPreviewRepMock.mockResolvedValue({ id: 'rep-1' })
  })

  it('prepares a signed upload scoped to the customer site rep', async () => {
    createTradeUploadTicketMock.mockResolvedValue({ uploadId: 'ticket-1', uploadUrl: 'https://storage.example.test/signed' })
    const response = await ticketPOST(new Request(url, {
      method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://www.yoursparklesuite.com' },
      body: JSON.stringify({ ...base, contentType: 'image/heic', byteSize: 5_363_712 }),
    }))
    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({ uploadId: 'ticket-1', uploadUrl: 'https://storage.example.test/signed' })
    expect(createTradeUploadTicketMock).toHaveBeenCalledWith({ admin: true }, expect.objectContaining({
      ...base, contentType: 'image/heic', byteSize: 5_363_712, expectedRepId: 'rep-1',
    }))
  })

  it('confirms the exact ticket, listing, and submission identity', async () => {
    confirmTradeUploadMock.mockResolvedValue({ ready: true, expiresAt: '2026-09-30T12:00:00.000Z' })
    const response = await confirmPOST(new Request('https://www.yoursparklesuite.com/api/amethyst/trade-requests/uploads/confirm?publicSiteSlug=louisfizzfest', {
      method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://www.yoursparklesuite.com' },
      body: JSON.stringify({ ...base, uploadId: '20eb9934-7601-40c3-ae1e-adcb42fed4d2' }),
    }))
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ ready: true })
    expect(confirmTradeUploadMock).toHaveBeenCalledWith({ admin: true }, expect.objectContaining({
      ...base, uploadId: '20eb9934-7601-40c3-ae1e-adcb42fed4d2', expectedRepId: 'rep-1',
    }))
  })

  it('rejects cross-origin ticket issuance before touching storage', async () => {
    const response = await ticketPOST(new Request(url, {
      method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://other.example.test' },
      body: JSON.stringify({ ...base, contentType: 'image/jpeg', byteSize: 100 }),
    }))
    expect(response.status).toBe(403)
    expect(createAdminClientMock).not.toHaveBeenCalled()
  })
})
