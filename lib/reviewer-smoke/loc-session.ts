import 'server-only'
import { randomBytes, createHash, timingSafeEqual } from 'node:crypto'
import type { User } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import { createSelfServeWorkspaceForAuthUser } from '@/lib/self-serve/signup'
import { REQUIRED_SETUP_STEPS } from '@/lib/self-serve/required-setup'

export const LOC_REVIEWER_EMAIL = 'sparkle-reviewer+loc@example.test'
export const LOC_REVIEWER_SCOPE = 'loc-control-center-v1'
export type LocReviewerState = 'required_setup' | 'dashboard_unlocked'
type Admin = ReturnType<typeof createAdminClient>
export class LocReviewerError extends Error {
  constructor(public status: number, message: string) { super(message) }
}
export function verifyLocReviewerToken(token: unknown) {
  const expected = process.env.LOC_REVIEWER_SMOKE_TOKEN?.trim() ?? ''
  if (expected.length < 32) throw new LocReviewerError(503, 'LOC reviewer access is not configured.')
  if (typeof token !== 'string' || token.length > 512 || !timingSafeEqual(
    createHash('sha256').update(token).digest(), createHash('sha256').update(expected).digest(),
  )) throw new LocReviewerError(403, 'Reviewer access key is invalid.')
}
export function isLocReviewer(user: Pick<User, 'email' | 'app_metadata'>) {
  return user.email?.toLowerCase() === LOC_REVIEWER_EMAIL && user.app_metadata?.loc_reviewer_scope === LOC_REVIEWER_SCOPE
}
async function findReviewerAuth(admin: Admin) {
  // Exact lookup through the supported admin API; never adopt the first user or
  // silently stop at the first page when the account population grows.
  for (let page = 1; page <= 100; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw error
    const user = data.users.find(row => row.email?.toLowerCase() === LOC_REVIEWER_EMAIL)
    if (user) return user
    if (data.users.length < 1000) return null
  }
  throw new LocReviewerError(503, 'Reviewer identity lookup exceeded its bound.')
}

/** Never calls the legacy destructive reset. Returns an OTP only to the server route. */
export async function prepareLocReviewer(state: LocReviewerState, admin: Admin = createAdminClient()) {
  const { data: existingRep, error: repError } = await admin.from('reps')
    .select('id,auth_user_id,email,account_classification,finder_directory_visible,custom_domain,public_site_slug')
    .eq('email', LOC_REVIEWER_EMAIL).maybeSingle()
  if (repError) throw repError
  let user = await findReviewerAuth(admin)
  if (user && !isLocReviewer(user)) throw new LocReviewerError(409, 'Existing identity is not the dedicated LOC reviewer.')
  if (user) {
    const linked = await admin.from('reps').select('id,email').eq('auth_user_id', user.id).maybeSingle()
    if (linked.error) throw linked.error
    if (linked.data && (linked.data.id !== existingRep?.id || linked.data.email !== LOC_REVIEWER_EMAIL))
      throw new LocReviewerError(409, 'Auth identity is linked to a different workspace.')
  }
  if (existingRep && (!user || existingRep.auth_user_id !== user.id || existingRep.account_classification !== 'demo'
    || existingRep.finder_directory_visible || existingRep.custom_domain || existingRep.public_site_slug)) {
    throw new LocReviewerError(409, 'Existing workspace is not an isolated LOC reviewer.')
  }
  let subscription: Record<string, unknown> | null = null
  if (existingRep) {
    const read = await admin.from('subscriptions').select('stripe_subscription_id,stripe_customer_id,stripe_livemode,monthly_amount')
      .eq('rep_id', existingRep.id).maybeSingle()
    if (read.error) throw read.error
    subscription = read.data
    if (subscription && (subscription.stripe_livemode !== false || Number(subscription.monthly_amount) !== 0
      || subscription.stripe_subscription_id !== `sub_loc_reviewer_${existingRep.id}`
      || subscription.stripe_customer_id !== `cus_loc_reviewer_${existingRep.id}`)) {
      throw new LocReviewerError(409, 'Reviewer has an unexpected entitlement; no account changes were made.')
    }
  }
  // All existing identity and entitlement checks finish before the first write.
  if (!user) {
    const created = await admin.auth.admin.createUser({ email: LOC_REVIEWER_EMAIL, email_confirm: true,
      password: randomBytes(48).toString('base64url'),
      app_metadata: { loc_reviewer_scope: LOC_REVIEWER_SCOPE },
      user_metadata: { display_name: 'LOC Synthetic Reviewer', reviewer_smoke: true },
    })
    if (created.error || !created.data.user) throw new LocReviewerError(409, 'Could not create dedicated reviewer; inspect before retrying.')
    user = created.data.user
  }
  const repId = existingRep?.id ?? (await createSelfServeWorkspaceForAuthUser({
    authUserId: user.id, email: LOC_REVIEWER_EMAIL, displayName: 'LOC Synthetic Reviewer',
    accountClassification: 'demo', finderDirectoryVisible: false,
  }, admin)).repId
  const now = new Date().toISOString()
  // Inserting an entitlement never overwrites one established by another path.
  if (!subscription) {
    const { error } = await admin.from('subscriptions').insert({ rep_id: repId,
      stripe_subscription_id: `sub_loc_reviewer_${repId}`, stripe_customer_id: `cus_loc_reviewer_${repId}`,
      stripe_livemode: false, monthly_amount: 0, plan_tier: 'monthly', pricing_tier: 'smoke', status: 'active',
      current_period_start: now, current_period_end: '2099-01-01T00:00:00.000Z', cancel_at_period_end: false,
    })
    if (error) throw error
  }
  const { data: setup, error: setupReadError } = await admin.from('self_serve_setup_sessions')
    .select('rep_id,status,answers,support_state').eq('rep_id', repId).maybeSingle()
  if (setupReadError) throw setupReadError
  const setupValues = { status: state, current_step: state === 'dashboard_unlocked' ? 'final_preview_approval' : 'account_basics',
    completed_steps: state === 'dashboard_unlocked' ? REQUIRED_SETUP_STEPS.map(step => step.id) : [],
    dashboard_unlocked_at: state === 'dashboard_unlocked' ? now : null, updated_at: now,
    support_state: { ...(setup?.support_state ?? {}), reviewer_smoke: { enabled: true, scope: LOC_REVIEWER_SCOPE, state } },
  }
  const setupWrite = setup
    ? await admin.from('self_serve_setup_sessions').update(setupValues).eq('rep_id', repId)
    : await admin.from('self_serve_setup_sessions').insert({ rep_id: repId, ...setupValues, answers: {} })
  if (setupWrite.error) throw setupWrite.error
  const repWrite = await admin.from('reps').update({ status: state === 'dashboard_unlocked' ? 'active' : 'onboarding', updated_at: now })
    .eq('id', repId).eq('auth_user_id', user.id).eq('email', LOC_REVIEWER_EMAIL).eq('account_classification', 'demo')
    .select('id').single()
  if (repWrite.error || repWrite.data?.id !== repId) throw new LocReviewerError(409, 'Reviewer workspace changed during setup; no session was issued.')
  // Admin generateLink creates an OTP without sending email or changing passwords.
  const link = await admin.auth.admin.generateLink({ type: 'magiclink', email: LOC_REVIEWER_EMAIL })
  if (link.error || !link.data.properties?.hashed_token || link.data.user?.id !== user.id) {
    throw new LocReviewerError(503, 'Reviewer session could not be established. Saved fixture data is retained.')
  }
  return { repId, userId: user.id, tokenHash: link.data.properties.hashed_token, state }
}
