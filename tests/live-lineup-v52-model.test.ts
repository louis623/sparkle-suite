import {describe, expect, it} from 'vitest'
import {applyLineupCommand, applySourcePacket, buildWorkspaceLineupSnapshot, claimPublisher, createLineupState,
  isLineupState, LINEUP_MAX_ENTRIES, parseSourcePacket} from '@/lib/live-lineup/model'
import type {LineupResult, LineupState, SourceEntry, SourcePacket} from '@/lib/live-lineup/types'

const T = Date.parse('2026-09-26T12:00:00.000Z')
const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const D = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', E = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
const ok = (result: LineupResult) => { if (!result.ok) throw new Error(result.code); expect(isLineupState(result.state)).toBe(true); return result.state }
const entry = (id: string, name='April', lastName='Smith'): SourceEntry => ({id:`p:${id}`,name,lastName,orderedAt:T})
const payload = (s: LineupState, now: number, overrides: Partial<SourcePacket> = {}): SourcePacket => ({
  publisherId:s.publisher!.id, claimId:s.publisher!.claimId, epoch:s.publisher!.epoch, generation:s.show?.generation ?? 0,
  sequence:s.publisher!.lastSequence+1, sourceVersion:'2.0.5', parserState:'ready', entries:s.entries,
  revealedIds:[], observation:{documentId:D,serial:s.publisher!.lastSequence+1,serverTime:new Date(now).toISOString(),settled:true}, ...overrides,
})
const publish = (s:LineupState, now:number, overrides:Partial<SourcePacket>={}) => ok(applySourcePacket(s,payload(s,now,overrides),now))
function ready(entries: SourceEntry[] = [entry('a'),entry('b'),entry('c','Beth','Jones')]) {
  let s=ok(claimPublisher(createLineupState(),'device',0,T,{claimId:A,capabilities:'lineup-2.0.5'}))
  s=publish(s,T+1,{entries})
  s=ok(applyLineupCommand(s,{type:'start-show',expectedRevision:s.revision,partyIds:['p'],carryEntryIds:entries.map(e=>e.id),confirmed:true},T+2))
  s=ok(claimPublisher(s,'device',s.revision,T+3,{claimId:B,generation:1,capabilities:'lineup-2.0.5'}))
  return publish(s,T+4,{entries})
}
const reveal=(s:LineupState,ids:string[],now=T+10)=>publish(s,now,{entries:[],revealedIds:ids,revealedEntries:ids.map(id=>({id,orderedAt:T}))})
const command=(s:LineupState,type:string,extra:Record<string,unknown>={},now=T+6)=>ok(applyLineupCommand(s,{type,expectedRevision:s.revision,...extra},now))

