// Server-side jewelry photo upload utility. Used by the Nic-Nac add_listing
// handler when a rep sends a photo of a NEW design (not yet in the jewelry
// database). The handler extracts the most recent image part from the
// persisted user message in nic_nac_conversations, calls uploadJewelryPhoto,
// and passes the returned public URL into createDesign() as piecePhotoUrl.
//
// Uses the service-role client so the upload is not subject to storage.objects
// INSERT RLS — RLS is defense-in-depth for any future client-side direct
// upload path. We always write under a {rep_id}/ folder convention so RLS
// would still gate cross-rep writes if it ever ran.

import { createAdminClient } from '@/lib/supabase/admin'
import { randomUUID } from 'crypto'
import { normalizeTeamProfilePhoto } from '@/lib/services/team-profile-photo'

const PUBLIC_BUCKET = 'jewelry-photos'
const PUBLIC_SITE_MEDIA_BUCKET = 'public-site-media'
const STAGING_BUCKET = 'jewelry-photo-staging'
const TRADE_REQUEST_SCREENSHOT_BUCKET = 'trade-request-screenshots'
const STAGING_URL_TTL_SECONDS = 60 * 60
const TRADE_REQUEST_SCREENSHOT_URL_TTL_SECONDS = 10 * 60
export const TRADE_REQUEST_SCREENSHOT_RETENTION_HOURS = 7 * 24
export const TRADE_REQUEST_SCREENSHOT_MAX_BYTES = 25 * 1024 * 1024

const TRADE_REQUEST_SCREENSHOT_MIME_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

const MIME_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
}

function parseDataUrl(input: string): { mime: string; base64: string } {
  // Accepts data:image/...;base64,XXXX or raw base64.
  const match = /^data:([^;]+);base64,(.+)$/.exec(input)
  if (match) return { mime: match[1], base64: match[2] }
  return { mime: 'image/jpeg', base64: input }
}

// Strip path separators and odd characters from caller-supplied filenames so
// they can't escape the {rep_id}/ folder convention RLS depends on.
function sanitizeFilename(name: string): string {
  const cleaned = name
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.+/g, '.')
    .slice(0, 80)
  return cleaned || randomUUID()
}

function stripKnownExtension(name: string): string {
  return name.replace(/\.(jpe?g|png|webp|heic)$/i, '')
}

function toBuffer(data: Buffer | Uint8Array | ArrayBuffer): Buffer {
  if (Buffer.isBuffer(data)) return data
  if (data instanceof Uint8Array) return Buffer.from(data)
  return Buffer.from(data)
}

function normalizeScreenshotContentType(contentType: string): string {
  const normalized = contentType.toLowerCase()
  if (normalized === 'image/jpg') return 'image/jpeg'
  if (TRADE_REQUEST_SCREENSHOT_MIME_EXT[normalized]) return normalized
  throw new Error('UNSUPPORTED_TRADE_REQUEST_SCREENSHOT_TYPE')
}

function tradeRequestScreenshotKey(
  repId: string,
  requestId: string,
  contentType: string,
  filename?: string,
) {
  const ext = TRADE_REQUEST_SCREENSHOT_MIME_EXT[contentType] ?? 'jpg'
  const baseName = filename
    ? sanitizeFilename(stripKnownExtension(filename))
    : 'reveal-screenshot'
  return `${repId}/${requestId}/${randomUUID()}-${baseName}.${ext}`
}

export async function uploadJewelryPhoto(
  repId: string,
  base64Data: string,
  filename?: string,
  options: { upsert?: boolean } = {},
): Promise<string> {
  const admin = createAdminClient()
  const { mime, base64 } = parseDataUrl(base64Data)
  const ext = MIME_EXT[mime.toLowerCase()] ?? 'jpg'
  const safeName = filename ? sanitizeFilename(filename) : randomUUID()
  const key = `${repId}/${safeName}.${ext}`
  const buffer = Buffer.from(base64, 'base64')

  const { error } = await admin.storage
    .from(PUBLIC_BUCKET)
    .upload(key, buffer, { contentType: mime, upsert: options.upsert === true })
  if (error) throw error

  const { data } = admin.storage.from(PUBLIC_BUCKET).getPublicUrl(key)
  return data.publicUrl
}

export interface CatalogDesignPhotoAsset {
  objectPath: string
  publicUrl: string
}

