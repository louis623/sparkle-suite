import type { AcceptedObservation, LineupCommand, LineupResult, LineupState, ParserState, RevealRestoration, SourceEntry, SourcePacket, WorkspaceLineupSnapshot } from './types'

export const LINEUP_MAX_ENTRIES = 2000
export const LINEUP_MAX_REVEALED = 10000
export const LINEUP_LEASE_MS = 90_000
export const LINEUP_FRESH_MS = 45_000
export const LINEUP_OBSERVATION_MAX_AGE_MS = 15_000
export const LINEUP_MAX_STATE_BYTES = 8_388_608
export const LINEUP_MAX_EVENTS = 128
export const LINEUP_MAX_EVENT_MEMBERS = 4000
export const LINEUP_OFFLINE_MS = 180_000
const parsers: ParserState[] = ['ready', 'loading', 'partial', 'invalid']
const validId = (value: unknown): value is string => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9:_-]{0,127}$/.test(value)
export const isClaimId = (value: unknown): value is string => typeof value === 'string'
  && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value)
const validInteger = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0
const validTime = (value: number) => Number.isSafeInteger(value) && value >= 0 && value <= 8_640_000_000_000_000
const fail = (code: Extract<LineupResult, { ok: false }>['code']): LineupResult => ({ ok: false, code })

export function createLineupState(): LineupState {
  return { schemaVersion: 2, revision: 0, show: null, entries: [], order: [], held: [], revealedIds: [], undo: null,
    publisher: null, lastReceivedAt: null, lastReadyAt: null, lastChangedAt: null, parserState: 'loading', sourceVersion: null }
}

const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
const canonicalTime = (value: unknown): value is string => typeof value === 'string' && Number.isFinite(Date.parse(value))
  && validTime(Date.parse(value)) && new Date(value).toISOString() === value
const nullableTime = (value: unknown) => value === null || canonicalTime(value)
const clockRegressed = (state: LineupState, now: number) => [state.lastReceivedAt, state.lastReadyAt, state.lastChangedAt]
  .some(timestamp => timestamp !== null && Date.parse(timestamp) > now)
function validIds(value: unknown, maximum: number): value is string[] {
  return Array.isArray(value) && value.length <= maximum && value.every(validId) && new Set(value).size === value.length
}
const validParties = (value: unknown): value is string[] => validIds(value, 100)
  && value.every(id => /^[A-Za-z0-9][A-Za-z0-9_-]{0,60}$/.test(id))
const entryParty = (id: string) => id.split(':')[0]
const optionalSurname = (value: unknown): string | undefined => typeof value === 'string' && value.trim().length > 0
  && value.trim().length <= 100 && !/[\p{Cc}\p{Cf}]/u.test(value) ? value.trim() : undefined
const validObservation = (value: unknown): value is AcceptedObservation => record(value) && isClaimId(value.documentId)
  && validInteger(value.serial) && canonicalTime(value.serverTime) && typeof value.settled === 'boolean'
  && validInteger(value.epoch) && value.epoch > 0 && validInteger(value.generation)
const plainEntry = (entry: SourceEntry): SourceEntry => ({id: entry.id, name: entry.name, orderedAt: entry.orderedAt})
const stateFits = (state: LineupState) => new TextEncoder().encode(JSON.stringify(state)).byteLength <= LINEUP_MAX_STATE_BYTES

/** A server receipt never restarts source evidence's lifetime. */
export function lineupFreshness(state: LineupState, now: number) {
  const evidence = state.lastReadySourceAt ?? state.lastReadyAt
  const deadline = evidence && state.publisher ? Math.min(Date.parse(evidence) + LINEUP_FRESH_MS, Date.parse(state.publisher.leaseExpiresAt)) : NaN
  const fresh = validTime(now) && state.parserState === 'ready' && state.lastReceivedAt !== null && state.lastReadyAt !== null
    && Date.parse(state.lastReadyAt) <= now && Number.isFinite(deadline) && now < deadline
    && (!state.publisher?.capabilities || !!state.show && !state.bootstrapPending && state.sourceObservation?.settled === true)
  return { fresh, freshUntil: fresh ? new Date(deadline).toISOString() : null, freshForMs: fresh ? Math.max(0, deadline - now) : 0 }
}

