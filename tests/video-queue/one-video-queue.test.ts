import { it, expect, beforeAll, afterAll, vi } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { createHash } from 'node:crypto'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { SiteSettingsCard } from '@/app/nic-nac/components/DashboardPlaceholder'
import { isQueuedVideoUrl, queueVideoLink } from '@/lib/public-site/queue-video-link'
import { resolveTikTokShortVideoUrl } from '@/lib/public-site/tiktok-short-link'
import { normalizePublicMediaUrl } from '@/lib/public-site/media-url'
import { renderTikTokCard } from '../fixtures/tiktok-render'
import fixtures from './video-link-fixtures.json'
import type { SupabaseClient } from '@supabase/supabase-js'
import { attachTikTokSlotStatus, updateSiteSettingsDashboard } from '@/lib/services/site-settings'
import { attachHostedTikTokVideos } from '@/lib/amethyst/preview-template-data'
import { defaultAmethystHomepageTemplateData } from '@/lib/amethyst/homepage-template-data'
import type { SiteSettingsDashboardResult } from '@/lib/services/types'

const selected = vi.hoisted(() => ({ admin: undefined as SupabaseClient | undefined }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => selected.admin }))

// Exercise the application readers against the migrated PostgreSQL fixture.
function reader(db: PGlite) {
  return {
    rpc: async (name:string, args:{p_rep_id:string}) => ({ data:(await db.query<{v:boolean}>('select '+name+'($1) v',[args.p_rep_id])).rows[0].v, error:null }),
    storage:{ from:() => ({getPublicUrl:(path:string) => ({data:{publicUrl:'https://fixture/'+path}})}) },
    from: (table:string) => ({ select:(columns:string) => {
      const clauses:string[] = []
      const values:unknown[] = []
      const query = {
        eq(key:string, value:unknown) { values.push(value); clauses.push(key+'=$'+values.length); return query },
        in(key:string, list:unknown[]) { values.push(list); clauses.push(key+'=any($'+values.length+'::text[])'); return query },
        then(resolve:(value:unknown)=>unknown, reject:(error:unknown)=>unknown) {
          return db.query('select '+columns+' from '+table+' where '+clauses.join(' and '),values).then(result=>resolve({data:result.rows,error:null}),reject)
        },
      }
      return query
    }}),
  } as unknown as SupabaseClient
}
async function attached(db:PGlite, url:string) {
  const client = reader(db)
  selected.admin = client
  return attachTikTokSlotStatus(client,rep,{homepageMediaSlots:[{key:'showcase',videoUrl:url,isVisible:true}]} as SiteSettingsDashboardResult)
}
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

