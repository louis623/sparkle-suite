import { it, expect } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'

const rep = '11111111-1111-4111-8111-111111111111'
const other = '22222222-2222-4222-8222-222222222222'
const migration = readFileSync('supabase/migrations/20261110120000_tiktok_video_queue.sql', 'utf8')
const helperGrants = readFileSync('supabase/migrations/20261110180244_tiktok_queue_internal_helper_grants.sql', 'utf8')
async function withDb(run: (db: PGlite) => Promise<void>) {
  const db = new PGlite()
  try {
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
    await db.exec(readFileSync('supabase/migrations/20261110223956_tiktok_remove_video.sql','utf8'))
    await db.query('insert into tiktok_hosted_video_reps(rep_id) values($1)', [rep])
    await run(db)
  } finally { await db.close() }
}
async function save(db: PGlite, slots = [{ key: 'showcase', videoUrl: 'https://www.tiktok.com/@user/video/12345678' }], repId = rep) {
  await db.query('insert into site_settings values($1,$2) on conflict(rep_id) do update set homepage_media_slots=excluded.homepage_media_slots', [repId, JSON.stringify(slots)])
}
async function rows(db: PGlite, sql = 'select * from tiktok_video_queue order by created_at') { return (await db.query<Record<string, unknown>>(sql)).rows }
async function ticket(db: PGlite) {
  const item = (await rows(db,"select * from tiktok_video_queue where status='pending'"))[0]
  const result = await db.query<{ id: string }>(`insert into tiktok_video_upload_tickets(item_id,rep_id,tiktok_video_id,operator_rep_id,video_path,video_content_type,video_byte_size,poster_staging_path,poster_staging_content_type,poster_staging_byte_size,poster_path)
    values($1,$2,'12345678',$2,$3,'video/mp4',10,$4,'image/webp',10,$5) returning id`, [item.id, rep, `${rep}/12345678/file.mp4`, `${rep}/12345678/source.webp`, `${rep}/12345678/poster.webp`])
  return result.rows[0].id
}
async function complete(db: PGlite, id: string) {
  return (await db.query<{ result: { assetId: string; replayed: boolean } }>(`select complete_tiktok_queue_item($1,$2,'video/mp4',10,720,1280,30,'save_video') result`, [id,rep])).rows[0].result
}

async function remove(db: PGlite, key='showcase', url='https://www.tiktok.com/@user/video/12345678') {
  await db.query('select remove_tiktok_slot($1,$2,$3)',[rep,key,url])
}
it('tiktok remove: ready slot clears immediately and archives without deleting the MP4 after 90 days', () => withDb(async db => {
  await save(db); const asset = await complete(db, await ticket(db)); await remove(db)
  expect((await rows(db))[0]).toMatchObject({status:'archived',asset_id:asset.assetId})
  expect((await db.query<{slots: Array<{videoUrl:string;isVisible:boolean}>}>('select homepage_media_slots slots from site_settings')).rows[0].slots[0]).toMatchObject({videoUrl:'',isVisible:false})
  expect((await db.query('select * from tiktok_current_slot_ids($1)',[rep])).rows).toHaveLength(0)
  await db.exec("update tiktok_video_queue set closed_at=now()-interval '91 days'; select tiktok_queue_purge_closed()")
  expect(await rows(db)).toHaveLength(0)
  expect((await db.query('select status,storage_path from public_site_videos')).rows).toEqual([{status:'live',storage_path:`${rep}/12345678/file.mp4`}])
}))
it('tiktok remove: pending slot leaves the operator queue and its link is empty', () => withDb(async db => {
  await save(db); await remove(db)
  expect((await rows(db))[0]).toMatchObject({status:'archived',operator_note:'Removed from Workspace'})
  expect(await rows(db,"select * from tiktok_video_queue where status='pending'")).toHaveLength(0)
}))
it('tiktok remove: filled slot rejects replacement and new link after remove queues immediately', () => withDb(async db => {
  await save(db)
  await expect(save(db,[{key:'showcase',videoUrl:'https://www.tiktok.com/embed/87654321'}])).rejects.toThrow('tiktok_remove_before_replace')
  await remove(db)
  await save(db,[{key:'showcase',videoUrl:'https://www.tiktok.com/embed/87654321'}])
  expect(await rows(db,"select * from tiktok_video_queue where status='pending'")).toEqual([expect.objectContaining({tiktok_video_id:'87654321'})])
}))
it('tiktok remove: static marker archives and cannot survive sync or backfill as pending', () => withDb(async db => {
  await save(db)
  await db.query('select tiktok_queue_add_static($1,$2)',[rep,'https://www.tiktok.com/embed/12345678'])
  expect((await rows(db))[0].slot_keys).toContain('featured_reveal')
  await remove(db)
  await db.query('select tiktok_sync_rep($1)',[rep])
  await db.query('select tiktok_queue_add_static($1,$2)',[rep,'https://www.tiktok.com/embed/12345678'])
  expect((await rows(db))[0].status).toBe('archived')
  expect(await rows(db,"select * from tiktok_video_queue where status='pending'")).toHaveLength(0)
}))
it('tiktok remove: rep cannot execute another owner slot removal or the internal trigger', () => withDb(async db => {
  await save(db)
  await db.exec(`set role authenticated; set request.jwt.claim.sub='${other}'`)
  await expect(remove(db)).rejects.toThrow('permission denied')
  await expect(db.query('select tiktok_slot_clear_guard()')).rejects.toThrow('permission denied')
  await db.exec('reset role')
  expect((await rows(db))[0].status).toBe('pending')
}))
it('tiktok remove: shared ID stays queued for the other occupied slot', () => withDb(async db => {
  await save(db,[{key:'showcase',videoUrl:'https://www.tiktok.com/embed/12345678'},{key:'about_2',videoUrl:'https://www.tiktok.com/embed/12345678'}])
  await remove(db,'showcase','https://www.tiktok.com/embed/12345678')
  expect((await rows(db))[0]).toMatchObject({status:'pending',slot_keys:['about_2']})
}))
it('tiktok remove: stale removal cannot clear a newer assignment and gate-off writers stay unchanged', () => withDb(async db => {
  await save(db)
  await expect(remove(db,'showcase','https://www.tiktok.com/embed/87654321')).rejects.toThrow('source_changed')
  await save(db,undefined,other)
  await save(db,[{key:'showcase',videoUrl:'https://www.tiktok.com/embed/87654321'}],other)
  expect(await rows(db)).toHaveLength(1)
}))
