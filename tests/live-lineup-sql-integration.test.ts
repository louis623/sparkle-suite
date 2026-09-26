import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { lineupSqlAdapter as adapter } from './fixtures/live-lineup-sql-adapter'
import { expect, it } from 'vitest'
import { changeLineup, claimSource, describeSource, getEffectiveLiveQueueSnapshot, getWorkspaceLineup, issuePublisher, listPublishers, receiveSource, revokePublisher } from '@/lib/live-lineup/service'
import { readLineupSetupReadiness } from '@/lib/live-lineup/setup-readiness'

/** SQL-backed transport shim only: the service and exact migration are real.
 * No Supabase URL/client, environment lookup, filesystem DB, or outbound network.
 * PGlite has ONE connection: these tests do not establish concurrent lock behavior.
 */

it('runs pairing, source, owner arrangements, visibility, show fencing, archives and revocation through exact SQL', async () => {
  const sql = new PGlite()
  const rep = '11111111-1111-4111-8111-111111111111', other = '22222222-2222-4222-8222-222222222222'
  const nonce = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', nextNonce = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
  try {
    await sql.exec('create role anon; create role authenticated; create role service_role bypassrls; create table reps(id uuid primary key); create table live_queue(rep_id uuid, sync_code text, queue jsonb, last_updated timestamptz); grant select on live_queue to service_role;')
    await sql.query('insert into reps values($1),($2)', [rep, other])
    await sql.exec(readFileSync(new URL('../supabase/migrations/20260910000100_live_lineup_v2.sql', import.meta.url), 'utf8'))
    await sql.exec(readFileSync(new URL('../supabase/migrations/20260926000100_live_lineup_atomic_observations.sql',import.meta.url),'utf8'))
    await sql.exec('set role service_role')
    // Start the short lease clock after WASM/database startup. Startup latency
    // is not publisher idle time and must not expire the replay fixture.
    const now = Date.now() - 20_000
    const db = adapter(sql)
    const issued = await issuePublisher(db, rep, 'Synthetic laptop', now)
    const additional = []
    for (let index = 1; index < 8; index++) additional.push(await issuePublisher(db, rep, `Synthetic laptop ${index}`, now))
    expect((await listPublishers(db, rep)).filter(p => !p.revokedAt)).toHaveLength(8)
    await expect(issuePublisher(db, rep, 'Synthetic ninth laptop', now)).rejects.toMatchObject({code:'publisher_limit_reached', status:409})
    await revokePublisher(db, rep, additional[0].publisher.id)
    const afterRetirement = await issuePublisher(db, rep, 'Synthetic replacement slot', now)
    const listed = await listPublishers(db, rep)
    expect(listed.filter(p => !p.revokedAt).map(p => p.id).sort()).toEqual(
      [issued.publisher.id, ...additional.slice(1).map(item => item.publisher.id), afterRetirement.publisher.id].sort(),
    )
    const credentialCounts = await sql.query<{total:number; active:number}>('select count(*)::int total,count(*) filter(where revoked_at is null and expires_at > transaction_timestamp())::int active from live_lineup_publisher_tokens where rep_id=$1',[rep])
    expect(credentialCounts.rows[0]).toEqual({total:9,active:8})
    expect(await readLineupSetupReadiness(db, rep, now)).toMatchObject({ready:false, reason:'not_initialized'})
    expect(await describeSource(db, issued.token, now)).toMatchObject({protocol: 2, generation: 0, scope: null})
    const claim = await claimSource(db, issued.token, nonce, now, 0)
    expect(await claimSource(db, issued.token, nonce, now + 1, 0)).toMatchObject({epoch: claim.epoch, revision: claim.revision})
    const entries = ['p1:a','p1:b','p2:c'].map(id => ({id, name: 'Jessica', orderedAt: now}))
    const packet = {publisherId: issued.publisher.id, epoch: claim.epoch, generation: 0, sequence: 0, parserState: 'ready', sourceVersion: 'synthetic-v2', entries, revealedIds: []}
    await receiveSource(db, issued.token, packet, now + 1000)
    const readiness = await readLineupSetupReadiness(db, rep, now + 1000)
    expect(readiness).toMatchObject({protocol:2, ready:true, reason:'ready', generation:0})
    expect(Object.keys(readiness).sort()).toEqual(['checkedAt','generation','lastReadyAt','protocol','ready','reason','revision'].sort())
    let workspace = await getWorkspaceLineup(db, rep, now + 1000)
    expect(workspace.entries.map(e => e.id)).toEqual(entries.map(e => e.id))
    workspace = await changeLineup(db, rep, {type: 'hold', entryId: 'p1:a', expectedRevision: workspace.revision}, now + 1100)
    workspace = await changeLineup(db, rep, {type: 'move', entryId: 'p2:c', beforeEntryId: 'p1:b', expectedRevision: workspace.revision}, now + 1200)
    await receiveSource(db, issued.token, {...packet, sequence: 1}, now + 2000)
    workspace = await getWorkspaceLineup(db, rep, now + 2000)
    expect(workspace.entries.map(e => e.id)).toEqual(['p2:c','p1:b'])
    expect(workspace.heldEntries.map(e => e.id)).toEqual(['p1:a'])
    const priorRevision = workspace.revision
    workspace = await changeLineup(db, rep, {type:'start-show', expectedRevision: priorRevision, confirmed:true, partyIds:['p1','p2'], carryEntryIds:entries.map(e => e.id)}, now + 2100)
    expect((await readLineupSetupReadiness(db, rep, now + 2200)).ready).toBe(false)
    const archive = await sql.query<{revision: number; state: {held: string[]}}>('select revision,state from live_lineup_show_archives where rep_id=$1 and generation=0', [rep])
    expect(Number(archive.rows[0].revision)).toBe(priorRevision)
    expect(archive.rows[0].state.held).toEqual(['p1:a'])
    // A delayed owner's already-computed write must not replace the new show or
    // create a second archive. This is stale-CAS proof, not simultaneous sessions.
    const staleState = {...archive.rows[0].state, revision: priorRevision + 1}
    const staleWrite = await db.rpc('live_lineup_compare_swap', {p_rep_id:rep, p_expected_revision:priorRevision, p_state:staleState, p_token_id:null})
    expect(staleWrite.error).toBeNull()
    expect(staleWrite.data).toEqual([])
    expect((await sql.query('select * from live_lineup_show_archives where rep_id=$1', [rep])).rows).toHaveLength(1)
    expect((await getWorkspaceLineup(db, rep, now + 2200, true)).management?.generation).toBe(1)
    await expect(receiveSource(db, issued.token, {...packet, sequence: 2}, now + 3000)).rejects.toMatchObject({code:'show_changed'})
    const freshClaim = await claimSource(db, issued.token, nextNonce, now + 3100, 1)
    expect(freshClaim.epoch).toBeGreaterThan(claim.epoch)
    await receiveSource(db, issued.token, {...packet, generation:1, epoch:freshClaim.epoch, sequence:0}, now + 4000)
    workspace = await getWorkspaceLineup(db, rep, now + 4000)
    workspace = await changeLineup(db, rep, {type:'filter-parties', excludedPartyIds:['p1'], expectedRevision:workspace.revision}, now + 4100)
    expect(workspace.entries.map(e => e.id)).toEqual(['p2:c'])
    expect(workspace.management?.candidates).toHaveLength(3)
    expect(workspace.heldEntries).toEqual([])
    const publicView = await getEffectiveLiveQueueSnapshot(db, rep, now + 4200)
    expect(publicView?.queue).toEqual(['Jessica'])
    for (const privateValue of [issued.token, issued.publisher.id, 'p1:a', 'p2:c', 'candidates', 'heldEntries']) expect(JSON.stringify(publicView)).not.toContain(privateValue)
    workspace = await changeLineup(db, rep, {type:'filter-parties', excludedPartyIds:[], expectedRevision:workspace.revision}, now + 4300)
    expect(workspace.entries.map(e => e.id)).toEqual(['p2:c','p1:b'])
    expect(workspace.heldEntries.map(e => e.id)).toEqual(['p1:a'])
    await expect(revokePublisher(db, other, issued.publisher.id)).rejects.toMatchObject({code:'publisher_not_found'})
    await revokePublisher(db, rep, issued.publisher.id)
    expect((await readLineupSetupReadiness(db, rep)).ready).toBe(false)
    await expect(receiveSource(db, issued.token, {...packet, generation:1, epoch:freshClaim.epoch, sequence:1}, Date.now())).rejects.toMatchObject({code:'unauthorized'})
    const replacement = await issuePublisher(db, rep, 'Synthetic replacement')
    const replacementClaim = await claimSource(db, replacement.token, nonce, Date.now(), 1)
    expect(replacementClaim.epoch).toBeGreaterThan(freshClaim.epoch)
    expect((await getWorkspaceLineup(db, rep)).entries.map(e => e.id)).toEqual(['p2:c','p1:b'])
    expect((await getWorkspaceLineup(db, other)).entries).toEqual([])
    await sql.exec('reset role; set role anon')
    await expect(sql.query('select * from live_lineup_show_archives')).rejects.toMatchObject({code:'42501'})
    await expect(sql.query('select * from live_lineup_publisher_tokens')).rejects.toMatchObject({code:'42501'})
  } finally { await sql.close() }
}, 30_000)
