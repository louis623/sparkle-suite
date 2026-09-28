import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import type { SupabaseClient } from '@supabase/supabase-js'
import { expect, it, vi } from 'vitest'
import { lineupSqlAdapter } from './fixtures/live-lineup-sql-adapter'
import { changeLineup, claimSource, getEffectiveLiveQueueSnapshot, getWorkspaceLineup, issuePublisher, readLineupState, receiveSource } from '@/lib/live-lineup/service'
import { LINEUP_LEASE_MS } from '@/lib/live-lineup/model'

// Real service/model/exact SQL, with a gated transport and deterministic application
// clock. PGlite is single-connection: this is NOT PostgreSQL lock/wall-clock proof;
// scripts/live-lineup-pg-concurrency.mjs supplies the separate multi-session evidence.
const rep = '11111111-1111-4111-8111-111111111111'
const claimId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
async function fixture() {
  const sql = new PGlite()
  await sql.exec('create role anon; create role authenticated; create role service_role bypassrls; create table reps(id uuid primary key);')
  await sql.query('insert into reps values($1)', [rep])
  await sql.exec(readFileSync(new URL('../supabase/migrations/20260910000100_live_lineup_v2.sql', import.meta.url), 'utf8'))
  await sql.exec(readFileSync(new URL('../supabase/migrations/20260926000100_live_lineup_atomic_observations.sql',import.meta.url),'utf8'))
  await sql.exec('set role service_role')
  const db = lineupSqlAdapter(sql)
  const issued = await issuePublisher(db, rep, 'Synthetic delayed transport')
  // Credential timestamps are database-authoritative. Anchor the controlled
  // application clock to the returned issuance receipt, not the test runner.
  const receivedAt = Date.parse(issued.publisher.createdAt) + 10_000
  const claim = await claimSource(db, issued.token, claimId, receivedAt - 2000)
  const packet = {publisherId:issued.publisher.id, epoch:claim.epoch, generation:0, sequence:0,
    parserState:'ready', sourceVersion:'synthetic-v2', revealedIds:[],
    entries:[{id:'p1:a', name:'Synthetic A', orderedAt:receivedAt - 100_000}, {id:'p1:b', name:'Synthetic B', orderedAt:receivedAt - 100_000}]}
  await receiveSource(db, issued.token, packet, receivedAt - 1000)
  return {sql, db, issued, packet, receivedAt}
}
function pauseSave(db: SupabaseClient) {
  let reached!: () => void, release!: () => void
  const entered = new Promise<void>(done => { reached = done })
  const gate = new Promise<void>(done => { release = done })
  const delayed = {
    ...db,
    rpc: async (name: string, args: Record<string, unknown>) => {
      if (name !== 'live_lineup_commit') throw new Error('Unexpected delayed fixture RPC')
      reached()
      await gate
      return db.rpc(name, args)
    },
  } as unknown as SupabaseClient
  return {db:delayed, entered, release}
}

it('rejects renewal delayed beyond the old lease and keeps last-good state unchanged', async () => {
  const f = await fixture(), delay = pauseSave(f.db)
  const clock = vi.spyOn(Date, 'now').mockReturnValue(f.receivedAt)
  try {
    const before = (await readLineupState(f.db, rep))!
    const pending = receiveSource(delay.db, f.issued.token, {...f.packet, sequence:1})
    const outcome = pending.then(value => ({value}), error => ({error}))
    await delay.entered
    const completedAt = f.receivedAt + 100_000
    expect(Date.parse(before.publisher!.leaseExpiresAt)).toBeGreaterThan(f.receivedAt)
    expect(Date.parse(before.publisher!.leaseExpiresAt)).toBeLessThan(completedAt)
    clock.mockReturnValue(completedAt)
    delay.release()
    const receipt = await outcome
    expect(receipt).toMatchObject({error:{code:'publisher_conflict'}})
    const saved = (await readLineupState(f.db, rep))!
    expect(saved).toEqual(before)
    expect(saved.lastReadyAt).toBe(saved.lastReceivedAt)
    expect(saved.lastChangedAt).toBe(before.lastChangedAt) // Unchanged names/order are not a new content change.
    expect(Date.parse(saved.publisher!.leaseExpiresAt)).toBe(Date.parse(saved.lastReadyAt!) + LINEUP_LEASE_MS)
    expect(await getWorkspaceLineup(f.db, rep)).toMatchObject({connection:'offline', lastReceivedAt:saved.lastReceivedAt})
    expect(await getEffectiveLiveQueueSnapshot(f.db, rep)).toMatchObject({queue:[],
      ageSeconds:101, isFresh:false, lastUpdated:null, serverTime:new Date(completedAt).toISOString()})
    clock.mockReturnValue(f.receivedAt + 180_000)
    expect(await getWorkspaceLineup(f.db, rep)).toMatchObject({connection:'offline'})
    expect(await getEffectiveLiveQueueSnapshot(f.db, rep)).toMatchObject({ageSeconds:181, isFresh:false})
  } finally { delay.release(); clock.mockRestore(); await f.sql.close() }
}, 30_000)

it('rejects the delayed source save when an owner revision commits first, retaining the owner hold', async () => {
  const f = await fixture(), delay = pauseSave(f.db)
  const clock = vi.spyOn(Date, 'now').mockReturnValue(f.receivedAt)
  try {
    const pending = receiveSource(delay.db, f.issued.token, {...f.packet, sequence:1})
    const outcome = pending.then(value => ({value}), error => ({error}))
    await delay.entered
    const current = (await readLineupState(f.db, rep))!
    clock.mockReturnValue(f.receivedAt + 1000)
    await changeLineup(f.db, rep, {type:'hold', entryId:'p1:a', expectedRevision:current.revision})
    const ownerState = await readLineupState(f.db, rep)
    delay.release()
    expect(await outcome).toMatchObject({error:{code:'revision_conflict',status:409}})
    expect(await readLineupState(f.db, rep)).toEqual(ownerState)
    clock.mockReturnValue(f.receivedAt + 100_000)
    expect(await getWorkspaceLineup(f.db, rep)).toMatchObject({connection:'offline',
      entries:[{id:'p1:b'}], heldEntries:[{id:'p1:a'}]})
    expect(await getEffectiveLiveQueueSnapshot(f.db, rep)).toMatchObject({queue:[], isFresh:false, ageSeconds:101})
  } finally { delay.release(); clock.mockRestore(); await f.sql.close() }
}, 30_000)
