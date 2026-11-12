import 'server-only'
import { randomUUID } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { queueVideoLink, type VideoProvider } from '@/lib/public-site/queue-video-link'
import sharp from 'sharp'
import { ServiceError } from './errors'
import { inspectTikTokVideo } from '@/lib/public-site/iso-bmff'
import { canonicalTikTokUrl } from '@/lib/public-site/tiktok-video-id'
import { VIDEO_MIME, VIDEO_MAX_BYTES, POSTER_SOURCE_MAX_BYTES, THUMB_MAX_BYTES } from '@/lib/public-site/tiktok-video-limits'

export const TIKTOK_VIDEO_BUCKET = 'public-site-videos'
const REP_SELECT = 'reps(display_name,business_name,public_site_slug,status,account_classification)'
export type TikTokRep = { display_name: string; business_name: string; public_site_slug: string; status: string; account_classification: string }
export type TikTokQueueItem = {
  id: string; rep_id: string; source_provider: VideoProvider; tiktok_video_id: string; source_url: string; slot_keys: string[]
  status: string; cancel_reason: string | null; operator_note: string | null; created_at: string
  closed_at: string | null; pending_poster_path: string | null; thumbnail_status: string
  thumbnail_attempted_at: string | null; asset_id: string | null; reps: TikTokRep
  videoUrl?: string
}
export type TikTokDismissal = { rep_id: string; source_provider: VideoProvider; tiktok_video_id: string; source_url: string; slot_keys: string[]; note: string | null; created_at: string; reps: TikTokRep }
export type HostedTikTokVideo = { src: string; poster: string; width: number; height: number }
type Ticket = {
  id: string; item_id: string; rep_id: string; source_provider: VideoProvider; tiktok_video_id: string; operator_rep_id: string
  video_path: string; video_content_type: string; video_byte_size: number; poster_staging_path: string
  poster_staging_content_type: string; poster_staging_byte_size: number; poster_path: string
  expires_at: string; consumed_at: string | null; asset_id: string | null
}

function fail(code: string, message: string, statusCode = 500): never {
  throw new ServiceError({ code, message, statusCode })
}
function checked<T>(result: { data: T; error: { message: string } | null }): NonNullable<T> {
  if (result.error) fail('TIKTOK_QUEUE_FAILED', result.error.message)
  return result.data as NonNullable<T>
}
export async function tiktokQueueRpc<T>(admin: SupabaseClient, name: string, args?: Record<string, unknown>): Promise<T> {
  const result = await admin.rpc(name, args)
  if (!result.error) return result.data as T
  const message = result.error.message
  if (/invalid_video_slot/.test(message)) fail('TIKTOK_INVALID_VIDEO_SLOT', "That video spot couldn't be found. Refresh and try again.", 400)
  if (/dismissal_not_found|queue_item_not_found|ticket_not_found/.test(message)) fail('TIKTOK_NOT_FOUND', message, 404)
  if (/ticket_mismatch/.test(message)) fail('TIKTOK_TICKET_MISMATCH', 'This upload belongs to another session or file.', 403)
  if (/ticket_expired/.test(message)) fail('TIKTOK_TICKET_EXPIRED', 'This upload expired. Choose the file again.', 410)
  if (/source_missing/.test(message)) fail('TIKTOK_SOURCE_MISSING', "That link isn't on her site anymore.", 409)
  if (/queue_item_not_pending|queue_item_not_closed|source_changed|rep_inactive|rep_not_enabled/.test(message)) {
    fail('TIKTOK_SOURCE_CHANGED', 'This video changed since you opened the page. Refresh and try again.', 409)
  }
  fail('TIKTOK_QUEUE_FAILED', 'The video queue could not be updated.', 500)
}
export async function isHostedTikTokEnabled(admin: SupabaseClient, repId: string) {
  return await tiktokQueueRpc<boolean>(admin, 'tiktok_hosted_video_enabled', { p_rep_id: repId }) === true
}

export async function allVideoSourcesEnabled(admin: SupabaseClient, repId: string) {
  return await tiktokQueueRpc<boolean>(admin, 'video_all_sources', { p_rep_id: repId }) === true
}

export async function preservedVideos(admin: SupabaseClient, repId: string) {
  return checked(await admin.from('tiktok_video_preserved_assignments')
    .select('slot_key,source_provider,source_id').eq('rep_id', repId))
}

export function isPreserved(rows: {slot_key: string; source_provider: string; source_id: string}[], slot: string, url: string) {
  const link = queueVideoLink(url)
  return rows.some(row => row.slot_key === slot && row.source_provider === (link.provider ?? 'legacy') && row.source_id === (link.id ?? url))
}

