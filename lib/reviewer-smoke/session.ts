import { createHash } from 'node:crypto'
import {
  REQUIRED_SETUP_STEPS,
  type RequiredSetupStepId,
} from '@/lib/self-serve/required-setup'
import {
  createSelfServeWorkspaceForAuthUser,
  type SelfServeWorkspaceAccount,
} from '@/lib/self-serve/signup'
import { ensureLiveQueueSyncCodeForRep } from '@/lib/services/live-queue'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  REVIEWER_SMOKE_NEXT_PATHS,
  getReviewerSmokePersona,
  normalizeReviewerSmokeState,
  type ReviewerSmokeState,
} from './config'
import { assertReviewerSmokeAuthUser, assertReviewerSmokeRep, assertReviewerSmokeSubscription, REVIEWER_SMOKE_SCOPE,
  reviewerSmokeSlug, ReviewerSmokeSafetyError, type ReviewerSmokeRep, type ReviewerSmokeAuthUser, type ReviewerSmokeSubscription } from './identity'
import { resetReviewerLiveLineup } from './live-lineup-reset'

type AdminClient = ReturnType<typeof createAdminClient>

type ExistingRep = ReviewerSmokeRep
type AuthUser = ReviewerSmokeAuthUser
const reviewerRepFields = 'id,auth_user_id,email,account_classification,finder_directory_visible,custom_domain,public_site_slug'
const reviewerSubscriptionFields = 'rep_id,stripe_subscription_id,stripe_customer_id,stripe_livemode,monthly_amount,pricing_tier'

const REVIEWER_SMOKE_FULFILLMENT = {
  designId: '00000000-0000-4000-8000-000000000101',
  listingId: '00000000-0000-4000-8000-000000000102',
  requestId: '00000000-0000-4000-8000-000000000103',
  fulfillmentId: '00000000-0000-4000-8000-000000000104',
}

export const REVIEWER_SMOKE_CALENDAR = {
  recurrenceGroupId: '00000000-0000-4000-8000-000000000201',
  tonightEventId: '00000000-0000-4000-8000-000000000202',
  futureEventId: '00000000-0000-4000-8000-000000000203',
  audienceId: '00000000-0000-4000-8000-000000000204',
}
/** Stable per-reviewer IDs prevent the local/preview personas overwriting each other's fixtures. */
export function reviewerSmokeCalendarIds(repId: string) {
  const id = (label: string) => {
    const hex = createHash('sha256').update(`sparkle-reviewer-calendar-v1:${repId}:${label}`).digest('hex')
    return `${hex.slice(0,8)}-${hex.slice(8,12)}-4${hex.slice(13,16)}-a${hex.slice(17,20)}-${hex.slice(20,32)}`
  }
  return {recurrenceGroupId:id('group'),tonightEventId:id('tonight'),futureEventId:id('future'),audienceId:id('audience')}
}

function completedStepsForState(state: ReviewerSmokeState): RequiredSetupStepId[] {
  if (state !== 'dashboard_unlocked') return []
  return REQUIRED_SETUP_STEPS.map((step) => step.id)
}

function setupAnswersForReviewer(persona: ReturnType<typeof getReviewerSmokePersona>) {
  return {
    account_basics: {
      businessName: 'Britt Test Rep Sparkle Studio',
      repName: persona.displayName,
      email: persona.email,
      publicSiteSlug: reviewerSmokeSlug(persona.email),
      note: 'Reviewer smoke mode synthetic data only.',
    },
    site_skin: {
      preset: 'sparkle_suite_morganite',
      tone: 'warm, polished, customer-ready',
    },
  }
}

async function findAuthUserByEmail(admin: AdminClient, email: string) {
  const authAdmin = admin.auth.admin as {
    listUsers?: (params?: { page?: number; perPage?: number }) => Promise<{
      data?: { users?: AuthUser[] }
      error?: unknown
    }>
  }
  if (!authAdmin.listUsers) throw new ReviewerSmokeSafetyError('REVIEWER_SMOKE_LOOKUP_UNAVAILABLE', 'Reviewer identity lookup is unavailable. No account was created or adopted.')

  for (let page = 1; page <= 5; page += 1) {
    const { data, error } = await authAdmin.listUsers({
      page,
      perPage: 100,
    })
    if (error) throw error
    const users = data?.users ?? []
    const match = users.find(
      (user) => user.email?.trim().toLowerCase() === email,
    )
    if (match) return match
    if (users.length < 100) return null
  }

  throw new ReviewerSmokeSafetyError('REVIEWER_SMOKE_LOOKUP_BOUND', 'Reviewer identity lookup exceeded its bound. No account was created or adopted.')
}