describe('v5.2 source evidence, atomic candidate and privacy eligibility',()=>{
  it('keeps a valid additive surname but soft-omits invalid optional identity',()=>{
    const s=ready()
    expect(parseSourcePacket(payload(s,T+5,{entries:[{...entry('d'),lastName:'  Smith  '}]}))?.entries[0].lastName).toBe('Smith')
    for(const lastName of ['', '\u0000bad', 'x'.repeat(101), undefined])
      expect(parseSourcePacket(payload(s,T+5,{entries:[{...entry('d'),lastName}]}))?.entries[0]).not.toHaveProperty('lastName')
  })
  it('rejects same-publisher stale claim, old document replay, stale read and serial replay',()=>{
    const s=ready()
    expect(applySourcePacket(s,payload(s,T+5,{claimId:A}),T+5)).toMatchObject({code:'publisher_conflict'})
    expect(applySourcePacket(s,payload(s,T+5,{observation:{documentId:D,serial:0,serverTime:new Date(T+5).toISOString(),settled:true}}),T+5)).toMatchObject({code:'stale_observation'})
    expect(applySourcePacket(s,payload(s,T+5),T+15_006)).toMatchObject({code:'stale_observation'})
    const replaced=publish(s,T+6,{observation:{documentId:E,serial:0,serverTime:new Date(T+6).toISOString(),settled:true}})
    expect(applySourcePacket(replaced,payload(replaced,T+7),T+7)).toMatchObject({code:'stale_observation'})
  })
  it('nonready preserves orders and ready age, shortens ownership once, and never renews it',()=>{
    const s=ready(), first=publish(s,T+1000,{parserState:'partial',entries:[],observation:{documentId:D,serial:1,serverTime:new Date(T+1000).toISOString(),settled:false}})
    const second=publish(first,T+2000,{parserState:'loading',entries:[],observation:{documentId:D,serial:2,serverTime:new Date(T+2000).toISOString(),settled:false}})
    expect(second.publisher!.leaseExpiresAt).toBe(first.publisher!.leaseExpiresAt)
    expect(Date.parse(first.publisher!.leaseExpiresAt)).toBe(T+16000)
    expect(second.order).toEqual(s.order);expect(second.lastReadyAt).toBe(s.lastReadyAt)
    expect(second.lastReadySourceAt).toBe(s.lastReadySourceAt)
  })
  it('requires ready freshness for every arrangement command, but lets authorized recovery stay visible',()=>{
    const s=ready()
    expect(buildWorkspaceLineupSnapshot(s,T+5)).toMatchObject({connection:'connected',canManage:false,authorized:false})
    expect(buildWorkspaceLineupSnapshot(s,T+5,true)).toMatchObject({canManage:true,canRecover:true})
    const locked=buildWorkspaceLineupSnapshot(s,T+45_004,true)
    expect(locked).toMatchObject({canManage:false,canRecover:true,freshForMs:0})
    expect(locked.management?.candidates).toHaveLength(3)
    for(const type of ['move','hold','return','reveal-next','undo'])
      expect(applyLineupCommand(s,{type,entryId:'p:a',beforeEntryId:null,expectedRevision:s.revision},T+45_004)).toMatchObject({code:'source_not_ready'})
  })
  it('deducts source transport age and preserves content timestamp and identity version on real heartbeats',()=>{
    const s=ready(), next=publish(s,T+10_000,{observation:{documentId:D,serial:1,serverTime:new Date(T+1000).toISOString(),settled:true}})
    expect(buildWorkspaceLineupSnapshot(next,T+10_000,true).freshForMs).toBe(36_000)
    expect(next.lastChangedAt).toBe(s.lastChangedAt)
    expect(next.entries[0].sourceIdentityVersion).toBe(s.entries[0].sourceIdentityVersion)
  })
  it('clears all retained identity eligibility on downgrade, including absent/held/restoration rows',()=>{
    let s=command(ready(),'hold',{entryId:'p:b'})
    s=reveal(s,['p:a'])
    s=ok(claimPublisher(s,'device',s.revision,T+100000,{claimId:A,generation:1}))
    expect(s.entries.every(e=>!e.lastName&&!e.identityEligible)).toBe(true)
    expect(s.restorations?.every(e=>!e.entry.lastName&&!e.entry.identityEligible)).toBe(true)
    s=publish(s,T+100001,{sourceVersion:'2.0.4',entries:[],observation:undefined})
    expect(s.held).toEqual(['p:b']);expect(s.entries).toHaveLength(2)
  })
})

