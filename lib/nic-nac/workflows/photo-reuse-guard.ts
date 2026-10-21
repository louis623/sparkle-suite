import { createHash } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'

function normalizeItemNumber(itemNumber: string): string {
  return itemNumber.trim().toUpperCase()
}

/**
 * Piece key for a photo confirmation. Item-number pieces use the item number.
 * A non-item piece, or any piece that still has no item number, uses
 * NON_ITEM:<intakeId> so a yes can match the later save.
 */
export function photoConfirmationPieceKey(args: {
  itemNumber?: string | null
  catalogMode?: string | null
  intakeId?: string | null
}): string {
  const item = typeof args.itemNumber === 'string' ? args.itemNumber.trim().toUpperCase() : ''
  if (args.catalogMode !== 'non_item_number' && item) return item
  const intakeId = typeof args.intakeId === 'string' ? args.intakeId.trim() : ''
  return intakeId ? `NON_ITEM:${intakeId}` : ''
}

export function normalizePhotoConfirmationKey(value: unknown): string {
  if (typeof value !== 'string') return ''
  const trimmed = value.trim()
  const marker = 'NON_ITEM:'
  if (trimmed.slice(0, marker.length).toUpperCase() === marker) {
    const intakeId = trimmed.slice(marker.length).trim()
    return intakeId ? `NON_ITEM:${intakeId}` : ''
  }
  return trimmed.toUpperCase()
}

export type PhotoReuseMatch = {
  itemNumber?: string | null
}

export type PhotoReuseDecision =
  | { blocked: false }
  | { blocked: true; otherItemNumber: string; message: string }

/**
 * The same photo bytes on a saved library design or saved Dance Floor listing
 * with a different item number need a set confirmation. Open and abandoned
 * intakes do not count. The same item number may have another finish, cut, or
 * stone color, so a matching item number is never a conflict.
 */
export function decidePhotoReuse(args: {
  itemNumber: string
  contentSha256: string
  existing: PhotoReuseMatch[]
}): PhotoReuseDecision {
  const current = normalizeItemNumber(args.itemNumber)
  if (!current || !args.contentSha256) return { blocked: false }

  const otherItemNumber = args.existing
    .map((match) => (match.itemNumber ? normalizeItemNumber(match.itemNumber) : ''))
    .find((itemNumber) => itemNumber && itemNumber !== current)

  if (!otherItemNumber) return { blocked: false }

  const label = current.startsWith('NON_ITEM:') ? 'this piece' : current
  return {
    blocked: true,
    otherItemNumber,
    message: `This photo is already on ${otherItemNumber}. If ${label} belongs with that set, reply yes.`,
  }
}

/**
 * Identity of the photo a rep confirmed as the main image.
 * Prefer the stored photo id, then the byte hash already on the photo, then
 * a hash of a data URL. Remote URLs without an id or hash have no identity.
 */
export function mainPhotoConfirmationIdentity(photo: {
  id?: string | null
  contentSha256?: string | null
  imageUrl?: string | null
}): string | null {
  const id = photo.id?.trim()
  if (id) return id
  const sha = photo.contentSha256?.trim()
  if (sha) return sha
  return hashDataImageUrl(photo.imageUrl ?? undefined)
}

/** Hash a data URL the same way intake inspection hashes photo bytes. Skip remote URLs. */
export function hashDataImageUrl(url: string | undefined): string | null {
  if (!url) return null
  const match = /^data:[^;]+;base64,(.+)$/i.exec(url.trim())
  if (!match?.[1]) return null
  try {
    const bytes = Buffer.from(match[1], 'base64')
    if (bytes.length === 0) return null
    return createHash('sha256').update(bytes).digest('hex')
  } catch {
    return null
  }
}

export function resolvePhotoContentSha256(args: {
  sourceImageUrl: string
  workflowPhotos?: Array<{ imageUrl?: string; contentSha256?: string }>
}): string | null {
  const stored = args.workflowPhotos?.find(
    (photo) => photo.imageUrl === args.sourceImageUrl && photo.contentSha256,
  )?.contentSha256
  if (stored) return stored
  return hashDataImageUrl(args.sourceImageUrl)
}

export const PHOTO_HASH_TIMEOUT_MS = 8_000
export const PHOTO_HASH_MAX_BYTES = 8 * 1024 * 1024

/** Hosts we will download a customer photo from. Only this project's storage. */
export function customerPhotoStorageHosts(): string[] {
  const hosts: string[] = []
  for (const raw of [process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_URL]) {
    const trimmed = raw?.trim()
    if (!trimmed) continue
    try {
      const host = new URL(trimmed).host
      if (host && !hosts.includes(host)) hosts.push(host)
    } catch {
      // Ignore a malformed env value and keep the other host, if any.
    }
  }
  return hosts
}

export function isAllowedCustomerPhotoFetchUrl(url: string): boolean {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return false
  }
  if (parsed.protocol !== 'https:') return false
  if (!customerPhotoStorageHosts().includes(parsed.host)) return false
  return parsed.pathname.startsWith('/storage/v1/object/')
}