/** Database JSON is untrusted too: reject corrupt arrangements instead of silently losing/duplicating orders. */
export function isLineupState(input: unknown): input is LineupState {
  if (!record(input) || input.schemaVersion !== 2 || !validInteger(input.revision)
    || !parsers.includes(input.parserState as ParserState) || !Array.isArray(input.entries)
    || input.entries.length > LINEUP_MAX_ENTRIES || !validIds(input.order, LINEUP_MAX_ENTRIES)
    || !validIds(input.held, LINEUP_MAX_ENTRIES) || !validIds(input.revealedIds, LINEUP_MAX_REVEALED)
    || !nullableTime(input.lastReceivedAt) || !nullableTime(input.lastReadyAt) || !nullableTime(input.lastChangedAt)
    || !(input.sourceVersion === null || typeof input.sourceVersion === 'string' && /^[A-Za-z0-9._+-]{1,64}$/.test(input.sourceVersion))) return false
  if (input.show !== null && (!record(input.show) || !validInteger(input.show.generation) || input.show.generation < 1
    || !validParties(input.show.partyIds) || !input.show.partyIds.length || !validParties(input.show.excludedPartyIds)
    || !validIds(input.show.carryEntryIds, LINEUP_MAX_ENTRIES)
    || input.show.carryEntryIds.some(id => !id.includes(':') || !(input.show as {partyIds: string[]}).partyIds.includes(entryParty(id)))
    || input.show.excludedPartyIds.some(id => !(input.show as {partyIds: string[]}).partyIds.includes(id))
    || !canonicalTime(input.show.startedAt) || input.publisher === null || input.lastReadyAt === null)) return false
  const entryIds = new Set<string>()
  for (const entry of input.entries) {
    if (!record(entry) || !validId(entry.id) || entryIds.has(entry.id) || typeof entry.name !== 'string'
      || !entry.name || entry.name !== entry.name.trim() || entry.name.length > 100 || /[\u0000-\u001f\u007f]/.test(entry.name)
      || !(entry.orderedAt === null || typeof entry.orderedAt === 'number' && validTime(entry.orderedAt))) return false
    if (entry.lastName !== undefined && optionalSurname(entry.lastName) !== entry.lastName
      || entry.identityEligible !== undefined && typeof entry.identityEligible !== 'boolean'
      || entry.sourceIdentityVersion !== undefined && (typeof entry.sourceIdentityVersion !== 'string' || entry.sourceIdentityVersion.length > 100)
      || entry.identityEligible === true && (!entry.lastName || !entry.sourceIdentityVersion)) return false
    entryIds.add(entry.id)
  }
  if (record(input.show) && [...entryIds, ...input.revealedIds].some(id => !id.includes(':') || !(input.show as {partyIds: string[]}).partyIds.includes(entryParty(id)))) return false
  const arranged = [...input.order, ...input.held]
  if (arranged.length !== entryIds.size || new Set(arranged).size !== arranged.length
    || arranged.some(id => !entryIds.has(id)) || input.revealedIds.some(id => entryIds.has(id))) return false
  if (input.undo !== null) {
    // Undo may reference since-revealed IDs, but a previous arrangement is still a partition with no duplicates.
    if (!record(input.undo) || !validIds(input.undo.order, LINEUP_MAX_ENTRIES) || !validIds(input.undo.held, LINEUP_MAX_ENTRIES)) return false
    const previous = [...input.undo.order, ...input.undo.held]
    if (previous.length > LINEUP_MAX_ENTRIES || new Set(previous).size !== previous.length) return false
  }
  if (input.publisher !== null) {
    if (!record(input.publisher) || !validId(input.publisher.id) || !isClaimId(input.publisher.claimId) || !validInteger(input.publisher.epoch)
      || input.publisher.epoch < 1 || !canonicalTime(input.publisher.leaseExpiresAt)
      || !Number.isSafeInteger(input.publisher.lastSequence) || (input.publisher.lastSequence as number) < -1
      || input.revision < 1) return false
    if (input.publisher.capabilities !== undefined && input.publisher.capabilities !== 'lineup-2.0.5') return false
  } else if (input.revision !== 0 || input.entries.length || input.revealedIds.length || input.undo !== null
    || input.lastReceivedAt !== null || input.lastReadyAt !== null || input.lastChangedAt !== null
    || input.sourceVersion !== null || input.parserState !== 'loading') return false
  if (input.lastReceivedAt !== null && (input.publisher === null || input.sourceVersion === null)) return false
  if (record(input.publisher) && ((input.publisher.lastSequence === -1) !== (input.lastReceivedAt === null))) return false
  if (input.lastReceivedAt === null && (input.sourceVersion !== null || input.parserState !== 'loading')) return false
  if (input.lastReadyAt === null && (input.entries.length || input.revealedIds.length || input.lastChangedAt !== null || input.undo !== null)) return false
  if (record(input.publisher) && input.lastReceivedAt !== null
    && Date.parse(input.publisher.leaseExpiresAt as string) <= Date.parse(input.lastReceivedAt as string)) return false
  if (input.lastReadyAt !== null && input.lastReceivedAt !== null && Date.parse(input.lastReadyAt as string) > Date.parse(input.lastReceivedAt as string)) return false
  if (input.parserState === 'ready' && (input.lastReadyAt === null || input.lastReadyAt !== input.lastReceivedAt)) return false
  if (input.sourceObservation != null && !validObservation(input.sourceObservation)) return false
  if (input.lastReadyObservation != null && !validObservation(input.lastReadyObservation)) return false
  if (input.lastReadySourceAt !== undefined && !nullableTime(input.lastReadySourceAt)) return false
  if (typeof input.lastReadySourceAt === 'string' && (input.lastReadyAt === null || Date.parse(input.lastReadySourceAt) > Date.parse(input.lastReadyAt as string))) return false
  if (record(input.sourceObservation) && (!record(input.publisher) || input.sourceObservation.epoch !== input.publisher.epoch
    || input.sourceObservation.generation !== (record(input.show) ? input.show.generation : 0))) return false
  if (input.bootstrapPending !== undefined && typeof input.bootstrapPending !== 'boolean') return false
  if (input.retiredDocumentIds !== undefined && (!Array.isArray(input.retiredDocumentIds) || input.retiredDocumentIds.length > 32
    || !input.retiredDocumentIds.every(isClaimId) || new Set(input.retiredDocumentIds).size !== input.retiredDocumentIds.length)) return false
  if (record(input.sourceObservation) && Array.isArray(input.retiredDocumentIds) && input.retiredDocumentIds.includes(input.sourceObservation.documentId)) return false
  if (input.revealEventCursor !== undefined && !validInteger(input.revealEventCursor)) return false
  if (input.restorationNotice !== undefined && input.restorationNotice !== null && input.restorationNotice !== 'Restored orders without surviving anchors were placed at the end of their previous list.') return false
  if (input.restorations !== undefined) {
    if (!Array.isArray(input.restorations) || input.restorations.length > LINEUP_MAX_REVEALED) return false
    const restoredIds = new Set<string>()
    for (const item of input.restorations) {
      if (!record(item) || !record(item.entry) || !validId(item.entry.id) || restoredIds.has(item.entry.id)
        || !input.revealedIds.includes(item.entry.id) || !validObservation(item.checked)
        || !['order','held'].includes(item.category as string) || !validInteger(item.position) || item.position >= LINEUP_MAX_ENTRIES
        || !(item.previousId === null || validId(item.previousId)) || !(item.nextId === null || validId(item.nextId))
        || typeof item.entry.name !== 'string' || !item.entry.name || item.entry.name.length > 100
        || item.entry.name !== item.entry.name.trim() || /[\u0000-\u001f\u007f]/.test(item.entry.name)
        || !(item.entry.orderedAt === null || typeof item.entry.orderedAt === 'number' && validTime(item.entry.orderedAt))
        || item.entry.lastName !== undefined && optionalSurname(item.entry.lastName) !== item.entry.lastName) return false
      restoredIds.add(item.entry.id)
    }
  }
  if (input.revealEvents !== undefined) {
    if (!Array.isArray(input.revealEvents) || input.revealEvents.length > LINEUP_MAX_EVENTS) return false
    let cursor = 0, memberCount = 0
    for (const event of input.revealEvents) {
      if (!record(event) || !validInteger(event.cursor) || event.cursor <= cursor || event.cursor > (input.revealEventCursor as number ?? 0)
        || !validId(event.entryId) || !input.revealedIds.includes(event.entryId) || !canonicalTime(event.at)
        || !validIds(event.groupEntryIds, LINEUP_MAX_ENTRIES)) return false
      cursor = event.cursor
      memberCount += event.groupEntryIds.length
    }
    if (memberCount > LINEUP_MAX_EVENT_MEMBERS) return false
  }
  if (!stateFits(input as unknown as LineupState)) return false
  return true
}

