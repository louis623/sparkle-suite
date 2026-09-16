import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { applySourcePacket, claimPublisher, createLineupState } from '@/lib/live-lineup/model'
import { readLineupSetupReadiness } from '@/lib/live-lineup/setup-readiness'
import type { LineupState } from '@/lib/live-lineup/types'

const T = Date.parse('2026-09-09T12:00:00Z')
const rep = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const otherRep = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const publisherId = '11111111-1111-4111-8111-111111111111'
const credential = {id:publisherId,rep_id:rep,expires_at:new Date(T+86400000).toISOString(),revoked_at:null}
function ready(empty = false, sourceId = publisherId): LineupState {
  const claimed = claimPublisher(createLineupState(),sourceId,0,T,{claimId:'22222222-2222-4222-8222-222222222222'})
  if(!claimed.ok) throw Error(claimed.code)
  const result = applySourcePacket(claimed.state,{publisherId:sourceId,epoch:1,sequence:0,sourceVersion:'2.0.0',parserState:'ready',
    entries:empty?[]:[{id:'private-order',name:'Private Customer',orderedAt:T}],revealedIds:[]},T)
  if(!result.ok) throw Error(result.code)
  return result.state
}
function dbFixture(options: {state?: unknown; stateTenant?: string; revision?: number | string; token?: unknown; finalState?: unknown; finalTenant?: string;
  stateError?: {code:string}; tokenError?: {code:string}; assignedCode?: unknown; throwMessage?: string; onFinalRead?: () => void} = {}) {
  const state = 'state' in options ? options.state : ready()
  const token = 'token' in options ? options.token : credential
  const calls: {table:string; selected:string; filters:[string,unknown][]}[] = []
  let stateReads = 0
  const db = {from(table:string) {
    const call = {table,selected:'',filters:[] as [string,unknown][]}; calls.push(call)
    const query = {
      select(value:string) {call.selected=value;return query},
      eq(key:string,value:unknown) {call.filters.push([key,value]);return query},
      order() {return query},
      limit() {return query},
      async maybeSingle() {
        if(options.throwMessage) throw Error(options.throwMessage)
        if(table==='live_lineup_publisher_tokens') return {data:token,error:options.tokenError??null}
        if(table==='live_queue') return {data:'assignedCode' in options?options.assignedCode:{rep_id:rep,sync_code:'MHF-9446'},error:options.tokenError??null}
        if(table!=='live_lineup_states') throw Error('Unexpected table access')
        const final = stateReads++ > 0
        if (final) options.onFinalRead?.()
        const selectedState=final&&'finalState' in options?options.finalState:state
        return {data:selectedState===null?null:{rep_id:final?options.finalTenant??options.stateTenant??rep:options.stateTenant??rep,
          revision:options.revision??(selectedState as LineupState)?.revision,state:selectedState},error:options.stateError??null}
      },
    };return query
  }} as unknown as SupabaseClient
  return {db,calls}
}