/** An approved shared-catalog photo lives on our storage host, under jewelry-photos/approved/. */
export function isApprovedCatalogPhotoUrl(url: string): boolean {
  if (!isAllowedCustomerPhotoFetchUrl(url)) return false
  try {
    return new URL(url).pathname.startsWith(
      '/storage/v1/object/public/jewelry-photos/approved/',
    )
  } catch {
    return false
  }
}

type PhotoBodyReader = {
  read: () => Promise<{ done?: boolean; value?: Uint8Array }>
  cancel: () => Promise<void>
}

function abortReason(signal: AbortSignal): unknown {
  return signal.reason ?? new DOMException('The operation was aborted.', 'AbortError')
}

/** Settle when `pending` settles, or when `signal` aborts, whichever is first. */
function raceAbort<T>(pending: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(abortReason(signal))
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      reject(abortReason(signal))
    }
    signal.addEventListener('abort', onAbort, { once: true })
    pending.then(
      (value) => {
        signal.removeEventListener('abort', onAbort)
        resolve(value)
      },
      (error) => {
        signal.removeEventListener('abort', onAbort)
        reject(error)
      },
    )
  })
}

/** Drop the socket without waiting. A dribbling body can leave cancel() pending for tens of seconds. */
function dropReader(reader: PhotoBodyReader) {
  try {
    void reader.cancel().catch(() => undefined)
  } catch {
    // A synchronous cancel failure still means this read is abandoned.
  }
}

async function readCappedPhotoBytes(
  response: {
    body?: { getReader?: () => PhotoBodyReader } | null
    arrayBuffer?: () => Promise<ArrayBuffer>
  },
  signal: AbortSignal,
): Promise<Buffer | null> {
  const reader = response.body?.getReader?.()
  if (!reader) {
    if (!response.arrayBuffer) return null
    try {
      const bytes = Buffer.from(await raceAbort(response.arrayBuffer(), signal))
      if (bytes.length === 0 || bytes.length > PHOTO_HASH_MAX_BYTES) return null
      return bytes
    } catch {
      return null
    }
  }
  const chunks: Uint8Array[] = []
  let total = 0
  try {
    for (;;) {
      const { done, value } = await raceAbort(reader.read(), signal)
      if (done) break
      if (!value || value.byteLength === 0) continue
      if (total + value.byteLength > PHOTO_HASH_MAX_BYTES) {
        dropReader(reader)
        return null
      }
      chunks.push(value)
      total += value.byteLength
    }
  } catch {
    dropReader(reader)
    return null
  }
  if (total === 0) return null
  return Buffer.concat(chunks)
}

/** Hash photo bytes. Data URLs are hashed locally. Storage URLs are fetched, unless a stored hash is already known. */
export async function hashCustomerPhotoUrl(args: {
  sourceImageUrl: string
  storedSha256?: string | null
  timeoutMs?: number
}): Promise<string | null> {
  const stored = args.storedSha256?.trim()
  if (stored) return stored
  const dataHash = hashDataImageUrl(args.sourceImageUrl)
  if (dataHash) return dataHash
  const url = args.sourceImageUrl.trim()
  if (!isAllowedCustomerPhotoFetchUrl(url)) return null
  const signal = AbortSignal.timeout(args.timeoutMs ?? PHOTO_HASH_TIMEOUT_MS)
  try {
    const response = await fetch(url, {
      redirect: 'error',
      signal,
    })
    if (!response.ok) return null
    const declaredLength = Number(response.headers?.get?.('content-length'))
    if (Number.isFinite(declaredLength) && declaredLength > PHOTO_HASH_MAX_BYTES) return null
    const bytes = await readCappedPhotoBytes(response, signal)
    if (!bytes) return null
    return createHash('sha256').update(bytes).digest('hex')
  } catch {
    return null
  }
}

type PhotoHashSession = {
  item_number?: string | null
  status?: string | null
  created_design_id?: string | null
  created_listing_ids?: string[] | null
}

type PhotoHashRow = {
  trade_board_intake_sessions?: PhotoHashSession | PhotoHashSession[] | null
}

function intakeSavedALibraryDesignOrListing(entry: PhotoHashSession): boolean {
  if (entry.status !== 'completed') return false
  const designId =
    typeof entry.created_design_id === 'string' ? entry.created_design_id.trim() : ''
  const listingIds = Array.isArray(entry.created_listing_ids)
    ? entry.created_listing_ids.filter((id) => typeof id === 'string' && id.trim().length > 0)
    : []
  return designId.length > 0 || listingIds.length > 0
}

export async function loadItemNumbersForPhotoHash(
  admin: SupabaseClient,
  args: { repId: string; contentSha256: string },
): Promise<PhotoReuseMatch[]> {
  const { data, error } = await admin
    .from('trade_board_intake_photos')
    .select(
      'trade_board_intake_sessions!inner(item_number, status, created_design_id, created_listing_ids)',
    )
    .eq('rep_id', args.repId)
    .eq('content_sha256', args.contentSha256)
    .eq('trade_board_intake_sessions.status', 'completed')

  if (error) throw error

  return ((data ?? []) as PhotoHashRow[]).flatMap((row) => {
    const session = row.trade_board_intake_sessions
    const sessions = Array.isArray(session) ? session : session ? [session] : []
    return sessions
      .filter(intakeSavedALibraryDesignOrListing)
      .map((entry) => ({ itemNumber: entry.item_number ?? null }))
  })
}