export async function listTikTokQueue(admin: SupabaseClient, tab: 'queue' | 'archive') {
  let query = admin.from('tiktok_video_queue').select(`*,${REP_SELECT}`)
  query = tab === 'queue' ? query.eq('status', 'pending').order('created_at') : query.neq('status', 'pending').order('closed_at', { ascending: false }).limit(200)
  const items = checked(await query) as unknown as TikTokQueueItem[]
  const assetIds = items.map(item => item.asset_id).filter((id): id is string => Boolean(id))
  if (assetIds.length) {
    const assets = checked(await admin.from('public_site_videos').select('id,storage_path').in('id', assetIds))
    for (const item of items) {
      const asset = assets.find(asset => asset.id === item.asset_id)
      if (asset) item.videoUrl = admin.storage.from(TIKTOK_VIDEO_BUCKET).getPublicUrl(asset.storage_path).data.publicUrl
    }
  }
  let dismissals: TikTokDismissal[] = []
  if (tab === 'archive') {
    const all = checked(await admin.from('tiktok_video_dismissals').select(`*,${REP_SELECT}`).order('created_at', { ascending: false })) as unknown as TikTokDismissal[]
    // Query archived identities independently of the 200-row display limit.
    const archived = checked(await admin.from('tiktok_video_queue').select('rep_id,source_provider,tiktok_video_id').eq('status', 'archived'))
    dismissals = all.filter(d => !archived.some(q => q.rep_id === d.rep_id && q.source_provider === d.source_provider && q.tiktok_video_id === d.tiktok_video_id))
  }
  return { items, dismissals }
}

export async function createTikTokUploadTicket(admin: SupabaseClient, input: {
  itemId: string; operatorRepId: string; videoContentType: typeof VIDEO_MIME[number]; videoByteSize: number
  posterContentType: 'image/webp' | 'image/jpeg'; posterByteSize: number
}) {
  if (!VIDEO_MIME.includes(input.videoContentType) || !Number.isInteger(input.videoByteSize) || input.videoByteSize < 1 || input.videoByteSize > VIDEO_MAX_BYTES ||
      !['image/webp', 'image/jpeg'].includes(input.posterContentType) || !Number.isInteger(input.posterByteSize) || input.posterByteSize < 1 || input.posterByteSize > POSTER_SOURCE_MAX_BYTES) {
    fail('TIKTOK_INVALID_UPLOAD', 'Choose a video and poster within the upload limits.', 400)
  }
  const item = checked(await admin.from('tiktok_video_queue').select('*,reps(status)').eq('id', input.itemId).single()) as unknown as TikTokQueueItem
  if (item.status !== 'pending' || item.reps?.status !== 'active' || (item.source_provider !== 'tiktok' && !await allVideoSourcesEnabled(admin, item.rep_id)) || !await isHostedTikTokEnabled(admin, item.rep_id)) {
    fail('TIKTOK_SOURCE_CHANGED', 'This video changed since you opened the page. Refresh and try again.', 409)
  }
  const id = randomUUID()
  const base = `${item.rep_id}/${item.tiktok_video_id}/${id}`
  const videoPath = `${base}.${input.videoContentType === 'video/quicktime' ? 'mov' : 'mp4'}`
  const posterStagingPath = `${base}-poster-src.${input.posterContentType === 'image/webp' ? 'webp' : 'jpg'}`
  checked(await admin.from('tiktok_video_upload_tickets').insert({
    id, item_id: item.id, rep_id: item.rep_id, source_provider: item.source_provider, tiktok_video_id: item.tiktok_video_id, operator_rep_id: input.operatorRepId,
    video_path: videoPath, video_content_type: input.videoContentType, video_byte_size: input.videoByteSize,
    poster_staging_path: posterStagingPath, poster_staging_content_type: input.posterContentType,
    poster_staging_byte_size: input.posterByteSize, poster_path: `${base}-poster.webp`,
  }))
  const bucket = admin.storage.from(TIKTOK_VIDEO_BUCKET)
  const video = checked(await bucket.createSignedUploadUrl(videoPath))
  const poster = checked(await bucket.createSignedUploadUrl(posterStagingPath))
  return { ticketId: id, video: { path: videoPath, token: video.token }, poster: { path: posterStagingPath, token: poster.token } }
}

