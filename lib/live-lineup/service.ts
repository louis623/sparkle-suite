import 'server-only'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { isDeepStrictEqual } from 'node:util'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { LiveQueueSnapshot } from '@/lib/services/types'
import { buildLiveQueueSnapshot } from '@/lib/services/live-queue'
import { applyLineupCommand, applySourcePacket, buildWorkspaceLineupSnapshot, claimPublisher, createLineupState, isClaimId, isLineupState } from './model'
import type { LineupState, SourceDescriptor, WorkspaceLineupSnapshot } from './types'

export class LineupServiceError extends Error {
  constructor(public code: string, public status = 503) { super(code) }
}
const missingSchema = (error: { code?: string } | null) => error?.code === '42P01' || error?.code === 'PGRST205'

/** Server-only access. Callers MUST supply an authenticated/strictly resolved tenant, never a request-body rep ID. */
export async function readLineupState(db: SupabaseClient, repId: string): Promise<LineupState | null> {
  const { data, error } = await db.from('live_lineup_states').select('rep_id,revision,state').eq('rep_id', repId).maybeSingle()
  if (missingSchema(error)) return null // Additive rollout: legacy stays read-only until schema/client migration.
  if (error) throw new LineupServiceError('lineup_unavailable')
  if (!data) return null
  if (data.rep_id !== repId || !isLineupState(data.state) || Number(data.revision) !== data.state.revision) throw new LineupServiceError('invalid_stored_lineup')
  return data.state
}

async function legacySnapshot(db: SupabaseClient, repId: string, now: number): Promise<LiveQueueSnapshot | null> {
  const { data, error } = await db.from('live_queue').select('rep_id,sync_code,queue,last_updated').eq('rep_id', repId).limit(2)
  if (error) throw new LineupServiceError('lineup_unavailable')
  if (!data?.length) return null
  if (data.length !== 1) throw new LineupServiceError('ambiguous_queue_mapping', 409)
  if (data[0]?.rep_id !== repId) throw new LineupServiceError('invalid_queue_receipt')
  const snapshot = buildLiveQueueSnapshot(data[0], { now: new Date(now) })
  // Legacy sender clocks are untrusted. Future dates must not become a fresh, sticky snapshot.
  if (snapshot.lastUpdated && Date.parse(snapshot.lastUpdated) > now + 30_000) {
    return { ...snapshot, lastUpdated: null, ageSeconds: null, isFresh: false, sourceReady: false }
  }
  return snapshot
}

export async function getWorkspaceLineup(db: SupabaseClient, repId: string, now = Date.now()): Promise<WorkspaceLineupSnapshot> {
  const state = await readLineupState(db, repId)
  if (state?.lastReadyAt) return buildWorkspaceLineupSnapshot(state, now)
  const legacy = await legacySnapshot(db, repId, now)
  return {
    revision: state?.revision ?? 0, connection: legacy?.isFresh ? 'delayed' : 'offline',
    lastReceivedAt: legacy?.lastUpdated ?? null, lastChangedAt: legacy?.lastUpdated ?? null,
    sourceVersion: null, canManage: false,
    entries: (legacy?.queue ?? []).map((name, index) => ({ id: `legacy:${index}`, name, position: index + 1, held: false })),
    heldEntries: [], undoAvailable: false,
    warning: 'Read-only legacy feed. Connect the upgraded extension before rearranging orders. Its connection health is not verified.',
  }
}

/** Only this projection may reach customer sites: no order/device IDs, token/code, holds, or undo history. */
export async function getEffectiveLiveQueueSnapshot(db: SupabaseClient, repId: string, now = Date.now()): Promise<LiveQueueSnapshot | null> {
  const state = await readLineupState(db, repId)
  if (!state?.lastReadyAt) {
    const legacy = await legacySnapshot(db, repId, now)
    return legacy ? { ...legacy, serverTime: new Date(now).toISOString() } : null
  }
  const workspace = buildWorkspaceLineupSnapshot(state, now)
  const queue = workspace.entries.map(entry => entry.name)
  const ageSeconds = Math.max(0, Math.floor((now - Date.parse(state.lastReadyAt)) / 1000))
  return {
    syncCode: '', queue, queueLength: queue.length, currentCustomer: queue[0] ?? null, onDeckCustomer: queue[1] ?? null,
    lastUpdated: state.lastReadyAt, ageSeconds, staleAfterSeconds: 45, isFresh: workspace.connection === 'connected',
    revision: state.revision, sourceReady: state.parserState === 'ready', serverTime: new Date(now).toISOString(),
  }
}

