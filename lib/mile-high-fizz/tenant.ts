import type { SupabaseClient } from '@supabase/supabase-js'

import { createAdminClient } from '@/lib/supabase/admin'
import { ensureLiveQueueSyncCodeForRep } from '@/lib/services/live-queue'
import { REQUIRED_SETUP_STEPS } from '@/lib/self-serve/required-setup-contract'
import { MILE_HIGH_FIZZ_PROFILE } from './profile'

type AdminClient = SupabaseClient

export { MILE_HIGH_FIZZ_PROFILE } from './profile'

export interface AttachMileHighFizzTenantInput {
  temporaryPassword?: string | null
  updateAuthPassword?: boolean
}

export interface AttachMileHighFizzTenantResult {
  repId: string
  email: string
  createdRep: boolean
  createdAuthUser: boolean
  updatedAuthPassword: boolean
  liveQueueSyncCode: string
  createdLiveQueue: boolean
  readyForDomainCutover: true
}

interface CandidateRepRow {
  id: string
  auth_user_id: string | null
  email: string
  display_name: string
  business_name: string
}

function cleanTemporaryPassword(value: string | null | undefined) {
  const cleaned = value?.trim() ?? ''
  if (!cleaned) return null
  if (cleaned.length < 12) {
    throw new Error('Temporary password must be at least 12 characters.')
  }
  return cleaned
}

function isPlaceholderName(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase() ?? ''
  return (
    normalized.length === 0 ||
    normalized === 'lindsey' ||
    normalized === 'rep name' ||
    normalized === 'show name' ||
    normalized.includes("jane's")
  )
}

async function findCandidateReps(admin: AdminClient) {
  const { data, error } = await admin
    .from('reps')
    .select('id, auth_user_id, email, display_name, business_name')
    .or(
      [
        `email.ilike.${MILE_HIGH_FIZZ_PROFILE.email}`,
        'business_name.ilike.%mile high fizz%',
        `custom_domain.in.(${MILE_HIGH_FIZZ_PROFILE.futureCustomDomain},www.${MILE_HIGH_FIZZ_PROFILE.futureCustomDomain})`,
        `public_site_slug.in.(${MILE_HIGH_FIZZ_PROFILE.publicSiteSlug},mile-high-fizz)`,
      ].join(','),
    )

  if (error) throw error
  return (data ?? []) as CandidateRepRow[]
}

async function findAuthUserByEmail(admin: AdminClient, email: string) {
  const { data, error } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  })
  if (error) throw error

  return (
    data.users.find(
      (user) => user.email?.trim().toLowerCase() === email.toLowerCase(),
    ) ?? null
  )
}

async function ensureAuthUser(
  admin: AdminClient,
  input: AttachMileHighFizzTenantInput,
  existingAuthUserId?: string | null,
) {
  const temporaryPassword = cleanTemporaryPassword(input.temporaryPassword)
  const existingUser = existingAuthUserId
    ? null
    : await findAuthUserByEmail(admin, MILE_HIGH_FIZZ_PROFILE.email)
  const authUserId = existingAuthUserId || existingUser?.id || null

  if (authUserId) {
    if (input.updateAuthPassword) {
      if (!temporaryPassword) {
        throw new Error(
          'temporaryPassword is required when updateAuthPassword is true.',
        )
      }
      const { error } = await admin.auth.admin.updateUserById(authUserId, {
        password: temporaryPassword,
        email_confirm: true,
      })
      if (error) throw error
      return { authUserId, createdAuthUser: false, updatedAuthPassword: true }
    }

    return { authUserId, createdAuthUser: false, updatedAuthPassword: false }
  }

  if (!temporaryPassword) {
    throw new Error(
      'temporaryPassword is required to create Lindsey\'s Sparkle Suite login.',
    )
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: MILE_HIGH_FIZZ_PROFILE.email,
    password: temporaryPassword,
    email_confirm: true,
  })
  if (error) throw error
  const createdId = data.user?.id
  if (!createdId) throw new Error('Supabase did not return an auth user id.')

  return {
    authUserId: createdId,
    createdAuthUser: true,
    updatedAuthPassword: false,
  }
}

async function upsertRep(
  admin: AdminClient,
  authUserId: string,
  existingRep: CandidateRepRow | null,
) {
  const socialHandles = {
    tiktok: MILE_HIGH_FIZZ_PROFILE.tiktokHandle,
  }
  const streamingLinks = {
    tiktok: MILE_HIGH_FIZZ_PROFILE.tiktokUrl,
    primary: MILE_HIGH_FIZZ_PROFILE.tiktokUrl,
  }
  const base = {
    auth_user_id: authUserId,
    account_classification: 'customer',
    email: MILE_HIGH_FIZZ_PROFILE.email,
    display_name: isPlaceholderName(existingRep?.display_name)
      ? MILE_HIGH_FIZZ_PROFILE.displayName
      : existingRep?.display_name ?? MILE_HIGH_FIZZ_PROFILE.displayName,
    business_name: MILE_HIGH_FIZZ_PROFILE.businessName,
    custom_domain: null,
    public_site_slug: MILE_HIGH_FIZZ_PROFILE.publicSiteSlug,
    social_handles: socialHandles,
    streaming_links: streamingLinks,
    template_id: 'default',
    status: 'active',
    finder_directory_visible: true,
  }

  if (existingRep) {
    const { data, error } = await admin
      .from('reps')
      .update(base)
      .eq('id', existingRep.id)
      .select('id, email')
      .single()
    if (error) throw error
    return { repId: data.id as string, email: data.email as string, createdRep: false }
  }

  const { data, error } = await admin
    .from('reps')
    .insert({
      ...base,
      shop_link: null,
    })
    .select('id, email')
    .single()
  if (error) throw error
  return { repId: data.id as string, email: data.email as string, createdRep: true }
}