/** Validate untrusted JSON without coercion or silently dropping orders. */
export function parseSourcePacket(input: unknown): SourcePacket | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null
  const p = input as Record<string, unknown>
  if (p.generation !== undefined && !validInteger(p.generation)) return null
  if (p.claimId !== undefined && !isClaimId(p.claimId)) return null
  if (p.observation !== undefined && (!record(p.observation) || !isClaimId(p.observation.documentId)
    || !validInteger(p.observation.serial) || !canonicalTime(p.observation.serverTime) || typeof p.observation.settled !== 'boolean')) return null
  if (!validId(p.publisherId) || !validInteger(p.epoch) || p.epoch < 1 || !validInteger(p.sequence)
    || typeof p.sourceVersion !== 'string' || !/^[A-Za-z0-9._+-]{1,64}$/.test(p.sourceVersion)
    || !parsers.includes(p.parserState as ParserState) || !Array.isArray(p.entries) || !Array.isArray(p.revealedIds)
    || p.entries.length > LINEUP_MAX_ENTRIES || p.revealedIds.length > LINEUP_MAX_REVEALED) return null
  const seen = new Set<string>()
  const entries: SourceEntry[] = []
  for (const raw of p.entries) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
    const e = raw as Record<string, unknown>
    if (!validId(e.id) || seen.has(e.id) || typeof e.name !== 'string' || !e.name.trim()
      || e.name.trim().length > 100 || /[\u0000-\u001f\u007f]/.test(e.name)
      || !(e.orderedAt === null || (typeof e.orderedAt === 'number' && validTime(e.orderedAt)))) return null
    seen.add(e.id)
    const lastName = optionalSurname(e.lastName)
    entries.push({ id: e.id, name: e.name.trim(), orderedAt: e.orderedAt as number | null, ...(lastName ? {lastName} : {}) })
  }
  const revealed = new Set<string>()
  for (const id of p.revealedIds) {
    if (!validId(id) || seen.has(id) || revealed.has(id)) return null
    revealed.add(id)
  }
  let revealedEntries: SourcePacket['revealedEntries']
  if (p.revealedEntries !== undefined) {
    if (!Array.isArray(p.revealedEntries) || p.revealedEntries.length !== revealed.size) return null
    const metadataIds = new Set<string>()
    revealedEntries = []
    for (const e of p.revealedEntries) {
      if (!record(e) || !validId(e.id) || !revealed.has(e.id) || metadataIds.has(e.id)
        || !(e.orderedAt === null || typeof e.orderedAt === 'number' && validTime(e.orderedAt))) return null
      metadataIds.add(e.id)
      revealedEntries.push({id: e.id, orderedAt: e.orderedAt as number | null})
    }
  }
  return { publisherId: p.publisherId, epoch: p.epoch, sequence: p.sequence, sourceVersion: p.sourceVersion,
    ...(p.claimId === undefined ? {} : {claimId: p.claimId as string}),
    ...(p.observation === undefined ? {} : {observation: {
      documentId: (p.observation as Record<string,unknown>).documentId as string,
      serial: (p.observation as Record<string,unknown>).serial as number,
      serverTime: (p.observation as Record<string,unknown>).serverTime as string,
      settled: (p.observation as Record<string,unknown>).settled as boolean,
    }}),
    parserState: p.parserState as ParserState, entries, revealedIds: [...revealed], ...(revealedEntries === undefined ? {} : {revealedEntries}), ...(p.generation === undefined ? {} : {generation: p.generation as number}) }
}

