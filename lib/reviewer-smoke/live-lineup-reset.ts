import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { reviewerSmokeSlug, ReviewerSmokeSafetyError } from './identity'

/** Stop this fixture's publisher/pairing UI before reset. SQL guards cleanup atomically,
 * but does not fence new pairing after its final check. No ready feed is fabricated. */
export async function resetReviewerLiveLineup(db: SupabaseClient, repId: string, authUserId: string, email: string) {
  reviewerSmokeSlug(email)
  const { data, error } = await db.rpc('reset_reviewer_live_lineup', { p_rep_id: repId, p_auth_user_id: authUserId, p_email: email })
  if (error) throw new ReviewerSmokeSafetyError('REVIEWER_SMOKE_LINEUP_RESET_UNAVAILABLE', 'Reviewer lineup reset was not confirmed. The guarded reset migration and supported identity are required; no ready state was fabricated.')
  const receipt = Array.isArray(data) && data.length === 1 ? data[0] : null
  const count = (value: unknown) => (typeof value === 'number' || typeof value === 'string' && /^(0|[1-9][0-9]*)$/.test(value))
    && Number.isSafeInteger(Number(value)) && Number(value) >= 0
  if (!receipt || receipt.rep_id !== repId || receipt.auth_user_id !== authUserId || receipt.ready !== false
    || typeof receipt.reset_at !== 'string' || !Number.isFinite(Date.parse(receipt.reset_at))
    || !count(receipt.deleted_states) || Number(receipt.deleted_states) > 1
    || !count(receipt.deleted_tokens) || !count(receipt.deleted_archives)) {
    throw new ReviewerSmokeSafetyError('REVIEWER_SMOKE_INVALID_RESET_RECEIPT', 'Reviewer lineup reset returned an invalid receipt; inspect before retrying.')
  }
  return { ready: false as const, state: 'not_initialized' as const, resetAt: receipt.reset_at as string }
}
