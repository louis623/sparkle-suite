import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireOwnedDanceFloorListing } from './trade-board'
import { danceFloorError } from './errors'
import { processRepCustomListingPhotoUrl } from './listing-photo-processing'

export async function issueDanceFloorPhotoUpload(supabase: SupabaseClient, repId: string, listingId: string) {
  await requireOwnedDanceFloorListing(supabase, repId, listingId)
  const admin = createAdminClient()
  const { data: reservation, error } = await admin.rpc('rpc_claim_trade_listing_photo_v1', {
    p_rep_id: repId, p_listing_id: listingId, p_storage_path: null,
  })
  if (error) throw danceFloorError(error.message)
  const { data, error: uploadError } = await admin.storage.from('jewelry-photos')
    .createSignedUploadUrl(reservation.storage_path, { upsert: false })
  if (uploadError || !data) throw danceFloorError('PHOTO_UPLOAD_FAILED')
  return { path: reservation.storage_path as string, signedUrl: data.signedUrl, role: 'jewelry' as const }
}
export async function processDanceFloorPhoto(supabase: SupabaseClient, repId: string, listingId: string, path: string) {
  await requireOwnedDanceFloorListing(supabase, repId, listingId)
  // Prefix validation is a fast refusal; the atomic receipt is the binding authority.
  if (!path.startsWith(repId + '/dance-floor/' + listingId + '/jewelry/') ||
      !/^[0-9a-f-]+\/dance-floor\/[0-9a-f-]+\/jewelry\/[0-9a-f-]+$/i.test(path)) throw danceFloorError('PHOTO_TARGET_INVALID')
  const admin = createAdminClient()
  const { error } = await admin.rpc('rpc_claim_trade_listing_photo_v1', {
    p_rep_id: repId, p_listing_id: listingId, p_storage_path: path,
  })
  if (error) throw danceFloorError(error.message)
  const { data } = admin.storage.from('jewelry-photos').getPublicUrl(path)
  const processed = await processRepCustomListingPhotoUrl({
    repId, sourceImageUrl: data.publicUrl, filenameStem: listingId + '-listing-photo',
  })
  return processed.photoUrl
}
