import { describe, expect, it } from 'vitest'
import { applyLineupCommand, applySourcePacket, buildWorkspaceLineupSnapshot, claimPublisher, createLineupState, isLineupState, parseLineupCommand, parseSourcePacket } from '@/lib/live-lineup/model'
import type { LineupResult, LineupState } from '@/lib/live-lineup/types'

const T = Date.parse('2026-09-09T12:00:00Z')
const nonce = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const second = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const take = (r: LineupResult): LineupState => { if (!r.ok) throw Error(r.code); return r.state }
const entry = (id: string, orderedAt = T) => ({id, name: 'Jessica', orderedAt})
function before() {
  const claimed = take(claimPublisher(createLineupState(), 'device', 0, T, {claimId: nonce}))
  return take(applySourcePacket(claimed, {publisherId: 'device', epoch: 1, sequence: 0, sourceVersion: '2', parserState: 'ready', entries: [entry('p1:a')], revealedIds: []}, T))
}
function start(s = before()) {
  return take(applyLineupCommand(s, {type: 'start-show', partyIds: ['p2', 'p1'], confirmed: true, expectedRevision: s.revision}, T + 100))
}
function claim(s = start()) { return take(claimPublisher(s, 'device', s.revision, T + 101, {claimId: second, generation: 1})) }
function packet(overrides = {}) { return {generation: 1, publisherId: 'device', epoch: 2, sequence: 0, sourceVersion: '2', parserState: 'ready', entries: [entry('p1:b', T + 101), entry('p2:c', T + 102)], revealedIds: [], ...overrides} }

