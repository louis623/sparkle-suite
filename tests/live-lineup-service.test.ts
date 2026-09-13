import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { claimPublisher, createLineupState, applySourcePacket, applyLineupCommand } from '@/lib/live-lineup/model'
import { changeLineup, claimSource, describeSource, getEffectiveLiveQueueSnapshot, getWorkspaceLineup, hashPublisherToken, issuePublisher, listPublishers, readLineupState, receiveSource, revokePublisher } from '@/lib/live-lineup/service'

const now = Date.parse('2026-09-09T12:00:00.000Z')
const repA = '11111111-1111-4111-8111-111111111111'
const repB = '22222222-2222-4222-8222-222222222222'
const publisherId = 'a1111111-1111-4111-8111-111111111111'
const token = `sslp_${'a'.repeat(43)}`
const claimId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const otherClaimId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
type Row = Record<string, any>
/** Isolated query/RPC adapter. No URLs, credentials, Supabase client, or network. */
function database() {
  const rows: Record<string, Row[]> = { live_lineup_states: [], live_queue: [], live_lineup_publisher_tokens: [] }
  let schemaMissing = false, failRead = false, revokeAtCommit = false
  class Query implements PromiseLike<any> {
    filters: [string, unknown][] = []; max = Infinity; single = false; mode = 'select'; values: Row = {}
    constructor(public table: string) {}
    select(_fields?: string) { return this }
    eq(key: string, value: unknown) { this.filters.push([key, value]); return this }
    limit(n: number) { this.max = n; return this }
    order() { return this }
    maybeSingle() { this.single = true; return this }
    insert(values: Row) { this.mode = 'insert'; this.values = values; return this }
    update(values: Row) { this.mode = 'update'; this.values = values; return this }
    then<TResult1 = any, TResult2 = never>(yes?: ((value: any) => TResult1 | PromiseLike<TResult1>) | null, no?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null): PromiseLike<TResult1 | TResult2> {
      return Promise.resolve().then(() => {
        if (schemaMissing && this.table === 'live_lineup_states') return { data: null, error: { code: '42P01' } }
        if (failRead) return { data: null, error: { code: 'network_failure' } }
        if (this.mode === 'insert') rows[this.table].push(structuredClone(this.values))
        const selected = rows[this.table].filter(r => this.filters.every(([k, v]) => r[k] === v)).slice(0, this.max)
        if (this.mode === 'update') for (const row of selected) Object.assign(row, this.values)
        return { data: structuredClone(this.single ? selected[0] ?? null : selected), error: null }
      }).then(yes, no)
    }
  }
  const db = { from: (table: string) => new Query(table), rpc: async (name: string, args: any) => {
    const existing = rows.live_lineup_states.find(r => r.rep_id === args.p_rep_id)
    if (name === 'live_lineup_issue_publisher') {
      const activeCount = rows.live_lineup_publisher_tokens.filter(r => r.rep_id === args.p_rep_id && !r.revoked_at && Date.parse(r.expires_at) > now).length
      if (activeCount >= 8) return { data: null, error: { code: '54000' } }
      const createdAt = new Date(now).toISOString()
      const row = { id: args.p_token_id, rep_id: args.p_rep_id, token_hash: args.p_token_hash, label: args.p_label,
        created_at: createdAt, expires_at: new Date(now + 90 * 86_400_000).toISOString(), revoked_at: null }
      rows.live_lineup_publisher_tokens.push(row)
      return { data: [{ id: row.id, rep_id: row.rep_id, label: row.label, created_at: row.created_at,
        expires_at: row.expires_at, revoked_at: null, active_count: activeCount + 1 }], error: null }
    }
    if (name === 'live_lineup_list_publishers') {
      const listNow = now + 3000
      const tenantRows = rows.live_lineup_publisher_tokens.filter(r => r.rep_id === args.p_rep_id)
      const active = tenantRows.filter(r => !r.revoked_at && Date.parse(r.expires_at) > listNow)
      if (active.length > 8) return { data: null, error: { code: '22023' } }
      const history = tenantRows.filter(r => !active.includes(r)).sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 100 - active.length)
      const publishers = [...active.sort((a, b) => b.created_at.localeCompare(a.created_at)), ...history].map(r => ({
        id: r.id, rep_id: r.rep_id, label: r.label, created_at: r.created_at, expires_at: r.expires_at,
        revoked_at: r.revoked_at, is_valid: active.includes(r),
      }))
      return { data: [{ checked_at: new Date(listNow).toISOString(), active_count: active.length,
        listed_count: publishers.length, publishers }], error: null }
    }
    if (name === 'live_lineup_revoke_publisher') {
      const publisher = rows.live_lineup_publisher_tokens.find(r => r.id === args.p_token_id && r.rep_id === args.p_rep_id)
      if (!publisher) return { data: [], error: null }
      const revokedAt = new Date(now + 3000).toISOString()
      publisher.revoked_at ??= revokedAt
      const state = existing?.state
      const invalidated = state?.publisher?.id === args.p_token_id
        && (state.lastReceivedAt !== null || Date.parse(state.publisher.leaseExpiresAt) > now + 3000)
      if (invalidated) {
        state.revision += 1; existing!.revision = state.revision
        Object.assign(state, { lastReceivedAt: null, sourceVersion: null, parserState: 'loading',
          publisher: { ...state.publisher, lastSequence: -1, leaseExpiresAt: revokedAt } })
      }
      return { data: [{ publisher_id: publisher.id, rep_id: publisher.rep_id, revoked_at: publisher.revoked_at, invalidated: !!invalidated }], error: null }
    }
    if (args.p_token_id) {
      const p = rows.live_lineup_publisher_tokens.find(r => r.id === args.p_token_id)
      if (revokeAtCommit || !p || p.rep_id !== args.p_rep_id || p.revoked_at || Date.parse(p.expires_at) <= now
        || name !== 'live_lineup_claim_receipt' && args.p_state.publisher.id !== p.id) return { data: null, error: { code: '28000' } }
    }
    if (name === 'live_lineup_claim_receipt') return { data: existing
      && existing.state.publisher.id === args.p_token_id
      && existing.state.publisher.claimId === args.p_claim_id
      && Date.parse(existing.state.publisher.leaseExpiresAt) > now
      ? [structuredClone(existing)] : [], error: null }
    if ((existing?.revision ?? 0) !== args.p_expected_revision) return { data: [], error: null }
    const next = { rep_id: args.p_rep_id, revision: args.p_state.revision, state: structuredClone(args.p_state) }
    if (existing) Object.assign(existing, next); else rows.live_lineup_states.push(next)
    return { data: [next], error: null }
  } }
  rows.live_lineup_publisher_tokens.push({ id: publisherId, rep_id: repA, token_hash: hashPublisherToken(token), label: 'Synthetic source', created_at: new Date(now - 1000).toISOString(), expires_at: new Date(now + 86_400_000).toISOString(), revoked_at: null })
  return { db: db as unknown as SupabaseClient, rows, missing: () => { schemaMissing = true }, fail: () => { failRead = true }, revokeAtCommit: () => { revokeAtCommit = true } }
}
function seeded() {
  const d = database()
  const claim = claimPublisher(createLineupState(), publisherId, 0, now, { claimId })
  if (!claim.ok) throw Error('fixture')
  const first = applySourcePacket(claim.state, packet(0), now + 1000)
  if (!first.ok) throw Error('fixture')
  d.rows.live_lineup_states.push({ rep_id: repA, revision: first.state.revision, state: first.state })
  return d
}
function packet(sequence: number) { return { publisherId, epoch: 1, sequence, sourceVersion: '2.0.0', parserState: 'ready', entries: [{ id: 'order-a', name: 'Same Name', orderedAt: now }, { id: 'order-b', name: 'Same Name', orderedAt: now + 1 }], revealedIds: [] } }

