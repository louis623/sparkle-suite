import { describe, expect, it } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { buildArchiveRecoveryState, listLineupArchives, readLineupArchive, recoverLineupArchive, type LineupArchive } from '@/lib/live-lineup/archive-recovery'
import { applyLineupCommand, applySourcePacket, buildWorkspaceLineupSnapshot, claimPublisher, createLineupState, isLineupState } from '@/lib/live-lineup/model'
import { getEffectiveLiveQueueSnapshot } from '@/lib/live-lineup/service'
import type { LineupState } from '@/lib/live-lineup/types'

const T = Date.parse('2026-09-09T12:00:00.000Z'), iso = (offset: number) => new Date(T + offset).toISOString()
const nonce = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', nextNonce = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const entry = (id: string) => ({id, name:'Synthetic Jessica', orderedAt:T-10000})
function ready(generation: number, ids: string[], held: string[] = []): LineupState {
  return {...createLineupState(), revision:generation+2,
    show:generation ? {generation,partyIds:['p1','p2'],excludedPartyIds:['p2'],carryEntryIds:[],startedAt:iso(-5000)} : null,
    entries:[...ids,...held].map(entry),order:ids,held,
    publisher:{id:'device',claimId:nonce,epoch:7,lastSequence:4,leaseExpiresAt:iso(90000)},
    lastReadyAt:iso(0),lastReceivedAt:iso(0),lastChangedAt:iso(0),parserState:'ready',sourceVersion:'2'}
}
function fixture() {
  const current=ready(2,['p1:current','p2:hidden'],['p1:held'])
  current.undo={order:['p1:current','p1:recover-a'],held:['p1:held']}
  current.revealedIds=['p1:revealed']
  current.show!.carryEntryIds=['p1:current']
  const archiveState=ready(1,['p1:recover-b','p1:recover-a','p1:current','p1:revealed'],['p2:recover-held'])
  const archive:LineupArchive={generation:1,revision:archiveState.revision,archivedAt:iso(100),state:archiveState}
  const request={archiveGeneration:archive.generation,archiveRevision:archive.revision,expectedRevision:current.revision,
    entryIds:['p2:recover-held','p1:recover-a','p1:recover-b'],confirmed:true as const}
  return {current,archive,request}
}
type Row = Record<string, any>
function database() {
  const f=fixture()
  const rows:Record<string,Row[]>={live_lineup_states:[{rep_id:'owner',revision:f.current.revision,state:structuredClone(f.current)}],
    live_lineup_show_archives:[{rep_id:'owner',generation:f.archive.generation,revision:f.archive.revision,archived_at:f.archive.archivedAt,state:structuredClone(f.archive.state)}]}
  const calls:{table:string;filters:[string,string,unknown][];maximum:number}[]=[]
  let readError=false, conflict=false, writes=0
  class Query {
    filters:[string,string,unknown][]=[]; maximum=Infinity; single=false; descending=false
    constructor(public table:string){}
    select(){return this}
    eq(key:string,value:unknown){this.filters.push([key,'eq',value]);return this}
    lt(key:string,value:unknown){this.filters.push([key,'lt',value]);return this}
    order(_key:string,options:{ascending:boolean}){this.descending=!options.ascending;return this}
    limit(n:number){this.maximum=n;return this}
    maybeSingle(){this.single=true;return this}
    then(resolve:(result:unknown)=>unknown,reject?:(error:unknown)=>unknown){return Promise.resolve().then(()=>{
      calls.push({table:this.table,filters:this.filters,maximum:this.maximum})
      if(readError)return {data:null,error:{code:'offline'}}
      let selected=rows[this.table].filter(row=>this.filters.every(([key,op,value])=>op==='eq'?row[key]===value:row[key]<(value as number)))
      if(this.descending)selected=[...selected].sort((a,b)=>b.generation-a.generation)
      selected=selected.slice(0,this.maximum)
      if(this.single&&selected.length>1)return {data:null,error:{code:'PGRST116'}}
      return {data:structuredClone(this.single?selected[0]??null:selected),error:null}
    }).then(resolve,reject)}
  }
  const db={from:(table:string)=>new Query(table),rpc:async(name:string,args:Row)=>{
    expect(name).toBe('live_lineup_compare_swap'); expect(args.p_token_id).toBeNull()
    const prior=rows.live_lineup_states.find(row=>row.rep_id===args.p_rep_id)
    if(conflict||!prior||prior.revision!==args.p_expected_revision)return {data:[],error:null}
    expect(args.p_state.show.generation).toBe(prior.state.show.generation+1)
    rows.live_lineup_show_archives.push({rep_id:args.p_rep_id,generation:prior.state.show.generation,revision:prior.revision,archived_at:iso(1000),state:structuredClone(prior.state)})
    Object.assign(prior,{revision:args.p_state.revision,state:structuredClone(args.p_state)});writes++
    return {data:[structuredClone(prior)],error:null}
  }}
  return {...f,db:db as unknown as SupabaseClient,rows,calls,fail:()=>{readError=true},conflict:()=>{conflict=true},writes:()=>writes}
}

