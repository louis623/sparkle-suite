import {beforeAll,afterAll,it,expect} from 'vitest'
import {readFileSync} from 'node:fs'
import pg from 'pg'
const config={host:'/var/run/postgresql',user:'ubuntu'}
let admin:pg.Client,db:pg.Client
const rep='10000000-0000-4000-8000-000000000001',design='20000000-0000-4000-8000-000000000001',other='20000000-0000-4000-8000-000000000002',listing='30000000-0000-4000-8000-000000000001'
let beforeAcl:any[],beforePolicies:any[]
const one=async(sql:string,args:unknown[]=[])=>(await db.query(sql,args)).rows[0]
async function asRole(role:string,sql:string,args:unknown[]=[]){
 await db.query('begin')
 try{await db.query('set local role '+role);await db.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:rep})]);return await db.query(sql,args)}
 finally{await db.query('rollback')}
}
const acl=()=>db.query("select r.rolname as role,a.privilege_type,a.is_grantable from pg_class c cross join lateral aclexplode(c.relacl) a join pg_roles r on r.oid=a.grantee where c.oid='public.jewelry_designs'::regclass order by 1,2,3")
const policies=()=>db.query("select policyname,roles,cmd,qual,with_check from pg_policies where schemaname='public' and tablename='jewelry_designs' order by policyname")
beforeAll(async()=>{
 if(process.env.DANCE_FLOOR_LOCAL_PG!=='1')throw Error('Disposable local PostgreSQL only')
 admin=new pg.Client({...config,database:'postgres'});await admin.connect()
 const name='dance_floor_polish_'+Date.now();await admin.query('create database '+name)
 for(const role of ['anon','authenticated','service_role'])await admin.query("do $$ begin if not exists(select 1 from pg_roles where rolname='"+role+"') then create role "+role+"; end if; end $$")
 await admin.query('alter role service_role bypassrls')
 db=new pg.Client({...config,database:name});await db.connect()
 await db.query(`
 set role postgres;
 create schema auth;
 create function auth.uid() returns uuid language sql stable as $$ select (current_setting('request.jwt.claims',true)::jsonb->>'sub')::uuid $$;
 create function auth.role() returns text language sql stable as $$ select current_user::text $$;
 grant usage on schema public,auth to anon,authenticated,service_role;
 create table reps(id uuid primary key,auth_user_id uuid,email text);
 create table jewelry_designs(id uuid primary key,canonical_photo_url text,times_traded int default 0);
 create table trade_listings(id uuid primary key default gen_random_uuid(),rep_id uuid references reps(id),design_id uuid references jewelry_designs(id),listing_source text not null default 'catalog',listing_photo_url text,manual_photo_url text,rep_notes text);
 grant all on reps,jewelry_designs,trade_listings to anon,authenticated,service_role;
 alter table reps enable row level security;
 alter table jewelry_designs enable row level security;
 alter table trade_listings enable row level security;
 create policy reps_own_data on reps for all using(auth_user_id=auth.uid());
 create policy designs_read_all on jewelry_designs for select using(auth.role()='authenticated');
 create policy designs_write_admin on jewelry_designs for insert with check(true);
 create policy designs_admin_full_access on jewelry_designs for all using(exists(select 1 from reps where auth_user_id=auth.uid() and email='operator@fixture.invalid'));
 create policy trade_listings_own_data on trade_listings for all using(exists(select 1 from reps where reps.id=rep_id and auth_user_id=auth.uid())) with check(exists(select 1 from reps where reps.id=rep_id and auth_user_id=auth.uid()));
 reset role;`)
 await db.query("insert into reps values($1,$1,'rep@fixture.invalid')",[rep])
 await db.query("insert into jewelry_designs(id,canonical_photo_url) values($1,'/approved'),($2,'/other')",[design,other])
 await db.query("insert into trade_listings(id,rep_id,design_id,listing_photo_url) values($1,$2,$3,'/legacy')",[listing,rep,design])
 // Prove the original hole with an actual authenticated owner before either migration.
 await db.query('begin');await db.query('set local role authenticated')
 await db.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:rep})])
 const inserted=(await db.query("insert into jewelry_designs(id,canonical_photo_url) values(gen_random_uuid(),'/chosen') returning id")).rows[0]
 await db.query("insert into trade_listings(rep_id,design_id) values($1,$2)",[rep,inserted.id]);await db.query('rollback')
 beforeAcl=(await acl()).rows;beforePolicies=(await policies()).rows
 const listingBefore=await one("select relacl::text from pg_class where oid='trade_listings'::regclass")
 const listingPolicies=(await db.query("select policyname,qual,with_check from pg_policies where tablename='trade_listings'")).rows
 const counts=await one('select (select count(*) from trade_listings) as listings,(select count(*) from jewelry_designs) as designs')
 await db.query(readFileSync('supabase/migrations/20261115233000_dance_floor_catalog_photo_guard_v1.sql','utf8'))
 expect(await one("select relacl::text from pg_class where oid='trade_listings'::regclass")).toEqual(listingBefore)
 expect((await db.query("select policyname,qual,with_check from pg_policies where tablename='trade_listings'")).rows).toEqual(listingPolicies)
 await db.query(readFileSync('supabase/migrations/20261115233100_dance_floor_jewelry_designs_write_lock_v1.sql','utf8'))
 expect(await one('select (select count(*) from trade_listings) as listings,(select count(*) from jewelry_designs) as designs')).toEqual(counts)
 console.info('SQL_TARGET',JSON.stringify({target:'disposable local PostgreSQL',database:name,version:(await one('show server_version')).server_version}))
},20000)
afterAll(async()=>{await db?.end();await admin?.end()})

