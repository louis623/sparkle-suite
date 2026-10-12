import type { SupabaseClient } from '@supabase/supabase-js'

export type NoticeLedgerStatus = 'pending' | 'sent' | 'failed'

export type NoticeLedgerRow = {
  idempotency_key: string
  status: NoticeLedgerStatus
  result: Record<string, unknown>
  error_message: string | null
  broadcast_id: string | null
  updated_at: string
}

export type NoticeClaim =
  | { action: 'send'; row: NoticeLedgerRow }
  | { action: 'replay'; row: NoticeLedgerRow }

const STALE_PENDING_MS = 120_000

export function decideNoticeClaim(
  existing: NoticeLedgerRow | null,
  nowMs: number,
): 'insert' | 'replay' | 'reclaim_failed' | 'reclaim_stale' | 'in_progress' {
  if (!existing) return 'insert'
  if (existing.status === 'sent') return 'replay'
  if (existing.status === 'failed') return 'reclaim_failed'
  const updated = Date.parse(existing.updated_at)
  if (Number.isFinite(updated) && nowMs - updated > STALE_PENDING_MS) return 'reclaim_stale'
  return 'in_progress'
}

type LedgerTable = 'suite_official_notice_sends' | 'fizz_issue_results'

function asRow(value: unknown): NoticeLedgerRow | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Record<string, unknown>
  const status = row.status
  if (status !== 'pending' && status !== 'sent' && status !== 'failed') return null
  return {
    idempotency_key: String(row.idempotency_key),
    status,
    result:
      row.result && typeof row.result === 'object' && !Array.isArray(row.result)
        ? (row.result as Record<string, unknown>)
        : {},
    error_message: typeof row.error_message === 'string' ? row.error_message : null,
    broadcast_id: typeof row.broadcast_id === 'string' ? row.broadcast_id : null,
    updated_at: typeof row.updated_at === 'string' ? row.updated_at : new Date(0).toISOString(),
  }
}

export function createSupabaseNoticeLedger(supabase: SupabaseClient, table: LedgerTable) {
  async function read(key: string) {
    const { data, error } = await supabase
      .from(table)
      .select('idempotency_key, status, result, error_message, broadcast_id, updated_at')
      .eq('idempotency_key', key)
      .maybeSingle()
    if (error) throw error
    return asRow(data)
  }

  return {
    async claim(key: string, seed: Record<string, unknown>): Promise<NoticeClaim> {
      const now = new Date()
      const nowIso = now.toISOString()
      const inserted = await supabase
        .from(table)
        .insert({
          ...seed,
          idempotency_key: key,
          status: 'pending',
          result: {},
          error_message: null,
          broadcast_id: null,
          updated_at: nowIso,
        })
        .select('idempotency_key, status, result, error_message, broadcast_id, updated_at')
        .maybeSingle()
      if (!inserted.error && inserted.data) {
        const row = asRow(inserted.data)
        if (!row) throw new Error('Notice ledger insert returned an unreadable row.')
        return { action: 'send', row }
      }
      if (inserted.error && inserted.error.code !== '23505') throw inserted.error

      const existing = await read(key)
      if (!existing) throw new Error('Notice ledger row disappeared after a conflict.')
      const decision = decideNoticeClaim(existing, now.getTime())
      if (decision === 'replay' || decision === 'in_progress') {
        return { action: 'replay', row: existing }
      }
      const reclaim = await supabase
        .from(table)
        .update({ status: 'pending', error_message: null, updated_at: nowIso })
        .eq('idempotency_key', key)
        .eq('status', decision === 'reclaim_failed' ? 'failed' : 'pending')
        .select('idempotency_key, status, result, error_message, broadcast_id, updated_at')
        .maybeSingle()
      if (reclaim.error) throw reclaim.error
      const reclaimed = asRow(reclaim.data)
      if (!reclaimed) {
        const current = await read(key)
        if (!current) throw new Error('Notice ledger row disappeared during reclaim.')
        return { action: 'replay', row: current }
      }
      return { action: 'send', row: reclaimed }
    },
    async saveBroadcastId(key: string, broadcastId: string) {
      const { error } = await supabase
        .from(table)
        .update({ broadcast_id: broadcastId, updated_at: new Date().toISOString() })
        .eq('idempotency_key', key)
        .eq('status', 'pending')
      if (error) throw error
    },
    async markSent(key: string, result: Record<string, unknown>) {
      const { error } = await supabase
        .from(table)
        .update({
          status: 'sent',
          result,
          error_message: null,
          updated_at: new Date().toISOString(),
        })
        .eq('idempotency_key', key)
      if (error) throw error
    },
    async markFailed(key: string, errorMessage: string, broadcastId?: string | null) {
      const patch: Record<string, unknown> = {
        status: 'failed',
        error_message: errorMessage.slice(0, 500),
        updated_at: new Date().toISOString(),
      }
      if (broadcastId) patch.broadcast_id = broadcastId
      const { error } = await supabase.from(table).update(patch).eq('idempotency_key', key)
      if (error) throw error
    },
  }
}

export type NoticeLedger = ReturnType<typeof createSupabaseNoticeLedger>

export function createMemoryNoticeLedger(): NoticeLedger {
  const rows = new Map<string, NoticeLedgerRow & Record<string, unknown>>()
  return {
    async claim(key, seed) {
      const now = new Date()
      const existing = rows.get(key) ?? null
      const decision = decideNoticeClaim(existing, now.getTime())
      if (decision === 'insert') {
        const row: NoticeLedgerRow & Record<string, unknown> = {
          idempotency_key: key,
          status: 'pending',
          result: {},
          error_message: null,
          broadcast_id: null,
          updated_at: now.toISOString(),
        }
        for (const [field, value] of Object.entries(seed)) {
          if (field !== 'status' && field !== 'idempotency_key') row[field] = value
        }
        rows.set(key, row)
        return { action: 'send', row }
      }
      if (!existing) throw new Error('Missing ledger row.')
      if (decision === 'replay' || decision === 'in_progress') return { action: 'replay', row: existing }
      existing.status = 'pending'
      existing.error_message = null
      existing.updated_at = now.toISOString()
      return { action: 'send', row: existing }
    },
    async saveBroadcastId(key, broadcastId) {
      const row = rows.get(key)
      if (row && row.status === 'pending') row.broadcast_id = broadcastId
    },
    async markSent(key, result) {
      const row = rows.get(key)
      if (!row) return
      row.status = 'sent'
      row.result = result
      row.error_message = null
      row.updated_at = new Date().toISOString()
    },
    async markFailed(key, errorMessage, broadcastId) {
      const row = rows.get(key)
      if (!row) return
      row.status = 'failed'
      row.error_message = errorMessage.slice(0, 500)
      if (broadcastId) row.broadcast_id = broadcastId
      row.updated_at = new Date().toISOString()
    },
  }
}
