import type { WorkspaceLineupSnapshot } from '@/lib/live-lineup/types'

export type WorkspaceLineupCommand =
  | { type: 'move'; entryId: string; beforeEntryId: string | null }
  | { type: 'hold' | 'return' | 'reveal-next'; entryId: string }
  | { type: 'undo' }
  | { type: 'start-show'; partyIds: string[]; carryEntryIds: string[]; confirmed: true }
  | { type: 'filter-parties'; excludedPartyIds: string[] }

export interface LineupPublisher {
  id: string
  label: string
  createdAt: string
  expiresAt: string
  revokedAt: string | null
  active: boolean
}

export function isLineupPublisher(value: unknown): value is LineupPublisher {
  if (!value || typeof value !== 'object') return false
  const p = value as LineupPublisher
  return typeof p.id === 'string' && /^[0-9a-f-]{36}$/i.test(p.id)
    && typeof p.label === 'string' && p.label.trim().length > 0 && p.label.length <= 80
    && typeof p.createdAt === 'string' && Number.isFinite(Date.parse(p.createdAt))
    && typeof p.expiresAt === 'string' && Number.isFinite(Date.parse(p.expiresAt))
    && (p.revokedAt === null || (typeof p.revokedAt === 'string' && Number.isFinite(Date.parse(p.revokedAt))))
    && typeof p.active === 'boolean'
}

export function isPublisherList(value: unknown): value is { publishers: LineupPublisher[] } {
  if (!value || typeof value !== 'object') return false
  const list = (value as { publishers?: unknown }).publishers
  return Array.isArray(list) && list.length <= 100 && list.every(isLineupPublisher)
    && new Set(list.map(p => p.id)).size === list.length
}

export function isIssuedPublisher(value: unknown): value is { publisher: LineupPublisher; token: string } {
  if (!value || typeof value !== 'object') return false
  const p = value as { publisher?: unknown; token?: unknown }
  return isLineupPublisher(p.publisher) && typeof p.token === 'string' && /^sslp_[A-Za-z0-9_-]{43}$/.test(p.token)
}

/** Reject malformed responses before they replace a usable on-screen lineup. */
export function isWorkspaceLineupSnapshot(value: unknown): value is WorkspaceLineupSnapshot {
  if (!value || typeof value !== 'object') return false
  const v = value as WorkspaceLineupSnapshot
  if (v.management !== undefined) {
    const m = v.management
    const parties = (x: unknown): x is string[] => Array.isArray(x) && x.length <= 100 && new Set(x).size === x.length && x.every(id => typeof id === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,60}$/.test(id))
    if (!m || !Number.isSafeInteger(m.generation) || m.generation < 0 || !parties(m.partyIds) || !parties(m.excludedPartyIds)
      || m.excludedPartyIds.some(id => !m.partyIds.includes(id)) || !Array.isArray(m.candidates) || m.candidates.length > 2000
      || new Set(m.candidates.map(e => e?.id)).size !== m.candidates.length
      || m.candidates.some(e => !e || typeof e.id !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9:_-]{0,127}$/.test(e.id)
        || typeof e.name !== 'string' || !e.name.trim() || e.name.length > 100 || typeof e.held !== 'boolean' || !Number.isSafeInteger(e.position) || e.position < 1)) return false
  }
  const timestamp = (x: unknown) => x === null || (typeof x === 'string' && Number.isFinite(Date.parse(x)))
  if (!Number.isSafeInteger(v.revision) || v.revision < 0 ||
      !['connecting', 'connected', 'delayed', 'offline'].includes(v.connection) ||
      !timestamp(v.lastReceivedAt) || !timestamp(v.lastChangedAt) ||
      !(v.sourceVersion === null || typeof v.sourceVersion === 'string') ||
      typeof v.canManage !== 'boolean' || typeof v.undoAvailable !== 'boolean' ||
      !(v.warning === null || typeof v.warning === 'string') ||
      !Array.isArray(v.entries) || !Array.isArray(v.heldEntries) || v.entries.length + v.heldEntries.length > 2000) return false
  const ids = new Set<string>()
  return [...v.entries, ...v.heldEntries].every((entry) => {
    if (!entry || typeof entry.id !== 'string' || !entry.id || ids.has(entry.id) ||
        typeof entry.name !== 'string' || !entry.name.trim() || entry.name.length > 100 ||
        !Number.isSafeInteger(entry.position) || entry.position < 1 || typeof entry.held !== 'boolean') return false
    ids.add(entry.id)
    return true
  }) && v.entries.every((entry, index) => !entry.held && entry.position === index + 1)
    && v.heldEntries.every((entry, index) => entry.held && entry.position === index + 1)
}

