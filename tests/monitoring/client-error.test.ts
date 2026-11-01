import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { sanitizeClientError } from '@/lib/monitoring/client-error-payload'

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), fetch: vi.fn(), after: [] as Array<() => Promise<void>>, domain: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => ({ rpc: mocks.rpc }) }))
vi.mock('@/lib/amethyst/customer-domain-site', () => ({ resolveCustomerDomainSiteState: mocks.domain }))
vi.mock('@/lib/prelaunch/waitlist-owner-alert', () => ({ PRELAUNCH_WAITLIST_OWNER_ALERT_EMAIL: 'louis@neonrabbit.net' }))
vi.mock('next/server', () => ({ after: (callback: () => Promise<void>) => mocks.after.push(callback) }))
vi.mock('@/lib/monitoring/client-error-guard', async original => {
  const actual = await original<typeof import('@/lib/monitoring/client-error-guard')>()
  return { ...actual, isBuiltClientErrorSource: (value: unknown, origin: string) => actual.isBuiltClientErrorSource(value, origin, {
    '/_next/static/chunks/abcdef123.js': [200, 50], '/amethyst/compiled/homepage.js': [500],
  }) }
})
const origin = 'https://www.yoursparklesuite.com'
const payload = { message: 'TypeError: Cannot read properties of null (private@example.test)', messageHash: 'a'.repeat(64),
  source: { url: origin + '/_next/static/chunks/abcdef123.js', line: 1, column: 22 },
  path: '/reps/private@example.test/join?token=private', userAgent: 'Chrome/124.0.0 private@example.test' }
const req = (body = JSON.stringify(payload), headers: Record<string, string> = {}, url = origin) => new Request(url + '/api/public/client-error', {
  method: 'POST', headers: { origin: url, 'sec-fetch-site': 'same-origin', 'content-type': 'application/json', 'x-vercel-forwarded-for': '203.0.113.1', ...headers }, body,
})
beforeEach(() => {
  vi.resetModules(); vi.useFakeTimers(); mocks.after.length = 0; mocks.rpc.mockReset(); mocks.domain.mockReset()
  mocks.domain.mockResolvedValue({ kind: 'unavailable' })
  vi.stubEnv('CLIENT_ERROR_ALERTS', 'on'); vi.stubEnv('VERCEL', '1'); vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-private-key')
  vi.stubEnv('VERCEL_ENV', 'preview'); vi.stubEnv('VERCEL_URL', 'own-preview.vercel.app'); vi.stubEnv('VERCEL_DEPLOYMENT_ID', 'dpl_synthetic')
  vi.stubEnv('RESEND_API_KEY', 'test-email-key'); vi.stubEnv('RESEND_FROM_EMAIL', 'Smoke <smoke@example.test>')
  vi.stubGlobal('fetch', mocks.fetch); mocks.fetch.mockReset().mockResolvedValue(new Response('{}', { status: 200 }))
  vi.spyOn(console, 'error').mockImplementation(() => {})
  mocks.rpc.mockResolvedValue({ data: { allowed: true, batchId: 'batch-1', schedule: true, delayMs: 61_000 }, error: null })
})
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks() })

