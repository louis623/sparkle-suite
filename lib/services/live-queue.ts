import { randomInt } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { LiveQueueSnapshot } from '@/lib/services/types'

const AUTO_ANCHOR_PREFIX = 'NIC-NAC-AUTO-'
const DEFAULT_STALE_AFTER_SECONDS = 180
const MAX_QUEUE_NAMES = 200
const DEFAULT_SYNC_CODE_ATTEMPTS = 8

/** Per-rep extension / Secret Rep ID home. live_queue.sync_code is retired. */
export const LIVE_LINEUP_CONNECTION_CODE_TABLE = 'live_lineup_connection_codes'

type LiveQueueRepProfile = {
  businessName?: string | null
  displayName?: string | null
  email?: string | null
}

type EnsureLiveQueueSyncCodeInput = {
  repId: string
  randomDigits?: () => number
  maxAttempts?: number
}

type LiveQueueRow = {
  sync_code: string
  queue: unknown
  last_updated: string | null
}

export interface GetLiveQueueSnapshotInput {
  repId: string
  syncCode: string | null | undefined
  now?: Date
  staleAfterSeconds?: number
}

export function normalizeLiveQueue(value: unknown): string[] {
  if (!Array.isArray(value)) return []

  return value
    .map((item) => {
      if (typeof item === 'string' || typeof item === 'number') {
        return String(item).trim()
      }
      return ''
    })
    .filter(Boolean)
    .slice(0, MAX_QUEUE_NAMES)
}

export function buildLiveQueueSnapshot(
  row: LiveQueueRow,
  options: { now?: Date; staleAfterSeconds?: number } = {},
): LiveQueueSnapshot {
  const now = options.now ?? new Date()
  const staleAfterSeconds =
    options.staleAfterSeconds ?? DEFAULT_STALE_AFTER_SECONDS
  const queue = normalizeLiveQueue(row.queue)
  const updatedAt = row.last_updated ? new Date(row.last_updated) : null
  const ageSeconds =
    updatedAt && Number.isFinite(updatedAt.getTime())
      ? Math.max(0, Math.floor((now.getTime() - updatedAt.getTime()) / 1000))
      : null

  return {
    syncCode: row.sync_code,
    queue,
    queueLength: queue.length,
    currentCustomer: queue[0] ?? null,
    onDeckCustomer: queue[1] ?? null,
    lastUpdated: row.last_updated,
    ageSeconds,
    staleAfterSeconds,
    isFresh: ageSeconds !== null && ageSeconds <= staleAfterSeconds,
  }
}

export async function getLiveQueueSnapshot(
  supabase: SupabaseClient,
  input: GetLiveQueueSnapshotInput,
): Promise<LiveQueueSnapshot | null> {
  const syncCode = String(input.syncCode ?? '').trim()
  if (!syncCode || syncCode.startsWith(AUTO_ANCHOR_PREFIX)) return null

  const { data, error } = await supabase
    .from(LIVE_LINEUP_CONNECTION_CODE_TABLE)
    .select('sync_code')
    .eq('rep_id', input.repId)
    .eq('sync_code', syncCode)
    .maybeSingle()

  if (error) throw error
  const assigned = (data as { sync_code?: unknown } | null)?.sync_code
  if (typeof assigned !== 'string' || assigned !== syncCode) return null

  // A matching connection code is not a lineup. Never project retired live_queue.queue rows.
  return {
    ...buildLiveQueueSnapshot(
      { sync_code: assigned, queue: [], last_updated: null },
      { now: input.now, staleAfterSeconds: input.staleAfterSeconds },
    ),
    sourceReady: false,
  }
}

export async function getLiveQueueSyncCodeForRep(
  supabase: SupabaseClient,
  repId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from(LIVE_LINEUP_CONNECTION_CODE_TABLE)
    .select('sync_code')
    .eq('rep_id', repId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  const syncCode = (data as { sync_code?: unknown } | null)?.sync_code
  return typeof syncCode === 'string' && syncCode.trim()
    ? syncCode.trim()
    : null
}

export function generateLiveQueueSyncCode(
  profile: LiveQueueRepProfile,
  randomDigits: () => number = () => randomInt(0, 10000),
): string {
  const seed =
    profile.businessName?.trim() ||
    profile.displayName?.trim() ||
    profile.email?.split('@')[0]?.trim() ||
    'Sparkle Suite'
  const prefix = buildSyncCodePrefix(seed)
  const digits = String(Math.abs(Math.trunc(randomDigits())) % 10000).padStart(4, '0')

  return `${prefix}-${digits}`
}

export async function ensureLiveQueueSyncCodeForRep(
  supabase: SupabaseClient,
  input: EnsureLiveQueueSyncCodeInput,
): Promise<{ syncCode: string; created: boolean }> {
  const existing = await getLiveQueueSyncCodeForRep(supabase, input.repId)
  if (existing) return { syncCode: existing, created: false }

  const profile = await getRepProfileForLiveQueueSyncCode(supabase, input.repId)
  const attempts = input.maxAttempts ?? DEFAULT_SYNC_CODE_ATTEMPTS

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const syncCode = generateLiveQueueSyncCode(profile, input.randomDigits)
    const { data, error } = await supabase
      .from(LIVE_LINEUP_CONNECTION_CODE_TABLE)
      .insert({
        rep_id: input.repId,
        sync_code: syncCode,
      })
      .select('sync_code')
      .single()

    if (!error) {
      const inserted = (data as { sync_code?: unknown } | null)?.sync_code
      if (typeof inserted === 'string' && inserted.trim()) {
        return { syncCode: inserted.trim(), created: true }
      }
      return { syncCode, created: true }
    }

    if (!isUniqueViolation(error)) throw error
  }

  throw new Error('Could not create a unique Live Lineup sync code.')
}

async function getRepProfileForLiveQueueSyncCode(
  supabase: SupabaseClient,
  repId: string,
): Promise<LiveQueueRepProfile> {
  const { data, error } = await supabase
    .from('reps')
    .select('business_name, display_name, email')
    .eq('id', repId)
    .single()

  if (error) throw error
  const row = data as {
    business_name?: unknown
    display_name?: unknown
    email?: unknown
  } | null

  return {
    businessName:
      typeof row?.business_name === 'string' ? row.business_name : null,
    displayName: typeof row?.display_name === 'string' ? row.display_name : null,
    email: typeof row?.email === 'string' ? row.email : null,
  }
}

function buildSyncCodePrefix(seed: string): string {
  const words = seed
    .replace(/['’]s\b/gi, '')
    .replace(/[^a-z0-9]+/gi, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (words.length >= 3) {
    return words
      .slice(0, 3)
      .map((word) => word[0])
      .join('')
      .toUpperCase()
  }

  if (words.length === 2) {
    return `${words[0][0]}${words[1].slice(0, 2)}`.toUpperCase().padEnd(3, 'X')
  }

  return (words[0] ?? 'SSW').slice(0, 3).toUpperCase().padEnd(3, 'X')
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === '23505'
  )
}