export function moveCommand(entries: WorkspaceLineupSnapshot['entries'], index: number, direction: -1 | 1): WorkspaceLineupCommand | null {
  if (index < 0 || index >= entries.length || index + direction < 0 || index + direction >= entries.length) return null
  return { type: 'move', entryId: entries[index].id, beforeEntryId: direction < 0 ? entries[index - 1].id : entries[index + 2]?.id ?? null }
}

/** Pointer capture has no native HTML drag dependency; midpoint anchors use stable order identities. */
export function pointerDropAnchor(rows: { id: string; top: number; bottom: number }[], draggedId: string, pointerY: number): string | null {
  let low = 0
  let high = rows.length
  while (low < high) {
    const mid = (low + high) >>> 1
    if (pointerY < (rows[mid].top + rows[mid].bottom) / 2) high = mid
    else low = mid + 1
  }
  if (rows[low]?.id === draggedId) low++
  return rows[low]?.id ?? null
}

/** Retry a heartbeat-only conflict, never a changed arrangement or source transition. */
export function canRebaseDrag(before: WorkspaceLineupSnapshot, next: WorkspaceLineupSnapshot): boolean {
  const same = (a: WorkspaceLineupSnapshot['entries'], b: WorkspaceLineupSnapshot['entries']) => a.length === b.length
    && a.every((entry, index) => entry.id === b[index].id && entry.name === b[index].name)
  return before.canManage && next.canManage && next.revision > before.revision
    && before.sourceVersion === next.sourceVersion && before.lastChangedAt === next.lastChangedAt
    && before.undoAvailable === next.undoAvailable && same(before.entries, next.entries) && same(before.heldEntries, next.heldEntries)
}

/** Pixels per second, independent of the display refresh rate. */
export function edgeScrollSpeed(pointerY: number, top: number, bottom: number): number {
  const edge = Math.min(48, (bottom - top) / 4)
  if (pointerY < top || pointerY > bottom || edge <= 0) return 0
  if (pointerY < top + edge) return -Math.ceil(600 * (1 - (pointerY - top) / edge))
  if (pointerY > bottom - edge) return Math.ceil(600 * (1 - (bottom - pointerY) / edge))
  return 0
}

export function dragScrollDelta(pixelsPerSecond: number, elapsedMs: number): number {
  return pixelsPerSecond * Math.min(50, Math.max(0, elapsedMs)) / 1000
}

/** A preview may survive pure heartbeats, never arrivals or changed names/order/holds/scope. */
export function canConfirmShow(before: WorkspaceLineupSnapshot, next: WorkspaceLineupSnapshot): boolean {
  return before.canManage && next.canManage && !!before.management && !!next.management && next.revision >= before.revision
    && before.lastChangedAt === next.lastChangedAt && before.sourceVersion === next.sourceVersion
    && JSON.stringify(before.management) === JSON.stringify(next.management)
}

