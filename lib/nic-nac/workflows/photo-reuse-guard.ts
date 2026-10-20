import { createHash } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'

function normalizeItemNumber(itemNumber: string): string {
  return itemNumber.trim().toUpperCase()
}

export type PhotoReuseMatch = {
  itemNumber?: string | null
}

export type PhotoReuseDecision =
  | { blocked: false }
  | { blocked: true; otherItemNumber: string; message: string }

/**
 * The same photo bytes on a saved piece with a different item number need a
 * set confirmation. The same item number may have another finish, cut, or
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
}

type PhotoHashRow = {
  trade_board_intake_sessions?: PhotoHashSession | PhotoHashSession[] | null
}

export async function loadItemNumbersForPhotoHash(
  admin: SupabaseClient,
  args: { repId: string; contentSha256: string },
): Promise<PhotoReuseMatch[]> {
  const { data, error } = await admin
    .from('trade_board_intake_photos')
    .select('trade_board_intake_sessions!inner(item_number, status)')
    .eq('rep_id', args.repId)
    .eq('content_sha256', args.contentSha256)
    .eq('trade_board_intake_sessions.status', 'completed')

  if (error) throw error

  return ((data ?? []) as PhotoHashRow[]).flatMap((row) => {
    const session = row.trade_board_intake_sessions
    const sessions = Array.isArray(session) ? session : session ? [session] : []
    return sessions
      .filter((entry) => entry.status === 'completed')
      .map((entry) => ({ itemNumber: entry.item_number ?? null }))
  })
}
