import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { dbFixture, dancer, repId, listingId } from '../helpers/dance-floor-fixture'
const s=vi.hoisted(()=>({user:null as any,admin:null as any,created:vi.fn(),pipeline:vi.fn(),target:vi.fn()}))
vi.mock('@/lib/nic-nac/auth',()=>({getPaidNicNacContext:async()=>({repId:'10000000-0000-4000-8000-000000000001',rep:{},supabase:s.user}),AuthError:class extends Error{}}))
vi.mock('@/lib/supabase/admin',()=>({createAdminClient:()=>{s.created();return s.admin}}))
vi.mock('@/lib/services/listing-photo-processing',()=>({processRepCustomListingPhotoUrl:s.pipeline}))
import { POST } from '@/app/api/nic-nac/trade-board/uploads/route'
import { PATCH } from '@/app/api/nic-nac/trade-board/route'
import { processDanceFloorPhoto } from '@/lib/services/dance-floor-photos'
const path=repId+'/dance-floor/'+listingId+'/jewelry/50000000-0000-4000-8000-000000000001'
const request=(body:any)=>new Request('https://fixture.invalid/api/nic-nac/trade-board/uploads',{method:'POST',body:JSON.stringify(body)})
beforeEach(()=>{
 vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL','https://fixture.invalid')
 vi.clearAllMocks();s.user=dbFixture({trade_listings:[dancer({listing_source:'non_item_number',manual_photo_url:'/old.jpg'})]}).client
 s.target.mockResolvedValue({data:{signedUrl:'https://fixture.invalid/signed'},error:null})
 s.pipeline.mockResolvedValue({photoUrl:'https://fixture.invalid/storage/v1/object/public/jewelry-photos/'+repId+'/new.png'})
 s.admin={rpc:vi.fn(async()=>({data:{storage_path:path},error:null})),storage:{from:vi.fn(()=>({createSignedUploadUrl:s.target,getPublicUrl:(p:string)=>({data:{publicUrl:'https://fixture.invalid/storage/v1/object/public/jewelry-photos/'+p}})}))}}
})
describe('bound photo upload',()=>{
 it('checks ownership before any admin work and uses the same missing/foreign 404',async()=>{
  s.user=dbFixture().client;const missing=await POST(request({listingId}))
  s.user=dbFixture({trade_listings:[dancer({rep_id:'foreign'})]}).client;const foreign=await POST(request({listingId}))
  expect(missing.status).toBe(404);expect(foreign.status).toBe(404);expect(await missing.json()).toEqual(await foreign.json());expect(s.created).not.toHaveBeenCalled()
 })
 it('returns only a server receipt path and immutable jewelry target',async()=>{
  const response=await POST(request({listingId,path:'foreign',role:'avatar'}));expect(response.status).toBe(200)
  expect(await response.json()).toMatchObject({path,role:'jewelry'})
  expect(s.admin.rpc).toHaveBeenCalledWith('rpc_claim_trade_listing_photo_v1',{p_rep_id:repId,p_listing_id:listingId,p_storage_path:null})
  expect(s.target).toHaveBeenCalledWith(path,{upsert:false})
 })
 it.each(['PHOTO_REP_LIMIT','PHOTO_DANCER_LIMIT'])('refuses %s before target or pipeline',async code=>{
  s.admin.rpc.mockResolvedValue({data:null,error:{message:code}})
  const response=await POST(request({listingId}));expect(response.status).toBe(429)
  const body=await response.json();expect(body.error).toContain(code==='PHOTO_REP_LIMIT'?'20':'5')
  await expect(processDanceFloorPhoto(s.user,repId,listingId,path)).rejects.toMatchObject({code})
  expect(s.target).not.toHaveBeenCalled();expect(s.pipeline).not.toHaveBeenCalled()
 })
 it('rejects forged roles, foreign paths, URL paths and unreserved paths before pipeline',async()=>{
  for(const invalid of ['https://evil.invalid/a',path.replace('/jewelry/','/avatar/'),path.replace(repId,'foreign')]){
   await expect(processDanceFloorPhoto(s.user,repId,listingId,invalid)).rejects.toMatchObject({code:'PHOTO_TARGET_INVALID'})
  }
  s.admin.rpc.mockResolvedValue({data:null,error:{message:'PHOTO_TARGET_INVALID'}})
  await expect(processDanceFloorPhoto(s.user,repId,listingId,path)).rejects.toMatchObject({code:'PHOTO_TARGET_INVALID'})
  expect(s.pipeline).not.toHaveBeenCalled()
 })
 it('PATCH consumes the bound receipt then builds its own URL and updates the effective manual image',async()=>{
  const response=await PATCH(request({listingId,listingPhotoPath:path,repId:'foreign',quantity:88}))
  expect(response.status).toBe(200)
  expect(s.pipeline).toHaveBeenCalledWith(expect.objectContaining({repId,sourceImageUrl:'https://fixture.invalid/storage/v1/object/public/jewelry-photos/'+path}))
  const row=await s.user.from('trade_listings').select('id').eq('id',listingId).single()
  expect(row.data.manual_photo_url).toContain('/new.png');expect(row.data.quantity_available).toBe(1)
 })
 it('new UI sends the storage path only; pipeline failure leaves the listing unchanged',async()=>{
  const source=readFileSync('app/nic-nac/components/dance-floor/useDanceFloorData.ts','utf8')
  expect(source).not.toContain('listingPhotoUrl');expect(source).toContain('listingPhotoPath: target.path')
  s.pipeline.mockRejectedValue(new Error('provider disabled'))
  const response=await PATCH(request({listingId,listingPhotoPath:path}))
  expect(response.status).toBe(500);expect((await response.json()).error).not.toContain('provider')
  const row=await s.user.from('trade_listings').select('id').eq('id',listingId).single();expect(row.data.manual_photo_url).toBe('/old.jpg')
 })
})