async function ensureReviewerAuthUser(
  admin: AdminClient,
  account: SelfServeWorkspaceAccount & { password: string },
) {
  reviewerSmokeSlug(account.email)
  const { data: existingRep, error: repError } = await admin
    .from('reps')
    .select(reviewerRepFields)
    .eq('email', account.email)
    .maybeSingle<ExistingRep>()

  if (repError) throw repError

  if (existingRep && !existingRep.auth_user_id) throw new ReviewerSmokeSafetyError('REVIEWER_SMOKE_IDENTITY_MISMATCH', 'Reviewer workspace has no verified auth link. No account was changed.')
  let existingAuthUser: AuthUser | null
  if (existingRep?.auth_user_id) {
    const auth = await admin.auth.admin.getUserById(existingRep.auth_user_id)
    if (auth.error || !auth.data.user) throw new ReviewerSmokeSafetyError('REVIEWER_SMOKE_IDENTITY_MISMATCH', 'Reviewer auth identity could not be verified.')
    existingAuthUser = auth.data.user
  } else existingAuthUser = await findAuthUserByEmail(admin, account.email)
  if (existingAuthUser) {
    assertReviewerSmokeAuthUser(existingAuthUser, account.email)
    const linked = await admin.from('reps').select(reviewerRepFields).eq('auth_user_id', existingAuthUser.id).maybeSingle<ExistingRep>()
    if (linked.error) throw linked.error
    if (linked.data?.id !== existingRep?.id) throw new ReviewerSmokeSafetyError('REVIEWER_SMOKE_IDENTITY_MISMATCH', 'Reviewer auth identity belongs to a different workspace.')
    if (existingRep) {
      assertReviewerSmokeRep(existingRep, existingAuthUser, account.email)
      const subscription = await admin.from('subscriptions').select(reviewerSubscriptionFields).eq('rep_id', existingRep.id).maybeSingle<ReviewerSmokeSubscription>()
      if (subscription.error) throw subscription.error
      assertReviewerSmokeSubscription(subscription.data, existingRep.id)
    }
    return {
      authUserId: existingAuthUser.id,
      repId: existingRep?.id ?? null,
      existing: true,
    }
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: account.email,
    password: account.password,
    email_confirm: true,
    app_metadata: { reviewer_smoke_scope: REVIEWER_SMOKE_SCOPE },
    user_metadata: {
      display_name: account.displayName,
      reviewer_smoke: true,
    },
  })

  if (error) throw error
  const authUserId = data.user?.id
  if (!authUserId) throw new Error('Supabase did not return reviewer auth id.')
  return { authUserId, repId: null, existing: false }
}

async function ensureReviewerWorkspace(
  admin: AdminClient,
  account: SelfServeWorkspaceAccount,
  existingRepId: string | null,
) {
  if (existingRepId) return existingRepId

  const created = await createSelfServeWorkspaceForAuthUser(account, admin)
  return created.repId
}

async function clearReviewerNicNacHistory(admin: AdminClient, repId: string) {
  const tables = ['approval_events', 'nic_nac_runs', 'nic_nac_conversations']
  for (const table of tables) {
    const { error } = await admin.from(table).delete().eq('rep_id', repId)
    if (error) throw error
  }
}

async function clearReviewerTeamManagementData(
  admin: AdminClient,
  repId: string,
) {
  const { error: conversationError } = await admin
    .from('workspace_conversations')
    .delete()
    .match({ created_by_rep_id: repId, conversation_type: 'team_onboarding' })
  if (conversationError) throw conversationError

  const { error: participantError } = await admin
    .from('team_onboarding_participants')
    .delete()
    .eq('owner_rep_id', repId)
  if (participantError) throw participantError

  const { error: rosterError } = await admin
    .from('join_team_members')
    .delete()
    .eq('rep_id', repId)
  if (rosterError) throw rosterError
}