/** A visibility toggle is limited to parties already selected for this explicit show. */
export function partyVisibilityCommand(snapshot: WorkspaceLineupSnapshot, partyId: string, visible: boolean): Extract<WorkspaceLineupCommand, {type: 'filter-parties'}> | null {
  const management = snapshot.management
  if (!snapshot.canManage || !management || management.generation < 1 || !management.partyIds.includes(partyId)) return null
  const hidden = management.excludedPartyIds.includes(partyId)
  if (visible === !hidden) return null
  const excludedPartyIds = visible ? management.excludedPartyIds.filter(id => id !== partyId)
    : [...management.excludedPartyIds, partyId].sort()
  return {type: 'filter-parties', excludedPartyIds}
}

/** A higher revision alone is not proof that the requested reversible filter was saved. */
export function isPartyVisibilityAcknowledgement(before: WorkspaceLineupSnapshot, next: WorkspaceLineupSnapshot,
  command: Extract<WorkspaceLineupCommand, {type: 'filter-parties'}>): boolean {
  const previous = before.management, current = next.management
  const sameEntries = (a: WorkspaceLineupSnapshot['entries'], b: WorkspaceLineupSnapshot['entries']) => a.length === b.length
    && a.every((entry, index) => entry.id === b[index].id && entry.name === b[index].name && entry.position === b[index].position && entry.held === b[index].held)
  if (!before.canManage || !previous || !current || !next.canManage || previous.generation < 1 || current.generation !== previous.generation
    || next.revision <= before.revision || next.undoAvailable !== before.undoAvailable
    || JSON.stringify(current.partyIds) !== JSON.stringify(previous.partyIds)
    || JSON.stringify([...current.excludedPartyIds].sort()) !== JSON.stringify([...command.excludedPartyIds].sort())
    || !sameEntries(previous.candidates, current.candidates)) return false
  const visible = current.candidates.filter(entry => !current.excludedPartyIds.includes(entry.id.split(':')[0]))
  const project = (held: boolean) => visible.filter(entry => entry.held === held).map((entry, index) => ({...entry, position: index + 1}))
  return sameEntries(project(false), next.entries) && sameEntries(project(true), next.heldEntries)
}

const sameLineupEntries = (a: WorkspaceLineupSnapshot['entries'], b: WorkspaceLineupSnapshot['entries']) =>
  a.length === b.length && a.every((entry, index) => {
    const other = b[index]
    return !!other && entry.id === other.id && entry.name === other.name
      && entry.position === other.position && entry.held === other.held
  })

/**
 * Health labels may age while the durable lineup revision stays the same.
 * Everything else shown to the rep must remain identical at that revision.
 */
export function canAcceptWorkspaceRefresh(
  before: WorkspaceLineupSnapshot,
  next: WorkspaceLineupSnapshot,
): boolean {
  if (next.revision < before.revision) return false
  if (next.revision > before.revision) return true
  return before.canManage === next.canManage
    && before.lastReceivedAt === next.lastReceivedAt
    && before.lastChangedAt === next.lastChangedAt
    && before.sourceVersion === next.sourceVersion
    && before.undoAvailable === next.undoAvailable
    && sameLineupEntries(before.entries, next.entries)
    && sameLineupEntries(before.heldEntries, next.heldEntries)
    && JSON.stringify(before.management) === JSON.stringify(next.management)
}

function positioned(entries: WorkspaceLineupSnapshot['entries'], held: boolean) {
  return entries.map((entry, index) => ({ ...entry, position: index + 1, held }))
}

function candidateArrangement(snapshot: WorkspaceLineupSnapshot) {
  const candidates = snapshot.management?.candidates ?? []
  return {
    order: positioned(candidates.filter(entry => !entry.held), false),
    held: positioned(candidates.filter(entry => entry.held), true),
  }
}

function visibleArrangement(
  arrangement: ReturnType<typeof candidateArrangement>,
  excludedPartyIds: string[],
) {
  const visible = (entry: WorkspaceLineupSnapshot['entries'][number]) =>
    !excludedPartyIds.includes(entry.id.split(':')[0])
  return {
    order: positioned(arrangement.order.filter(visible), false),
    held: positioned(arrangement.held.filter(visible), true),
  }
}

