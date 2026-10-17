import type { SupabaseClient } from '@supabase/supabase-js'
import { ServiceError } from '@/lib/services/errors'

export const WORKSPACE_TRIAL_DAYS = 5 as const
export const WORKSPACE_PAID_SUBSCRIPTION_STATUSES = [
  'active',
  'trialing',
] as const

export type WorkspaceTrialStatus = 'pending' | 'active' | 'revoked'
export type WorkspaceAccessSource = 'subscription' | 'trial' | 'none'
export type WorkspaceAccessReason =
  | 'subscription_active'
  | 'subscription_trialing'
  | 'subscription_past_due'
  | 'subscription_paused'
  | 'subscription_cancelled'
  | 'subscription_ineligible'
  | 'trial_active'
  | 'trial_pending'
  | 'trial_expired'
  | 'trial_revoked'
  | 'trial_invalid'
  | 'no_entitlement'

export interface WorkspaceTrial {
  id: string
  repId: string
  status: WorkspaceTrialStatus
  durationDays: typeof WORKSPACE_TRIAL_DAYS
  provisionedByRepId: string | null
  launchBuildId: string | null
  provisionedAt: string
  firstSignedInAt: string | null
  expiresAt: string | null
  revokedAt: string | null
}

export interface WorkspaceAccessSummary {
  hasFullAccess: boolean
  source: WorkspaceAccessSource
  status: WorkspaceAccessReason
  subscriptionStatus: string | null
  trialStartsAt: string | null
  trialEndsAt: string | null
  trial: WorkspaceTrial | null
}

interface WorkspaceTrialRow {
  id: string
  rep_id: string
  status: WorkspaceTrialStatus
  duration_days: number
  provisioned_by_rep_id: string | null
  launch_build_id: string | null
  provisioned_at: string
  first_signed_in_at: string | null
  expires_at: string | null
  revoked_at: string | null
}

interface SubscriptionRow {
  status: string
}

function workspaceAccessLookupError(
  source: 'subscription' | 'trial',
  cause: unknown,
) {
  return new ServiceError({
    code: 'WORKSPACE_ACCESS_LOOKUP_FAILED',
    message: `failed to resolve ${source} workspace access`,
    userMessage:
      "I couldn't verify workspace access right now. Please try again.",
    statusCode: 500,
    cause,
  })
}

function mapWorkspaceTrial(row: WorkspaceTrialRow): WorkspaceTrial {
  if (row.duration_days !== WORKSPACE_TRIAL_DAYS) {
    throw new ServiceError({
      code: 'WORKSPACE_TRIAL_INVALID',
      message: `workspace trial ${row.id} has an invalid duration`,
      userMessage:
        "I couldn't verify workspace access right now. Please contact support.",
      statusCode: 500,
    })
  }

  return {
    id: row.id,
    repId: row.rep_id,
    status: row.status,
    durationDays: WORKSPACE_TRIAL_DAYS,
    provisionedByRepId: row.provisioned_by_rep_id,
    launchBuildId: row.launch_build_id,
    provisionedAt: row.provisioned_at,
    firstSignedInAt: row.first_signed_in_at,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
  }
}

function normalizeRpcTrial(data: unknown): WorkspaceTrialRow | null {
  if (Array.isArray(data)) {
    return (data[0] as WorkspaceTrialRow | undefined) ?? null
  }
  return (data as WorkspaceTrialRow | null) ?? null
}

export async function activatePendingWorkspaceTrial({
  supabase,
  repId,
}: {
  supabase: SupabaseClient
  repId: string
}): Promise<WorkspaceTrial | null> {
  const { data, error } = await supabase.rpc('activate_workspace_trial', {
    p_rep_id: repId,
  })

  if (error) {
    throw new ServiceError({
      code: 'WORKSPACE_TRIAL_ACTIVATION_FAILED',
      message: 'failed to activate workspace trial after first sign-in',
      userMessage:
        "I couldn't open your workspace right now. Please try signing in again.",
      statusCode: 500,
      cause: error,
    })
  }

  const row = normalizeRpcTrial(data)
  return row ? mapWorkspaceTrial(row) : null
}

async function loadLatestSubscription(
  supabase: SupabaseClient,
  repId: string,
): Promise<SubscriptionRow | null> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('status')
    .eq('rep_id', repId)
    .maybeSingle()

  if (error) throw workspaceAccessLookupError('subscription', error)
  return (data as SubscriptionRow | null) ?? null
}

function denied(
  reason: WorkspaceAccessReason,
  subscriptionStatus: string | null,
  trial: WorkspaceTrial | null = null,
): WorkspaceAccessSummary {
  return {
    hasFullAccess: false,
    source: 'none',
    status: reason,
    subscriptionStatus,
    trialStartsAt: trial?.firstSignedInAt ?? null,
    trialEndsAt: trial?.expiresAt ?? null,
    trial,
  }
}

export async function resolveWorkspaceAccess({
  supabase,
  repId,
}: {
  supabase: SupabaseClient
  repId: string
  now?: Date
}): Promise<WorkspaceAccessSummary> {
  const subscription = await loadLatestSubscription(supabase, repId)
  const subscriptionStatus = subscription?.status ?? null

  if (subscriptionStatus === 'active' || subscriptionStatus === 'trialing') {
    return {
      hasFullAccess: true,
      source: 'subscription',
      status:
        subscriptionStatus === 'active'
          ? 'subscription_active'
          : 'subscription_trialing',
      subscriptionStatus,
      trialStartsAt: null,
      trialEndsAt: null,
      trial: null,
    }
  }

  if (subscriptionStatus === 'past_due') {
    return denied('subscription_past_due', subscriptionStatus)
  }
  if (subscriptionStatus === 'paused') {
    return denied('subscription_paused', subscriptionStatus)
  }
  if (subscriptionStatus === 'cancelled') {
    return denied('subscription_cancelled', subscriptionStatus)
  }
  if (subscriptionStatus) {
    return denied('subscription_ineligible', subscriptionStatus)
  }

  // Historical workspace_trials rows stay stored. They do not open the
  // workspace. Access stays on the subscription row: active and trialing
  // grant it, including manual internal and grandfathered subscriptions.
  return denied('no_entitlement', null)
}

/**
 * Public customer-site access (the rep's public site on a custom domain or
 * slug, plus its llms.txt and sitemap). This is deliberately more lenient than
 * workspace access: a past_due subscription keeps the public site up during
 * Stripe's dunning grace period, until Stripe cancels the subscription.
 * Workspace and dashboard access keep using resolveWorkspaceAccess.
 */
export const PUBLIC_SITE_GRACE_SUBSCRIPTION_STATUSES = ['past_due'] as const

export async function canServePublicCustomerSiteForRep({
  supabase,
  repId,
  now = new Date(),
}: {
  supabase: SupabaseClient
  repId: string
  now?: Date
}): Promise<boolean> {
  const access = await resolveWorkspaceAccess({ supabase, repId, now })
  if (access.hasFullAccess) return true
  return (PUBLIC_SITE_GRACE_SUBSCRIPTION_STATUSES as readonly string[]).includes(
    access.subscriptionStatus ?? '',
  )
}
