import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'

const rep = '11111111-1111-4111-8111-111111111111'
const other = '22222222-2222-4222-8222-222222222222'
const repUser = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const early = 1_700_000_000_000
const later = 1_700_000_060_000
let db: PGlite

const identity = (id = 'p:a') => ({ id, sourceIdentityVersion: '1:doc:1' })
const entry = (id = 'p:a', name = 'Jane', lastName = 'Smith', orderedAt: number | null = later) => ({
  ...identity(id), name, lastName, orderedAt, identityEligible: true,
})

async function state(entries = [entry()], overrides: Record<string, unknown> = {}) {
  const now = new Date()
  await db.query(
    'insert into live_lineup_states values($1,$2) on conflict(rep_id) do update set state=excluded.state',
    [rep, {
      show: { generation: 1, excludedPartyIds: [] },
      entries,
      order: entries.map((item) => item.id),
      held: [],
      parserState: 'ready',
      lastReadyAt: now.toISOString(),
      lastReceivedAt: now.toISOString(),
      publisher: { leaseExpiresAt: new Date(+now + 60_000).toISOString() },
      sourceObservation: { settled: true },
      ...overrides,
    }],
  )
}

async function cards(action = 'read', extra: { customerId?: string; newId?: string; label?: string } = {}, ids = [identity()]) {
  return (await db.query<{ result: { matches: Array<{ audienceId: string | null; status: string }> } }>(
    'select live_lineup_customer_cards($1,1,$2,$3,$4,$5,$6,$7) result',
    [rep, JSON.stringify(ids), action, action === 'read' ? null : ids[0].id, extra.customerId ?? null, extra.newId ?? null, extra.label ?? null],
  )).rows[0].result
}

async function orders() {
  return (await db.query<{
    rep_id: string
    audience_id: string
    order_id: string
    party_id: string
    ordered_at: Date | null
    updated_at: Date
  }>('select rep_id, audience_id, order_id, party_id, ordered_at, updated_at from live_lineup_customer_orders order by order_id')).rows
}

async function archive(generation: number, archivedState: unknown, owner = rep) {
  await db.query(
    'insert into live_lineup_show_archives(rep_id, generation, revision, state) values($1,$2,1,$3)',
    [owner, generation, JSON.stringify(archivedState)],
  )
}

