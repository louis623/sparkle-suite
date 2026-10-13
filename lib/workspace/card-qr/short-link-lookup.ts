import { createAdminClient } from '@/lib/supabase/admin'
import {
  cardQrUuidPrefixBounds,
  type CardQrShortLinkRep,
} from '@/lib/workspace/card-qr/short-link'

/** Logged-out lookup. Service role stays on the server. No new table. */
export async function lookupCardQrShortLinkReps(prefix: string): Promise<CardQrShortLinkRep[]> {
  const bounds = cardQrUuidPrefixBounds(prefix)
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('reps')
    .select('id, public_site_slug, custom_domain')
    .gte('id', bounds.from)
    .lte('id', bounds.to)
    .limit(2)
  if (error) throw error
  return (data ?? []) as CardQrShortLinkRep[]
}