async function ensureReviewerSubscription(admin: AdminClient, repId: string, state: ReviewerSmokeState) {
  const now = new Date()
  const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  const existing = await admin.from('subscriptions').select(reviewerSubscriptionFields).eq('rep_id', repId).maybeSingle<ReviewerSmokeSubscription>()
  if (existing.error) throw existing.error
  assertReviewerSmokeSubscription(existing.data, repId)
  const values = {
      rep_id: repId,
      stripe_subscription_id: `sub_reviewer_smoke_${repId}`,
      stripe_customer_id: `cus_reviewer_smoke_${repId}`,
      plan_tier: 'monthly',
      pricing_tier: 'smoke',
      status: state === 'checkout_required' ? 'cancelled' : 'active',
      monthly_amount: 0,
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      cancel_at_period_end: false,
      stripe_livemode: false,
      updated_at: now.toISOString(),
    }
  // Never upsert over an unexpected provider row introduced after preflight.
  const result = existing.data ? await admin.from('subscriptions').update(values)
    .eq('rep_id', repId).eq('stripe_subscription_id', `sub_reviewer_smoke_${repId}`)
    .eq('stripe_customer_id', `cus_reviewer_smoke_${repId}`).eq('stripe_livemode', false)
    .eq('pricing_tier', 'smoke').eq('monthly_amount', existing.data.monthly_amount).select('rep_id').single()
    : await admin.from('subscriptions').insert(values).select('rep_id').single()
  if (result.error || result.data?.rep_id !== repId) throw new ReviewerSmokeSafetyError('REVIEWER_SMOKE_UNSAFE_ENTITLEMENT', 'Synthetic entitlement could not be provisioned safely. No provider entitlement was overwritten.')
}

async function ensureReviewerTeamManagementAccess(
  admin: AdminClient,
  repId: string,
) {
  const now = new Date().toISOString()

  const existing = await admin.from('team_management_entitlements')
    .select('rep_id,status,source,stripe_subscription_id,stripe_price_id,stripe_customer_id').eq('rep_id', repId).maybeSingle()
  if (existing.error) throw existing.error
  if (existing.data) {
    const row = existing.data
    if (row.rep_id !== repId || row.status !== 'manual_beta' || row.source !== 'manual_beta'
      || row.stripe_subscription_id !== null || row.stripe_price_id !== null
      || row.stripe_customer_id !== `cus_reviewer_smoke_${repId}`) {
      throw new ReviewerSmokeSafetyError('REVIEWER_SMOKE_UNSAFE_ENTITLEMENT', 'Unexpected Team Management entitlement; no provider row was changed.')
    }
    return
  }
  // Insert-only: a concurrent provider entitlement must cause a conflict, never an overwrite.
  const { error } = await admin.from('team_management_entitlements').insert({
      rep_id: repId,
      status: 'manual_beta',
      source: 'manual_beta',
      stripe_subscription_id: null,
      stripe_price_id: null,
      stripe_customer_id: `cus_reviewer_smoke_${repId}`,
      updated_at: now,
    })

  if (error) throw error
}

async function clearReviewerFulfillmentSmokeData(
  admin: AdminClient,
  repId: string,
) {
  // Fixed historical fixture IDs alone are not deletion authority. If its owner
  // cannot be proven, leave the old global fixture untouched.
  const listing = await admin.from('trade_listings').select('id,rep_id,design_id')
    .eq('id', REVIEWER_SMOKE_FULFILLMENT.listingId).eq('rep_id', repId).maybeSingle()
  if (listing.error) throw listing.error
  if (!listing.data) return
  if (listing.data.id !== REVIEWER_SMOKE_FULFILLMENT.listingId || listing.data.rep_id !== repId
    || listing.data.design_id !== REVIEWER_SMOKE_FULFILLMENT.designId) throw new ReviewerSmokeSafetyError('REVIEWER_SMOKE_FIXTURE_MISMATCH', 'Legacy reviewer fixture ownership is ambiguous; no fixture was removed.')
  const request = await admin.from('trade_requests').select('id,listing_id')
    .eq('id', REVIEWER_SMOKE_FULFILLMENT.requestId).maybeSingle()
  if (request.error) throw request.error
  if (request.data && request.data.listing_id !== REVIEWER_SMOKE_FULFILLMENT.listingId) throw new ReviewerSmokeSafetyError('REVIEWER_SMOKE_FIXTURE_MISMATCH', 'Legacy reviewer request belongs to a different listing; no fixture was removed.')
  const { error: swapError } = await admin
    .from('trade_swaps')
    .delete()
    .eq('outgoing_listing_id', REVIEWER_SMOKE_FULFILLMENT.listingId)
  if (swapError) throw swapError

  const { error: fulfillmentError } = await admin
    .from('trade_fulfillment')
    .delete()
    .eq('id', REVIEWER_SMOKE_FULFILLMENT.fulfillmentId)
    .eq('request_id', REVIEWER_SMOKE_FULFILLMENT.requestId)
  if (fulfillmentError) throw fulfillmentError

  const { error: requestError } = await admin
    .from('trade_requests')
    .delete()
    .eq('id', REVIEWER_SMOKE_FULFILLMENT.requestId)
    .eq('listing_id', REVIEWER_SMOKE_FULFILLMENT.listingId)
  if (requestError) throw requestError

  const { error: listingError } = await admin
    .from('trade_listings')
    .delete()
    .eq('id', REVIEWER_SMOKE_FULFILLMENT.listingId)
    .eq('rep_id', repId)
  if (listingError) throw listingError

  // Catalog designs can be shared. A fixture listing is not authority to delete its design.
}

