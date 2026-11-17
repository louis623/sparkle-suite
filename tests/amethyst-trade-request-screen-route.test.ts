import {it,expect,vi} from 'vitest'
const state=vi.hoisted(()=>({rows:[] as any[],calls:[] as any[]}))
vi.mock('@/lib/amethyst/trade-request-rate-limit',()=>({allowTradeRequest:()=>({allowed:true})}))
vi.mock('@/lib/amethyst/swap-http',()=>({verifySwapOrigin:vi.fn(),swapIpHash:()=>'',readSwapJson:(r:Request)=>r.json(),SwapHttpError:class extends Error{}}))
vi.mock('@/lib/amethyst/request-rep-target',()=>({resolveAmethystRequestTarget:()=>({targeted:false})}))
vi.mock('@/lib/services/trade-requests',()=>({TRADE_REQUEST_OFFERED_FAMILY_MAX_LENGTH:100,screenTradeRequestForListing:async()=>({repId:'rep',screening:{status:'mismatch'}})}))
vi.mock('@/lib/supabase/admin',()=>({createAdminClient:()=>({rpc:async()=>({data:state.rows.map(r=>({listing_id:r.id})),error:null}),from:()=>({select:(columns:string)=>{state.calls.push(columns);return{in:async()=>({data:state.rows,error:null})}}})})}))
import {POST} from '@/app/api/amethyst/trade-requests/screen/route'
it.each([
 [{listing_source:'non_item_number',manual_photo_url:' /manual ',listing_photo_url:null},'/manual'],
 [{listing_source:'non_item_number',manual_photo_url:'/manual',listing_photo_url:'/old'},'/manual'],
 [{listing_source:'catalog',listing_photo_url:'/old',design:{canonical_photo_url:' /approved ',type_prefix:'RG',collection:{name:'Birthday'}}},'/approved'],
 [{listing_source:'catalog',listing_photo_url:' /old ',design:{canonical_photo_url:' ',type_prefix:'RG',collection:{name:'Birthday'}}},'/old'],
 [{listing_source:'catalog',listing_photo_url:'/legacy',design:null},'/legacy'],
 [{listing_source:'non_item_number',manual_photo_url:' ',listing_photo_url:' '},null],
])('uses the shared selector for %j',async(row,expected)=>{
 state.rows=[{id:'alternate',manual_collection_family:'Birthday',manual_type_prefix:'RG',...row}]
 const response=await POST(new Request('https://fixture.invalid/api/amethyst/trade-requests/screen',{method:'POST',body:JSON.stringify({listingId:'requested',offeredFamily:'Birthday',offeredType:'RG'})}))
 expect(response.status).toBe(200);expect((await response.json()).alternatives[0].photoUrl).toBe(expected);expect(state.calls.at(-1)).toContain('manual_photo_url')
})
