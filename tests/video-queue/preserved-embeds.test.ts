import {it,expect} from 'vitest'
import {PGlite} from '@electric-sql/pglite'
import {readFileSync} from 'node:fs'
import {renderTikTokCard} from '../fixtures/tiktok-render'
const rep = '11111111-1111-4111-8111-111111111111'
const other = '22222222-2222-4222-8222-222222222222'
const migration = readFileSync('supabase/migrations/20261110120000_tiktok_video_queue.sql', 'utf8')
const helperGrants = readFileSync('supabase/migrations/20261110180244_tiktok_queue_internal_helper_grants.sql', 'utf8')
async function database() {
  const db = new PGlite()

    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      alter default privileges in schema public grant execute on functions to service_role;
      create schema auth; create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table public.reps(id uuid primary key,status text,auth_user_id uuid,public_site_slug text);
      grant usage on schema public,auth to authenticated,service_role; grant select on public.reps to authenticated,service_role;
      create table public.site_settings(rep_id uuid primary key references public.reps(id),homepage_media_slots jsonb);
      insert into reps values ('${rep}','active','${rep}','dudesfizzfest'),('${other}','active','${other}','otherrep');`)
    await db.exec(migration)
    await db.exec(helperGrants)
    await db.query('insert into tiktok_hosted_video_reps(rep_id) values($1)', [rep])
    await db.exec(readFileSync('supabase/migrations/20261110223956_tiktok_remove_video.sql', 'utf8'))
    return db
}


async function fixture(run:(db:PGlite)=>Promise<void>){
 const db=await database()
 try{
  for(const file of ['20261113120000_one_video_queue_all_sources.sql','20261113130000_one_video_queue_playlist_and_static_guard.sql','20261113140000_queue_preserved_embeds_until_publish.sql'])await db.exec(readFileSync('supabase/migrations/'+file,'utf8'))
  await run(db)
 }finally{await db.close()}
}
const enroll=(db:PGlite)=>db.query('select enroll_preserved_video_queue($1)',[rep])
const marker=async(db:PGlite)=>(await db.query('select slot_key,source_provider from tiktok_video_preserved_assignments order by slot_key')).rows
const tt = 'https://www.tiktok.com/@user/video/12345678'
const fb = 'https://www.facebook.com/reel/12345678'
const yt = 'https://www.youtube.com/watch?v=aBcDeF12_-Z'
const ig = 'https://www.instagram.com/reel/AbCd_12/'
const slot = (key: string, videoUrl: string, isVisible = true) => ({key, videoUrl, isVisible})
async function save(db: PGlite, slots: ReturnType<typeof slot>[], owner = rep) {
  await db.query('insert into site_settings values($1,$2) on conflict(rep_id) do update set homepage_media_slots=excluded.homepage_media_slots',[owner,JSON.stringify(slots)])
}
const enable = (db: PGlite, on = true) => db.query('select set_all_sources_enabled($1,$2)',[rep,on])
const queue = async (db: PGlite) => (await db.query<{id:string; source_provider:string; status:string; asset_id:string}>('select * from tiktok_video_queue order by created_at')).rows
async function makeTicket(db: PGlite, item: string, legacy = false) {
  const extra = legacy ? '' : ',source_provider'
  const paths = crypto.randomUUID()
  const query = 'insert into tiktok_video_upload_tickets(item_id,rep_id,tiktok_video_id,operator_rep_id,video_path,video_content_type,video_byte_size,poster_staging_path,poster_staging_content_type,poster_staging_byte_size,poster_path'+extra+') select id,rep_id,tiktok_video_id,rep_id,$2,\'video/mp4\',10,$3,\'image/webp\',10,$4'+extra+' from tiktok_video_queue where id=$1 returning id'
  return (await db.query<{id:string}>(query,[item,paths+'.mp4',paths+'-src.webp',paths+'.webp'])).rows[0].id
}
async function complete(db:PGlite,ticket:string) {
  return (await db.query<{result:{assetId:string;replayed:boolean}}>("select complete_tiktok_queue_item($1,$2,'video/mp4',10,720,1280,30,'save_video') result",[ticket,rep])).rows[0].result
}
const remove = (db:PGlite,key:string,url:string) => db.query('select remove_tiktok_slot($1,$2,$3)',[rep,key,url])

function preservedCard(url:string){
 return renderTikTokCard(readFileSync('lib/amethyst/v2/homepage.jsx','utf8'),{tiktokHostedMode:true},'CustomerVideoCard',{videoUrl:url,title:'Video',queueManaged:'preserved'})
}
it('P01 existing TikTok and YouTube embeds remain iframes while queued exactly once',()=>fixture(async db=>{
 await save(db,[slot('showcase',tt),slot('about_2',yt)])
 await enroll(db);await enroll(db);await db.exec('select tiktok_queue_daily_maintenance()')
 expect((await queue(db)).filter(q=>q.status==='pending')).toHaveLength(2)
 expect(await marker(db)).toHaveLength(2)
 for(const url of [tt,yt]){const html=preservedCard(url);expect(html).toContain('<iframe');expect(html).not.toContain('ss-hosted-link-label')}
}),60000)
it('P02 publishing an MP4 releases only its matching preserved identity',()=>fixture(async db=>{
 await save(db,[slot('showcase',tt),slot('about_2',yt)]);await enroll(db)
 const q=(await queue(db)).find(q=>q.source_provider==='youtube')!
 const ticket=await makeTicket(db,q.id);await complete(db,ticket);expect((await complete(db,ticket)).replayed).toBe(true)
 expect(await marker(db)).toEqual([{slot_key:'showcase',source_provider:'tiktok'}])
 expect((await queue(db)).find(row=>row.id===q.id)?.status).toBe('completed')
}),60000)
it('P03 cannot-get dismissal and purge retain the original embed',()=>fixture(async db=>{
 await save(db,[slot('showcase',tt),slot('about_2',yt)]);await enroll(db)
 for(const q of await queue(db))await db.query('select archive_tiktok_queue_item($1,$2)',[q.id,'Cannot get this video'])
 await db.exec("update tiktok_video_queue set closed_at=now()-interval '91 days';select tiktok_queue_purge_closed();select tiktok_queue_daily_maintenance()")
 expect(await marker(db)).toHaveLength(2);expect(await queue(db)).toHaveLength(0)
 for(const url of [tt,yt])expect(preservedCard(url)).toContain('<iframe')
}),60000)
it('P04 replacement and removal release preservation and new links queue normally',()=>fixture(async db=>{
 await save(db,[slot('showcase',tt),slot('about_2',yt)]);await enroll(db)
 await save(db,[slot('showcase',fb),slot('about_2',yt)])
 await remove(db,'about_2',yt)
 expect(await marker(db)).toEqual([])
 expect((await queue(db)).find(q=>q.source_provider==='facebook')?.status).toBe('pending')
 expect(renderTikTokCard(readFileSync('lib/amethyst/v2/homepage.jsx','utf8'),{tiktokHostedMode:true},'CustomerVideoCard',{videoUrl:fb,queueManaged:true})).not.toContain('<iframe')
}),60000)