/**
 * Upload a catalog source photo under the already-reserved internal design ID.
 * Vendor item numbers can belong to more than one material/stone variant, so
 * they must not be the storage identity. `upsert` intentionally stays off:
 * one variant must never overwrite another variant's canonical source photo.
 */
export async function uploadCatalogDesignSourcePhoto(
  repId: string,
  designId: string,
  base64Data: string,
  filename?: string,
): Promise<CatalogDesignPhotoAsset> {
  const admin = createAdminClient()
  const { mime, base64 } = parseDataUrl(base64Data)
  const ext = MIME_EXT[mime.toLowerCase()] ?? 'jpg'
  const safeName = filename
    ? sanitizeFilename(stripKnownExtension(filename))
    : 'source'
  const key = `${repId}/designs/${designId}/${safeName}.${ext}`
  const buffer = Buffer.from(base64, 'base64')

  const bucket = admin.storage.from(PUBLIC_BUCKET)
  const { error } = await bucket.upload(key, buffer, {
    contentType: mime,
    upsert: false,
  })
  if (error) throw error

  const { data } = bucket.getPublicUrl(key)
  return { objectPath: key, publicUrl: data.publicUrl }
}

export async function uploadStagedOriginalPhoto(
  repId: string,
  base64Data: string,
  filename?: string,
  options: { designId?: string } = {},
): Promise<{ objectPath: string; signedUrl: string }> {
  const admin = createAdminClient()
  const { mime, base64 } = parseDataUrl(base64Data)
  const ext = MIME_EXT[mime.toLowerCase()] ?? 'jpg'
  const baseName = filename
    ? sanitizeFilename(stripKnownExtension(filename))
    : randomUUID()
  const keyPrefix = options.designId
    ? `${repId}/designs/${options.designId}`
    : repId
  const key = `${keyPrefix}/${randomUUID()}-${baseName}.${ext}`
  const buffer = Buffer.from(base64, 'base64')

  const bucket = admin.storage.from(STAGING_BUCKET)
  const { error } = await bucket.upload(key, buffer, {
    contentType: mime,
    upsert: false,
  })
  if (error) throw error

  const signed = await bucket.createSignedUrl(key, STAGING_URL_TTL_SECONDS)
  if (signed.error) {
    await bucket.remove([key])
    throw signed.error
  }

  return {
    objectPath: key,
    signedUrl: signed.data.signedUrl,
  }
}

export async function getStagedOriginalPhotoSignedUrl(
  objectPath: string,
  ttlSeconds = STAGING_URL_TTL_SECONDS,
): Promise<string> {
  const admin = createAdminClient()
  const bucket = admin.storage.from(STAGING_BUCKET)
  const signed = await bucket.createSignedUrl(objectPath, ttlSeconds)
  if (signed.error) throw signed.error
  return signed.data.signedUrl
}

export async function uploadPublicSiteMedia(
  repId: string,
  base64Data: string,
  options: {
    filename?: string
    folder?: 'recipes' | 'profile'
  } = {},
): Promise<string> {
  const admin = createAdminClient()
  const { mime, base64 } = parseDataUrl(base64Data)
  const folder = options.folder ?? 'recipes'
  const safeName = options.filename
    ? sanitizeFilename(stripKnownExtension(options.filename))
    : 'public-site-media'
  let buffer: Buffer = Buffer.from(base64, 'base64')
  let contentType = mime
  let ext = MIME_EXT[mime.toLowerCase()] ?? 'jpg'

  if (folder === 'profile') {
    const normalized = await normalizeTeamProfilePhoto(buffer)
    buffer = normalized.buffer
    contentType = normalized.contentType
    ext = 'jpg'
  }

  const key = `${repId}/${folder}/${randomUUID()}-${safeName}.${ext}`

  const bucket = admin.storage.from(PUBLIC_SITE_MEDIA_BUCKET)
  const { error } = await bucket.upload(key, buffer, {
    contentType,
    upsert: false,
  })
  if (error) throw error

  const { data } = bucket.getPublicUrl(key)
  return data.publicUrl
}

