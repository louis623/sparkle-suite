import type { SupabaseClient } from '@supabase/supabase-js'

import { createAdminClient } from '@/lib/supabase/admin'
import { ensureLiveQueueSyncCodeForRep } from '@/lib/services/live-queue'
import { REQUIRED_SETUP_STEPS } from '@/lib/self-serve/required-setup-contract'
import { BLING_KITCHEN_PROFILE } from './profile'

type AdminClient = SupabaseClient

export { BLING_KITCHEN_PROFILE } from './profile'

export interface AttachBlingKitchenTenantInput {
  temporaryPassword?: string | null
  updateAuthPassword?: boolean
}

export interface AttachBlingKitchenTenantResult {
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
    normalized === 'heather' ||
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
        `email.ilike.${BLING_KITCHEN_PROFILE.email}`,
        'business_name.ilike.%blingkitchen%',
        'business_name.ilike.%bling kitchen%',
        `custom_domain.in.(${BLING_KITCHEN_PROFILE.futureCustomDomain},www.${BLING_KITCHEN_PROFILE.futureCustomDomain})`,
        `public_site_slug.in.(${BLING_KITCHEN_PROFILE.publicSiteSlug},bling-kitchen)`,
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
  input: AttachBlingKitchenTenantInput,
  existingAuthUserId?: string | null,
) {
  const temporaryPassword = cleanTemporaryPassword(input.temporaryPassword)
  const existingUser = existingAuthUserId
    ? null
    : await findAuthUserByEmail(admin, BLING_KITCHEN_PROFILE.email)
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
      "temporaryPassword is required to create Heather's Sparkle Suite login.",
    )
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: BLING_KITCHEN_PROFILE.email,
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
    tiktok: BLING_KITCHEN_PROFILE.tiktokHandle,
    facebook: BLING_KITCHEN_PROFILE.facebookVipUrl,
  }
  const streamingLinks = {
    tiktok: BLING_KITCHEN_PROFILE.tiktokUrl,
    facebook: BLING_KITCHEN_PROFILE.facebookVipUrl,
    primary: BLING_KITCHEN_PROFILE.tiktokUrl,
  }
  const base = {
    auth_user_id: authUserId,
    account_classification: 'customer',
    email: BLING_KITCHEN_PROFILE.email,
    display_name: isPlaceholderName(existingRep?.display_name)
      ? BLING_KITCHEN_PROFILE.displayName
      : existingRep?.display_name ?? BLING_KITCHEN_PROFILE.displayName,
    business_name: BLING_KITCHEN_PROFILE.businessName,
    custom_domain: null,
    public_site_slug: BLING_KITCHEN_PROFILE.publicSiteSlug,
    social_handles: socialHandles,
    streaming_links: streamingLinks,
    shop_link: BLING_KITCHEN_PROFILE.shopUrl,
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
    .insert(base)
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
      tagline: 'Serving Sparkle from the Heart of the Home',
      banner_text: BLING_KITCHEN_PROFILE.announcementText,
      banner_visible: true,
      ticker_text: BLING_KITCHEN_PROFILE.promoTickerText,
      ticker_visible: true,
      team_name: BLING_KITCHEN_PROFILE.teamName,
      show_join_page: true,
      hero_animation_type: 'sparkle_rise',
      appearance_preset: 'moonstone',
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
          'bling_kitchen_shell',
          'workspace_defaults',
          'public_preview_ready',
          'recipes_seed_ready',
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
            repName: BLING_KITCHEN_PROFILE.publicName,
            businessName: BLING_KITCHEN_PROFILE.businessName,
            email: BLING_KITCHEN_PROFILE.email,
            liveShowName: BLING_KITCHEN_PROFILE.businessName,
            publicSiteSlug: BLING_KITCHEN_PROFILE.publicSiteSlug,
            publicSiteUrl: `https://www.yoursparklesuite.com/${BLING_KITCHEN_PROFILE.publicSiteSlug}`,
            publicSiteSlugStatus: 'accepted',
            publicSiteSlugRedFlag: null,
            publicSiteSlugAlternatives: [],
          },
          site_skin: {
            preset: 'moonstone',
          },
          welcome_copy: {
            tagline: 'Serving Sparkle from the Heart of the Home',
            bannerText: BLING_KITCHEN_PROFILE.announcementText,
            tickerText: BLING_KITCHEN_PROFILE.promoTickerText,
          },
        },
        generated_copy: {},
        support_state: {
          migrated_existing_client: {
            enabled: true,
            source: 'bling_kitchen_migration',
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

export async function attachBlingKitchenTenant(
  input: AttachBlingKitchenTenantInput = {},
  admin: AdminClient = createAdminClient(),
): Promise<AttachBlingKitchenTenantResult> {
  const candidates = await findCandidateReps(admin)
  if (candidates.length > 1) {
    throw new Error(
      `Found ${candidates.length} possible Heather/BlingKitchen rep records. Reconcile duplicates before wiring the tenant.`,
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