const followup = [
  '20261113120000_one_video_queue_all_sources.sql',
  '20261113130000_one_video_queue_playlist_and_static_guard.sql',
].map(file => readFileSync('supabase/migrations/' + file, 'utf8')).join('\n')
const sources = ['lib/amethyst/v2/homepage.jsx','lib/amethyst/legacy/assets/homepage.jsx','public/amethyst/homepage.jsx'].map(p => readFileSync(p, 'utf8'))
let parserDb: PGlite
beforeAll(async () => { parserDb = await database(); await parserDb.exec(followup) }, 60000)
afterAll(async () => { await parserDb?.close() })
async function isolated(run: (db: PGlite) => Promise<void>, legacy = false) {
  const db = await database()
  try {
    if (!legacy) await db.exec(followup)
    await run(db)
  } finally { await db.close() }
}
async function parity(group: string) {
  for (const row of fixtures.filter(f => f.test === group)) {
    const expected = {provider: row.provider, id: row.id, error: row.error}
    const actual = queueVideoLink(row.url)
    expect(actual, row.url).toMatchObject(expected)
    for (const source of sources) {
      const parser = source.split('// queue-video-parser:start')[1].split('// queue-video-parser:end')[0]
      expect(runInNewContext(parser + '\nqueueVideoLink(input)', { URL, input:row.url })).toEqual(actual)
    }
    const sql = (await parserDb.query<{link: typeof actual | null; reason: string | null; locked: boolean}>(
      'select queue_video_link($1) link,queue_video_link_error($1) reason,is_queued_video_url($1) locked',[row.url])).rows[0]
    expect(sql.link, row.url).toEqual(actual.id ? {provider:actual.provider,id:actual.id,canonical:actual.canonical} : null)
    expect(sql.reason).toBe(actual.error)
    expect(sql.locked).toBe(isQueuedVideoUrl(row.url))
  }
}
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
function card(url:string, managed:boolean, ready=false, fallback=false, source=sources[0]) {
  return renderTikTokCard(source,{tiktokHostedMode:true},'CustomerVideoCard',{videoUrl:url,title:'Reveal',queueManaged:managed,hostedVideo:ready?{src:'https://fixture/video.mp4',poster:'https://fixture/poster.webp'}:undefined},{withoutPlayerRuntime:fallback})
}
function workspace(on:boolean) {
  const settings = {displayName:'Smoke',businessName:'Smoke',email:'',phone:'',bannerText:'',bannerVisible:true,tickerText:'',tickerVisible:false,tagline:'',heroImageUrl:'',heroAnimationType:'soft_glow' as const,teamName:'',showJoinPage:true,customerSiteTemplate:'amethyst' as const,appearancePreset:'amethyst' as const,socialHandles:{},tiktokQueueEnabled:true,allSourcesEnabled:on}
  return renderToStaticMarkup(createElement(SiteSettingsCard,{state:{status:'ready',settings},draft:settings,hasUnsavedChanges:false,statusMessage:''}))
}

it('T01 YouTube accepted forms', async () => {
  await parity('T01')
  expect(queueVideoLink(normalizePublicMediaUrl('<iframe src="https://youtu.be/aBcDeF12_-Z"></iframe>')).id).toBe('aBcDeF12_-Z')
})

it('T02 Instagram accepted forms', async () => {
  await parity('T02')
})

it('T03 Facebook accepted forms', async () => {
  await parity('T03')
})

it('T04 TikTok accepted forms and bounded short links', async () => {
  await parity('T04')
  expect(await resolveTikTokShortVideoUrl('https://vm.tiktok.com/ZMabcdef/',async () => ({ status:302, location:tt }))).toBe(tt)
})

it('T05 YouTube rejects', async () => {
  await parity('T05')
})

it('T06 Instagram rejects', async () => {
  await parity('T06')
})

it('T07 Facebook rejects with exact messages', async () => {
  await parity('T07')
})

it('T08 TikTok rejects', async () => {
  await parity('T08')
})

it('T09 populated migration preserves references, grants and old tickets; four sources queue', () => isolated(async db => {
  await save(db,[slot('showcase',tt),slot('about_2',tt.replace('12345678','87654321')),slot('about_3',tt.replace('12345678','23456789'))])
  const old = (await db.query<{id:string;tiktok_video_id:string}>('select id,tiktok_video_id from tiktok_video_queue order by tiktok_video_id')).rows
  const outstanding = await makeTicket(db,old[0].id,true)
  const asset = await complete(db,await makeTicket(db,old[1].id,true))
  await db.query('select archive_tiktok_queue_item($1,$2)',[old[2].id,'Unavailable'])
  const tables = ['tiktok_video_queue','public_site_videos','tiktok_video_dismissals','tiktok_video_upload_tickets']
  const snapshot = async () => Promise.all(tables.map(async table => (await db.query("select to_jsonb(t)-'source_provider' r from "+table+" t order by 1")).rows))
  const before = await snapshot()
  await db.exec(followup)
  expect(await snapshot()).toEqual(before)
  for (const table of tables) expect((await db.query("select distinct source_provider from "+table)).rows).toEqual([{source_provider:'tiktok'}])
  expect((await queue(db)).find(q=>q.id===old[1].id)?.asset_id).toBe(asset.assetId)
  expect((await complete(db,outstanding)).replayed).toBe(false)
  await db.exec("set role authenticated; select set_config('request.jwt.claim.sub','"+rep+"',false)")
  for (const table of tables.slice(0,2)) {
    expect((await db.query('select source_provider from '+table)).rows.length).toBeGreaterThan(0)
    await expect(db.query('select * from '+table)).rejects.toThrow(/permission/)
  }
  await db.exec('reset role')
  await remove(db,'showcase',tt)
  await remove(db,'about_2',tt.replace('12345678','87654321'))
  await remove(db,'about_3',tt.replace('12345678','23456789'))
  await enable(db)
  await save(db,[slot('showcase',tt.replace('12345678','98765432')),slot('about_2',yt),slot('about_3',ig),slot('about_4',fb)])
  expect((await queue(db)).filter(q=>q.status==='pending').map(q=>q.source_provider).sort()).toEqual(['facebook','instagram','tiktok','youtube'])
},true),60000)

