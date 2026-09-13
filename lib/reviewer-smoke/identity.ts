import 'server-only'

export const REVIEWER_SMOKE_SCOPE = 'sparkle-suite-reviewer-v1'
const supported = new Map([
  ['sparkle-reviewer+preview@neonrabbit.net', 'sparkle-reviewer-preview'],
  ['sparkle-reviewer+local@neonrabbit.net', 'sparkle-reviewer-local'],
])
export class ReviewerSmokeSafetyError extends Error {
  constructor(public code: string, message: string) { super(message) }
}
export interface ReviewerSmokeRep {
  id: string
  auth_user_id: string | null
  email: string
  account_classification: string
  finder_directory_visible: boolean
  custom_domain: string | null
  public_site_slug: string | null
}
export interface ReviewerSmokeAuthUser {
  id: string
  email?: string | null
  app_metadata?: Record<string, unknown>
}
export interface ReviewerSmokeSubscription {
  rep_id: string
  stripe_subscription_id: string
  stripe_customer_id: string
  stripe_livemode: boolean
  monthly_amount: number
  pricing_tier: string
}
export function reviewerSmokeSlug(email: string) {
  const slug = supported.get(email)
  if (!slug) throw new ReviewerSmokeSafetyError('REVIEWER_SMOKE_UNSUPPORTED_IDENTITY', 'Only the supported synthetic reviewer identities may be reset.')
  return slug
}

/** Only the two server-scoped fixture identities use a reserved setup slug. */
export async function reservedReviewerSetupSlug(
  admin: ReturnType<typeof import('@/lib/supabase/admin')['createAdminClient']>, repId: string,
): Promise<string | null> {
  const rep = await trustedReviewerSetupIdentity(admin, repId)
  return rep ? reviewerSmokeSlug(rep.email) : null
}

/** Server-owned reviewer authority shared by slug selection and final publication. */
export async function trustedReviewerSetupIdentity(
  admin: ReturnType<typeof import('@/lib/supabase/admin')['createAdminClient']>, repId: string,
): Promise<ReviewerSmokeRep | null> {
  const { data, error } = await admin.from('reps')
    .select('id,auth_user_id,email,account_classification,finder_directory_visible,custom_domain,public_site_slug')
    .eq('id', repId).in('email', [...supported.keys()]).maybeSingle()
  if (error) throw error
  if (!data) return null
  const rep = data as ReviewerSmokeRep
  if (rep.id !== repId) throw new ReviewerSmokeSafetyError('REVIEWER_SMOKE_IDENTITY_MISMATCH', 'Reviewer workspace identity did not match.')
  if (!rep.auth_user_id) throw new ReviewerSmokeSafetyError('REVIEWER_SMOKE_IDENTITY_MISMATCH', 'Reviewer has no linked auth identity.')
  const result = await admin.auth.admin.getUserById(rep.auth_user_id)
  if (result.error || !result.data.user) throw new ReviewerSmokeSafetyError('REVIEWER_SMOKE_IDENTITY_MISMATCH', 'Reviewer identity could not be verified.')
  assertReviewerSmokeRep(rep, result.data.user, rep.email)
  return rep
}
export function assertReviewerSmokeAuthUser(user: ReviewerSmokeAuthUser, email: string) {
  reviewerSmokeSlug(email)
  if (user.email?.trim().toLowerCase() !== email) throw new ReviewerSmokeSafetyError('REVIEWER_SMOKE_IDENTITY_MISMATCH', 'Reviewer auth identity does not match. No existing account was changed.')
  if (user.app_metadata?.reviewer_smoke_scope !== REVIEWER_SMOKE_SCOPE) {
    throw new ReviewerSmokeSafetyError('REVIEWER_SMOKE_IDENTITY_MIGRATION_REQUIRED', 'Existing reviewer needs an explicitly approved identity migration. No password reset or automatic retagging is allowed.')
  }
}
export function assertReviewerSmokeRep(rep: ReviewerSmokeRep, user: ReviewerSmokeAuthUser, email: string) {
  assertReviewerSmokeAuthUser(user, email)
  if (rep.email?.trim().toLowerCase() !== email || rep.auth_user_id !== user.id || rep.account_classification !== 'demo'
    || rep.finder_directory_visible !== false || rep.custom_domain !== null
    || (rep.public_site_slug !== null && rep.public_site_slug !== reviewerSmokeSlug(email))) {
    throw new ReviewerSmokeSafetyError('REVIEWER_SMOKE_IDENTITY_MISMATCH', 'Workspace is not the isolated supported reviewer. Inspect its identity and site assignment before any reset.')
  }
}
export function assertReviewerSmokeSubscription(row: ReviewerSmokeSubscription | null, repId: string) {
  if (!row) return
  if (row.rep_id !== repId || row.stripe_subscription_id !== `sub_reviewer_smoke_${repId}`
    || row.stripe_customer_id !== `cus_reviewer_smoke_${repId}` || row.stripe_livemode !== false
    || row.pricing_tier !== 'smoke' || ![0, 99].includes(Number(row.monthly_amount))) {
    throw new ReviewerSmokeSafetyError('REVIEWER_SMOKE_UNSAFE_ENTITLEMENT', 'Reviewer has an unexpected entitlement. No provider or customer subscription will be overwritten.')
  }
}
