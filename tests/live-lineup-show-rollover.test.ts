import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { describe, expect, it } from 'vitest'
import { lineupSqlAdapter } from './fixtures/live-lineup-sql-adapter'
import { applyLineupCommand, applySourcePacket, claimPublisher, createLineupState, isLineupState, LINEUP_PARTY_ABSENCE_MS, LINEUP_SHOW_IDLE_MS, LINEUP_SHOW_MAX_MS } from '@/lib/live-lineup/model'
import { changeLineup, claimSource, issuePublisher, receiveSource } from '@/lib/live-lineup/service'
import type { LineupResult, LineupState, SourcePacket } from '@/lib/live-lineup/types'

const T = Date.parse('2026-09-09T12:00:00Z')
const nonce = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const second = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const third = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
const documentId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
const take = (result: LineupResult): LineupState => { if (!result.ok) throw Error(result.code); return result.state }
const entry = (id: string, name = 'Jessica', orderedAt = T) => ({ id, name, orderedAt })

function showWith(rows: Array<{ id: string; name?: string }>, partyIds = ['p1', 'p2']) {
  const claimed = take(claimPublisher(createLineupState(), 'device', 0, T, { claimId: nonce }))
  const ready = take(applySourcePacket(claimed, {
    publisherId: 'device', epoch: 1, sequence: 0, sourceVersion: '2', parserState: 'ready', generation: 0,
    entries: rows.map(row => entry(row.id, row.name ?? 'Jessica')), revealedIds: [],
  }, T + 1))
  const started = take(applyLineupCommand(ready, {
    type: 'start-show', confirmed: true, partyIds, carryEntryIds: rows.map(row => row.id), expectedRevision: ready.revision,
  }, T + 100))
  return take(claimPublisher(started, 'device', started.revision, T + 101, { claimId: second, generation: 1 }))
}

function packet(state: LineupState, overrides: Partial<SourcePacket> = {}): SourcePacket {
  return {
    generation: state.show?.generation ?? 0, publisherId: 'device', epoch: state.publisher!.epoch,
    sequence: state.publisher!.lastSequence + 1, sourceVersion: '2', parserState: 'ready',
    entries: [entry('p1:a'), entry('p2:c')], revealedIds: [], ...overrides,
  }
}

function ageShow(state: LineupState, startedAt: number): LineupState {
  return { ...state, show: { ...state.show!, startedAt: new Date(startedAt).toISOString() } }
}

function idleAt(state: LineupState, at: number): LineupState {
  return {
    ...ageShow(state, at - LINEUP_SHOW_MAX_MS - 1),
    lastChangedAt: new Date(at - LINEUP_SHOW_IDLE_MS - 1).toISOString(),
  }
}

function observe(at: number, serial: number) {
  return { documentId, serial, serverTime: new Date(at).toISOString(), settled: true as const }
}

