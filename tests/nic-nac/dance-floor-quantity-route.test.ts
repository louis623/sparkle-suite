import { beforeEach, describe, expect, it, vi } from 'vitest'
import { dbFixture, dancer, repId, listingId } from '../helpers/dance-floor-fixture'
const s=vi.hoisted(()=>({user:null as any,admin:null as any,created:vi.fn()}))
vi.mock('@/lib/nic-nac/auth',()=>({getPaidNicNacContext:async()=>({repId:'10000000-0000-4000-8000-000000000001',supabase:s.user}),AuthError:class extends Error{}}))
vi.mock('@/lib/supabase/admin',()=>({createAdminClient:()=>{s.created();return s.admin}}))
import { POST } from '@/app/api/nic-nac/trade-board/quantity/route'
import { adjustListingQuantity } from '@/lib/services/trade-board'
const post=(body:any)=>POST(new Request('https://fixture.invalid/api/nic-nac/trade-board/quantity',{method:'POST',body:JSON.stringify(body)}))
beforeEach(()=>{s.created.mockClear();s.user=dbFixture({trade_listings:[dancer()]}).client;s.admin={rpc:vi.fn(async()=>({data:{quantity_available:2},error:null}))}})
describe('quantity route',()=>{
 it.each([1,2,99])('allows %i and derives the rep, ignoring record-edit and owner fields',async quantity=>{
  const response=await post({listingId,quantity,expectedQuantity:1,repId:'foreign',p_record_edit:false})
  expect(response.status).toBe(200)
  expect(s.admin.rpc).toHaveBeenCalledWith('rpc_set_trade_listing_quantity_v1',{p_rep_id:repId,p_listing_id:listingId,p_quantity:quantity,p_expected_quantity:1})
 })
 it.each([{quantity:0,expectedQuantity:1},{quantity:2},{quantity:1.2,expectedQuantity:1},{quantity:2,expectedQuantity:null}])('rejects invalid input before admin',async body=>{
  expect((await post({listingId,...body})).status).toBe(400);expect(s.created).not.toHaveBeenCalled()
 })
 it.each(['QUANTITY_CHANGED','BELOW_PENDING','QUANTITY_OUT_OF_RANGE'])('returns a plain conflict for %s',async code=>{
  s.admin.rpc.mockResolvedValue({data:null,error:{message:code}})
  const response=await post({listingId,quantity:2,expectedQuantity:1});expect(response.status).toBe(409)
  const body=await response.json();expect(body.code).toBe(code);expect(body.error).not.toBe(code)
 })
 it('rejects above-99 decreases while preserving the trusted adjust contract',async()=>{
  s.user=dbFixture({trade_listings:[dancer({quantity_available:120})]}).client
  expect((await post({listingId,quantity:110,expectedQuantity:120})).status).toBe(400)
  expect(s.admin.rpc).not.toHaveBeenCalled()
  await adjustListingQuantity(s.user,repId,listingId,-1)
  expect(s.admin.rpc).toHaveBeenLastCalledWith('rpc_adjust_trade_listing_quantity_v1',expect.objectContaining({p_record_edit:true}))
 })
 it('makes missing and foreign ids identical 404s without constructing an admin client',async()=>{
  s.user=dbFixture({trade_listings:[dancer({rep_id:'foreign'})]}).client
  const foreign=await post({listingId,quantity:2,expectedQuantity:1})
  s.user=dbFixture().client
  const missing=await post({listingId,quantity:2,expectedQuantity:1})
  expect(foreign.status).toBe(404);expect(missing.status).toBe(404);expect(await foreign.json()).toEqual(await missing.json());expect(s.created).not.toHaveBeenCalled()
 })
})


it.each([0, 100])('%i returns 400 INVALID_INPUT without calling the RPC', async quantity => {
  const response = await post({ listingId, quantity, expectedQuantity: 1 })
  expect(response.status).toBe(400); expect(await response.json()).toMatchObject({ code: 'INVALID_INPUT' })
  expect(s.admin.rpc).not.toHaveBeenCalled(); expect(s.created).not.toHaveBeenCalled()
})