it('T10 equal ids remain independent through completion, supersession and presentation', () => isolated(async db => {
  await enable(db)
  await save(db,[slot('showcase',tt),slot('about_2',fb)])
  const items = await queue(db)
  const t = items.find(q=>q.source_provider==='tiktok')!
  const f = items.find(q=>q.source_provider==='facebook')!
  await complete(db,await makeTicket(db,t.id))
  expect((await queue(db)).find(q=>q.id===f.id)?.status).toBe('pending')
  expect((await attached(db,fb)).homepageMediaSlots?.[0].tiktokVideoStatus).toBe('queued')
  expect((await attached(db,tt)).homepageMediaSlots?.[0].tiktokVideoStatus).toBe('live')
  await complete(db,await makeTicket(db,f.id))
  const reopened = (await db.query<{id:string}>('select reopen_tiktok_queue_item($1) id',[f.id])).rows[0].id
  await complete(db,await makeTicket(db,reopened))
  expect((await db.query("select source_provider,status from public_site_videos order by source_provider,status")).rows).toEqual([
    {source_provider:'facebook',status:'live'},{source_provider:'facebook',status:'superseded'},{source_provider:'tiktok',status:'live'}])
  expect(card(fb,true,true,true)).toContain('Watch on Facebook')
  expect(card(tt,true,true,true)).toContain('Watch on TikTok')
}),60000)

it('T11 preserved assignments survive edits, gate changes, sweep and equal-id completion', () => isolated(async db => {
  await save(db,[slot('showcase',yt),slot('about_2',ig,false)])
  await enable(db)
  const preserved = async () => (await db.query('select slot_key from tiktok_video_preserved_assignments order by slot_key')).rows
  const initial = await preserved()
  expect(initial).toHaveLength(2)
  const same = 'https://youtu.be/aBcDeF12_-Z'
  await save(db,[slot('showcase',same,false),slot('about_2',ig),slot('about_3',yt)])
  await db.exec('select tiktok_queue_daily_maintenance()')
  await enable(db,false)
  await db.exec('select tiktok_queue_daily_maintenance()')
  expect(await preserved()).toEqual(initial)
  await enable(db)
  await save(db,[slot('showcase',same),slot('about_2',ig),slot('about_3',yt)])
  expect(await preserved()).toEqual(initial)
  expect(await queue(db)).toHaveLength(1)
  await complete(db,await makeTicket(db,(await queue(db))[0].id))
  const page = await attachHostedTikTokVideos(reader(db),rep,{...defaultAmethystHomepageTemplateData,showcaseVideoUrl:same,aboutMediaSlots:[...defaultAmethystHomepageTemplateData.aboutMediaSlots.slice(0,2),{href:yt,caption:'',typeLabel:'Video'}]})
  expect(page.showcaseQueueManaged).toBeFalsy()
  expect(page.aboutMediaSlots[2].hostedVideo?.src).toMatch(/^https:/)
  expect(card(same,false)).toContain('<iframe')
  expect(await preserved()).toEqual(initial)
  await save(db,[slot('showcase',fb),slot('about_2',ig),slot('about_3',yt)])
  await db.query("select video_backfill_slots($1,array['about_2'])",[rep])
  expect(await preserved()).toEqual([])
  expect((await queue(db)).filter(q=>q.status==='pending').map(q=>q.source_provider).sort()).toEqual(['facebook','instagram'])
}),60000)