describe('automatic show ending', () => {
  it('archives a show older than 18 hours through the manual start-show state', () => {
    const at = T + 102
    const current = idleAt(showWith([{ id: 'p1:brooke', name: 'Brooke' }, { id: 'p2:casey', name: 'Casey' }]), at)
    const before = structuredClone(current)
    const next = take(applySourcePacket(current, packet(current, { entries: [entry('p2:casey', 'Casey')] }), at))
    const manual = take(applyLineupCommand(current, {
      type: 'start-show', partyIds: ['p2'], carryEntryIds: [], confirmed: true, expectedRevision: current.revision,
    }, at))
    expect(current).toEqual(before)
    expect(next).toEqual(manual)
    expect(next.show).toMatchObject({ generation: 2, partyIds: ['p2'], carryEntryIds: [], startedAt: new Date(at).toISOString() })
    expect(next.entries).toEqual([])
    expect(next.revealedIds).toEqual([])
    expect(next.order).toEqual([])
    expect(next.held).toEqual([])
    expect(isLineupState(next)).toBe(true)
  })

  it('keeps a show that started exactly 18 hours ago', () => {
    const at = T + 102
    const current = ageShow(showWith([{ id: 'p1:brooke', name: 'Brooke' }]), at - LINEUP_SHOW_MAX_MS)
    const next = take(applySourcePacket(current, packet(current, { entries: [entry('p1:brooke', 'Brooke')] }), at))
    expect(next.show?.generation).toBe(1)
    expect(next.entries.map(row => row.name)).toEqual(['Brooke'])
    expect(next.revealedIds).toEqual([])
  })

  it('does not end an old show on a packet that names no party', () => {
    const at = T + 102
    const current = ageShow(showWith([{ id: 'p1:brooke', name: 'Brooke' }]), at - LINEUP_SHOW_MAX_MS - 1)
    const next = take(applySourcePacket(current, packet(current, { entries: [], revealedIds: [] }), at))
    expect(next.show?.generation).toBe(1)
    expect(next.entries.map(row => row.name)).toEqual(['Brooke'])
  })

  it('does not end an idle show on a non-ready packet', () => {
    const at = T + 102
    const current = idleAt(showWith([{ id: 'p1:brooke', name: 'Brooke' }], ['p1']), at)
    const next = take(applySourcePacket(current, packet(current, {
      parserState: 'loading', entries: [entry('p1:brooke', 'Brooke')],
    }), at))
    expect(next.show).toMatchObject({ generation: 1, partyIds: ['p1'] })
    expect(next.entries.map(row => row.name)).toEqual(['Brooke'])
    expect(next.revealedIds).toEqual([])
    expect(next.parserState).toBe('loading')
  })

  it('does not end an active show that has passed 18 hours', () => {
    const at = T + 102
    const current = ageShow(showWith([{ id: 'p1:brooke', name: 'Brooke' }], ['p1']), at - LINEUP_SHOW_MAX_MS - 1)
    const next = take(applySourcePacket(current, packet(current, { entries: [entry('p1:brooke', 'Brooke')] }), at))
    expect(next.show?.generation).toBe(1)
    expect(next.entries.map(row => row.name)).toEqual(['Brooke'])
    expect(next.revealedIds).toEqual([])
  })

  it('does not start a fresh show on one ready snapshot of a new party', () => {
    const current = showWith([{ id: 'p1:brooke', name: 'Brooke' }], ['p1'])
    const next = take(applySourcePacket(current, packet(current, { entries: [entry('p9:ava', 'Ava')] }), T + 102))
    expect(next.show).toMatchObject({ generation: 1, partyIds: ['p1'] })
    expect(next.entries.map(row => row.name)).toEqual(['Brooke'])
    expect(next.partyAbsence).toMatchObject({ partyIds: ['p1'], packets: 1 })
    expect(isLineupState(next)).toBe(true)
  })

  it('starts a fresh show after a new party stays across ready packets spanning 10 minutes', () => {
    let current = showWith([{ id: 'p1:brooke', name: 'Brooke' }], ['p1'])
    const first = T + 102
    current = take(applySourcePacket(current, packet(current, { entries: [entry('p9:ava', 'Ava')] }), first))
    current = take(applySourcePacket(current, packet(current, {
      parserState: 'loading', entries: [entry('p1:brooke', 'Brooke')],
    }), first + 1000))
    expect(current.partyAbsence).toBeNull()
    expect(current.entries.map(row => row.name)).toEqual(['Brooke'])
    const restarted = first + 2000
    current = take(applySourcePacket(current, packet(current, { entries: [entry('p9:ava', 'Ava')] }), restarted))
    current = take(claimPublisher(current, 'device', current.revision, restarted + LINEUP_PARTY_ABSENCE_MS - 1000, { claimId: third, generation: 1 }))
    const next = take(applySourcePacket(current, packet(current, { entries: [entry('p9:ava', 'Ava')] }), restarted + LINEUP_PARTY_ABSENCE_MS))
    expect(next.show).toMatchObject({ generation: 2, partyIds: ['p9'], carryEntryIds: [] })
    expect(next.entries).toEqual([])
    expect(next.revealedIds).toEqual([])
    expect(next.partyAbsence ?? null).toBeNull()
    expect(isLineupState(next)).toBe(true)
  })

  it('does not adopt a new party from a loading packet while the show is young', () => {
    const current = showWith([{ id: 'p1:brooke', name: 'Brooke' }], ['p1'])
    expect(applySourcePacket(current, packet(current, {
      parserState: 'loading', entries: [entry('p9:ava', 'Ava')],
    }), T + 102)).toEqual({ ok: false, code: 'invalid_scope' })
    expect(current.show?.partyIds).toEqual(['p1'])
    expect(current.lastReceivedAt).toBeNull()
  })

  it('parks a party missing across ready snapshots for 10 minutes and restores it when the party returns', () => {
    let current = showWith([
      { id: 'p1:brooke', name: 'Brooke' },
      { id: 'p2:casey', name: 'Casey' },
      { id: 'p2:later', name: 'Later' },
    ])
    current = take(applySourcePacket(current, packet(current, {
      entries: [entry('p1:brooke', 'Brooke'), entry('p2:casey', 'Casey'), entry('p2:later', 'Later')],
    }), T + 102))
    current = take(applyLineupCommand(current, { type: 'hold', entryId: 'p1:brooke', expectedRevision: current.revision }, T + 103))
    const first = T + 104
    const kept = take(applySourcePacket(current, packet(current, { entries: [entry('p2:casey', 'Casey')] }), first))
    expect(kept.show?.generation).toBe(1)
    expect(kept.held).toEqual(['p1:brooke'])
    expect(kept.entries.map(row => row.id)).toContain('p1:brooke')
    expect(kept.entries.map(row => row.id)).toContain('p2:later')
    const at = first + LINEUP_PARTY_ABSENCE_MS
    const leased = take(claimPublisher(kept, 'device', kept.revision, at - 1000, { claimId: third, generation: 1 }))
    const next = take(applySourcePacket(leased, packet(leased, {
      entries: [entry('p2:casey', 'Casey')], observation: observe(at, 1),
    }), at))
    expect(next.show?.generation).toBe(1)
    expect(next.show?.partyIds).toEqual(['p1', 'p2'])
    expect(next.entries.map(row => row.id).sort()).toEqual(['p2:casey', 'p2:later'])
    expect(next.held).toEqual([])
    expect(next.order).toEqual(['p2:casey', 'p2:later'])
    expect(next.revealedIds).toEqual(['p1:brooke'])
    expect(next.restorations).toMatchObject([{ entry: { name: 'Brooke' }, category: 'held', reason: 'party-absent' }])
    expect(isLineupState(next)).toBe(true)
    const backAt = at + 1000
    const back = take(applySourcePacket(next, packet(next, {
      entries: [entry('p1:brooke', 'Brooke'), entry('p2:casey', 'Casey')], observation: observe(backAt, 2),
    }), backAt))
    expect(back.held).toEqual(['p1:brooke'])
    expect(back.revealedIds).toEqual([])
    expect(back.restorations ?? []).toEqual([])
    expect(back.show?.generation).toBe(1)
  })

  it('keeps visible parties when a ready snapshot only reports an excluded party', () => {
    let current = showWith([{ id: 'p1:brooke', name: 'Brooke' }, { id: 'p2:casey', name: 'Casey' }])
    current = take(applySourcePacket(current, packet(current, {
      entries: [entry('p1:brooke', 'Brooke'), entry('p2:casey', 'Casey')],
    }), T + 102))
    current = take(applyLineupCommand(current, {
      type: 'filter-parties', excludedPartyIds: ['p1'], expectedRevision: current.revision,
    }, T + 103))
    const next = take(applySourcePacket(current, packet(current, { entries: [entry('p1:new', 'New hidden')] }), T + 104))
    expect(next.show?.generation).toBe(1)
    expect(next.entries.map(row => row.id).sort()).toEqual(['p1:brooke', 'p1:new', 'p2:casey'])
    expect(next.held).toEqual([])
  })

  it('keeps an excluded party when the snapshot only shows the parties left visible', () => {
    let current = showWith([{ id: 'p1:brooke', name: 'Brooke' }, { id: 'p2:hidden', name: 'Hidden' }])
    current = take(applySourcePacket(current, packet(current, {
      entries: [entry('p1:brooke', 'Brooke'), entry('p2:hidden', 'Hidden')],
    }), T + 102))
    current = take(applyLineupCommand(current, {
      type: 'filter-parties', excludedPartyIds: ['p2'], expectedRevision: current.revision,
    }, T + 103))
    const next = take(applySourcePacket(current, packet(current, { entries: [entry('p1:brooke', 'Brooke')] }), T + 104))
    expect(next.entries.map(row => row.id).sort()).toEqual(['p1:brooke', 'p2:hidden'])
    expect(next.show?.excludedPartyIds).toEqual(['p2'])
  })

  it('does not treat a blank ready snapshot as every party leaving', () => {
    const current = showWith([{ id: 'p1:brooke', name: 'Brooke' }], ['p1'])
    const next = take(applySourcePacket(current, packet(current, { entries: [], revealedIds: [] }), T + 102))
    expect(next.entries.map(row => row.name)).toEqual(['Brooke'])
    expect(next.show?.generation).toBe(1)
  })

  it('refuses a stale packet instead of ending the show', () => {
    const at = T + 102
    let current = showWith([{ id: 'p1:brooke', name: 'Brooke' }], ['p1'])
    current = take(applySourcePacket(current, packet(current, { entries: [entry('p1:brooke', 'Brooke')] }), at))
    current = ageShow(current, at - LINEUP_SHOW_MAX_MS - 1)
    expect(applySourcePacket(current, packet(current, { sequence: 0, entries: [entry('p1:brooke', 'Brooke')] }), at + 1)).toEqual({ ok: false, code: 'stale_sequence' })
    expect(current.show?.generation).toBe(1)
    expect(current.entries.map(row => row.name)).toEqual(['Brooke'])
  })
})