export function parseLineupCommand(input: unknown): LineupCommand | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null
  const c = input as Record<string, unknown>
  if (!validInteger(c.expectedRevision)) return null
  if (c.type === 'undo') return { type: 'undo', expectedRevision: c.expectedRevision }
  if (c.type === 'start-show' && c.confirmed === true && validParties(c.partyIds) && c.partyIds.length && validIds(c.carryEntryIds ?? [], LINEUP_MAX_ENTRIES))
    return {type: 'start-show', partyIds: [...c.partyIds].sort(), carryEntryIds: [...(c.carryEntryIds as string[] | undefined ?? [])], confirmed: true, expectedRevision: c.expectedRevision}
  if (c.type === 'filter-parties' && validParties(c.excludedPartyIds))
    return {type: 'filter-parties', excludedPartyIds: [...c.excludedPartyIds].sort(), expectedRevision: c.expectedRevision}
  if (!validId(c.entryId)) return null
  if (c.type === 'move' && (c.beforeEntryId === null || validId(c.beforeEntryId)))
    return { type: c.type, entryId: c.entryId, beforeEntryId: c.beforeEntryId as string | null, expectedRevision: c.expectedRevision }
  if (c.type === 'hold' || c.type === 'return' || c.type === 'reveal-next')
    return { type: c.type, entryId: c.entryId, expectedRevision: c.expectedRevision }
  return null
}

/** Only call after authenticated owner/device authorization. Epoch is server-issued, never a client takeover request. */
export function claimPublisher(state: LineupState, publisherId: string, expectedRevision: number, now: number,
  options: { claimId: string; takeover?: boolean; generation?: number; capabilities?: 'lineup-2.0.5' }): LineupResult {
  if (!validTime(now) || now + LINEUP_LEASE_MS > 8_640_000_000_000_000) return fail('invalid_time')
  if (clockRegressed(state, now)) return fail('invalid_time')
  if (!validId(publisherId) || !isClaimId(options?.claimId)) return fail('invalid_payload')
  if (!validInteger(options.generation ?? 0) || (options.generation ?? 0) !== (state.show?.generation ?? 0)) return fail('show_changed')
  // Same-attempt replay must not reset sequence, epoch, lease, health, or revision.
  // Service additionally validates this receipt atomically against current token authorization.
  if (state.publisher?.id === publisherId && state.publisher.claimId === options.claimId)
    return state.publisher.capabilities !== options.capabilities ? fail('publisher_conflict')
      : Date.parse(state.publisher.leaseExpiresAt) > now ? { ok: true, state } : fail('lease_expired')
  if (state.revision !== expectedRevision) return fail('revision_conflict')
  if (state.publisher && Date.parse(state.publisher.leaseExpiresAt) > now && !options.takeover)
    return fail('publisher_conflict')
  const epoch = (state.publisher?.epoch ?? 0) + 1
  if (!validInteger(epoch) || !validInteger(state.revision + 1)) return fail('capacity_exceeded')
  return { ok: true, state: { ...state, revision: state.revision + 1, parserState: 'loading', lastReceivedAt: null,
    sourceObservation: null, lastReadyObservation: null, retiredDocumentIds: [], revealEvents: [],
    entries: state.entries.map(plainEntry), restorations: state.restorations?.map(item => ({...item, entry: plainEntry(item.entry)})) ?? [],
    sourceVersion: null, publisher: { id: publisherId, claimId: options.claimId, epoch, lastSequence: -1, leaseExpiresAt: new Date(now + LINEUP_LEASE_MS).toISOString(),
      ...(options.capabilities ? {capabilities: options.capabilities} : {}) } } }
}

