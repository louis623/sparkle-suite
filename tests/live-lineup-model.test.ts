import { GET as releaseGET } from '../app/api/live-lineup/release/route'
import { LIVE_LINEUP_RELEASE } from '../lib/live-lineup/release'
import { parseParserStructure } from '../lib/live-lineup/model'
import { describe, expect, it } from 'vitest'
import { applyLineupCommand, applySourcePacket, buildWorkspaceLineupSnapshot, claimPublisher, createLineupState,
  canonicalizeLineupTimestamps, canonicalizeTime, healLineupStateTimestamps, isCanonicalTime, isLineupState, LINEUP_LEASE_MS, LINEUP_MAX_ENTRIES, parseLineupCommand, parseSourcePacket, parsePublisherDiagnostics } from '@/lib/live-lineup/model'
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
      } else expect(['nothing_to_undo', 'revision_conflict', 'source_not_ready', 'lease_expired']).toContain(result.code)
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

describe('Live Lineup timestamp canonicalize / heal (Workspace harden)', () => {
  const micros = '2026-09-29T23:15:26.314700Z'
  const canonical = '2026-09-29T23:15:26.314Z'

  it('isCanonicalTime requires JS toISOString shape (3 ms digits)', () => {
    expect(isCanonicalTime(canonical)).toBe(true)
    expect(isCanonicalTime(micros)).toBe(false)
    expect(isCanonicalTime('2026-09-09')).toBe(false)
    expect(canonicalizeTime(micros)).toBe(canonical)
    expect(canonicalizeTime(canonical)).toBe(canonical)
  })

  it('isLineupState rejects Postgres µs lastChangedAt without coercion (regression)', () => {
    const s = populated()
    expect(isLineupState(s)).toBe(true)
    expect(isLineupState({ ...s, lastChangedAt: micros })).toBe(false)
  })

  it('healLineupStateTimestamps recovers µs lastChangedAt so publisher read can succeed', () => {
    const s = populated()
    const onlyChanged = { ...s, lastChangedAt: micros }
    expect(isLineupState(onlyChanged)).toBe(false)
    const healed = healLineupStateTimestamps(onlyChanged)
    expect(healed).not.toBeNull()
    expect(healed!.lastChangedAt).toBe(canonical)
    expect(isLineupState(healed)).toBe(true)
    expect(canonicalizeLineupTimestamps(onlyChanged)?.lastChangedAt).toBe(canonical)
  })

  it('heal also canonicalizes lease and receipt micros together', () => {
    const s = populated()
    const withMicros = {
      ...s,
      lastChangedAt: micros,
      lastReceivedAt: s.lastReceivedAt!.slice(0, -1) + '000Z',
      lastReadyAt: s.lastReadyAt!.slice(0, -1) + '000Z',
      publisher: { ...s.publisher!, leaseExpiresAt: s.publisher!.leaseExpiresAt.slice(0, -1) + '000Z' },
    }
    expect(isLineupState(withMicros)).toBe(false)
    const healed = healLineupStateTimestamps(withMicros)
    expect(healed).not.toBeNull()
    expect(healed!.lastChangedAt).toBe(canonical)
    expect(healed!.lastReceivedAt).toBe(s.lastReceivedAt)
    expect(healed!.lastReadyAt).toBe(s.lastReadyAt)
    expect(healed!.publisher!.leaseExpiresAt).toBe(s.publisher!.leaseExpiresAt)
    expect(isLineupState(healed)).toBe(true)
  })

  it('heal does not revive unrelated corruption', () => {
    expect(healLineupStateTimestamps({})).toBeNull()
    expect(healLineupStateTimestamps({ ...populated(), revision: '2' })).toBeNull()
    expect(healLineupStateTimestamps({ ...populated(), lastChangedAt: 'yesterday' })).toBeNull()
  })
})

