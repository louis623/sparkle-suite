import 'server-only'

import { createHmac, randomUUID } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import sharp from 'sharp'

import { ServiceError } from '@/lib/services/errors'

export const TRADE_UPLOAD_BUCKET = 'trade-request-screenshots'
export const TRADE_UPLOAD_MAX_BYTES = 25 * 1024 * 1024
export const TRADE_UPLOAD_RETENTION_DAYS = 7
const TICKET_HOURS = 2
const MAX_INPUT_PIXELS = 50_000_000
const MAX_OUTPUT_DIMENSION = 3000
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const CONTENT_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'image/avif': 'avif',
}

type Ticket = {
  id: string
  listing_id: string
  rep_id: string
  submission_id: string
  raw_path: string
  ready_path: string | null
  declared_content_type: string
  declared_size_bytes: number
  ready_size_bytes: number | null
  created_at: string
  ready_at: string | null
  consumed_request_id: string | null
}

function failure(code: string, userMessage: string, statusCode: number, cause?: unknown) {
  return new ServiceError({ code, message: userMessage, userMessage, statusCode, cause })
}

export function assertTradeUploadInput(input: {
  listingId: string
  submissionId: string
  contentType: string
  byteSize: number
}) {
  if (!UUID.test(input.listingId) || !UUID.test(input.submissionId)) {
    throw failure('TRADE_UPLOAD_INVALID_REQUEST', 'Refresh the trade form and try the photo again.', 400)
  }
  const contentType = input.contentType.trim().toLowerCase()
  if (!CONTENT_TYPES[contentType]) {
    throw failure('TRADE_UPLOAD_UNSUPPORTED_TYPE', 'Choose a JPEG, PNG, WebP, HEIC, HEIF, or AVIF image.', 415)
  }
  if (!Number.isInteger(input.byteSize) || input.byteSize < 1 || input.byteSize > TRADE_UPLOAD_MAX_BYTES) {
    throw failure('TRADE_UPLOAD_TOO_LARGE', 'Choose an image smaller than 25 MB.', 413)
  }
  return { ...input, contentType }
}

export function tradeUploadIpHash(address: string): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret) throw failure('TRADE_UPLOAD_UNAVAILABLE', 'Photo upload is temporarily unavailable.', 503)
  return createHmac('sha256', secret).update(`trade-upload-ip:v1:${address}`).digest('hex')
}

export async function createTradeUploadTicket(admin: SupabaseClient, input: {
  listingId: string
  submissionId: string
  contentType: string
  byteSize: number
  ipHash: string
  expectedRepId?: string | null
}) {
  const parsed = assertTradeUploadInput(input)
  if (!/^[a-f0-9]{64}$/.test(input.ipHash)) {
    throw failure('TRADE_UPLOAD_INVALID_REQUEST', 'Refresh the trade form and try the photo again.', 400)
  }
  const listing = await admin.from('trade_listings')
    .select('id, rep_id, status, quantity_available')
    .eq('id', parsed.listingId).maybeSingle()
  if (listing.error) throw listing.error
  if (!listing.data || listing.data.status !== 'available' ||
      Number(listing.data.quantity_available ?? 0) < 1 ||
      (input.expectedRepId && listing.data.rep_id !== input.expectedRepId)) {
    throw failure('TRADE_UPLOAD_LISTING_UNAVAILABLE', 'That dancer is no longer available. Refresh the Dance Floor.', 404)
  }
  const cutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const recent = await admin.from('trade_request_upload_tickets')
    .select('id', { count: 'exact', head: true })
    .eq('request_ip_hash', input.ipHash).gte('created_at', cutoff)
  if (recent.error) throw recent.error
  if ((recent.count ?? 0) >= 20) {
    throw failure('TRADE_UPLOAD_RATE_LIMITED', 'Too many photo attempts. Please try again later.', 429)
  }

  const id = randomUUID()
  const rawPath = `staging/${listing.data.rep_id}/${id}.${CONTENT_TYPES[parsed.contentType]}`
  const inserted = await admin.from('trade_request_upload_tickets').insert({
    id,
    listing_id: parsed.listingId,
    rep_id: listing.data.rep_id,
    submission_id: parsed.submissionId,
    request_ip_hash: input.ipHash,
    raw_path: rawPath,
    declared_content_type: parsed.contentType,
    declared_size_bytes: parsed.byteSize,
  })
  if (inserted.error) throw inserted.error
  const signed = await admin.storage.from(TRADE_UPLOAD_BUCKET).createSignedUploadUrl(rawPath)
  if (signed.error || !signed.data?.signedUrl) {
    await admin.from('trade_request_upload_tickets').delete().eq('id', id)
    throw failure('TRADE_UPLOAD_UNAVAILABLE', 'Photo upload is temporarily unavailable. Please try again.', 503, signed.error)
  }
  return { uploadId: id, uploadUrl: signed.data.signedUrl }
}

