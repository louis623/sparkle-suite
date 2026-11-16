import { createRequire } from 'node:module'
import type { SupabaseClient } from '@supabase/supabase-js'
import { applyLineupCommand, applySourcePacket, claimPublisher, createLineupState, lineupFreshness } from '@/lib/live-lineup/model'
import { getEffectiveLiveQueueSnapshot } from '@/lib/live-lineup/service'
import type { LineupResult, LineupState, SourcePacket, PublisherDiagnostics } from '@/lib/live-lineup/types'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { expect, it } from 'vitest'
import { buildPublicLiveLineup } from '@/lib/amethyst/public-live-lineup'

it('projects an active invalid publisher lease as delayed past one hour and expires it after transit', () => {
  const snapshot = {
    syncCode: '', queue: ['Fixture'], queueLength: 1, currentCustomer: 'Fixture', onDeckCustomer: null,
    lastUpdated: '2026-11-13T16:00:00.000Z', ageSeconds: 7200, staleAfterSeconds: 45,
    isFresh: false, sourceReady: false, invalidHeartbeatRemainingSeconds: 80, revision: 9,
  }
  const delayed = buildPublicLiveLineup(snapshot)
  expect(delayed).toMatchObject({liveQueueState: 'delayed', liveQueueAgeSeconds: 7200,
    liveQueueLastUpdated: snapshot.lastUpdated, liveQueueSourceReady: false,
    liveQueueEntries: [{name: 'Fixture', highlight: false}]})
  const client = runInNewContext(readFileSync('public/amethyst/live-lineup.js', 'utf8') + '\nSparkleLiveLineup')
  const received = client.afterTransit(delayed, 10)
  expect(received.liveQueueRetainForSeconds).toBe(70)
  expect(client.unavailable(received, 0, 69).liveQueueState).toBe('delayed')
  expect(client.unavailable(received, 0, 71).liveQueueState).toBe('offline')
  expect(buildPublicLiveLineup({...snapshot, invalidHeartbeatRemainingSeconds: 0})).toMatchObject({liveQueueState:'offline',liveQueueEntries:[]})
})


