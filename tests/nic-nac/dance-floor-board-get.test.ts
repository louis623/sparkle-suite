import { beforeEach, describe, expect, it, vi } from 'vitest'
import { writeFileSync } from 'node:fs'
import { performance } from 'node:perf_hooks'
import { dbFixture, dancer, repId, listingId } from '../helpers/dance-floor-fixture'
const s=vi.hoisted(()=>({client:null as ReturnType<typeof dbFixture>['client']}))
vi.mock('@/lib/nic-nac/auth',()=>({getPaidNicNacContext:async()=>({repId:'10000000-0000-4000-8000-000000000001',rep:{time_zone:'America/Los_Angeles'},supabase:s.client}),AuthError:class extends Error{}}))
vi.mock('@/lib/supabase/admin',()=>({createAdminClient:vi.fn(()=>s.client)}))
vi.mock('@/lib/services/trade-board-stats',()=>({getDanceFloorDancerCounts:async()=>null}))
vi.mock('@/lib/services/listing-photo-processing',()=>({processRepCustomListingPhotoUrl:vi.fn()}))
vi.mock('@/lib/amethyst/preview-rep',()=>({resolveAmethystPreviewRep:async()=>({id:'10000000-0000-4000-8000-000000000001'})}))
import { createAdminClient } from '@/lib/supabase/admin'
import { GET } from '@/app/api/nic-nac/trade-board/route'
import { daysOnDanceFloor, getRepDanceFloorBoard } from '@/lib/services/dance-floor-board'
import { getMyBoard, updateListing } from '@/lib/services/trade-board'
import { getTradeListingDisplayFields } from '@/lib/services/trade-listing-display'
import { loadAmethystTradeBoardPreviewListings } from '@/lib/amethyst/trade-board-listings'
function fixture(n=125){
 const rows=Array.from({length:n},(_,i)=>dancer({id:i===0?listingId:'20000000-0000-4000-8000-'+String(i+1).padStart(12,'0'),status:i%2?'pending_trade':'available',listed_at:i%5?'2026-11-14T12:00:00Z':'2026-01-01T12:00:00Z',design:{...dancer().design,design_name:'Dancer'+i},...(i===124?{listing_source:'non_item_number',manual_type_prefix:'NK',manual_collection_family:'Birthday',manual_photo_url:null}:{})}))
 const requests=['pending','approved','denied','cancelled'].map((status,i)=>({id:'request-'+i,listing_id:listingId,status,listing:{rep_id:repId}}))
 const f=dbFixture({trade_listings:[...rows,dancer({id:'foreign',rep_id:'other'})],trade_requests:requests,subscriptions:[{rep_id:repId,status:'active'}],reps:[{id:repId,public_site_slug:'fixture',custom_domain:null}]})
 f.client.rpc.mockImplementation(async()=>({data:rows.map(row=>({listing_id:row.id,net_quantity:1})),error:null}));s.client=f.client;return {...f,rows}
}
beforeEach(()=>{vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL','https://fixture.invalid');vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY','fixture-only')})
describe('rep-only Floor read',()=>{
 it('targeted lookup is authenticated rep-scoped and gives identical missing/foreign 404s without admin',async()=>{
  const f=fixture(1),foreignId='20000000-0000-4000-8000-999999999999'
  f.tables.trade_listings.push(dancer({id:foreignId,rep_id:'other'}))
  vi.mocked(createAdminClient).mockClear()
  const own=await GET(new Request('https://fixture.invalid/api/nic-nac/trade-board?listingId='+listingId))
  expect(own.status).toBe(200);expect((await own.json()).listing.id).toBe(listingId)
  const foreign=await GET(new Request('https://fixture.invalid/api/nic-nac/trade-board?listingId='+foreignId))
  const missing=await GET(new Request('https://fixture.invalid/api/nic-nac/trade-board?listingId=20000000-0000-4000-8000-888888888888'))
  expect(foreign.status).toBe(404);expect(missing.status).toBe(404)
  expect(await foreign.json()).toEqual(await missing.json())
  expect(createAdminClient).not.toHaveBeenCalled()
  expect(f.calls.every(call=>call.table==='trade_listings'&&call.filters.some(([op,key,value]:string[])=>op==='eq'&&key==='rep_id'&&value===repId))).toBe(true)
 })

 it('multi-status, own rep, filters before paging and widened whole-board attention',async()=>{
  const f=fixture()
  const response=await GET(new Request('https://fixture.invalid/api/nic-nac/trade-board?status=available,pending_trade&search=Dancer1&limit=2&offset=1'))
  expect(response.status).toBe(200);const body=await response.json()
  expect(body.total).toBe(35);expect(body.listings).toHaveLength(2);expect(body.hasMore).toBe(true)
  expect(body.listings.every((row:ReturnType<typeof dancer>)=>row.rep_id===repId&&row.design.design_name.includes('1'))).toBe(true)
  expect(body.filterOptions.jewelryTypes).toContain('NK')
  expect(body.attention).toEqual({sitting:13})
  expect(f.calls.filter(c=>c.table==='trade_requests'&&c.select.includes('listing:'))).toHaveLength(1)
  expect((await GET(new Request('https://fixture.invalid/api/nic-nac/trade-board?status=unknown'))).status).toBe(400)
 })
 it('counts all request states except cancelled in one rep-scoped explicit-column page query',async()=>{
  const f=fixture(1);const result=await getRepDanceFloorBoard(f.client,repId,'America/New_York',{statusFilters:['available','pending_trade'],limit:24})
  expect(result.listings[0].requestCount).toBe(3);expect(result.listings[0].pendingRequestCount).toBe(1)
  const call=f.calls.find(c=>c.select.includes('listing:'));expect(call.select).not.toContain('*')
  expect(call.filters).toContainEqual(['eq','listing.rep_id',repId]);expect(call.filters).toContainEqual(['neq','status','cancelled'])
 })
 it('uses calendar boundaries, rep timezone, DST and New York fallback',()=>{
  const now=new Date('2026-11-15T05:30:00Z'),listed='2026-11-15T04:30:00Z'
  expect(daysOnDanceFloor(listed,'America/New_York',now)).toBe(1)
  expect(daysOnDanceFloor(listed,'America/Los_Angeles',now)).toBe(0)
  expect(daysOnDanceFloor(listed,undefined,now)).toBe(1)
  expect(daysOnDanceFloor(listed,'invalid',now)).toBe(1)
  expect(daysOnDanceFloor('2026-11-01T04:30:00Z','America/New_York',new Date('2026-11-02T05:30:00Z'))).toBe(1)
 })
 it('manual Change photo changes the image the display helper actually uses',async()=>{
  const f=dbFixture({trade_listings:[dancer({listing_source:'non_item_number',manual_photo_url:'/old'})]})
  const url='https://fixture.invalid/storage/v1/object/public/jewelry-photos/'+repId+'/new.png'
  await updateListing(f.client,repId,listingId,{listingPhotoUrl:url})
  expect(getTradeListingDisplayFields(f.tables.trade_listings[0]).photoUrl).toBe(url)
 })
 it('public 30-dancer loader keeps all 30 with no extra query or new fields',async()=>{
  const f=fixture(30);f.rows.forEach(row=>row.status='available')
  const plain=await getMyBoard(f.client,repId,{statusFilter:'available'});expect(plain.listings).toHaveLength(30)
  f.calls.length=0
  const result=await loadAmethystTradeBoardPreviewListings({repId,targeted:true})
  expect(result).toHaveLength(30);expect(f.calls.map(c=>c.table)).toEqual(['trade_listings','trade_requests'])
  expect(result.some(row=>'daysOnFloor'in row||'requestCount'in row||'attention'in row)).toBe(false)
 })
 it('records elapsed time and payload for 125 dancers; only 24 are returned',async()=>{
  const f=fixture();const start=performance.now()
  const response=await GET(new Request('https://fixture.invalid/api/nic-nac/trade-board?status=available,pending_trade&limit=24'))
  const text=await response.text(),elapsedMs=performance.now()-start,body=JSON.parse(text)
  expect(response.status).toBe(200);expect(body.total).toBe(125);expect(body.listings).toHaveLength(24)
  writeFileSync('/tmp/dance-floor-phase2-u8.json',JSON.stringify({dancers:125,elapsedMs:Number(elapsedMs.toFixed(3)),payloadBytes:Buffer.byteLength(text),queryCount:f.calls.length,target:'in-memory service fixture, not hosted latency'}))
 })
})
