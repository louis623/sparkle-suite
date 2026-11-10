import { it, expect } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import fixtures from './fixtures/tiktok-url-cases.json'
import { getTikTokVideoId, canonicalTikTokUrl } from '@/lib/public-site/tiktok-video-id'
import { backfillTikTokQueue } from '../scripts/backfill-tiktok-video-queue'
import { BRITT_WITH_BLING_SHOWCASE_VIDEO_URL } from '@/lib/britt-with-bling/constants'

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

it('tiktok sql: url fixtures parse the same as TS', () => withDb(async db => {
  for (const f of fixtures) {
    const result = (await db.query<{ id: string | null; url: string | null }>('select tiktok_video_id_from_url($1) id,tiktok_canonical_url($1) url',[f.url])).rows[0]
    expect(result).toEqual({ id: f.id, url: f.canonical })
    expect(getTikTokVideoId(f.url)).toBe(f.id)
    expect(canonicalTikTokUrl(f.url)).toBe(f.canonical)
  }
}))
it('tiktok sql: enabled rep save queues once and merges slot keys; disabled rep queues nothing', () => withDb(async db => {
  await save(db)
  await save(db, [{key:'showcase',videoUrl:'https://www.tiktok.com/embed/12345678'},{key:'about_2',videoUrl:'https://www.tiktok.com/embed/12345678'}])
  await save(db, undefined, other)
  const q = await rows(db)
  expect(q).toHaveLength(1)
  expect(q[0].slot_keys).toEqual(['about_2','showcase'])
}))
it('tiktok sql: removing a link or deleting settings cancels pending', () => withDb(async db => {
  await save(db); await save(db, [])
  expect((await rows(db))[0]).toMatchObject({status:'cancelled',cancel_reason:'link_removed'})
  await save(db)
  await db.exec('delete from site_settings')
  expect((await rows(db)).every(q => q.status === 'cancelled')).toBe(true)
}))
it('tiktok sql: live asset means no pending row and restore needs no upload', () => withDb(async db => {
  await save(db); const id = await ticket(db); const result = await complete(db,id)
  await save(db, [{key:'showcase',videoUrl:'https://www.tiktok.com/embed/87654321'}]); await save(db)
  expect(await rows(db,"select * from tiktok_video_queue where status='pending'")).toHaveLength(0)
  expect(await rows(db,"select * from public_site_videos where status='live'")).toEqual([expect.objectContaining({id:result.assetId,tiktok_video_id:'12345678'})])
  await db.exec("update tiktok_video_queue set closed_at=now()-interval '91 days', pending_poster_path=(select poster_path from public_site_videos limit 1) where status <> 'pending'")
  const purge = (await db.query<{thumb_paths:string[]}>('select * from tiktok_queue_purge_closed()')).rows[0]
  expect(purge.thumb_paths).toEqual([])
  expect(await rows(db,'select * from public_site_videos')).toHaveLength(1)
}))
it('tiktok sql: archive survives purge and edits, and reopens by rep and video after purge', () => withDb(async db => {
  await save(db); const item = (await rows(db))[0]
  await db.query('select archive_tiktok_queue_item($1,$2)',[item.id,'Unavailable'])
  await db.exec("update tiktok_video_queue set closed_at=now()-interval '91 days',pending_poster_path='rep/purged-thumb.webp'")
  const purge = (await db.query<{purged_count:number;thumb_paths:string[]}>('select * from tiktok_queue_purge_closed()')).rows[0]
  expect(purge).toEqual({purged_count:1,thumb_paths:['rep/purged-thumb.webp']})
  await save(db, [{key:'about_4',videoUrl:'https://www.tiktok.com/embed/12345678'}])
  expect(await rows(db)).toHaveLength(0)
  await db.query('select reopen_tiktok_dismissal($1,$2)',[rep,'12345678'])
  expect((await rows(db))[0]).toMatchObject({status:'pending',origin:'reopen',slot_keys:['about_4']})
  expect(await rows(db,'select * from tiktok_video_dismissals')).toHaveLength(0)
}))
it('tiktok sql: complete replays the original asset and rejects a changed source', () => withDb(async db => {
  await save(db); const id = await ticket(db); const result = await complete(db,id)
  expect(await complete(db,id)).toEqual({...result,replayed:true})
  expect(await rows(db,'select * from public_site_videos')).toHaveLength(1)
  await save(db, [])
  await db.query('select reopen_tiktok_queue_item($1)',[(await rows(db))[0].id])
  await db.exec('delete from tiktok_video_upload_tickets')
  const changed = await ticket(db)
  await expect(complete(db,changed)).rejects.toThrow(/source_changed/)
}))
it('tiktok sql: busy lock or sync error never fails the settings save', () => withDb(async db => {
  await db.exec("create or replace function tiktok_sync_locked(p_rep_id uuid,p_origin text default 'slot') returns void language plpgsql as $$ begin raise exception 'forced sync error'; end $$")
  await save(db)
  expect(await rows(db,'select * from site_settings')).toHaveLength(1)
  expect((await rows(db,'select * from tiktok_queue_reconcile'))[0].reason).toBe('error')
  await db.exec('alter table tiktok_queue_reconcile add constraint fail_logging check(false) not valid')
  await save(db, [])
  expect(await rows(db,'select * from site_settings')).toHaveLength(1)
  expect(migration).toContain('pg_try_advisory_xact_lock')
}))
it('tiktok sql: daily maintenance isolates a failing rep and retries it next run', () => withDb(async db => {
  await db.query('insert into tiktok_hosted_video_reps(rep_id) values($1)',[other])
  await db.exec(`create or replace function tiktok_sync_locked(p_rep_id uuid,p_origin text default 'slot') returns void language plpgsql as $$ begin if p_rep_id='${rep}'::uuid then raise exception 'forced'; end if; end $$`)
  const first = (await db.query<{ result: { synced:number; failed:number } }>('select tiktok_queue_daily_maintenance() result')).rows[0].result
  expect(first).toEqual({synced:1,failed:1})
  await db.exec('select tiktok_queue_daily_maintenance()')
  expect((await rows(db,'select * from tiktok_queue_reconcile'))[0].attempts).toBe(2)
}))
it('tiktok sql: grants hide private columns and functions from reps', () => withDb(async db => {
  for (const signature of ['tiktok_sync_locked(uuid,text)', 'tiktok_queue_try_sync(uuid)', 'tiktok_queue_lock_key(uuid)', 'site_settings_tiktok_queue_trigger()', 'reps_tiktok_queue_trigger()']) {
    expect((await db.query<{ allowed: boolean }>("select has_function_privilege('service_role',$1,'EXECUTE') allowed", [signature])).rows[0].allowed).toBe(false)
  }
  expect((await db.query<{ allowed: boolean }>("select has_function_privilege('service_role','tiktok_current_slot_ids(uuid)','EXECUTE') allowed")).rows[0].allowed).toBe(true)
  await save(db)
  await db.exec('set role service_role')
  await expect(db.query('select tiktok_queue_try_sync($1)', [rep])).rejects.toThrow(/permission denied/)
  await db.query('select tiktok_sync_rep($1)', [rep])
  expect((await db.query('select * from tiktok_current_slot_ids($1)', [rep])).rows).toHaveLength(1)
  await db.exec('reset role')
  await db.exec(`set role authenticated; set request.jwt.claim.sub='${rep}'`)
  expect(await rows(db,'select rep_id,tiktok_video_id,status from tiktok_video_queue')).toHaveLength(1)
  await expect(rows(db,'select operator_note from tiktok_video_queue')).rejects.toThrow(/permission denied/)
  await expect(db.query('select reopen_tiktok_dismissal($1,$2)',[rep,'12345678'])).rejects.toThrow(/permission denied/)
  await db.exec(`set request.jwt.claim.sub='${other}'`)
  expect(await rows(db,'select rep_id,tiktok_video_id,status from tiktok_video_queue')).toHaveLength(0)
}))

