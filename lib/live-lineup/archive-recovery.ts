import 'server-only'
import { isDeepStrictEqual } from 'node:util'
import type { SupabaseClient } from '@supabase/supabase-js'
import { buildWorkspaceLineupSnapshot, isLineupState, LINEUP_MAX_ENTRIES } from './model'
import { LineupServiceError, readLineupState } from './service'
import type { LineupState, WorkspaceLineupEntry } from './types'

export interface LineupArchive {
  generation: number
  revision: number
  archivedAt: string
  state: LineupState
}
export interface LineupArchiveSummary {
  generation: number
  revision: number
  archivedAt: string
  partyIds: string[]
  waitingCount: number
  heldCount: number
}
export interface ArchiveRecoveryRequest {
  archiveGeneration: number
  archiveRevision: number
  expectedRevision: number
  entryIds: string[]
  confirmed: true
}

const integer = (value: unknown, minimum = 0): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum
const timestamp = (value: unknown): value is string => typeof value === 'string' && Number.isFinite(Date.parse(value)) && Date.parse(value) >= 0
const storedInteger = (value: unknown): number | null => {
  if (integer(value)) return value
  if (typeof value === 'string' && /^(0|[1-9][0-9]*)$/.test(value) && integer(Number(value))) return Number(value)
  return null
}
const party = (id: string) => id.split(':')[0]
const archiveFields = 'rep_id,generation,revision,archived_at,state'

function validateArchive(value: unknown, repId: string): LineupArchive {
  const row = value as Record<string, unknown> | null
  const generation = storedInteger(row?.generation), revision = storedInteger(row?.revision)
  if (!row || row.rep_id !== repId || generation === null || revision === null || revision < 1
    || !timestamp(row.archived_at) || !isLineupState(row.state) || !row.state.lastReadyAt
    || row.state.revision !== revision || (row.state.show?.generation ?? 0) !== generation) {
    throw new LineupServiceError('invalid_lineup_archive')
  }
  return { generation, revision, archivedAt: row.archived_at, state: row.state }
}

function summary(archive: LineupArchive): LineupArchiveSummary {
  return { generation: archive.generation, revision: archive.revision, archivedAt: archive.archivedAt,
    partyIds: [...(archive.state.show?.partyIds ?? [])], waitingCount: archive.state.order.length, heldCount: archive.state.held.length }
}

function parseRecovery(input: unknown): ArchiveRecoveryRequest {
  const request = input as ArchiveRecoveryRequest | null
  if (!request || request.confirmed !== true || !integer(request.archiveGeneration) || !integer(request.archiveRevision, 1)
    || !integer(request.expectedRevision, 1) || !Array.isArray(request.entryIds) || !request.entryIds.length
    || request.entryIds.length > LINEUP_MAX_ENTRIES || new Set(request.entryIds).size !== request.entryIds.length
    || request.entryIds.some(id => typeof id !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9:_-]{0,127}$/.test(id))) {
    throw new LineupServiceError('invalid_archive_recovery', 400)
  }
  return { archiveGeneration: request.archiveGeneration, archiveRevision: request.archiveRevision,
    expectedRevision: request.expectedRevision, entryIds: [...request.entryIds], confirmed: true }
}

/** Deterministic, additive recovery. All restored customers enter private Hold, never the public order.
 * An archive is a source of selected identities, not a replacement for today's show or publisher.
 */
export function buildArchiveRecoveryState(current: LineupState, archive: LineupArchive, input: unknown, now: number): LineupState {
  const request = parseRecovery(input)
  if (!isLineupState(current) || !isLineupState(archive.state) || !archive.state.lastReadyAt
    || archive.revision !== archive.state.revision || archive.generation !== (archive.state.show?.generation ?? 0)
    || !timestamp(archive.archivedAt)) throw new LineupServiceError('invalid_lineup_archive')
  if (!integer(now) || now > 8_640_000_000_000_000
    || [current.lastReceivedAt, current.lastReadyAt, current.lastChangedAt, current.show?.startedAt]
      .some(time => time != null && Date.parse(time) > now)) throw new LineupServiceError('invalid_time', 409)
  if (request.expectedRevision !== current.revision) throw new LineupServiceError('revision_conflict', 409)
  if (request.archiveGeneration !== archive.generation || request.archiveRevision !== archive.revision) throw new LineupServiceError('archive_changed', 409)
  if (!current.show || !current.publisher || !current.lastReadyAt || archive.generation >= current.show.generation) {
    throw new LineupServiceError('invalid_scope', 409)
  }
  const selected = new Set(request.entryIds), available = new Map(archive.state.entries.map(entry => [entry.id, entry]))
  const existing = new Set(current.entries.map(entry => entry.id)), revealed = new Set(current.revealedIds)
  for (const id of selected) {
    if (!available.has(id)) throw new LineupServiceError('archive_entry_not_found', 409)
    if (existing.has(id)) throw new LineupServiceError('entry_already_present', 409)
    if (revealed.has(id)) throw new LineupServiceError('entry_already_revealed', 409)
    // Scope expansion is deliberately separate from recovery and requires its own review.
    if (!id.includes(':') || !current.show.partyIds.includes(party(id))) throw new LineupServiceError('invalid_scope', 409)
  }
  const recovered = [...archive.state.order, ...archive.state.held].filter(id => selected.has(id))
  const carryEntryIds = [...new Set([...current.show.carryEntryIds, ...recovered])]
  if (current.entries.length + recovered.length > LINEUP_MAX_ENTRIES || carryEntryIds.length > LINEUP_MAX_ENTRIES
    || !integer(current.revision + 1) || !integer(current.show.generation + 1)) throw new LineupServiceError('capacity_exceeded', 409)
  const next: LineupState = { ...current, revision: current.revision + 1,
    show: { ...current.show, generation: current.show.generation + 1, partyIds: [...current.show.partyIds],
      excludedPartyIds: [...current.show.excludedPartyIds], carryEntryIds },
    entries: [...current.entries, ...recovered.map(id => available.get(id)!)].map(entry => ({id: entry.id, name: entry.name, orderedAt: entry.orderedAt})),
    order: [...current.order], held: [...current.held, ...recovered], revealedIds: [...current.revealedIds],
    // Old Undo can mention a since-removed identity. Clearing it prevents unexpectedly unholding a recovery.
    undo: null, sourceObservation: null, lastReadyObservation: null, retiredDocumentIds: [], restorations: [], revealEvents: [], revealEventCursor: 0,
    lastReceivedAt: null, parserState: 'loading', sourceVersion: null, lastChangedAt: new Date(now).toISOString(),
    publisher: { ...current.publisher, lastSequence: -1, leaseExpiresAt: new Date(now).toISOString() } }
  if (!isLineupState(next)) throw new LineupServiceError('invalid_recovered_lineup')
  return next
}

