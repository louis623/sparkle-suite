import { describe, expect, it, vi } from 'vitest'
import sharp from 'sharp'

vi.mock('server-only', () => ({}))

import {
  assertTradeUploadInput,
  cleanupTradeUploadTickets,
  confirmTradeUpload,
  createTradeUploadTicket,
  TRADE_UPLOAD_MAX_BYTES,
} from '@/lib/services/trade-request-uploads'

const listingId = '8ad67c12-9840-47be-8398-c9d1445fce15'
const repId = 'fb2e6061-54e5-4919-9d05-7d13b156c265'
const submissionId = 'c09ca847-9c84-4539-8ff2-9ff49d5f718b'
const uploadId = '20eb9934-7601-40c3-ae1e-adcb42fed4d2'
const ipHash = 'a'.repeat(64)

describe('private trade request uploads', () => {
  it('accepts common phone formats and a 5.12 MiB original; rejects large and unsupported files', () => {
    for (const contentType of ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/avif']) {
      expect(assertTradeUploadInput({ listingId, submissionId, contentType, byteSize: 5_363_712 }).contentType).toBe(contentType)
    }
    expect(() => assertTradeUploadInput({ listingId, submissionId, contentType: 'image/png', byteSize: TRADE_UPLOAD_MAX_BYTES + 1 }))
      .toThrowError(expect.objectContaining({ code: 'TRADE_UPLOAD_TOO_LARGE' }))
    expect(() => assertTradeUploadInput({ listingId, submissionId, contentType: 'image/svg+xml', byteSize: 123 }))
      .toThrowError(expect.objectContaining({ code: 'TRADE_UPLOAD_UNSUPPORTED_TYPE' }))
  })

  it('creates a rep/listing/submission-bound ticket and returns only a signed upload URL', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null })
    const createSignedUploadUrl = vi.fn().mockResolvedValue({ data: { signedUrl: 'https://storage.example.test/signed?token=secret' }, error: null })
    const admin = {
      from: (table: string) => table === 'trade_listings'
        ? { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { rep_id: repId, status: 'available', quantity_available: 1 }, error: null }) }) }) }
        : { select: () => ({ eq: () => ({ gte: async () => ({ count: 0, error: null }) }) }), insert },
      storage: { from: () => ({ createSignedUploadUrl }) },
    }
    const result = await createTradeUploadTicket(admin as never, {
      listingId, submissionId, contentType: 'image/jpeg', byteSize: 5_363_712,
      ipHash, expectedRepId: repId,
    })
    expect(result).toEqual({ uploadId: expect.any(String), uploadUrl: 'https://storage.example.test/signed?token=secret' })
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      listing_id: listingId, rep_id: repId, submission_id: submissionId,
      declared_size_bytes: 5_363_712,
      raw_path: expect.stringMatching(/^staging\/fb2e6061-54e5-4919-9d05-7d13b156c265\//),
    }))
  })

  it('decodes, normalizes, strips EXIF, and stores a rep-viewable private JPEG', async () => {
    const source = await sharp({ create: { width: 1000, height: 600, channels: 3, background: '#ff4499' } })
      .jpeg().withMetadata({ orientation: 1 }).toBuffer()
    const readyAt = new Date().toISOString()
    const ticket = {
      id: uploadId, listing_id: listingId, rep_id: repId,
      submission_id: submissionId, raw_path: `staging/${repId}/${uploadId}.jpg`,
      ready_path: null, declared_content_type: 'image/jpeg', declared_size_bytes: source.length,
      ready_size_bytes: null, created_at: readyAt, ready_at: null, consumed_request_id: null,
    }
    const uploaded = vi.fn().mockResolvedValue({ error: null })
    const removed = vi.fn().mockResolvedValue({ error: null })
    const updated = vi.fn().mockResolvedValue({ error: null })
    const admin = {
      from: () => ({
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: ticket, error: null }) }) }),
        update: () => ({ eq: () => ({ is: updated }) }),
      }),
      storage: { from: () => ({
        download: async () => ({ data: new Blob([new Uint8Array(source)]), error: null }),
        upload: uploaded, remove: removed,
      }) },
    }
    const result = await confirmTradeUpload(admin as never, { uploadId, listingId, submissionId, expectedRepId: repId })
    expect(result.ready).toBe(true)
    expect(new Date(result.expiresAt).getTime() - Date.now()).toBeGreaterThan(6.9 * 86400_000)
    const [path, output, options] = uploaded.mock.calls[0] as [string, Buffer, { contentType: string }]
    expect(path).toBe(`${repId}/trade-request-uploads/${uploadId}.jpg`)
    expect(options.contentType).toBe('image/jpeg')
    const metadata = await sharp(output).metadata()
    expect(metadata.format).toBe('jpeg')
    expect(metadata.width).toBe(1000)
    expect(metadata.exif).toBeUndefined()
    expect(updated).toHaveBeenCalled()
    expect(removed).toHaveBeenCalledWith([ticket.raw_path])
  })

  it('rejects a fake image before creating a rep-viewable object', async () => {
    const bad = new TextEncoder().encode('<svg><script>alert(1)</script></svg>')
    const uploaded = vi.fn()
    const admin = {
      from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: {
        id: uploadId, listing_id: listingId, rep_id: repId, submission_id: submissionId,
        raw_path: `staging/${repId}/${uploadId}.png`, ready_path: null,
        declared_content_type: 'image/png', declared_size_bytes: bad.length,
        ready_size_bytes: null, created_at: new Date().toISOString(), ready_at: null,
        consumed_request_id: null,
      }, error: null }) }) }) }),
      storage: { from: () => ({ download: async () => ({ data: new Blob([bad]), error: null }), upload: uploaded }) },
    }
    await expect(confirmTradeUpload(admin as never, { uploadId, listingId, submissionId }))
      .rejects.toMatchObject({ code: 'TRADE_UPLOAD_UNREADABLE_IMAGE', statusCode: 415 })
    expect(uploaded).not.toHaveBeenCalled()
  })

  it('rejects cross-rep or cross-submission ticket confirmation before storage access', async () => {
    const storage = vi.fn()
    const admin = {
      from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: {
        id: uploadId, listing_id: listingId, rep_id: repId, submission_id: submissionId,
        created_at: new Date().toISOString(), consumed_request_id: null,
      }, error: null }) }) }) }),
      storage: { from: storage },
    }
    await expect(confirmTradeUpload(admin as never, { uploadId, listingId, submissionId, expectedRepId: 'b97aa3f0-d99c-42b4-b0b9-839a0339422b' }))
      .rejects.toMatchObject({ code: 'TRADE_UPLOAD_NOT_FOUND' })
    expect(storage).not.toHaveBeenCalled()
  })

  it('deletes abandoned raw and normalized objects without touching attached photos', async () => {
    const rawPath = `staging/${repId}/${uploadId}.heic`
    const readyPath = `${repId}/trade-request-uploads/${uploadId}.jpg`
    const remove = vi.fn().mockResolvedValue({ error: null })
    const deleteIds = vi.fn().mockReturnValue({ is: async () => ({ error: null }) })
    let selectIndex = 0
    const admin = {
      from: () => ({
        select: () => {
          const index = selectIndex++
          const query = {
            lt: () => query, is: () => query, not: () => query, order: () => query,
            limit: async () => ({
              data: index === 0 ? [{ id: uploadId, raw_path: rawPath, ready_path: readyPath }] : [],
              error: null,
            }),
          }
          return query
        },
        delete: () => ({ in: deleteIds }),
      }),
      storage: { from: () => ({ remove }) },
    }
    const result = await cleanupTradeUploadTickets(admin as never)
    expect(result.removed).toBe(1)
    expect(remove).toHaveBeenCalledWith([rawPath, readyPath])
    expect(deleteIds).toHaveBeenCalledWith('id', [uploadId])
  })
})
