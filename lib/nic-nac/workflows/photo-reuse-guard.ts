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

  return {
    blocked: true,
    otherItemNumber,
    message: `This photo is already on ${otherItemNumber}. If ${current} belongs with that set, reply yes.`,
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
