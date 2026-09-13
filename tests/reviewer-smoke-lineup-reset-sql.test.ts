import {readFileSync} from 'node:fs'
import {PGlite} from '@electric-sql/pglite'
import {expect,it} from 'vitest'
import {resetReviewerLiveLineup} from '@/lib/reviewer-smoke/live-lineup-reset'

// Exact additive SQL on one embedded connection, synthetic-only. This verifies
// atomic rollback/authorization, NOT concurrent publisher or hosted Supabase behavior.
it('guards and atomically resets only the reserved reviewer with no fake ready state',async()=>{
  const sql=new PGlite()
  const rep='11111111-1111-4111-8111-111111111111',auth='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',other='22222222-2222-4222-8222-222222222222'
  const email='sparkle-reviewer+preview@neonrabbit.net'
  try {
    await sql.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create table auth.users(id uuid primary key,email text,raw_app_meta_data jsonb);
      create table reps(id uuid primary key,auth_user_id uuid,email text,account_classification text,finder_directory_visible boolean,custom_domain text,public_site_slug text);
      create table subscriptions(rep_id uuid primary key,stripe_livemode boolean,monthly_amount numeric,pricing_tier text,stripe_subscription_id text,stripe_customer_id text);
      create table live_queue(rep_id uuid primary key,sync_code text,queue jsonb,last_updated timestamptz);`)
    await sql.query('insert into auth.users values($1,$2,$3)',[auth,email,JSON.stringify({reviewer_smoke_scope:'sparkle-suite-reviewer-v1'})])
    await sql.query("insert into reps values($1,$2,$3,'demo',false,null,'sparkle-reviewer-preview'),($4,null,'customer@example.com','customer',true,'customer.example.com','customer')",[rep,auth,email,other])
    await sql.query("insert into subscriptions values($1,false,0,'smoke',$2,$3)",[rep,`sub_reviewer_smoke_${rep}`,`cus_reviewer_smoke_${rep}`])
    const lineupSql=readFileSync(new URL('../supabase/migrations/20260910000100_live_lineup_v2.sql',import.meta.url),'utf8')
    await sql.exec(lineupSql)
    const resetSql=readFileSync(new URL('../supabase/migrations/20260910000200_reviewer_live_lineup_reset.sql',import.meta.url),'utf8')
    const tenantLock='pg_advisory_xact_lock(hashtextextended(p_rep_id::text, 734918))'
    expect(lineupSql).toContain(tenantLock)
    expect(resetSql).toContain(tenantLock)
    expect(resetSql.indexOf(tenantLock)).toBeLessThan(resetSql.indexOf('select u.* into reviewer_auth'))
    await sql.exec(resetSql)
    for(const [id,hash] of [[rep,'a'],[other,'b']]) {
      await sql.query('insert into live_lineup_states(rep_id,revision,state) values($1,1,$2)',[id,JSON.stringify({schemaVersion:2,revision:1,entries:[],order:[],held:[]})])
      await sql.query("insert into live_lineup_publisher_tokens(rep_id,token_hash,label) values($1,$2,'Synthetic fixture')",[id,hash.repeat(64)])
      await sql.query("insert into live_lineup_show_archives(rep_id,generation,revision,state) values($1,0,1,'{}')",[id])
      await sql.query("insert into live_queue values($1,'KEEP-CODE','[{\"name\":\"Synthetic\"}]',clock_timestamp())",[id])
    }
    const call=()=>sql.query('select * from reset_reviewer_live_lineup($1,$2,$3)',[rep,auth,email])
    // Rejected operations roll back all fixture data. Auth metadata is server-owned only.
    await sql.query("update auth.users set raw_app_meta_data='{}' where id=$1",[auth])
    await expect(call()).rejects.toThrow('server-owned')
    await sql.query("update auth.users set raw_app_meta_data=$2 where id=$1",[auth,JSON.stringify({reviewer_smoke_scope:'sparkle-suite-reviewer-v1'})])
    for(const update of ["custom_domain='unsafe.example.com'","public_site_slug='customer-site'","finder_directory_visible=true","account_classification='customer'"]) {
      await sql.query(`update reps set ${update} where id=$1`,[rep]);await expect(call()).rejects.toThrow('isolated')
      await sql.query("update reps set custom_domain=null,public_site_slug='sparkle-reviewer-preview',finder_directory_visible=false,account_classification='demo' where id=$1",[rep])
    }
    await sql.query('update subscriptions set stripe_livemode=true where rep_id=$1',[rep]);await expect(call()).rejects.toThrow('zero-dollar')
    await sql.query('update subscriptions set stripe_livemode=false where rep_id=$1',[rep])
    expect((await sql.query('select * from live_lineup_states')).rows).toHaveLength(2)
    await sql.exec('set role anon');await expect(call()).rejects.toThrow('permission denied');await sql.exec('reset role; set role authenticated');await expect(call()).rejects.toThrow('permission denied');await sql.exec('reset role; set role service_role')
    // Direct destructive grants remain absent; only the narrow guarded RPC can delete.
    await expect(sql.query('delete from live_lineup_states where rep_id=$1',[rep])).rejects.toThrow('permission denied')
    const adapter={rpc:async(_name:string,args:Record<string,unknown>)=>{
      try {const result=await sql.query('select * from reset_reviewer_live_lineup($1,$2,$3)',[args.p_rep_id,args.p_auth_user_id,args.p_email]);return {data:JSON.parse(JSON.stringify(result.rows)),error:null}}
      catch(error){return {data:null,error}}
    }}
    expect(await resetReviewerLiveLineup(adapter as never,rep,auth,email)).toMatchObject({ready:false,state:'not_initialized'})
    await sql.exec('reset role')
    for(const table of ['live_lineup_states','live_lineup_show_archives','live_lineup_publisher_tokens']) expect((await sql.query(`select rep_id from ${table}`)).rows).toEqual([{rep_id:other}])
    expect((await sql.query('select sync_code,queue,last_updated from live_queue where rep_id=$1',[rep])).rows).toEqual([{sync_code:'KEEP-CODE',queue:[],last_updated:null}])
    expect((await sql.query('select queue from live_queue where rep_id=$1',[other])).rows).toEqual([{queue:[{name:'Synthetic'}]}])
    expect((await call()).rows[0]).toMatchObject({ready:false,deleted_states:0,deleted_tokens:0,deleted_archives:0})
  } finally {await sql.close()}
},30_000)
