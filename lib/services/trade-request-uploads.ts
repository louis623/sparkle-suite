import 'server-only'

import { randomUUID } from 'node:crypto'
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
  rendition_version: number
  thumb_path: string | null
  discarded_at: string | null
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
    throw failure('TRADE_UPLOAD_INVALID_REQUEST', 'Refresh the swap form and try the photo again.', 400)
  }
  const contentType = input.contentType.trim().toLowerCase()
  if (!CONTENT_TYPES[contentType]) {
    throw failure('TRADE_UPLOAD_UNSUPPORTED_TYPE', 'Choose a JPEG, PNG, WebP, HEIC, HEIF, or AVIF image.', 415)
  }
  if (!Number.isInteger(input.byteSize) || input.byteSize < 1 || input.byteSize > TRADE_UPLOAD_MAX_BYTES) {
    throw failure('TRADE_UPLOAD_TOO_LARGE', 'Choose an image of 25 MB or less.', 413)
  }
  return { ...input, contentType }
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
    throw failure('TRADE_UPLOAD_INVALID_REQUEST', 'Refresh the swap form and try the photo again.', 400)
  }
  const id = randomUUID()
  const { data, error } = await admin.rpc('admit_swap_upload', {
    p_id: id, p_listing_id: parsed.listingId, p_submission_id: parsed.submissionId,
    p_expected_rep: input.expectedRepId ?? null, p_ip_hash: input.ipHash,
    p_content_type: parsed.contentType, p_size: parsed.byteSize,
  })
  if (error) throw uploadRpcError(error)
  if (data?.code) {
    const messages: Record<string, string> = {
      TRADE_UPLOAD_SUBMISSION_LIMIT: 'Too many photos for this request. Please try again later.',
      TRADE_UPLOAD_PENDING_LIMIT: 'Too many unfinished photo uploads on this connection. Please try again later.',
      TRADE_UPLOAD_TOTAL_LIMIT: 'Too many photo uploads on this connection this hour. Please try again later.',
      TRADE_UPLOAD_BYTE_LIMIT: 'The daily photo allowance for this connection has been reached. Please check again later.',
    }
    throw Object.assign(failure(data.code, messages[data.code] ?? 'Please try again later.', 429),
      { retryAfter: Math.max(1, Number(data.retry_after) || 60) })
  }
  const signed = await admin.storage.from(TRADE_UPLOAD_BUCKET).createSignedUploadUrl(data.raw_path)
  if (signed.error || !signed.data?.signedUrl) {
    throw failure('TRADE_UPLOAD_UNAVAILABLE', 'Photo upload is temporarily unavailable.', 503)
  }
  // Time measured after the signer returns gives a conservative expiry even if signing was delayed.
  const until = new Date(Date.now() + TICKET_HOURS * 3600_000 + 60_000).toISOString()
  const recorded = await admin.from('trade_request_upload_tickets').update({ signed_until: until })
    .eq('id', id).is('discarded_at', null).select('id').maybeSingle()
  if (recorded.error || !recorded.data) throw failure('TRADE_UPLOAD_UNAVAILABLE', 'Please try attaching the photo again.', 503)
  return { uploadId: id, uploadUrl: signed.data.signedUrl, createdAt: data.created_at,
    expiresAt: new Date(Date.parse(data.created_at) + TICKET_HOURS * 3600_000).toISOString() }
}

function uploadRpcError(error: { message: string }) {
  if (error.message === 'TRADE_UPLOAD_ALREADY_USED') return failure(error.message, 'This photo was already sent.', 409)
  if (error.message === 'TRADE_UPLOAD_NOT_FOUND') return failure(error.message, 'The upload was not found.', 404)
  if (error.message === 'TRADE_UPLOAD_LISTING_UNAVAILABLE') return failure(error.message, 'That dancer is no longer available.', 404)
  return failure('TRADE_UPLOAD_UNAVAILABLE', 'Photo upload is temporarily unavailable.', 503)
}