it('T12 ungated and switch-off Workspace, saves and renderer keep legacy links', () => isolated(async db => {
  const legacy = 'https://fb.watch/fixture'
  await save(db,[slot('showcase',legacy)],other)
  await save(db,[slot('showcase',yt)])
  expect(await queue(db)).toEqual([])
  expect((await db.query('select homepage_media_slots from site_settings where rep_id=$1',[other])).rows[0]).toMatchObject({homepage_media_slots:[slot('showcase',legacy)]})
  expect(workspace(false)).toContain('Video link or embed')
  expect(card(yt,false)).toContain('youtube-nocookie.com')
  await enable(db)
  await save(db,[slot('showcase',fb)])
  await enable(db,false)
  await save(db,[slot('showcase',yt)])
  await db.exec('select tiktok_queue_daily_maintenance()')
  expect((await queue(db))[0].status).toBe('pending')
}),60000)

it('T13 direct replacement, stale removal, shared sources and preserved removal', () => isolated(async db => {
  await save(db,[slot('about_4',yt)])
  await enable(db)
  await save(db,[slot('about_4',yt),slot('showcase',fb),slot('about_2',fb)])
  await expect(save(db,[slot('showcase',ig)])).rejects.toThrow(/remove_before_replace/)
  await expect(remove(db,'showcase',ig)).rejects.toThrow(/source_changed/)
  await remove(db,'about_4',yt)
  await remove(db,'showcase',fb)
  expect((await queue(db)).map(q=>q.status)).toEqual(['pending'])
  await remove(db,'about_2',fb)
  expect((await queue(db)).map(q=>q.status)).toEqual(['archived'])
}),60000)

it('T14 stale upload after removal or provider change and idempotent replay', () => isolated(async db => {
  await enable(db)
  await save(db,[slot('showcase',tt)])
  const old = await makeTicket(db,(await queue(db))[0].id)
  await remove(db,'showcase',tt)
  await save(db,[slot('showcase',fb)])
  await expect(complete(db,old)).rejects.toThrow(/queue_item_not_pending|source_changed/)
  const fresh = await makeTicket(db,(await queue(db)).find(q=>q.source_provider==='facebook')!.id)
  const first = await complete(db,fresh)
  expect(await complete(db,fresh)).toEqual({...first,replayed:true})
}),60000)

it('T15 unavailable after archive, purge retains assets and a dismissal can reopen', () => isolated(async db => {
  await enable(db)
  await save(db,[slot('showcase',yt),slot('about_2',fb)])
  const items = await queue(db)
  await complete(db,await makeTicket(db,items.find(q=>q.source_provider==='facebook')!.id))
  await db.query('select archive_tiktok_queue_item($1,$2)',[items.find(q=>q.source_provider==='youtube')!.id,'Private'])
  await db.exec("update tiktok_video_queue set closed_at=now()-interval '91 days';select tiktok_queue_purge_closed()")
  expect(await queue(db)).toHaveLength(0)
  expect((await db.query('select source_provider from public_site_videos')).rows).toEqual([{source_provider:'facebook'}])
  const d = (await db.query<{source_provider:string;tiktok_video_id:string}>('select source_provider,tiktok_video_id from tiktok_video_dismissals')).rows[0]
  expect((await attached(db,yt)).homepageMediaSlots?.[0].tiktokVideoStatus).toBe('unavailable')
  const {dismissalInput} = await import('@/lib/control-center/video-dismissal')
  expect(dismissalInput.safeParse({repId:rep,provider:d.source_provider,tiktokVideoId:d.tiktok_video_id}).success).toBe(true)
  expect(dismissalInput.safeParse({repId:rep,provider:'tiktok',tiktokVideoId:d.tiktok_video_id}).success).toBe(false)
  await db.query('select reopen_tiktok_dismissal($1,$2,$3)',[rep,d.tiktok_video_id,d.source_provider])
  expect((await queue(db))[0]).toMatchObject({source_provider:'youtube',status:'pending'})
}),60000)

