import { createHash, webcrypto } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createContext, runInContext, runInNewContext } from 'node:vm'
import { PGlite } from '@electric-sql/pglite'
import { expect, it, vi } from 'vitest'
import { lineupSqlAdapter } from './fixtures/live-lineup-sql-adapter'

// This gate is intentionally excluded from the local application-only manifest.
// Release mode must run in the single consolidated checkout. A temporary
// read-only fixture directory is accepted only when both reviewed source
// hashes are supplied and verified, so an ambient path cannot create a false
// green result.
const extensionSourceDir = resolve(process.env.SPARKLE_LIVE_LINEUP_EXTENSION_SOURCE_DIR || 'chrome-extension')
const extensionClientPath = resolve(extensionSourceDir, 'publisher-client.js')
const extensionWorkerPath = resolve(extensionSourceDir, 'background.js')
const extensionManifestPath = resolve(extensionSourceDir, 'manifest.json')
const seams = vi.hoisted(() => ({ admin: vi.fn(), auth: vi.fn(), support: vi.fn(), target: vi.fn(), resolve: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: seams.admin }))
vi.mock('@/lib/nic-nac/auth', () => ({ getPaidNicNacContext: seams.auth, AuthError: class extends Error {} }))
vi.mock('@/lib/operator-support/request-context', () => ({ getOperatorSupportRequestContext: seams.support }))
vi.mock('@/lib/amethyst/request-rep-target', () => ({ resolveAmethystRequestTarget: seams.target }))
vi.mock('@/lib/amethyst/preview-rep', () => ({ resolveAmethystPreviewRep: seams.resolve }))
import * as publishers from '@/app/api/workspace/live-lineup/publishers/route'
import * as publish from '@/app/api/live-lineup/publish/route'
import * as workspace from '@/app/api/workspace/live-lineup/route'
import * as publicRoute from '@/app/api/amethyst/live-lineup/route'

const origin = 'https://www.yoursparklesuite.com'
const extensionOrigin = 'chrome-extension://kmodgfffflplfdlkkhadgimmobplhoih'
const rep = '11111111-1111-4111-8111-111111111111'
function request(path: string, body: unknown, headers: Record<string, string> = {}, method = 'POST') {
  return new Request(origin + path, { method, headers: { origin, 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) })
}
async function json(response: Response, expectedStatus = 200) {
  expect(response.status).toBe(expectedStatus)
  expect(response.headers.get('cache-control')).toBe('no-store')
  return response.json()
}

function sha256(path: string) {
  return createHash('sha256').update(readFileSync(path)).digest('hex')
}