beforeEach(async () => {
  db = new PGlite()
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as 'select null::uuid';
    create table reps(id uuid primary key, auth_user_id uuid);
    create table live_lineup_states(rep_id uuid primary key, state jsonb);
    create table live_lineup_show_archives(
      rep_id uuid not null references reps(id), generation bigint not null, revision bigint not null,
      state jsonb not null, archived_at timestamptz not null default now(), primary key (rep_id, generation));
    create table customer_audience(
      id uuid primary key default gen_random_uuid(), rep_id uuid references reps(id), name text,
      record_source text default 'manual', identity_label text, birthday_month integer, birthday_day integer,
      favorite_gem_or_stone text, favorite_material text, favorite_cut text, favorite_collection text,
      sms_consent boolean, email_consent boolean, marketing_consent boolean, consent_date timestamptz,
      created_at timestamptz default now(), unique(id, rep_id));
    create table customer_audience_change_log(audience_id uuid, rep_id uuid, actor_kind text, action text, changes jsonb);`)
  await db.query('insert into reps(id, auth_user_id) values($1,$2),($3,$4)', [rep, repUser, other, null])
  for (const file of [
    '20260926000200_ss_live_lineup_audience_matches.sql',
    '20260929000100_live_lineup_customer_cards.sql',
    '20261013000100_ss_live_lineup_customer_orders.sql',
    '20261014193000_ss_live_lineup_record_buyer_orders.sql',
  ]) await db.exec(readFileSync(new URL('../supabase/migrations/' + file, import.meta.url), 'utf8'))
  await state()
}, 60_000)

afterEach(async () => { await db.close() })

describe('lineup purchase tracking', () => {
  it('never blocks a show archive when order tracking fails', async () => {
    await db.exec(`create or replace function public.live_lineup_record_orders_from_state(p_rep_id uuid, p_state jsonb)
      returns integer language plpgsql as $f$ begin raise exception 'simulated order tracking failure'; end $f$;`)
    await db.query(
      'insert into live_lineup_show_archives(rep_id, generation, revision, state) values($1,$2,1,$3)',
      [rep, 77, { entries: [] }],
    )
    const archived = await db.query<{ n: number }>(
      'select count(*)::int as n from live_lineup_show_archives where rep_id=$1 and generation=77', [rep])
    expect(archived.rows[0].n).toBe(1)
    expect(await orders()).toHaveLength(0)
  })

  it('ships no Smoke-only wording in the orders migration', () => {
    const sql = readFileSync(new URL('../supabase/migrations/20261013000100_ss_live_lineup_customer_orders.sql', import.meta.url), 'utf8')
    expect(sql).not.toMatch(/smoke/i)
    expect(sql).toMatch(/EXCEPTION WHEN OTHERS THEN\s+RAISE WARNING/)
  })

  it('writes one idempotent order per unique-name match and keeps last seen without bumping the card version', async () => {
    await state([entry('p:a', 'Jane', 'Smith', early), entry('p:b', 'Jane', 'Smith', later)])
    const first = await cards('read', {}, [identity('p:a'), identity('p:b')])
    const audienceId = first.matches[0].audienceId
    expect(first.matches[1].audienceId).toBe(audienceId)
    let rows = await orders()
    expect(rows.map((row) => [row.order_id, row.party_id, row.audience_id])).toEqual([
      ['a', 'p', audienceId],
      ['b', 'p', audienceId],
    ])
    expect(rows[0].ordered_at?.toISOString()).toBe(new Date(early).toISOString())
    expect(rows[1].ordered_at?.toISOString()).toBe(new Date(later).toISOString())
    const seen = await db.query<{ last_seen_in_lineup_at: Date; profile_version: number; version: string }>(
      `select c.last_seen_in_lineup_at, c.profile_version, v.version::text as version
       from customer_audience c join live_lineup_audience_versions v on v.rep_id=c.rep_id where c.id=$1`,
      [audienceId],
    )
    expect(seen.rows[0].last_seen_in_lineup_at.toISOString()).toBe(new Date(later).toISOString())
    expect(seen.rows[0].profile_version).toBe(0)
    const version = seen.rows[0].version
    const updatedAt = rows[0].updated_at.toISOString()
    await cards('read', {}, [identity('p:a'), identity('p:b')])
    rows = await orders()
    expect(rows).toHaveLength(2)
    expect(rows[0].updated_at.toISOString()).toBe(updatedAt)
    const again = await db.query<{ profile_version: number; version: string }>(
      'select c.profile_version, v.version::text as version from customer_audience c join live_lineup_audience_versions v on v.rep_id=c.rep_id where c.id=$1',
      [audienceId],
    )
    expect(again.rows[0]).toEqual({ profile_version: 0, version })
    await db.query("update customer_audience set favorite_cut='Oval' where id=$1", [audienceId])
    expect((await db.query<{ profile_version: number }>('select profile_version from customer_audience where id=$1', [audienceId])).rows[0].profile_version).toBe(1)
  })

  it('waits for the rep to choose between shared names, then follows that choice', async () => {
    await state([entry('p:a'), entry('p:b')])
    const first = (await db.query<{ id: string }>(
      "insert into customer_audience(rep_id, name) values($1,'Jane Smith') returning id",
      [rep],
    )).rows[0].id
    const second = (await db.query<{ id: string }>(
      "insert into customer_audience(rep_id, name, identity_label) values($1,'JANE SMITH','Ohio') returning id",
      [rep],
    )).rows[0].id
    expect((await cards()).matches[0].status).toBe('needs_clarification')
    expect(await orders()).toHaveLength(0)
    await cards('resolve', { customerId: second })
    expect(await orders()).toMatchObject([{ order_id: 'a', audience_id: second, party_id: 'p' }])
    expect((await db.query<{ last_seen: Date | null }>('select last_seen_in_lineup_at as last_seen from customer_audience where id=$1', [first])).rows[0].last_seen).toBeNull()
    expect((await db.query<{ last_seen: Date }>('select last_seen_in_lineup_at as last_seen from customer_audience where id=$1', [second])).rows[0].last_seen).toBeTruthy()
    const both = await cards('read', {}, [identity('p:a'), identity('p:b')])
    expect(both.matches[1].status).toBe('needs_clarification')
    expect(await orders()).toHaveLength(1)
    await cards('resolve', { customerId: first })
    expect((await orders())[0].audience_id).toBe(first)
    expect((await db.query<{ last_seen: Date | null }>('select last_seen_in_lineup_at as last_seen from customer_audience where id=$1', [second])).rows[0].last_seen).toBeNull()
    expect((await db.query<{ last_seen: Date }>('select last_seen_in_lineup_at as last_seen from customer_audience where id=$1', [first])).rows[0].last_seen).toBeTruthy()
  })

  it('records a separately created person and does not duplicate the retry', async () => {
    const newId = crypto.randomUUID()
    await cards('create', { newId, label: 'Local pickup' })
    await cards('create', { newId, label: 'Local pickup' })
    expect(await orders()).toMatchObject([{ order_id: 'a', audience_id: newId }])
    expect((await db.query('select id from customer_audience')).rows).toHaveLength(1)
  })

  it('records archived full names, skips ambiguous and excluded rows, and backfills once', async () => {
    const jane = (await db.query<{ id: string }>("insert into customer_audience(rep_id, name) values($1,'Jane Smith') returning id", [rep])).rows[0].id
    await db.query("insert into customer_audience(rep_id, name) values($1,'Ada Lovelace')", [rep])
    await archive(1, {
      show: { excludedPartyIds: ['hidden'] },
      entries: [
        entry('party:order1', 'Jane', 'Smith', early),
        entry('party:order2', 'Ada', 'Lovelace', later),
        { id: 'party:order3', name: 'Pat', orderedAt: later },
        entry('hidden:order4', 'Jane', 'Smith', later),
      ],
      revealedIds: ['party:gone'],
      restorations: [{ entry: entry('party:order5', 'Ada', 'Lovelace', early) }],
    })
    expect((await orders()).map((row) => row.order_id).sort()).toEqual(['order1', 'order2', 'order5'])
    const twin = (await db.query<{ id: string }>("insert into customer_audience(rep_id, name) values($1,'Ada Lovelace') returning id", [rep])).rows[0].id
    await archive(2, { entries: [entry('party:order9', 'Ada', 'Lovelace', later)] })
    expect((await orders()).some((row) => row.order_id === 'order9')).toBe(false)
    await db.query(
      'insert into live_lineup_customer_links(rep_id, entry_id, identity_key, audience_id) values($1,$2,live_lineup_audience_name_key($3),$4)',
      [rep, 'party:order9', 'Ada Lovelace', twin],
    )
    const filled = (await db.query<{ result: { shows: number; ordersAdded: number; orders: number } }>(
      'select live_lineup_backfill_customer_orders($1) result',
      [rep],
    )).rows[0].result
    expect(filled.shows).toBe(2)
    expect(filled.ordersAdded).toBe(1)
    expect((await orders()).find((row) => row.order_id === 'order9')?.audience_id).toBe(twin)
    const again = (await db.query<{ result: { ordersAdded: number; ordersTouched: number } }>(
      'select live_lineup_backfill_customer_orders($1) result',
      [rep],
    )).rows[0].result
    expect(again).toMatchObject({ ordersAdded: 0, ordersTouched: 0 })
    expect((await orders()).find((row) => row.order_id === 'order1')?.audience_id).toBe(jane)
    await db.query('delete from customer_audience where id=$1', [jane])
    expect((await orders()).some((row) => row.audience_id === jane)).toBe(false)
  })

  it('creates one card and link for a revealed buyer who was not on the list yet', async () => {
    await archive(8, {
      show: { excludedPartyIds: [] },
      entries: [entry('party:waiting', 'Casey', 'Ng', later)],
      restorations: [{ entry: entry('party:revealed', 'June', 'Park', early) }],
    })
    const rows = await orders()
    expect(rows.map((row) => row.order_id).sort()).toEqual(['revealed', 'waiting'])
    const links = await db.query<{ entry_id: string; audience_id: string }>(
      'select entry_id, audience_id from live_lineup_customer_links order by entry_id',
    )
    expect(links.rows.map((row) => row.entry_id)).toEqual(['party:revealed', 'party:waiting'])
    const cards = await db.query<{ name: string; record_source: string; last_seen: Date }>(
      `select name, record_source, last_seen_in_lineup_at as last_seen
       from customer_audience where record_source='live_lineup' order by name`,
    )
    expect(cards.rows.map((row) => row.name)).toEqual(['Casey Ng', 'June Park'])
    expect(cards.rows.every((row) => row.record_source === 'live_lineup' && row.last_seen)).toBe(true)
    expect(new Set(links.rows.map((row) => row.audience_id)).size).toBe(2)
    await archive(9, {
      entries: [entry('party:waiting', 'Casey', 'Ng', later), entry('party:again', 'Casey', 'Ng', later)],
      restorations: [{ entry: entry('party:revealed', 'June', 'Park', early) }],
    })
    expect(await orders()).toHaveLength(3)
    expect((await db.query("select id from customer_audience where record_source='live_lineup'")).rows).toHaveLength(2)
    const activity = (await db.query<{ result: { orderedDuringLiveLast90Days: number; goneQuiet: number } }>(
      'select live_lineup_customer_activity($1,$2) result',
      [rep, new Date(later).toISOString()],
    )).rows[0].result
    expect(activity).toMatchObject({ orderedDuringLiveLast90Days: 2, goneQuiet: 0 })
    await db.query("insert into customer_audience(rep_id, name) values($1,'June Park')", [rep])
    await archive(10, { entries: [entry('party:twin', 'June', 'Park', later)] })
    expect((await orders()).some((row) => row.order_id === 'twin')).toBe(false)
    expect((await db.query("select id from customer_audience where name='June Park'")).rows).toHaveLength(2)
  })

  it('counts recent live buyers and customers who have gone quiet', async () => {
    const ids = Object.fromEntries(await Promise.all(['recent', 'quiet', 'both', 'undated', 'never', 'foreign'].map(async (name) => {
      const id = (await db.query<{ id: string }>('insert into customer_audience(rep_id, name) values($1,$2) returning id', [
        name === 'foreign' ? other : rep, name,
      ])).rows[0].id
      return [name, id]
    })))
    const asOf = '2026-10-13T00:00:00Z'
    const at = (iso: string | null) => iso
    await db.query(
      `insert into live_lineup_customer_orders(rep_id, audience_id, order_id, party_id, ordered_at) values
       ($1,$2,'r1','p',$3), ($1,$4,'q1','p',$5), ($1,$6,'b1','p',$5), ($1,$6,'b2','p',$3),
       ($1,$7,'u1','p',null), ($8,$9,'f1','p',$3)`,
      [rep, ids.recent, at('2026-10-01T00:00:00Z'), ids.quiet, at('2026-01-01T00:00:00Z'), ids.both, ids.undated, other, ids.foreign],
    )
    const activity = (await db.query<{ result: { orderedDuringLiveLast90Days: number; goneQuiet: number; windowDays: number } }>(
      'select live_lineup_customer_activity($1,$2) result',
      [rep, asOf],
    )).rows[0].result
    expect(activity).toMatchObject({ orderedDuringLiveLast90Days: 2, goneQuiet: 1, windowDays: 90 })
    expect((await db.query<{ last_seen: Date | null }>('select last_seen_in_lineup_at as last_seen from customer_audience where id=$1', [ids.never])).rows[0].last_seen).toBeNull()
  })

  it('lets a rep read only their own orders and keeps writes on the service role', async () => {
    const audienceId = (await cards()).matches[0].audienceId
    expect((await orders())[0].audience_id).toBe(audienceId)
    await db.exec(`grant select on reps to authenticated;
      create or replace function auth.uid() returns uuid language sql stable as 'select ''${repUser}''::uuid';
      set role authenticated`)
    const visible = await db.query('select order_id from live_lineup_customer_orders')
    expect(visible.rows).toEqual([{ order_id: 'a' }])
    const ownActivity = await db.query<{ result: { orderedDuringLiveLast90Days: number } }>(
      'select live_lineup_customer_activity($1) result',
      [other],
    )
    expect(ownActivity.rows[0].result.orderedDuringLiveLast90Days).toBe(0)
    await expect(db.query(
      'insert into live_lineup_customer_orders(rep_id, audience_id, order_id, party_id) values($1,$2,$3,$4)',
      [rep, audienceId, 'z', 'p'],
    )).rejects.toThrow('permission denied')
    await expect(db.query('select live_lineup_backfill_customer_orders($1)', [rep])).rejects.toThrow('permission denied')
    await db.exec('reset role')
  })
})