function nextUpcomingUtcDateAt(hourUtc: number, minuteUtc: number) {
  const now = new Date()
  const date = new Date(now)
  date.setUTCHours(hourUtc, minuteUtc, 0, 0)
  if (date.getTime() <= now.getTime() + 10 * 60 * 1000) {
    date.setUTCDate(date.getUTCDate() + 1)
  }
  return date
}

async function clearReviewerCalendarSmokeData(admin: AdminClient, repId: string) {
  const ids = reviewerSmokeCalendarIds(repId)
  const { error: overrideError } = await admin
    .from('show_reminder_overrides')
    .delete()
    .in('event_id', [
      REVIEWER_SMOKE_CALENDAR.tonightEventId,
      REVIEWER_SMOKE_CALENDAR.futureEventId,
      ids.tonightEventId, ids.futureEventId,
    ])
    .eq('rep_id', repId)
  if (overrideError) throw overrideError

  if (repId) {
    const { error: preferenceError } = await admin
      .from('show_reminder_preferences')
      .delete()
      .eq('rep_id', repId)
    if (preferenceError) throw preferenceError
  }

  const { error: audienceError } = await admin
    .from('customer_audience')
    .delete()
    .in('id', [REVIEWER_SMOKE_CALENDAR.audienceId, ids.audienceId])
    .eq('rep_id', repId)
  if (audienceError) throw audienceError

  const { error: eventError } = await admin
    .from('calendar_events')
    .delete()
    .in('id', [
      REVIEWER_SMOKE_CALENDAR.tonightEventId,
      REVIEWER_SMOKE_CALENDAR.futureEventId,
      ids.tonightEventId, ids.futureEventId,
    ])
    .eq('rep_id', repId)
  if (eventError) throw eventError
}

async function seedReviewerCalendarSmokeData(admin: AdminClient, repId: string) {
  await clearReviewerCalendarSmokeData(admin, repId)
  const ids = reviewerSmokeCalendarIds(repId)

  const now = new Date().toISOString()
  const firstEventDate = nextUpcomingUtcDateAt(23, 30)
  const secondEventDate = new Date(firstEventDate)
  secondEventDate.setUTCDate(secondEventDate.getUTCDate() + 7)
  const firstEventTime = firstEventDate.toISOString()
  const secondEventTime = secondEventDate.toISOString()

  const { error: eventError } = await admin.from('calendar_events').insert(
    [
      {
        id: ids.tonightEventId,
        rep_id: repId,
        platform: 'TikTok',
        event_time: firstEventTime,
        time_zone: 'America/New_York',
        duration_minutes: 60,
        title: 'Reviewer Smoke Friday Sparkles',
        description: 'Synthetic reviewer smoke live show.',
        discount_codes: [{ code: 'SMOKE10', description: 'Smoke test code' }],
        featured_collections: ['Reviewer Smoke Collection'],
        streaming_destinations: [
          { platform: 'tiktok', url: 'https://www.tiktok.com/@sparklesuitereviewer' },
        ],
        is_recurring: true,
        recurrence_group_id: ids.recurrenceGroupId,
        recurrence_rule: 'weekly',
        status: 'scheduled',
        updated_at: now,
      },
      {
        id: ids.futureEventId,
        rep_id: repId,
        platform: 'TikTok',
        event_time: secondEventTime,
        time_zone: 'America/New_York',
        duration_minutes: 60,
        title: 'Reviewer Smoke Friday Sparkles',
        description: 'Synthetic reviewer smoke future live show.',
        discount_codes: [{ code: 'SMOKE10', description: 'Smoke test code' }],
        featured_collections: ['Reviewer Smoke Collection'],
        streaming_destinations: [
          { platform: 'tiktok', url: 'https://www.tiktok.com/@sparklesuitereviewer' },
          { platform: 'whatnot', url: 'https://www.whatnot.com/user/sparklesuitereviewer' },
        ],
        is_recurring: true,
        recurrence_group_id: ids.recurrenceGroupId,
        recurrence_rule: 'weekly',
        status: 'scheduled',
        updated_at: now,
      },
    ],
  )
  if (eventError) throw eventError

  const { error: audienceError } = await admin.from('customer_audience').insert(
    {
      id: ids.audienceId,
      rep_id: repId,
      name: 'Jamie Reviewer',
      phone: '+15555550101',
      email: 'jamie.reviewer@example.com',
      sms_consent: true,
      email_consent: true,
      marketing_consent: true,
      consent_date: now,
      sms_opted_out_at: null,
      email_opted_out_at: null,
      stop_keyword_received_at: null,
      updated_at: now,
    },
  )
  if (audienceError) throw audienceError
}