/** Every accepted packet is a heartbeat, even if unchanged. Clock comes exclusively from the receiving server. */
export function applySourcePacket(state: LineupState, input: unknown, now: number): LineupResult {
  if (!validTime(now) || now + LINEUP_LEASE_MS > 8_640_000_000_000_000) return fail('invalid_time')
  const packet = parseSourcePacket(input)
  if (!packet) return fail('invalid_payload')
  if ((packet.generation ?? 0) !== (state.show?.generation ?? 0)) return fail('show_changed')
  if (state.show && [...packet.entries.map(e => e.id), ...packet.revealedIds]
    .some(id => !id.includes(':') || !state.show!.partyIds.includes(entryParty(id)))) return fail('invalid_scope')
  if (state.show && packet.parserState === 'ready') {
    if (packet.entries.some(e => e.orderedAt === null && !state.show!.carryEntryIds.includes(e.id))) return fail('invalid_scope')
    if (packet.revealedIds.length && (!packet.revealedEntries || packet.revealedEntries.some(e => e.orderedAt === null && !state.show!.carryEntryIds.includes(e.id)))) return fail('invalid_scope')
  }
  const lease = state.publisher
  if (!lease || lease.id !== packet.publisherId || lease.epoch !== packet.epoch) return fail('publisher_conflict')
  const upgraded = lease.capabilities === 'lineup-2.0.5'
  if (packet.claimId !== undefined && packet.claimId !== lease.claimId || upgraded && packet.claimId !== lease.claimId) return fail('publisher_conflict')
  if (Date.parse(lease.leaseExpiresAt) <= now) return fail('lease_expired')
  if (packet.sequence <= lease.lastSequence) return fail('stale_sequence')
  const observation: AcceptedObservation | null = packet.observation ? {...packet.observation, epoch: packet.epoch, generation: packet.generation ?? 0} : null
  if (upgraded && !observation) return fail('stale_observation')
  if (observation && (Date.parse(observation.serverTime) > now || now - Date.parse(observation.serverTime) > LINEUP_OBSERVATION_MAX_AGE_MS
    || packet.parserState === 'ready' && !observation.settled)) return fail('stale_observation')
  const priorObservation = state.sourceObservation
  if (observation && priorObservation && priorObservation.epoch === packet.epoch) {
    if (state.retiredDocumentIds?.includes(observation.documentId)
      || observation.documentId === priorObservation.documentId && observation.serial <= priorObservation.serial
      || Date.parse(observation.serverTime) < Date.parse(priorObservation.serverTime)) return fail('stale_observation')
  }
  if (!validInteger(state.revision + 1)) return fail('capacity_exceeded')
  // A server clock reversal is never allowed to regress receipt time or extend stale content ordering.
  if (clockRegressed(state, now)) return fail('invalid_time')
  const receivedAt = new Date(now).toISOString()
  const documentChanged = !!(observation && priorObservation && observation.documentId !== priorObservation.documentId)
  const retiredDocumentIds = [...(state.retiredDocumentIds ?? []), ...(documentChanged ? [priorObservation!.documentId] : [])]
  if (retiredDocumentIds.length > 32) return fail('capacity_exceeded')
  const next: LineupState = { ...state, revision: state.revision + 1, lastReceivedAt: receivedAt,
    parserState: packet.parserState, sourceVersion: packet.sourceVersion,
    sourceObservation: observation, retiredDocumentIds,
    publisher: { ...lease, lastSequence: packet.sequence, leaseExpiresAt: new Date(packet.parserState === 'ready'
      ? now + LINEUP_LEASE_MS : Math.min(Date.parse(lease.leaseExpiresAt), now + LINEUP_OBSERVATION_MAX_AGE_MS)).toISOString() } }
  // Old publishers cannot revive cached identities on rows absent from their next snapshot.
  if (!upgraded || documentChanged) {
    next.entries = state.entries.map(plainEntry)
    next.restorations = state.restorations?.map(item => ({...item, entry: plainEntry(item.entry)})) ?? []
    next.revealEvents = []
  }
  if (packet.parserState !== 'ready') return { ok: true, state: next }
  next.lastReadyAt = receivedAt
  next.lastReadySourceAt = observation?.serverTime ?? receivedAt
  next.lastReadyObservation = observation
  if (state.show) next.bootstrapPending = false

  // A newly started show is empty by default. Older orders may still be visible in BP;
  // they are not implicitly imported into the new show when its publisher reconnects.
  const currentShowOrder = (e: Pick<SourceEntry, 'id' | 'orderedAt'>) => !state.show || state.show.carryEntryIds.includes(e.id)
    || e.orderedAt !== null && e.orderedAt >= Date.parse(state.show.startedAt)
  const incomingEntries = packet.entries.filter(currentShowOrder)
  const incomingRevealed = state.show ? (packet.revealedEntries ?? []).filter(currentShowOrder).map(e => e.id) : packet.revealedIds
  const revealed = new Set([...state.revealedIds, ...incomingRevealed])
  const restorations = new Map((next.restorations ?? []).map(item => [item.entry.id, {...item}]))
  const publicBefore = state.show && !state.bootstrapPending ? state.order.filter(id => !state.show?.excludedPartyIds.includes(entryParty(id))) : []
  const oldEntries = new Map(state.entries.map(entry => [entry.id, entry]))
  const displayIdentityPart = (value: string) => value.trim().replace(/\s+/gu, ' ').normalize('NFC')
  const sameIdentity = (a: SourceEntry | undefined, b: SourceEntry | undefined) => !!a?.identityEligible && !!b?.identityEligible
    && !!a.lastName && !!b.lastName && displayIdentityPart(a.name) === displayIdentityPart(b.name)
    && displayIdentityPart(a.lastName) === displayIdentityPart(b.lastName)
  const groups = new Map<string, string[]>()
  let group: string[] = []
  for (const id of publicBefore) {
    if (!group.length || !sameIdentity(oldEntries.get(group[0]), oldEntries.get(id))) group = []
    group.push(id); groups.set(id, group)
  }
  let cursor = state.revealEventCursor ?? 0
  const baseline = state.lastReadyObservation ?? state.sourceObservation
  const sameReadyBaseline = !!(observation && baseline?.settled && baseline.documentId === observation.documentId
    && baseline.epoch === observation.epoch && baseline.generation === observation.generation)
  const events = upgraded && !documentChanged ? [...(state.revealEvents ?? [])] : []
  for (const id of incomingRevealed) {
    const entry = oldEntries.get(id)
    if (upgraded && observation?.settled && state.show) {
      if (entry) {
        const category = state.held.includes(id) ? 'held' : 'order'
        const arrangement = state[category], position = arrangement.indexOf(id)
        restorations.set(id, {entry: {...entry}, category, position, previousId: arrangement[position - 1] ?? null,
          nextId: arrangement[position + 1] ?? null, checked: observation})
        // Only previously visible waiting -> checked is a public reveal event.
        if (sameReadyBaseline && publicBefore.includes(id)) {
          if (!validInteger(++cursor)) return fail('capacity_exceeded')
          events.push({cursor, entryId: id, at: receivedAt, groupEntryIds: groups.get(id) ?? [id]})
        }
      } else if (restorations.has(id)) {
        // A replacement source must explicitly observe checked before a later unchecked
        // observation can gain restoration authority in that document/epoch.
        const previous = restorations.get(id)!
        restorations.set(id, {...previous, checked: observation})
      }
    }
  }
  const restored: RevealRestoration[] = []
  for (const entry of incomingEntries) {
    const previous = restorations.get(entry.id)
    if (upgraded && observation?.settled && previous && previous.checked.epoch === observation.epoch
      && previous.checked.generation === observation.generation && previous.checked.documentId === observation.documentId
      && previous.checked.serial < observation.serial) {
      revealed.delete(entry.id); restored.push(previous); restorations.delete(entry.id)
    }
  }
  if (revealed.size > LINEUP_MAX_REVEALED || restorations.size > LINEUP_MAX_REVEALED) return fail('capacity_exceeded')
  const byId = new Map(next.entries.filter(e => !revealed.has(e.id)).map(e => [e.id, { ...e }]))
  for (const entry of incomingEntries) if (!revealed.has(entry.id)) {
    const lastName = upgraded && observation?.settled ? optionalSurname(entry.lastName) : undefined
    const previous = oldEntries.get(entry.id)
    const sourceIdentityVersion = previous?.identityEligible && previous.name === entry.name && previous.lastName === lastName
      && previous.sourceIdentityVersion?.startsWith(`${observation?.epoch}:${observation?.documentId}:`) ? previous.sourceIdentityVersion
      : `${observation?.epoch}:${observation?.documentId}:${observation?.serial}`
    byId.set(entry.id, {...plainEntry(entry), ...(lastName ? {lastName, identityEligible: true, sourceIdentityVersion} : {})})
  }
  if (byId.size > LINEUP_MAX_ENTRIES) return fail('capacity_exceeded')
  const existingIds = new Set([...state.order, ...state.held, ...restored.map(item => item.entry.id)])
  const incomingIds = [...byId.values()].filter(e => !existingIds.has(e.id))
    .sort((a, b) => (a.orderedAt ?? Number.MAX_SAFE_INTEGER) - (b.orderedAt ?? Number.MAX_SAFE_INTEGER) || a.id.localeCompare(b.id))
    .map(e => e.id)
  next.entries = [...byId.values()]
  next.order = [...state.order.filter(id => byId.has(id)), ...incomingIds]
  next.held = state.held.filter(id => byId.has(id))
  // Deterministic batch insertion preserves the relative order of surviving rows.
  // Current show exclusions are intentionally never read from restoration metadata.
  next.restorationNotice = null
  restored.sort((a, b) => a.category.localeCompare(b.category) || a.position - b.position || a.entry.id.localeCompare(b.entry.id))
  const restoredById = new Map(restored.map(item => [item.entry.id, item]))
  const anchor = (id: string | null, field: 'nextId' | 'previousId', category: 'order' | 'held', arrangement: string[]) => {
    const visited = new Set<string>()
    while (id !== null && !visited.has(id)) {
      if (arrangement.includes(id)) return arrangement.indexOf(id)
      visited.add(id)
      const pending = restoredById.get(id)
      if (!pending || pending.category !== category) break
      id = pending[field]
    }
    return -1
  }
  for (const item of restored) {
    const arrangement = next[item.category]
    const before = anchor(item.nextId, 'nextId', item.category, arrangement)
    const after = anchor(item.previousId, 'previousId', item.category, arrangement)
    if (before >= 0) arrangement.splice(before, 0, item.entry.id)
    else if (after >= 0) arrangement.splice(after + 1, 0, item.entry.id)
    else { arrangement.push(item.entry.id); next.restorationNotice = 'Restored orders without surviving anchors were placed at the end of their previous list.' }
  }
  next.revealedIds = [...revealed]
  next.restorations = [...restorations.values()]
  next.revealEventCursor = cursor
  next.revealEvents = events.filter(event => revealed.has(event.entryId)
    && !state.show?.excludedPartyIds.includes(entryParty(event.entryId)) && now - Date.parse(event.at) <= LINEUP_FRESH_MS).slice(-LINEUP_MAX_EVENTS)
  // Keep a bounded recent event history, never truncate a group's membership.
  // Consumers advance across cursor gaps without inventing missed effects.
  let memberCount = next.revealEvents.reduce((count, event) => count + event.groupEntryIds.length, 0)
  while (memberCount > LINEUP_MAX_EVENT_MEMBERS) memberCount -= next.revealEvents.shift()!.groupEntryIds.length
  if (JSON.stringify([next.entries, next.order, next.held]) !== JSON.stringify([state.entries, state.order, state.held]))
    next.lastChangedAt = receivedAt
  if (!stateFits(next) || !isLineupState(next)) return fail('capacity_exceeded')
  return { ok: true, state: next }
}