export async function uploadTradeRequestRevealScreenshot(
  repId: string,
  requestId: string,
  binaryData: Buffer | Uint8Array | ArrayBuffer,
  options: {
    contentType: string
    filename?: string
    now?: Date
  },
): Promise<{
  objectPath: string
  contentType: string
  sizeBytes: number
  uploadedAt: string
  expiresAt: string
}> {
  const contentType = normalizeScreenshotContentType(options.contentType)
  const buffer = toBuffer(binaryData)
  if (buffer.byteLength <= 0) {
    throw new Error('EMPTY_TRADE_REQUEST_SCREENSHOT')
  }
  if (buffer.byteLength > TRADE_REQUEST_SCREENSHOT_MAX_BYTES) {
    throw new Error('TRADE_REQUEST_SCREENSHOT_TOO_LARGE')
  }

  const uploadedAtDate = options.now ?? new Date()
  const expiresAtDate = new Date(
    uploadedAtDate.getTime() + TRADE_REQUEST_SCREENSHOT_RETENTION_HOURS * 60 * 60 * 1000,
  )
  const key = tradeRequestScreenshotKey(
    repId,
    requestId,
    contentType,
    options.filename,
  )

  const admin = createAdminClient()
  const bucket = admin.storage.from(TRADE_REQUEST_SCREENSHOT_BUCKET)
  const { error } = await bucket.upload(key, buffer, {
    contentType,
    upsert: false,
  })
  if (error) throw error

  return {
    objectPath: key,
    contentType,
    sizeBytes: buffer.byteLength,
    uploadedAt: uploadedAtDate.toISOString(),
    expiresAt: expiresAtDate.toISOString(),
  }
}

/** Remove source assets created for an abandoned catalog-design attempt. */
export async function removeCatalogDesignPhotoAssets(input: {
  publicObjectPath?: string | null
  stagedObjectPath?: string | null
}): Promise<void> {
  const publicPaths = input.publicObjectPath?.trim()
    ? [input.publicObjectPath.trim()]
    : []
  const stagedPaths = input.stagedObjectPath?.trim()
    ? [input.stagedObjectPath.trim()]
    : []
  if (publicPaths.length === 0 && stagedPaths.length === 0) return

  const admin = createAdminClient()
  const cleanupErrors: unknown[] = []

  if (publicPaths.length > 0) {
    const { error } = await admin.storage.from(PUBLIC_BUCKET).remove(publicPaths)
    if (error) cleanupErrors.push(error)
  }
  if (stagedPaths.length > 0) {
    const { error } = await admin.storage.from(STAGING_BUCKET).remove(stagedPaths)
    if (error) cleanupErrors.push(error)
  }

  if (cleanupErrors.length > 0) throw cleanupErrors[0]
}

export async function getTradeRequestRevealScreenshotSignedUrl(
  objectPath: string,
  ttlSeconds = TRADE_REQUEST_SCREENSHOT_URL_TTL_SECONDS,
): Promise<string> {
  const admin = createAdminClient()
  const bucket = admin.storage.from(TRADE_REQUEST_SCREENSHOT_BUCKET)
  const signed = await bucket.createSignedUrl(objectPath, ttlSeconds)
  if (signed.error) throw signed.error
  return signed.data.signedUrl
}

export async function removeTradeRequestRevealScreenshots(
  objectPaths: string[],
): Promise<void> {
  const paths = objectPaths.map((path) => path.trim()).filter(Boolean)
  if (paths.length === 0) return

  const admin = createAdminClient()
  const { error } = await admin.storage
    .from(TRADE_REQUEST_SCREENSHOT_BUCKET)
    .remove(paths)
  if (error) throw error
}

export async function publishApprovedPhoto(
  designId: string,
  binaryData: Buffer | Uint8Array | ArrayBuffer,
  options: {
    contentType: string
    filename?: string
  },
): Promise<string> {
  const admin = createAdminClient()
  const ext = MIME_EXT[options.contentType.toLowerCase()] ?? 'jpg'
  const safeName = options.filename
    ? sanitizeFilename(stripKnownExtension(options.filename))
    : randomUUID()
  const key = `approved/${designId}/${safeName}.${ext}`
  const buffer = toBuffer(binaryData)

  const bucket = admin.storage.from(PUBLIC_BUCKET)
  const { error } = await bucket.upload(key, buffer, {
    contentType: options.contentType,
    upsert: true,
  })
  if (error) throw error

  const { data } = bucket.getPublicUrl(key)
  return data.publicUrl
}