it('tiktok backfill: Britt explainer and featured reveal queue once and survive sync', () => withDb(async db => {
  await db.query("update reps set public_site_slug='brittwithbling' where id=$1", [rep])
  const explainer = getTikTokVideoId(BRITT_WITH_BLING_SHOWCASE_VIDEO_URL)!
  const featured = '7609434971228425486'
  await save(db, [{ key: 'showcase', videoUrl: `https://www.tiktok.com/embed/${featured}` }])
  const rpcNames: string[] = []
  const client = {
    async rpc(name: string, args: Record<string, unknown>) {
      rpcNames.push(name)
      expect(['tiktok_hosted_video_enabled','tiktok_sync_rep','tiktok_queue_add_static','tiktok_current_slot_ids']).toContain(name)
      const params = Object.values(args)
      const call = `${name}(${params.map((_, i) => `$${i + 1}`).join(',')})`
      const result = await db.query<{ result: unknown }>(name === 'tiktok_current_slot_ids' ? `select * from ${call}` : `select ${call} result`, params)
      return { data: name === 'tiktok_current_slot_ids' ? result.rows : result.rows[0].result, error: null }
    },
    from(table: string) {
      expect(['reps','public_site_videos','tiktok_video_dismissals','tiktok_video_queue']).toContain(table)
      return { select(columns: string) {
        const filters: Array<[string, unknown]> = []
        const query = async () => ({ data: (await db.query(`select ${columns} from ${table} where ${filters.map(([column], i) => `${column}=$${i + 1}`).join(' and ')}`, filters.map(([, value]) => value))).rows, error: null })
        const chain = {
          eq(column: string, value: unknown) { filters.push([column, value]); return chain },
          async maybeSingle() { const result = await query(); return { ...result, data: result.data[0] ?? null } },
          then(resolve: (result: unknown) => unknown, reject: (error: unknown) => unknown) { return query().then(resolve, reject) },
        }
        return chain
      } }
    },
  } as unknown as Parameters<typeof backfillTikTokQueue>[0]
  const output: string[] = []
  await db.exec('set role service_role')
  await backfillTikTokQueue(client, ['brittwithbling'], false, line => output.push(line))
  expect(JSON.parse(output.pop()!)).toMatchObject({ mode: 'dry-run', pendingItems: 1, wouldCreate: 1 })
  expect(rpcNames).not.toContain('tiktok_sync_rep')
  expect(rpcNames).not.toContain('tiktok_queue_add_static')
  expect(await rows(db)).toHaveLength(1)
  await backfillTikTokQueue(client, ['brittwithbling'], true, line => output.push(line))
  await backfillTikTokQueue(client, ['brittwithbling'], true, line => output.push(line))
  expect(await rows(db)).toEqual(expect.arrayContaining([
    expect.objectContaining({ tiktok_video_id: featured, slot_keys: ['featured_reveal', 'showcase'] }),
    expect.objectContaining({ tiktok_video_id: explainer, slot_keys: ['featured_reveal'], origin: 'static' }),
  ]))
  expect(await rows(db)).toHaveLength(2)
  await db.exec('reset role')
  await save(db, [])
  expect((await rows(db)).every(item => item.status === 'pending')).toBe(true)
  const item = (await rows(db)).find(item => item.tiktok_video_id === explainer)!
  await db.query('select archive_tiktok_queue_item($1,$2)', [item.id, 'Unavailable'])
  await db.exec('set role service_role')
  await backfillTikTokQueue(client, ['brittwithbling'], true, line => output.push(line))
  expect(JSON.parse(output.pop()!)).toMatchObject({ pendingItems: 1, wouldCreate: 0 })
  expect(await rows(db,"select * from tiktok_video_queue where status='pending'")).toHaveLength(1)
}))
