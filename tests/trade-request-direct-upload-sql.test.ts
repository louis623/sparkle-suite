import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'

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
    create table storage.buckets (
      id text primary key, name text not null, public boolean not null,
      file_size_limit bigint, allowed_mime_types text[]
    );
    create type public.jewelry_type as enum ('RG','NK','ER','ST','BR');
    create type public.listing_status as enum ('available','pending_trade','traded');
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
      id uuid primary key, listing_id uuid not null references public.trade_listings(id),
      submission_id uuid unique not null, customer_name text not null,
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
    create function public.trade_canonical_family_v1(p_family text)
      returns text language sql immutable as $$ select lower(nullif(btrim(p_family), '')) $$;
    create function public.rpc_submit_trade_request_v2(
      p_listing_id uuid, p_customer_name text, p_customer_description text, p_submission_id uuid
    ) returns json language plpgsql as $$
    declare v_new boolean;
    begin
      insert into public.trade_requests(id, listing_id, submission_id, customer_name)
      values (p_submission_id, p_listing_id, p_submission_id, p_customer_name)
      on conflict (submission_id) do nothing;
      v_new := found;
      return json_build_object('request_id', p_submission_id, 'listing_id', p_listing_id,
        'mutation_replayed', not v_new);
    end $$;
    insert into public.reps(id) values ('${repId}');
    insert into public.trade_listings(id, rep_id, manual_collection_family, manual_type_prefix)
      values ('${listingId}', '${repId}', 'OG', 'ER');
  `)
  for (const migration of migrations) await db.exec(migration)
  return db
}

const submit = (upload: string | null) => `select public.rpc_submit_trade_request_v4(
  '${listingId}'::uuid, 'Jamie', 'OG earrings', '${submissionId}'::uuid,
  '${'a'.repeat(64)}', 'OG', 'ER'::public.jewelry_type, false,
  ${upload ? `'${upload}'::uuid` : 'null::uuid'}
) as result`

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
      consumed_request_id: submissionId,
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
    expect((submitted.rows[0] as { result: { request_id: string } }).result.request_id).toBe(submissionId)
    const screening = await db.query(`select screening_status from public.trade_requests where id = '${submissionId}'`)
    expect(screening.rows[0]).toMatchObject({ screening_status: 'likely_match' })
    const approved = await db.query(`select public.rpc_approve_trade_v2(
      '${submissionId}'::uuid, '${repId}'::uuid, 'OG', 'ER'::public.jewelry_type,
      true, true, null
    ) as result`)
    expect((approved.rows[0] as { result: { request_id: string } }).result.request_id).toBe(submissionId)
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
    const screening = await db.query(`select screening_status from public.trade_requests where id = '${catalogSubmissionId}'`)
    expect(screening.rows[0]).toMatchObject({ screening_status: 'likely_match' })
  }, 60_000)
})
