import { getNewPasswordValidationError } from '@/lib/auth/password-policy'
import {
  buildPrelaunchLaunchBuildReadiness,
  normalizePrelaunchLaunchBuildRows,
  PRELAUNCH_LAUNCH_BUILD_SELECT,
  type PrelaunchLaunchBuild,
  type PrelaunchLaunchBuildGateStatus,
  type PrelaunchLaunchBuildRow,
  type PrelaunchLaunchBuildStage,
  type PrelaunchLaunchBuildStatus,
} from '@/lib/prelaunch/launch-builds'
import { createAdminClient } from '@/lib/supabase/admin'

type AdminClient = ReturnType<typeof createAdminClient>

interface PreparePrelaunchClientAccountInput {
  launchBuildId: string
  temporaryPassword: string
  temporaryPasswordConfirm: string
  notes?: string
  operatorRepId?: string | null
}

interface LaunchBuildClientAccountRow {
  id: string
  rep_id: string | null
  stage: PrelaunchLaunchBuildStage
  status: PrelaunchLaunchBuildStatus
  lead_name: string
  lead_email: string
  setup_profile_status: PrelaunchLaunchBuildGateStatus
  payment_gate_status: PrelaunchLaunchBuildGateStatus
  agreement_gate_status: PrelaunchLaunchBuildGateStatus
  build_check_status: PrelaunchLaunchBuildGateStatus
  production_roster_status: PrelaunchLaunchBuildGateStatus
  blockers: string[]
}

interface LaunchSetupProfileClientAccountRow {
  business_name: string
  public_site_goal: string
  custom_domain: string | null
  primary_social_url: string | null
  secondary_social_url: string | null
  shop_url: string | null
  brand_notes: string
}

interface ExistingRepRow {
  id: string
  email: string
}

interface CreatedRepRow {
  id: string
  auth_user_id: string
  email: string
  display_name: string
  business_name: string
}

export interface PrelaunchClientAccountResult {
  repId: string
  email: string
  createdAuthUser: boolean
  sentInvite: false
  workspaceAccess: 'checkout_required'
  build: PrelaunchLaunchBuild
}

function cleanRequiredString(value: string, label: string) {
  const cleaned = value.trim()

  if (!cleaned) {
    throw new Error(`${label} is required.`)
  }

  return cleaned
}

function cleanEmail(value: string) {
  return cleanRequiredString(value, 'leadEmail').toLowerCase()
}

function cleanNullable(value: string | null | undefined) {
  const cleaned = value?.trim() ?? ''
  return cleaned.length > 0 ? cleaned : null
}

function cleanDomain(value: string | null | undefined) {
  return cleanNullable(value)?.toLowerCase() ?? null
}

function cleanText(value: string | null | undefined) {
  return value?.trim() ?? ''
}

function assertClientAccountAllowed(build: LaunchBuildClientAccountRow) {
  if (build.rep_id) {
    throw new Error('This launch build already has a client account connected.')
  }

  if (build.setup_profile_status !== 'ready') {
    throw new Error(
      'Client account creation requires the setup profile to be ready.',
    )
  }
}

async function loadLaunchBuildClientAccountRow(
  launchBuildId: string,
  admin: AdminClient,
) {
  const { data, error } = await admin
    .from('sparkle_suite_launch_builds')
    .select(
      [
        'id',
        'rep_id',
        'stage',
        'status',
        'lead_name',
        'lead_email',
        'setup_profile_status',
        'payment_gate_status',
        'agreement_gate_status',
        'build_check_status',
        'production_roster_status',
        'blockers',
      ].join(', '),
    )
    .eq('id', launchBuildId)
    .single()

  if (error) throw error
  return data as unknown as LaunchBuildClientAccountRow
}

async function loadLaunchSetupProfileClientAccountRow(
  launchBuildId: string,
  admin: AdminClient,
) {
  const { data, error } = await admin
    .from('sparkle_suite_launch_setup_profiles')
    .select(
      'business_name, public_site_goal, custom_domain, primary_social_url, secondary_social_url, shop_url, brand_notes',
    )
    .eq('launch_build_id', launchBuildId)
    .maybeSingle()

  if (error) throw error
  return data as unknown as LaunchSetupProfileClientAccountRow | null
}

