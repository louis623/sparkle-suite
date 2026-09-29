import {describe,it,expect,beforeEach,afterEach} from 'vitest'
import {PGlite} from '@electric-sql/pglite'
import {readFileSync} from 'node:fs'
const rep='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222'
let db:PGlite
const identity=(id='p:a')=>({id,sourceIdentityVersion:'1:doc:1'})
const e=(id='p:a',name='Jane',lastName='Smith')=>({...identity(id),name,lastName,identityEligible:true})
async function state(entries=[e()],overrides={}) {const now=new Date();await db.query('insert into live_lineup_states values($1,$2) on conflict(rep_id) do update set state=excluded.state',[rep,{show:{generation:1,excludedPartyIds:[]},entries,order:entries.map(x=>x.id),held:[],parserState:'ready',lastReadyAt:now.toISOString(),lastReceivedAt:now.toISOString(),publisher:{leaseExpiresAt:new Date(+now+60000).toISOString()},sourceObservation:{settled:true},...overrides}])}
async function cards(action='read',extra:{customerId?:string;newId?:string;label?:string}={},ids=[identity()]) {return (await db.query<{result:any}>('select live_lineup_customer_cards($1,1,$2,$3,$4,$5,$6,$7) result',[rep,JSON.stringify(ids),action,action==='read'?null:ids[0].id,extra.customerId??null,extra.newId??null,extra.label??null])).rows[0].result}
beforeEach(async()=>{
 db=new PGlite()
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create function auth.uid() returns uuid language sql stable as 'select null::uuid';
 create table reps(id uuid primary key,auth_user_id uuid);create table live_lineup_states(rep_id uuid primary key,state jsonb);
 create table customer_audience(id uuid primary key default gen_random_uuid(),rep_id uuid references reps(id),name text,record_source text default 'manual',birthday_month integer,birthday_day integer,favorite_gem_or_stone text,favorite_material text,favorite_cut text,favorite_collection text,sms_consent boolean,email_consent boolean,marketing_consent boolean,consent_date timestamptz,created_at timestamptz default now(),unique(id,rep_id));
 create table customer_audience_change_log(audience_id uuid,rep_id uuid,actor_kind text,action text,changes jsonb);`)
 await db.query('insert into reps(id) values($1),($2)',[rep,other])
 for(const file of ['20260926000200_ss_live_lineup_audience_matches.sql','20260929000100_live_lineup_customer_cards.sql'])await db.exec(readFileSync(new URL('../supabase/migrations/'+file,import.meta.url),'utf8'))
 await state()
},30000)
afterEach(async()=>{await db.close()})
describe('smart lineup customer identity',()=>{
 it('creates once across repeated/multiple orders, preserves preferences and never grants consent',async()=>{
  await state([e(),e('p:b')]);const first=await cards('read',{},[identity(),identity('p:b')]);
  expect(first.matches[0].audienceId).toBe(first.matches[1].audienceId)
  await db.query("update customer_audience set favorite_cut='Oval' where id=$1",[first.matches[0].audienceId])
  const next=await cards();expect(next.matches[0].preferences).toEqual(['Oval'])
  const rows=await db.query('select * from customer_audience');expect(rows.rows).toHaveLength(1)
  expect(rows.rows[0]).toMatchObject({sms_consent:false,email_consent:false,marketing_consent:false,consent_date:null,record_source:'live_lineup',profile_version:1})
 })
 it('hides duplicate full-name details and confirms only the selected order',async()=>{
  await state([e(),e('p:b')]);await cards()
  const second=(await db.query<{id:string}>("insert into customer_audience(rep_id,name,favorite_cut,identity_label) values($1,'JANE SMITH','Pear','Ohio') returning id",[rep])).rows[0].id
  expect((await cards()).matches[0]).toMatchObject({status:'needs_clarification',audienceId:null,birthday:null,preferences:[]})
  await cards('resolve',{customerId:second});
  const result=await cards('read',{},[identity(),identity('p:b')]);expect(result.matches[0]).toMatchObject({status:'matched',label:'Ohio',preferences:['Pear']});expect(result.matches[1].status).toBe('needs_clarification')
  await state([e(),e('p:b')]);expect((await cards()).matches[0].audienceId).toBe(second)
 })
 it('refuses wrong-tenant selection and changed source identity',async()=>{
  const id=(await db.query<{id:string}>("insert into customer_audience(rep_id,name) values($1,'Jane Smith') returning id",[other])).rows[0].id
  await expect(cards('resolve',{customerId:id})).rejects.toThrow('invalid_customer')
  await expect(cards('read',{},[{id:'p:a',sourceIdentityVersion:'old'}])).rejects.toThrow('identity_changed')
  expect((await db.query('select * from customer_audience where rep_id=$1',[rep])).rows).toHaveLength(0)
 })
 it('does not create from stale or hidden orders; stale matches cannot be confirmed',async()=>{
  await state([e()],{lastReadyAt:'2020-01-01T00:00:00Z'});expect((await cards()).matches[0].status).toBe('unavailable')
  await expect(cards('create',{newId:crypto.randomUUID(),label:'Ohio'})).rejects.toThrow('source_not_ready')
  await state([e()],{show:{generation:1,excludedPartyIds:['p']}});await expect(cards()).rejects.toThrow('identity_changed')
 })
 it('separate-person creation is idempotent and does not rename or merge anyone',async()=>{
  await cards();const newId=crypto.randomUUID();await cards('create',{newId,label:'Local pickup'});await cards('create',{newId,label:'Local pickup'})
  expect((await db.query('select name from customer_audience')).rows).toEqual([{name:'Jane Smith'},{name:'Jane Smith'}])
  expect((await cards()).matches[0]).toMatchObject({audienceId:newId,label:'Local pickup'})
  expect((await db.query("select * from customer_audience_change_log where actor_kind='rep'")).rows).toHaveLength(1)
 })
 it('never exposes the reconciliation RPC to unprivileged roles',async()=>{
  await db.exec('set role authenticated');await expect(cards()).rejects.toThrow('permission denied')
 })
})
