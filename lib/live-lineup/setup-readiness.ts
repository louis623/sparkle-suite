import 'server-only'
import { isDeepStrictEqual } from 'node:util'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isLineupState, LINEUP_FRESH_MS } from './model'
import type { LineupState } from './types'

export type LineupSetupReadinessReason = 'ready' | 'invalid_tenant' | 'clock_invalid' | 'schema_unavailable'
  | 'unavailable' | 'not_initialized' | 'invalid_state' | 'tenant_mismatch' | 'awaiting_ready'
  | 'source_not_ready' | 'stale' | 'lease_expired' | 'publisher_unavailable' | 'publisher_revoked'
  | 'publisher_expired' | 'state_changed'

/** Safe setup/status projection. No names, order IDs, source labels, arbitrary version strings or credentials. */
export interface LineupSetupReadiness {
  protocol: 2
  ready: boolean
  reason: LineupSetupReadinessReason
  checkedAt: string | null
  lastReadyAt: string | null
  generation: number | null
  revision: number | null
}

const validNow = (now: number) => Number.isSafeInteger(now) && now >= 0 && now <= 8_640_000_000_000_000
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const missingSchema = (code: unknown) => code === '42P01' || code === 'PGRST205'

/**
 * Read-only, point-in-time evidence, NOT an unlock or reusable authorization receipt.
 * The caller must authenticate and resolve repId; never accept a request-body tenant.
 * Does not provision legacy codes, issue keys, initialize shows, or complete setup.
 * A future completion integration must verify readiness at its own mutation boundary.
 */
export async function readLineupSetupReadiness(db: SupabaseClient, repId: string, testNow?: number): Promise<LineupSetupReadiness> {
  // An explicit numeric clock is only for deterministic callers/tests. Production
  // callers omit it, so database latency cannot freeze the verification clock.
  const clock = () => testNow === undefined ? Date.now() : testNow
  const now = clock()
  let checkedAt = validNow(now) ? new Date(now).toISOString() : null
  const result = (reason: LineupSetupReadinessReason, state?: LineupState): LineupSetupReadiness => ({
    protocol: 2, ready: reason === 'ready', reason, checkedAt,
    lastReadyAt: state?.lastReadyAt ?? null, generation: state ? state.show?.generation ?? 0 : null,
    revision: state?.revision ?? null,
  })
  if (!checkedAt) return result('clock_invalid')
  if (typeof repId !== 'string' || !uuid.test(repId)) return result('invalid_tenant')
  const tenant = repId.toLowerCase()
  try {
    const readState = async () => db.from('live_lineup_states').select('rep_id,revision,state').eq('rep_id', tenant).maybeSingle()
    const first = await readState()
    if (first.error) return result(missingSchema(first.error.code) ? 'schema_unavailable' : 'unavailable')
    if (!first.data) return result('not_initialized')
    if (first.data.rep_id !== tenant) return result('tenant_mismatch')
    if (!isLineupState(first.data.state) || Number(first.data.revision) !== first.data.state.revision) return result('invalid_state')
    const state = first.data.state
    const publisher = state.publisher
    if (!publisher) return result('awaiting_ready', state)
    if ([state.lastReceivedAt, state.lastReadyAt, state.lastChangedAt].some(value => value !== null && Date.parse(value) > now)) return result('clock_invalid', state)
    if (Date.parse(publisher.leaseExpiresAt) <= now) return result('lease_expired', state)
    if (!state.lastReceivedAt || !state.lastReadyAt) return result('awaiting_ready', state)
    if (state.parserState !== 'ready') return result('source_not_ready', state)
    if (now - Date.parse(state.lastReadyAt) > LINEUP_FRESH_MS) return result('stale', state)

    // Select neither token_hash nor labels; database filters AND returned identity must agree.
    const credential = await db.from('live_lineup_publisher_tokens').select('id,rep_id,expires_at,revoked_at')
      .eq('rep_id', tenant).eq('id', publisher.id).maybeSingle()
    if (credential.error) return result(missingSchema(credential.error.code) ? 'schema_unavailable' : 'unavailable', state)
    if (!credential.data) return result('publisher_unavailable', state)
    if (credential.data.rep_id !== tenant || credential.data.id !== publisher.id) return result('tenant_mismatch')
    if (credential.data.revoked_at !== null) return result('publisher_revoked', state)
    if (typeof credential.data.expires_at !== 'string' || !Number.isFinite(Date.parse(credential.data.expires_at))
      || Date.parse(credential.data.expires_at) <= now) return result('publisher_expired', state)

    // Revoke/show/source changes atomically advance state; do not confirm the older read.
    // Pure heartbeat races are conservatively retried by the caller on a subsequent read.
    const final = await readState()
    if (final.error) return result(missingSchema(final.error.code) ? 'schema_unavailable' : 'unavailable', state)
    if (!final.data || final.data.rep_id !== tenant) return result(final.data ? 'tenant_mismatch' : 'state_changed')
    if (!isLineupState(final.data.state) || Number(final.data.revision) !== final.data.state.revision) return result('invalid_state')
    if (!isDeepStrictEqual(final.data.state, state)) return result('state_changed', state)
    // Central setup completion invokes this reader immediately before its guarded
    // UPDATE. Re-evaluate every deadline after the final awaited database read.
    const finalNow = clock()
    checkedAt = validNow(finalNow) ? new Date(finalNow).toISOString() : null
    if (!checkedAt || finalNow < now) return result('clock_invalid', state)
    if (Date.parse(publisher.leaseExpiresAt) <= finalNow) return result('lease_expired', state)
    if (Date.parse(credential.data.expires_at) <= finalNow) return result('publisher_expired', state)
    if (finalNow - Date.parse(state.lastReadyAt) > LINEUP_FRESH_MS) return result('stale', state)
    return result('ready', state)
  } catch {
    // Do not expose database errors, request contents, or credentials in ordinary setup output.
    return result('unavailable')
  }
}