async function saveState(db: SupabaseClient, repId: string, expectedRevision: number, state: LineupState, tokenId?: string) {
  const { data, error } = await db.rpc('live_lineup_compare_swap', {
    p_rep_id: repId, p_expected_revision: expectedRevision, p_state: state, p_token_id: tokenId ?? null,
  })
  if (error?.code === '28000') throw new LineupServiceError('unauthorized', 401)
  if (error) throw new LineupServiceError('lineup_unavailable')
  if (!Array.isArray(data) || data.length !== 1) throw new LineupServiceError('revision_conflict', 409)
  const receipt = data[0]
  // A success receipt must prove the exact intended tenant/revision/state, not merely contain one row.
  // JSONB reorders object keys, so structural comparison is required instead of JSON.stringify equality.
  if (!receipt || receipt.rep_id !== repId || Number(receipt.revision) !== state.revision
    || !isLineupState(receipt.state) || !isDeepStrictEqual(receipt.state, state)) {
    throw new LineupServiceError('invalid_lineup_receipt')
  }
  return receipt.state
}

export async function changeLineup(db: SupabaseClient, repId: string, input: unknown, now = Date.now()) {
  const state = await readLineupState(db, repId)
  if (!state?.lastReadyAt) throw new LineupServiceError('upgraded_source_required', 409)
  const result = applyLineupCommand(state, input, now)
  if (!result.ok) throw new LineupServiceError(result.code, result.code === 'invalid_payload' ? 400 : 409)
  await saveState(db, repId, state.revision, result.state)
  return buildWorkspaceLineupSnapshot(result.state, now)
}

export const hashPublisherToken = (token: string) => createHash('sha256').update(token).digest('hex')
const publisherUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const publisherLabel = (value: unknown): value is string => typeof value === 'string' && !!value
  && value === value.trim() && value.length <= 80 && !/[\u0000-\u001f\u007f]/.test(value)
const MAX_ACTIVE_PUBLISHERS = 8
const MAX_LISTED_PUBLISHERS = 100
const AUTH_CLOCK_SKEW_MS = 30_000
type Publisher = { id: string; rep_id: string; label: string; created_at: string; expires_at: string; revoked_at: string | null }
type PublisherAuthRow = Publisher & { token_hash: string }
type AuthenticatedPublisher = Publisher & { durableTokenId: string | null }
type PublisherListRow = Publisher & { is_valid: boolean }
type PublisherListReceipt = { checked_at: string; active_count: number | string; listed_count: number | string; publishers: unknown[] }
type PublisherIssueRow = Publisher & { active_count: number | string }
const validDate = (value: unknown): value is string => typeof value === 'string' && Number.isFinite(Date.parse(value))
function validatedPublisher(value: unknown, expectedRepId: string): Publisher | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Partial<Publisher>
  if (typeof row.id !== 'string' || !publisherUuid.test(row.id) || row.id !== row.id.toLowerCase()
    || typeof row.rep_id !== 'string' || !publisherUuid.test(row.rep_id) || row.rep_id !== expectedRepId
    || !publisherLabel(row.label) || !validDate(row.created_at) || !validDate(row.expires_at)
    || Date.parse(row.expires_at) <= Date.parse(row.created_at)
    || !(row.revoked_at === null || validDate(row.revoked_at))
    || (row.revoked_at !== null && Date.parse(row.revoked_at) < Date.parse(row.created_at))) return null
  return row as Publisher
}
const publicPublisher = (p: Publisher, activeId?: string, now = Date.now()) => ({ id: p.id, label: p.label, createdAt: p.created_at, expiresAt: p.expires_at, revokedAt: p.revoked_at, active: p.id === activeId && !p.revoked_at && Date.parse(p.expires_at) > now })