export function applyLineupCommand(state: LineupState, input: unknown, now: number): LineupResult {
  if (!validTime(now)) return fail('invalid_time')
  if (clockRegressed(state, now)) return fail('invalid_time')
  const command = parseLineupCommand(input)
  if (!command) return fail('invalid_payload')
  if (command.expectedRevision !== state.revision) return fail('revision_conflict')
  if (!validInteger(state.revision + 1)) return fail('capacity_exceeded')
  if (!['start-show', 'filter-parties'].includes(command.type) && !lineupFreshness(state, now).fresh) return fail('source_not_ready')
  let order = [...state.order]
  let held = [...state.held]
  if (command.type === 'start-show') {
    if (!state.publisher || !state.lastReadyAt) return fail('invalid_scope')
    const generation = (state.show?.generation ?? 0) + 1
    if (!validInteger(generation)) return fail('capacity_exceeded')
    const carry = new Set(command.carryEntryIds)
    if (command.carryEntryIds.some(id => !state.entries.some(e => e.id === id) || !id.includes(':') || !command.partyIds.includes(entryParty(id)))) return fail('invalid_scope')
    // The service must persist this transition through the atomic archive-and-CAS function.
    // Old claim attempts and in-flight packets remain generation-fenced even after lease expiry.
    return {ok: true, state: {...state, revision: state.revision + 1,
      show: {generation, partyIds: command.partyIds, excludedPartyIds: [], carryEntryIds: command.carryEntryIds, startedAt: new Date(now).toISOString()},
      entries: state.entries.filter(e => carry.has(e.id)).map(plainEntry), order: state.order.filter(id => carry.has(id)), held: state.held.filter(id => carry.has(id)), revealedIds: [], undo: null, lastReceivedAt: null,
      sourceObservation: null, lastReadyObservation: null, retiredDocumentIds: [], restorations: [], revealEvents: [], revealEventCursor: 0,
      lastChangedAt: new Date(now).toISOString(), parserState: 'loading', sourceVersion: null,
      publisher: {...state.publisher, lastSequence: -1, leaseExpiresAt: new Date(now).toISOString()}}}
  }
  if (command.type === 'filter-parties') {
    if (!state.show || command.excludedPartyIds.some(id => !state.show!.partyIds.includes(id))) return fail('invalid_scope')
    return {ok: true, state: {...state, revision: state.revision + 1,
      revealEvents: state.revealEvents?.filter(event => !command.excludedPartyIds.includes(entryParty(event.entryId))) ?? [],
      show: {...state.show, excludedPartyIds: command.excludedPartyIds}, lastChangedAt: new Date(now).toISOString()}}
  }
  if (command.type === 'undo') {
    if (!state.undo) return fail('nothing_to_undo')
    const current = new Set(state.entries.map(e => e.id))
    const previous = new Set([...state.undo.order, ...state.undo.held])
    // Replay only arrangement of surviving IDs, preserving post-command arrivals and their current placement category.
    order = [...state.undo.order.filter(id => current.has(id)), ...order.filter(id => !previous.has(id))]
    held = [...state.undo.held.filter(id => current.has(id)), ...held.filter(id => !previous.has(id))]
  } else {
    if (!state.entries.some(e => e.id === command.entryId)) return fail('entry_not_found')
    if (command.type === 'move') {
      if (!order.includes(command.entryId) || command.beforeEntryId === command.entryId
        || (command.beforeEntryId !== null && !order.includes(command.beforeEntryId))) return fail('invalid_move')
      order = order.filter(id => id !== command.entryId)
      order.splice(command.beforeEntryId === null ? order.length : order.indexOf(command.beforeEntryId), 0, command.entryId)
    } else if (command.type === 'hold') {
      if (!order.includes(command.entryId)) return fail('invalid_move')
      order = order.filter(id => id !== command.entryId)
      held.push(command.entryId)
    } else if (command.type === 'return') {
      if (!held.includes(command.entryId)) return fail('invalid_move')
      held = held.filter(id => id !== command.entryId)
      order.push(command.entryId)
    } else {
      order = order.filter(id => id !== command.entryId)
      held = held.filter(id => id !== command.entryId)
      order.unshift(command.entryId)
    }
  }
  return { ok: true, state: { ...state, revision: state.revision + 1, order, held,
    lastChangedAt: new Date(now).toISOString(), undo: command.type === 'undo' ? null : { order: [...state.order], held: [...state.held] } } }
}

