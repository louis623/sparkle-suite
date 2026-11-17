import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import { afterEach, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'

function migrationFunction(path: string, name: string) {
  const sql = readFileSync(resolve('supabase/migrations', path), 'utf8')
  const start = sql.indexOf('create or replace function public.' + name + '(')
  const end = sql.indexOf('$;', sql.indexOf('as $', start) + 5)
  if (start < 0 || end < 0) throw new Error('Missing migration function: ' + name)
  return sql.slice(start, end + 3)
}

const migrations = [
  'supabase/migrations/20260923200000_trade_request_direct_uploads.sql',
  'supabase/migrations/20260923210000_trade_upload_cleanup_and_replay.sql',
  'supabase/migrations/20260923220000_trade_request_enum_coalesce_fix.sql',
].map((path) => readFileSync(resolve(path), 'utf8'))
const repId = 'fb2e6061-54e5-4919-9d05-7d13b156c265'
const listingId = '8ad67c12-9840-47be-8398-c9d1445fce15'
const submissionId = 'c09ca847-9c84-4539-8ff2-9ff49d5f718b'
const uploadId = '20eb9934-7601-40c3-ae1e-adcb42fed4d2'

async function database() {
  const db = new PGlite()
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema storage;
    create table storage.objects (id uuid primary key, bucket_id text, name text, created_at timestamptz default now());
    create table storage.buckets (
      id text primary key, name text not null, public boolean not null,
      file_size_limit bigint, allowed_mime_types text[]
    );
    create type public.jewelry_type as enum ('RG','NK','ER','ST','BR');
    create type public.listing_status as enum ('available','pending_trade','traded');
    create table public.nic_nac_conversations (
      id uuid primary key default gen_random_uuid(), conversation_id uuid not null, message_id text not null,
      rep_id uuid not null, role text not null, parts jsonb not null, status text not null,
      created_at timestamptz default now(), cleared_at timestamptz, support_session_id uuid,
      unique(conversation_id, message_id)
    );
    create table public.reps (id uuid primary key);
    create table public.collections (id uuid primary key, name text not null);
    create table public.jewelry_designs (
      id uuid primary key, item_number text not null, collection_id uuid references public.collections(id),
      type_prefix public.jewelry_type not null, times_traded integer not null default 0,
      updated_at timestamptz not null default now()
    );
    create table public.trade_listings (
      id uuid primary key, rep_id uuid not null references public.reps(id),
      design_id uuid references public.jewelry_designs(id),
      manual_collection_family text, manual_type_prefix text,
      quantity_available integer not null default 1,
      status public.listing_status not null default 'available',
      updated_at timestamptz not null default now()
    );
    create table public.trade_requests (
      id uuid primary key default gen_random_uuid(), listing_id uuid not null references public.trade_listings(id),
      submission_id uuid unique not null, customer_name text not null, customer_description text not null,
      created_at timestamptz not null default now(), rejection_reason text,
      status text not null default 'pending', rep_notes text,
      offered_family text, offered_type public.jewelry_type,
      manual_review_requested boolean not null default false,
      screening_status text, screening_reason text, receipt_token_hash text,
      verified_offered_family text, verified_offered_type public.jewelry_type,
      verification_version integer, verified_by_rep_id uuid, verified_at timestamptz,
      reveal_screenshot_path text,
      reveal_screenshot_content_type text,
      reveal_screenshot_size_bytes integer,
      reveal_screenshot_uploaded_at timestamptz,
      reveal_screenshot_expires_at timestamptz,
      updated_at timestamptz not null default now()
    );
    create table public.trade_fulfillment (
      id uuid primary key default gen_random_uuid(),
      request_id uuid not null references public.trade_requests(id),
      fulfillment_status text not null
    );
    insert into public.reps(id) values ('${repId}');
    insert into public.trade_listings(id, rep_id, manual_collection_family, manual_type_prefix)
      values ('${listingId}', '${repId}', 'OG', 'ER');
  `)
  await db.exec(migrationFunction('20260825017000_finder_quantity_aware_availability.sql','rpc_submit_trade_request_v2'))
  await db.exec(migrationFunction('20260923190000_trade_request_verification_receipts.sql','trade_canonical_family_v1'))
  for (const migration of migrations) await db.exec(migration)
  await db.exec(readFileSync(resolve('supabase/migrations/20261113155611_dance_floor_swap_v5.sql'), 'utf8'))
  await db.exec(readFileSync(resolve('supabase/migrations/20261113155801_swap_upload_lifecycle.sql'), 'utf8'))
  await db.exec(`
    insert into public.trade_photo_policy_sink(rep_id) values ('${repId}');
  `)
  return db
}

const submit = (upload: string | null) => `select public.rpc_submit_trade_request_v4(
  '${listingId}'::uuid, 'Jamie', 'OG earrings', '${submissionId}'::uuid,
  '${'a'.repeat(64)}', 'OG', 'ER'::public.jewelry_type, false,
  ${upload ? `'${upload}'::uuid` : 'null::uuid'}
) as result`

const hash = 'b'.repeat(64)
const receipt = 'a'.repeat(64)
type Intent = 'send' | 'retry' | 'recover' | 'abandon'
type SubmitOptions = { id?: string; intent?: Intent; description?: string; upload?: string; manual?: boolean; name?: string }
async function sendV5(db: PGlite, options: SubmitOptions = {}) {
  const row = await db.query<{ result: { request_id?: string; listing_id?: string; mutation_replayed?: boolean; outcome?: string } }>(
    `select public.rpc_submit_trade_request_v5($1,$2,$3,$4,$5,'OG','ER',$6,$7,$8,$9,$10) as result`,
    [listingId, options.name ?? 'Jamie', options.description ?? '', options.id ?? submissionId, receipt,
      options.manual ?? false, options.upload ?? null, hash, options.intent ?? 'send', repId])
  return row.rows[0].result
}
async function enablePolicy(db: PGlite) {
  await db.query('select public.set_trade_request_photo_policy(true,0)')
}
async function stageTicket(db: PGlite,id: string,submission: string) {
  await db.query(`insert into public.trade_request_upload_tickets(id,listing_id,rep_id,submission_id,request_ip_hash,
    raw_path,ready_path,ready_at,ready_size_bytes,declared_content_type,declared_size_bytes)
    values($1,$2,$3,$4,$5,$6,$7,now(),100,'image/jpeg',100)`,
    [id,listingId,repId,submission,hash,'staging/' + id,repId + '/' + id + '.jpg'])
}

describe('trade request direct upload SQL transaction', () => {
  let db: PGlite | undefined
  afterEach(async () => { await db?.close(); db = undefined })

  it('rolls back request creation when an image ticket is absent', async () => {
    db = await database()
    await expect(db.query(submit(uploadId))).rejects.toThrow('TRADE_UPLOAD_NOT_READY')
    const rows = await db.query('select id from public.trade_requests')
    expect(rows.rows).toHaveLength(0)
  }, 60_000)

  it('attaches a verified rep-scoped JPEG and replays the same ticket safely', async () => {
    db = await database()
    await db.query(`insert into public.trade_request_upload_tickets(
      id, listing_id, rep_id, submission_id, request_ip_hash, raw_path, ready_path,
      declared_content_type, declared_size_bytes, ready_size_bytes, ready_at
    ) values (
      '${uploadId}', '${listingId}', '${repId}', '${submissionId}', '${'b'.repeat(64)}',
      'staging/${repId}/${uploadId}.heic', '${repId}/trade-request-uploads/${uploadId}.jpg',
      'image/heic', 5363712, 876543, now()
    )`)
    const first = await db.query(submit(uploadId))
    const replay = await db.query(submit(uploadId))
    expect((first.rows[0] as { result: { mutation_replayed: boolean } }).result.mutation_replayed).toBe(false)
    expect((replay.rows[0] as { result: { mutation_replayed: boolean } }).result.mutation_replayed).toBe(true)
    const rows = await db.query(`select t.reveal_screenshot_path, t.reveal_screenshot_content_type,
      t.reveal_screenshot_size_bytes, u.consumed_request_id,
      extract(epoch from t.reveal_screenshot_expires_at - t.reveal_screenshot_uploaded_at) as lifetime_seconds
      from public.trade_requests t join public.trade_request_upload_tickets u on u.submission_id = t.submission_id`)
    expect(rows.rows).toHaveLength(1)
    expect(rows.rows[0]).toMatchObject({
      reveal_screenshot_path: `${repId}/trade-request-uploads/${uploadId}.jpg`,
      reveal_screenshot_content_type: 'image/jpeg', reveal_screenshot_size_bytes: 876543,
      consumed_request_id: (first.rows[0] as { result: { request_id: string } }).result.request_id,
    })
    expect(Number((rows.rows[0] as { lifetime_seconds: string }).lifetime_seconds)).toBe(7 * 86400)
  }, 60_000)

  it('rejects an upload ticket bound to another rep with no new request', async () => {
    db = await database()
    const otherRepId = 'c3d283e0-c83c-4dc5-b779-244e99963dcf'
    await db.query(`insert into public.reps(id) values ('${otherRepId}')`)
    await db.query(`insert into public.trade_request_upload_tickets(
      id, listing_id, rep_id, submission_id, request_ip_hash, raw_path, ready_path,
      declared_content_type, declared_size_bytes, ready_size_bytes, ready_at
    ) values (
      '${uploadId}', '${listingId}', '${otherRepId}', '${submissionId}', '${'b'.repeat(64)}',
      'staging/${otherRepId}/${uploadId}.jpg', '${otherRepId}/trade-request-uploads/${uploadId}.jpg',
      'image/jpeg', 100, 100, now()
    )`)
    await expect(db.query(submit(uploadId))).rejects.toThrow('TRADE_UPLOAD_SCOPE_MISMATCH')
    expect((await db.query('select id from public.trade_requests')).rows).toHaveLength(0)
  }, 60_000)

  it('screens and approves a manual TEXT type beside catalog enum types', async () => {
    db = await database()
    const submitted = await db.query(submit(null))
    const requestId = (submitted.rows[0] as { result: { request_id: string } }).result.request_id
    expect(requestId).toBeTruthy()
    const screening = await db.query(`select screening_status from public.trade_requests where submission_id = '${submissionId}'`)
    expect(screening.rows[0]).toMatchObject({ screening_status: 'likely_match' })
    const approved = await db.query(`select public.rpc_approve_trade_v2(
      '${requestId}'::uuid, '${repId}'::uuid, 'OG', 'ER'::public.jewelry_type,
      true, true, null
    ) as result`)
    expect((approved.rows[0] as { result: { request_id: string } }).result.request_id).toBe(requestId)
    const listing = await db.query(`select quantity_available, status from public.trade_listings where id = '${listingId}'`)
    expect(listing.rows[0]).toMatchObject({ quantity_available: 0, status: 'traded' })
  }, 60_000)

  it('screens a catalog enum type when the manual TEXT type is absent', async () => {
    db = await database()
    const catalogListingId = '27817d31-0d9d-4c7e-bfde-69b9d06c5ac1'
    const catalogSubmissionId = 'e0d63e95-0c56-4bfb-a638-99cfbd897c8c'
    const collectionId = '01cf7437-b49a-4be6-8a5b-d2ceea432b95'
    const designId = '1c8cb779-c469-4b2b-ab35-4f3a36140f10'
    await db.exec(`
      insert into public.collections(id, name) values ('${collectionId}', 'OG');
      insert into public.jewelry_designs(id, item_number, collection_id, type_prefix)
        values ('${designId}', 'ER12345', '${collectionId}', 'ER');
      insert into public.trade_listings(id, rep_id, design_id)
        values ('${catalogListingId}', '${repId}', '${designId}');
    `)
    await db.query(`select public.rpc_submit_trade_request_v4(
      '${catalogListingId}'::uuid, 'Jamie', 'OG earrings', '${catalogSubmissionId}'::uuid,
      '${'c'.repeat(64)}', 'OG', 'ER'::public.jewelry_type, false, null::uuid
    )`)
    const screening = await db.query(`select screening_status from public.trade_requests where submission_id = '${catalogSubmissionId}'`)
    expect(screening.rows[0]).toMatchObject({ screening_status: 'likely_match' })
  }, 60_000)

  it('keeps old v4 operational but requires an in-scope, ready attachment and a name on new v5 writes', async () => {
    db = await database()
    await expect(sendV5(db)).rejects.toThrow('PHOTO_REQUIRED')
    await expect(sendV5(db,{name:'  ',upload:uploadId})).rejects.toThrow('INVALID_TRADE_REQUEST')
    await stageTicket(db,uploadId,submissionId)
    await db.query('update trade_request_upload_tickets set rendition_version=2')
    await expect(sendV5(db,{upload:uploadId})).rejects.toThrow('TRADE_UPLOAD_NOT_READY')
    await db.query('update trade_request_upload_tickets set rendition_version=1')
    const first = await sendV5(db,{upload:uploadId})
    expect(first.mutation_replayed).toBe(false)
    expect((await db.query('select customer_description,description_is_placeholder,reveal_screenshot_thumb_path from trade_requests')).rows[0])
      .toEqual({customer_description:'See photo',description_is_placeholder:true,reveal_screenshot_thumb_path:null})
    expect(await sendV5(db,{intent:'retry',upload:uploadId})).toEqual({...first,mutation_replayed:true})
    await expect(sendV5(db,{intent:'recover'})).rejects.toThrow('IDEMPOTENCY_CONFLICT')
    await expect(sendV5(db,{intent:'recover',upload:uploadId,description:'See photo'})).rejects.toThrow('IDEMPOTENCY_CONFLICT')
    await expect(sendV5(db,{intent:'recover',upload:uploadId,manual:true})).rejects.toThrow('IDEMPOTENCY_CONFLICT')
  },60_000)

  it('settles the identical never-delivered send once, and recovers after natural expiry without spending another slot', async () => {
    db = await database()
    await enablePolicy(db)
    expect(await sendV5(db,{intent:'recover'})).toEqual({outcome:'absent'})
    const first = await sendV5(db,{intent:'retry'})
    await db.query("update trade_request_photo_policy set photo_optional_until=clock_timestamp()-interval '1 second'")
    expect(await sendV5(db,{intent:'send'})).toEqual({...first,mutation_replayed:true})
    expect(await sendV5(db,{intent:'recover'})).toEqual({...first,mutation_replayed:true})
    await expect(sendV5(db,{id:randomUUID()})).rejects.toThrow('PHOTO_REQUIRED')
    expect((await db.query('select id from trade_requests')).rows).toHaveLength(1)
  },60_000)

  it('durably abandons A before a delayed first write, and returns an existing receipt if A won', async () => {
    db = await database()
    await enablePolicy(db)
    expect(await sendV5(db,{intent:'abandon'})).toEqual({outcome:'abandoned'})
    await expect(sendV5(db)).rejects.toThrow('TRADE_ATTEMPT_ABANDONED')
    const id = randomUUID()
    const committed = await sendV5(db,{id,description:'See photo'})
    expect(await sendV5(db,{id,description:'See photo',intent:'abandon'})).toEqual({...committed,mutation_replayed:true})
    expect((await db.query('select description_is_placeholder from trade_requests')).rows[0]).toEqual({description_is_placeholder:false})
  },60_000)

  it('counts only new writes across pictured and photo-less submissions, with independent pending and hourly ceilings', async () => {
    db = await database()
    await enablePolicy(db)
    await db.query('update trade_listings set quantity_available=20')
    await stageTicket(db,uploadId,submissionId)
    const pictured = await sendV5(db,{upload:uploadId})
    await sendV5(db,{id:randomUUID()})
    await sendV5(db,{id:randomUUID()})
    await expect(sendV5(db,{id:randomUUID()})).rejects.toThrow('TRADE_REQUEST_PENDING_LIMIT')
    expect(await sendV5(db,{intent:'recover',upload:uploadId})).toEqual({...pictured,mutation_replayed:true})
    await db.query("update trade_requests set status='cancelled'")
    for(let i=0;i<7;i++) {
      await sendV5(db,{id:randomUUID()})
      await db.query("update trade_requests set status='cancelled' where status='pending'")
    }
    await expect(sendV5(db,{id:randomUUID()})).rejects.toThrow('TRADE_REQUEST_HOURLY_LIMIT')
    expect((await db.query('select id from trade_requests')).rows).toHaveLength(10)
  },60_000)

  it('guards direct SQL, generation-scoped restores, audit history and idempotent daily expiry alerts', async () => {
    db = await database()
    await expect(db.query("update trade_request_photo_policy set photo_optional_until=now()+interval '7 hour'"))
      .rejects.toThrow('INVALID_PHOTO_POLICY')
    await enablePolicy(db)
    await expect(db.query('select set_trade_request_photo_policy(false,0)')).rejects.toThrow('PHOTO_POLICY_GENERATION_CONFLICT')
    await db.query("select set_trade_request_photo_policy(true,1,interval '0.25 second')")
    expect((await db.query('select deliver_expired_trade_photo_policy($1,1) as delivered',[repId])).rows[0]).toEqual({delivered:false})
    await new Promise((resolve) => setTimeout(resolve, 300))
    expect((await db.query('select deliver_expired_trade_photo_policy($1,2) as delivered',[repId])).rows[0]).toEqual({delivered:true})
    expect((await db.query('select deliver_expired_trade_photo_policy($1,2) as delivered',[repId])).rows[0]).toEqual({delivered:false})
    await db.query('select set_trade_request_photo_policy(false,2)')
    expect((await db.query("select event from trade_photo_policy_deliveries where event='expired'")).rows).toHaveLength(1)
    await expect(db.query('delete from trade_photo_policy_history')).rejects.toThrow('POLICY_AUDIT_IMMUTABLE')
    expect((await db.query("select has_column_privilege('authenticated','trade_requests','request_ip_hash','SELECT') as hidden, has_column_privilege('authenticated','trade_requests','status','SELECT') as allowed")).rows[0]).toEqual({hidden:false,allowed:true})
  },60_000)

  it('writes the alert and claim atomically and recognizes an earlier committed message across conversations', async () => {
    db = await database()
    await enablePolicy(db)
    const request = await sendV5(db)
    const notify = (parts: string | null) => db!.query('select rpc_notify_swap_request($1,$2,$3) as written',[request.request_id!,repId,parts])
    await expect(notify(null)).rejects.toThrow()
    expect((await db.query('select rep_alerted_at from trade_requests')).rows[0]).toEqual({rep_alerted_at:null})
    await notify('[]')
    await db.query("update nic_nac_conversations set cleared_at=now()")
    expect((await notify('[]')).rows[0]).toEqual({written:false})
    await db.query('update trade_requests set rep_alerted_at=null')
    await notify('[]')
    expect((await db.query("select id from nic_nac_conversations where message_id like 'trade-request-%'")).rows).toHaveLength(1)
  },60_000)
})