describe('explicit show generations and reversible party visibility', () => {
  it('requires explicit confirmation and unique nonempty scope', () => {
    for (const value of [{}, {confirmed: false}, {confirmed: true, partyIds: []}, {confirmed: true, partyIds: ['p1', 'p1']}])
      expect(parseLineupCommand({type: 'start-show', expectedRevision: 2, ...value})).toBeNull()
  })
  it('leaves the prior state intact and produces a valid empty, not-connected new generation', () => {
    const old = before(), copy = structuredClone(old), next = start(old)
    expect(old).toEqual(copy)
    expect(next.show).toEqual({generation: 1, partyIds: ['p1', 'p2'], excludedPartyIds: [], carryEntryIds: [], startedAt: new Date(T + 100).toISOString()})
    expect(next.entries).toEqual([])
    expect(isLineupState(next)).toBe(true)
    expect(buildWorkspaceLineupSnapshot(next, T + 100).connection).not.toBe('connected')
  })
  it('rejects old packets and old claim retries even after the previous lease expires', () => {
    const s = start()
    expect(applySourcePacket(s, packet({generation: 0, epoch: 1}), T + 101)).toEqual({ok: false, code: 'show_changed'})
    expect(claimPublisher(s, 'device', s.revision, T + 100000, {claimId: nonce})).toEqual({ok: false, code: 'show_changed'})
  })
  it('requires the new generation and an incremented epoch to publish', () => {
    const s = claim()
    expect(isLineupState(s)).toBe(true)
    expect(s.publisher?.epoch).toBe(2)
    expect(applySourcePacket(s, packet({epoch: 1}), T + 102)).toEqual({ok: false, code: 'publisher_conflict'})
    expect(take(applySourcePacket(s, packet(), T + 102)).order).toEqual(['p1:b', 'p2:c'])
  })
  it('does not reimport pre-show orders still visible in the source table', () => {
    const next = take(applySourcePacket(claim(), packet({entries: [entry('p1:a'), entry('p1:b', T + 101)]}), T + 102))
    expect(next.order).toEqual(['p1:b'])
    expect(applySourcePacket(claim(), packet({entries: [{...entry('p1:unknown'), orderedAt: null}]}), T + 102)).toEqual({ok: false, code: 'invalid_scope'})
  })
  it('rejects orders or revelations from a different party without refreshing health', () => {
    const s = claim()
    expect(applySourcePacket(s, packet({entries: [entry('p3:a', T + 101)]}), T + 102)).toEqual({ok: false, code: 'invalid_scope'})
    expect(applySourcePacket(s, packet({revealedIds: ['p3:z']}), T + 102)).toEqual({ok: false, code: 'invalid_scope'})
    expect(s.lastReceivedAt).toBeNull()
  })
  it('hides/restores parties without deleting their order, holds, or identities', () => {
    let s = take(applySourcePacket(claim(), packet(), T + 102))
    s = take(applyLineupCommand(s, {type: 'hold', entryId: 'p1:b', expectedRevision: s.revision}, T + 103))
    const old = structuredClone(s)
    s = take(applyLineupCommand(s, {type: 'filter-parties', excludedPartyIds: ['p1'], expectedRevision: s.revision}, T + 104))
    expect(s.entries).toEqual(old.entries)
    expect(s.held).toEqual(old.held)
    expect(buildWorkspaceLineupSnapshot(s, T + 104).heldEntries).toEqual([])
    s = take(applyLineupCommand(s, {type: 'filter-parties', excludedPartyIds: [], expectedRevision: s.revision}, T + 105))
    expect(buildWorkspaceLineupSnapshot(s, T + 105).heldEntries[0].id).toBe('p1:b')
  })
  it('rejects stale start commands and corrupt scope metadata', () => {
    const old = before()
    expect(applyLineupCommand(old, {type: 'start-show', partyIds: ['p1'], confirmed: true, expectedRevision: 0}, T + 100)).toEqual({ok: false, code: 'revision_conflict'})
    expect(isLineupState({...start(), show: {generation: 1, partyIds: ['p1'], excludedPartyIds: ['p9'], startedAt: new Date(T).toISOString()}})).toBe(false)
  })
  it('carries only selected identities, preserving manual order and private holds', () => {
    let old = take(applySourcePacket(before(), packet({generation: 0, epoch: 1, sequence: 1,
      entries: [entry('p1:a'), entry('p1:b'), entry('p2:c')]}), T + 1))
    old = take(applyLineupCommand(old, {type: 'reveal-next', entryId: 'p1:b', expectedRevision: old.revision}, T + 2))
    old = take(applyLineupCommand(old, {type: 'hold', entryId: 'p2:c', expectedRevision: old.revision}, T + 3))
    const next = take(applyLineupCommand(old, {type: 'start-show', confirmed: true, partyIds: ['p1','p2'], carryEntryIds: ['p2:c','p1:b'], expectedRevision: old.revision}, T + 100))
    expect(next.order).toEqual(['p1:b'])
    expect(next.held).toEqual(['p2:c'])
    expect(next.entries.map(e => e.id).sort()).toEqual(['p1:b','p2:c'])
    expect(isLineupState(next)).toBe(true)
    const synced = take(applySourcePacket(claim(next), packet({entries: [entry('p1:a'), entry('p1:b'), entry('p2:c'), entry('p1:new',T+101)]}), T + 102))
    expect(synced.order).toEqual(['p1:b','p1:new'])
    expect(synced.held).toEqual(['p2:c'])
  })
  it('rejects stale, duplicated, or out-of-scope carry choices', () => {
    const s = before()
    expect(parseLineupCommand({type:'start-show',confirmed:true,partyIds:['p1'],carryEntryIds:['p1:a','p1:a'],expectedRevision:s.revision})).toBeNull()
    for (const [partyIds, carryEntryIds] of [[['p1'],['p1:missing']],[['p2'],['p1:a']]])
      expect(applyLineupCommand(s,{type:'start-show',confirmed:true,partyIds,carryEntryIds,expectedRevision:s.revision},T+100)).toEqual({ok:false,code:'invalid_scope'})
  })
  it('uses dated revelations so old source rows do not refill a new show tombstone budget', () => {
    const old = Array.from({length:9999},(_,i)=>({id:`p1:old${i}`,orderedAt:T}))
    const all = [...old,{id:'p1:new-revealed',orderedAt:T+101}]
    const s = take(applySourcePacket(claim(),packet({entries:[],revealedIds:all.map(e=>e.id),revealedEntries:all}),T+102))
    expect(s.revealedIds).toEqual(['p1:new-revealed'])
    const next = take(applySourcePacket(s,packet({sequence:1,entries:[entry('p1:new-revealed',T+101)]}),T+103))
    expect(next.entries).toEqual([])
  })
  it('still removes an old carried order when its dated revelation arrives', () => {
    const old=before()
    const started=take(applyLineupCommand(old,{type:'start-show',confirmed:true,partyIds:['p1'],carryEntryIds:['p1:a'],expectedRevision:old.revision},T+100))
    const next=take(applySourcePacket(claim(started),packet({entries:[],revealedIds:['p1:a'],revealedEntries:[{id:'p1:a',orderedAt:T}]}),T+102))
    expect(next.order).toEqual([])
    expect(next.revealedIds).toEqual(['p1:a'])
    expect(isLineupState(next)).toBe(true)
  })
  it('rejects missing or contradictory revelation dates before accepting scoped health', () => {
    const s=claim()
    expect(applySourcePacket(s,packet({entries:[],revealedIds:['p1:x']}),T+102)).toEqual({ok:false,code:'invalid_scope'})
    expect(parseSourcePacket(packet({revealedIds:['p1:x'],revealedEntries:[{id:'p1:y',orderedAt:T}]}))).toBeNull()
    expect(parseSourcePacket(packet({revealedIds:['p1:x'],revealedEntries:[]}))).toBeNull()
    expect(s.lastReceivedAt).toBeNull()
  })
})
