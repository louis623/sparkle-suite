import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'

type WaitlistRow = {
  id: string
  name: string
  email: string
  phone: string | null
  tiktok_handle: string | null
  source: string
  lead_status: string
  intake_submission_id: string | null
  created_at: string
}

type IntakeRow = {
  id: string
  business_name: string | null
}

export type ControlCenterWaitlistLead = ReturnType<typeof mapControlCenterWaitlistLead>

/** Same classic Control Center table the public build-queue form writes to. */
export const CONTROL_CENTER_WAITLIST_TABLE = 'sparkle_suite_waitlist'

const WAITLIST_SELECT = [
  'id',
  'name',
  'email',
  'phone',
  'tiktok_handle',
  'source',
  'lead_status',
  'intake_submission_id',
  'created_at',
].join(', ')

function cleanNullable(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

export function normalizeWaitlistStatusFilter(status: unknown) {
  return typeof status === 'string' && status.trim() ? status.trim() : undefined
}

export function mapControlCenterWaitlistLead(
  row: WaitlistRow,
  shopName: string | null,
) {
  return {
    leadId: row.id,
    name: row.name,
    shopName: cleanNullable(shopName),
    contact: {
      email: row.email,
      phone: cleanNullable(row.phone),
      tiktokHandle: cleanNullable(row.tiktok_handle),
    },
    signupSource: row.source,
    signupDate: row.created_at,
    status: row.lead_status,
  }
}

export function buildControlCenterWaitlistListResult(
  leads: ControlCenterWaitlistLead[],
  options: { status?: string } = {},
) {
  const statusFilter = normalizeWaitlistStatusFilter(options.status) ?? null
  return {
    leads,
    matchedCount: leads.length,
    statusFilter,
    sourceTable: CONTROL_CENTER_WAITLIST_TABLE,
    notice:
      leads.length === 0
        ? statusFilter
          ? `No classic Control Center waitlist/build-list leads matched status "${statusFilter}". Omit status to list every current lead.`
          : 'No classic Control Center waitlist/build-list leads are currently stored. An empty list means the table is empty, not that reads failed.'
        : 'Read-only lead source of truth from classic Control Center. Shop name is null when no linked intake supplied one. Use a human operator for outreach or any status change.',
  }
}

export function buildControlCenterWaitlistGetResult(
  lead: ControlCenterWaitlistLead | null,
  leadId: string,
) {
  if (!lead) {
    return {
      found: false,
      lead: null,
      leadId,
      sourceTable: CONTROL_CENTER_WAITLIST_TABLE,
      notice:
        'No waitlist/build-list lead exists for that ID in classic Control Center. The lead may have been removed. This is not an outage.',
    }
  }

  return {
    found: true,
    lead,
    leadId: lead.leadId,
    sourceTable: CONTROL_CENTER_WAITLIST_TABLE,
    notice: 'Read-only. No email was sent and no lead state was changed.',
  }
}

async function loadShopNames(
  supabase: SupabaseClient,
  rows: WaitlistRow[],
) {
  const intakeIds = Array.from(
    new Set(
      rows.flatMap((row) =>
        typeof row.intake_submission_id === 'string'
          ? [row.intake_submission_id]
          : [],
      ),
    ),
  )
  if (intakeIds.length === 0) return new Map<string, string | null>()

  try {
    const { data, error } = await supabase
      .from('sparkle_suite_intake_submissions')
      .select('id, business_name')
      .in('id', intakeIds)
    if (error) return new Map<string, string | null>()

    return new Map(
      ((data ?? []) as IntakeRow[]).map((row) => [
        row.id,
        cleanNullable(row.business_name),
      ]),
    )
  } catch {
    // Shop name is enrichment only. Never fail a classic waitlist read because intake lookup failed.
    return new Map<string, string | null>()
  }
}

function shopNameFor(row: WaitlistRow, shopNames: Map<string, string | null>) {
  return row.intake_submission_id
    ? (shopNames.get(row.intake_submission_id) ?? null)
    : null
}

export async function listControlCenterWaitlistLeads(
  supabase: SupabaseClient,
  options: { status?: string; limit?: number } = {},
) {
  const limit = Math.min(Math.max(options.limit ?? 25, 1), 100)
  const status = normalizeWaitlistStatusFilter(options.status)
  let query = supabase
    .from(CONTROL_CENTER_WAITLIST_TABLE)
    .select(WAITLIST_SELECT)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (status) query = query.eq('lead_status', status)

  const { data, error } = await query
  if (error) throw error
  const rows = (data ?? []) as unknown as WaitlistRow[]
  const shopNames = await loadShopNames(supabase, rows)

  return rows.map((row) =>
    mapControlCenterWaitlistLead(row, shopNameFor(row, shopNames)),
  )
}

export async function getControlCenterWaitlistLead(
  supabase: SupabaseClient,
  leadId: string,
) {
  const { data, error } = await supabase
    .from(CONTROL_CENTER_WAITLIST_TABLE)
    .select(WAITLIST_SELECT)
    .eq('id', leadId)
    .maybeSingle()
  if (error) throw error
  if (!data) return null

  const row = data as unknown as WaitlistRow
  const shopNames = await loadShopNames(supabase, [row])
  return mapControlCenterWaitlistLead(row, shopNameFor(row, shopNames))
}