async function upsertWorkspaceDefaults(admin: AdminClient, repId: string) {
  const now = new Date().toISOString()
  const completedRequiredSetupSteps = REQUIRED_SETUP_STEPS.map((step) => step.id)

  const { error: siteSettingsError } = await admin.from('site_settings').upsert(
    {
      rep_id: repId,
      tagline: 'Revealing something magical together.',
      banner_text:
        'Place your order, hop into the live party, and watch Lindsey reveal your sparkle.',
      banner_visible: true,
      ticker_text:
        'Live reveals, fizz parties, and customer-first sparkle with Mile High Fizz.',
      ticker_visible: true,
      team_name: MILE_HIGH_FIZZ_PROFILE.teamName,
      show_join_page: true,
      hero_animation_type: 'sparkle_rise',
      appearance_preset: 'alpine_opal',
      customer_site_template: 'amethyst',
    },
    { onConflict: 'rep_id' },
  )
  if (siteSettingsError) throw siteSettingsError

  const { error: onboardingError } = await admin
    .from('onboarding_status')
    .upsert(
      {
        rep_id: repId,
        current_stage: 'launch_ready',
        completed_steps: [
          'existing_client',
          'mile_high_fizz_shell',
          'workspace_defaults',
          'public_preview_ready',
        ],
      },
      { onConflict: 'rep_id' },
    )
  if (onboardingError) throw onboardingError

  const { error: setupSessionError } = await admin
    .from('self_serve_setup_sessions')
    .upsert(
      {
        rep_id: repId,
        status: 'dashboard_unlocked',
        current_step: 'final_preview_approval',
        completed_steps: completedRequiredSetupSteps,
        answers: {
          account_basics: {
            repName: MILE_HIGH_FIZZ_PROFILE.publicName,
            businessName: MILE_HIGH_FIZZ_PROFILE.businessName,
            email: MILE_HIGH_FIZZ_PROFILE.email,
            liveShowName: MILE_HIGH_FIZZ_PROFILE.businessName,
            publicSiteSlug: MILE_HIGH_FIZZ_PROFILE.publicSiteSlug,
            publicSiteUrl: `https://www.yoursparklesuite.com/${MILE_HIGH_FIZZ_PROFILE.publicSiteSlug}`,
            publicSiteSlugStatus: 'accepted',
            publicSiteSlugRedFlag: null,
            publicSiteSlugAlternatives: [],
          },
          site_skin: {
            preset: 'alpine_opal',
          },
          welcome_copy: {
            tagline: 'Revealing something magical together.',
            bannerText:
              'Place your order, hop into the live party, and watch Lindsey reveal your sparkle.',
            tickerText:
              'Live reveals, fizz parties, and customer-first sparkle with Mile High Fizz.',
          },
        },
        generated_copy: {},
        support_state: {
          migrated_existing_client: {
            enabled: true,
            source: 'mile_high_fizz_migration',
            reason:
              'Existing migrated site preview should bypass new-rep required setup.',
          },
        },
        dashboard_unlocked_at: now,
        updated_at: now,
      },
      { onConflict: 'rep_id' },
    )
  if (setupSessionError) throw setupSessionError

  const { error: subscriptionError } = await admin
    .from('subscriptions')
    .upsert(
      {
        rep_id: repId,
        plan_tier: 'monthly',
        status: 'active',
        monthly_amount: 0,
        stripe_subscription_id: null,
        stripe_customer_id: null,
        cancelled_at: null,
        cancelled_reason: null,
        cancellation_effective_date: null,
      },
      { onConflict: 'rep_id' },
    )
  if (subscriptionError) throw subscriptionError
}

export async function attachMileHighFizzTenant(
  input: AttachMileHighFizzTenantInput = {},
  admin: AdminClient = createAdminClient(),
): Promise<AttachMileHighFizzTenantResult> {
  const candidates = await findCandidateReps(admin)
  if (candidates.length > 1) {
    throw new Error(
      `Found ${candidates.length} possible Lindsey/Mile High Fizz rep records. Reconcile duplicates before wiring the tenant.`,
    )
  }

  const existingRep = candidates[0] ?? null
  const auth = await ensureAuthUser(admin, input, existingRep?.auth_user_id)
  const rep = await upsertRep(admin, auth.authUserId, existingRep)
  await upsertWorkspaceDefaults(admin, rep.repId)
  const liveQueue = await ensureLiveQueueSyncCodeForRep(admin, {
    repId: rep.repId,
  })

  return {
    repId: rep.repId,
    email: rep.email,
    createdRep: rep.createdRep,
    createdAuthUser: auth.createdAuthUser,
    updatedAuthPassword: auth.updatedAuthPassword,
    liveQueueSyncCode: liveQueue.syncCode,
    createdLiveQueue: liveQueue.created,
    readyForDomainCutover: true,
  }
}