async function findTicket(admin: SupabaseClient, input: {
  uploadId: string
  listingId: string
  submissionId: string
  expectedRepId?: string | null
}): Promise<Ticket> {
  if (!UUID.test(input.uploadId) || !UUID.test(input.listingId) || !UUID.test(input.submissionId)) {
    throw failure('TRADE_UPLOAD_INVALID_REQUEST', 'Refresh the swap form and try the photo again.', 400)
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
  if (ticket.discarded_at) throw failure('TRADE_UPLOAD_NOT_FOUND', 'That photo was removed.', 404)
  if (ticket.consumed_request_id) {
    throw failure('TRADE_UPLOAD_ALREADY_USED', 'This photo was already sent with a swap request.', 409)
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
  if (ticket.ready_at && ticket.ready_path && ticket.ready_size_bytes && (ticket.rendition_version === 1 || ticket.thumb_path)) {
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
  const full = `${ticket.rep_id}/trade-request-uploads/${ticket.id}.jpg`
  const thumb = `${ticket.rep_id}/trade-request-uploads/${ticket.id}.800.jpg`
  const small = await sharp(output).resize({ width: 800, height: 800, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer()
  for (const [path, buffer] of [[full, output], [thumb, small]] as const) {
    const result = await bucket.upload(path, buffer, { contentType: 'image/jpeg', upsert: false })
    if (result.error) {
      // Never publish a partial or mixed pair. A duplicate writer may only observe an already committed pair.
      const winner = await findTicket(admin, input)
      if (winner.ready_at && winner.ready_path && (winner.rendition_version === 1 || winner.thumb_path)) return readyResult(winner.ready_at)
      throw failure('TRADE_UPLOAD_UNAVAILABLE', 'Please attach the photo again.', 503)
    }
  }
  const readyAt = new Date().toISOString()
  const updated = await admin.from('trade_request_upload_tickets').update({ ready_at: readyAt,
    ready_path: full, ready_size_bytes: output.length, thumb_path: thumb, rendition_version: 2 })
    .eq('id', ticket.id).is('ready_at', null).is('discarded_at', null).is('consumed_at', null)
    .gt('created_at', new Date(Date.now()-TICKET_HOURS*3600_000).toISOString()).select('id').maybeSingle()
  if (updated.error || !updated.data) throw failure('TRADE_UPLOAD_NOT_READY', 'Please attach the photo again.', 409)
  const removed = await bucket.remove([ticket.raw_path])
  if (removed.error) console.warn('[swap-upload] staging removal deferred')
  return readyResult(readyAt)
}

function readyResult(readyAt: string) {
  return { ready: true as const, expiresAt: new Date(Date.parse(readyAt) + TRADE_UPLOAD_RETENTION_DAYS * 86400_000).toISOString() }
}

export async function discardTradeUpload(admin: SupabaseClient, input: {
  uploadId: string; listingId: string; submissionId: string; expectedRepId?: string | null
}) {
  if (![input.uploadId,input.listingId,input.submissionId].every(v => UUID.test(v))) {
    throw failure('TRADE_UPLOAD_INVALID_REQUEST', 'Refresh the swap form and try again.', 400)
  }
  const { data, error } = await admin.rpc('discard_swap_upload', { p_id: input.uploadId,
    p_listing_id: input.listingId, p_submission_id: input.submissionId, p_expected_rep: input.expectedRepId ?? null })
  if (error) throw uploadRpcError(error)
  const base = `${data.rep_id}/trade-request-uploads/${data.id}`
  const result = await admin.storage.from(TRADE_UPLOAD_BUCKET).remove([data.raw_path, base+'.jpg', base+'.800.jpg'])
  if (result.error) throw failure('TRADE_UPLOAD_UNAVAILABLE', 'Photo removal will be retried.', 503)
  return { discarded: true }
}
