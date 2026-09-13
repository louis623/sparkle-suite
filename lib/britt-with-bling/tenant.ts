import type { SupabaseClient } from '@supabase/supabase-js'

import { createAdminClient } from '@/lib/supabase/admin'
import { ensureLiveQueueSyncCodeForRep } from '@/lib/services/live-queue'
import { getJoinTeamRoster, upsertJoinTeamMember } from '@/lib/services/join-team-roster'
import { REQUIRED_SETUP_STEPS } from '@/lib/self-serve/required-setup-contract'
import {
  BRITT_WITH_BLING_PROFILE,
  BRITT_WITH_BLING_TEAM_MEMBERS,
} from './profile'

type AdminClient = SupabaseClient

export {
  BRITT_WITH_BLING_PROFILE,
  BRITT_WITH_BLING_TEAM_MEMBERS,
} from './profile'

export interface AttachBrittWithBlingTenantInput {
  email: string
  temporaryPassword?: string | null
  updateAuthPassword?: boolean
  replaceRoster?: boolean
}

export interface AttachBrittWithBlingTenantResult {
  repId: string
  email: string
  createdRep: boolean
  createdAuthUser: boolean
  updatedAuthPassword: boolean
  liveQueueSyncCode: string
  createdLiveQueue: boolean
  rosterSeededCount: number
  rosterSkippedBecauseExisting: boolean
  readyForDomainCutover: true
}

interface CandidateRepRow {
  id: string
  auth_user_id: string | null
  email: string
  display_name: string
  business_name: string
}

function cleanEmail(value: string | null | undefined) {
  const cleaned = value?.trim().toLowerCase() ?? ''
  if (!cleaned || !cleaned.includes('@')) {
    throw new Error('Britt With Bling rep email is required.')
  }
  return cleaned
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
    normalized === 'brittany' ||
    normalized === 'rep name' ||
    normalized === 'show name' ||
    normalized.includes("jane's")
  )
}

