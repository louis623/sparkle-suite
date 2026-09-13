import { describe, expect, it } from 'vitest'
import { applyLineupCommand, applySourcePacket, buildWorkspaceLineupSnapshot, claimPublisher, createLineupState,
  isLineupState, LINEUP_LEASE_MS, LINEUP_MAX_ENTRIES, parseLineupCommand, parseSourcePacket } from '@/lib/live-lineup/model'
import type { LineupResult, LineupState, SourceEntry, SourcePacket } from '@/lib/live-lineup/types'

const T = Date.parse('2026-09-09T12:00:00Z')
const CLAIM_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const CLAIM_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const entry = (id: string, name = 'Jessica', orderedAt: number | null = T): SourceEntry => ({ id, name, orderedAt })
function state(result: LineupResult): LineupState {
  expect(result.ok).toBe(true)
  if (!result.ok) throw new Error(result.code)
  return result.state
}
function publisher() { return state(claimPublisher(createLineupState(), 'device-a', 0, T, { claimId: CLAIM_A })) }
function packet(overrides: Partial<SourcePacket> = {}): SourcePacket {
  return { publisherId: 'device-a', epoch: 1, sequence: 0, sourceVersion: '2.0.0', parserState: 'ready',
    entries: [entry('a'), entry('b'), entry('c')], revealedIds: [], ...overrides }
}
function populated() { return state(applySourcePacket(publisher(), packet(), T + 1)) }
function command(s: LineupState, type: 'hold' | 'return' | 'reveal-next', id: string) {
  return state(applyLineupCommand(s, { expectedRevision: s.revision, type, entryId: id }, T + 10))
}