async function loadExistingRepByEmail(email: string, admin: AdminClient) {
  const { data, error } = await admin
    .from('reps')
    .select('id, email')
    .eq('email', email)
    .maybeSingle()

  if (error) throw error
  return data as ExistingRepRow | null
}

async function assertNoExistingAuthUserByEmail(
  email: string,
  admin: AdminClient,
) {
  const perPage = 200

  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage,
    })

    if (error) throw error

    const existing = data.users.find(
      (user) => user.email?.trim().toLowerCase() === email,
    )

    if (existing) {
      throw new Error(
        'An auth user already exists for this email. Use the existing rep account path.',
      )
    }

    if (data.users.length < perPage) return
  }
}

async function linkLaunchBuildToCreatedRep(
  build: LaunchBuildClientAccountRow,
  repId: string,
  notes: string,
  admin: AdminClient,
) {
  const readiness = buildPrelaunchLaunchBuildReadiness({
    setupProfileStatus: build.setup_profile_status,
    paymentGateStatus: build.payment_gate_status,
    agreementGateStatus: build.agreement_gate_status,
    buildCheckStatus: build.build_check_status,
    productionRosterStatus: 'connected',
  })

  const { data, error } = await admin
    .from('sparkle_suite_launch_builds')
    .update({
      rep_id: repId,
      production_roster_status: 'connected',
      stage: readiness.status === 'ready' ? 'ready_for_launch' : 'checks',
      status: readiness.status,
      blockers: readiness.blockers,
      notes,
    })
    .eq('id', build.id)
    .is('rep_id', null)
    .select(PRELAUNCH_LAUNCH_BUILD_SELECT)
    .single()

  if (error) throw error
  if (!data) {
    throw new Error('The launch build could not be linked to the new account.')
  }

  return normalizePrelaunchLaunchBuildRows([
    data as unknown as PrelaunchLaunchBuildRow,
  ])[0]
}

interface CleanupProvisionedClientAccountInput {
  authUserId: string
  repId: string | null
  build: LaunchBuildClientAccountRow
}

async function cleanupProvisionedClientAccount(
  input: CleanupProvisionedClientAccountInput,
  admin: AdminClient,
) {
  const cleanupErrors: unknown[] = []

  if (input.repId) {
    try {
      const { error } = await admin
        .from('sparkle_suite_launch_builds')
        .update({
          rep_id: null,
          production_roster_status: input.build.production_roster_status,
          stage: input.build.stage,
          status: input.build.status,
          blockers: input.build.blockers,
        })
        .eq('id', input.build.id)
        .eq('rep_id', input.repId)

      if (error) cleanupErrors.push(error)
    } catch (error) {
      cleanupErrors.push(error)
    }

    for (const table of [
      'workspace_trials',
      'self_serve_setup_sessions',
      'onboarding_status',
      'site_settings',
    ]) {
      try {
        const { error } = await admin
          .from(table)
          .delete()
          .eq('rep_id', input.repId)

        if (error) cleanupErrors.push(error)
      } catch (error) {
        cleanupErrors.push(error)
      }
    }

    try {
      const { error } = await admin.from('reps').delete().eq('id', input.repId)
      if (error) cleanupErrors.push(error)
    } catch (error) {
      cleanupErrors.push(error)
    }
  }

  try {
    const { error } = await admin.auth.admin.deleteUser(input.authUserId)
    if (error) cleanupErrors.push(error)
  } catch (error) {
    cleanupErrors.push(error)
  }

  if (cleanupErrors.length > 0) {
    console.error(
      '[prelaunch/client-account] Provisioning cleanup encountered errors:',
      cleanupErrors,
    )
  }
}