export async function completeTikTokQueueItem(admin: SupabaseClient, input: { ticketId: string; operatorRepId: string; method: 'save_video' | 'screen_record' | 'other' }) {
  const ticket = checked(await admin.from('tiktok_video_upload_tickets').select('*').eq('id', input.ticketId).single()) as Ticket
  if (ticket.operator_rep_id !== input.operatorRepId) fail('TIKTOK_TICKET_MISMATCH', 'This upload belongs to another owner session.', 403)
  if (ticket.consumed_at) return { assetId: ticket.asset_id, replayed: true }
  if (Date.parse(ticket.expires_at) < Date.now()) fail('TIKTOK_TICKET_EXPIRED', 'This upload expired. Choose the file again.', 410)
  const bucket = admin.storage.from(TIKTOK_VIDEO_BUCKET)
  const video = checked(await bucket.download(ticket.video_path))
  const posterSource = checked(await bucket.download(ticket.poster_staging_path))
  let metadata: ReturnType<typeof inspectTikTokVideo>
  let poster: Buffer
  try {
    if (video.size !== Number(ticket.video_byte_size) || video.size > VIDEO_MAX_BYTES ||
        posterSource.size !== Number(ticket.poster_staging_byte_size) || posterSource.size > POSTER_SOURCE_MAX_BYTES) throw new Error('The uploaded file size does not match its ticket.')
    metadata = inspectTikTokVideo(Buffer.from(await video.arrayBuffer()))
    if (metadata.mimeType !== ticket.video_content_type) throw new Error('The file format does not match its extension. Export it as MP4 (H.264).')
    const bytes = Buffer.from(await posterSource.arrayBuffer())
    const image = sharp(bytes, { limitInputPixels: 40_000_000, animated: false })
    const info = await image.metadata()
    const expected = ticket.poster_staging_content_type === 'image/jpeg' ? 'jpeg' : 'webp'
    if (info.format !== expected || (info.pages ?? 1) > 1) throw new Error('Choose a valid, still JPEG or WebP poster.')
    poster = await image.resize({ width: 720, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer()
    if (poster.length > POSTER_SOURCE_MAX_BYTES) throw new Error('The poster is too large.')
  } catch (error) {
    fail('TIKTOK_INSPECTION_FAILED', error instanceof Error ? error.message : 'Export the video as MP4 (H.264) and try again.', 422)
  }
  checked(await bucket.upload(ticket.poster_path, poster, { contentType: 'image/webp', upsert: true }))
  const result = await tiktokQueueRpc<{ assetId: string; replayed: boolean }>(admin, 'complete_tiktok_queue_item', {
    p_ticket_id: ticket.id, p_operator_rep_id: input.operatorRepId, p_video_mime: metadata.mimeType,
    p_video_bytes: metadata.byteSize, p_width: metadata.width, p_height: metadata.height,
    p_duration: metadata.durationSeconds, p_method: input.method,
  })
  try { await bucket.remove([ticket.poster_staging_path]) } catch { /* Expired ticket cleanup handles leftovers. */ }
  return result
}

export async function archiveTikTokQueueItem(admin: SupabaseClient, input: { itemId: string; note: string }) {
  return tiktokQueueRpc(admin, 'archive_tiktok_queue_item', { p_item_id: input.itemId, p_note: input.note })
}
export async function reopenTikTokQueueItem(admin: SupabaseClient, input: { itemId: string }) {
  return tiktokQueueRpc<string>(admin, 'reopen_tiktok_queue_item', { p_item_id: input.itemId })
}
export async function reopenTikTokDismissal(admin: SupabaseClient, input: { repId: string; tiktokVideoId: string; provider?: VideoProvider }) {
  return tiktokQueueRpc<string>(admin, 'reopen_tiktok_dismissal', { p_rep_id: input.repId, p_tiktok_video_id: input.tiktokVideoId, p_provider: input.provider ?? 'tiktok' })
}

async function limitedImage(response: Response) {
  if (!response.ok || !/^image\/(jpeg|webp|png)(?:;|$)/i.test(response.headers.get('content-type') ?? '') || !response.body) throw new Error('thumbnail_unavailable')
  const reader = response.body.getReader()
  const chunks: Buffer[] = []
  let size = 0
  try {
    while (true) {
      const chunk = await reader.read()
      if (chunk.done) break
      size += chunk.value.length
      if (size > THUMB_MAX_BYTES) throw new Error('thumbnail_too_large')
      chunks.push(Buffer.from(chunk.value))
    }
  } finally { await reader.cancel() }
  return Buffer.concat(chunks)
}
export async function fetchTikTokThumbnail(admin: SupabaseClient, itemId: string) {
  const item = checked(await admin.from('tiktok_video_queue').select('*').eq('id', itemId).single()) as TikTokQueueItem
  if (item.source_provider !== 'tiktok' || item.status !== 'pending' || !await isHostedTikTokEnabled(admin, item.rep_id)) fail('TIKTOK_SOURCE_CHANGED', 'This item is no longer pending.', 409)
  checked(await admin.from('tiktok_video_queue').update({ thumbnail_attempted_at: new Date().toISOString() }).eq('id', itemId))
  try {
    const url = canonicalTikTokUrl(item.source_url)
    if (!url) throw new Error('invalid_url')
    const response = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`, { redirect: 'manual', signal: AbortSignal.timeout(3000) })
    if (!response.ok) throw new Error('oembed_unavailable')
    const body = await response.json() as { thumbnail_url?: string }
    const thumbnail = new URL(body.thumbnail_url ?? '')
    if (thumbnail.protocol !== 'https:' || thumbnail.username || thumbnail.password || thumbnail.port ||
        !['.tiktokcdn.com', '.tiktokcdn-us.com'].some(suffix => thumbnail.hostname.endsWith(suffix))) throw new Error('thumbnail_host_rejected')
    const image = await limitedImage(await fetch(thumbnail, { redirect: 'manual', signal: AbortSignal.timeout(3000) }))
    const decoder = sharp(image, { limitInputPixels: 40_000_000, animated: false })
    if (((await decoder.metadata()).pages ?? 1) > 1) throw new Error('animated_thumbnail')
    const webp = await decoder.resize({ width: 720, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer()
    if (webp.length > THUMB_MAX_BYTES) throw new Error('thumbnail_too_large')
    const path = `${item.rep_id}/${item.tiktok_video_id}/thumb-${itemId}.webp`
    checked(await admin.storage.from(TIKTOK_VIDEO_BUCKET).upload(path, webp, { contentType: 'image/webp', upsert: true }))
    checked(await admin.from('tiktok_video_queue').update({ pending_poster_path: path, thumbnail_status: 'ok' }).eq('id', itemId))
    return { ok: true }
  } catch {
    checked(await admin.from('tiktok_video_queue').update({ thumbnail_status: 'failed' }).eq('id', itemId))
    return { ok: false }
  }
}

export async function loadHostedTikTokForRep(admin: SupabaseClient, repId: string, videoIds: string[], qualified = false) {
  const videos: Record<string, HostedTikTokVideo> = {}
  const posters: Record<string, string> = {}
  if (!videoIds.length) return { videos, posters }
  const assets = checked(await admin.from('public_site_videos').select('source_provider,tiktok_video_id,storage_path,poster_path,width,height').eq('rep_id', repId).eq('status', 'live').in('tiktok_video_id', videoIds))
  const pending = checked(await admin.from('tiktok_video_queue').select('source_provider,tiktok_video_id,pending_poster_path').eq('rep_id', repId).eq('status', 'pending').in('tiktok_video_id', videoIds))
  const bucket = admin.storage.from(TIKTOK_VIDEO_BUCKET)
  for (const asset of assets) if (qualified || asset.source_provider === 'tiktok') videos[qualified ? `${asset.source_provider}:${asset.tiktok_video_id}` : asset.tiktok_video_id] = { src: bucket.getPublicUrl(asset.storage_path).data.publicUrl, poster: bucket.getPublicUrl(asset.poster_path).data.publicUrl, width: asset.width, height: asset.height }
  for (const item of pending) if ((qualified || item.source_provider === 'tiktok') && item.pending_poster_path) posters[qualified ? `${item.source_provider}:${item.tiktok_video_id}` : item.tiktok_video_id] = bucket.getPublicUrl(item.pending_poster_path).data.publicUrl
  return { videos, posters }
}

export async function cleanupTikTokQueue(admin: SupabaseClient) {
  const maintenance = await tiktokQueueRpc<{ synced: number; failed: number }>(admin, 'tiktok_queue_daily_maintenance')
  const purge = (await tiktokQueueRpc<Array<{ purged_count: number; thumb_paths: string[] }>>(admin, 'tiktok_queue_purge_closed'))[0]
  const bucket = admin.storage.from(TIKTOK_VIDEO_BUCKET)
  if (purge.thumb_paths.length) checked(await bucket.remove(purge.thumb_paths))
  const expired = await tiktokQueueRpc<Array<{ ticket_id: string; keys: string[] }>>(admin, 'tiktok_expired_ticket_keys')
  let removedKeys = 0
  for (const ticket of expired) {
    if (ticket.keys.length) checked(await bucket.remove(ticket.keys))
    checked(await admin.from('tiktok_video_upload_tickets').delete().eq('id', ticket.ticket_id).is('consumed_at', null))
    removedKeys += ticket.keys.length
  }
  checked(await admin.from('tiktok_video_upload_tickets').delete().not('consumed_at', 'is', null).lt('consumed_at', new Date(Date.now() - 90 * 86400000).toISOString()))
  return { ...maintenance, purgedItems: purge.purged_count, removedThumbs: purge.thumb_paths.length, expiredTickets: expired.length, removedKeys }
}