describe('Archive recovery deterministic safety',()=>{
  it('recovers into Hold in archive order without changing current order, holds, scope, start, visibility, or freshness',()=>{
    const {current,archive,request}=fixture(), before=structuredClone({current,archive,request})
    expect(isLineupState(current)).toBe(true);expect(isLineupState(archive.state)).toBe(true)
    const next=buildArchiveRecoveryState(current,archive,request,T+1000)
    expect(isLineupState(next)).toBe(true)
    expect(next.order).toEqual(current.order)
    expect(next.held).toEqual(['p1:held','p1:recover-b','p1:recover-a','p2:recover-held'])
    expect(next.show).toEqual({...current.show,generation:3,carryEntryIds:['p1:current','p1:recover-b','p1:recover-a','p2:recover-held']})
    expect(next.lastReadyAt).toBe(current.lastReadyAt)
    expect(next.revealedIds).toEqual(current.revealedIds)
    expect(next.undo).toBeNull()
    expect(next.publisher).toEqual({...current.publisher,lastSequence:-1,leaseExpiresAt:iso(1000)})
    expect(next.lastReceivedAt).toBeNull();expect(next.sourceVersion).toBeNull();expect(next.parserState).toBe('loading')
    expect(buildWorkspaceLineupSnapshot(next,T+1000).entries).toEqual(buildWorkspaceLineupSnapshot(current,T).entries)
    expect({current,archive,request}).toEqual(before)
  })
  it.each([null,{confirmed:undefined}, {confirmed:false}, {entryIds:[]}, {entryIds:['p1:recover-a','p1:recover-a']},
    {entryIds:['bad id']}, {entryIds:Array.from({length:2001},(_,i)=>`p1:${i}`)}, {archiveGeneration:-1},
    {archiveRevision:'3'}, {expectedRevision:1.1}])('rejects malformed or unconfirmed selection %#',change=>{
    const {current,archive,request}=fixture()
    expect(()=>buildArchiveRecoveryState(current,archive,change===null?null:{...request,...change},T+1000)).toThrow()
  })
  it.each([
    [{expectedRevision:1},'revision_conflict'],[{archiveRevision:99},'archive_changed'],[{archiveGeneration:0},'archive_changed'],
    [{entryIds:['p1:current']},'entry_already_present'],[{entryIds:['p1:revealed']},'entry_already_revealed'],
    [{entryIds:['p1:missing']},'archive_entry_not_found'],
  ])('rejects stale archive/current state or unsafe identities %#',(change,code)=>{
    const {current,archive,request}=fixture()
    try{buildArchiveRecoveryState(current,archive,{...request,...change},T+1000);throw Error('Accepted invalid recovery')}
    catch(error){expect(error).toMatchObject({code,status:409})}
  })
  it('never expands party scope or recovers from the active/future generation',()=>{
    const {current,archive,request}=fixture()
    archive.state.entries.push(entry('p3:out'));archive.state.order.push('p3:out');archive.state.show!.partyIds.push('p3')
    expect(()=>buildArchiveRecoveryState(current,archive,{...request,entryIds:['p3:out']},T+1000)).toThrow('invalid_scope')
    current.show!.generation=1
    expect(()=>buildArchiveRecoveryState(current,archive,request,T+1000)).toThrow('invalid_scope')
  })
  it('can recover a selected stable party identity from a generation-zero archive without reviving its old publisher',()=>{
    const {current,archive,request}=fixture()
    archive.state.show=null;archive.generation=0
    archive.state.publisher!.id='archived-device';archive.state.publisher!.epoch=100
    const next=buildArchiveRecoveryState(current,archive,{...request,archiveGeneration:0},T+1000)
    expect(next.publisher!.id).toBe('device');expect(next.publisher!.epoch).toBe(7)
    expect(next.show!.generation).toBe(3)
  })
  it('rejects corrupted archive state, invalid clocks and revision/generation overflow',()=>{
    const {current,archive,request}=fixture()
    expect(()=>buildArchiveRecoveryState(current,{...archive,state:{...archive.state,order:[]}},request,T+1000)).toThrow('invalid_lineup_archive')
    for(const now of [NaN,Infinity,T-1,-1,8_640_000_000_000_001])expect(()=>buildArchiveRecoveryState(current,archive,request,now)).toThrow('invalid_time')
    current.revision=Number.MAX_SAFE_INTEGER
    expect(()=>buildArchiveRecoveryState(current,archive,{...request,expectedRevision:current.revision},T+1000)).toThrow('capacity_exceeded')
    current.revision=request.expectedRevision;current.show!.generation=Number.MAX_SAFE_INTEGER
    expect(()=>buildArchiveRecoveryState(current,archive,request,T+1000)).toThrow('capacity_exceeded')
  })
  it('enforces both active-entry and carry-metadata limits without truncating selected customers',()=>{
    const {archive}=fixture(), current=ready(2,Array.from({length:2000},(_,i)=>`p1:${i}`))
    const request={archiveGeneration:1,archiveRevision:archive.revision,expectedRevision:current.revision,entryIds:['p1:recover-a'],confirmed:true}
    expect(()=>buildArchiveRecoveryState(current,archive,request,T+1000)).toThrow('capacity_exceeded')
    current.entries=[];current.order=[];current.show!.carryEntryIds=Array.from({length:2000},(_,i)=>`p1:${i}`)
    expect(()=>buildArchiveRecoveryState(current,archive,request,T+1000)).toThrow('capacity_exceeded')
  })
  it('fences old packets, retains carry recovery through resync, and admits orders arriving since the original show start',()=>{
    const {current,archive,request}=fixture(), next=buildArchiveRecoveryState(current,archive,request,T+1000)
    const packet={generation:2,publisherId:'device',epoch:7,sequence:5,sourceVersion:'2',parserState:'ready',entries:[],revealedIds:[],revealedEntries:[]}
    expect(applySourcePacket(next,packet,T+1100)).toEqual({ok:false,code:'show_changed'})
    expect(claimPublisher(next,'device',next.revision,T+1100,{claimId:nextNonce,generation:2})).toEqual({ok:false,code:'show_changed'})
    const claimed=claimPublisher(next,'device',next.revision,T+1100,{claimId:nextNonce,generation:3})
    if(!claimed.ok)throw Error(claimed.code)
    const result=applySourcePacket(claimed.state,{...packet,generation:3,epoch:8,sequence:0,
      entries:[entry('p1:recover-a'),{id:'p1:arrived-before-recovery',name:'Synthetic arrival',orderedAt:T+500}]},T+1200)
    if(!result.ok)throw Error(result.code)
    expect(result.state.held).toEqual(next.held)
    expect(result.state.order).toEqual([...current.order,'p1:arrived-before-recovery'])
    expect(applyLineupCommand(result.state,{type:'undo',expectedRevision:result.state.revision},T+1300)).toEqual({ok:false,code:'nothing_to_undo'})
  })
})