it.each(['anon','authenticated'])('catalog write privileges refuse %s including arbitrary design inserts',async role=>{
 for(const sql of [
  "insert into jewelry_designs(id,canonical_photo_url) values(gen_random_uuid(),'/unapproved')",
  "update jewelry_designs set canonical_photo_url='/unapproved'",
  "delete from jewelry_designs",
  "truncate jewelry_designs cascade",
 ])await expect(asRole(role,sql)).rejects.toMatchObject({code:'42501'})
})
it('self-changing the rep email does not bypass the table privilege lock',async()=>{
 await db.query('begin')
 try{await db.query('set local role authenticated');await db.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:rep})])
 await db.query("update reps set email='operator@fixture.invalid' where id=$1",[rep])
 await expect(db.query("insert into jewelry_designs(id,canonical_photo_url) values(gen_random_uuid(),'/chosen')")).rejects.toMatchObject({code:'42501'})
 }finally{await db.query('rollback')}
})
it.each(['listing_photo_url','manual_photo_url'])('guard refuses inserted and changed %s with real owned RLS',async column=>{
 await expect(asRole('authenticated',"insert into trade_listings(rep_id,design_id,"+column+") values($1,$2,'/rep')",[rep,design])).rejects.toMatchObject({code:'42501',message:'CATALOG_PHOTO_NOT_ALLOWED'})
 await expect(asRole('authenticated',"update trade_listings set "+column+"='/rep' where id=$1",[listing])).rejects.toMatchObject({code:'42501',message:'CATALOG_PHOTO_NOT_ALLOWED'})
})
it('permits canonical-only insert, null reset, and unchanged legacy photo on unchanged identity',async()=>{
 expect((await asRole('authenticated','insert into trade_listings(rep_id,design_id) values($1,$2) returning id',[rep,design])).rowCount).toBe(1)
 expect((await asRole('authenticated','update trade_listings set listing_photo_url=null,manual_photo_url=null where id=$1 returning id',[listing])).rowCount).toBe(1)
 expect((await asRole('authenticated',"update trade_listings set rep_notes='note',listing_photo_url=listing_photo_url where id=$1 returning id",[listing])).rowCount).toBe(1)
})
it('refuses catalog identity changes that carry a photo and manual-to-catalog conversion',async()=>{
 await expect(asRole('authenticated','update trade_listings set design_id=$2 where id=$1',[listing,other])).rejects.toMatchObject({code:'42501',message:'CATALOG_PHOTO_NOT_ALLOWED'})
 await db.query("insert into trade_listings(id,rep_id,listing_source,manual_photo_url) values('30000000-0000-4000-8000-000000000002',$1,'non_item_number','/manual')",[rep])
 await expect(asRole('authenticated',"update trade_listings set listing_source='catalog',design_id=$1 where id='30000000-0000-4000-8000-000000000002'",[design])).rejects.toMatchObject({code:'42501',message:'CATALOG_PHOTO_NOT_ALLOWED'})
})
it('manual photos remain writable',async()=>{
 expect((await asRole('authenticated',"insert into trade_listings(rep_id,listing_source,manual_photo_url) values($1,'non_item_number','/manual') returning id",[rep])).rowCount).toBe(1)
 expect((await asRole('authenticated',"update trade_listings set manual_photo_url='/new' where listing_source='non_item_number' returning id")).rowCount).toBe(1)
})
it('service can create a design and canonical listing; authenticated retains SELECT',async()=>{
 await db.query('begin')
 try{await db.query('set local role service_role');const result=await db.query("insert into jewelry_designs(id,canonical_photo_url) values(gen_random_uuid(),'/approved-new') returning id")
 expect((await db.query('insert into trade_listings(rep_id,design_id) values($1,$2)',[rep,result.rows[0].id])).rowCount).toBe(1)
 }finally{await db.query('rollback')}
 expect((await asRole('authenticated','select id from jewelry_designs')).rowCount).toBe(2)
})
it('actual nested SECURITY DEFINER owner exempts its listing write and can update the catalog counter',async()=>{
 await db.query(`create function public.fixture_owner_write(id uuid) returns void language plpgsql security definer set search_path=public as $$ begin update jewelry_designs set times_traded=times_traded+1; update trade_listings set listing_photo_url='/owner-approved' where trade_listings.id=$1; end $$; alter function public.fixture_owner_write(uuid) owner to postgres;`)
 expect((await asRole('authenticated','select fixture_owner_write($1)',[listing])).rowCount).toBe(1)
 const trigger=await one("select prosecdef from pg_proc where oid='public.trade_listings_catalog_photo_guard_v1()'::regprocedure")
 expect(trigger.prosecdef).toBe(false)
})
it('compares complete observed ACL sets including version-dependent MAINTAIN and preserves both retained policies',async()=>{
 const removed=new Set(['INSERT','UPDATE','DELETE','TRUNCATE'])
 expect((await acl()).rows).toEqual(beforeAcl.filter(a=>!(['anon','authenticated'].includes(a.role)&&removed.has(a.privilege_type))))
 expect((await policies()).rows).toEqual(beforePolicies.filter(p=>p.policyname!=='designs_write_admin'))
 for(const role of ['anon','authenticated'])for(const privilege of removed)
  expect((await one('select has_table_privilege($1,\'jewelry_designs\',$2) as allowed',[role,privilege])).allowed).toBe(false)
 expect((await one("select count(*)::int as n from pg_attribute where attrelid='jewelry_designs'::regclass and attacl is not null")).n).toBe(0)
 const major=Number((await one('show server_version_num')).server_version_num)
 if(major>=170000)expect((await acl()).rows).toContainEqual({role:'authenticated',privilege_type:'MAINTAIN',is_grantable:false})
})
