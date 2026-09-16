import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ auth: vi.fn(), support: vi.fn(), admin: vi.fn(), change: vi.fn(), get: vi.fn(),
  issue: vi.fn(), list: vi.fn(), revoke: vi.fn(), claim: vi.fn(), receive: vi.fn(), describe: vi.fn(), readiness: vi.fn() }))
vi.mock('@/lib/live-lineup/setup-readiness', () => ({readLineupSetupReadiness: mocks.readiness}))
vi.mock('@/lib/nic-nac/auth', () => ({ getPaidNicNacContext: mocks.auth, AuthError: class AuthError extends Error {} }))
vi.mock('@/lib/operator-support/request-context', () => ({ getOperatorSupportRequestContext: mocks.support }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: mocks.admin }))
vi.mock('@/lib/live-lineup/service', async original => ({ ...await original<typeof import('@/lib/live-lineup/service')>(),
  changeLineup: mocks.change, getWorkspaceLineup: mocks.get, issuePublisher: mocks.issue, listPublishers: mocks.list,
  revokePublisher: mocks.revoke, claimSource: mocks.claim, receiveSource: mocks.receive, describeSource: mocks.describe }))

import { AuthError } from '@/lib/nic-nac/auth'
import { LineupServiceError } from '@/lib/live-lineup/service'
import { lineupFailure, readLineupJson } from '@/lib/live-lineup/http'
import { parseSourcePacket } from '@/lib/live-lineup/model'
import * as workspace from '@/app/api/workspace/live-lineup/route'
import * as publishers from '@/app/api/workspace/live-lineup/publishers/route'
import * as publish from '@/app/api/live-lineup/publish/route'
import * as readiness from '@/app/api/workspace/live-lineup/readiness/route'

const origin = 'https://www.yoursparklesuite.com'
const sourceOrigin = 'https://myoffice.bombparty.com'
const token = `sslp_${'a'.repeat(43)}`
const db = { synthetic: true }
const request = (path: string, body: unknown, headers: Record<string, string> = {}, method = 'POST') =>
  new Request(`${origin}${path}`, { method, headers: { origin, 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) })
const sourceRequest = (body: unknown, headers: Record<string, string> = {}) => request('/api/live-lineup/publish', body,
  { origin: sourceOrigin, authorization: `Bearer ${token}`, ...headers })

beforeEach(() => {
  vi.resetAllMocks()
  mocks.auth.mockResolvedValue({ repId: 'authenticated-rep' })
  mocks.support.mockReturnValue(null)
  mocks.admin.mockReturnValue(db)
  mocks.get.mockResolvedValue({ revision: 1, entries: [] })
  mocks.list.mockResolvedValue([])
  mocks.change.mockResolvedValue({ revision: 2, entries: [] })
  mocks.issue.mockResolvedValue({ token: 'one-time-secret' })
  mocks.claim.mockResolvedValue({ publisherId: 'selected', epoch: 1 })
  mocks.receive.mockResolvedValue({ ok: true, revision: 3 })
})