export async function listPublishers(db: SupabaseClient, repId: string) {
  if (!publisherUuid.test(repId)) throw new LineupServiceError('invalid_tenant', 400)
  const tenant = repId.toLowerCase()
  // The SQL receipt includes every still-valid credential (bounded by the issuance cap)
  // plus recent audit history. Its count proves a hostile/truncated response did not hide
  // a credential that the owner must be able to revoke.
  const { data, error } = await db.rpc('live_lineup_list_publishers', { p_rep_id: tenant })
  if (error) throw new LineupServiceError('publisher_setup_unavailable')
  if (!Array.isArray(data) || data.length !== 1 || !data[0] || typeof data[0] !== 'object') throw new LineupServiceError('invalid_publisher_receipt')
  const receipt = data[0] as Partial<PublisherListReceipt>
  const expectedActiveCount = Number(receipt.active_count), listedCount = Number(receipt.listed_count)
  if (!validDate(receipt.checked_at) || !Array.isArray(receipt.publishers)
    || !Number.isSafeInteger(expectedActiveCount) || expectedActiveCount < 0 || expectedActiveCount > MAX_ACTIVE_PUBLISHERS
    || !Number.isSafeInteger(listedCount) || listedCount !== receipt.publishers.length
    || listedCount < expectedActiveCount || listedCount > MAX_LISTED_PUBLISHERS) throw new LineupServiceError('invalid_publisher_receipt')
  const ids = new Set<string>()
  let observedActiveCount = 0
  const checked = Date.parse(receipt.checked_at)
  const publishers = receipt.publishers.map(value => {
    const raw = value as Partial<PublisherListRow>
    const publisher = validatedPublisher(value, tenant)
    if (!publisher || ids.has(publisher.id) || typeof raw.is_valid !== 'boolean') throw new LineupServiceError('invalid_publisher_receipt')
    const shouldBeValid = publisher.revoked_at === null && Date.parse(publisher.expires_at) > checked
    if (Date.parse(publisher.created_at) > checked || (publisher.revoked_at !== null && Date.parse(publisher.revoked_at) > checked)
      || raw.is_valid !== shouldBeValid) throw new LineupServiceError('invalid_publisher_receipt')
    ids.add(publisher.id)
    if (raw.is_valid) observedActiveCount++
    return publisher
  })
  if (observedActiveCount !== expectedActiveCount) throw new LineupServiceError('invalid_publisher_receipt')
  const state = await readLineupState(db, tenant)
  return publishers.map(p => publicPublisher(p, state?.publisher?.id, checked))
}

export async function issuePublisher(db: SupabaseClient, repId: string, label: unknown, now = Date.now()) {
  if (!publisherUuid.test(repId)) throw new LineupServiceError('invalid_tenant', 400)
  const tenant = repId.toLowerCase()
  if (typeof label !== 'string' || !publisherLabel(label.trim())) throw new LineupServiceError('invalid_label', 400)
  const token = `sslp_${randomBytes(32).toString('base64url')}`
  const id = randomUUID(), normalizedLabel = label.trim()
  const { data, error } = await db.rpc('live_lineup_issue_publisher', {
    p_rep_id: tenant, p_token_id: id, p_token_hash: hashPublisherToken(token), p_label: normalizedLabel,
  })
  if (error?.code === '54000') throw new LineupServiceError('publisher_limit_reached', 409)
  if (error) throw new LineupServiceError('publisher_setup_unavailable')
  if (!Array.isArray(data) || data.length !== 1) throw new LineupServiceError('invalid_publisher_receipt')
  const raw = data[0] as Partial<PublisherIssueRow>
  const row = validatedPublisher(data[0], tenant)
  const count = Number(raw?.active_count)
  const lifetime = row ? Date.parse(row.expires_at) - Date.parse(row.created_at) : NaN
  if (!row || row.id !== id || row.label !== normalizedLabel || row.revoked_at !== null
    || !Number.isSafeInteger(count) || count < 1 || count > MAX_ACTIVE_PUBLISHERS
    || lifetime !== 90 * 86_400_000) {
    throw new LineupServiceError('invalid_publisher_receipt')
  }
  // One-time owner response only. Never log token or put it in a URL, public payload, or synced storage.
  return { publisher: publicPublisher(row, undefined, now), token }
}