describe('Owner-only archive services',()=>{
  it('returns bounded, stable cursor pages of summaries without raw state or customer names',async()=>{
    const d=database()
    for(let generation=2;generation<=5;generation++){
      const state=ready(generation,['p1:sample'])
      d.rows.live_lineup_show_archives.push({rep_id:'owner',generation,revision:state.revision,state,archived_at:iso(100)})
    }
    d.rows.live_lineup_show_archives.push({...d.rows.live_lineup_show_archives[0],rep_id:'other',generation:99})
    const first=await listLineupArchives(d.db,'owner',{limit:2})
    expect(first.archives.map(a=>a.generation)).toEqual([5,4]);expect(first.nextBeforeGeneration).toBe(4)
    const second=await listLineupArchives(d.db,'owner',{limit:2,beforeGeneration:first.nextBeforeGeneration!})
    expect(second.archives.map(a=>a.generation)).toEqual([3,2])
    const last=await listLineupArchives(d.db,'owner',{limit:2,beforeGeneration:second.nextBeforeGeneration!})
    expect(last.archives.map(a=>a.generation)).toEqual([1]);expect(last.nextBeforeGeneration).toBeNull()
    expect(d.calls.every(c=>c.maximum===3&&c.filters.some(([key,,value])=>key==='rep_id'&&value==='owner'))).toBe(true)
    expect(JSON.stringify(first)).not.toMatch(/Synthetic|claimId|publisher|state|revealed|undo|rep_id/)
    for(const options of [{limit:0},{limit:21},{limit:1.5},{beforeGeneration:-1}])await expect(listLineupArchives(d.db,'owner',options)).rejects.toMatchObject({status:400})
  })
  it('reads only the selected owner archive and returns sanitized candidates in archived order',async()=>{
    const d=database(), detail=await readLineupArchive(d.db,'owner',1)
    expect(detail.candidates.map(e=>e.id)).toEqual([...d.archive.state.order,...d.archive.state.held])
    expect(JSON.stringify(detail)).not.toMatch(/claimId|device|leaseExpiresAt|lastSequence|sourceVersion|revealedIds|undo|rep_id/)
    await expect(readLineupArchive(d.db,'other',1)).rejects.toMatchObject({code:'archive_not_found'})
    await expect(readLineupArchive(d.db,'owner',-1)).rejects.toMatchObject({status:400})
  })
  it('saves the exact held-only transition, archives the current show, and never auto-publishes recovered names',async()=>{
    const d=database(), before=structuredClone(d.rows), publicBefore=await getEffectiveLiveQueueSnapshot(d.db,'owner',T)
    const result=await recoverLineupArchive(d.db,'owner',{...d.request,repId:'victim',entries:[{id:'p1:recover-a',name:'Attacker supplied'}]},T+1000)
    expect(result.management?.generation).toBe(3)
    expect(d.writes()).toBe(1)
    expect(d.rows.live_lineup_show_archives[1].state).toEqual(before.live_lineup_states[0].state)
    expect(d.rows.live_lineup_show_archives[0]).toEqual(before.live_lineup_show_archives[0])
    expect((await getEffectiveLiveQueueSnapshot(d.db,'owner',T+1000))?.queue).toEqual(publicBefore?.queue)
    expect(JSON.stringify(result)).not.toMatch(/Attacker supplied|victim|device|claimId/)
    await expect(recoverLineupArchive(d.db,'owner',d.request,T+1100)).rejects.toMatchObject({code:'revision_conflict'})
    expect(d.writes()).toBe(1)
  })
  it('rejects other-tenant recovery, changed archive revision, and stale commit without mutation',async()=>{
    const d=database(), before=structuredClone(d.rows)
    await expect(recoverLineupArchive(d.db,'other',d.request,T+1000)).rejects.toMatchObject({code:'upgraded_source_required'})
    await expect(recoverLineupArchive(d.db,'owner',{...d.request,archiveRevision:999},T+1000)).rejects.toMatchObject({code:'archive_changed'})
    d.conflict()
    await expect(recoverLineupArchive(d.db,'owner',d.request,T+1000)).rejects.toMatchObject({code:'revision_conflict'})
    expect(d.rows).toEqual(before);expect(d.writes()).toBe(0)
  })
  it('rejects wrong-tenant and malformed stored archives, and unavailable reads rather than silently hiding history',async()=>{
    for(const change of [{generation:99},{revision:999},{state:{}},{archived_at:'never'}]){
      const d=database();Object.assign(d.rows.live_lineup_show_archives[0],change)
      await expect(listLineupArchives(d.db,'owner')).rejects.toMatchObject({code:'invalid_lineup_archive'})
    }
    const d=database();d.fail()
    await expect(listLineupArchives(d.db,'owner')).rejects.toMatchObject({code:'archives_unavailable'})
    await expect(readLineupArchive(d.db,'owner',1)).rejects.toMatchObject({code:'archives_unavailable'})
  })
  it('fails closed even when a broken database adapter returns another tenant’s archive',async()=>{
    const d=database(), foreign={...d.rows.live_lineup_show_archives[0],rep_id:'other'}
    const query={select(){return this},eq(){return this},maybeSingle:async()=>({data:foreign,error:null})}
    const broken={...d.db,from:()=>query} as unknown as SupabaseClient
    await expect(readLineupArchive(broken,'owner',1)).rejects.toMatchObject({code:'invalid_lineup_archive'})
    expect(d.writes()).toBe(0)
  })
  it('accepts exact JSONB receipts with reordered keys and bigint transport strings',async()=>{
    const d=database(),rpc=d.db.rpc.bind(d.db)
    d.db.rpc=(async(...args:any[])=>{const result=await (rpc as any)(...args);return {...result,data:result.data.map((row:Row)=>({...row,revision:String(row.revision),state:Object.fromEntries(Object.entries(row.state).reverse())}))}}) as unknown as typeof d.db.rpc
    expect((await recoverLineupArchive(d.db,'owner',d.request,T+1000)).management?.generation).toBe(3)
  })
  it('does not report success for wrong tenant/revision/state or absent CAS receipt',async()=>{
    const corruptions=[(row:Row)=>({...row,rep_id:'other'}),(row:Row)=>({...row,revision:999}),
      (row:Row)=>({...row,state:{...row.state,held:[]}}),(row:Row)=>({...row,state:{...row.state,order:[...row.state.order].reverse()}})]
    for(const corrupt of corruptions){
      const d=database(), rpc=d.db.rpc.bind(d.db)
      d.db.rpc=(async(...args:any[])=>{const result=await (rpc as any)(...args);return {...result,data:result.data.map(corrupt)}}) as unknown as typeof d.db.rpc
      await expect(recoverLineupArchive(d.db,'owner',d.request,T+1000)).rejects.toMatchObject({code:'invalid_lineup_receipt'})
    }
    for(const result of [{data:null,error:null},{data:null,error:{code:'offline'}}]){
      const d=database();d.db.rpc=(async()=>result) as unknown as typeof d.db.rpc
      await expect(recoverLineupArchive(d.db,'owner',d.request,T+1000)).rejects.toMatchObject({status:503})
    }
  })
})