/**
 * A higher revision is only transport evidence. Confirm the requested owner
 * transition itself before telling the rep it was saved.
 */
export function isLineupCommandAcknowledgement(
  before: WorkspaceLineupSnapshot,
  next: WorkspaceLineupSnapshot,
  command: WorkspaceLineupCommand,
): boolean {
  if (!before.canManage || !next.canManage || !before.management || !next.management
    || next.revision <= before.revision) return false
  if (command.type === 'filter-parties') return isPartyVisibilityAcknowledgement(before, next, command)

  const prior = candidateArrangement(before)
  let expected = { order: positioned(prior.order, false), held: positioned(prior.held, true) }
  let generation = before.management.generation
  let partyIds = [...before.management.partyIds]
  let excludedPartyIds = [...before.management.excludedPartyIds]
  let undoAvailable = true
  let lastReceivedAt = before.lastReceivedAt
  let sourceVersion = before.sourceVersion

  if (command.type === 'start-show') {
    const carry = new Set(command.carryEntryIds)
    expected = {
      order: positioned(prior.order.filter(entry => carry.has(entry.id)), false),
      held: positioned(prior.held.filter(entry => carry.has(entry.id)), true),
    }
    generation += 1
    partyIds = [...command.partyIds].sort()
    excludedPartyIds = []
    undoAvailable = false
    lastReceivedAt = null
    sourceVersion = null
  } else if (command.type === 'undo') {
    // The previous arrangement is intentionally not serialized to the client.
    // Still require the same identities/names, unchanged show/source scope,
    // a self-consistent projection, and consumption of the one-step undo.
    expected = candidateArrangement(next)
    const priorIdentities = [...prior.order, ...prior.held]
      .map(entry => `${entry.id}\u0000${entry.name}`).sort()
    const nextIdentities = [...expected.order, ...expected.held]
      .map(entry => `${entry.id}\u0000${entry.name}`).sort()
    if (JSON.stringify(priorIdentities) !== JSON.stringify(nextIdentities)) return false
    undoAvailable = false
  } else {
    const activeIndex = expected.order.findIndex(entry => entry.id === command.entryId)
    const heldIndex = expected.held.findIndex(entry => entry.id === command.entryId)
    if (activeIndex < 0 && heldIndex < 0) return false
    if (command.type === 'move') {
      if (activeIndex < 0 || command.beforeEntryId === command.entryId) return false
      const [entry] = expected.order.splice(activeIndex, 1)
      const destination = command.beforeEntryId === null
        ? expected.order.length
        : expected.order.findIndex(candidate => candidate.id === command.beforeEntryId)
      if (destination < 0) return false
      expected.order.splice(destination, 0, entry)
    } else if (command.type === 'hold') {
      if (activeIndex < 0) return false
      expected.held.push(expected.order.splice(activeIndex, 1)[0])
    } else if (command.type === 'return') {
      if (heldIndex < 0) return false
      expected.order.push(expected.held.splice(heldIndex, 1)[0])
    } else {
      const entry = activeIndex >= 0
        ? expected.order.splice(activeIndex, 1)[0]
        : expected.held.splice(heldIndex, 1)[0]
      expected.order.unshift(entry)
    }
    expected = { order: positioned(expected.order, false), held: positioned(expected.held, true) }
  }

  if (next.management.generation !== generation
    || JSON.stringify(next.management.partyIds) !== JSON.stringify(partyIds)
    || JSON.stringify(next.management.excludedPartyIds) !== JSON.stringify(excludedPartyIds)
    || next.undoAvailable !== undoAvailable
    || next.lastReceivedAt !== lastReceivedAt || next.sourceVersion !== sourceVersion) return false

  const candidates = [...expected.order, ...expected.held]
  if (!sameLineupEntries(next.management.candidates, candidates)) return false
  const visible = visibleArrangement(expected, excludedPartyIds)
  return sameLineupEntries(next.entries, visible.order) && sameLineupEntries(next.heldEntries, visible.held)
}