export async function preparePrelaunchClientAccountForLaunchBuild(
  input: PreparePrelaunchClientAccountInput,
  admin: AdminClient = createAdminClient(),
): Promise<PrelaunchClientAccountResult> {
  const launchBuildId = cleanRequiredString(
    input.launchBuildId,
    'launchBuildId',
  )
  const temporaryPassword = cleanRequiredString(
    input.temporaryPassword,
    'temporaryPassword',
  )
  const temporaryPasswordConfirm = cleanRequiredString(
    input.temporaryPasswordConfirm,
    'temporaryPasswordConfirm',
  )
  const passwordError = getNewPasswordValidationError(
    temporaryPassword,
    temporaryPasswordConfirm,
  )
  if (passwordError) throw new Error(passwordError)

  const build = await loadLaunchBuildClientAccountRow(launchBuildId, admin)
  assertClientAccountAllowed(build)

  const email = cleanEmail(build.lead_email)
  const profile = await loadLaunchSetupProfileClientAccountRow(
    launchBuildId,
    admin,
  )
  const businessName =
    cleanNullable(profile?.business_name) ??
    cleanRequiredString(build.lead_name, 'leadName')
  const existingRep = await loadExistingRepByEmail(email, admin)
  if (existingRep) {
    throw new Error(
      'A rep account already exists for this email. Use the existing rep account path.',
    )
  }

  await assertNoExistingAuthUserByEmail(email, admin)
  const { data: authData, error: authError } =
    await admin.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
    })

  if (authError) throw authError

  const authUserId = authData.user?.id
  if (!authUserId) {
    throw new Error('Supabase did not return an auth user id.')
  }

  let createdRepId: string | null = null

  try {
    const { data: repData, error: repError } = await admin
      .from('reps')
      .insert({
        auth_user_id: authUserId,
        account_classification: 'customer',
        email,
        display_name: cleanRequiredString(build.lead_name, 'leadName'),
        business_name: businessName,
        custom_domain: cleanDomain(profile?.custom_domain),
        phone: null,
        shop_link: cleanNullable(profile?.shop_url),
        streaming_links: {
          primary: cleanNullable(profile?.primary_social_url),
          secondary: cleanNullable(profile?.secondary_social_url),
        },
        social_handles: {},
        template_id: 'default',
        status: 'active',
        finder_directory_visible: true,
      })
      .select('id, auth_user_id, email, display_name, business_name')
      .single()

    if (repError) throw repError

    const rep = repData as unknown as CreatedRepRow
    createdRepId = rep.id
    const provisionedAt = new Date().toISOString()

    const { error: siteSettingsError } = await admin
      .from('site_settings')
      .upsert(
        {
          rep_id: rep.id,
          tagline: profile?.public_site_goal ?? '',
          banner_text: `Welcome to ${businessName}`,
          banner_visible: true,
          ticker_text: null,
          ticker_visible: false,
          team_name: businessName,
          show_join_page: true,
          hero_animation_type: 'sparkle_rise',
        },
        { onConflict: 'rep_id' },
      )

    if (siteSettingsError) throw siteSettingsError

    const { error: onboardingError } = await admin
      .from('onboarding_status')
      .upsert(
        {
          rep_id: rep.id,
          current_stage: 'intake_completed',
          completed_steps: [
            'waitlist',
            'conversation',
            'setup_profile',
            'account_provisioned',
          ],
        },
        { onConflict: 'rep_id' },
      )

    if (onboardingError) throw onboardingError

    const { error: setupSessionError } = await admin
      .from('self_serve_setup_sessions')
      .upsert(
        {
          rep_id: rep.id,
          status: 'checkout_required',
          current_step: 'account_basics',
          completed_steps: ['operator_account_provisioned'],
          answers: {
            displayName: rep.display_name,
            businessName: rep.business_name,
            email: rep.email,
          },
          dashboard_unlocked_at: null,
          updated_at: provisionedAt,
        },
        { onConflict: 'rep_id' },
      )

    if (setupSessionError) throw setupSessionError

    const linkedBuild = await linkLaunchBuildToCreatedRep(
      build,
      rep.id,
      cleanText(input.notes),
      admin,
    )

    return {
      repId: rep.id,
      email: rep.email,
      createdAuthUser: true,
      sentInvite: false,
      workspaceAccess: 'checkout_required',
      build: linkedBuild,
    }
  } catch (error) {
    await cleanupProvisionedClientAccount(
      {
        authUserId,
        repId: createdRepId,
        build,
      },
      admin,
    )
    throw error
  }
}