describe('Live Lineup HTTP tenant/auth/CSRF boundaries', () => {
  it('reads setup readiness for the authenticated pending-setup rep only, without cache or CORS', async () => {
    mocks.readiness.mockResolvedValue({protocol:2, ready:false, reason:'not_initialized'})
    const response = await readiness.GET()
    expect(response.status).toBe(200)
    expect(mocks.readiness).toHaveBeenCalledWith(db, 'authenticated-rep')
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(response.headers.get('access-control-allow-origin')).toBeNull()
    expect(await response.json()).toEqual({protocol:2, ready:false, reason:'not_initialized'})
  })
  it('does not grant unauthenticated or support sessions setup readiness access', async () => {
    mocks.auth.mockRejectedValueOnce(new AuthError('Sign in'))
    expect((await readiness.GET()).status).toBe(401)
    expect(mocks.readiness).not.toHaveBeenCalled()
    mocks.support.mockReturnValue({synthetic:true})
    expect((await readiness.GET()).status).toBe(403)
    expect(mocks.readiness).not.toHaveBeenCalled()
  })
  it('uses authenticated tenant rather than request body tenant or nested command revision', async () => {
    const response = await workspace.POST(request('/api/workspace/live-lineup', {
      repId: 'victim', expectedRevision: 7, command: { type: 'hold', entryId: 'order-1', expectedRevision: 999 },
    }))
    expect(response.status).toBe(200)
    expect(mocks.change).toHaveBeenCalledWith(db, 'authenticated-rep', { type: 'hold', entryId: 'order-1', expectedRevision: 7 })
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(response.headers.get('x-content-type-options')).toBe('nosniff')
    expect(response.headers.get('access-control-allow-origin')).toBeNull()
  })
  it.each(['https://evil.example', 'null', 'https://yoursparklesuite.com', 'https://www.yoursparklesuite.com.evil.example'])('rejects foreign Origin %s before auth/admin access', async badOrigin => {
    const response = await workspace.POST(request('/api/workspace/live-lineup', {}, { origin: badOrigin }))
    expect(response.status).toBe(403)
    expect(mocks.auth).not.toHaveBeenCalled()
    expect(mocks.admin).not.toHaveBeenCalled()
  })
  it('rejects missing origin and explicit cross-site fetch metadata', async () => {
    const missing = request('/api/workspace/live-lineup', {})
    missing.headers.delete('origin')
    expect((await workspace.POST(missing)).status).toBe(403)
    expect((await publishers.DELETE(request('/api/workspace/live-lineup/publishers', { publisherId: 'x' }, { 'sec-fetch-site': 'cross-site' }, 'DELETE'))).status).toBe(403)
    expect(mocks.revoke).not.toHaveBeenCalled()
  })
  it('does not create an admin client for unauthenticated or capability-unenabled support sessions', async () => {
    mocks.auth.mockRejectedValueOnce(new AuthError('synthetic'))
    expect((await workspace.GET()).status).toBe(401)
    expect(mocks.admin).not.toHaveBeenCalled()
    mocks.support.mockReturnValue({ actor: { mode: 'operator_support' } })
    expect((await publishers.GET()).status).toBe(403)
    expect(mocks.admin).not.toHaveBeenCalled()
  })
  it('reads the frozen support target lineup without granting support-mode mutations', async () => {
    const supportDb = { support: true }
    mocks.support.mockReturnValue({
      targetRep: { id: 'target-rep' },
      supabase: supportDb,
    })

    const response = await workspace.GET()

    expect(response.status).toBe(200)
    expect(mocks.get).toHaveBeenCalledWith(supportDb, 'target-rep')
    expect(mocks.auth).not.toHaveBeenCalled()
    expect(mocks.admin).not.toHaveBeenCalled()
    expect((await workspace.POST(request('/api/workspace/live-lineup', { command: { type: 'undo' } }))).status).toBe(403)
    expect(mocks.change).not.toHaveBeenCalled()
  })
  it('scopes publisher issuance and revocation to the authenticated rep and prevents caching one-time credentials', async () => {
    const issued = await publishers.POST(request('/api/workspace/live-lineup/publishers', { label: 'Laptop', repId: 'victim' }))
    expect(issued.status).toBe(201)
    expect(issued.headers.get('cache-control')).toBe('no-store')
    expect(mocks.issue).toHaveBeenCalledWith(db, 'authenticated-rep', 'Laptop')
    const revoked = await publishers.DELETE(request('/api/workspace/live-lineup/publishers', { publisherId: 'publisher-1', repId: 'victim' }, {}, 'DELETE'))
    expect(revoked.status).toBe(200)
    expect(mocks.revoke).toHaveBeenCalledWith(db, 'authenticated-rep', 'publisher-1')
  })
  it.each([null, [], 7, 'command', {}, { command: [] }])('rejects invalid command envelopes without mutation: %j', async body => {
    expect((await workspace.POST(request('/api/workspace/live-lineup', body))).status).toBe(400)
    expect(mocks.change).not.toHaveBeenCalled()
  })
  it('does not leak internal error details or convert a CAS conflict to success', async () => {
    mocks.change.mockRejectedValueOnce(new Error('private connection value'))
    const failed = await workspace.POST(request('/api/workspace/live-lineup', { command: { type: 'undo' } }))
    expect(await failed.json()).toEqual({ error: 'lineup_unavailable' })
    mocks.change.mockRejectedValueOnce(new LineupServiceError('revision_conflict', 409))
    expect((await workspace.POST(request('/api/workspace/live-lineup', { command: { type: 'undo' } }))).status).toBe(409)
  })
})