describe('endpoint admission', () => {
  it('stays off by default without reading payload or touching providers/state', async () => {
    vi.stubEnv('CLIENT_ERROR_ALERTS', '')
    const { POST } = await import('@/app/api/public/client-error/route')
    expect((await POST(req('not JSON'))).status).toBe(204)
    expect(mocks.rpc).not.toHaveBeenCalled(); expect(mocks.after).toHaveLength(0); expect(mocks.fetch).not.toHaveBeenCalled()
  })
  it.each(['null', '[]', '{}', '{"message":4}', 'not json'])('rejects invalid body %s', async body => {
    const { POST } = await import('@/app/api/public/client-error/route')
    expect((await POST(req(body))).status).toBe(400); expect(mocks.rpc).not.toHaveBeenCalled()
  })
  it('enforces 8 KB on declared and actual UTF-8 bytes', async () => {
    const { POST } = await import('@/app/api/public/client-error/route')
    expect((await POST(req(JSON.stringify({ ...payload, padding: 'é'.repeat(4200) })))).status).toBe(413)
    expect((await POST(req('{}', { 'content-length': '8193' }))).status).toBe(413)
    expect((await POST(req(JSON.stringify({ ...payload, padding: 'x'.repeat(5000) })))).status).toBe(204)
  })
  it('requires same-origin browser metadata, JSON and a known site host', async () => {
    const { POST } = await import('@/app/api/public/client-error/route')
    expect((await POST(req(undefined, { origin: 'https://attacker.example' }))).status).toBe(403)
    expect((await POST(req(undefined, { 'sec-fetch-site': 'cross-site' }))).status).toBe(403)
    expect((await POST(req(undefined, { 'content-type': 'text/plain' }))).status).toBe(415)
    expect((await POST(req(undefined, {}, 'https://attacker.vercel.app'))).status).toBe(403)
    expect(mocks.rpc).not.toHaveBeenCalled()
  })
  it('uses the existing rep-domain resolver and only this exact preview host', async () => {
    const { isClientErrorHostAllowed } = await import('@/lib/monitoring/client-error-guard')
    expect(await isClientErrorHostAllowed('own-preview.vercel.app')).toBe(true)
    mocks.domain.mockResolvedValue({ kind: 'serve', repId: 'synthetic' })
    expect(await isClientErrorHostAllowed('approved-rep.example')).toBe(true)
    expect(mocks.domain).toHaveBeenCalledWith('approved-rep.example')
  })
  it('ignores extension, foreign, unknown-build and impossible script locations before budget admission', async () => {
    const { POST } = await import('@/app/api/public/client-error/route')
    for (const source of [
      { ...payload.source, url: 'chrome-extension://abc/script.js' },
      { ...payload.source, url: 'https://other.example/_next/static/chunks/abcdef123.js' },
      { ...payload.source, url: origin + '/_next/static/chunks/not-in-build.js' },
      { ...payload.source, line: 3 }, { ...payload.source, column: 9999 },
    ]) expect((await POST(req(JSON.stringify({ ...payload, source })))).status).toBe(204)
    expect(mocks.rpc).not.toHaveBeenCalled()
  })
  it('uses a hashed platform IP; payload/x-forwarded-for cannot replace a missing Vercel IP', async () => {
    const { POST } = await import('@/app/api/public/client-error/route')
    await POST(req(JSON.stringify({ ...payload, ip: '1.2.3.4' }), { 'x-forwarded-for': '1.2.3.4' }))
    expect(mocks.rpc.mock.calls[0][1].p_ip_hash).toMatch(/^[a-f0-9]{64}$/)
    expect(JSON.stringify(mocks.rpc.mock.calls)).not.toContain('203.0.113.1')
    mocks.rpc.mockClear()
    expect((await POST(req(undefined, { 'x-vercel-forwarded-for': '', 'x-forwarded-for': '1.2.3.4' }))).status).toBe(204)
    expect(mocks.rpc).not.toHaveBeenCalled()
  })
  it('silently drops a flooding admission without scheduling or emailing', async () => {
    mocks.rpc.mockResolvedValue({ data: { allowed: false }, error: null })
    const { POST } = await import('@/app/api/public/client-error/route')
    expect((await POST(req())).status).toBe(204)
    expect(mocks.after).toHaveLength(0); expect(mocks.fetch).not.toHaveBeenCalled()
  })
  it('fails closed if durable state is unavailable', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: new Error('store down') })
    const { POST } = await import('@/app/api/public/client-error/route')
    expect((await POST(req())).status).toBe(204); expect(mocks.fetch).not.toHaveBeenCalled(); expect(mocks.after).toHaveLength(0)
  })
})

describe('private owner delivery', () => {
  it('fingerprints only message identity, source file and line', async () => {
    const { clientErrorFingerprint } = await import('@/lib/monitoring/client-error-alert')
    const source = { file: '/_next/static/chunks/a.js', line: 1 }
    const key = clientErrorFingerprint('a'.repeat(64), source)
    expect(clientErrorFingerprint('a'.repeat(64), { ...source })).toBe(key)
    expect(clientErrorFingerprint('b'.repeat(64), source)).not.toBe(key)
    expect(clientErrorFingerprint('a'.repeat(64), { ...source, line: 2 })).not.toBe(key)
    expect(clientErrorFingerprint('a'.repeat(64), { ...source, file: '/amethyst/compiled/homepage.js' })).not.toBe(key)
  })
  it('sends only after admission window, only to owner, with sanitized repeat count and reservation idempotency', async () => {
    const { POST } = await import('@/app/api/public/client-error/route')
    await POST(req())
    const diagnostic = mocks.rpc.mock.calls[0][1].p_diagnostic
    expect(JSON.stringify(diagnostic)).not.toMatch(/private@example|token=private/)
    mocks.rpc.mockResolvedValue({ data: [{ reservationId: 'reservation-1', fingerprint: 'f'.repeat(64), repeatCount: 7, diagnostic }], error: null })
    const pending = mocks.after[0]()
    await vi.advanceTimersByTimeAsync(60_000); expect(mocks.fetch).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1000); await pending
    const call = mocks.fetch.mock.calls[0][1], email = JSON.parse(call.body)
    expect(email.to).toEqual(['louis@neonrabbit.net']); expect(email.cc).toBeUndefined(); expect(email.bcc).toBeUndefined()
    expect(JSON.parse(email.text).repeatsSincePreviousAlert).toBe(7)
    expect(call.headers['Idempotency-Key']).toBe('client-error/reservation-1')
    expect(JSON.parse(email.text).deployment).toBe('dpl_synthetic')
  })
  it('a suppressed claim sends nothing and provider failures never escape the endpoint task', async () => {
    const { deliverClientErrorBatch } = await import('@/lib/monitoring/client-error-alert')
    mocks.rpc.mockResolvedValue({ data: [], error: null })
    const first = deliverClientErrorBatch('batch', 0); await vi.runAllTimersAsync(); await first
    expect(mocks.fetch).not.toHaveBeenCalled()
    mocks.rpc.mockResolvedValue({ data: [{ reservationId: 'r', fingerprint: 'f', repeatCount: 0, diagnostic: {} }], error: null })
    mocks.fetch.mockRejectedValue(new Error('provider down'))
    const second = deliverClientErrorBatch('batch2', 0); await vi.runAllTimersAsync(); await expect(second).resolves.toBeUndefined()
  })
  it('keeps arbitrary exception data out of diagnostics', () => {
    expect(sanitizeClientError({ message: 'Customer Mary private@example.test', path: '//private.example' })).toEqual({ message: 'Error: [redacted]', stack: '', path: '/[redacted]', userAgent: 'Other' })
  })
})