describe('Live Lineup service — scoped source and Workspace integration', () => {
  it('describes an unstarted source without creating state, a lease, or a heartbeat', async () => {
    const d = database()
    const before = structuredClone(d.rows)
    expect(await describeSource(d.db, token, now)).toEqual({ protocol: 2, generation: 0, scope: null, serverTime: new Date(now).toISOString() })
    expect(d.rows).toEqual(before)
  })
  it('returns only the authenticated show parsing scope, never names, private holds or lease credentials', async () => {
    const d = database()
    const claim = claimPublisher(createLineupState(), publisherId, 0, now, { claimId })
    if (!claim.ok) throw Error('fixture')
    const ready = applySourcePacket(claim.state, { ...packet(0), entries: [{ id: '123:a', name: 'PrivateName', orderedAt: now }] }, now + 1000)
    if (!ready.ok) throw Error('fixture')
    const started = applyLineupCommand(ready.state, { type: 'start-show', expectedRevision: ready.state.revision, confirmed: true, partyIds: ['123'], carryEntryIds: ['123:a'] }, now + 2000)
    if (!started.ok) throw Error('fixture')
    d.rows.live_lineup_states.push({ rep_id: repA, revision: started.state.revision, state: started.state })
    d.rows.live_lineup_states.push({ rep_id: '33333333-3333-4333-8333-333333333333', revision: 999, state: { secret: 'other-tenant' } })
    const before = structuredClone(d.rows)
    const result = await describeSource(d.db, token, now + 3000)
    expect(result).toEqual({ protocol: 2, generation: 1, scope: { partyIds: ['123'], startedAt: new Date(now + 2000).toISOString(), carryEntryIds: ['123:a'] }, serverTime: new Date(now + 3000).toISOString() })
    expect(JSON.stringify(result)).not.toMatch(/PrivateName|other-tenant|rep-a|sslp_|claimId|publisher|held|excluded|revision/)
    expect(d.rows).toEqual(before)
  })
  it('rejects missing, revoked and expired setup credentials and fails closed on stored corruption', async () => {
    const d = seeded()
    await expect(describeSource(d.db, null, now)).rejects.toMatchObject({ code: 'unauthorized' })
    d.rows.live_lineup_publisher_tokens[0].revoked_at = new Date(now).toISOString()
    await expect(describeSource(d.db, token, now)).rejects.toMatchObject({ code: 'unauthorized' })
    d.rows.live_lineup_publisher_tokens[0].revoked_at = null
    await expect(describeSource(d.db, token, now + 86_400_000)).rejects.toMatchObject({ code: 'unauthorized' })
    d.rows.live_lineup_states[0].state = {}
    await expect(describeSource(d.db, token, now)).rejects.toMatchObject({ code: 'invalid_stored_lineup' })
  })
  it('a stale descriptor never authorizes a claim into a newly started show', async () => {
    const d = seeded()
    const descriptor = await describeSource(d.db, token, now + 2000)
    await changeLineup(d.db, repA, { type: 'start-show', confirmed: true, partyIds: ['123'], carryEntryIds: [], expectedRevision: d.rows.live_lineup_states[0].revision }, now + 3000)
    const before = structuredClone(d.rows)
    await expect(claimSource(d.db, token, otherClaimId, now + 4000, descriptor.generation)).rejects.toMatchObject({ code: 'show_changed', status: 409 })
    expect(d.rows).toEqual(before)
    expect((await describeSource(d.db, token, now + 4000)).generation).toBe(1)
    expect(d.rows).toEqual(before)
  })
  it('legacy stays read-only; absent schema does not assign new identities', async () => {
    const d = database(); d.missing()
    d.rows.live_queue.push({ rep_id: repA, sync_code: 'PRIVATE', queue: ['Example'], last_updated: new Date(now).toISOString() })
    const result = await getWorkspaceLineup(d.db, repA, now)
    expect(result.canManage).toBe(false)
    expect(result.connection).not.toBe('connected')
    expect(JSON.stringify(result)).not.toContain('PRIVATE')
    expect(d.rows.live_lineup_states).toHaveLength(0)
  })
  it('does not disguise unavailable database or corrupted state as legacy/empty', async () => {
    const d = database(); d.fail()
    await expect(getWorkspaceLineup(d.db, repA, now)).rejects.toMatchObject({ code: 'lineup_unavailable' })
    const bad = database(); bad.rows.live_lineup_states.push({ rep_id: repA, revision: 1, state: {} })
    await expect(readLineupState(bad.db, repA)).rejects.toMatchObject({ code: 'invalid_stored_lineup' })
  })
  it('rejects foreign-tenant state and legacy rows even when a hostile adapter ignores the tenant filter', async () => {
    const valid = seeded().rows.live_lineup_states[0]
    const stateDb = { from: () => {
      const query = { select: () => query, eq: () => query,
        maybeSingle: async () => ({ data: { ...structuredClone(valid), rep_id: repB }, error: null }) }
      return query
    } } as unknown as SupabaseClient
    await expect(readLineupState(stateDb, repA)).rejects.toMatchObject({ code: 'invalid_stored_lineup' })
    const legacyDb = { from: (table: string) => {
      const query = { select: () => query, eq: () => query,
        maybeSingle: async () => ({ data: null, error: null }),
        limit: async () => ({ data: table === 'live_queue'
          ? [{ rep_id: repB, sync_code: 'PRIVATE', queue: ['Foreign'], last_updated: new Date(now).toISOString() }] : [], error: null }) }
      return query
    } } as unknown as SupabaseClient
    await expect(getWorkspaceLineup(legacyDb, repA, now)).rejects.toMatchObject({ code: 'invalid_queue_receipt' })
  })
  it('refuses ambiguous legacy mapping instead of choosing oldest', async () => {
    const d = database(); d.rows.live_queue.push(...[1, 2].map(n => ({ rep_id: repA, sync_code: `CODE${n}`, queue: [], last_updated: null })))
    await expect(getWorkspaceLineup(d.db, repA, now)).rejects.toMatchObject({ code: 'ambiguous_queue_mapping' })
  })
  it('future legacy sender time never creates a fresh queue', async () => {
    const d = database(); d.rows.live_queue.push({ rep_id: repA, sync_code: 'PRIVATE', queue: ['Example'], last_updated: '2099-01-01T00:00:00Z' })
    expect(await getEffectiveLiveQueueSnapshot(d.db, repA, now)).toMatchObject({ isFresh: false, ageSeconds: null })
  })
  it('holds and reorders duplicate names by stable order ID; public projection excludes private state', async () => {
    const d = seeded()
    const before = await getWorkspaceLineup(d.db, repA, now + 2000)
    const held = await changeLineup(d.db, repA, { expectedRevision: before.revision, type: 'hold', entryId: 'order-a' }, now + 2000)
    expect(held.entries.map(e => e.id)).toEqual(['order-b'])
    const publicState = await getEffectiveLiveQueueSnapshot(d.db, repA, now + 2000)
    expect(publicState?.queue).toEqual(['Same Name'])
    expect(JSON.stringify(publicState)).not.toMatch(/order-a|order-b|rep-a|sslp_|undo|held|token_hash/)
    await receiveSource(d.db, token, packet(1), now + 3000)
    expect((await getWorkspaceLineup(d.db, repA, now + 3000)).heldEntries.map(e => e.id)).toEqual(['order-a'])
  })
  it('concurrent commands use CAS; losing move never reports success', async () => {
    const d = seeded(), before = await getWorkspaceLineup(d.db, repA, now + 2000)
    const results = await Promise.allSettled(['order-a', 'order-b'].map(entryId => changeLineup(d.db, repA, { expectedRevision: before.revision, type: 'hold', entryId }, now + 2000)))
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1)
    expect(results.filter(r => r.status === 'rejected')).toHaveLength(1)
  })
  it('publisher authorization determines tenant; packet cannot choose another writer', async () => {
    const d = seeded()
    await expect(receiveSource(d.db, token, { ...packet(1), publisherId: 'different', repId: repB }, now + 3000)).rejects.toMatchObject({ code: 'publisher_conflict' })
    expect(d.rows.live_lineup_states.map(r => r.rep_id)).toEqual([repA])
    await expect(changeLineup(d.db, repB, { expectedRevision: 2, type: 'hold', entryId: 'order-a' }, now + 3000)).rejects.toMatchObject({ code: 'upgraded_source_required' })
  })
  it('stale packets, rapid writes, revoked credentials and commit-time revocation fail closed', async () => {
    const d = seeded()
    await expect(receiveSource(d.db, token, packet(0), now + 3000)).rejects.toMatchObject({ code: 'stale_sequence' })
    await expect(receiveSource(d.db, token, packet(1), now + 1100)).rejects.toMatchObject({ status: 429 })
    d.revokeAtCommit()
    await expect(receiveSource(d.db, token, packet(1), now + 3000)).rejects.toMatchObject({ status: 401 })
    expect(d.rows.live_lineup_states[0].state.publisher.lastSequence).toBe(0)
    await revokePublisher(d.db, repA, publisherId)
    await expect(claimSource(d.db, token, claimId, now + 4000)).rejects.toMatchObject({ status: 401 })
  })
  it('pairing credentials are generated privately and raw token is returned only once', async () => {
    const d = database()
    const issued = await issuePublisher(d.db, repB, 'Show laptop', now)
    expect(issued.token).toMatch(/^sslp_[A-Za-z0-9_-]{43}$/)
    const stored = d.rows.live_lineup_publisher_tokens.find(p => p.rep_id === repB)!
    expect(stored.token_hash).toBe(hashPublisherToken(issued.token))
    expect(JSON.stringify(stored)).not.toContain(issued.token)
    expect(JSON.stringify(await listPublishers(d.db, repB))).not.toMatch(/token_hash|sslp_|rep_id/)
    await expect(revokePublisher(d.db, repA, issued.publisher.id)).rejects.toMatchObject({ status: 404 })
  })
  it('caps usable publisher credentials per tenant while retaining revoked audit rows', async () => {
    const d = database()
    for (let index = 1; index < 8; index++) await issuePublisher(d.db, repA, `Laptop ${index}`, now)
    expect((await listPublishers(d.db, repA)).filter(p => !p.revokedAt)).toHaveLength(8)
    await expect(issuePublisher(d.db, repA, 'Ninth laptop', now)).rejects.toMatchObject({ code: 'publisher_limit_reached', status: 409 })
    const retiredId = d.rows.live_lineup_publisher_tokens.find(p => p.rep_id === repA && p.id !== publisherId)!.id
    await revokePublisher(d.db, repA, retiredId)
    await issuePublisher(d.db, repA, 'Replacement laptop', now)
    expect(d.rows.live_lineup_publisher_tokens.filter(p => p.rep_id === repA)).toHaveLength(9)
    expect((await listPublishers(d.db, repA)).filter(p => !p.revokedAt)).toHaveLength(8)
  })
  it('fails closed on truncated, duplicated, malformed, or foreign publisher-list receipts', async () => {
    const base = database()
    const validPublisher = base.rows.live_lineup_publisher_tokens[0]
    const valid = { checked_at: new Date(now).toISOString(), active_count: 1, listed_count: 1,
      publishers: [{ id: validPublisher.id, rep_id: repA, label: validPublisher.label, created_at: validPublisher.created_at,
        expires_at: validPublisher.expires_at, revoked_at: null, is_valid: true }] }
    const corruptions = [
      [],
      [{ ...valid, active_count: 2 }],
      [{ ...valid, listed_count: 2 }],
      [{ ...valid, publishers: [valid.publishers[0], valid.publishers[0]], listed_count: 2, active_count: 2 }],
      [{ ...valid, publishers: [{ ...valid.publishers[0], rep_id: repB }] }],
      [{ ...valid, publishers: [{ ...valid.publishers[0], label: 'bad\nlabel' }] }],
      [{ ...valid, publishers: [{ ...valid.publishers[0], expires_at: 'not-a-date' }] }],
      [{ ...valid, publishers: [{ ...valid.publishers[0], revoked_at: new Date(now - 2000).toISOString(), is_valid: false }] }],
    ]
    for (const data of corruptions) {
      const d = database()
      d.db.rpc = (async () => ({ data, error: null })) as unknown as typeof d.db.rpc
      await expect(listPublishers(d.db, repA)).rejects.toMatchObject({ code: 'invalid_publisher_receipt' })
    }
  })
  it('authenticates only a well-formed row proving the presented token hash', async () => {
    const mutations = [
      (row: Row) => { row.token_hash = 'b'.repeat(64) },
      (row: Row) => { row.id = 'not-a-uuid' },
      (row: Row) => { row.label = 'bad\nlabel' },
      (row: Row) => { row.created_at = new Date(now + 31_000).toISOString() },
      (row: Row) => { row.expires_at = 'not-a-date' },
    ]
    for (const mutate of mutations) {
      const d = database(); mutate(d.rows.live_lineup_publisher_tokens[0])
      await expect(describeSource(d.db, token, now)).rejects.toMatchObject({ code: 'unauthorized', status: 401 })
    }
  })
  it('revoking the selected publisher immediately frees its lease without losing the managed queue', async () => {
    const d = seeded()
    await changeLineup(d.db, repA, { type: 'hold', entryId: 'order-a', expectedRevision: 2 }, now + 2000)
    const before = structuredClone(d.rows.live_lineup_states[0].state)
    const replacement = await issuePublisher(d.db, repA, 'Replacement laptop', now)
    await expect(claimSource(d.db, replacement.token, otherClaimId, now + 2500)).rejects.toMatchObject({ code: 'publisher_conflict' })
    await revokePublisher(d.db, repA, publisherId)
    const after = await readLineupState(d.db, repA)
    expect(after).toEqual({ ...before, revision: before.revision + 1, lastReceivedAt: null, sourceVersion: null,
      parserState: 'loading', publisher: { ...before.publisher, lastSequence: -1, leaseExpiresAt: new Date(now + 3000).toISOString() } })
    expect(await getWorkspaceLineup(d.db, repA, now + 3000)).toMatchObject({ connection: 'offline', heldEntries: [{ id: 'order-a' }] })
    expect(await getEffectiveLiveQueueSnapshot(d.db, repA, now + 3000)).toMatchObject({ sourceReady: false, isFresh: false, queue: ['Same Name'] })
    const claimed = await claimSource(d.db, replacement.token, otherClaimId, now + 3001)
    expect(claimed.epoch).toBe(before.publisher.epoch + 1)
    await expect(receiveSource(d.db, token, packet(1), now + 4000)).rejects.toMatchObject({ code: 'unauthorized', status: 401 })
    await expect(claimSource(d.db, token, claimId, now + 4000)).rejects.toMatchObject({ code: 'unauthorized', status: 401 })
  })
  it('repeated revocation is idempotent and never invalidates an already selected replacement', async () => {
    const d = seeded()
    await revokePublisher(d.db, repA, publisherId)
    const revoked = structuredClone(d.rows)
    await revokePublisher(d.db, repA, publisherId)
    expect(d.rows).toEqual(revoked)
    const replacement = await issuePublisher(d.db, repA, 'Replacement laptop', now)
    await claimSource(d.db, replacement.token, otherClaimId, now + 3001)
    const replaced = structuredClone(d.rows)
    await revokePublisher(d.db, repA, publisherId)
    expect(d.rows).toEqual(replaced)
  })
  it('revokes unused credentials without creating a queue or touching another tenant', async () => {
    const d = database()
    const untouched = structuredClone(d.rows)
    await expect(revokePublisher(d.db, repB, publisherId)).rejects.toMatchObject({ code: 'publisher_not_found', status: 404 })
    expect(d.rows).toEqual(untouched)
    await revokePublisher(d.db, repA, publisherId.toUpperCase())
    expect(d.rows.live_lineup_states).toEqual([])
    expect(d.rows.live_lineup_publisher_tokens[0].revoked_at).toBe(new Date(now + 3000).toISOString())
  })
  it('revocation fails closed for unavailable RPC or missing/malformed success receipts', async () => {
    const badResults = [
      { data: null, error: { code: 'PGRST202' } },
      { data: null, error: null },
      { data: [{ publisher_id: publisherId, rep_id: 'other-rep', revoked_at: new Date(now).toISOString(), invalidated: true }], error: null },
      { data: [{ publisher_id: publisherId, rep_id: repA, revoked_at: null, invalidated: true }], error: null },
      { data: [{ publisher_id: publisherId, rep_id: repA, revoked_at: 'not-a-date', invalidated: true }], error: null },
      { data: [{ publisher_id: publisherId, rep_id: repA, revoked_at: new Date(now).toISOString() }], error: null },
    ]
    for (const result of badResults) {
      const d = seeded(), before = structuredClone(d.rows)
      d.db.rpc = (async (name: string, args: unknown) => {
        expect(name).toBe('live_lineup_revoke_publisher')
        expect(args).toEqual({ p_rep_id: repA, p_token_id: publisherId })
        return result
      }) as unknown as typeof d.db.rpc
      await expect(revokePublisher(d.db, repA, publisherId)).rejects.toMatchObject({ status: 503 })
      expect(d.rows).toEqual(before)
    }
  })
  it('uncertain source health does not indefinitely refresh public retention time', async () => {
    const d = seeded()
    await receiveSource(d.db, token, { ...packet(1), parserState: 'loading', entries: [] }, now + 60_000)
    const result = await getEffectiveLiveQueueSnapshot(d.db, repA, now + 60_000)
    expect(result).toMatchObject({ sourceReady: false, isFresh: false, ageSeconds: 59, lastUpdated: new Date(now + 1000).toISOString() })
    expect(result?.queue).toHaveLength(2)
  })
  it('never reports saved when an RPC acknowledgement has the wrong tenant/revision/state', async () => {
    const corruptions = [
      (row: any) => ({ ...row, rep_id: 'other-rep' }),
      (row: any) => ({ ...row, revision: row.revision - 1 }),
      (row: any) => ({ ...row, state: {} }),
      (row: any) => ({ ...row, state: { ...row.state, order: [...row.state.order].reverse() } }),
    ]
    for (const corrupt of corruptions) {
      const d = seeded()
      const realRpc = d.db.rpc.bind(d.db)
      d.db.rpc = (async (...args: any[]) => {
        const result = await (realRpc as any)(...args)
        return { ...result, data: result.data.map(corrupt) }
      }) as unknown as typeof d.db.rpc
      await expect(changeLineup(d.db, repA, { expectedRevision: 2, type: 'reveal-next', entryId: 'order-a' }, now + 2000))
        .rejects.toMatchObject({ code: 'invalid_lineup_receipt', status: 503 })
    }
  })
  it('accepts JSONB key reordering and bigint strings when the exact state was saved', async () => {
    const d = seeded()
    const realRpc = d.db.rpc.bind(d.db)
    d.db.rpc = (async (...args: any[]) => {
      const result = await (realRpc as any)(...args)
      return { ...result, data: result.data.map((row: any) => ({ ...row, revision: String(row.revision),
        state: Object.fromEntries(Object.entries(row.state).reverse()) })) }
    }) as unknown as typeof d.db.rpc
    expect((await changeLineup(d.db, repA, { expectedRevision: 2, type: 'hold', entryId: 'order-a' }, now + 2000)).revision).toBe(3)
  })
  it('retries a lost claim response without waiting, extending the lease, or rewinding published sequence', async () => {
    const d = database()
    const first = await claimSource(d.db, token, claimId, now)
    expect(first.acceptedSequence).toBe(-1)
    const replay = await claimSource(d.db, token, claimId, now + 1000)
    expect(replay).toMatchObject({ epoch: first.epoch, revision: first.revision, leaseExpiresAt: first.leaseExpiresAt, acceptedSequence: -1 })
    await receiveSource(d.db, token, packet(0), now + 2000)
    const afterSnapshot = await claimSource(d.db, token, claimId, now + 3000)
    expect(afterSnapshot).toMatchObject({ epoch: 1, revision: 2, acceptedSequence: 0 })
    await expect(claimSource(d.db, token, otherClaimId, now + 3000)).rejects.toMatchObject({ code: 'publisher_conflict' })
  })
  it('concurrent same-attempt claims return the single committed epoch, while different attempts conflict', async () => {
    const d = database()
    const claims = await Promise.all([claimSource(d.db, token, claimId, now), claimSource(d.db, token, claimId, now)])
    expect(claims.map(c => c.epoch)).toEqual([1, 1])
    expect(d.rows.live_lineup_states).toHaveLength(1)
    expect(d.rows.live_lineup_states[0].revision).toBe(1)
    await expect(claimSource(d.db, token, otherClaimId, now)).rejects.toMatchObject({ code: 'publisher_conflict' })
  })
  it('same-attempt replay repeats authorization atomically, including commit-time revocation', async () => {
    const d = seeded(); d.revokeAtCommit()
    await expect(claimSource(d.db, token, claimId, now + 2000)).rejects.toMatchObject({ code: 'unauthorized', status: 401 })
  })
  it('missing nonce is 400 and an expired nonce cannot renew an old claim', async () => {
    const d = seeded()
    await expect(claimSource(d.db, token, undefined, now + 2000)).rejects.toMatchObject({ code: 'invalid_claim_id', status: 400 })
    await expect(claimSource(d.db, token, claimId, now + 100_000)).rejects.toMatchObject({ code: 'lease_expired' })
    expect((await claimSource(d.db, token, otherClaimId, now + 100_000)).epoch).toBe(2)
  })
})