async function findCandidateReps(admin: AdminClient, email: string) {
  const { data, error } = await admin
    .from('reps')
    .select('id, auth_user_id, email, display_name, business_name')
    .or(
      [
        `email.ilike.${email}`,
        'business_name.ilike.%britt with bling%',
        `custom_domain.in.(${BRITT_WITH_BLING_PROFILE.futureCustomDomain},www.${BRITT_WITH_BLING_PROFILE.futureCustomDomain})`,
        `public_site_slug.in.(${BRITT_WITH_BLING_PROFILE.publicSiteSlug},britt-with-bling)`,
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
  input: AttachBrittWithBlingTenantInput,
  existingAuthUserId?: string | null,
) {
  const email = cleanEmail(input.email)
  const temporaryPassword = cleanTemporaryPassword(input.temporaryPassword)
  const existingUser = existingAuthUserId
    ? null
    : await findAuthUserByEmail(admin, email)
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
      'temporaryPassword is required to create Brittany\'s Sparkle Suite login.',
    )
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
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
  email: string,
  authUserId: string,
  existingRep: CandidateRepRow | null,
) {
  const socialHandles = {
    tiktok: BRITT_WITH_BLING_PROFILE.tiktokHandle,
    facebook: BRITT_WITH_BLING_PROFILE.facebookVipUrl,
  }
  const streamingLinks = {
    tiktok: BRITT_WITH_BLING_PROFILE.tiktokUrl,
    facebook: BRITT_WITH_BLING_PROFILE.facebookVipUrl,
    primary: BRITT_WITH_BLING_PROFILE.tiktokUrl,
  }
  const base = {
    auth_user_id: authUserId,
    account_classification: 'customer',
    email,
    display_name: isPlaceholderName(existingRep?.display_name)
      ? BRITT_WITH_BLING_PROFILE.displayName
      : existingRep?.display_name ?? BRITT_WITH_BLING_PROFILE.displayName,
    business_name: BRITT_WITH_BLING_PROFILE.businessName,
    custom_domain: null,
    public_site_slug: BRITT_WITH_BLING_PROFILE.publicSiteSlug,
    social_handles: socialHandles,
    streaming_links: streamingLinks,
    shop_link: BRITT_WITH_BLING_PROFILE.shopUrl,
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

async function upsertWorkspaceDefaults(admin: AdminClient, repId: string, email: string) {
  const now = new Date().toISOString()
  const completedRequiredSetupSteps = REQUIRED_SETUP_STEPS.map((step) => step.id)

  const { error: siteSettingsError } = await admin.from('site_settings').upsert(
    {
      rep_id: repId,
      tagline: 'Where Faith Meets Fizz & Every Reveal is a VIP Experience',
      banner_text: BRITT_WITH_BLING_PROFILE.announcementText,
      banner_visible: true,
      ticker_text: BRITT_WITH_BLING_PROFILE.promoTickerText,
      ticker_visible: true,
      team_name: BRITT_WITH_BLING_PROFILE.teamName,
      show_join_page: true,
      hero_animation_type: 'sparkle_rise',
      appearance_preset: 'black_diamond',
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
          'britt_with_bling_shell',
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
            repName: BRITT_WITH_BLING_PROFILE.publicName,
            businessName: BRITT_WITH_BLING_PROFILE.businessName,
            email,
            liveShowName: BRITT_WITH_BLING_PROFILE.teamName,
            publicSiteSlug: BRITT_WITH_BLING_PROFILE.publicSiteSlug,
            publicSiteUrl: `https://www.yoursparklesuite.com/${BRITT_WITH_BLING_PROFILE.publicSiteSlug}`,
            publicSiteSlugStatus: 'accepted',
            publicSiteSlugRedFlag: null,
            publicSiteSlugAlternatives: [],
          },
          site_skin: {
            preset: 'black_diamond',
          },
          welcome_copy: {
            tagline: 'Where Faith Meets Fizz & Every Reveal is a VIP Experience',
            bannerText: BRITT_WITH_BLING_PROFILE.announcementText,
            tickerText: BRITT_WITH_BLING_PROFILE.promoTickerText,
          },
        },
        generated_copy: {},
        support_state: {
          migrated_existing_client: {
            enabled: true,
            source: 'britt_with_bling_migration',
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

async function seedRoster(
  admin: AdminClient,
  repId: string,
  input: AttachBrittWithBlingTenantInput,
) {
  const existingRoster = await getJoinTeamRoster(admin, repId, {
    visibleOnly: false,
  })
  if (existingRoster.length > 0 && !input.replaceRoster) {
    return {
      rosterSeededCount: 0,
      rosterSkippedBecauseExisting: true,
    }
  }

  if (existingRoster.length > 0 && input.replaceRoster) {
    const { error } = await admin
      .from('join_team_members')
      .delete()
      .eq('rep_id', repId)
    if (error) throw error
  }

  let rosterSeededCount = 0
  for (const [index, member] of BRITT_WITH_BLING_TEAM_MEMBERS.entries()) {
    await upsertJoinTeamMember(admin, repId, {
      displayName: member.name,
      businessName: member.business,
      state: member.state,
      initials: member.initials,
      photoUrl: member.imageUrl,
      photoAlt: member.imageAlt ?? member.name,
      imageClassName: member.imageClassName,
      bio: member.bio,
      links: member.socialLinks,
      sortOrder: index,
      isVisible: member.isVisible ?? true,
    })
    rosterSeededCount += 1
  }

  return {
    rosterSeededCount,
    rosterSkippedBecauseExisting: false,
  }
}

export async function attachBrittWithBlingTenant(
  input: AttachBrittWithBlingTenantInput,
  admin: AdminClient = createAdminClient(),
): Promise<AttachBrittWithBlingTenantResult> {
  const email = cleanEmail(input.email)
  const candidates = await findCandidateReps(admin, email)
  if (candidates.length > 1) {
    throw new Error(
      `Found ${candidates.length} possible Brittany/Britt With Bling rep records. Reconcile duplicates before wiring the tenant.`,
    )
  }

  const existingRep = candidates[0] ?? null
  const auth = await ensureAuthUser(admin, { ...input, email }, existingRep?.auth_user_id)
  const rep = await upsertRep(admin, email, auth.authUserId, existingRep)
  await upsertWorkspaceDefaults(admin, rep.repId, email)
  const roster = await seedRoster(admin, rep.repId, input)
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
    rosterSeededCount: roster.rosterSeededCount,
    rosterSkippedBecauseExisting: roster.rosterSkippedBecauseExisting,
    readyForDomainCutover: true,
  }
}
