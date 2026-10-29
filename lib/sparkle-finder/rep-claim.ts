import type { SupabaseClient } from '@supabase/supabase-js'
import { LIVE_LINEUP_CONNECTION_CODE_TABLE } from '@/lib/services/live-queue'
import { loadFinderEntitledRepIds } from '@/lib/sparkle-finder/public-api'

export type SparkleFinderRepClaimPayload = {
  sourceProduct?: string
  finderUserId?: string
  secretRepIdNumber?: string
}

export type SparkleFinderRepClaimResult =
  | {
      ok: true
      status: 'claimed'
      suiteRepId: string
      displayName: string | null
      businessName: string | null
      publicSiteSlug: string | null
      finderEntitlement: {
        isRep: true
        silverRepIncluded: true
        badge: 'bp_rep'
      }
    }
  | {
      ok: false
      status: 'rejected' | 'not_found'
      message: string
    }

type SparkleFinderRepClaimDeps = {
  supabase: SupabaseClient
}

type LiveQueueClaimRow = {
  rep_id?: unknown
}

type ClaimRepRow = {
  id?: unknown
  display_name?: unknown
  business_name?: unknown
  public_site_slug?: unknown
  status?: unknown
}

export function authorizeSparkleFinderRepClaimRequest(
  request: Request,
  token: string | undefined,
): { ok: true } | { ok: false; reason: 'not_configured' | 'unauthorized'; status: 401 | 503 } {
  const expectedToken = token?.trim()

  if (!expectedToken) {
    return { ok: false, reason: 'not_configured', status: 503 }
  }

  if (request.headers.get('authorization') !== `Bearer ${expectedToken}`) {
    return { ok: false, reason: 'unauthorized', status: 401 }
  }

  return { ok: true }
}

export async function validateSparkleFinderRepClaim(
  rawPayload: unknown,
  deps: SparkleFinderRepClaimDeps,
): Promise<SparkleFinderRepClaimResult> {
  const payload = normalizePayload(rawPayload)

  if (payload.sourceProduct !== 'sparkle_finder') {
    return rejected('Sparkle Finder rep claims must identify their source product.')
  }

  if (!payload.finderUserId) {
    return rejected('Sparkle Finder rep claims must include the Finder user id.')
  }

  if (!payload.secretRepIdNumber) {
    return rejected('Enter your Secret Rep ID Number to claim your rep badge.')
  }

  const { data: liveQueueRow, error: liveQueueError } = await deps.supabase
    .from(LIVE_LINEUP_CONNECTION_CODE_TABLE)
    .select('rep_id')
    .eq('sync_code', payload.secretRepIdNumber)
    .maybeSingle()

  if (liveQueueError) throw liveQueueError

  const repId = readString((liveQueueRow as LiveQueueClaimRow | null)?.rep_id)
  if (!repId) return notFound()

  const { data: repRow, error: repError } = await deps.supabase
    .from('reps')
    .select('id, display_name, business_name, public_site_slug, status')
    .eq('id', repId)
    .maybeSingle()

  if (repError) throw repError

  const rep = normalizeRepRow(repRow)
  if (!rep || rep.status !== 'active') return notFound()

  const eligibleRepIds = new Set(
    await loadFinderEntitledRepIds(deps.supabase),
  )
  if (!eligibleRepIds.has(rep.id)) return notFound()

  return {
    ok: true,
    status: 'claimed',
    suiteRepId: rep.id,
    displayName: rep.displayName,
    businessName: rep.businessName,
    publicSiteSlug: rep.publicSiteSlug,
    finderEntitlement: {
      isRep: true,
      silverRepIncluded: true,
      badge: 'bp_rep',
    },
  }
}

function normalizePayload(rawPayload: unknown): Required<SparkleFinderRepClaimPayload> {
  const record = readRecord(rawPayload)

  return {
    sourceProduct: cleanText(readString(record.sourceProduct), 80),
    finderUserId: cleanText(readString(record.finderUserId), 120),
    secretRepIdNumber: normalizeSecretRepIdNumber(record.secretRepIdNumber),
  }
}

function normalizeSecretRepIdNumber(value: unknown): string {
  return cleanText(readString(value), 80).toUpperCase()
}

function normalizeRepRow(value: unknown): {
  id: string
  displayName: string | null
  businessName: string | null
  publicSiteSlug: string | null
  status: string
} | null {
  const row = readRecord(value) as ClaimRepRow
  const id = readString(row.id)
  const status = readString(row.status)

  if (!id) return null

  return {
    id,
    displayName: cleanText(readString(row.display_name), 160) || null,
    businessName: cleanText(readString(row.business_name), 160) || null,
    publicSiteSlug: cleanText(readString(row.public_site_slug), 120) || null,
    status,
  }
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function cleanText(value: string | undefined, maxLength: number): string {
  return String(value ?? '').trim().slice(0, maxLength)
}

function rejected(message: string): SparkleFinderRepClaimResult {
  return {
    ok: false,
    status: 'rejected',
    message,
  }
}

function notFound(): SparkleFinderRepClaimResult {
  return {
    ok: false,
    status: 'not_found',
    message: 'That Secret Rep ID Number did not match an active Sparkle Suite rep.',
  }
}