export async function revokePublisher(db: SupabaseClient, repId: string, id: unknown) {
  if (!publisherUuid.test(repId)) throw new LineupServiceError('invalid_tenant', 400)
  const tenant = repId.toLowerCase()
  if (typeof id !== 'string' || !publisherUuid.test(id)) throw new LineupServiceError('invalid_publisher', 400)
  const publisherId = id.toLowerCase()
  // Revocation and selected-lease invalidation must commit together. A separate state write
  // could race a heartbeat/claim and either leave the revoked device connected or evict its replacement.
  const { data, error } = await db.rpc('live_lineup_revoke_publisher', { p_rep_id: tenant, p_token_id: publisherId })
  if (error) throw new LineupServiceError('publisher_setup_unavailable')
  if (Array.isArray(data) && data.length === 0) throw new LineupServiceError('publisher_not_found', 404)
  if (!Array.isArray(data) || data.length !== 1 || data[0]?.publisher_id !== publisherId || data[0]?.rep_id !== tenant
    || typeof data[0]?.revoked_at !== 'string' || !Number.isFinite(Date.parse(data[0].revoked_at))
    || typeof data[0]?.invalidated !== 'boolean') throw new LineupServiceError('invalid_publisher_receipt')
}

async function authenticatePublisher(db: SupabaseClient, credential: string | null, now: number): Promise<AuthenticatedPublisher> {
  if (credential && /^[A-Z0-9]{3}-[0-9]{4}$/.test(credential)) {
    const { data, error } = await db.from('live_queue').select('rep_id,sync_code').eq('sync_code', credential).limit(2)
    if (error) throw new LineupServiceError('publisher_service_unavailable')
    if (!Array.isArray(data) || data.length !== 1) throw new LineupServiceError('unauthorized', 401)
    const row = data[0] as { rep_id?: unknown; sync_code?: unknown }
    const repId = typeof row.rep_id === 'string' ? row.rep_id.toLowerCase() : ''
    if (!publisherUuid.test(repId) || row.sync_code !== credential) throw new LineupServiceError('unauthorized', 401)
    return {
      id: repId, rep_id: repId, label: 'Workspace code',
      created_at: new Date(0).toISOString(), expires_at: new Date(8_640_000_000_000_000).toISOString(),
      revoked_at: null, durableTokenId: null,
    }
  }
  if (!credential || !/^sslp_[A-Za-z0-9_-]{43}$/.test(credential)) throw new LineupServiceError('unauthorized', 401)
  const tokenHash = hashPublisherToken(credential)
  const { data, error } = await db.from('live_lineup_publisher_tokens').select('id,rep_id,token_hash,label,created_at,expires_at,revoked_at').eq('token_hash', tokenHash).maybeSingle()
  if (error) throw new LineupServiceError('publisher_service_unavailable')
  // Retain 2.0.1 token acceptance so an already-paired browser is not interrupted
  // before Chrome installs the assigned-code update.
  const tenant = data && typeof data === 'object' && typeof data.rep_id === 'string' ? data.rep_id.toLowerCase() : ''
  const publisher = validatedPublisher(data, tenant)
  if (!publisher || (data as Partial<PublisherAuthRow>)?.token_hash !== tokenHash || publisher.rep_id !== tenant
    || publisher.revoked_at || Date.parse(publisher.created_at) > now + AUTH_CLOCK_SKEW_MS
    || Date.parse(publisher.expires_at) <= now) throw new LineupServiceError('unauthorized', 401)
  return { ...publisher, durableTokenId: publisher.id }
}

function claimReceipt(state: LineupState, now: number) {
  return { generation: state.show?.generation ?? 0, publisherId: state.publisher!.id, epoch: state.publisher!.epoch, revision: state.revision,
    acceptedSequence: state.publisher!.lastSequence, serverTime: new Date(now).toISOString(), leaseExpiresAt: state.publisher!.leaseExpiresAt }
}