describe('v5.2 exact-order reversal and reveal history',()=>{
  it('a replacement document or publisher first establishes a baseline without a reveal flare',()=>{
    const s=ready()
    const replacement=publish(s,T+10,{entries:[],revealedIds:['p:a'],revealedEntries:[{id:'p:a',orderedAt:T}],
      observation:{documentId:E,serial:0,serverTime:new Date(T+10).toISOString(),settled:true}})
    expect(replacement.revealEvents).toEqual([]);expect(replacement.revealEventCursor).toBe(0)
    let next=ok(claimPublisher(s,'new-device',s.revision,T+100000,{claimId:A,generation:1,capabilities:'lineup-2.0.5'}))
    next=reveal(next,['p:a'],T+100001)
    expect(next.revealEvents).toEqual([]);expect(next.revealEventCursor).toBe(0)
  })
  it('restores one checked order once at its surviving anchors; exclusions win and events retract',()=>{
    let s=ready()
    s=reveal(s,['p:a'])
    expect(s.revealEvents).toEqual([{cursor:1,entryId:'p:a',at:new Date(T+10).toISOString(),groupEntryIds:['p:a','p:b']}])
    s=command(s,'filter-parties',{excludedPartyIds:['p']},T+11)
    s=publish(s,T+12,{entries:[entry('a')]})
    expect(s.order).toEqual(['p:a','p:b','p:c']);expect(s.show!.excludedPartyIds).toEqual(['p'])
    expect(s.revealEvents).toEqual([]);expect(s.revealEventCursor).toBe(1);expect(s.restorations).toEqual([])
    s=publish(s,T+13,{entries:[entry('a')]})
    expect(s.order.filter(id=>id==='p:a')).toHaveLength(1);expect(s.revealEventCursor).toBe(1)
  })
  it('restores held category and deterministic simultaneous anchors without moving surviving orders',()=>{
    let s=command(ready([entry('a'),entry('b'),entry('c'),entry('d')]),'hold',{entryId:'p:c'})
    s=reveal(s,['p:a','p:b','p:c'])
    expect(s.revealEvents?.map(e=>e.entryId)).toEqual(['p:a','p:b'])
    s=publish(s,T+11,{entries:[entry('b'),entry('c'),entry('a')]})
    expect(s.order).toEqual(['p:a','p:b','p:d']);expect(s.held).toEqual(['p:c'])
    // The previous held list was empty, so its fallback is explicit.
    expect(s.restorationNotice).toContain('end of their previous list')
  })
  it('never reverses from absence, legacy evidence, a different source baseline or another epoch',()=>{
    const s=reveal(ready(),['p:a'])
    expect(publish(s,T+11,{entries:[]}).revealedIds).toContain('p:a')
    let changed=publish(s,T+12,{entries:[entry('a')],observation:{documentId:E,serial:1,serverTime:new Date(T+12).toISOString(),settled:true}})
    expect(changed.revealedIds).toContain('p:a')
    changed=publish(changed,T+13,{entries:[],revealedIds:['p:a'],revealedEntries:[{id:'p:a',orderedAt:T}],observation:{documentId:E,serial:2,serverTime:new Date(T+13).toISOString(),settled:true}})
    changed=publish(changed,T+14,{entries:[entry('a')],observation:{documentId:E,serial:3,serverTime:new Date(T+14).toISOString(),settled:true}})
    expect(changed.revealedIds).not.toContain('p:a')
  })
  it('does not create an event for unknown checked orders, holds, exclusions, heartbeats or Undo',()=>{
    let s=command(ready(),'hold',{entryId:'p:a'})
    s=reveal(s,['p:a','p:unknown'])
    expect(s.revealEvents).toEqual([]);expect(s.revealEventCursor).toBe(0)
    s=command(s,'filter-parties',{excludedPartyIds:['p']},T+11)
    s=reveal(s,['p:b'],T+12)
    expect(s.revealEvents).toEqual([])
  })
  it('fails the complete restoration candidate at capacity without partial state, events or dropped customers',()=>{
    const entries=Array.from({length:LINEUP_MAX_ENTRIES},(_,i)=>entry(String(i)))
    let s=reveal(ready(entries),['p:0'])
    s=publish(s,T+11,{entries:[{...entry('new'),orderedAt:T+11}]})
    const before=structuredClone(s)
    const result=applySourcePacket(s,payload(s,T+12,{entries:[entry('0')]}),T+12)
    expect(result.ok).toBe(false);if(!result.ok)expect(result.code).toBe('capacity_exceeded')
    expect(s).toEqual(before);expect(s.entries).toHaveLength(LINEUP_MAX_ENTRIES)
  })
  it('bounds repeated check/uncheck metadata instead of accumulating full arrangements',()=>{
    let s=ready()
    for(let i=0;i<30;i++) {
      s=reveal(s,['p:a'],T+20+i*2)
      expect(s.restorations).toHaveLength(1)
      s=publish(s,T+21+i*2,{entries:[entry('a')]})
      expect(s.restorations).toHaveLength(0);expect(s.revealEvents).toHaveLength(0)
    }
    expect(s.revealEventCursor).toBe(30)
    expect(JSON.stringify(s).length).toBeLessThan(5000)
  })
  it('keeps maximal-ID group reveals atomic within the bounded event-history budget',()=>{
    const entries=Array.from({length:2000},(_,i)=>entry(`${String(i).padStart(4,'0')}${'x'.repeat(122)}`))
    const s=reveal(ready(entries),entries.slice(0,128).map(e=>e.id))
    expect(s.entries).toHaveLength(1872);expect(s.revealedIds).toHaveLength(128)
    expect(s.restorations).toHaveLength(128);expect(s.revealEventCursor).toBe(128)
    expect(s.revealEvents).toHaveLength(2)
    expect(s.revealEvents?.map(event=>event.cursor)).toEqual([127,128])
    expect(s.revealEvents?.reduce((count,event)=>count+event.groupEntryIds.length,0)).toBe(4000)
    expect(new TextEncoder().encode(JSON.stringify(s)).byteLength).toBeLessThan(8_388_608)
  })
})
