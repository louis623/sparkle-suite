import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'

let db: PGlite
const hash = (n: number) => n.toString(16).padStart(64, '0')
async function admit(ip = 1, fingerprint = 1) {
  const result = await db.query<{ result: { allowed: boolean; batchId: string; schedule: boolean } }>(
    'select public.ss_admit_client_error($1, $2, $3::jsonb) as result',
    [hash(ip), hash(fingerprint), JSON.stringify({ message: 'TypeError: [redacted]', deployment: 'synthetic' })],
  )
  return result.rows[0].result
}
async function claim(batchId: string) {
  const result = await db.query<{ result: Array<{ fingerprint: string; repeatCount: number; reservationId: string }> }>(
    'select public.ss_claim_client_error_batch($1) as result', [batchId],
  )
  return result.rows[0].result
}
async function mature(batchId: string) {
  await db.query("update public.ss_client_error_batches set started_at = clock_timestamp() - interval '61 seconds' where id = $1", [batchId])
}
async function count() {
  return (await db.query<{ count: number }>('select count(*)::int as count from public.ss_client_error_deliveries')).rows[0].count
}
beforeAll(async () => {
  db = new PGlite()
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls; grant usage on schema public to anon, authenticated, service_role;')
  await db.exec(readFileSync('supabase/migrations/20261101170000_client_error_alert_limits.sql', 'utf8'))
}, 30_000)
beforeEach(async () => {
  await db.exec('truncate public.ss_client_error_batches, public.ss_client_error_observations, public.ss_client_error_fingerprints, public.ss_client_error_deliveries cascade')
})
afterAll(async () => { await db?.close() })

it('waits for the entire IP window and invalidates all ten preceding flood reports before budget reservation', async () => {
  const first = await admit()
  expect(first.schedule).toBe(true)
  expect(await claim(first.batchId)).toEqual([])
  for (let i = 2; i <= 10; i++) expect((await admit(1, i)).schedule).toBe(false)
  expect((await admit(1, 11)).allowed).toBe(false)
  expect((await admit(1, 12)).allowed).toBe(false)
  await mature(first.batchId)
  expect(await claim(first.batchId)).toEqual([])
  expect(await count()).toBe(0)
  const safe = await admit(2, 20); await mature(safe.batchId)
  expect(await claim(safe.batchId)).toHaveLength(1)
})

it('suppresses a fingerprint across IPs/workers for an hour, then includes accumulated repeats', async () => {
  const first = await admit(); await mature(first.batchId)
  expect((await claim(first.batchId))[0].repeatCount).toBe(0)
  const repeat = await admit(2); await admit(2); await admit(2)
  await mature(repeat.batchId)
  expect(await claim(repeat.batchId)).toEqual([])
  expect(await count()).toBe(1)
  await db.exec("update public.ss_client_error_fingerprints set last_alert_at = clock_timestamp() - interval '61 minutes'")
  const next = await admit(3); await mature(next.batchId)
  const delivered = await claim(next.batchId)
  expect(delivered).toHaveLength(1); expect(delivered[0].repeatCount).toBe(3)
})

it('counts repeats within the initial batch, and cannot claim a batch twice', async () => {
  const batch = await admit(); await admit(); await admit(); await mature(batch.batchId)
  const results = await Promise.all([claim(batch.batchId), claim(batch.batchId)])
  expect(results.flat()).toHaveLength(1)
  expect(results.flat()[0].repeatCount).toBe(2)
  expect(await count()).toBe(1)
})

it('caps all fingerprints/deployments at twenty in a rolling day and preserves capped observations', async () => {
  for (let group = 0; group < 2; group++) {
    const first = await admit(group + 1, group * 10 + 1)
    for (let i = 2; i <= 10; i++) await admit(group + 1, group * 10 + i)
    await mature(first.batchId); expect(await claim(first.batchId)).toHaveLength(10)
  }
  const capped = await admit(3, 21); await admit(3, 21); await mature(capped.batchId)
  expect(await claim(capped.batchId)).toEqual([]); expect(await count()).toBe(20)
  await db.exec("update public.ss_client_error_deliveries set reserved_at = clock_timestamp() - interval '25 hours'")
  const later = await admit(4, 21); await mature(later.batchId)
  expect((await claim(later.batchId))[0].repeatCount).toBe(2)
})

it('keeps table access and budget RPCs private to the service role', async () => {
  for (const role of ['anon', 'authenticated']) {
    await db.exec('set role ' + role)
    await expect(admit()).rejects.toThrow(/permission denied/)
    await expect(db.query('select * from public.ss_client_error_deliveries')).rejects.toThrow(/permission denied/)
    await db.exec('reset role')
  }
  await db.exec('set role service_role')
  const batch = await admit(); await db.exec('reset role'); await mature(batch.batchId)
  await db.exec('set role service_role')
  expect(await claim(batch.batchId)).toHaveLength(1)
  await db.exec('reset role')
})