it('T16 pending source card, hosted player and source-correct fallback', () => {
  for (const [url,action] of [[yt,'Watch on YouTube'],[ig,'Open on Instagram'],[fb,'Watch on Facebook'],[tt,'Watch on TikTok']]) {
    for (const source of sources) {
      const pending = card(url,true,false,false,source)
      const fallback = card(url,true,true,true,source)
      for (const html of [pending,fallback]) {
        expect(html).toContain(action)
        expect(html).not.toContain('<iframe')
        expect(html).toContain('href="'+queueVideoLink(url).canonical+'"')
      }
      const ready = card(url,true,true,false,source)
      expect(ready).toContain('aria-label="Play video"')
      expect(ready).toContain('preload="none"')
      expect(ready).not.toContain('<iframe')
    }
  }
},60000)

it('T17 classic, compiled and SSR parity, decoration and targeted Workspace copy', () => {
  for (const source of sources) {
    const sample = card('/amethyst/skins/pie-please/hero-loop.mp4',false,false,false,source)
    expect(sample).toContain('hp-theme-sample-video')
    expect(sample).toMatch(/autoPlay|autoplay/)
    expect(sample).toContain('muted')
    expect(sample).not.toContain('aria-label="Play video"')
  }
  const compiled = readFileSync('public/amethyst/compiled/homepage.js','utf8')
  expect(JSON.parse(readFileSync('lib/amethyst/generated/page-runtimes.json','utf8'))['compiled/homepage.js']).toBe(compiled)
  expect(compiled).toContain('queueManaged')
  const legacy = JSON.parse(readFileSync('lib/amethyst/legacy/manifest.json','utf8')).files['homepage.jsx']
  expect(createHash('sha256').update(sources[1]).digest('hex')).toBe(legacy.sha256)
  expect(workspace(true)).toContain('Videos can be up to 3 minutes')
  expect(workspace(false)).not.toContain('Videos can be up to 3 minutes')
})

it('T18 backfill requires selection, checks both switches, repeats safely and keeps static TikToks', () => isolated(async db => {
  const {backfillTikTokQueue} = await import('../../scripts/backfill-tiktok-video-queue')
  await expect(backfillTikTokQueue({} as never,['other'],true)).rejects.toThrow(/slots/)
  await expect(db.query("select video_backfill_slots($1,array['about_4'])",[other])).rejects.toThrow(/rep_not_enabled/)
  await expect(db.query("select video_backfill_slots($1,array['about_4'])",[rep])).rejects.toThrow(/rep_not_enabled/)
  await save(db,[slot('about_4',ig)])
  await enable(db)
  await expect(db.query("select video_backfill_slots($1,array[]::text[])",[rep])).rejects.toThrow(/invalid_video_slot/)
  for(let i=0;i<2;i++) {
    await db.query("select video_backfill_slots($1,array['about_4'])",[rep])
    await db.query('select tiktok_queue_add_static($1,$2)',[rep,tt])
  }
  expect((await queue(db)).map(q=>q.source_provider).sort()).toEqual(['instagram','tiktok'])
  expect((await db.query("select slot_keys from tiktok_video_queue where source_provider='tiktok'")).rows[0]).toEqual({slot_keys:['featured_reveal']})
}),60000)

