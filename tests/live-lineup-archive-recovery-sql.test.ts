import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import type { SupabaseClient } from '@supabase/supabase-js'
import { expect, it } from 'vitest'
import { listLineupArchives, readLineupArchive, recoverLineupArchive } from '@/lib/live-lineup/archive-recovery'
import { claimSource, getEffectiveLiveQueueSnapshot, hashPublisherToken, readLineupState, receiveSource } from '@/lib/live-lineup/service'
import { createLineupState, isLineupState } from '@/lib/live-lineup/model'
import type { LineupState } from '@/lib/live-lineup/types'

/** Only maps service queries into embedded SQL. No network, auth simulation, or concurrency claim. */
function adapter(sql:PGlite):SupabaseClient {
  const id=(value:string)=>{if(!/^[a-z_]+$/.test(value))throw Error('Unsafe fixture identifier');return `"${value}"`}
  const normalize=(value:unknown)=>JSON.parse(JSON.stringify(value))
  class Query {
    fields='*'; filters:[string,string,unknown][]=[]; maximum=1000; single=false; descending=false
    constructor(public table:string){if(!['live_lineup_states','live_lineup_show_archives','live_lineup_publisher_tokens'].includes(table))throw Error('Unexpected table')}
    select(fields:string){this.fields=fields.split(',').map(id).join(',');return this}
    eq(key:string,value:unknown){this.filters.push([id(key),'=',value]);return this}
    lt(key:string,value:unknown){this.filters.push([id(key),'<',value]);return this}
    limit(n:number){if(!Number.isSafeInteger(n)||n<1)throw Error('Invalid limit');this.maximum=n;return this}
    order(key:string,options:{ascending:boolean}){if(key!=='generation'||options.ascending)throw Error('Unexpected archive sort');this.descending=true;return this}
    maybeSingle(){this.single=true;return this}
    async run(){try{
      const result=await sql.query(`select ${this.fields} from ${id(this.table)} where ${this.filters.map(([key,op],index)=>`${key}${op}$${index+1}`).join(' and ')}${this.descending?' order by generation desc':''} limit ${this.maximum}`,this.filters.map(([, ,value])=>value))
      if(this.single&&result.rows.length>1)throw Error('Nonunique read')
      return {data:normalize(this.single?result.rows[0]??null:result.rows),error:null}
    }catch(error){return {data:null,error}}}
    then(resolve:(value:unknown)=>unknown,reject?:(error:unknown)=>unknown){return this.run().then(resolve,reject)}
  }
  return {from:(table:string)=>new Query(table),rpc:async(name:string,args:Record<string,unknown>)=>{
    if(name!=='live_lineup_compare_swap'||Object.keys(args).sort().join(',')!=='p_expected_revision,p_rep_id,p_state,p_token_id')throw Error('Unexpected RPC')
    try{return {data:normalize((await sql.query('select * from live_lineup_compare_swap($1,$2,$3,$4)',[args.p_rep_id,args.p_expected_revision,JSON.stringify(args.p_state),args.p_token_id])).rows),error:null}}
    catch(error){return {data:null,error}}
  }} as unknown as SupabaseClient
}