/** OWNER ONLY: callers must use workspaceLineupContext, including its support-scope guard.
 * repId is authenticated context, never request-body authority. List/detail responses omit raw state.
 */
export async function listLineupArchives(db: SupabaseClient, repId: string, options: { beforeGeneration?: number; limit?: number } = {}) {
  const limit = options.limit ?? 10
  if (!integer(limit, 1) || limit > 20 || (options.beforeGeneration !== undefined && !integer(options.beforeGeneration))) {
    throw new LineupServiceError('invalid_archive_page', 400)
  }
  let query = db.from('live_lineup_show_archives').select(archiveFields).eq('rep_id', repId)
    .order('generation', { ascending: false }).limit(limit + 1)
  if (options.beforeGeneration !== undefined) query = query.lt('generation', options.beforeGeneration)
  const { data, error } = await query
  if (error) throw new LineupServiceError('archives_unavailable')
  if (!Array.isArray(data) || data.length > limit + 1) throw new LineupServiceError('invalid_lineup_archive')
  const archives = data.map(row => validateArchive(row, repId))
  if (archives.some((archive, index) => (options.beforeGeneration !== undefined && archive.generation >= options.beforeGeneration)
    || (index > 0 && archive.generation >= archives[index - 1].generation))) throw new LineupServiceError('invalid_lineup_archive')
  return { archives: archives.slice(0, limit).map(summary),
    nextBeforeGeneration: archives.length > limit ? archives[limit - 1].generation : null }
}

async function loadArchive(db: SupabaseClient, repId: string, generation: number): Promise<LineupArchive> {
  if (!integer(generation)) throw new LineupServiceError('invalid_archive_generation', 400)
  const { data, error } = await db.from('live_lineup_show_archives').select(archiveFields).eq('rep_id', repId).eq('generation', generation).maybeSingle()
  if (error) throw new LineupServiceError('archives_unavailable')
  if (!data) throw new LineupServiceError('archive_not_found', 404)
  const archive = validateArchive(data, repId)
  if (archive.generation !== generation) throw new LineupServiceError('invalid_lineup_archive')
  return archive
}

export async function readLineupArchive(db: SupabaseClient, repId: string, generation: number) {
  const archive = await loadArchive(db, repId, generation)
  const entries = new Map(archive.state.entries.map(entry => [entry.id, entry]))
  const project = (ids: string[], held: boolean): WorkspaceLineupEntry[] => ids.map((id, index) => ({
    id, name: entries.get(id)!.name, position: index + 1, held,
  }))
  return { ...summary(archive), candidates: [...project(archive.state.order, false), ...project(archive.state.held, true)] }
}

export async function recoverLineupArchive(db: SupabaseClient, repId: string, input: unknown, now = Date.now()) {
  const request = parseRecovery(input)
  const current = await readLineupState(db, repId)
  if (!current?.lastReadyAt) throw new LineupServiceError('upgraded_source_required', 409)
  const archive = await loadArchive(db, repId, request.archiveGeneration)
  const next = buildArchiveRecoveryState(current, archive, request, now)
  // Existing owner CAS archives today's state and commits generation+1 in one transaction.
  const { data, error } = await db.rpc('live_lineup_commit', {
    p_rep_id: repId, p_expected_revision: current.revision, p_state: next, p_token_id: null, p_guard: {kind: 'owner', requireFresh: false},
  })
  if (error) throw new LineupServiceError('lineup_unavailable')
  if (Array.isArray(data) && data.length === 0) throw new LineupServiceError('revision_conflict', 409)
  if (!Array.isArray(data) || data.length !== 1 || data[0]?.rep_id !== repId || storedInteger(data[0]?.revision) !== next.revision
    || !isLineupState(data[0]?.state) || !isDeepStrictEqual(data[0].state, next)) throw new LineupServiceError('invalid_lineup_receipt')
  return {...buildWorkspaceLineupSnapshot(next, now, true), runtimeWritable: true, tenantContext: repId}
}
