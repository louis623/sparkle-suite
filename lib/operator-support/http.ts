import 'server-only'

import { cookies } from 'next/headers'
import type { SupabaseClient } from '@supabase/supabase-js'

import { createAdminClient } from '@/lib/supabase/admin'
import { getControlCenterAccess } from '@/lib/supabase/operator-auth'
import { resolveWorkspaceAccess } from '@/lib/services/workspace-access'
import {
  OperatorSupportError,
  verifyOperatorSupportSessionAccess,
} from './session-service'
import type {
  OperatorSupportSession,
  SupportCapability,
} from './types'

export const OPERATOR_SUPPORT_CSRF_COOKIE_PREFIX = 'sparkle_support_csrf_'

export function operatorSupportWorkspaceUrl(sessionId: string) {
  return `/control-center/support/${encodeURIComponent(sessionId)}`
}

export function mapOperatorSupportSessionSummary(session: OperatorSupportSession) {
  return {
    id: session.id,
    targetRepId: session.targetRepId,
    operatorDisplayName: session.operatorDisplayNameSnapshot,
    targetRepDisplayName:
      session.targetNameSnapshot || session.targetBusinessSnapshot,
    reasonCode: session.reasonCode,
    reasonNote: session.reasonNote,
    supportReportId: session.supportReportId,
    status: session.status,
    startedAt: session.startedAt,
    expiresAt: session.expiresAt,
    endedAt: session.endedAt,
    createdAt: session.createdAt,
    completionSummary: session.completionSummary,
    workspaceUrl:
      session.status === 'active'
        ? operatorSupportWorkspaceUrl(session.id)
        : undefined,
  }
}

export async function loadVerifiedOperatorSupportContext(
  sessionId: string,
  input: {
    capability: SupportCapability
    mutation?: boolean
    requireEligibleTarget?: boolean
    request?: Request
    supabase?: SupabaseClient
  },
) {
  const access = await getControlCenterAccess({ allowSiteSupport: true })
  const admin = input.supabase ?? createAdminClient()
  const mutation = input.mutation === true
  const headerToken = input.request?.headers.get('x-sparkle-support-csrf') ?? null
  if (mutation && input.request) {
    const origin = input.request.headers.get('origin')
    if (!origin || origin !== new URL(input.request.url).origin) {
      throw new OperatorSupportError(
        'SUPPORT_CSRF_INVALID',
        'Support mutation origin verification failed.',
        403,
      )
    }
  }
  const token = mutation
    ? headerToken
    : headerToken ??
      (await cookies()).get(
        `${OPERATOR_SUPPORT_CSRF_COOKIE_PREFIX}${sessionId}`,
      )?.value ??
      null
  const verified = await verifyOperatorSupportSessionAccess(admin, {
    sessionId,
    operatorRepId: access.operator.repId,
    capability: input.capability,
    mutation,
    csrfToken: token,
  })
  if (verified.actor.mode !== 'operator_support') {
    throw new Error('Support actor verification failed.')
  }
  const { data: targetRep, error } = await admin
    .from('reps')
    .select(
      'id, auth_user_id, email, display_name, business_name, stripe_customer_id, public_site_slug, custom_domain, time_zone, status',
    )
    .eq('id', verified.session.targetRepId)
    .maybeSingle()
  if (error) throw error
  if (!targetRep) throw new Error('Support target account is no longer available.')
  if (input.requireEligibleTarget !== false) {
    const targetAccess = await resolveWorkspaceAccess({
      supabase: admin,
      repId: verified.session.targetRepId,
    })
    if (targetRep.status !== 'active' || !targetAccess.hasFullAccess) {
      throw new OperatorSupportError(
        'SUPPORT_TARGET_INELIGIBLE',
        'The target Workspace is no longer eligible for support access.',
        409,
      )
    }
  }
  return {
    actor: verified.actor,
    session: verified.session,
    supabase: admin,
    targetRep,
    csrfToken: token!,
  }
}