describe('sanitized v2 setup readiness reads', () => {
  afterEach(()=>vi.restoreAllMocks())
  it.each([
    {elapsed:45001,reason:'stale'}, {elapsed:90001,reason:'lease_expired'},
    {elapsed:1,expires:T+1,reason:'publisher_expired'}, {elapsed:-1,reason:'clock_invalid'},
    {elapsed:NaN,reason:'clock_invalid'},
  ])('rechecks real default-clock deadlines after database latency: $reason',async({elapsed,expires,reason})=>{
    const clock=vi.spyOn(Date,'now').mockReturnValue(T)
    const f=dbFixture({token:{...credential,expires_at:new Date(expires??T+86400000).toISOString()},onFinalRead:()=>clock.mockReturnValue(T+elapsed)})
    expect(await readLineupSetupReadiness(f.db,rep)).toMatchObject({ready:false,reason})
  })
  it('timestamps successful evidence at the final read, while explicit test clocks remain deterministic',async()=>{
    const clock=vi.spyOn(Date,'now').mockReturnValue(T)
    const f=dbFixture({onFinalRead:()=>clock.mockReturnValue(T+1000)})
    expect(await readLineupSetupReadiness(f.db,rep)).toMatchObject({ready:true,checkedAt:new Date(T+1000).toISOString()})
    expect(await readLineupSetupReadiness(dbFixture().db,rep,T)).toMatchObject({ready:true,checkedAt:new Date(T).toISOString()})
  })
  it.each([false,true])('accepts a current authenticated v2 source, including an authoritative empty queue (%s)',async empty=>{
    const f=dbFixture({state:ready(empty)})
    const result=await readLineupSetupReadiness(f.db,rep,T)
    expect(result).toEqual({protocol:2,ready:true,reason:'ready',checkedAt:new Date(T).toISOString(),lastReadyAt:new Date(T).toISOString(),generation:0,revision:2})
    expect(f.calls.map(c=>c.table)).toEqual(['live_lineup_states','live_lineup_publisher_tokens','live_lineup_states'])
    expect(f.calls.every(c=>c.filters.some(([key,value])=>key==='rep_id'&&value===rep))).toBe(true)
    expect(f.calls[1].filters).toContainEqual(['id',publisherId])
    expect(f.calls[1].selected).toBe('id,rep_id,expires_at,revoked_at')
  })
  it('accepts a fresh assigned-code source without requiring a generated publisher token',async()=>{
    const f=dbFixture({state:ready(false,rep),assignedCode:{rep_id:rep,sync_code:'MHF-9446'}})
    expect(await readLineupSetupReadiness(f.db,rep,T)).toMatchObject({ready:true,reason:'ready'})
    expect(f.calls.map(c=>c.table)).toEqual(['live_lineup_states','live_queue','live_lineup_states'])
    expect(f.calls[1].selected).toBe('rep_id,sync_code')
  })
  it.each([{state:null,reason:'not_initialized'},{stateError:{code:'42P01'},reason:'schema_unavailable'},
    {stateError:{code:'PGRST205'},reason:'schema_unavailable'},{stateError:{code:'XX000'},reason:'unavailable'},
    {state:{schemaVersion:1,queue:['Private Customer']},reason:'invalid_state'},{revision:99,reason:'invalid_state'},
    {state:createLineupState(),reason:'awaiting_ready'}])('fails closed for missing/legacy/corrupt evidence %#',async value=>{
    const f=dbFixture(value)
    expect(await readLineupSetupReadiness(f.db,rep,T)).toMatchObject({ready:false,reason:value.reason})
    expect(f.calls).toHaveLength(1)
  })
  it('rejects claimed-only and non-ready heartbeats even when old ready data remains',async()=>{
    const claimed=claimPublisher(ready(),publisherId,2,T+100000,{claimId:'33333333-3333-4333-8333-333333333333'})
    if(!claimed.ok) throw Error(claimed.code)
    expect(await readLineupSetupReadiness(dbFixture({state:claimed.state}).db,rep,T+100000)).toMatchObject({ready:false,reason:'awaiting_ready'})
    for(const parserState of ['loading','partial','invalid'] as const) {
      const next=applySourcePacket(ready(),{publisherId,epoch:1,sequence:1,sourceVersion:'2.0.0',parserState,entries:[],revealedIds:[]},T+1)
      if(!next.ok) throw Error(next.code)
      expect(await readLineupSetupReadiness(dbFixture({state:next.state}).db,rep,T+1)).toMatchObject({ready:false,reason:'source_not_ready'})
    }
  })
  it('checks precise freshness/lease boundaries and rejects future-ready evidence',async()=>{
    expect(await readLineupSetupReadiness(dbFixture().db,rep,T+45000)).toMatchObject({ready:true})
    expect(await readLineupSetupReadiness(dbFixture().db,rep,T+45001)).toMatchObject({ready:false,reason:'stale'})
    expect(await readLineupSetupReadiness(dbFixture().db,rep,T+90000)).toMatchObject({ready:false,reason:'lease_expired'})
    expect(await readLineupSetupReadiness(dbFixture().db,rep,T-1)).toMatchObject({ready:false,reason:'clock_invalid'})
  })
  it.each([{token:null,reason:'publisher_unavailable'},{token:{...credential,revoked_at:new Date(T).toISOString()},reason:'publisher_revoked'},
    {token:{...credential,expires_at:new Date(T).toISOString()},reason:'publisher_expired'},
    {token:{...credential,expires_at:'invalid'},reason:'publisher_expired'},
    {tokenError:{code:'42P01'},reason:'schema_unavailable'},{tokenError:{code:'XX000'},reason:'unavailable'}])('checks selected publisher eligibility %#',async value=>{
    expect(await readLineupSetupReadiness(dbFixture(value).db,rep,T)).toMatchObject({ready:false,reason:value.reason})
  })
  it('rejects cross-tenant and mismatched-publisher rows even if a query layer returns them',async()=>{
    for(const value of [{stateTenant:otherRep},{token:{...credential,rep_id:otherRep}},{token:{...credential,id:'wrong-publisher'}},{finalTenant:otherRep}])
      expect(await readLineupSetupReadiness(dbFixture(value).db,rep,T)).toMatchObject({ready:false,reason:'tenant_mismatch',revision:null})
  })
  it('never queries for invalid tenant/clock inputs; canonicalizes valid UUID case',async()=>{
    for(const tenant of ['', 'arbitrary-request-body-id']) {
      const f=dbFixture(); expect(await readLineupSetupReadiness(f.db,tenant,T)).toMatchObject({ready:false,reason:'invalid_tenant'});expect(f.calls).toHaveLength(0)
    }
    for(const now of [NaN,Infinity,-1,0.5,8640000000000001]) {
      const f=dbFixture(); expect(await readLineupSetupReadiness(f.db,rep,now)).toMatchObject({ready:false,reason:'clock_invalid',checkedAt:null});expect(f.calls).toHaveLength(0)
    }
    expect(await readLineupSetupReadiness(dbFixture().db,rep.toUpperCase(),T)).toMatchObject({ready:true})
  })
  it('rejects state changes/revocation during verification rather than confirming a prior lease',async()=>{
    expect(await readLineupSetupReadiness(dbFixture({finalState:{...ready(),revision:3}}).db,rep,T)).toMatchObject({ready:false,reason:'state_changed'})
    expect(await readLineupSetupReadiness(dbFixture({finalState:null}).db,rep,T)).toMatchObject({ready:false,reason:'state_changed'})
    expect(await readLineupSetupReadiness(dbFixture({finalState:{...ready(),parserState:'invalid'}}).db,rep,T)).toMatchObject({ready:false,reason:'state_changed'})
  })
  it('never serializes names, order IDs, source strings, token data, labels, tenant IDs or raw errors',async()=>{
    const secret='sslp_'+'x'.repeat(43)
    const result=await readLineupSetupReadiness(dbFixture({state:{...ready(),sourceVersion:secret},token:{...credential,token_hash:'private-hash',token:secret,label:'Private laptop'}}).db,rep,T)
    expect(result.ready).toBe(true)
    const json=JSON.stringify(result)
    for(const privateValue of ['Private Customer','private-order',secret,'private-hash','Private laptop',rep,publisherId]) expect(json).not.toContain(privateValue)
    const failed=await readLineupSetupReadiness(dbFixture({throwMessage:secret}).db,rep,T)
    expect(failed).toMatchObject({ready:false,reason:'unavailable'})
    expect(JSON.stringify(failed)).not.toContain(secret)
  })
})