async function findTicket(admin: SupabaseClient, input: {
  uploadId: string
  listingId: string
  submissionId: string
  expectedRepId?: string | null
}): Promise<Ticket> {
  if (!UUID.test(input.uploadId) || !UUID.test(input.listingId) || !UUID.test(input.submissionId)) {
    throw failure('TRADE_UPLOAD_INVALID_REQUEST', 'Refresh the trade form and try the photo again.', 400)
  }
  const result = await admin.from('trade_request_upload_tickets').select('*')
    .eq('id', input.uploadId).maybeSingle()
  if (result.error) throw result.error
  const ticket = result.data as Ticket | null
  if (!ticket || ticket.listing_id !== input.listingId ||
      ticket.submission_id !== input.submissionId ||
      (input.expectedRepId && ticket.rep_id !== input.expectedRepId)) {
    throw failure('TRADE_UPLOAD_NOT_FOUND', 'This photo upload is no longer available. Choose the photo again.', 404)
  }
  if (ticket.consumed_request_id) {
    throw failure('TRADE_UPLOAD_ALREADY_USED', 'This photo was already sent with a trade request.', 409)
  }
  if (Date.now() - new Date(ticket.created_at).getTime() > TICKET_HOURS * 60 * 60 * 1000) {
    throw failure('TRADE_UPLOAD_EXPIRED', 'This photo upload expired. Choose the photo again.', 409)
  }
  return ticket
}

export async function confirmTradeUpload(admin: SupabaseClient, input: {
  uploadId: string
  listingId: string
  submissionId: string
  expectedRepId?: string | null
}) {
  const ticket = await findTicket(admin, input)
  if (ticket.ready_at && ticket.ready_path && ticket.ready_size_bytes) {
    return readyResult(ticket.ready_at)
  }
  const bucket = admin.storage.from(TRADE_UPLOAD_BUCKET)
  const downloaded = await bucket.download(ticket.raw_path)
  if (downloaded.error || !downloaded.data) {
    throw failure('TRADE_UPLOAD_MISSING', 'The photo did not finish uploading. Please try again.', 409, downloaded.error)
  }
  if (downloaded.data.size !== ticket.declared_size_bytes ||
      downloaded.data.size < 1 || downloaded.data.size > TRADE_UPLOAD_MAX_BYTES) {
    throw failure('TRADE_UPLOAD_SIZE_MISMATCH', 'The photo upload was incomplete. Please try again.', 409)
  }
  const inputBuffer = Buffer.from(await downloaded.data.arrayBuffer())
  let output: Buffer
  try {
    const metadata = await sharp(inputBuffer, { limitInputPixels: MAX_INPUT_PIXELS, animated: false }).metadata()
    // Multi-image HEIC files can include a thumbnail or Live Photo companion.
    // Use the primary image; do not reject ordinary phone captures for that.
    if (!metadata.width || !metadata.height || (metadata.pages ?? 1) > 12 ||
        metadata.width * metadata.height > MAX_INPUT_PIXELS ||
        !['jpeg', 'png', 'webp', 'heif', 'avif'].includes(metadata.format ?? '')) {
      throw new Error('unsupported image contents')
    }
    // Sharp's bundled libvips decodes AVIF but does not include the HEVC
    // decoder needed for common iPhone HEIC files. Decode those with libheif's
    // JS build, then let Sharp rotate, resize, and strip private EXIF metadata.
    const isHeic = metadata.format === 'heif' &&
      /heic|heix|hevc|hevx/.test(inputBuffer.subarray(8, 36).toString('ascii')) &&
      ticket.declared_content_type !== 'image/avif'
    let readableInput = inputBuffer
    if (isHeic) {
      const { default: convertHeic } = await import('heic-convert')
      readableInput = Buffer.from(await convertHeic({ buffer: inputBuffer, format: 'JPEG', quality: 0.94 }))
    }
    output = await sharp(readableInput, { limitInputPixels: MAX_INPUT_PIXELS, animated: false })
      .rotate()
      .resize({ width: MAX_OUTPUT_DIMENSION, height: MAX_OUTPUT_DIMENSION, fit: 'inside', withoutEnlargement: true })
      .flatten({ background: '#ffffff' })
      .jpeg({ quality: 88, mozjpeg: true })
      .toBuffer()
  } catch (cause) {
    throw failure('TRADE_UPLOAD_UNREADABLE_IMAGE', 'This image could not be opened. Try a screenshot or a JPEG/PNG copy.', 415, cause)
  }
  if (output.byteLength < 1 || output.byteLength > TRADE_UPLOAD_MAX_BYTES) {
    throw failure('TRADE_UPLOAD_TOO_LARGE', 'This photo could not be prepared under 25 MB. Try a smaller copy.', 413)
  }
  const readyPath = `${ticket.rep_id}/trade-request-uploads/${ticket.id}.jpg`
  const uploaded = await bucket.upload(readyPath, output, { contentType: 'image/jpeg', upsert: false })
  if (uploaded.error) {
    // A duplicated confirm can race with the first one. The immutable final
    // path prevents overwrite; wait briefly for the winning confirm to record
    // readiness so the second caller receives the same successful result.
    if (/already exists|resource exists/i.test(uploaded.error.message)) {
      for (let attempt = 0; attempt < 4; attempt += 1) {
        const latest = await admin.from('trade_request_upload_tickets')
          .select('ready_at').eq('id', ticket.id).maybeSingle()
        if (latest.error) break
        if (latest.data?.ready_at) return readyResult(latest.data.ready_at)
        await new Promise((resolve) => setTimeout(resolve, 150))
      }
    }
    throw failure('TRADE_UPLOAD_UNAVAILABLE', 'The photo could not be saved. Please try again.', 503, uploaded.error)
  }
  const readyAt = new Date().toISOString()
  const updated = await admin.from('trade_request_upload_tickets').update({
    ready_path: readyPath,
    ready_size_bytes: output.byteLength,
    ready_at: readyAt,
  }).eq('id', ticket.id).is('ready_at', null)
  if (updated.error) {
    await bucket.remove([readyPath])
    throw updated.error
  }
  // The validated JPEG is the only object the rep can see. Cleanup retries a
  // failed staging removal later without losing the confirmed attachment.
  const removed = await bucket.remove([ticket.raw_path])
  if (removed.error) console.error('[trade-upload] staging cleanup failed', removed.error)
  return readyResult(readyAt)
}

