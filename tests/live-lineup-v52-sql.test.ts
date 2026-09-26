import {readFileSync} from 'node:fs'
import {PGlite} from '@electric-sql/pglite'
import {expect,it} from 'vitest'
import {lineupSqlAdapter} from './fixtures/live-lineup-sql-adapter'
import {applyLineupCommand,applySourcePacket,isLineupState} from '@/lib/live-lineup/model'
import {claimSource,configureSourceParties,getEffectiveLiveQueueSnapshot,getWorkspaceLineup,readLineupState,receiveSource} from '@/lib/live-lineup/service'
import type {LineupState,SourcePacket} from '@/lib/live-lineup/types'

const rep='11111111-1111-4111-8111-111111111111', A='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', B='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const D='dddddddd-dddd-4ddd-8ddd-dddddddddddd', code='ABC-1234'
const base=new URL('../supabase/migrations/20260910000100_live_lineup_v2.sql',import.meta.url)
const migration=new URL('../supabase/migrations/20260926000100_live_lineup_atomic_observations.sql',import.meta.url)
async function database(){
  const sql=new PGlite()
  await sql.exec('create role anon;create role authenticated;create role service_role bypassrls;create table reps(id uuid primary key);create table live_queue(rep_id uuid,sync_code text,queue jsonb,last_updated timestamptz);grant select on live_queue to service_role;')
  await sql.query('insert into reps values($1)',[rep]);await sql.query('insert into live_queue values($1,$2,$3,$4)',[rep,code,'[]',new Date().toISOString()])
  await sql.exec(readFileSync(base,'utf8'));await sql.exec(readFileSync(migration,'utf8'))
  return {sql,db:lineupSqlAdapter(sql)}
}
const packet=(s:LineupState,now:number,overrides:Partial<SourcePacket>={}):SourcePacket=>({publisherId:rep,claimId:s.publisher!.claimId,epoch:s.publisher!.epoch,
  generation:s.show?.generation ?? 0,sequence:s.publisher!.lastSequence+1,parserState:'ready',sourceVersion:'2.0.5',entries:s.entries,revealedIds:[],
  observation:{documentId:D,serial:s.publisher!.lastSequence+1,serverTime:new Date(now).toISOString(),settled:true},...overrides})

it('commits bootstrap, exact ownership/scope receipt, final scoped readiness and reveal/reversal atomically through real SQL',async()=>{
  const {sql,db}=await database()
  try{
    const T=Date.now()-10_000, entries=['a','b'].map(id=>({id:`p:${id}`,name:'April',lastName:'Smith',orderedAt:T}))
    await sql.exec('set role service_role')
    const claimed=await claimSource(db,code,A,T,0,'lineup-2.0.5')
    expect(claimed).toMatchObject({claimId:A,capabilities:'lineup-2.0.5'})
    let s=(await readLineupState(db,rep))!
    await receiveSource(db,code,packet(s,T+1000,{entries}),T+1000)
    expect((await getEffectiveLiveQueueSnapshot(db,rep,T+1000))?.queue).toEqual([])
    expect(await getWorkspaceLineup(db,rep,T+1000,true)).toMatchObject({canManage:false})
    await expect(configureSourceParties(db,code,0,['p'],[],T+1100)).rejects.toMatchObject({code:'publisher_conflict'})
    await expect(configureSourceParties(db,code,0,['p'],[],T+1100,{publisherId:rep,claimId:B,epoch:1,capabilities:'lineup-2.0.5'})).rejects.toMatchObject({code:'publisher_conflict'})
    const configured=await configureSourceParties(db,code,0,['p'],[],T+1100,{publisherId:rep,claimId:A,epoch:1,capabilities:'lineup-2.0.5'})
    expect(configured.configured).toEqual({applied:true,claimId:A,epoch:1,generation:1,partyIds:['p'],excludedPartyIds:[]})
    expect((await getEffectiveLiveQueueSnapshot(db,rep,T+1100))?.queue).toEqual([])
    await claimSource(db,code,B,T+1200,1,'lineup-2.0.5')
    s=(await readLineupState(db,rep))!
    await receiveSource(db,code,packet(s,T+2000,{entries}),T+2000)
    const publicState=await getEffectiveLiveQueueSnapshot(db,rep,T+2000)
    expect(publicState?.queue).toEqual(['April','April'])
    expect(publicState?.presentation?.entries[0]).toMatchObject({remainingOrders:2})
    for(const value of ['Smith','p:a','p:b',A,B,D])expect(JSON.stringify(publicState)).not.toContain(value)
    expect(await getWorkspaceLineup(db,rep,T+2000,true)).toMatchObject({canManage:true,tenantContext:rep})
    s=(await readLineupState(db,rep))!
    const reveal=packet(s,T+3000,{entries:[entries[1]],revealedIds:['p:a'],revealedEntries:[{id:'p:a',orderedAt:T}]})
    await receiveSource(db,code,reveal,T+3000)
    const committed=(await readLineupState(db,rep))!
    expect(committed.revealEvents).toHaveLength(1);expect(committed.revealEventCursor).toBe(1);expect(committed.restorations).toHaveLength(1)
    // Lost acknowledgement/retry does not commit a second event.
    await expect(receiveSource(db,code,reveal,T+3600)).rejects.toMatchObject({code:'stale_sequence'})
    expect((await readLineupState(db,rep))?.revealEventCursor).toBe(1)
    await receiveSource(db,code,packet(committed,T+4000,{entries}),T+4000)
    const restored=(await readLineupState(db,rep))!
    expect(restored.order).toEqual(['p:a','p:b']);expect(restored.revealEvents).toEqual([]);expect(restored.revealEventCursor).toBe(1)
    expect(restored.restorations).toEqual([])
    const stale=await db.rpc('live_lineup_commit',{p_rep_id:rep,p_expected_revision:committed.revision,p_state:{...committed,revision:committed.revision+1},p_token_id:null,p_guard:{kind:'owner'}})
    expect(stale.data).toEqual([]);expect((await readLineupState(db,rep))?.revision).toBe(restored.revision)
  }finally{await sql.close()}
},30_000)

