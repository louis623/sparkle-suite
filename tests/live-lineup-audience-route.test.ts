import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks=vi.hoisted(()=>({context:vi.fn(),state:vi.fn(),rpc:vi.fn()}))
vi.mock('@/lib/live-lineup/http',async original=>({...await original<typeof import('@/lib/live-lineup/http')>(),workspaceLineupContext:mocks.context}))
vi.mock('@/lib/live-lineup/service',async original=>({...await original<typeof import('@/lib/live-lineup/service')>(),readLineupState:mocks.state}))
import { POST } from '@/app/api/workspace/live-lineup/audience/route'
import { createLineupState } from '@/lib/live-lineup/model'
import { LineupServiceError } from '@/lib/live-lineup/service'
const rep='11111111-1111-4111-8111-111111111111'
const now=Date.now(),iso=new Date(now).toISOString()
const entry={id:'p1:a',name:'Jane',lastName:'Smith',orderedAt:now,identityEligible:true,sourceIdentityVersion:'1:doc:1'}
const state=()=>({...createLineupState(),revision:3,show:{generation:1,partyIds:['p1'],excludedPartyIds:[],carryEntryIds:[],startedAt:iso},
  entries:[entry],order:[entry.id],held:[],lastReceivedAt:iso,lastReadyAt:iso,lastChangedAt:iso,parserState:'ready' as const,sourceVersion:'2.0.5'})
const body={generation:1,identities:[{id:entry.id,sourceIdentityVersion:entry.sourceIdentityVersion}]}
const request=(input:unknown=body)=>new Request('http://localhost/api/workspace/live-lineup/audience',{method:'POST',headers:{origin:'http://localhost','Content-Type':'application/json'},body:JSON.stringify(input)})
function query(count=1){return {abortSignal:()=>Promise.resolve({data:{version:'3',matches:[{key:'Jane Smith',count,month:2,day:29,gem:'Amethyst',material:null,cut:null,collection:null}]},error:null})}}
beforeEach(()=>{vi.resetAllMocks();mocks.context.mockResolvedValue({repId:rep,db:{rpc:mocks.rpc}});mocks.state.mockImplementation(async()=>state());mocks.rpc.mockReturnValue(query())})
describe('private Workspace audience endpoint',()=>{
 it('uses the authenticated tenant and stored identities, returning only minimal private chips',async()=>{
  const response=await POST(request({...body,repId:'attacker-selected',name:'Other Name'}));expect(response.status).toBe(200)
  const result=await response.json();expect(result).toEqual({tenantContext:rep,generation:1,audienceVersion:'3',matches:[{id:entry.id,sourceIdentityVersion:entry.sourceIdentityVersion,birthday:'2/29',preferences:['Amethyst']}]})
  expect(mocks.rpc).toHaveBeenCalledWith('live_lineup_match_audience',{p_rep_id:rep,p_names:['Jane Smith']})
  expect(JSON.stringify(result)).not.toMatch(/Smith|email|phone|address|notes/)
 })
 it('suppresses duplicates independently of their profile fields',async()=>{mocks.rpc.mockReturnValue(query(2));expect((await (await POST(request())).json()).matches).toEqual([])})
 it('rejects old shows, missing surnames and forged source identity without querying contacts',async()=>{
  expect((await POST(request({...body,generation:2}))).status).toBe(409)
  expect((await POST(request({...body,identities:[{id:entry.id,sourceIdentityVersion:'old'}]}))).status).toBe(409)
  mocks.state.mockResolvedValue({...state(),entries:[{...entry,lastName:undefined,identityEligible:false}]})
  expect((await POST(request())).status).toBe(409);expect(mocks.rpc).not.toHaveBeenCalled()
 })
 it('discards a match when the source identity changes while the query is in flight',async()=>{
  mocks.state.mockResolvedValueOnce(state()).mockResolvedValueOnce({...state(),entries:[{...entry,sourceIdentityVersion:'new'}]})
  const response=await POST(request());expect(response.status).toBe(409);expect(await response.json()).toEqual({error:'identity_changed'})
 })
 it('requires authenticated Workspace context before any private read',async()=>{
  mocks.context.mockRejectedValue(new LineupServiceError('unauthorized',401));expect((await POST(request())).status).toBe(401);expect(mocks.state).not.toHaveBeenCalled();expect(mocks.rpc).not.toHaveBeenCalled()
 })
 it('bounds independent enrichment work and returns no chips on timeout',async()=>{
  mocks.rpc.mockReturnValue({abortSignal:(signal:AbortSignal)=>new Promise(resolve=>signal.addEventListener('abort',()=>resolve({data:null,error:{message:'aborted'}})))})
  const started=performance.now(),response=await POST(request());expect(response.status).not.toBe(200)
  expect(performance.now()-started).toBeLessThan(3500);expect(await response.json()).not.toHaveProperty('matches')
 },5000)
})