it('T19 gated YouTube playlist and invalid embed links are rejected in TS and SQL', async () => {
  const cases = fixtures.filter(row => row.test === 'T19')
  expect(cases.length).toBeGreaterThan(0)
  for (const {url, provider, id, error} of cases) {
    expect(queueVideoLink(url), url).toEqual({provider, id, canonical: null, error})
    expect((await parserDb.query('select queue_video_link($1) link, queue_video_link_error($1) error', [url])).rows)
      .toEqual([{link: null, error}])
  }
  const valid = 'https://www.youtube.com/embed/aBcDeF12_-Z?list=PLfixture'
  expect(queueVideoLink(valid).id).toBe('aBcDeF12_-Z')
  expect((await parserDb.query("select queue_video_link($1)->>'id' id", [valid])).rows).toEqual([{id:'aBcDeF12_-Z'}])
})

it('T20 removing a slot keeps its shared static featured reveal queued or live', () => isolated(async db => {
  await enable(db)
  await save(db, [slot('showcase', tt), slot('about_2', fb)])
  await db.query('select tiktok_queue_add_static($1,$2)', [rep, tt])
  const item = (await queue(db)).find(row => row.source_provider === 'tiktok')!
  await remove(db, 'showcase', tt)
  expect((await db.query('select status, slot_keys from tiktok_video_queue where id=$1',[item.id])).rows)
    .toEqual([{status:'pending',slot_keys:['featured_reveal']}])
  await save(db, [slot('showcase', tt), slot('about_2', fb)])
  const {assetId} = await complete(db, await makeTicket(db, item.id))
  await remove(db, 'showcase', tt)
  await db.exec('select tiktok_queue_daily_maintenance()')
  expect((await queue(db)).find(row => row.id === item.id)).toMatchObject({status:'completed',asset_id:assetId})
  expect((await db.query('select status from public_site_videos where id=$1',[assetId])).rows).toEqual([{status:'live'}])
  expect((await db.query("select 1 from tiktok_video_dismissals where rep_id=$1 and source_provider='tiktok' and tiktok_video_id=$2",[rep,queueVideoLink(tt).id])).rows).toEqual([])
  expect((await queue(db)).find(row => row.source_provider === 'facebook')?.status).toBe('pending')
  await remove(db, 'about_2', fb)
  expect((await queue(db)).find(row => row.source_provider === 'facebook')?.status).toBe('archived')
}),60000)

it('T21 ungated Workspace save still accepts a legacy YouTube playlist embed', () => isolated(async db => {
  const url = 'https://www.youtube.com/embed/videoseries?list=PLfixture'
  const admin = reader(db)
  selected.admin = admin
  expect((await admin.rpc('video_all_sources', {p_rep_id:other})).data).toBe(false)
  const settings = { upsert: (row: {rep_id:string; homepage_media_slots:ReturnType<typeof slot>[]}) => ({
    select: () => ({single: async () => {
      await save(db, row.homepage_media_slots, row.rep_id)
      return {data: row, error: null}
    }}),
  }) }
  const profile = {select: () => ({eq: () => ({single: async () => ({data:{display_name:'Smoke'},error:null})})})}
  const client = {from: (table:string) => {
    if (table === 'site_settings') return settings
    if (table === 'reps') return profile
    throw Error('Unexpected table: ' + table)
  }} as unknown as SupabaseClient
  const result = await updateSiteSettingsDashboard(client, other, {homepageMediaSlots:[{...slot('showcase',url),imageUrl:'',caption:''}]})
  expect(result.homepageMediaSlots?.find(row => row.key === 'showcase')?.videoUrl).toBe(url)
  expect((await db.query("select e->>'videoUrl' url from site_settings s cross join jsonb_array_elements(s.homepage_media_slots) e where rep_id=$1 and e->>'key'='showcase'",[other])).rows).toEqual([{url}])
  expect(await queue(db)).toEqual([])
}),60000)