it('2.0.8 reporting allowlists are backward compatible and diagnostic metadata cannot change authority', () => {
  for (const version of ['2.0.6','2.0.7']) expect(parseSourcePacket(packet({sourceVersion:version}))).not.toBeNull()
  const s=populated()
  for (const [parserState,parserReason] of [['loading','table_missing'],['loading','table_busy'],['loading','table_incomplete'],['loading','table_settling'],['partial','row_incomplete'],['partial','table_incomplete'],['partial','reveal_state_missing'],['partial','selected_party_not_visible'],['invalid','invalid_first_name']] as const) {
    const p=packet({sourceVersion:'2.0.8',sequence:1,parserState,parserReason,entries:[],revealedIds:[]})
    const diagnostics={sourceVersion:'2.0.8',readerVersion:'2.0.8',updateState:'unknown' as const,parserState,parserReason}
    expect(parseSourcePacket(p)).not.toBeNull()
    const plain=state(applySourcePacket(s,p,T+10))
    const reported=state(applySourcePacket(s,{...p,diagnostics},T+10))
    expect(reported).toEqual({...plain,diagnostics:{...diagnostics,receivedAt:new Date(T+10).toISOString()}})
    expect(reported.publisher).toEqual(plain.publisher)
    expect(reported.lastReadyAt).toBe(s.lastReadyAt)
    expect(reported.entries).toEqual(s.entries)
    expect(isLineupState(reported)).toBe(true)
    expect(parseSourcePacket({...p,parserState:'ready'})).toBeNull()
  }
  expect(parseSourcePacket(packet({parserState:'loading',parserReason:'invalid_first_name'}))).toBeNull()
  expect(parseSourcePacket({...packet(),parserReason:'customer name'})).toBeNull()
  const diagnostics={sourceVersion:'2.0.8',readerVersion:'2.0.7',updateState:'unknown' as const,parserState:'partial' as const}
  expect(parseSourcePacket({...packet({sourceVersion:'2.0.8'}),diagnostics:{...diagnostics,parserState:'ready'}})).toBeNull()
  expect(parsePublisherDiagnostics({...diagnostics,customer:'secret'})).toBeNull()
  expect(parsePublisherDiagnostics({...diagnostics,readerVersion:'customer'})).toBeNull()
  expect(parsePublisherDiagnostics({...diagnostics,updateState:'up_to_date'})).toBeNull()
  const initial=createLineupState()
  const plain=state(claimPublisher(initial,'device-a',0,T,{claimId:CLAIM_A}))
  const reported=state(claimPublisher(initial,'device-a',0,T,{claimId:CLAIM_A,diagnostics}))
  expect(reported).toEqual({...plain,diagnostics:{...diagnostics,receivedAt:new Date(T).toISOString()}})
  expect(reported.lastReadyAt).toBeNull()
  expect(reported.lastReceivedAt).toBeNull()
  expect(isLineupState(reported)).toBe(true)
  const replay=state(claimPublisher(reported,'device-a',reported.revision,T+10,{claimId:CLAIM_A,diagnostics:{...diagnostics,readerVersion:'2.0.8'}}))
  expect(replay).toBe(reported)
  expect(claimPublisher(reported,'device-b',reported.revision,T+10,{claimId:CLAIM_B,diagnostics})).toEqual({ok:false,code:'publisher_conflict'})
})

describe('2.0.9 diagnostic contract', () => {
  const structure = {version:1,columns:['OrderID','FirstName','IsRevealed'],bodyCount:2,rowCount:'1-10',unmatchedRows:'0',hasOrderIdAttribute:true,hasPartyIdAttribute:true,hasOrderTimeAttribute:true}
  it('accepts only bounded structure and update enums without changing retained state or authority', () => {
    const s=populated()
    for(const updateState of ['unknown','checking','no_update','throttled','downloaded','installing','failed'] as const) {
      const diagnostics=parsePublisherDiagnostics({sourceVersion:'2.0.9',readerVersion:'2.0.9',updateState,parserState:'partial',parserReason:'table_incomplete',structure})!
      expect(diagnostics).not.toBeNull()
      const p=packet({sourceVersion:'2.0.9',sequence:1,parserState:'partial',parserReason:'table_incomplete',entries:[],revealedIds:[]})
      const plain=state(applySourcePacket(s,p,T+10))
      const report=state(applySourcePacket(s,{...p,diagnostics},T+10))
      expect(report).toEqual({...plain,diagnostics:{...diagnostics,receivedAt:new Date(T+10).toISOString()}})
      expect(report.entries).toEqual(s.entries)
      expect(report.lastReadyAt).toBe(s.lastReadyAt)
      expect(isLineupState(report)).toBe(true)
    }
    for(const bad of [{...structure,columns:['Customer Secret']},{...structure,url:'https://customer.test/'},{...structure,bodyCount:33},{...structure,rowCount:'12345'},{...structure,hasOrderIdAttribute:'12345'},{...structure,version:2}]) expect(parseParserStructure(bad)).toBeNull()
    const d={sourceVersion:'2.0.9',readerVersion:'2.0.9',updateState:'unknown',parserState:'ready',structure}
    expect(parsePublisherDiagnostics({...d,updateState:'installed_current'})).toBeNull()
    expect(parsePublisherDiagnostics({...d,customer:'Secret'})).toBeNull()
    expect(parsePublisherDiagnostics({...d,structure:{...structure,customer:'Secret'}})).toBeNull()
    expect(parseSourcePacket({...packet({sourceVersion:'2.0.9'}),diagnostics:{...d,readerVersion:'2.0.7'}})).toBeNull()
  })
  it('publishes only the disabled known-release descriptor, never the candidate or a download URL', async () => {
    const response=await releaseGET()
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.json()).toEqual(LIVE_LINEUP_RELEASE)
    expect(LIVE_LINEUP_RELEASE).toEqual({protocol:1,version:'2.0.7',publishedAt:null,rolloutEnabled:false})
    expect(Object.keys(LIVE_LINEUP_RELEASE).sort()).toEqual(['protocol','publishedAt','rolloutEnabled','version'])
  })
})