describe('Live Lineup publisher HTTP boundary', () => {
  it('accepts the rep assigned Workspace code as the source credential', async () => {
    mocks.describe.mockResolvedValue({ protocol: 2, generation: 0, scope: null })
    const response = await publish.POST(sourceRequest(
      { action: 'describe' },
      { authorization: 'Bearer MHF-9446' },
    ))
    expect(response.status).toBe(200)
    expect(mocks.describe).toHaveBeenCalledExactlyOnceWith(db, 'MHF-9446')
  })
  it('accepts maximum-sized valid identity metadata but rejects bodies beyond four MiB before service access', async () => {
    const id = (prefix: string, n: number) => `${prefix}${String(n).padStart(6, '0')}`.padEnd(128, 'x')
    const revealedEntries = Array.from({ length: 10_000 }, (_, n) => ({ id: id('r', n), orderedAt: 8_640_000_000_000_000 }))
    const packet = { generation: 1, publisherId: 'a1111111-1111-4111-8111-111111111111', epoch: 1, sequence: 0,
      sourceVersion: '2.0.0', parserState: 'ready', entries: Array.from({ length: 2_000 }, (_, n) => ({ id: id('w', n), name: '李'.repeat(100), orderedAt: 8_640_000_000_000_000 })),
      revealedIds: revealedEntries.map(entry => entry.id), revealedEntries }
    const envelope = { action: 'snapshot', packet }
    expect(parseSourcePacket(packet)).not.toBeNull()
    const bytes = Buffer.byteLength(JSON.stringify(envelope))
    expect(bytes).toBeGreaterThan(1_048_576)
    expect(bytes).toBeLessThan(4_194_304)
    expect((await publish.POST(sourceRequest(envelope))).status).toBe(200)
    expect(mocks.receive).toHaveBeenCalledExactlyOnceWith(db, token, packet)
    mocks.receive.mockClear()
    expect((await publish.POST(sourceRequest({ action: 'snapshot', padding: 'x'.repeat(4_194_304) }))).status).toBe(413)
    expect(mocks.receive).not.toHaveBeenCalled()
  })
  it('authenticates private setup reads without claiming or accepting a body-selected tenant', async () => {
    const descriptor = { protocol: 2, generation: 0, scope: null, serverTime: new Date().toISOString() }
    mocks.describe.mockResolvedValue(descriptor)
    const response = await publish.POST(sourceRequest({ action: 'describe', repId: 'victim', generation: 99 }))
    expect(await response.json()).toEqual(descriptor)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(mocks.describe).toHaveBeenCalledExactlyOnceWith(db, token)
    expect(mocks.claim).not.toHaveBeenCalled()
    expect(mocks.receive).not.toHaveBeenCalled()
    mocks.describe.mockRejectedValueOnce(new LineupServiceError('unauthorized', 401))
    expect((await publish.POST(sourceRequest({ action: 'describe' }))).status).toBe(401)
  })
  it('forwards the private claim-attempt nonce only to the authenticated source service', async () => {
    const claimId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
    const response = await publish.POST(sourceRequest({ action: 'claim', claimId, repId: 'victim' }))
    expect(response.status).toBe(200)
    expect(mocks.claim).toHaveBeenCalledWith(db, token, claimId, expect.any(Number), 0)
    expect(JSON.stringify(await response.json())).not.toContain(claimId)
    mocks.claim.mockRejectedValueOnce(new LineupServiceError('invalid_claim_id', 400))
    expect((await publish.POST(sourceRequest({ action: 'claim' }))).status).toBe(400)
  })
  it('requires a correctly formatted bearer credential before reading request JSON or creating admin client', async () => {
    for (const authorization of ['', 'Bearer shared-key', `Basic ${token}`]) {
      expect((await publish.POST(sourceRequest({ action: 'claim' }, { authorization }))).status).toBe(401)
    }
    expect(mocks.admin).not.toHaveBeenCalled()
    expect(mocks.claim).not.toHaveBeenCalled()
  })
  it('authorizes source independently of cookies and passes only bearer plus packet to the service', async () => {
    const response = await publish.POST(sourceRequest({ action: 'snapshot', repId: 'victim', packet: { sequence: 2 } }))
    expect(response.status).toBe(200)
    expect(mocks.receive).toHaveBeenCalledWith(db, token, { sequence: 2 })
    expect(mocks.auth).not.toHaveBeenCalled()
    expect(response.headers.get('access-control-allow-origin')).toBe(sourceOrigin)
    expect(response.headers.get('access-control-allow-credentials')).toBeNull()
  })
  it('rejects foreign origins even with a formatted token and never emits wildcard CORS', async () => {
    const response = await publish.POST(sourceRequest({ action: 'claim' }, { origin: 'https://evil.example' }))
    expect(response.status).toBe(403)
    expect(response.headers.get('access-control-allow-origin')).toBeNull()
    expect(mocks.admin).not.toHaveBeenCalled()
    const preflight = await publish.OPTIONS(new Request(`${origin}/api/live-lineup/publish`, { method: 'OPTIONS', headers: { origin: 'https://evil.example' } }))
    expect(preflight.headers.get('access-control-allow-origin')).toBeNull()
  })
  it('accepts only the Sparkle Suite Web Store extension origin', async () => {
    const suiteExtensionOrigin = 'chrome-extension://kmodgfffflplfdlkkhadgimmobplhoih'
    mocks.describe.mockResolvedValue({ protocol: 2, generation: 0, scope: null })
    const accepted = await publish.POST(sourceRequest(
      { action: 'describe' },
      { origin: suiteExtensionOrigin },
    ))
    expect(accepted.status).toBe(200)
    expect(accepted.headers.get('access-control-allow-origin')).toBe(suiteExtensionOrigin)

    const preflight = await publish.OPTIONS(new Request(`${origin}/api/live-lineup/publish`, {
      method: 'OPTIONS',
      headers: { origin: suiteExtensionOrigin },
    }))
    expect(preflight.status).toBe(204)
    expect(preflight.headers.get('access-control-allow-origin')).toBe(suiteExtensionOrigin)

    const unrelatedExtensionOrigin = 'chrome-extension://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
    const rejected = await publish.POST(sourceRequest(
      { action: 'describe' },
      { origin: unrelatedExtensionOrigin },
    ))
    expect(rejected.status).toBe(403)
    expect(rejected.headers.get('access-control-allow-origin')).toBeNull()
  })
  it('returns useful CORS-protected unauthorized responses for revoked tokens', async () => {
    mocks.claim.mockRejectedValueOnce(new LineupServiceError('unauthorized', 401))
    const response = await publish.POST(sourceRequest({ action: 'claim' }))
    expect(response.status).toBe(401)
    expect(response.headers.get('access-control-allow-origin')).toBe(sourceOrigin)
    expect(await response.json()).toEqual({ error: 'unauthorized' })
  })
})

