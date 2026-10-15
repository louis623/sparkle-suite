import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { expect, it } from 'vitest'
import { lineupSqlAdapter } from './fixtures/live-lineup-sql-adapter'
import { describeSource, getEffectiveLiveQueueSnapshot, getWorkspaceLineup } from '@/lib/live-lineup/service'
import { getLiveQueueSyncCodeForRep } from '@/lib/services/live-queue'

const rep = '11111111-1111-4111-8111-111111111111'
const other = '22222222-2222-4222-8222-222222222222'
const orphan = '99999999-9999-4999-8999-999999999999'
const staleName = 'Stale October Customer'

it('copies existing connection codes exactly and never shows a retired live_queue payload', async () => {
  const sql = new PGlite()
  try {
    await sql.exec(`
      create role anon;
      create role authenticated;
      create role service_role bypassrls;
      create schema auth;
      create function auth.uid() returns uuid language sql stable as 'select null::uuid';
      create table auth.users(id uuid primary key, email text, raw_app_meta_data jsonb);
      create table reps(
        id uuid primary key,
        auth_user_id uuid,
        email text,
        account_classification text,
        finder_directory_visible boolean,
        custom_domain text,
        public_site_slug text
      );
      create table subscriptions(
        rep_id uuid primary key,
        stripe_livemode boolean,
        monthly_amount numeric,
        pricing_tier text,
        stripe_subscription_id text,
        stripe_customer_id text
      );
      create table live_queue (
        id uuid primary key default gen_random_uuid(),
        rep_id uuid not null,
        sync_code text not null unique,
        queue jsonb not null default '[]'::jsonb,
        last_updated timestamptz,
        created_at timestamptz
      );
      grant select, insert, update, delete on live_queue to service_role;
    `)
    await sql.query('insert into reps(id) values($1),($2)', [rep, other])
    await sql.query(
      `insert into live_queue(rep_id, sync_code, queue, last_updated, created_at) values
        ($1, 'OLD-1111', $2::jsonb, '2026-10-14T12:55:00.000Z', '2020-01-01T00:00:00.000Z'),
        ($1, 'NEW-2222', '["Newer Stale"]'::jsonb, '2026-10-14T12:55:00.000Z', '2024-01-01T00:00:00.000Z'),
        ($3, 'BWB-5819', '[]'::jsonb, null, '2021-06-01T00:00:00.000Z'),
        ($4, 'ORP-0009', '["Orphan"]'::jsonb, null, '2019-01-01T00:00:00.000Z'),
        ($1, '   ', '["Blank"]'::jsonb, null, '2018-01-01T00:00:00.000Z')`,
      [rep, JSON.stringify([staleName]), other, orphan],
    )
    await sql.exec(readFileSync(new URL('../supabase/migrations/20260910000100_live_lineup_v2.sql', import.meta.url), 'utf8'))
    await sql.exec(readFileSync(new URL('../supabase/migrations/20261015140000_ss_live_lineup_connection_codes.sql', import.meta.url), 'utf8'))

    const copied = await sql.query<{ rep_id: string; sync_code: string; created_at: string }>(
      'select rep_id, sync_code, created_at from live_lineup_connection_codes order by created_at, sync_code',
    )
    expect(copied.rows.map(row => row.sync_code)).toEqual(['OLD-1111', 'BWB-5819', 'NEW-2222'])
    expect(copied.rows.map(row => row.rep_id)).toEqual([rep, other, rep])
    expect(new Date(copied.rows[0].created_at).toISOString()).toContain('2020-01-01')
    expect(copied.rows.find(row => row.sync_code === 'OLD-1111')?.sync_code).toBe('OLD-1111')

    const retired = await sql.query<{ sync_code: string; queue: unknown }>(
      'select sync_code, queue from live_queue order by created_at',
    )
    expect(retired.rows.find(row => row.sync_code === 'OLD-1111')?.queue).toEqual([staleName])
    expect(retired.rows.map(row => row.sync_code)).toContain('ORP-0009')

    const comment = await sql.query<{ description: string | null }>(
      "select obj_description('public.live_queue'::regclass) as description",
    )
    expect(comment.rows[0].description).toMatch(/RETIRED/)
    expect(comment.rows[0].description).toMatch(/Live Lineup/)
    expect(comment.rows[0].description).toMatch(/read-only/i)

    const definition = await sql.query<{ def: string }>(
      "select pg_get_functiondef('public.reset_reviewer_live_lineup(uuid,uuid,text)'::regprocedure) as def",
    )
    expect(definition.rows[0].def).not.toMatch(/update public\.live_queue/i)

    await sql.exec('set role service_role')
    await expect(sql.query("update live_queue set queue = '[]'::jsonb where sync_code = 'OLD-1111'")).rejects.toThrow(/permission denied/i)

    const db = lineupSqlAdapter(sql)
    const now = Date.parse('2026-10-15T16:00:00.000Z')
    await expect(getLiveQueueSyncCodeForRep(db, rep)).resolves.toBe('OLD-1111')
    expect(await describeSource(db, 'OLD-1111', now)).toMatchObject({ protocol: 2, generation: 0, scope: null })
    expect(await describeSource(db, 'NEW-2222', now)).toMatchObject({ protocol: 2, generation: 0 })
    expect(await describeSource(db, 'BWB-5819', now)).toMatchObject({ protocol: 2 })
    await expect(describeSource(db, 'ORP-0009', now)).rejects.toMatchObject({ code: 'unauthorized', status: 401 })

    const workspace = await getWorkspaceLineup(db, rep, now)
    expect(workspace.entries).toEqual([])
    expect(workspace.warning).toBe('No Live Lineup data yet.')
    expect(JSON.stringify(workspace)).not.toContain(staleName)
    const snapshot = await getEffectiveLiveQueueSnapshot(db, rep, now)
    expect(snapshot?.queue).toEqual([])
    expect(snapshot?.isFresh).toBe(false)
    expect(JSON.stringify(snapshot)).not.toContain(staleName)
  } finally {
    await sql.close()
  }
}, 30_000)
