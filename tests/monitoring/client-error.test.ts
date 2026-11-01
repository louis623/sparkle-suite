import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { sanitizeClientError } from '@/lib/monitoring/client-error-payload'

vi.mock('@/lib/prelaunch/waitlist-owner-alert', () => ({ PRELAUNCH_WAITLIST_OWNER_ALERT_EMAIL: 'louis@neonrabbit.net' }))
const fetchMock = vi.fn()
const origin = 'https://synthetic.example'
const payload = { message: 'TypeError: Cannot read properties of null (reading private form value)', stack: 'at CustomerName (https://host/_next/static/chunks/abcdef123.js:1:22?email=private@example.test)', path: '/reps/private@example.test/join?token=private', userAgent: 'Mozilla/5.0 Chrome/124.0.0.0 private@example.test' }

beforeEach(() => {
  vi.resetModules()
  vi.stubEnv('CLIENT_ERROR_ALERTS', 'on')
  vi.stubEnv('RESEND_API_KEY', 'mock-resend-key')
  vi.stubEnv('RESEND_FROM_EMAIL', 'Smoke <smoke@example.test>')
  vi.stubEnv('VERCEL_DEPLOYMENT_ID', 'dpl_synthetic')
  vi.stubGlobal('fetch', fetchMock)
  vi.spyOn(console, 'error').mockImplementation(() => {})
  fetchMock.mockReset().mockResolvedValue(new Response('{"id":"mock-email"}', { status: 200 }))
})
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks() })
const request = (body: string, headers: Record<string, string> = {}) => new Request(`${origin}/api/public/client-error`, { method: 'POST', headers: { origin, 'content-type': 'application/json', ...headers }, body })

describe('client error privacy and validation', () => {
  it('removes arbitrary messages, identifiers, query strings, function names and UA detail', () => {
    const result = sanitizeClientError(payload)
    expect(result).toEqual({ message: 'TypeError: Cannot read properties of null', stack: '/_next/static/chunks/abcdef123.js:1:22', path: '/reps/[redacted]/join', userAgent: 'Chrome/124' })
    expect(sanitizeClientError({ message: 'Customer Mary Smith private@example.test 555-555-5555', path: '//private@example.test/path' })).toEqual({ message: 'Error: [redacted]', path: '/[redacted]', stack: '', userAgent: 'Other' })
  })
  it.each(['null', '[]', '{}', '{"message":4}', '{"message":""}', 'not json'])('rejects invalid payload %s', async body => {
    const { POST } = await import('@/app/api/public/client-error/route')
    expect((await POST(request(body))).status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })
  it('rejects actual oversized streamed bytes without trusting content-length', async () => {
    const { POST } = await import('@/app/api/public/client-error/route')
    expect((await POST(request(JSON.stringify({ message: 'é'.repeat(3000) })))).status).toBe(413)
    expect((await POST(request('{}', { 'content-length': '4097' }))).status).toBe(413)
  })
  it('denies cross-origin and non-JSON submissions', async () => {
    const { POST } = await import('@/app/api/public/client-error/route')
    expect((await POST(request('{}', { origin: 'https://elsewhere.example' }))).status).toBe(403)
    expect((await POST(request('{}', { 'content-type': 'text/plain' }))).status).toBe(415)
  })
  it('does not read input, log or email when off, including a direct helper call', async () => {
    vi.stubEnv('CLIENT_ERROR_ALERTS', '')
    const { POST } = await import('@/app/api/public/client-error/route')
    const { alertClientError } = await import('@/lib/monitoring/client-error-alert')
    expect((await POST(request('bad json'))).status).toBe(204)
    expect(await alertClientError(payload)).toBe('disabled')
    expect(fetchMock).not.toHaveBeenCalled()
    expect(console.error).not.toHaveBeenCalled()
  })
})

describe('owner-only bounded alerts', () => {
  it('emails only the existing owner, with sanitized data and no client-supplied deployment', async () => {
    const { POST } = await import('@/app/api/public/client-error/route')
    expect((await POST(request(JSON.stringify({ ...payload, buildId: 'spoofed', email: 'private@example.test', cookie: 'secret' })))).status).toBe(204)
    const options = fetchMock.mock.calls[0][1]
    const email = JSON.parse(options.body)
    expect(email.to).toEqual(['louis@neonrabbit.net'])
    expect(email.text).toContain('dpl_synthetic')
    expect(email.text).not.toMatch(/private|spoofed|secret|CustomerName/)
    expect(options.headers['Idempotency-Key']).toMatch(/^client-error\/dpl_synthetic\/[0-9]$/)
  })
  it('suppresses simultaneous identical errors', async () => {
    const { alertClientError } = await import('@/lib/monitoring/client-error-alert')
    expect(await Promise.all([alertClientError(payload), alertClientError(payload)])).toEqual(['sent', 'suppressed'])
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
  it('has a fixed ten-slot daily cap with no unbounded fingerprint storage', async () => {
    const { alertClientError } = await import('@/lib/monitoring/client-error-alert')
    for (let i = 0; i < 100; i++) await alertClientError({ message: 'Error', stack: `/_next/static/chunks/abcdef123.js:1:${i}` })
    expect(fetchMock.mock.calls.length).toBeLessThanOrEqual(10)
    expect(new Set(fetchMock.mock.calls.map(call => call[1].headers['Idempotency-Key'])).size).toBe(fetchMock.mock.calls.length)
  })
  it('uses the same durable slot after a cold start and treats provider conflicts as suppression', async () => {
    let helper = await import('@/lib/monitoring/client-error-alert')
    await helper.alertClientError(payload)
    const key = fetchMock.mock.calls[0][1].headers['Idempotency-Key']
    vi.resetModules()
    fetchMock.mockResolvedValue(new Response('{}', { status: 409 }))
    helper = await import('@/lib/monitoring/client-error-alert')
    expect(await helper.alertClientError(payload)).toBe('suppressed')
    expect(fetchMock.mock.calls[1][1].headers['Idempotency-Key']).toBe(key)
  })
  it('contains provider failures without affecting the visitor response', async () => {
    fetchMock.mockRejectedValue(new Error('provider unavailable'))
    const { POST } = await import('@/app/api/public/client-error/route')
    expect((await POST(request(JSON.stringify(payload)))).status).toBe(204)
  })
})