function readyResult(readyAt: string) {
  return {
    ready: true as const,
    expiresAt: new Date(new Date(readyAt).getTime() + TRADE_UPLOAD_RETENTION_DAYS * 86400_000).toISOString(),
  }
}

export async function cleanupTradeUploadTickets(admin: SupabaseClient, now = new Date()) {
  const stale = new Date(now.getTime() - TICKET_HOURS * 3600_000).toISOString()
  const old = new Date(now.getTime() - TRADE_UPLOAD_RETENTION_DAYS * 86400_000).toISOString()
  let removed = 0
  for (let batch = 0; batch < 10; batch += 1) {
    const result = await admin.from('trade_request_upload_tickets')
      .select('id, raw_path, ready_path, consumed_request_id')
      .lt('created_at', stale).is('consumed_request_id', null)
      .order('created_at').limit(100)
    if (result.error) throw result.error
    const tickets = result.data ?? []
    if (!tickets.length) break
    const paths = tickets.flatMap((ticket) => [ticket.raw_path, ticket.ready_path].filter((path): path is string => Boolean(path)))
    if (paths.length) {
      const deleted = await admin.storage.from(TRADE_UPLOAD_BUCKET).remove(paths)
      if (deleted.error) throw deleted.error
    }
    const deleted = await admin.from('trade_request_upload_tickets').delete()
      .in('id', tickets.map((ticket) => ticket.id)).is('consumed_request_id', null)
    if (deleted.error) throw deleted.error
    removed += tickets.length
    if (tickets.length < 100) break
  }
  // A signed URL remains usable for up to two hours. Remove any staging file
  // recreated after confirmation once its URL has expired, while preserving
  // the verified JPEG and ticket for idempotent request retries.
  const staleConsumed = await admin.from('trade_request_upload_tickets')
    .select('id, raw_path').not('consumed_request_id', 'is', null)
    .is('raw_cleanup_at', null).lt('created_at', stale)
    .order('created_at').limit(1000)
  if (staleConsumed.error) throw staleConsumed.error
  if (staleConsumed.data?.length) {
    const deletedRaw = await admin.storage.from(TRADE_UPLOAD_BUCKET)
      .remove(staleConsumed.data.map((ticket) => ticket.raw_path))
    if (deletedRaw.error) throw deletedRaw.error
    const marked = await admin.from('trade_request_upload_tickets')
      .update({ raw_cleanup_at: now.toISOString() })
      .in('id', staleConsumed.data.map((ticket) => ticket.id))
    if (marked.error) throw marked.error
  }
  // Keep consumed tickets for the full attachment lifetime so an idempotent
  // request retry can still prove which image it sent.
  const consumed = await admin.from('trade_request_upload_tickets')
    .select('id').not('consumed_request_id', 'is', null)
    .lt('created_at', old).order('created_at').limit(1000)
  if (consumed.error) throw consumed.error
  if (consumed.data?.length) {
    const deletedTickets = await admin.from('trade_request_upload_tickets').delete()
      .in('id', consumed.data.map((ticket) => ticket.id))
    if (deletedTickets.error) throw deletedTickets.error
    removed += consumed.data.length
  }
  return { removed }
}