export function buildWorkspaceLineupSnapshot(state: LineupState, now: number, authorized = false): WorkspaceLineupSnapshot {
  const received = state.lastReceivedAt ? Date.parse(state.lastReceivedAt) : NaN
  const age = now - received
  const clockInvalid = !Number.isFinite(age) || age < 0 || !validTime(now)
  const leaseExpired = state.publisher !== null
    && Date.parse(state.publisher.leaseExpiresAt) <= now
  let connection: WorkspaceLineupSnapshot['connection'] = 'connecting'
  if (state.lastReceivedAt) connection = clockInvalid || leaseExpired || age >= LINEUP_OFFLINE_MS ? 'offline'
    : state.parserState !== 'ready' || age > LINEUP_FRESH_MS ? 'delayed' : 'connected'
  else if (leaseExpired) connection = 'offline'
  const freshness = lineupFreshness(state, now)
  if (connection === 'connected' && !freshness.fresh) connection = 'delayed'
  const canManage = authorized && connection === 'connected'
  const entries = new Map(state.entries.map(e => [e.id, e]))
  const project = (ids: string[], held: boolean, includeHidden = false) => ids.filter(id => includeHidden || !state.show?.excludedPartyIds.includes(entryParty(id))).flatMap((id, index) => {
    const entry = entries.get(id)
    return entry ? [{ id, name: entry.name, position: index + 1, held,
      ...(entry.lastName ? {lastName: entry.lastName} : {}), ...(entry.identityEligible ? {identityEligible: true, sourceIdentityVersion: entry.sourceIdentityVersion} : {}) }] : []
  })
  return { ...(authorized ? {management: {generation: state.show?.generation ?? 0,
    partyIds: state.show?.partyIds ?? [...new Set(state.entries.filter(e => e.id.includes(':')).map(e => entryParty(e.id)))].sort(),
    excludedPartyIds: state.show?.excludedPartyIds ?? [], candidates: [...project(state.order, false, true), ...project(state.held, true, true)]}} : {}),
    revision: state.revision, connection, lastReceivedAt: state.lastReceivedAt, lastChangedAt: state.lastChangedAt,
    sourceVersion: state.sourceVersion, canManage, entries: project(state.order, false), heldEntries: project(state.held, true),
    authorized, canRecover: authorized && state.lastReadyAt !== null, serverTime: new Date(now).toISOString(),
    freshUntil: freshness.freshUntil, freshForMs: freshness.freshForMs,
    undoAvailable: authorized && state.undo !== null,
    warning: connection === 'connected' ? state.restorationNotice ?? null : connection === 'connecting' ? 'Waiting for the selected publisher.'
      : connection === 'offline' ? 'Publisher is offline. The last known lineup is retained.'
        : state.parserState !== 'ready' ? 'Source is not ready. The last known lineup is retained.' : 'Updates are delayed. The last known lineup is retained.' }
}