function sourceDescriptor(state: LineupState | null, now: number): SourceDescriptor {
  const show = state?.show
  return {
    protocol: 2,
    generation: show?.generation ?? 0,
    scope: show ? {
      partyIds: [...show.partyIds], excludedPartyIds: [...show.excludedPartyIds],
      startedAt: show.startedAt, carryEntryIds: [...show.carryEntryIds],
    } : null,
    serverTime: new Date(now).toISOString(),
  }
}

/** Private setup read, not a lease or a ready heartbeat. The worker must require
 * deliberate source selection and echo this generation when claiming/publishing.
 * Never automatically adopt a newer generation after a show_changed response. */
export async function describeSource(db: SupabaseClient, token: string | null, now = Date.now()): Promise<SourceDescriptor> {
  const publisher = await authenticatePublisher(db, token, now)
  const state = await readLineupState(db, publisher.rep_id)
  return sourceDescriptor(state, now)
}

const sourcePartyId = (value: unknown): value is string => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,60}$/.test(value)
function sourcePartyList(value: unknown, allowEmpty = false): string[] {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0) || value.length > 100
    || !value.every(sourcePartyId) || new Set(value).size !== value.length) throw new LineupServiceError('invalid_payload', 400)
  return [...value].sort()
}

/** Assigned-code authenticated plumbing for the old one-code experience. It can only
 * configure the currently leased publisher for its own tenant; it cannot choose a rep. */
export async function configureSourceParties(db: SupabaseClient, token: string | null, generation: unknown,
  partyIds: unknown, excludedPartyIds: unknown, now = Date.now()): Promise<SourceDescriptor> {
  if (!Number.isSafeInteger(generation) || (generation as number) < 0) throw new LineupServiceError('invalid_payload', 400)
  const detected = sourcePartyList(partyIds), excluded = sourcePartyList(excludedPartyIds, true)
  if (excluded.some(id => !detected.includes(id))) throw new LineupServiceError('invalid_scope', 409)
  const publisher = await authenticatePublisher(db, token, now)
  for (let attempt = 0; attempt < 3; attempt++) {
    const state = await readLineupState(db, publisher.rep_id)
    if (!state?.publisher || state.publisher.id !== publisher.id || Date.parse(state.publisher.leaseExpiresAt) <= now) {
      throw new LineupServiceError('lease_required', 409)
    }
    if ((state.show?.generation ?? 0) !== generation) throw new LineupServiceError('show_changed', 409)
    let next: LineupState
    if (!state.show) {
      if (!state.lastReadyAt) throw new LineupServiceError('source_not_ready', 409)
      const parties = [...new Set([...detected, ...state.entries.map(entry => entry.id.split(':')[0])])].sort()
      if (parties.length > 100 || parties.some(id => !sourcePartyId(id))) throw new LineupServiceError('invalid_scope', 409)
      const started = applyLineupCommand(state, {
        type: 'start-show', partyIds: parties, carryEntryIds: state.entries.map(entry => entry.id),
        confirmed: true, expectedRevision: state.revision,
      }, now)
      if (!started.ok || !started.state.show) throw new LineupServiceError(started.ok ? 'invalid_scope' : started.code, 409)
      next = { ...started.state, show: { ...started.state.show, excludedPartyIds: excluded } }
    } else {
      const parties = [...new Set([...state.show.partyIds, ...detected])].sort()
      if (parties.length > 100) throw new LineupServiceError('invalid_scope', 409)
      const visibleNow = new Set(detected)
      const exclusions = [...new Set([
        ...state.show.excludedPartyIds.filter(id => !visibleNow.has(id)), ...excluded,
      ])].sort()
      if (isDeepStrictEqual(parties, state.show.partyIds) && isDeepStrictEqual(exclusions, state.show.excludedPartyIds)) {
        return sourceDescriptor(state, now)
      }
      next = { ...state, revision: state.revision + 1, lastChangedAt: new Date(now).toISOString(),
        show: { ...state.show, partyIds: parties, excludedPartyIds: exclusions } }
    }
    if (!isLineupState(next)) throw new LineupServiceError('invalid_scope', 409)
    try {
      await saveState(db, publisher.rep_id, state.revision, next, publisher.durableTokenId ?? undefined)
      return sourceDescriptor(next, now)
    } catch (error) {
      if (!(error instanceof LineupServiceError) || error.code !== 'revision_conflict' || attempt === 2) throw error
    }
  }
  throw new LineupServiceError('revision_conflict', 409)
}