describe('2.0.10 diagnostics', () => {
  const shape={format:'plain',length:'1-10',characters:['digits']}
  const identity={problem:'conflict',attribute:shape,cell:shape,link:shape,
    comparisons:{attributeCell:'mismatch',attributeLink:'match',cellLink:'mismatch'}}
  const failure={version:1,stage:'identity',rowIndex:2,cellCount:9,order:identity,party:{...identity,problem:'none',
    comparisons:{attributeCell:'match',attributeLink:'match',cellLink:'match'}}}
  const structure={version:1,columns:['OrderID','PartyID'],bodyCount:1,rowCount:'1-10',unmatchedRows:'0',
    hasOrderIdAttribute:true,hasPartyIdAttribute:true,hasOrderTimeAttribute:true}
  const raw={sourceVersion:'2.0.10',readerVersion:'2.0.10',updateState:'unknown',parserState:'invalid',parserReason:'missing_order_identity',structure,failure}
  const report=(changes:Record<string,unknown>={}) => parsePublisherDiagnostics({...raw,...changes})!
  const badPacket=(sequence:number,diagnostics=report()) => packet({sourceVersion:'2.0.10',sequence,
    parserState:'invalid',parserReason:'missing_order_identity',entries:[],revealedIds:[],diagnostics})

  it('accepts bounded classifications and rejects arbitrary nested text, keys and ready failures', () => {
    expect(report()).not.toBeNull()
    const secret='PRIVATE CUSTOMER ORDER 12345'
    for(const changed of [
      {...failure,raw:secret},{...failure,stage:secret},{...failure,rowIndex:50001},{...failure,cellCount:33},
      {...failure,order:{...identity,problem:secret}},
      {...failure,order:{...identity,attribute:{...shape,text:secret}}},
      {...failure,order:{...identity,attribute:{...shape,characters:[secret]}}},
      {...failure,order:{...identity,attribute:{...shape,characters:['digits','digits']}}},
      {...failure,order:{...identity,comparisons:{...identity.comparisons,attributeCell:secret}}},
      {...failure,order:{...identity,comparisons:{...identity.comparisons,value:secret}}},
    ]) expect(report({failure:changed})).toBeNull()
    expect(report({parserState:'ready',parserReason:undefined})).toBeNull()
    expect(report({failure:{version:1,stage:'table',rowIndex:null,cellCount:null}})).not.toBeNull()
    expect(parseSourcePacket(badPacket(1))).not.toBeNull()
  })

  it('coalesces polling and position noise, preserves failures through recovery, and keeps projections private', () => {
    const original=populated()
    const first=state(applySourcePacket(original,badPacket(1),T+10))
    const latest=report({updateState:'checking',failure:{...failure,rowIndex:7},structure:{...structure,rowCount:'11-100'}})
    const next=state(applySourcePacket(first,badPacket(2,latest),T+20))
    expect(next.diagnosticHistory).toHaveLength(1)
    expect(next.diagnosticHistory![0]).toEqual({firstSeenAt:new Date(T+10).toISOString(),lastSeenAt:new Date(T+20).toISOString(),count:2,report:latest})
    expect(next.entries).toEqual(original.entries)
    expect(next.order).toEqual(original.order)
    expect(next.lastReadyAt).toBe(original.lastReadyAt)
    const plain=state(applySourcePacket(first,{...badPacket(2),diagnostics:undefined},T+20))
    expect(next.publisher).toEqual(plain.publisher)
    const ready=report({parserState:'ready',parserReason:undefined,failure:undefined})
    const recovered=state(applySourcePacket(next,packet({sourceVersion:'2.0.10',sequence:3,diagnostics:ready}),T+30))
    expect(recovered.diagnosticHistory).toEqual(next.diagnosticHistory)
    expect(isLineupState(recovered)).toBe(true)
    expect(buildWorkspaceLineupSnapshot(recovered,T+31,true)).not.toHaveProperty('diagnosticHistory')
    expect(buildWorkspaceLineupSnapshot(recovered,T+31,true)).not.toHaveProperty('diagnostics')
    const opened=state(applyLineupCommand(recovered,{type:'start-show',partyIds:['P1'],carryEntryIds:[],confirmed:true,expectedRevision:recovered.revision},T+40))
    expect(opened.diagnosticHistory).toEqual(recovered.diagnosticHistory)
  })

  it('bounds distinct reports and counters and expires old evidence on the next accepted receipt', () => {
    let current=populated()
    for(let n=1;n<=13;n++) current=state(applySourcePacket(current,badPacket(n,report({failure:{...failure,cellCount:n}})),T+10+n))
    expect(current.diagnosticHistory).toHaveLength(12)
    expect(current.diagnosticHistory![0].report.failure!.cellCount).toBe(2)
    const capped=structuredClone(current)
    capped.diagnosticHistory!.at(-1)!.count=1_000_000
    const repeated=state(applySourcePacket(capped,badPacket(14,report({failure:{...failure,cellCount:13}})),T+30))
    expect(repeated.diagnosticHistory!.at(-1)!.count).toBe(1_000_000)
    const later=T+15*86_400_000
    const claimed=state(claimPublisher(repeated,'device-a',repeated.revision,later,{claimId:CLAIM_B}))
    expect(claimed.diagnosticHistory).toEqual(repeated.diagnosticHistory)
    const expired=state(applySourcePacket(claimed,packet({epoch:2,sequence:0}),later+1))
    expect(expired.diagnosticHistory).toEqual([])
    expect(expired.entries).toEqual(current.entries)
    expect(isLineupState(expired)).toBe(true)
  })

  it('does not let rejected packets or claims mutate history and rejects corrupt persisted reports', () => {
    const first=state(applySourcePacket(populated(),badPacket(1),T+10))
    const before=structuredClone(first)
    expect(applySourcePacket(first,{...badPacket(2),publisherId:'other'},T+20)).toEqual({ok:false,code:'publisher_conflict'})
    expect(applySourcePacket(first,badPacket(1),T+20)).toEqual({ok:false,code:'stale_sequence'})
    expect(applySourcePacket(first,{...badPacket(2),diagnostics:{...raw,failure:{...failure,customer:'secret'}}},T+20)).toEqual({ok:false,code:'invalid_payload'})
    expect(claimPublisher(first,'device-b',first.revision,T+20,{claimId:CLAIM_B,diagnostics:report()})).toEqual({ok:false,code:'publisher_conflict'})
    expect(first).toEqual(before)
    const replay=state(claimPublisher(first,'device-a',first.revision,T+20,{claimId:CLAIM_A,diagnostics:report()}))
    expect(replay).toBe(first)
    const corrupt=structuredClone(first) as unknown as Record<string,unknown>
    corrupt.diagnosticHistory=[{...first.diagnosticHistory![0],rawText:'secret'}]
    expect(isLineupState(corrupt)).toBe(false)
    corrupt.diagnosticHistory=Array.from({length:13},()=>first.diagnosticHistory![0])
    expect(isLineupState(corrupt)).toBe(false)
  })
})

