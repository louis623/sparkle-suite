import {beforeEach,it,expect,vi} from 'vitest'
import {existsSync} from 'node:fs'
import {dbFixture,dancer,repId,listingId} from '../helpers/dance-floor-fixture'
const state=vi.hoisted(()=>({client:null as any}))
vi.mock('@/lib/nic-nac/auth',()=>({getPaidNicNacContext:async()=>({repId:'10000000-0000-4000-8000-000000000001',supabase:state.client}),AuthError:class extends Error{}}))
vi.mock('@/lib/services/listing-photo-processing',()=>({processRepCustomListingPhotoUrl:vi.fn()}))
import * as route from '@/app/api/nic-nac/trade-board/route'
import {processRepCustomListingPhotoUrl} from '@/lib/services/listing-photo-processing'
import {updateListing} from '@/lib/services/trade-board'
beforeEach(()=>vi.clearAllMocks())
it.each([{listingPhotoPath:'untrusted'},{listingPhotoUrl:'https://untrusted.test/photo'},{listingPhotoUrl:null},{useCanonicalPhoto:true}])('Floor ignores photo-only input %j without a write',async photo=>{
 const f=dbFixture({trade_listings:[dancer()]});state.client=f.client
 const response=await route.PATCH(new Request('https://fixture.invalid/api/nic-nac/trade-board',{method:'PATCH',body:JSON.stringify({listingId,...photo})}))
 expect(response.status).toBe(200);expect(f.calls.some(c=>c.operation==='update')).toBe(false);expect(processRepCustomListingPhotoUrl).not.toHaveBeenCalled()
})
it('mixed input saves notes only; foreign and inactive photo-only input does not bypass ownership',async()=>{
 const f=dbFixture({trade_listings:[dancer()]});state.client=f.client
 const send=(body:object)=>route.PATCH(new Request('https://fixture.invalid/api/nic-nac/trade-board',{method:'PATCH',body:JSON.stringify({listingId,...body})}))
 expect((await send({listingPhotoUrl:'bad',repNotes:'keep'})).status).toBe(200);expect(f.tables.trade_listings[0].rep_notes).toBe('keep');expect(f.tables.trade_listings[0].listing_photo_url).toBeNull()
 f.tables.trade_listings[0].status='removed';expect((await send({listingPhotoUrl:null})).status).toBe(409)
 f.tables.trade_listings[0].rep_id='foreign';expect((await send({listingPhotoUrl:null})).status).toBe(404)
})
it('central catalog guard rejects non-null custom photos, allows reset and keeps manual photos',async()=>{
 const f=dbFixture({trade_listings:[dancer()]})
 await expect(updateListing(f.client,repId,listingId,{listingPhotoUrl:'https://evil.test/x'})).rejects.toMatchObject({code:'CATALOG_PHOTO_NOT_ALLOWED',userMessage:'Catalog dancers use the Nic-Nac catalog photo.'})
 await updateListing(f.client,repId,listingId,{listingPhotoUrl:null,useCanonicalPhoto:true})
 f.tables.trade_listings[0].listing_source='non_item_number'
 const photo='https://fixture.invalid/storage/v1/object/public/jewelry-photos/'+repId+'/x.jpg'
 await updateListing(f.client,repId,listingId,{listingPhotoUrl:photo});expect(f.tables.trade_listings[0].manual_photo_url).toBe(photo)
})
it('removes quick-add and upload entry points',()=>{expect('POST'in route).toBe(false);expect(existsSync('app/api/nic-nac/trade-board/uploads/route.ts')).toBe(false);expect(existsSync('lib/services/dance-floor-photos.ts')).toBe(false)})
