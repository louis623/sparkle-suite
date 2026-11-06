import { createHash } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { NicNacToolError } from '@/lib/nic-nac/errors'
import type { TradeBoardIntakePhotoState, TradeBoardIntakeSessionState } from './trade-board-intake-types'
import { updateTradeBoardIntakeSession, upsertTradeBoardIntakePhoto } from './trade-board-intake-store'

/** Check original bytes before preview and again before the final mutation. */
export async function assertMainPhotoNotReused(
  supabase: SupabaseClient,
  photo: { id?: string; imageUrl?: string; contentSha256?: string },
  itemNumber: string,
): Promise<string> {
  if (!photo.imageUrl) throw new Error('Missing main photo source')
  const data = /^data:[^;]+;base64,([\s\S]+)$/i.exec(photo.imageUrl)
  const response = data ? null : await fetch(photo.imageUrl)
  if (response && !response.ok) throw new Error('Main photo source unavailable')
  const bytes = data ? Buffer.from(data[1], 'base64') : Buffer.from(await response!.arrayBuffer())
  const hash = createHash('sha256').update(bytes).digest('hex')
  if (photo.contentSha256 && photo.contentSha256 !== hash)
    throw new NicNacToolError({ code: 'MAIN_PHOTO_CHANGED', userMessage: 'That photo changed since its preview. Please send the jewelry photo again.' })
  const { data: sources, error } = await supabase.from('trade_board_intake_photos')
    .select('id, session:trade_board_intake_sessions!inner(id,item_number,catalog_mode,metadata,created_listing_ids)')
    .eq('content_sha256', hash).eq('declared_role', 'jewelry_front')
  if (error) throw error
  // A completed save records the original-byte hash independently of the photo row.
  // Include that provenance even for older confirmed rows whose hash was cleared.
  const { data: savedSessions, error: savedError } = await supabase.from('trade_board_intake_sessions')
    .select('id,item_number,catalog_mode,metadata,created_listing_ids')
    .eq('metadata->>mainPhotoSha256', hash)
  if (savedError) throw savedError
  const savedSources = (savedSessions ?? []).map((session) => ({
    id: (session.metadata as Record<string, unknown> | null)?.confirmedPhotoId,
    session,
  }))
  for (const source of [...(sources ?? []), ...savedSources]) {
    const session = (Array.isArray(source.session) ? source.session[0] : source.session) as {
      id: string; item_number: string | null; catalog_mode: string; metadata: Record<string, unknown>; created_listing_ids: string[] | null
    }
    const otherItem = session.catalog_mode === 'non_item_number' ? `NON_ITEM:${session.id}` : session.item_number
    if (!otherItem || otherItem.toUpperCase() === itemNumber.toUpperCase() || !session.created_listing_ids?.length) continue
    if (session.metadata.confirmedPhotoId && session.metadata.confirmedPhotoId !== source.id) continue
    const { data: listings, error: listingError } = await supabase.from('trade_listings')
      .select('id,listing_photo_url,manual_photo_url').in('id', session.created_listing_ids)
    if (listingError) throw listingError
    if ((listings ?? []).some((listing) => !session.metadata.savedMainPhotoUrl ||
        listing.listing_photo_url === session.metadata.savedMainPhotoUrl || listing.manual_photo_url === session.metadata.savedMainPhotoUrl)) {
      throw new NicNacToolError({ code: 'MAIN_PHOTO_REUSED', userMessage: `This photo is already on ${otherItem}. I won't use it as the main photo for ${itemNumber}. Please send a new jewelry photo.` })
    }
  }
  return hash
}

/** A refused candidate stays refused on subsequent turns, including after reload. */
export async function rejectReusedMainPhoto(
  supabase: SupabaseClient,
  state: TradeBoardIntakeSessionState,
  photo: TradeBoardIntakePhotoState,
  reason: string,
): Promise<void> {
  photo.quality = 'blocked'
  photo.qualityIssues = [...new Set([...photo.qualityIssues, 'duplicate_main_photo'])]
  const rejected = { ...(state.metadata.rejectedMainPhotos as Record<string, string> | undefined), [photo.id!]: reason }
  state.metadata = { ...state.metadata, rejectedMainPhotos: rejected }
  for (const key of ['previewPhotoId', 'previewItemNumber', 'previewAssistantMessageId', 'confirmedPhotoId', 'confirmedItemNumber']) delete state.metadata[key]
  await upsertTradeBoardIntakePhoto(supabase, {
    ...photo, sessionId: state.id, repId: state.repId, conversationId: state.conversationId,
  })
  await updateTradeBoardIntakeSession(supabase, { sessionId: state.id, patch: { metadata: state.metadata } })
}