async function replayClaim(db: SupabaseClient, publisher: AuthenticatedPublisher, claimId: string, now: number, generation: number) {
  if (!publisher.durableTokenId) {
    const state = await readLineupState(db, publisher.rep_id)
    if (!state || state.publisher?.id !== publisher.id || state.publisher.claimId !== claimId
      || (state.show?.generation ?? 0) !== generation || Date.parse(state.publisher.leaseExpiresAt) <= now) {
      throw new LineupServiceError('publisher_conflict', 409)
    }
    return claimReceipt(state, now)
  }
  const { data, error } = await db.rpc('live_lineup_claim_receipt', { p_rep_id: publisher.rep_id, p_token_id: publisher.id, p_claim_id: claimId })
  if (error?.code === '28000') throw new LineupServiceError('unauthorized', 401)
  if (error) throw new LineupServiceError('lineup_unavailable')
  if (!Array.isArray(data) || data.length !== 1) throw new LineupServiceError('publisher_conflict', 409)
  const row = data[0]
  if (!row || row.rep_id !== publisher.rep_id || !isLineupState(row.state) || Number(row.revision) !== row.state.revision
    || row.state.publisher?.id !== publisher.id || row.state.publisher.claimId !== claimId
    || (row.state.show?.generation ?? 0) !== generation
    || Date.parse(row.state.publisher.leaseExpiresAt) <= now) throw new LineupServiceError('invalid_lineup_receipt')
  return claimReceipt(row.state, now)
}

export async function claimSource(db: SupabaseClient, token: string | null, claimId: unknown, now = Date.now(), generation: unknown = 0) {
  if (!isClaimId(claimId)) throw new LineupServiceError('invalid_claim_id', 400)
  if (!Number.isSafeInteger(generation) || (generation as number) < 0) throw new LineupServiceError('invalid_payload', 400)
  const publisher = await authenticatePublisher(db, token, now)
  const state = await readLineupState(db, publisher.rep_id) ?? createLineupState()
  const result = claimPublisher(state, publisher.id, state.revision, now, { claimId, generation: generation as number })
  if (!result.ok) throw new LineupServiceError(result.code, 409)
  if (result.state.revision === state.revision) return replayClaim(db, publisher, claimId, now, generation as number)
  try {
    await saveState(db, publisher.rep_id, state.revision, result.state, publisher.durableTokenId ?? undefined)
    return claimReceipt(result.state, now)
  } catch (error) {
    // Concurrent retries of the same attempt may lose the first-write CAS. Only the matching
    // atomic receipt can convert that conflict to success; another worker's nonce still conflicts.
    if (error instanceof LineupServiceError && error.code === 'revision_conflict') return replayClaim(db, publisher, claimId, now, generation as number)
    throw error
  }
}

export async function receiveSource(db: SupabaseClient, token: string | null, input: unknown, now = Date.now()) {
  const publisher = await authenticatePublisher(db, token, now)
  // Tenant and publisher are never selected by untrusted body values.
  if (!input || typeof input !== 'object' || (input as { publisherId?: unknown }).publisherId !== publisher.id) throw new LineupServiceError('publisher_conflict', 409)
  const state = await readLineupState(db, publisher.rep_id)
  if (!state) throw new LineupServiceError('lease_required', 409)
  // Bound authorized write rate across server instances; CAS below serializes racing packets.
  if (state.lastReceivedAt && now - Date.parse(state.lastReceivedAt) < 500) throw new LineupServiceError('rate_limited', 429)
  const result = applySourcePacket(state, input, now)
  if (!result.ok) throw new LineupServiceError(result.code, result.code === 'invalid_payload' ? 400 : 409)
  await saveState(db, publisher.rep_id, state.revision, result.state, publisher.durableTokenId ?? undefined)
  return { ok: true, revision: result.state.revision, acceptedSequence: result.state.publisher!.lastSequence, serverTime: new Date(now).toISOString(), leaseExpiresAt: result.state.publisher!.leaseExpiresAt }
}
