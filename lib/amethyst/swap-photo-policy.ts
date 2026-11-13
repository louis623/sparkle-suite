import type { SupabaseClient } from '@supabase/supabase-js'

export async function readSwapPhotoPolicy(admin: SupabaseClient) {
  try {
    const {data,error} = await admin.from('trade_request_photo_policy').select('photo_optional_until').eq('singleton',true).maybeSingle()
    const until = error ? null : data?.photo_optional_until ?? null
    return {required: !(until && Date.parse(until) > Date.now()), photoOptionalUntil: until as string | null}
  } catch {
    return {required:true, photoOptionalUntil:null}
  }
}
