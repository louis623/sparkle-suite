// Enforcer audit — hash helper + trade_action_audit writer.
// Hash convention: SHA-256 of JSON.stringify(obj) with keys sorted
// alphabetically; null/undefined values serialize as "" so a missing
// vs explicit-null field is indistinguishable in the hash.

import { createHash } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'

export function hashState(obj: Record<string, unknown>): string {
  const keys = Object.keys(obj).sort()
  const normalized: Record<string, unknown> = {}
  for (const k of keys) {
    const v = obj[k]
    normalized[k] = v === null || v === undefined ? '' : v
  }
  return createHash('sha256').update(JSON.stringify(normalized)).digest('hex')
}

export async function writeTradeActionAudit(args: {
  actionType: string
  repId: string
  targetListingId?: string | null
  beforeState: Record<string, unknown>
  afterState: Record<string, unknown>
  details?: Record<string, unknown>
}): Promise<void> {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase.from('trade_action_audit').insert({
      action_type: args.actionType,
      rep_id: args.repId,
      target_listing_id: args.targetListingId ?? null,
      before_state_hash: hashState(args.beforeState),
      after_state_hash: hashState(args.afterState),
      details: args.details ?? null,
    })
    if (error) {
      console.error('[enforcer] writeTradeActionAudit insert failed:', error)
    }
  } catch (err) {
    console.error('[enforcer] writeTradeActionAudit exception:', err)
  }
}