it('commits an expired show through SQL so the archive insert keeps Brooke', async () => {
  const sql = new PGlite()
  const rep = '11111111-1111-4111-8111-111111111111'
  const nonceA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  const nonceB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
  try {
    await sql.exec('create role anon; create role authenticated; create role service_role bypassrls; create table reps(id uuid primary key); create table live_queue(rep_id uuid, sync_code text, queue jsonb, last_updated timestamptz); grant select on live_queue to service_role;')
    await sql.query('insert into reps values($1)', [rep])
    await sql.exec(readFileSync(new URL('../supabase/migrations/20260910000100_live_lineup_v2.sql', import.meta.url), 'utf8'))
    await sql.exec(readFileSync(new URL('../supabase/migrations/20260926000100_live_lineup_atomic_observations.sql', import.meta.url), 'utf8'))
    await sql.exec('set role service_role')
    const now = Date.now() - 20_000
    const db = lineupSqlAdapter(sql)
    const issued = await issuePublisher(db, rep, 'Synthetic laptop', now)
    const claim = await claimSource(db, issued.token, nonceA, now, 0)
    const brooke = { id: 'old:brooke', name: 'Brooke', orderedAt: now }
    await receiveSource(db, issued.token, {
      publisherId: issued.publisher.id, epoch: claim.epoch, generation: 0, sequence: 0, parserState: 'ready',
      sourceVersion: 'synthetic-v2', entries: [brooke], revealedIds: [],
    }, now + 1000)
    const started = await changeLineup(db, rep, {
      type: 'start-show', confirmed: true, partyIds: ['old'], carryEntryIds: ['old:brooke'], expectedRevision: 2,
    }, now + 2000)
    expect(started.management?.generation).toBe(1)
    const packetAt = now + 5000
    await sql.query(
      `update live_lineup_states set state = jsonb_set(jsonb_set(state, '{show,startedAt}', to_jsonb($2::text)), '{lastChangedAt}', to_jsonb($3::text)) where rep_id = $1`,
      [rep, new Date(packetAt - LINEUP_SHOW_MAX_MS - 1).toISOString(), new Date(packetAt - LINEUP_SHOW_IDLE_MS - 1).toISOString()],
    )
    const fresh = await claimSource(db, issued.token, nonceB, now + 3000, 1)
    await expect(receiveSource(db, issued.token, {
      publisherId: issued.publisher.id, epoch: fresh.epoch, generation: 1, sequence: 0, parserState: 'ready',
      sourceVersion: 'synthetic-v2', entries: [{ id: 'newp:ava', name: 'Ava', orderedAt: packetAt }], revealedIds: [],
    }, packetAt)).rejects.toMatchObject({ code: 'show_changed' })
    const archives = await sql.query<{ generation: number; state: { entries: Array<{ name: string }>; revealedIds: string[] } }>(
      'select generation, state from live_lineup_show_archives where rep_id = $1 order by generation', [rep])
    expect(archives.rows.map(row => Number(row.generation))).toEqual([0, 1])
    expect(archives.rows[1].state.entries.map(row => row.name)).toEqual(['Brooke'])
    const current = await sql.query<{ state: LineupState }>('select state from live_lineup_states where rep_id = $1', [rep])
    expect(current.rows[0].state.show).toMatchObject({ generation: 2, partyIds: ['newp'], carryEntryIds: [] })
    expect(current.rows[0].state.entries).toEqual([])
    expect(current.rows[0].state.revealedIds).toEqual([])
  } finally { await sql.close() }
}, 30_000)
