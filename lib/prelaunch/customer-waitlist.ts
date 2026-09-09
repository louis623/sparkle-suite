import { createAdminClient } from '@/lib/supabase/admin'

type AdminClient = ReturnType<typeof createAdminClient>

export interface CustomerWaitlistRow {
  id: string
  name: string
  email: string
  phone: string | null
  source: string
  lead_status: string
  operator_notes: string | null
  account_activated_at: string | null
  created_at: string
  updated_at?: string
}

export interface CustomerWaitlistLead {
  id: string
  name: string
  email: string
  phone: string | null
  source: 'landing_page' | 'manual' | 'public_nic_nac'
  leadStatus: string
  notes: string
  accountActivatedAt: string | null
  createdAt: string
  updatedAt?: string
}

export const CUSTOMER_WAITLIST_SELECT = [
  'id',
  'name',
  'email',
  'phone',
  'source',
  'lead_status',
  'operator_notes',
  'account_activated_at',
  'created_at',
  'updated_at',
].join(', ')

export function normalizeCustomerWaitlistRow(
  row: CustomerWaitlistRow,
): CustomerWaitlistLead {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    source: row.source === 'public_nic_nac'
      ? 'public_nic_nac'
      : row.source === 'operator_manual' ? 'manual' : 'landing_page',
    leadStatus: row.lead_status,
    notes: row.operator_notes?.trim() ?? '',
    accountActivatedAt: row.account_activated_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function loadCustomerWaitlist(
  admin: AdminClient = createAdminClient(),
  limit = 250,
): Promise<CustomerWaitlistLead[]> {
  const { data, error } = await admin
    .from('sparkle_suite_waitlist')
    .select(CUSTOMER_WAITLIST_SELECT)
    .order('account_activated_at', { ascending: true, nullsFirst: true })
    .order('created_at', { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 500))

  if (error) throw error

  return (data ?? []).map((row) =>
    normalizeCustomerWaitlistRow(row as unknown as CustomerWaitlistRow),
  )
}
