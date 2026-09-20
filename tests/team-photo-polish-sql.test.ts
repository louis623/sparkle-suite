import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { PGlite } from '@electric-sql/pglite'
import { expect, it } from 'vitest'

// Executes the shipped migration and reservation function in PostgreSQL semantics.
// PGlite serializes requests; this is not a multi-connection concurrency claim.
it('enforces durable attempts, idempotency, ownership, uncertain-job holds, and shared ceilings', async () => {
  const db = new PGlite()
  const rep = '11111111-1111-4111-8111-111111111111'
  const other = '22222222-2222-4222-8222-222222222222'
  const member = '33333333-3333-4333-8333-333333333333'
  try {
    await db.exec(`
      create role anon; create role authenticated; create role service_role;
      create table public.reps(id uuid primary key);
      create table public.join_team_members(id uuid primary key,rep_id uuid);
      create table public.nic_nac_incidents(id uuid default gen_random_uuid(),error_type text,rep_id uuid,severity text,details jsonb);
      create schema storage;
      create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    `)
    await db.query('insert into reps values ($1),($2)', [rep, other])
    await db.query('insert into join_team_members values ($1,$2)', [member, rep])
    await db.exec(readFileSync(new URL('../supabase/migrations/20260920000100_team_photo_polish.sql', import.meta.url), 'utf8'))
    const reserve = (request: string, owner = rep, card = 'lead', max = 100) => db.query<{ id: string; attempt_number: number }>(
      'select * from reserve_team_photo_polish($1,$2,$3,$4,$5,$6,$7,$8)',
      [owner, card, request, `${owner}/profile/original.jpg`, 'abc', 'amethyst', 'test-model', max],
    )
    const request = randomUUID()
    const first = (await reserve(request)).rows[0]
    expect(first.attempt_number).toBe(1)
    expect((await reserve(request)).rows[0].id).toBe(first.id)
    await expect(reserve(randomUUID())).rejects.toThrow('PHOTO_ALREADY_PENDING')
    await expect(reserve(request, rep, member)).rejects.toThrow('REQUEST_CONFLICT')
    await expect(reserve(randomUUID(), other, member)).rejects.toThrow('CARD_NOT_FOUND')
    await db.query("update team_photo_polish_jobs set status='uncertain' where id=$1", [first.id])
    await expect(reserve(randomUUID())).rejects.toThrow('PHOTO_ALREADY_PENDING')
    await db.query("update team_photo_polish_jobs set status='failed' where id=$1", [first.id])
    for (let attempt = 2; attempt <= 4; attempt++) {
      const result = (await reserve(randomUUID())).rows[0]
      expect(result.attempt_number).toBe(attempt)
      await db.query("update team_photo_polish_jobs set status='succeeded' where id=$1", [result.id])
    }
    await expect(reserve(randomUUID())).rejects.toThrow('PHOTO_LIMIT_REACHED')
    expect((await reserve(request)).rows[0].id).toBe(first.id)
    expect((await db.query<{ count: number }>('select count(*)::int as count from nic_nac_incidents')).rows[0].count).toBe(1)
    await expect(reserve(randomUUID(), other, 'lead', 4)).rejects.toThrow('PHOTO_BUDGET_REACHED')
    // Attempts cannot be reset by replacing the image or refreshing the page.
    expect((await db.query<{ count: number }>('select count(*)::int as count from team_photo_polish_jobs')).rows[0].count).toBe(4)
    await db.query(`insert into team_photo_polish_jobs(rep_id,card_key,request_id,attempt_number,source_path,source_sha256,skin_id,model,status)
      select $1::uuid,gen_random_uuid()::text,gen_random_uuid(),1,$1::uuid::text||'/profile/photo.jpg','x','amethyst','test','succeeded' from generate_series(1,21)`, [other])
    await expect(reserve(randomUUID(), other)).rejects.toThrow('PHOTO_DAILY_BUDGET_REACHED')
  } finally { await db.close() }
}, 30_000)

it('claims portrait analysis once per owner and source, reuses saved results, and caps new checks', async () => {
  const db = new PGlite()
  const rep = '11111111-1111-4111-8111-111111111111'
  const other = '22222222-2222-4222-8222-222222222222'
  const hash = 'a'.repeat(64)
  try {
    await db.exec('create role anon; create role authenticated; create role service_role; create table public.reps(id uuid primary key);')
    await db.query('insert into reps values ($1),($2)', [rep, other])
    await db.exec(readFileSync(new URL('../supabase/migrations/20260920000200_team_photo_analysis.sql', import.meta.url), 'utf8'))
    const claim = async (owner: string, source = hash) => (await db.query<{ result: { claimed: boolean; result?: unknown } }>(
      'select claim_team_photo_analysis($1::uuid,$2::text) as result', [owner, source],
    )).rows[0].result
    expect(await claim(rep)).toEqual({ claimed: true })
    expect(await claim(rep)).toEqual({ claimed: false, result: null })
    await db.query("update team_photo_analyses set status='complete',result=$2::jsonb where rep_id=$1::uuid", [rep, JSON.stringify({ quality: { status: 'ready' } })])
    expect(await claim(rep)).toEqual({ claimed: false, result: { quality: { status: 'ready' } } })
    expect(await claim(other)).toEqual({ claimed: true })
    await expect(claim(rep, 'not-a-hash')).rejects.toThrow('Invalid source hash')
    await db.query("insert into team_photo_analyses(rep_id,source_hash) select $1::uuid,lpad(to_hex(i),64,'0') from generate_series(1,49) as i", [rep])
    expect(await claim(rep, 'b'.repeat(64))).toEqual({ claimed: false })
    // Already cached photos remain available even after the allowance is used.
    expect((await claim(rep)).result).toEqual({ quality: { status: 'ready' } })
    await db.query("insert into team_photo_analyses(rep_id,source_hash) select $1::uuid,lpad(to_hex(i),64,'0') from generate_series(1,449) as i", [other])
    expect(await claim(other, 'b'.repeat(64))).toEqual({ claimed: false })
  } finally { await db.close() }
}, 30_000)