describe('Live Lineup JSON byte boundaries', () => {
  it('enforces exact byte limits, counting UTF-8 bytes rather than characters', async () => {
    const body = JSON.stringify({ name: '李' })
    const bytes = Buffer.byteLength(body)
    expect(await readLineupJson(new Request(origin, { method: 'POST', headers: { 'content-type': 'application/json; charset=utf-8' }, body }), bytes)).toEqual({ name: '李' })
    await expect(readLineupJson(new Request(origin, { method: 'POST', headers: { 'content-type': 'application/json' }, body }), bytes - 1)).rejects.toMatchObject({ code: 'payload_too_large', status: 413 })
  })
  it('enforces streaming limits despite absent or deliberately understated Content-Length', async () => {
    for (const contentLength of [null, '1']) {
      const headers = new Headers({ 'content-type': 'application/json' })
      if (contentLength) headers.set('content-length', contentLength)
      const stream = new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode('"abcdef"')); controller.close() } })
      const req = new Request(origin, { method: 'POST', headers, body: stream, duplex: 'half' } as RequestInit)
      await expect(readLineupJson(req, 4)).rejects.toMatchObject({ code: 'payload_too_large' })
    }
  })
  it('rejects predeclared oversized and missing bodies, and maps malformed JSON to 400', async () => {
    await expect(readLineupJson(request('/', {}, { 'content-length': '99999' }), 10)).rejects.toMatchObject({ status: 413 })
    await expect(readLineupJson(new Request(origin, { headers: { 'content-type': 'application/json' } }))).rejects.toMatchObject({ status: 400 })
    const req = new Request(origin, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{' })
    try { await readLineupJson(req); throw Error('expected JSON rejection') } catch (error) { expect(lineupFailure(error).status).toBe(400) }
  })
  it('rejects non-JSON media types with a JSON prefix (regression)', async () => {
    await expect(readLineupJson(request('/', {}, { 'content-type': 'application/jsonp' }))).rejects.toMatchObject({ status: 415 })
  })
  it('rejects invalid UTF-8 instead of silently changing customer text (regression)', async () => {
    const req = new Request(origin, { method: 'POST', headers: { 'content-type': 'application/json' }, body: new Uint8Array([34, 0xc3, 0x28, 34]) })
    await expect(readLineupJson(req)).rejects.toThrow()
  })
  it('times out a stalled body even when underlying cancellation never settles', async () => {
    vi.useFakeTimers()
    try {
      const cancel = vi.fn(() => new Promise<void>(() => {}))
      const body = new ReadableStream({ cancel })
      const req = new Request(origin, { method: 'POST', headers: { 'content-type': 'application/json' }, body, duplex: 'half' } as RequestInit)
      const pending = readLineupJson(req, 100, 1000)
      const rejected = expect(pending).rejects.toMatchObject({ code: 'request_timeout', status: 408 })
      await vi.advanceTimersByTimeAsync(1001)
      await rejected
      expect(cancel).toHaveBeenCalledOnce()
      expect(vi.getTimerCount()).toBe(0)
    } finally { vi.useRealTimers() }
  })
  it('applies a whole-body deadline instead of allowing a drip to reset it', async () => {
    vi.useFakeTimers()
    try {
      let controller!: ReadableStreamDefaultController<Uint8Array>
      const body = new ReadableStream<Uint8Array>({ start(c) { controller = c } })
      const req = new Request(origin, { method: 'POST', headers: { 'content-type': 'application/json' }, body, duplex: 'half' } as RequestInit)
      const pending = readLineupJson(req, 100, 1000)
      const rejected = expect(pending).rejects.toMatchObject({ code: 'request_timeout' })
      controller.enqueue(new TextEncoder().encode('"'))
      await vi.advanceTimersByTimeAsync(800)
      controller.enqueue(new TextEncoder().encode('a'))
      await vi.advanceTimersByTimeAsync(201)
      await rejected
    } finally { vi.useRealTimers() }
  })
  it.each([false, true])('honors request abort (already aborted=%s) and clears its deadline', async alreadyAborted => {
    const signal = new AbortController()
    const cancel = vi.fn()
    const body = new ReadableStream({ cancel })
    const req = new Request(origin, { method: 'POST', headers: { 'content-type': 'application/json' }, body, signal: signal.signal, duplex: 'half' } as RequestInit)
    if (alreadyAborted) signal.abort()
    const pending = readLineupJson(req)
    const rejected = expect(pending).rejects.toMatchObject({ code: 'request_aborted', status: 400 })
    if (!alreadyAborted) signal.abort()
    await rejected
    expect(cancel).toHaveBeenCalledOnce()
  })
  it('does not await a never-settling cancellation after an oversized body', async () => {
    const body = new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode('oversize')) }, cancel() { return new Promise<void>(() => {}) } })
    const req = new Request(origin, { method: 'POST', headers: { 'content-type': 'application/json' }, body, duplex: 'half' } as RequestInit)
    await expect(readLineupJson(req, 1)).rejects.toMatchObject({ code: 'payload_too_large', status: 413 })
  })
})