it('rechecks freshness and exact claim after locking, with no partial state/cursor on failed commit',async()=>{
  const {sql,db}=await database()
  try{
    const now=Date.now(), old=now-46_000
    const state:LineupState={schemaVersion:2,revision:7,show:{generation:1,partyIds:['p'],excludedPartyIds:[],carryEntryIds:['p:a','p:b'],startedAt:new Date(old-1000).toISOString()},
      entries:[{id:'p:a',name:'A',orderedAt:old},{id:'p:b',name:'B',orderedAt:old}],order:['p:a','p:b'],held:[],revealedIds:[],undo:null,
      publisher:{id:rep,claimId:A,epoch:1,lastSequence:0,leaseExpiresAt:new Date(now+60_000).toISOString(),capabilities:'lineup-2.0.5'},
      lastReceivedAt:new Date(old).toISOString(),lastReadyAt:new Date(old).toISOString(),lastReadySourceAt:new Date(old).toISOString(),lastChangedAt:new Date(old).toISOString(),parserState:'ready',sourceVersion:'2.0.5',
      sourceObservation:{documentId:D,serial:0,epoch:1,generation:1,serverTime:new Date(old).toISOString(),settled:true},revealEvents:[],revealEventCursor:0,restorations:[]}
    expect(isLineupState(state)).toBe(true)
    await sql.query('insert into live_lineup_states(rep_id,revision,state) values($1,$2,$3)',[rep,state.revision,JSON.stringify(state)])
    const computed=applyLineupCommand(state,{type:'move',entryId:'p:a',beforeEntryId:null,expectedRevision:7},old+1)
    expect(computed.ok).toBe(true);if(!computed.ok)throw Error('fixture')
    const stale=await db.rpc('live_lineup_commit',{p_rep_id:rep,p_expected_revision:7,p_state:computed.state,p_token_id:null,p_guard:{kind:'owner',requireFresh:true}})
    expect(stale.error).toMatchObject({code:'55000'})
    // Original RPC cannot bypass this gate from an older application instance.
    const legacy=await db.rpc('live_lineup_compare_swap',{p_rep_id:rep,p_expected_revision:7,p_state:computed.state,p_token_id:null})
    expect(legacy.error).toMatchObject({code:'55000'})
    const candidate=applySourcePacket(state,packet(state,old+1000,{entries:[],revealedIds:['p:a'],revealedEntries:[{id:'p:a',orderedAt:old}]}),old+1000)
    expect(candidate.ok).toBe(true);if(!candidate.ok)throw Error('fixture')
    const expired=await db.rpc('live_lineup_commit',{p_rep_id:rep,p_expected_revision:7,p_state:candidate.state,p_token_id:null,p_guard:{kind:'source',claimId:A,epoch:1,generation:1,observationTime:new Date(old+1000).toISOString()}})
    expect(expired.error).toMatchObject({code:'55002'})
    const configure={...state,revision:8,show:{...state.show!,excludedPartyIds:['p']}}
    const wrong=await db.rpc('live_lineup_commit',{p_rep_id:rep,p_expected_revision:7,p_state:configure,p_token_id:null,p_guard:{kind:'configure',claimId:B,epoch:1,generation:1}})
    expect(wrong.error).toMatchObject({code:'55001'})
    const oldConfigure=await db.rpc('live_lineup_compare_swap',{p_rep_id:rep,p_expected_revision:7,p_state:configure,p_token_id:null})
    expect(oldConfigure.error).toMatchObject({code:'55001'})
    expect(await readLineupState(db,rep)).toEqual(state)
    const correct=await db.rpc('live_lineup_commit',{p_rep_id:rep,p_expected_revision:7,p_state:configure,p_token_id:null,p_guard:{kind:'configure',claimId:A,epoch:1,generation:1}})
    expect(correct.error).toBeNull();expect(correct.data).toHaveLength(1)
    await sql.exec('set role anon')
    await expect(sql.query('select * from live_lineup_commit($1,8,$2,null,$3)',[rep,JSON.stringify({...configure,revision:9}),JSON.stringify({kind:'owner'})])).rejects.toMatchObject({code:'42501'})
  }finally{await sql.close()}
},30_000)
