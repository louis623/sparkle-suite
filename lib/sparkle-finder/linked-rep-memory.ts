import type { SupabaseClient } from '@supabase/supabase-js'
import { assembleNicNacContext } from '@/lib/nic-nac/core/context-assembler'
import { loadSuiteRepMemoryCards } from '@/lib/nic-nac/core/memory/rep-memory-cards'
import { createSparkleFinderProductContext } from '@/lib/nic-nac/core/product-context'
import { loadFinderEntitledRepIds } from '@/lib/sparkle-finder/public-api'

export type SparkleFinderLinkedRepMemoryPayload = {
  sourceProduct?: string
  finderUserId?: string
  suiteRepId?: string
}

export type SparkleFinderLinkedRepMemoryResult =
  | {
      ok: true
      status: 'loaded'
      suiteRepId: string
      memorySummaries: string[]
      telemetry: {
        memoryCardCount: number
        blockedMemoryCardCount: number
        memoryScopes: string[]
        truncated: boolean
      }
    }
  | {
      ok: false
      status: 'rejected' | 'not_found'
      message: string
    }

type SparkleFinderLinkedRepMemoryDeps = {
  supabase: SupabaseClient
}

type RepRow = {
  id?: unknown
  status?: unknown
}

export function authorizeSparkleFinderRepMemoryRequest(
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

export async function loadSparkleFinderLinkedRepMemory(
  rawPayload: unknown,
  deps: SparkleFinderLinkedRepMemoryDeps,
): Promise<SparkleFinderLinkedRepMemoryResult> {
  const payload = normalizePayload(rawPayload)

  if (payload.sourceProduct !== 'sparkle_finder') {
    return rejected('Sparkle Finder linked rep memory must identify its source product.')
  }

  if (!payload.finderUserId) {
    return rejected('Sparkle Finder linked rep memory must include the Finder user id.')
  }

  if (!payload.suiteRepId) {
    return rejected('Sparkle Finder linked rep memory must include the linked Sparkle Suite rep id.')
  }

  const { data, error } = await deps.supabase
    .from('reps')
    .select('id, status')
    .eq('id', payload.suiteRepId)
    .maybeSingle()

  if (error) throw error

  const rep = normalizeRepRow(data)
  if (!rep || rep.status !== 'active') {
    return notFound()
  }

  const eligibleRepIds = new Set(
    await loadFinderEntitledRepIds(deps.supabase),
  )
  if (!eligibleRepIds.has(rep.id)) {
    return notFound()
  }

  const memoryCards = await loadSuiteRepMemoryCards({
    repId: rep.id,
    supabase: deps.supabase,
  })
  const assembled = assembleNicNacContext({
    productContext: createSparkleFinderProductContext({
      finderUserId: payload.finderUserId,
      linkedSuiteRepId: rep.id,
      accountTier: 'silver',
    }),
    memoryCards,
  })

  return {
    ok: true,
    status: 'loaded',
    suiteRepId: rep.id,
    memorySummaries: assembled.memoryCards.map((card) =>
      `Sparkle Suite memory - ${card.title}: ${card.summary}`,
    ),
    telemetry: {
      memoryCardCount: assembled.telemetry.memoryCardCount,
      blockedMemoryCardCount: assembled.telemetry.blockedMemoryCardCount,
      memoryScopes: assembled.telemetry.memoryScopes,
      truncated: assembled.telemetry.truncated,
    },
  }
}

function normalizePayload(rawPayload: unknown): Required<SparkleFinderLinkedRepMemoryPayload> {
  const record = readRecord(rawPayload)

  return {
    sourceProduct: cleanText(readString(record.sourceProduct), 80),
    finderUserId: cleanText(readString(record.finderUserId), 120),
    suiteRepId: cleanText(readString(record.suiteRepId), 120),
  }
}

function normalizeRepRow(value: unknown): { id: string; status: string } | null {
  const row = readRecord(value) as RepRow
  const id = readString(row.id)
  const status = readString(row.status)

  return id ? { id, status } : null
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

function rejected(message: string): SparkleFinderLinkedRepMemoryResult {
  return {
    ok: false,
    status: 'rejected',
    message,
  }
}

function notFound(): SparkleFinderLinkedRepMemoryResult {
  return {
    ok: false,
    status: 'not_found',
    message: 'Linked Sparkle Suite rep memory is not available.',
  }
}