it('recovers through actual services and exact additive SQL, preserving archives and fencing the source',async()=>{
  const sql=new PGlite()
  const rep='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222'
  const publisher='33333333-3333-4333-8333-333333333333',nonce='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',newNonce='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
  const token=`sslp_${'a'.repeat(43)}`
  let T=0
  const iso=(offset:number)=>new Date(T+offset).toISOString()
  function state(generation:number):LineupState{return {...createLineupState(),revision:generation+5,
    show:{generation,partyIds:['p1','p2'],excludedPartyIds:['p2'],carryEntryIds:[],startedAt:iso(-5000)},
    entries:generation===1?[{id:'p1:recovered',name:'Archived waiting',orderedAt:T-10000},{id:'p2:archive-held',name:'Archived held',orderedAt:T-10000}]
      :[{id:'p1:today',name:'Current customer',orderedAt:T},{id:'p2:held',name:'Current hold',orderedAt:T}],
    order:generation===1?['p1:recovered']:['p1:today'],held:generation===1?['p2:archive-held']:['p2:held'],
    undo:generation===1?null:{order:['p2:held','p1:today'],held:[]},
    publisher:{id:publisher,claimId:nonce,epoch:2,lastSequence:0,leaseExpiresAt:iso(90000)},
    lastReadyAt:iso(0),lastReceivedAt:iso(0),lastChangedAt:iso(0),parserState:'ready',sourceVersion:'2'}}
  try{
    await sql.exec('create role anon; create role authenticated; create role service_role bypassrls; create table reps(id uuid primary key);')
    await sql.query('insert into reps values($1),($2)',[rep,other])
    await sql.exec(readFileSync(new URL('../supabase/migrations/20260910000100_live_lineup_v2.sql',import.meta.url),'utf8'))
    // Lease age starts after embedded-database initialization, not before it.
    T=Date.now()-10000
    const current=state(2),archived=state(1)
    expect(isLineupState(current)).toBe(true);expect(isLineupState(archived)).toBe(true)
    await sql.query('insert into live_lineup_states(rep_id,revision,state) values($1,$2,$3)',[rep,current.revision,JSON.stringify(current)])
    await sql.query('insert into live_lineup_show_archives(rep_id,generation,revision,state) values($1,1,$2,$3)',[rep,archived.revision,JSON.stringify(archived)])
    await sql.query("insert into live_lineup_publisher_tokens(id,rep_id,token_hash,label,created_at,expires_at) values($1,$2,$3,'Synthetic source',$4,$5)",[publisher,rep,hashPublisherToken(token),iso(-1000),iso(86400000)])
    await sql.exec('set role service_role')
    const db=adapter(sql),request={archiveGeneration:1,archiveRevision:archived.revision,expectedRevision:current.revision,entryIds:['p2:archive-held','p1:recovered'],confirmed:true}
    expect((await listLineupArchives(db,rep)).archives.map(a=>a.generation)).toEqual([1])
    expect((await readLineupArchive(db,rep,1)).candidates.map(e=>e.id)).toEqual(['p1:recovered','p2:archive-held'])
    await expect(readLineupArchive(db,other,1)).rejects.toMatchObject({code:'archive_not_found'})
    // An archive insertion conflict must not leave a half-applied recovery.
    await sql.query('insert into live_lineup_show_archives(rep_id,generation,revision,state) values($1,2,$2,$3)',[rep,current.revision,JSON.stringify(current)])
    await expect(recoverLineupArchive(db,rep,request,T+1000)).rejects.toMatchObject({code:'lineup_unavailable'})
    expect(await readLineupState(db,rep)).toEqual(current)
    await sql.exec('reset role')
    await sql.query('delete from live_lineup_show_archives where rep_id=$1 and generation=2',[rep])
    await sql.exec('set role service_role')
    const recovered=await recoverLineupArchive(db,rep,request,T+1000)
    expect(recovered.management?.generation).toBe(3)
    expect(recovered.entries.map(e=>e.id)).toEqual(['p1:today'])
    const saved=(await readLineupState(db,rep))!
    expect(saved.order).toEqual(current.order)
    expect(saved.held).toEqual(['p2:held','p1:recovered','p2:archive-held'])
    expect(saved.show).toEqual({...current.show,generation:3,carryEntryIds:['p1:recovered','p2:archive-held']})
    expect(saved.undo).toBeNull();expect(saved.lastReadyAt).toBe(current.lastReadyAt)
    const history=(await sql.query<{generation:number;state:LineupState}>('select generation,state from live_lineup_show_archives where rep_id=$1 order by generation',[rep])).rows
    expect(history).toEqual([{generation:1,state:archived},{generation:2,state:current}])
    const page=await listLineupArchives(db,rep,{limit:1})
    expect(page.nextBeforeGeneration).toBe(2)
    expect((await listLineupArchives(db,rep,{limit:1,beforeGeneration:2})).archives.map(a=>a.generation)).toEqual([1])
    expect((await getEffectiveLiveQueueSnapshot(db,rep,T+1000))?.queue).toEqual(['Current customer'])
    await expect(recoverLineupArchive(db,rep,request,T+1100)).rejects.toMatchObject({code:'revision_conflict'})
    const packet={publisherId:publisher,generation:2,epoch:2,sequence:1,sourceVersion:'2',parserState:'ready',entries:[],revealedIds:[],revealedEntries:[]}
    await expect(receiveSource(db,token,packet,T+1100)).rejects.toMatchObject({code:'show_changed'})
    const claim=await claimSource(db,token,newNonce,T+1200,3)
    expect(claim.epoch).toBe(3)
    await receiveSource(db,token,{...packet,generation:3,epoch:3,sequence:0,entries:archived.entries},T+1300)
    expect((await readLineupState(db,rep))?.held).toEqual(saved.held)
    expect((await getEffectiveLiveQueueSnapshot(db,rep,T+1300))?.queue).toEqual(['Current customer'])
    // Archive immutability is part of the service's validated-read-before-CAS contract.
    await expect(sql.query('update live_lineup_show_archives set revision=revision+1')).rejects.toMatchObject({code:'42501'})
    await sql.exec('reset role; set role anon')
    await expect(sql.query('select * from live_lineup_show_archives')).rejects.toMatchObject({code:'42501'})
  }finally{await sql.close()}
},30000)
