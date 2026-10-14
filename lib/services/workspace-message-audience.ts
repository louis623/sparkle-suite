import type { SupabaseClient } from '@supabase/supabase-js'
import { ServiceError } from '@/lib/services/errors'

export type WorkspaceMessageAudience =
  | { kind: 'all_active' }
  | { kind: 'selected'; repIds: string[] }

export interface WorkspaceMessageAudienceMember {
  repId: string
  displayName: string
  businessName: string
}

export interface WorkspaceMessageAudiencePreview {
  rule: WorkspaceMessageAudience
  members: WorkspaceMessageAudienceMember[]
  count: number
}

type RepRow = {
  id: string
  display_name: string
  business_name: string
  email?: string | null
  account_classification?: string | null
  public_site_slug?: string | null
  status?: string | null
}

/**
 * Broadcast fan-out (all_active, monthly reports, weekly birthday reports)
 * includes active customer reps, plus this explicit exception.
 * Louis's real workspace is classified demo, so classification alone would drop it.
 * Match email and slug together so a second louis@neonrabbit.net row stays out.
 */
export const BROADCAST_AUDIENCE_ALLOWLIST = [
  {
    email: 'louis@neonrabbit.net',
    publicSiteSlug: 'dudesfizzfest',
    label: 'The Dudes Fizzfest',
  },
] as const

function normalizedIdentity(value: string | null | undefined) {
  return (value ?? '').trim().toLowerCase()
}

export function isAllowlistedBroadcastRecipient(row: {
  email?: string | null
  public_site_slug?: string | null
}) {
  const email = normalizedIdentity(row.email)
  const slug = normalizedIdentity(row.public_site_slug)
  return BROADCAST_AUDIENCE_ALLOWLIST.some(
    (entry) => entry.email === email && entry.publicSiteSlug === slug,
  )
}

export function isBroadcastAudienceRecipient(row: {
  status?: string | null
  account_classification?: string | null
  email?: string | null
  public_site_slug?: string | null
}) {
  if (normalizedIdentity(row.status) !== 'active') return false
  if (normalizedIdentity(row.account_classification) === 'customer') return true
  return isAllowlistedBroadcastRecipient(row)
}

function quotedFilterValue(value: string) {
  return `"${value.replaceAll('"', '""')}"`
}

/** PostgREST or() filter. Kept in sync with isBroadcastAudienceRecipient. */
export function broadcastAudienceOrFilter() {
  const exceptions = BROADCAST_AUDIENCE_ALLOWLIST.map(
    (entry) =>
      `and(email.ilike.${quotedFilterValue(entry.email)},public_site_slug.ilike.${quotedFilterValue(entry.publicSiteSlug)})`,
  )
  return ['account_classification.eq.customer', ...exceptions].join(',')
}

function audienceError(
  code: string,
  message: string,
  statusCode = 400,
) {
  return new ServiceError({ code, message, userMessage: message, statusCode })
}

function normalizeAudience(
  audience: WorkspaceMessageAudience,
): WorkspaceMessageAudience {
  if (audience.kind === 'all_active') return { kind: 'all_active' }
  if (audience.kind !== 'selected' || !Array.isArray(audience.repIds)) {
    throw audienceError(
      'WORKSPACE_MESSAGE_INVALID_AUDIENCE',
      'Choose all active reps or a selected rep audience.',
    )
  }
  const repIds = [...new Set(audience.repIds.map((id) => id.trim()).filter(Boolean))]
  if (repIds.length === 0) {
    throw audienceError(
      'WORKSPACE_MESSAGE_EMPTY_AUDIENCE',
      'Select at least one recipient.',
    )
  }
  if (repIds.length > 10_000) {
    throw audienceError(
      'WORKSPACE_MESSAGE_AUDIENCE_TOO_LARGE',
      'The selected recipient list is too large.',
    )
  }
  return { kind: 'selected', repIds }
}

export async function resolveWorkspaceMessageAudience(
  supabase: SupabaseClient,
  audience: WorkspaceMessageAudience,
): Promise<WorkspaceMessageAudiencePreview> {
  const normalized = normalizeAudience(audience)
  let query = supabase
    .from('reps')
    .select(
      'id, display_name, business_name, email, account_classification, public_site_slug, status',
    )
    .eq('status', 'active')

  if (normalized.kind === 'all_active') {
    query = query.or(broadcastAudienceOrFilter())
  }

  if (normalized.kind === 'selected') {
    query = query.in('id', normalized.repIds)
  }

  const { data, error } = await query.order('display_name', { ascending: true })
  if (error) throw error

  const rows = ((data ?? []) as RepRow[]).filter((row) =>
    normalized.kind === 'all_active' ? isBroadcastAudienceRecipient(row) : true,
  )
  if (normalized.kind === 'selected' && rows.length !== normalized.repIds.length) {
    const found = new Set(rows.map((row) => row.id))
    const missing = normalized.repIds.filter((id) => !found.has(id))
    throw audienceError(
      'WORKSPACE_MESSAGE_RECIPIENT_UNAVAILABLE',
      `Some selected recipients are not active or do not exist: ${missing.join(', ')}`,
      409,
    )
  }
  if (rows.length === 0) {
    throw audienceError(
      'WORKSPACE_MESSAGE_EMPTY_AUDIENCE',
      'No active recipients matched this audience.',
      409,
    )
  }

  const members = rows
    .map((row) => ({
      repId: row.id,
      displayName: row.display_name,
      businessName: row.business_name,
    }))
    .sort(
      (left, right) =>
        left.displayName.localeCompare(right.displayName) ||
        left.repId.localeCompare(right.repId),
    )

  return { rule: normalized, members, count: members.length }
}

export const previewWorkspaceMessageAudience = resolveWorkspaceMessageAudience

export function serializeWorkspaceMessageAudienceSnapshot(
  preview: WorkspaceMessageAudiencePreview,
) {
  return preview.members.map((member) => ({
    repId: member.repId,
    displayName: member.displayName,
    businessName: member.businessName,
  }))
}
