import { beforeEach, describe, expect, it, vi } from 'vitest'
import { dbFixture, repId, listingId, swapId } from '../helpers/dance-floor-fixture'
const s=vi.hoisted(()=>({user:null as any,admin:null as any,created:vi.fn(),add:vi.fn()}))
vi.mock('@/lib/nic-nac/auth',()=>({getPaidNicNacContext:async()=>({repId:'10000000-0000-4000-8000-000000000001',supabase:s.user}),AuthError:class extends Error{}}))
vi.mock('@/lib/supabase/admin',()=>({createAdminClient:()=>{s.created();return s.admin}}))
vi.mock('@/lib/services/trade-board',async original=>({...await original<any>(),addListing:s.add}))
import { POST } from '@/app/api/nic-nac/trade-swap-cleanup/route'
import { getTradeSwapCleanupQueue } from '@/lib/services/trade-swaps'
const requestId='60000000-0000-4000-8000-000000000001'
function setup(overrides:any={}){
 const row={id:swapId,request_id:requestId,revealed_item_number:'RG100',revealed_ring_size:null,revealed_material:'Silver',replacement_status:'needs_ring_size',design:{material:'Silver',collection:{name:'Birthday'}},request:{customer_name:'Private Customer Name',listing:{rep_id:repId}},...overrides}
 const user=dbFixture({trade_swaps:[row]})
 const admin=dbFixture({trade_swaps:[{...row}],trade_listings:[{id:listingId,rep_id:repId}],trade_fulfillment:[{id:'fulfillment',request_id:requestId}],trade_listing_add_mutations:[]})
 s.user=user.client;s.admin=admin.client;return {row,user,admin}
}
const post=(body:any)=>POST(new Request('https://fixture.invalid/api/nic-nac/trade-swap-cleanup',{method:'POST',body:JSON.stringify(body)}))
beforeEach(()=>{vi.clearAllMocks();s.add.mockResolvedValue({listingId});setup()})
describe('finish a swap follow-up',()=>{
 it('foreign and missing ids are the same 404 before any admin read or write',async()=>{
  setup({request:{customer_name:'private',listing:{rep_id:'foreign'}}})
  const foreign=await post({swapId,ringSize:'7'});s.user=dbFixture().client
  const missing=await post({swapId,ringSize:'7'})
  expect(foreign.status).toBe(404);expect(missing.status).toBe(404);expect(await foreign.json()).toEqual(await missing.json());expect(s.created).not.toHaveBeenCalled()
 })
 it('adopts a half-success receipt by key only, including already-added ownership rows',async()=>{
  const f=setup({replacement_status:'added_to_board'})
  f.admin.tables.trade_listing_add_mutations.push({rep_id:repId,idempotency_key:'trade-swap-replacement:'+requestId,listing_id:listingId,input_signature:'older-signature'})
  const response=await post({swapId});expect(response.status).toBe(200);expect(s.add).not.toHaveBeenCalled()
  const receipt=f.admin.calls.find(c=>c.table==='trade_listing_add_mutations')
  expect(receipt.filters).toEqual([['eq','rep_id',repId],['eq','idempotency_key','trade-swap-replacement:'+requestId]])
  expect(f.user.calls[0].filters.some((filter:any)=>filter[1]==='replacement_status')).toBe(false)
  expect(f.admin.tables.trade_fulfillment[0].received_listing_id).toBe(listingId)
 })
 it('ignores forged ids, names, item, material and notes when they are not missing',async()=>{
  const response=await post({swapId,ringSize:'7',material:'Gold',repId:'foreign',requestId:'foreign',itemNumber:'ER999',customerName:'Attacker',replacementListingId:'foreign',repNotes:'Private Customer Name',tradePreferences:'Private Customer Name'})
  expect(response.status).toBe(200)
  const input=s.add.mock.calls[0][2]
  expect(input).toMatchObject({itemNumber:'RG100',ringSize:'7',material:'Silver',idempotencyKey:'trade-swap-replacement:'+requestId})
  expect(input.repNotes??null).toBeNull();expect(input.tradePreferences??null).toBeNull()
  expect(JSON.stringify(input)).not.toMatch(/Private Customer Name|Attacker|ER999|foreign/)
 })
 it('GET and POST agree on genuinely missing material and catalog fields',async()=>{
  setup({revealed_material:null,design:{material:null,collection:null}})
  const queue=await getTradeSwapCleanupQueue(s.user,repId)
  expect(queue[0].missingFields).toEqual(['ringSize','collectionName','material'])
  expect((await post({swapId,ringSize:'7',collectionName:'Birthday'})).status).toBe(400)
  expect(s.add).not.toHaveBeenCalled()
  expect((await post({swapId,ringSize:'7',collectionName:'Birthday',material:'Silver'})).status).toBe(200)
  expect(s.add.mock.calls[0][2]).toMatchObject({collectionName:'Birthday',material:'Silver'})
 })
})