it('carries reviewed extension sources through HTTP, SQL, Workspace ordering, and the shared public lineup runtime', async () => {
  expect(existsSync(extensionClientPath), 'Consolidate the approved Codespace extension source before running this release gate.').toBe(true)
  expect(existsSync(extensionWorkerPath), 'Consolidate the approved Codespace worker source before running this release gate.').toBe(true)
  expect(existsSync(extensionManifestPath), 'Consolidate the approved Codespace manifest before running this release gate.').toBe(true)
  if (process.env.SPARKLE_LIVE_LINEUP_EXTENSION_SOURCE_DIR) {
    expect(process.env.SPARKLE_LIVE_LINEUP_EXTENSION_PUBLISHER_SHA256).toMatch(/^[a-f0-9]{64}$/)
    expect(process.env.SPARKLE_LIVE_LINEUP_EXTENSION_WORKER_SHA256).toMatch(/^[a-f0-9]{64}$/)
    expect(sha256(extensionClientPath)).toBe(process.env.SPARKLE_LIVE_LINEUP_EXTENSION_PUBLISHER_SHA256)
    expect(sha256(extensionWorkerPath)).toBe(process.env.SPARKLE_LIVE_LINEUP_EXTENSION_WORKER_SHA256)
  } else {
    expect(extensionSourceDir).toBe(resolve('chrome-extension'))
  }
  const extensionManifest = JSON.parse(readFileSync(extensionManifestPath, 'utf8')) as {
    background?: { service_worker?: string }
    content_scripts?: Array<{ js?: string[] }>
    host_permissions?: string[]
  }
  expect(extensionManifest.background?.service_worker).toBe('background.js')
  expect(extensionManifest.content_scripts?.[0]?.js).toEqual(['queue-parser.js', 'content.js'])
  expect(extensionManifest.host_permissions).toEqual(expect.arrayContaining([
    'https://myoffice.bombparty.com/*',
    'https://www.yoursparklesuite.com/*',
  ]))
  const sql = new PGlite()
  try {
    await sql.exec('create role anon; create role authenticated; create role service_role bypassrls; create table reps(id uuid primary key); create table live_queue(rep_id uuid,sync_code text,queue jsonb,last_updated timestamptz); grant select on live_queue to service_role;')
    await sql.query('insert into reps values($1)', [rep])
    await sql.query(`insert into live_queue(rep_id, sync_code, queue, last_updated) values($1, 'MHF-9446', '[]'::jsonb, now())`, [rep])
    await sql.exec(readFileSync(new URL('../supabase/migrations/20260910000100_live_lineup_v2.sql', import.meta.url), 'utf8'))
    await sql.exec('set role service_role')
    const fixtureClock = Date.now()
    let elapsed = 0
    vi.spyOn(Date, 'now').mockImplementation(() => fixtureClock + elapsed)
    seams.admin.mockReturnValue(lineupSqlAdapter(sql))
    seams.auth.mockResolvedValue({ repId: rep })
    seams.support.mockReturnValue(null)
    seams.target.mockReturnValue({ targeted: true, publicSiteSlug: 'synthetic' })
    seams.resolve.mockResolvedValue({ id: rep, public_site_slug: 'synthetic' })

    const issued = await json(await publishers.POST(request('/api/workspace/live-lineup/publishers', { label: 'Synthetic release laptop' })), 201)
    const orderedAt = Date.now() - 1_000
    const first = {
      parserState: 'ready',
      entries: [
        { id: 'p1:a', name: 'Jessica', orderedAt },
        { id: 'p1:b', name: 'Morgan', orderedAt },
        { id: 'p1:c', name: 'Casey', orderedAt },
      ],
      revealedIds: [],
      revealedEntries: [],
    }
    const localStorage: Record<string, unknown> = {}
    const sessionStorage: Record<string, unknown> = {}
    const workerListeners: Record<string, (...args: unknown[]) => unknown> = {}
    let dropNextSnapshotAcknowledgement = false
    const storageArea = (record: Record<string, unknown>) => ({
      setAccessLevel: async () => undefined,
      get: async (key: string) => ({ [key]: structuredClone(record[key]) }),
      set: async (values: Record<string, unknown>) => Object.assign(record, structuredClone(values)),
      remove: async (key: string) => { delete record[key] },
    })
    let sourceSnapshot = first
    const chrome = {
      runtime: {
        id: 'kmodgfffflplfdlkkhadgimmobplhoih',
        getURL: (path: string) => `${extensionOrigin}/${path}`,
        getManifest: () => ({ version: '2.0.0' }),
        onMessage: { addListener: (listener: (...args: unknown[]) => unknown) => { workerListeners.message = listener } },
      },
      storage: { local: storageArea(localStorage), session: storageArea(sessionStorage), sync: storageArea({}) },
      alarms: { create: async () => undefined, onAlarm: { addListener: (listener: (...args: unknown[]) => unknown) => { workerListeners.alarm = listener } } },
      tabs: {
        query: async () => [
          { id: 9, active: true, url: 'https://myoffice.bombparty.com/live-party-orders' },
          { id: 10, active: false, url: 'https://myoffice.bombparty.com/live-party-orders' },
        ],
        sendMessage: async (_id: number, message: { action: string; generation?: number; selection?: { partyIds: string[] } }) => {
          if (message.action === 'sparkle-v2-inspect') return { protocol: 2, snapshot: sourceSnapshot }
          expect(message.action).toBe('sparkle-v2-read')
          expect(message.selection?.partyIds).toEqual(['p1'])
          return { protocol: 2, generation: message.generation, snapshot: sourceSnapshot }
        },
        onRemoved: { addListener: (listener: (...args: unknown[]) => unknown) => { workerListeners.removed = listener } },
        onUpdated: { addListener: (listener: (...args: unknown[]) => unknown) => { workerListeners.updated = listener } },
        onActivated: { addListener: (listener: (...args: unknown[]) => unknown) => { workerListeners.activated = listener } },
      },
    }
    const workerContext = {
      chrome,
      URL,
      TextEncoder,
      TextDecoder,
      AbortController,
      crypto: webcrypto,
      Date,
      setTimeout,
      clearTimeout,
      fetch: async (_url: string, options: RequestInit) => {
        const headers = new Headers(options.headers)
        headers.set('origin', extensionOrigin)
        const sourceBody = JSON.parse(String(options.body)) as { action?: string }
        const response = await publish.POST(new Request(`${origin}/api/live-lineup/publish`, {
          method: 'POST',
          headers,
          body: String(options.body),
        }))
        if (dropNextSnapshotAcknowledgement && sourceBody.action === 'snapshot') {
          dropNextSnapshotAcknowledgement = false
          throw new Error('Synthetic connection loss after server commit')
        }
        Object.defineProperty(response, 'url', { value: `${origin}/api/live-lineup/publish` })
        return response
      },
    }
    const workerSource = readFileSync(extensionWorkerPath, 'utf8')
    const createWorkerContext = () => {
      const importedScripts: string[] = []
      const context = createContext({
        ...workerContext,
        importScripts: (...scripts: string[]) => {
          expect(scripts).toEqual(['publisher-client.js'])
          importedScripts.push(...scripts)
          runInContext(readFileSync(extensionClientPath, 'utf8'), context)
        },
      })
      runInContext(workerSource, context)
      expect(importedScripts).toEqual(['publisher-client.js'])
      expect(runInContext('typeof SparklePublisherClient', context)).toBe('object')
      return context
    }
    let activeWorkerContext = createWorkerContext()
    const runWorker = (source: string) => runInContext(source, activeWorkerContext)
    await runWorker('ready')
    expect((await runWorker('exclusive(()=>popupMessage({action:"sparkle-v2-connect",credential:"MHF-9446"}))')).configured).toBe(true)
    expect((await runWorker('exclusive(pull)')).status).toBe('confirmed')

    // The server commits one snapshot but its acknowledgment is lost. A fresh
    // service-worker context reclaims authority from durable state and
    // resumes at the server-accepted sequence instead of duplicating or
    // dropping the lineup.
    elapsed += 1_000
    dropNextSnapshotAcknowledgement = true
    expect((await runWorker('exclusive(pull)')).status).toBe('connection_failed')
    expect((await runWorker('store.load()')).lastError).toBe('connection_failed')
    elapsed += 60_000
    activeWorkerContext = createWorkerContext()
    await runWorker('ready')
    expect((await runWorker('exclusive(pull)')).status).toBe('confirmed')

    // Multiple eligible tabs use the active Party Orders tab. A normal reload
    // keeps that choice and reconnects without asking the rep to select it.
    expect((await runWorker('selected()')).tabId).toBe(9)
    workerListeners.updated!(9, { status: 'loading' })
    await runWorker('serial')
    expect((await runWorker('selected()')).tabId).toBe(9)
    workerListeners.updated!(9, { status: 'complete' })
    await runWorker('serial')

    let owner = await json(await workspace.GET())
    const command = async (value: unknown) => json(await workspace.POST(request('/api/workspace/live-lineup', {
      expectedRevision: owner.revision,
      command: value,
    })))
    owner = await command({ type: 'hold', entryId: 'p1:a' })
    owner = await command({ type: 'move', entryId: 'p1:c', beforeEntryId: 'p1:b' })

    elapsed += 60_000
    const second = {
      ...first,
      entries: [first.entries[0], first.entries[2], { id: 'p1:d', name: 'New customer', orderedAt: Date.now() }],
    }
    sourceSnapshot = second
    expect((await runWorker('exclusive(pull)')).status).toBe('confirmed')
    owner = await json(await workspace.GET())
    expect(owner.entries.map((entry: { id: string }) => entry.id)).toEqual(['p1:c', 'p1:b', 'p1:d'])
    expect(owner.heldEntries.map((entry: { id: string }) => entry.id)).toEqual(['p1:a'])

    const staleMutation = await workspace.POST(request('/api/workspace/live-lineup', {
      expectedRevision: owner.revision - 1,
      command: { type: 'return', entryId: 'p1:a' },
    }))
    expect(staleMutation.status).toBe(409)
    owner = await command({ type: 'return', entryId: 'p1:a' })
    owner = await command({ type: 'reveal-next', entryId: 'p1:b' })
    expect(owner.entries.map((entry: { id: string }) => entry.id)).toEqual(['p1:b', 'p1:c', 'p1:d', 'p1:a'])
    owner = await command({ type: 'undo' })
    owner = await command({ type: 'move', entryId: 'p1:a', beforeEntryId: 'p1:c' })
    expect(owner.entries.map((entry: { id: string }) => entry.id)).toEqual(['p1:a', 'p1:c', 'p1:b', 'p1:d'])

    // A parser gap must retain the last known customer order but mark it
    // delayed. A later ready snapshot must restore live status.
    elapsed += 1_000
    sourceSnapshot = { parserState: 'loading', entries: [], revealedIds: [], revealedEntries: [] }
    expect((await runWorker('exclusive(pull)')).status).toBe('source_not_ready')
    let publicPayload = await json(await publicRoute.GET(new Request(`${origin}/api/amethyst/live-lineup?publicSiteSlug=synthetic`)))
    expect(publicPayload.liveQueueState).toBe('delayed')
    expect(publicPayload.liveQueueEntries.map((entry: { name: string }) => entry.name)).toEqual(['Jessica', 'Casey', 'Morgan', 'New customer'])
    elapsed += 1_000
    sourceSnapshot = second
    expect((await runWorker('exclusive(pull)')).status).toBe('confirmed')
    publicPayload = await json(await publicRoute.GET(new Request(`${origin}/api/amethyst/live-lineup?publicSiteSlug=synthetic`)))
    expect(publicPayload.liveQueueState).toBe('live')
    expect(publicPayload.liveQueueEntries.map((entry: { name: string }) => entry.name)).toEqual(['Jessica', 'Casey', 'Morgan', 'New customer'])
    for (const privateValue of [issued.token, issued.publisher.id, 'p1:a', 'heldEntries', 'claimId']) {
      expect(JSON.stringify(publicPayload)).not.toContain(privateValue)
    }

    // The same tenant resolves through a custom-domain target without
    // exposing the internal identity in the response.
    seams.target.mockReturnValueOnce({ targeted: true, repId: null, publicSiteSlug: null, customDomain: 'synthetic.example', source: 'custom-domain' })
    seams.resolve.mockResolvedValueOnce({ id: rep, public_site_slug: 'synthetic' })
    const customDomainPayload = await json(await publicRoute.GET(new Request('https://synthetic.example/api/amethyst/live-lineup')))
    expect(customDomainPayload.liveQueueEntries).toEqual(publicPayload.liveQueueEntries)
    expect(seams.resolve).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ repId: 'synthetic.example', strict: true }))

    const runtimeSource = readFileSync('public/amethyst/live-lineup.js', 'utf8')
    for (const page of ['homepage.jsx', 'join.jsx', 'trade.jsx']) {
      const pageSource = readFileSync(`public/amethyst/${page}`, 'utf8')
      expect(pageSource).toContain("window.SparkleLiveLineup.start")
      expect(pageSource).toContain('/api/amethyst/live-lineup')
      const context: { SparkleLiveLineup?: { merge: (current: unknown, next: unknown) => typeof publicPayload } } = {}
      runInNewContext(runtimeSource, context)
      const rendered = context.SparkleLiveLineup!.merge({
        liveQueueState: 'offline', liveQueueLastUpdated: null, liveQueueEntries: [], liveQueueSummary: 'Unavailable',
      }, publicPayload)
      expect(rendered.liveQueueEntries.map((entry: { name: string }) => entry.name)).toEqual(['Jessica', 'Casey', 'Morgan', 'New customer'])
    }

    // A new show generation is adopted automatically; no source selection is shown.
    owner = await json(await workspace.GET())
    owner = await command({ type: 'start-show', confirmed: true, partyIds: ['p1'], carryEntryIds: [] })
    elapsed += 1_000
    sourceSnapshot = { parserState: 'ready', entries: [], revealedIds: [], revealedEntries: [] }
    expect((await runWorker('exclusive(pull)')).status).toBe('confirmed')
    const empty = await json(await publicRoute.GET(new Request(`${origin}/api/amethyst/live-lineup?publicSiteSlug=synthetic`)))
    expect(empty.liveQueueState).toBe('empty')
    expect(empty.liveQueueEntries).toEqual([])
    elapsed += 1_000
    sourceSnapshot = {
      ...second,
      entries: second.entries.map((entry, index) => ({ ...entry, orderedAt: Date.now() + index })),
    }
    expect((await runWorker('exclusive(pull)')).status).toBe('confirmed')
    const currentPublisher = await runWorker('store.load()') as {
      publisherId: string
      epoch: number
      generation: number
      nextSequence: number
    }
    const stalePacket = {
      ...sourceSnapshot,
      generation: currentPublisher.generation,
      publisherId: currentPublisher.publisherId,
      epoch: currentPublisher.epoch,
      sequence: Math.max(0, currentPublisher.nextSequence - 2),
      sourceVersion: '2.0.0',
    }
    elapsed += 501
    const staleSource = await publish.POST(request('/api/live-lineup/publish', { action: 'snapshot', packet: stalePacket }, {
      origin: extensionOrigin,
      authorization: 'Bearer MHF-9446',
    }))
    expect(staleSource.status).toBe(409)
    expect(await staleSource.json()).toEqual({ error: 'stale_sequence' })
    await json(await publishers.DELETE(request('/api/workspace/live-lineup/publishers', { publisherId: issued.publisher.id }, {}, 'DELETE')))
    expect((await runWorker('exclusive(pull)')).status).toBe('confirmed')
    expect((await runWorker('exclusive(status)')).needsConnection).toBe(false)
    elapsed += 46_000
    const delayed = await json(await publicRoute.GET(new Request(`${origin}/api/amethyst/live-lineup?publicSiteSlug=synthetic`)))
    expect(delayed.liveQueueState).toBe('delayed')
    expect(delayed.liveQueueEntries.length).toBeGreaterThan(0)
    elapsed += 3_601_000
    const offline = await json(await publicRoute.GET(new Request(`${origin}/api/amethyst/live-lineup?publicSiteSlug=synthetic`)))
    expect(offline.liveQueueState).toBe('offline')
    expect(offline.liveQueueEntries).toEqual([])

    const expiring = await json(await publishers.POST(request('/api/workspace/live-lineup/publishers', { label: 'Synthetic expired laptop' })), 201)
    const expiredAt = new Date(Date.parse(expiring.publisher.createdAt) + 1).toISOString()
    const expiryUpdate = await sql.query('update live_lineup_publisher_tokens set expires_at = $1 where id = $2 returning id', [expiredAt, expiring.publisher.id])
    expect(expiryUpdate.rows).toHaveLength(1)
    elapsed = Math.max(elapsed, Date.parse(expiredAt) - fixtureClock + 1)
    const expiredResponse = await publish.POST(request('/api/live-lineup/publish', { action: 'describe' }, {
      origin: extensionOrigin,
      authorization: `Bearer ${expiring.token}`,
    }))
    expect(expiredResponse.status).toBe(401)
  } finally {
    vi.restoreAllMocks()
    await sql.close()
  }
}, 30_000)