it('2.0.9 integration preserves retained orders through reader replacement, new order and reveal', async () => {
  const {createPublisherClient} = createRequire(import.meta.url)('../chrome-extension/publisher-client.js')
  const publisherId='11111111-1111-4111-8111-111111111111', claimA='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', claimB='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
  const oldDocument='cccccccc-cccc-4ccc-8ccc-cccccccccccc', newDocument='dddddddd-dddd-4ddd-8ddd-dddddddddddd'
  const rep='22222222-2222-4222-8222-222222222222', token='TST-0001'
  let now=Date.parse('2026-11-16T17:00:00.000Z')
  const original=[{id:'P9:a',name:'First',orderedAt:now-2000},{id:'P9:b',name:'Second',orderedAt:now-1000}]
  const accepted=(result:LineupResult):LineupState=>{expect(result.ok).toBe(true);if(!result.ok)throw Error(result.code);return result.state}
  let server=accepted(claimPublisher(createLineupState(),publisherId,0,now,{claimId:claimA,generation:0,capabilities:'lineup-2.0.5'}))
  const baseline=(generation:number,claimId:string,serial:number):SourcePacket=>({publisherId,claimId,epoch:server.publisher!.epoch,sequence:0,generation,sourceVersion:'2.0.7',parserState:'ready',entries:original,revealedIds:[],revealedEntries:[],observation:{documentId:oldDocument,serial,serverTime:new Date(now).toISOString(),settled:true}})
  server=accepted(applySourcePacket(server,baseline(0,claimA,1),now))
  server=accepted(applyLineupCommand(server,{type:'start-show',partyIds:['P9'],carryEntryIds:original.map(row=>row.id),confirmed:true,expectedRevision:server.revision},++now))
  server=accepted(claimPublisher(server,publisherId,server.revision,++now,{claimId:claimB,generation:1,capabilities:'lineup-2.0.5'}))
  server=accepted(applySourcePacket(server,baseline(1,claimB,2),now))
  expect(server.order).toEqual(['P9:a','P9:b'])
  const fixtureQuery = {
    select() { return this },
    eq(_field: string, id: string) { expect(id).toBe(rep); return this },
    async maybeSingle() { return {data:{rep_id:rep,revision:server.revision,state:server},error:null} },
  }
  const fixtureDb = {
    from(name: string) { expect(name).toBe('live_lineup_states'); return fixtureQuery },
  } as unknown as SupabaseClient
  const publicFeed=async()=>buildPublicLiveLineup(await getEffectiveLiveQueueSnapshot(fixtureDb,rep,now))
  expect((await publicFeed()).liveQueueSourceReady).toBe(true)
  let local:Record<string,unknown>={token,enabled:true,configVersion:'fixture',generation:1,claimId:claimB,publisherId,epoch:server.publisher!.epoch,nextSequence:1,needsClaim:true}
  const packets:SourcePacket[]=[]
  let claimCount=0
  const client=createPublisherClient({now:()=>now,store:{load:async()=>local,update:async(version:string,patch:Record<string,unknown>)=>{
    expect(version).toBe('fixture');local={...local,...patch};return true
  }},post:async(credential:string,body:{action:string;claimId:string;generation:number;diagnostics?:PublisherDiagnostics;packet:SourcePacket})=>{
    // This harness supplies an authenticated transport; production HTTP auth is not mocked as a claim of coverage.
    expect(credential).toBe(token)
    if(body.action==='claim'){
      claimCount++;const before=server
      server=accepted(claimPublisher(server,publisherId,server.revision,now,{claimId:body.claimId,generation:body.generation,capabilities:'lineup-2.0.5',diagnostics:body.diagnostics}))
      expect(server).toBe(before) // same claim replay cannot renew or reset the old lease
      return{claimId:server.publisher!.claimId,capabilities:'lineup-2.0.5',generation:1,publisherId,epoch:server.publisher!.epoch,revision:server.revision,acceptedSequence:server.publisher!.lastSequence,serverTime:new Date(now).toISOString(),leaseExpiresAt:server.publisher!.leaseExpiresAt}
    }
    expect(body.action).toBe('snapshot');packets.push(structuredClone(body.packet))
    expect(Object.hasOwn(body.packet,'structure')).toBe(false);expect(Object.hasOwn(body.packet,'updateState')).toBe(false)
    server=accepted(applySourcePacket(server,body.packet,now))
    return{ok:true,revision:server.revision,acceptedSequence:server.publisher!.lastSequence,serverTime:new Date(now).toISOString(),leaseExpiresAt:server.publisher!.leaseExpiresAt,freshForMs:lineupFreshness(server,now).freshForMs}
  }})
  const structure={version:1,columns:['OrderID','OrderDate','FirstName','IsRevealed'],bodyCount:2,rowCount:'1-10',unmatchedRows:'0',hasOrderIdAttribute:true,hasPartyIdAttribute:true,hasOrderTimeAttribute:true}
  const read=(serial:number,readerVersion='2.0.9',entries=original,revealedIds:string[]=[])=>({parserState:'ready',reason:null,readerVersion,updateState:'downloaded',structure,
    entries,revealedIds,revealedEntries:revealedIds.map(id=>({id,orderedAt:original.find(row=>row.id===id)!.orderedAt})),
    observation:{documentId:newDocument,serial,serverTime:new Date(now).toISOString(),settled:true},rawCustomerText:'NEVER SEND THIS FIELD'})
  now+=1000
  const mismatch=read(1,'2.0.7')
  expect((await client.sync(mismatch,'2.0.9',{diagnosticSnapshot:mismatch})).status).toBe('source_not_ready')
  expect(claimCount).toBe(1);expect(server.order).toEqual(['P9:a','P9:b'])
  expect(server.entries.map(row=>row.id)).toEqual(['P9:a','P9:b'])
  expect(server.parserState).toBe('partial');expect(local.readyDeadline).toBe(0)
  const delayed=await publicFeed()
  expect(delayed.liveQueueSourceReady).toBe(false);expect(delayed.liveQueueState).toBe('delayed')
  expect(delayed.liveQueueEntries.map(row=>row.name)).toEqual(['First','Second'])
  // The first clean replacement read omits a retained waiting row; that is not a reveal.
  now+=1000
  const fresh=[original[0],{id:'P9:c',name:'Third',orderedAt:now}]
  expect((await client.sync(read(2,'2.0.9',fresh),'2.0.9')).status).toBe('confirmed')
  expect(server.order).toEqual(['P9:a','P9:b','P9:c'])
  expect(new Set(server.entries.map(row=>row.id)).size).toBe(3)
  expect((await publicFeed()).liveQueueSourceReady).toBe(true)
  now+=1000
  expect((await client.sync(read(3,'2.0.9',[fresh[1]],['P9:a']),'2.0.9')).status).toBe('confirmed')
  expect(server.order).toEqual(['P9:b','P9:c']);expect(server.revealedIds).toEqual(['P9:a'])
  expect(server.revealEvents?.filter(event=>event.entryId==='P9:a')).toHaveLength(1)
  expect((await publicFeed()).liveQueueEntries.map(row=>row.name)).toEqual(['Second','Third'])
  const last=packets.at(-1)!
  expect(applySourcePacket(server,last,now)).toEqual({ok:false,code:'stale_sequence'})
  expect(applySourcePacket(server,{...last,publisherId:'33333333-3333-4333-8333-333333333333',sequence:last.sequence+1},now)).toEqual({ok:false,code:'publisher_conflict'})
  expect(applySourcePacket(server,{...last,claimId:claimA,sequence:last.sequence+1},now)).toEqual({ok:false,code:'publisher_conflict'})
  expect(server.order).toEqual(['P9:b','P9:c'])
  expect(last.diagnostics).toMatchObject({sourceVersion:'2.0.9',readerVersion:'2.0.9',updateState:'downloaded',structure})
  expect(JSON.stringify(packets)).not.toContain('NEVER SEND THIS FIELD')
  const publicJson=JSON.stringify(await publicFeed())
  for(const privateValue of ['P9:',publisherId,claimB,'hasOrderIdAttribute','readerVersion',token])expect(publicJson).not.toContain(privateValue)
})