describe('Live Lineup v2 ordered source / private manual arrangement', () => {
  it('keeps duplicate names as independent stable order IDs and accepts one-character Unicode', () => {
    const s = state(applySourcePacket(publisher(), packet({ entries: [entry('a', '李'), entry('b', 'Jessica'), entry('c', 'Jessica')] }), T))
    expect(s.order).toEqual(['a', 'b', 'c'])
    expect(s.entries.map(e => e.name)).toEqual(['李', 'Jessica', 'Jessica'])
  })
  it('sorts new orders by actual order time and deterministic ID, not DOM position', () => {
    const s = state(applySourcePacket(publisher(), packet({ entries: [entry('c', 'C', T + 3), entry('b', 'B', T + 2), entry('a', 'A', T + 1)] }), T))
    expect(s.order).toEqual(['a', 'b', 'c'])
  })
  it('heartbeats advance server receipt/revision without advancing content timestamp', () => {
    const s = populated()
    const heartbeat = state(applySourcePacket(s, packet({ sequence: 1 }), T + 30_000))
    expect(heartbeat.lastReceivedAt).toBe(new Date(T + 30_000).toISOString())
    expect(heartbeat.lastChangedAt).toBe(s.lastChangedAt)
    expect(heartbeat.lastReadyAt).toBe(heartbeat.lastReceivedAt)
    expect(heartbeat.revision).toBe(s.revision + 1)
    expect(buildWorkspaceLineupSnapshot(heartbeat, T + 30_001).connection).toBe('connected')
  })
  it.each(['loading', 'partial', 'invalid'] as const)('a %s parser heartbeat never destroys known orders or trusts reported removals', parserState => {
    const s = populated()
    const next = state(applySourcePacket(s, packet({ sequence: 1, parserState, entries: [], revealedIds: ['a'] }), T + 20))
    expect(next.entries).toEqual(s.entries)
    expect(next.revealedIds).toEqual([])
    expect(next.lastReadyAt).toBe(s.lastReadyAt)
    expect(buildWorkspaceLineupSnapshot(next, T + 21).connection).toBe('delayed')
  })
  it('does not establish authoritative readiness from a first loading packet', () => {
    const s = state(applySourcePacket(publisher(), packet({ parserState: 'loading', entries: [] }), T + 1))
    expect(s.lastReadyAt).toBeNull()
    expect(s.lastReceivedAt).toBe(new Date(T + 1).toISOString())
  })
  it('publisher claim preserves ready-data age rather than making old entries newly authoritative', () => {
    const s = populated()
    const claimed = state(claimPublisher(s, 'device-b', s.revision, T + 50_000, { takeover: true, claimId: CLAIM_B }))
    expect(claimed.lastReadyAt).toBe(s.lastReadyAt)
    expect(claimed.lastReceivedAt).toBeNull()
    expect(isLineupState(claimed)).toBe(true)
    const loading = state(applySourcePacket(claimed, packet({ publisherId: 'device-b', epoch: 2, parserState: 'loading', entries: [] }), T + 60_000))
    expect(loading.lastReadyAt).toBe(s.lastReadyAt)
    expect(buildWorkspaceLineupSnapshot(loading, T + 60_001).connection).toBe('delayed')
  })
  it('does not infer revelation from missing or filtered-empty rows', () => {
    const s = state(applySourcePacket(populated(), packet({ sequence: 1, entries: [] }), T + 20))
    expect(s.order).toEqual(['a', 'b', 'c'])
  })
  it('explicitly observed revelations remove orders, including held orders', () => {
    const held = command(populated(), 'hold', 'b')
    const s = state(applySourcePacket(held, packet({ sequence: 1, entries: [entry('a')], revealedIds: ['b', 'c'] }), T + 20))
    expect(s.order).toEqual(['a'])
    expect(s.held).toEqual([])
    expect(s.entries.map(e => e.id)).toEqual(['a'])
  })
  it('newer inconsistent source packets cannot resurrect confirmed revealed IDs', () => {
    const cleared = state(applySourcePacket(populated(), packet({ sequence: 1, entries: [], revealedIds: ['a', 'b', 'c'] }), T + 20))
    const s = state(applySourcePacket(cleared, packet({ sequence: 2 }), T + 21))
    expect(s.order).toEqual([])
  })
  it('manual moves and holds survive a reversed snapshot; newly arriving IDs append', () => {
    let s = command(populated(), 'reveal-next', 'c')
    s = command(s, 'hold', 'b')
    s = state(applySourcePacket(s, packet({ sequence: 1, entries: [entry('d', 'D', T - 1), entry('b'), entry('a'), entry('c')] }), T + 20))
    expect(s.order).toEqual(['c', 'a', 'd'])
    expect(s.held).toEqual(['b'])
  })
  it('supports exact drag destination, return to end and reveal-next from held', () => {
    let s = populated()
    s = state(applyLineupCommand(s, { type: 'move', entryId: 'c', beforeEntryId: 'b', expectedRevision: s.revision }, T + 2))
    expect(s.order).toEqual(['a', 'c', 'b'])
    s = command(s, 'hold', 'a')
    s = command(s, 'return', 'a')
    expect(s.order).toEqual(['c', 'b', 'a'])
    s = command(s, 'hold', 'b')
    s = command(s, 'reveal-next', 'b')
    expect(s.order).toEqual(['b', 'c', 'a'])
    expect(s.held).toEqual([])
  })
  it('undo merges surviving arrangement without resurrecting removed entries or losing incoming IDs', () => {
    let s = command(populated(), 'hold', 'b')
    s = state(applySourcePacket(s, packet({ sequence: 1, entries: [entry('b'), entry('c'), entry('d')], revealedIds: ['a'] }), T + 20))
    s = state(applyLineupCommand(s, { type: 'undo', expectedRevision: s.revision }, T + 21))
    expect(s.order).toEqual(['b', 'c', 'd'])
    expect(s.held).toEqual([])
    expect(s.undo).toBeNull()
    expect(applyLineupCommand(s, { type: 'undo', expectedRevision: s.revision }, T + 22)).toEqual({ ok: false, code: 'nothing_to_undo' })
  })
  it('rejects racing command revisions and invalid/held/self drop targets', () => {
    const s = command(populated(), 'hold', 'b')
    expect(applyLineupCommand(s, { type: 'hold', entryId: 'a', expectedRevision: 0 }, T + 11)).toEqual({ ok: false, code: 'revision_conflict' })
    for (const beforeEntryId of ['b', 'a', 'missing'])
      expect(applyLineupCommand(s, { type: 'move', entryId: 'a', beforeEntryId, expectedRevision: s.revision }, T + 11)).toEqual({ ok: false, code: 'invalid_move' })
  })
  it('rejects old/repeated sequence and wrong publisher or epoch without touching health', () => {
    const s = populated()
    for (const p of [packet(), packet({ sequence: 0, entries: [] })])
      expect(applySourcePacket(s, p, T + 3)).toEqual({ ok: false, code: 'stale_sequence' })
    for (const p of [packet({ publisherId: 'device-b', sequence: 5 }), packet({ epoch: 2, sequence: 5 })])
      expect(applySourcePacket(s, p, T + 3)).toEqual({ ok: false, code: 'publisher_conflict' })
    expect(s.lastReceivedAt).toBe(new Date(T + 1).toISOString())
  })
  it('expired leases cannot publish and explicit takeover fences old-device packets', () => {
    const s = populated()
    expect(applySourcePacket(s, packet({ sequence: 1 }), T + LINEUP_LEASE_MS + 1)).toEqual({ ok: false, code: 'lease_expired' })
    expect(claimPublisher(s, 'device-b', s.revision, T + 2, { claimId: CLAIM_B })).toEqual({ ok: false, code: 'publisher_conflict' })
    const taken = state(claimPublisher(s, 'device-b', s.revision, T + 2, { takeover: true, claimId: CLAIM_B }))
    expect(taken.publisher?.epoch).toBe(2)
    expect(taken.order).toEqual(s.order)
    expect(applySourcePacket(taken, packet({ sequence: 99 }), T + 3)).toEqual({ ok: false, code: 'publisher_conflict' })
    expect(state(applySourcePacket(taken, packet({ publisherId: 'device-b', epoch: 2 }), T + 3)).publisher?.lastSequence).toBe(0)
  })
  it('reports delayed/offline honestly and treats backward server time as invalid', () => {
    const s = populated()
    const leaseExpiresAt = Date.parse(s.publisher!.leaseExpiresAt)
    expect(buildWorkspaceLineupSnapshot(s, T + 46_000).connection).toBe('delayed')
    expect(buildWorkspaceLineupSnapshot(s, leaseExpiresAt - 1).connection).toBe('delayed')
    expect(buildWorkspaceLineupSnapshot(s, leaseExpiresAt).connection).toBe('offline')
    expect(buildWorkspaceLineupSnapshot(s, T + 180_001).connection).toBe('offline')
    expect(buildWorkspaceLineupSnapshot(s, T - 1).connection).toBe('offline')
    expect(applySourcePacket(s, packet({ sequence: 1 }), T)).toEqual({ ok: false, code: 'invalid_time' })
    expect(buildWorkspaceLineupSnapshot(createLineupState(), T).connection).toBe('connecting')
  })
  it('all mutation paths fence backward time across both manual changes and publisher receipts', () => {
    const moved = command(populated(), 'reveal-next', 'c')
    expect(applySourcePacket(moved, packet({ sequence: 1 }), T + 9)).toEqual({ ok: false, code: 'invalid_time' })
    expect(claimPublisher(moved, 'device-b', moved.revision, T + 9, { takeover: true, claimId: CLAIM_B })).toEqual({ ok: false, code: 'invalid_time' })
    const heartbeat = state(applySourcePacket(moved, packet({ sequence: 1 }), T + 20))
    expect(applyLineupCommand(heartbeat, { type: 'hold', entryId: 'a', expectedRevision: heartbeat.revision }, T + 19))
      .toEqual({ ok: false, code: 'invalid_time' })
  })
  it('does not accept arbitrary client time fields as receipt/order authority', () => {
    const s = state(applySourcePacket(publisher(), { ...packet(), timestamp: '2099-01-01T00:00:00Z' }, T))
    expect(s.lastReceivedAt).toBe(new Date(T).toISOString())
  })
  it('rejects malformed payloads, duplicate IDs, conflicting revelation and oversized lists', () => {
    const bad = [null, [], {}, packet({ entries: [entry('a'), entry('a')] }), packet({ entries: [entry('a', '')] }),
      packet({ entries: [entry('__proto__')] }), packet({ revealedIds: ['a'] }), packet({ sequence: Number.MAX_SAFE_INTEGER + 1 }),
      packet({ entries: [entry('a', 'x'.repeat(101))] }), packet({ entries: Array.from({ length: LINEUP_MAX_ENTRIES + 1 }, (_, i) => entry(`a${i}`)) })]
    for (const payload of bad) expect(parseSourcePacket(payload)).toBeNull()
    expect(parseLineupCommand({ type: 'move', entryId: 'a', expectedRevision: 0 })).toBeNull()
  })
  it('rejects cumulative capacity overflow instead of silently truncating names', () => {
    const full = state(applySourcePacket(publisher(), packet({ entries: Array.from({ length: LINEUP_MAX_ENTRIES }, (_, i) => entry(`x${i}`)) }), T))
    expect(applySourcePacket(full, packet({ sequence: 1, entries: [entry('new')] }), T + 1)).toEqual({ ok: false, code: 'capacity_exceeded' })
  })
  it('does not mutate inputs, including frozen arrangements and source entries', () => {
    const s = populated()
    const before = JSON.stringify(s)
    Object.freeze(s.order); Object.freeze(s.held); Object.freeze(s.entries); Object.freeze(s)
    const source = packet({ sequence: 1 })
    Object.freeze(source.entries); Object.freeze(source)
    state(applySourcePacket(s, source, T + 2))
    command(s, 'hold', 'a')
    expect(JSON.stringify(s)).toBe(before)
  })
  it('workspace projection excludes publisher secrets and uses independent bounded list positions', () => {
    const snapshot = buildWorkspaceLineupSnapshot(command(populated(), 'hold', 'a'), T + 11, false)
    expect(snapshot.entries.map(e => e.position)).toEqual([1, 2])
    expect(snapshot.heldEntries[0]).toMatchObject({ id: 'a', held: true, position: 1 })
    expect(snapshot.canManage).toBe(false)
    expect(snapshot.undoAvailable).toBe(false)
    expect(snapshot).not.toHaveProperty('publisher')
    expect(JSON.stringify(snapshot)).not.toContain(CLAIM_A)
  })
  it('validates initial, claimed, populated, held and historical-undo persisted states', () => {
    let s = command(populated(), 'hold', 'b')
    s = state(applySourcePacket(s, packet({ sequence: 1, entries: [], revealedIds: ['b'] }), T + 20))
    for (const candidate of [createLineupState(), publisher(), populated(), s]) expect(isLineupState(candidate)).toBe(true)
    expect(isLineupState(JSON.parse(JSON.stringify(s)))).toBe(true)
  })
  it('rejects corrupt persisted state without coercion, missing fields, duplicates or orphan arrangement', () => {
    const s = populated()
    const bad: unknown[] = [null, [], {}, { ...s, revision: '2' }, { ...s, revision: -1 },
      { ...s, lastReadyAt: undefined }, { ...s, lastReceivedAt: 'yesterday' }, { ...s, lastReadyAt: '2026-09-09' },
      { ...s, order: ['a', 'b', 'a'] }, { ...s, order: ['a', 'b'] }, { ...s, held: ['b'] },
      { ...s, order: ['a', 'b', 'missing'] }, { ...s, entries: [entry('a'), entry('a')] },
      { ...s, entries: [entry('a', ' Jessica '), entry('b'), entry('c')] },
      { ...s, revealedIds: ['a'] }, { ...s, revealedIds: ['x', 'x'] },
      { ...s, undo: { order: ['a'], held: ['a'] } }, { ...s, publisher: { ...s.publisher, epoch: 0 } },
      { ...s, publisher: { ...s.publisher, lastSequence: -2 } }, { ...s, publisher: null },
      { ...s, publisher: { ...s.publisher, lastSequence: -1 } },
      { ...s, publisher: { ...s.publisher, leaseExpiresAt: s.lastReceivedAt } },
      { ...s, sourceVersion: null }, { ...s, parserState: 'ready', lastReadyAt: null }]
    for (const candidate of bad) expect(isLineupState(candidate)).toBe(false)
  })
  it('preserves the entry partition and revision invariants through 500 deterministic adversarial transitions', () => {
    let s = populated()
    let random = 20260909
    const pick = (max: number) => { random = (Math.imul(random, 1664525) + 1013904223) >>> 0; return random % max }
    for (let step = 1; step <= 500; step++) {
      const now = T + step * 1_000
      const before = JSON.stringify(s)
      const revision = s.revision
      const op = pick(8)
      let result: LineupResult
      if (op < 3) {
        const ready = op !== 0
        const revealedId = ready && s.entries.length && pick(3) === 0 ? s.entries[pick(s.entries.length)].id : null
        result = applySourcePacket(s, packet({ publisherId: s.publisher!.id, epoch: s.publisher!.epoch,
          sequence: s.publisher!.lastSequence + 1, parserState: ready ? 'ready' : 'loading',
          entries: [entry(`arrival-${step}`, 'Jessica')], revealedIds: revealedId ? [revealedId] : [] }), now)
      } else if (op === 3) {
        result = claimPublisher(s, `device-${step}`, revision, now, { takeover: true, claimId: CLAIM_B })
      } else if (op === 4) {
        result = applyLineupCommand(s, { type: 'undo', expectedRevision: revision }, now)
      } else if (s.entries.length) {
        const chosen = s.entries[pick(s.entries.length)].id
        result = applyLineupCommand(s, { type: op === 5 ? 'reveal-next' : s.held.includes(chosen) ? 'return' : 'hold',
          entryId: chosen, expectedRevision: op === 7 ? revision - 1 : revision }, now)
      } else continue
      expect(JSON.stringify(s)).toBe(before)
      if (result.ok) {
        s = result.state
        expect(s.revision).toBe(revision + 1)
        expect(isLineupState(s)).toBe(true)
        expect(new Set([...s.order, ...s.held]).size).toBe(s.entries.length)
        expect(s.entries.every(e => !s.revealedIds.includes(e.id))).toBe(true)
      } else expect(['nothing_to_undo', 'revision_conflict']).toContain(result.code)
    }
  })
  it('replays only the same active worker claim attempt without resetting sequence, lease or revision', () => {
    const s = populated()
    const replay = state(claimPublisher(s, 'device-a', 0, T + 1000, { claimId: CLAIM_A }))
    expect(replay).toBe(s)
    expect(replay.publisher?.lastSequence).toBe(0)
    expect(claimPublisher(s, 'device-a', s.revision, T + 1000, { claimId: CLAIM_B })).toEqual({ ok: false, code: 'publisher_conflict' })
    expect(claimPublisher(s, 'device-b', s.revision, T + 1000, { claimId: CLAIM_A })).toEqual({ ok: false, code: 'publisher_conflict' })
    expect(claimPublisher(s, 'device-a', s.revision, T + LINEUP_LEASE_MS + 1, { claimId: CLAIM_A })).toEqual({ ok: false, code: 'lease_expired' })
    const renewed = state(claimPublisher(s, 'device-a', s.revision, T + LINEUP_LEASE_MS + 1, { claimId: CLAIM_B }))
    expect(renewed.publisher?.epoch).toBe(2)
  })
  it('rejects missing, malformed or non-random-v4 claim identifiers', () => {
    for (const claimId of [undefined, '', 'same-tab', 'aaaaaaaa-aaaa-1aaa-8aaa-aaaaaaaaaaaa'])
      expect(claimPublisher(createLineupState(), 'device-a', 0, T, { claimId: claimId as string })).toEqual({ ok: false, code: 'invalid_payload' })
  })
})