export async function resetReviewerSmokeSession(
  requestedState: unknown,
  admin: AdminClient = createAdminClient(),
) {
  const state = normalizeReviewerSmokeState(requestedState)
  const persona = getReviewerSmokePersona()
  const publicSiteSlug = reviewerSmokeSlug(persona.email)
  const account = {
    authUserId: '',
    email: persona.email,
    displayName: persona.displayName,
    password: persona.password,
    finderDirectoryVisible: false,
  }
  const { authUserId, repId: existingRepId, existing } = await ensureReviewerAuthUser(
    admin,
    account,
  )
  const repId = await ensureReviewerWorkspace(
    admin,
    {
      authUserId,
      email: persona.email,
      displayName: persona.displayName,
      finderDirectoryVisible: false,
      accountClassification: 'demo',
    },
    existingRepId,
  )
  // Fresh required-setup reviewers need the same non-live $0 entitlement as the
  // dashboard fixture. Checkout keeps only an inactive synthetic row, never paid access.
  await ensureReviewerSubscription(admin, repId, state)
  const lineup = await resetReviewerLiveLineup(admin, repId, authUserId, persona.email)
  await clearReviewerTeamManagementData(admin, repId)
  await clearReviewerNicNacHistory(admin, repId)
  await clearReviewerFulfillmentSmokeData(admin, repId)
  await clearReviewerCalendarSmokeData(admin, repId)
  const now = new Date().toISOString()
  const status = state
  const completedSteps = completedStepsForState(state)

  const { data: updatedRep, error: repUpdateError } = await admin
    .from('reps')
    .update({
      display_name: persona.displayName,
      business_name: 'Britt Test Rep Sparkle Studio',
      account_classification: 'demo',
      status: state === 'dashboard_unlocked' ? 'active' : 'onboarding',
      finder_directory_visible: false,
      public_site_slug: publicSiteSlug,
      updated_at: now,
    })
    .eq('id', repId).eq('auth_user_id', authUserId).eq('email', persona.email).eq('account_classification', 'demo')
    .select('id').single()

  if (repUpdateError || updatedRep?.id !== repId) throw new ReviewerSmokeSafetyError('REVIEWER_SMOKE_IDENTITY_MISMATCH', 'Reviewer workspace changed during reset. No session was issued.')

  const { error: setupError } = await admin
    .from('self_serve_setup_sessions')
    .upsert(
      {
        rep_id: repId,
        status,
        current_step:
          state === 'dashboard_unlocked'
            ? 'final_preview_approval'
            : 'account_basics',
        completed_steps: completedSteps,
        answers: setupAnswersForReviewer(persona),
        generated_copy: {},
        support_state: {
          reviewer_smoke: {
            enabled: true,
            reset_at: now,
            state,
            scope: REVIEWER_SMOKE_SCOPE,
            live_lineup: lineup,
          },
        },
        dashboard_unlocked_at:
          state === 'dashboard_unlocked' ? now : null,
        updated_at: now,
      },
      { onConflict: 'rep_id' },
    )

  if (setupError) throw setupError

  if (state !== 'checkout_required') {
    await ensureLiveQueueSyncCodeForRep(admin, { repId })
  }
  if (state === 'dashboard_unlocked') {
    await ensureReviewerTeamManagementAccess(admin, repId)
    await seedReviewerCalendarSmokeData(admin, repId)
  }
  // Existing identity scope is never automatically stamped or repaired. Only a
  // fully verified, successfully reset synthetic reviewer may have its login refreshed.
  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(authUserId, { password: persona.password,
      user_metadata: { display_name: persona.displayName, reviewer_smoke: true } })
    if (error) throw error
  }

  return {
    ok: true as const,
    repId,
    email: persona.email,
    password: persona.password,
    displayName: persona.displayName,
    state,
    next: REVIEWER_SMOKE_NEXT_PATHS[state],
  }
}
