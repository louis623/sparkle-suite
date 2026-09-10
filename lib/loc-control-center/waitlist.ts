import type { createAdminClient } from '@/lib/supabase/admin'
import { CUSTOMER_WAITLIST_SELECT, normalizeCustomerWaitlistRow, type CustomerWaitlistRow } from '@/lib/prelaunch/customer-waitlist'

/** Literal substring search over the same contact fields visible in LOC. */
export function waitlistSearch(value: unknown) {
  const term = typeof value === 'string' ? value.trim().slice(0, 240) : ''
  if (!term) return null
  const pattern = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const quoted = '"' + pattern.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"'
  return ['name', 'email', 'phone', 'operator_notes'].map(field => `${field}.imatch.${quoted}`).join(',')
}

export async function readLocWaitlist(
  admin: ReturnType<typeof createAdminClient>,
  input: Record<string, unknown>,
  { limit, offset }: { limit: number; offset: number },
) {
  let query = admin.from('sparkle_suite_waitlist').select(CUSTOMER_WAITLIST_SELECT)
  const search = waitlistSearch(input.query)
  if (search) query = query.or(search)
  const { data, error } = await query.order('created_at', { ascending: false }).order('id').range(offset, offset + limit)
  if (error) throw error
  return {
    items: ((data ?? []) as unknown as CustomerWaitlistRow[]).slice(0, limit).map(normalizeCustomerWaitlistRow),
    nextOffset: (data ?? []).length > limit ? offset + limit : null,
  }
}
