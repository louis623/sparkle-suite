import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import pg from 'pg'
import { purgeExpiredRemovedListings } from '@/lib/services/trade-board'
const migration='supabase/migrations/20261115153849_dance_floor_locked_listing_functions.sql'
// Deliberately no remote URL, password or Smoke credential support. This suite
// creates its own database on the disposable sandbox's Unix-domain socket.
const config={host:'/var/run/postgresql',user:'ubuntu'}
const rep=randomUUID(),foreign=randomUUID(),collection=randomUUID(),design=randomUUID()
const ids={listings:[] as string[],requests:[] as string[],fulfillments:[] as string[]}
const valid=new Set<string>()
let db:pg.Client,a:pg.Client,b:pg.Client,bootstrap:pg.Client
const one=async(sql:string,args:any[]=[],client=db)=>(await client.query(sql,args)).rows[0]
const rpc=async(name:string,args:any[],client=db)=>(await one('select public.'+name+'('+args.map((_,i)=>'$'+(i+1)).join(',')+') as result',args,client)).result
async function listing(quantity=1,status='available',extras:Record<string,any>={}){
 const id=randomUUID();ids.listings.push(id);valid.add(id)
 const row={id,rep_id:rep,design_id:design,quantity_available:quantity,status,listing_source:'catalog',rep_notes:id,...extras}
 const keys=Object.keys(row)
 await db.query('insert into trade_listings('+keys.join(',')+') values('+keys.map((_,i)=>'$'+(i+1)).join(',')+')',Object.values(row));return id
}
async function request(listingId:string,status='pending'){
 const id=randomUUID();ids.requests.push(id)
 await db.query('insert into trade_requests(id,listing_id,status,customer_name) values($1,$2,$3,$4)',[id,listingId,status,'Fixture only']);return id
}
async function fulfillment(requestId:string,status:string|null='approved'){
 const id=randomUUID();ids.fulfillments.push(id)
 await db.query('insert into trade_fulfillment(id,request_id,fulfillment_status) values($1,$2,$3)',[id,requestId,status]);return id
}
const remove=(id:string,client=db)=>rpc('rpc_remove_trade_listing_v1',[rep,id,'other'],client)
const restore=(id:string,days=7)=>rpc('rpc_restore_trade_listing_v1',[rep,id,days])
const set=(id:string,q:number,expected:number)=>rpc('rpc_set_trade_listing_quantity_v1',[rep,id,q,expected])
const approve=(id:string,client=db)=>rpc('rpc_approve_trade_v2',[id,rep,'Birthday','RG',true,true,null],client)
const deny=(id:string,client=db)=>rpc('rpc_reject_trade_v2',[id,rep,'item_unavailable',null,null],client)
function extract(path:string,name:string){
 const source=readFileSync(path,'utf8'),start=source.indexOf('create or replace function public.'+name+'(')
 if(start<0)throw new Error('Missing real dependency '+name)
 return source.slice(start,source.indexOf('$$;',source.indexOf('as $$',start))+3)
}
beforeAll(async()=>{
 if(process.env.DANCE_FLOOR_LOCAL_PG!=='1')throw new Error('Requires explicit disposable local PostgreSQL target')
 bootstrap=new pg.Client({...config,database:'postgres'});await bootstrap.connect()
 const name='dance_floor_phase2_'+Date.now()
 await bootstrap.query('create database '+name)
 for(const role of ['anon','authenticated','service_role'])await bootstrap.query("do $$ begin if not exists(select 1 from pg_roles where rolname='"+role+"') then create role "+role+"; end if; end $$")
 db=new pg.Client({...config,database:name});a=new pg.Client({...config,database:name});b=new pg.Client({...config,database:name})
 await Promise.all([db.connect(),a.connect(),b.connect()])
 for(const c of [db,a,b])await c.query("set statement_timeout='5s'; set lock_timeout='4s'")
 await db.query(`
 create type listing_status as enum('available','pending_trade','traded','removed');
 create type jewelry_type as enum('RG','NK','ER','ST','BR');
 create type removal_reason as enum('sold','keeping','mistake','other');
 create type rejection_reason as enum('collection_mismatch','jewelry_type_mismatch','item_unavailable','other');
 create type fulfillment_status as enum('approved','shipped','completed');
 create table reps(id uuid primary key);
 create table collections(id uuid primary key,name text);
 create table jewelry_designs(id uuid primary key,collection_id uuid references collections(id),type_prefix jewelry_type,times_traded int default 0,updated_at timestamptz);
 create table trade_listings(id uuid primary key default gen_random_uuid(),rep_id uuid not null references reps(id),design_id uuid references jewelry_designs(id),
 quantity_available int not null default 1,status listing_status default 'available',removal_reason removal_reason,deleted_at timestamptz,
 listing_source text not null default 'catalog',ring_size text,listing_photo_url text,uses_canonical_photo boolean default true,rep_notes text,trade_preferences text,
 manual_type_prefix text,manual_collection_family text,manual_collection_name text,manual_size text,manual_photo_url text,
 rarity_classification text not null default 'standard',rarity_confirmed_at timestamptz,rarity_confirmation_source text,
 listed_at timestamptz default now(),created_at timestamptz default now(),updated_at timestamptz default now());
 create table trade_requests(id uuid primary key default gen_random_uuid(),listing_id uuid references trade_listings(id),status text default 'pending',
 customer_name text,rep_notes text,rejection_reason rejection_reason,denial_explanation text,verified_offered_family text,verified_offered_type jewelry_type,
 verification_version int,verified_by_rep_id uuid,verified_at timestamptz,updated_at timestamptz default now());
 create table trade_fulfillment(id uuid primary key default gen_random_uuid(),request_id uuid references trade_requests(id),
 fulfillment_status fulfillment_status default 'approved',shipping_notes text,received_listing_id uuid references trade_listings(id),
 status_updated_at timestamptz default now(),completed_at timestamptz,created_at timestamptz default now());
 `)
 await db.query(extract('supabase/migrations/20260825015000_trade_listing_quantity_concurrency.sql','trade_listing_catalog_group_digest'))
 await db.query(extract('supabase/migrations/20260923190000_trade_request_verification_receipts.sql','trade_canonical_family_v1'))
 await db.query(`create unique index idx_trade_listings_active_catalog_group_unique on trade_listings
 (trade_listing_catalog_group_digest(rep_id,design_id,ring_size,listing_photo_url,uses_canonical_photo,rep_notes,trade_preferences),rarity_classification)
 where listing_source='catalog' and status in('available','pending_trade');`)
 // Seed real historical definitions and service-only ACLs before CREATE OR REPLACE.
 await db.query(extract('supabase/migrations/20260923220000_trade_request_enum_coalesce_fix.sql','rpc_approve_trade_v2'))
 await db.query(extract('supabase/migrations/20260923190000_trade_request_verification_receipts.sql','rpc_reject_trade_v2'))
 const signatures=['rpc_approve_trade_v2(uuid,uuid,text,jewelry_type,boolean,boolean,text)','rpc_reject_trade_v2(uuid,uuid,rejection_reason,text,text)']
 for(const signature of signatures){
  await db.query('revoke all on function public.'+signature+' from public, anon, authenticated')
  await db.query('grant execute on function public.'+signature+' to service_role')
 }
 const acls=await db.query("select oid::regprocedure::text as signature,proacl::text as acl,prosecdef from pg_proc where oid=any($1::regprocedure[]) order by oid", [signatures])
 await db.query(readFileSync(migration,'utf8'))
 expect((await db.query("select oid::regprocedure::text as signature,proacl::text as acl,prosecdef from pg_proc where oid=any($1::regprocedure[]) order by oid", [signatures])).rows).toEqual(acls.rows)
 for(const signature of signatures){
  for(const role of ['anon','authenticated','service_role']){
   expect((await one("select has_function_privilege($1,$2,'EXECUTE') as allowed",[role,signature])).allowed).toBe(role==='service_role')
  }
 }
 await db.query('insert into reps(id) values($1)',[rep])
 await db.query('insert into collections(id,name) values($1,$2)',[collection,'Birthday'])
 await db.query("insert into jewelry_designs(id,collection_id,type_prefix) values($1,$2,'RG')",[design,collection])
 console.info('SQL_TARGET',JSON.stringify({target:'disposable PostgreSQL',database:name,version:(await one('show server_version')).server_version,sessions:2,rep}))
},20000)
afterEach(async()=>{
 if(!db)return
 for(const c of [a,b])await c.query('rollback')
 if(!valid.size)return
 const bad=await db.query(`select l.id from trade_listings l where l.id=any($1::uuid[]) and
 ((l.status in('available','pending_trade') and (l.status='pending_trade') is distinct from ((select count(*) from trade_requests r where r.listing_id=l.id and r.status='pending')>=l.quantity_available))
 or (l.status='removed' and exists(select 1 from trade_requests r where r.listing_id=l.id and r.status='pending')))`,[[...valid]])
 expect(bad.rows).toEqual([])
})
afterAll(async()=>{
 if(db){
  // Only recorded fixture ids. Never truncate tables, broad-delete a rep, or delete hosted data.
  await db.query('delete from trade_fulfillment where id=any($1::uuid[])',[ids.fulfillments])
  // Approve creates fulfillment ids itself; capture those by our recorded request ids before teardown.
  const generated=await db.query('select id from trade_fulfillment where request_id=any($1::uuid[])',[ids.requests])
  const generatedIds=generated.rows.map(r=>r.id)
  if(generatedIds.length)await db.query('delete from trade_fulfillment where id=any($1::uuid[])',[generatedIds])
  await db.query('delete from trade_requests where id=any($1::uuid[])',[ids.requests])
  await db.query('delete from trade_listings where id=any($1::uuid[])',[ids.listings])
  await db.query('delete from jewelry_designs where id=$1',[design]);await db.query('delete from collections where id=$1',[collection]);await db.query('delete from reps where id=$1',[rep])
  console.info('SQL_TEARDOWN',JSON.stringify({recordedListings:ids.listings.length,recordedRequests:ids.requests.length,remaining:(await one('select count(*)::int as n from trade_listings')).n}))
  await Promise.all([db.end(),a.end(),b.end()])
 }
 await bootstrap?.end()
},15000)
describe('locked listing functions on real PostgreSQL',()=>{
 it('Remove cancels both pending requests, retains quantity and is double-tap safe',async()=>{
  const id=await listing(2,'pending_trade');await request(id);await request(id)
  expect(await remove(id)).toMatchObject({cancelled_count:2,previous_quantity:2,already_removed:false})
  expect(await one('select status,quantity_available from trade_listings where id=$1',[id])).toEqual({status:'removed',quantity_available:2})
  expect(await remove(id)).toMatchObject({already_removed:true,cancelled_count:0})
 })
 it('Approve refuses a removed listing; corrupt Deny changes only its target',async()=>{
  const id=await listing(2,'removed',{deleted_at:new Date()});valid.delete(id)
  const first=await request(id),second=await request(id)
  await expect(approve(first)).rejects.toMatchObject({message:'LISTING_NOT_FOUND'})
  expect(await deny(first)).toMatchObject({listing_restored:false})
  expect((await one('select status from trade_listings where id=$1',[id])).status).toBe('removed')
  expect((await one('select status from trade_requests where id=$1',[second])).status).toBe('pending')
 })
 it.each(['approved','shipped',null])('Remove blocks open fulfillment %s including NULL and old rows',async status=>{
  const id=await listing(2),r=await request(id,'approved'),f=await fulfillment(r,status)
  await db.query("update trade_fulfillment set created_at=now()-interval '200 days' where id=$1",[f])
  await expect(remove(id)).rejects.toMatchObject({message:'OPEN_SWAP'})
  expect((await one('select status from trade_listings where id=$1',[id])).status).toBe('available')
 })
 it('completed fulfillment cannot reopen off the Floor; same state and permitted transitions remain valid',async()=>{
  const id=await listing(),r=await request(id,'approved'),f=await fulfillment(r,'completed')
  await remove(id)
  await expect(rpc('rpc_update_trade_fulfillment_v1',[rep,f,'approved',null,false])).rejects.toMatchObject({message:'LISTING_OFF_FLOOR'})
  await restore(id)
  expect(await rpc('rpc_update_trade_fulfillment_v1',[rep,f,'approved',null,false])).toMatchObject({changed:true,fulfillment_status:'approved',completed_at:null})
  expect(await rpc('rpc_update_trade_fulfillment_v1',[rep,f,'approved',null,false])).toMatchObject({changed:false})
 })
 it('quantity capacity, lower bound, 0/100, stale baseline, above-99 decrease and quick saves',async()=>{
  const id=await listing(2,'pending_trade');await request(id);await request(id)
  expect(await set(id,3,2)).toMatchObject({status:'available',edit_revision:1})
  await expect(set(id,1,3)).rejects.toMatchObject({message:'BELOW_PENDING'})
  expect(await set(id,2,3)).toMatchObject({status:'pending_trade',edit_revision:2})
  for(const q of [0,100])await expect(set(id,q,2)).rejects.toMatchObject({message:'QUANTITY_OUT_OF_RANGE'})
  await expect(set(id,4,1)).rejects.toMatchObject({message:'QUANTITY_CHANGED'})
  const repeated=await Promise.all([set(id,3,2),set(id,3,2)])
  expect(repeated.map(r=>r.edit_revision)).toEqual([3,3])
  const huge=await listing(120)
  expect(await set(huge,110,120)).toMatchObject({quantity_available:110})
  await expect(set(huge,111,110)).rejects.toMatchObject({message:'QUANTITY_OUT_OF_RANGE'})
 })
 it('revisions count 1→2→1, trusted false, no-op and refusal exactly',async()=>{
  const id=await listing()
  expect((await set(id,2,1)).edit_revision).toBe(1);expect((await set(id,1,2)).edit_revision).toBe(2)
  expect((await rpc('rpc_adjust_trade_listing_quantity_v1',[rep,id,1,1,false])).edit_revision).toBe(2)
  expect((await rpc('rpc_adjust_trade_listing_quantity_v1',[rep,id,0,1,true])).edit_revision).toBe(2)
  await expect(rpc('rpc_adjust_trade_listing_quantity_v1',[rep,id,-2,0,true])).rejects.toMatchObject({message:'BELOW_FLOOR'})
  expect((await one('select quantity_available from trade_listings where id=$1',[id])).quantity_available).toBe(2)
  expect((await one('select revision from trade_listing_edit_revisions where listing_id=$1',[id])).revision).toBe(2)
  expect(readFileSync('app/api/nic-nac/trade-board/quantity/route.ts','utf8')).not.toContain('p_record_edit')
 })
 it('Put back normalizes zero, preserves cancelled requests, recomputes status and revisions',async()=>{
  const id=await listing(0,'removed',{deleted_at:new Date()});await request(id,'cancelled')
  expect(await restore(id)).toMatchObject({quantity_available:1,status:'available',edit_revision:1})
  await remove(id);expect(await restore(id)).toMatchObject({edit_revision:1})
  const corrupt=await listing(1,'removed',{deleted_at:new Date()});valid.delete(corrupt)
  await request(corrupt)
  expect(await restore(corrupt)).toMatchObject({status:'pending_trade',edit_revision:0})
  valid.add(corrupt)
  expect((await one("select count(*)::int as n from trade_requests where listing_id=$1 and status='cancelled'",[id])).n).toBe(1)
 })
 it('catalog duplicate is a plain code; recovery expiry and manual equivalence include image and notes',async()=>{
  const first=await listing(1,'available',{rep_notes:'same'}),second=await listing(1,'removed',{rep_notes:'same',deleted_at:new Date()})
  await expect(restore(second)).rejects.toMatchObject({message:'DUPLICATE_ACTIVE_LISTING',code:'P0001'})
  const expired=await listing(1,'removed',{deleted_at:new Date(Date.now()-8*86400000)})
  await expect(restore(expired)).rejects.toMatchObject({message:'RECOVERY_EXPIRED'});expect((await restore(expired,30)).status).toBe('available')
  const details={listing_source:'non_item_number',design_id:null,manual_type_prefix:'RG',manual_collection_family:'Birthday',manual_collection_name:'Blue',manual_size:'7',manual_photo_url:'/same',rep_notes:'note'}
  await listing(1,'available',details)
  const manual=await listing(1,'removed',{...details,manual_collection_name:'  blue  ',deleted_at:new Date()})
  await expect(restore(manual)).rejects.toMatchObject({message:'DUPLICATE_ACTIVE_LISTING'})
  await db.query("update trade_listings set manual_photo_url='/different' where id=$1",[manual])
  expect((await restore(manual)).status).toBe('available')
  const notes=await listing(1,'removed',{...details,rep_notes:'other note',deleted_at:new Date()})
  expect((await restore(notes)).status).toBe('available')
  await expect(rpc('rpc_add_manual_trade_listing_v1',[rep,details])).rejects.toMatchObject({message:'DUPLICATE_ACTIVE_LISTING'})
  expect(first).toBeTruthy()
 })
 it('foreign rep gets the same not-found refusal with no writes',async()=>{
  const id=await listing()
  const before=await one('select * from trade_listings where id=$1',[id])
  for(const[name,args]of [
   ['rpc_remove_trade_listing_v1',[foreign,id,'other']],
   ['rpc_set_trade_listing_quantity_v1',[foreign,id,2,1]],
   ['rpc_adjust_trade_listing_quantity_v1',[foreign,id,1,1,true]],
   ['rpc_restore_trade_listing_v1',[foreign,id,7]],
  ]as const)await expect(rpc(name,[...args])).rejects.toMatchObject({message:'LISTING_NOT_FOUND'})
  expect(await one('select * from trade_listings where id=$1',[id])).toEqual(before)
 })
 it.each([['approve',true],['approve',false],['deny',true],['deny',false]] as const)('controlled %s versus Remove; removeFirst=%s',async(kind,removeFirst)=>{
  const id=await listing(2),r=await request(id)
  const action=kind==='approve'?approve:deny
  await a.query('begin')
  await a.query('select id from trade_listings where id=$1 for update',[id])
  const pid=(await one('select pg_backend_pid() as pid',[],b)).pid
  // Start the other connection while A owns only the listing. It must not
  // acquire a request lock; A can then finish its mutation without deadlock.
  const pending=(removeFirst?action(r,b):remove(id,b)).then(value=>({value,error:null}),error=>({value:null,error}))
  let blocked=false
  for(let n=0;n<100;n++){
   const activity=await one('select wait_event_type from pg_stat_activity where pid=$1',[pid])
   if(activity.wait_event_type==='Lock'){blocked=true;break}
   await new Promise(resolve=>setTimeout(resolve,10))
  }
  expect(blocked).toBe(true)
  if(removeFirst)await remove(id,a);else await action(r,a)
  await a.query('commit')
  const other=await pending
  if(removeFirst)expect(other.error?.message).toBe('REQUEST_NOT_PENDING')
  else if(kind==='approve')expect(other.error?.message).toBe('OPEN_SWAP')
  else expect(other.value).toMatchObject({cancelled_count:0})
  const final=await one('select status,quantity_available from trade_listings where id=$1',[id])
  expect(final.status).toBe(!removeFirst&&kind==='approve'?'available':'removed')
  console.info('LOCK_INTERLEAVING',JSON.stringify({kind,removeFirst,blocked,final}))
 },10000)
 it('purge skips restrictive history but cascades revisions for unreferenced expired fixtures',async()=>{
  const plain=await listing(),referenced=await listing()
  await set(plain,2,1);await remove(plain);await request(referenced,'denied');await remove(referenced)
  await db.query("update trade_listings set deleted_at=now()-interval '40 days' where id=any($1::uuid[])",[[plain,referenced]])
  const client:any={from(table:string){
   expect(table).toBe('trade_listings');let deleting=false;const filters:any[]=[]
   const q:any={select:()=>q,order:()=>q,limit:()=>q,delete:()=>{deleting=true;return q},
    eq:(k:string,v:any)=>{filters.push([k,'=',v]);return q},lt:(k:string,v:any)=>{filters.push([k,'<',v]);return q},gt:(k:string,v:any)=>{filters.push([k,'>',v]);return q},
    then(resolve:any,reject:any){
     if(deleting)expect(ids.listings).toContain(filters.find(f=>f[0]==='id')?.[2])
     const query=(deleting?'delete from':'select id from')+' trade_listings where '+filters.map(([k,op],i)=>k+op+'$'+(i+1)).join(' and ')+(deleting?' returning id':' order by id limit 500')
     return db.query(query,filters.map(f=>f[2])).then(r=>({data:r.rows,error:null}),error=>({data:null,error})).then(resolve,reject)
    }}
   return q
  }}
  expect((await purgeExpiredRemovedListings(client)).purgedCount).toBe(1)
  expect(await one('select id from trade_listings where id=$1',[plain])).toBeUndefined()
  expect(await one('select listing_id from trade_listing_edit_revisions where listing_id=$1',[plain])).toBeUndefined()
  expect((await one('select id from trade_listings where id=$1',[referenced])).id).toBe(referenced)
  await expect(restore(referenced)).rejects.toMatchObject({message:'RECOVERY_EXPIRED'})
 })
 it('atomic photo limits reserve before work and bind one-time role paths',async()=>{
  const photoIds=await Promise.all(Array.from({length:11},()=>listing()))
  let first=''
  for(let i=0;i<50;i++){
   const target=await rpc('rpc_claim_trade_listing_photo_v1',[rep,photoIds[Math.floor(i/5)],null]);if(i===0)first=target.storage_path
   expect(target.storage_path).toContain(rep+'/dance-floor/'+photoIds[Math.floor(i/5)]+'/jewelry/')
   if(i===4)await expect(rpc('rpc_claim_trade_listing_photo_v1',[rep,photoIds[0],null])).rejects.toMatchObject({message:'PHOTO_DANCER_LIMIT'})
  }
  await expect(rpc('rpc_claim_trade_listing_photo_v1',[rep,photoIds[10],null])).rejects.toMatchObject({message:'PHOTO_REP_LIMIT'})
  await expect(rpc('rpc_claim_trade_listing_photo_v1',[rep,photoIds[1],first])).rejects.toMatchObject({message:'PHOTO_TARGET_INVALID'})
  expect((await rpc('rpc_claim_trade_listing_photo_v1',[rep,photoIds[0],first])).role).toBe('jewelry')
  await expect(rpc('rpc_claim_trade_listing_photo_v1',[rep,photoIds[0],first])).rejects.toMatchObject({message:'PHOTO_TARGET_INVALID'})
 })
 it('new objects are service-only, RLS-enabled and replacements are limited to approve/reject',async()=>{
  const source=readFileSync(migration,'utf8')
  expect([...source.matchAll(/create or replace function public\.(\w+)/g)].map(m=>m[1])).toEqual(['rpc_approve_trade_v2','rpc_reject_trade_v2'])
  expect(source.trim().endsWith("notify pgrst, 'reload schema';")).toBe(true)
  expect(source).not.toContain('trade_action_audit')
  for(const name of ['trade_listing_edit_revisions','trade_listing_photo_attempts']){
   expect((await one('select relrowsecurity from pg_class where oid=$1::regclass',[name])).relrowsecurity).toBe(true)
   expect((await one("select has_table_privilege('authenticated',$1,'UPDATE') as allowed",[name])).allowed).toBe(false)
  }
  expect((await one("select has_function_privilege('authenticated','rpc_adjust_trade_listing_quantity_v1(uuid,uuid,integer,integer,boolean)','EXECUTE') as allowed")).allowed).toBe(false)
  expect((await one("select has_function_privilege('service_role','rpc_adjust_trade_listing_quantity_v1(uuid,uuid,integer,integer,boolean)','EXECUTE') as allowed")).allowed).toBe(true)
 })
})