describe('2.0.11 ingest', () => {
  it('accepts ready entry IDs that include slash, dot, or equals and still rejects odd publisher IDs', () => {
    const id = '1846280:abc/def=ghi.v2'
    const parsed = parseSourcePacket(packet({ entries: [entry(id)], revealedIds: [] }))
    expect(parsed).not.toBeNull()
    expect(parsed!.entries[0].id).toBe(id)
    expect(parseSourcePacket(packet({ publisherId: 'device/a', entries: [entry(id)] }))).toBeNull()
    expect(parseSourcePacket(packet({ entries: [entry('has a space')], revealedIds: [] }))).toBeNull()
  })

  it('still does not apply partial or invalid packets, even when they carry entries', () => {
    const original = populated()
    const odd = 'P9:abc/def=ghi.v2'
    for (const parserState of ['partial', 'invalid'] as const) {
      const next = state(applySourcePacket(original, packet({
        sequence: 1, parserState, parserReason: parserState === 'partial' ? 'row_incomplete' : 'missing_order_identity',
        entries: [entry(odd)], revealedIds: [],
      }), T + 20))
      expect(next.entries).toEqual(original.entries)
      expect(next.lastReadyAt).toBe(original.lastReadyAt)
    }
    const ready = state(applySourcePacket(original, packet({ sequence: 1, entries: [entry(odd)], revealedIds: [] }), T + 20))
    expect(ready.entries.map(item => item.id)).toContain(odd)
    expect(ready.lastReadyAt).toBe(new Date(T + 20).toISOString())
  })

  it('leaves the published 2.0.10 release config unchanged', () => {
    expect(LIVE_LINEUP_RELEASE.version).toBe('2.0.10')
    expect(LIVE_LINEUP_RELEASE.rolloutEnabled).toBe(true)
  })
})
