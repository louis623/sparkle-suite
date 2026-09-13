import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {ReviewerSmokeSafetyError} from '@/lib/reviewer-smoke/identity'

const resetReviewerSmokeSessionMock = vi.fn()

vi.mock('@/lib/reviewer-smoke/session', () => ({
  resetReviewerSmokeSession: (...args: unknown[]) =>
    resetReviewerSmokeSessionMock(...args),
}))

import { POST } from '@/app/api/reviewer-smoke/session/route'

describe('POST /api/reviewer-smoke/session', () => {
  const origin = 'https://preview.yoursparklesuite.com'
  const request = (
    body: unknown,
    headers: Record<string, string> = {},
  ) =>
    new Request(`${origin}/api/reviewer-smoke/session`, {
      method: 'POST',
      headers: {
        origin,
        'content-type': 'application/json',
        ...headers,
      },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    })

  afterEach(()=>vi.restoreAllMocks())
  beforeEach(() => {
    vi.unstubAllEnvs()
    resetReviewerSmokeSessionMock.mockReset()
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('VERCEL_ENV', 'preview')
    vi.stubEnv('SPARKLE_REVIEWER_SMOKE_MODE', 'true')
    vi.stubEnv('SPARKLE_REVIEWER_SMOKE_TOKEN', 'review-token-12345')
  })
  it.each(['REVIEWER_SMOKE_IDENTITY_MIGRATION_REQUIRED','REVIEWER_SMOKE_UNSUPPORTED_IDENTITY','REVIEWER_SMOKE_IDENTITY_MISMATCH','REVIEWER_SMOKE_UNSAFE_ENTITLEMENT','REVIEWER_SMOKE_LINEUP_RESET_UNAVAILABLE','REVIEWER_SMOKE_INVALID_RESET_RECEIPT'])('returns only allowlisted safe action guidance for %s',async code=>{
    resetReviewerSmokeSessionMock.mockRejectedValue(new ReviewerSmokeSafetyError(code,'private-provider-secret customer@example.com'))
    const response=await POST(request({token:'review-token-12345',state:'required_setup'}))
    expect([409,503]).toContain(response.status);expect(response.headers.get('cache-control')).toBe('private, no-store')
    const body=await response.json();expect(body.code).toBe(code);expect(body.error).toMatch(/operator/)
    expect(JSON.stringify(body)).not.toMatch(/private-provider|customer@example/)
  })
  it.each([new Error('private-provider-secret'),new ReviewerSmokeSafetyError('UNEXPECTED_PRIVATE_CODE','private-provider-secret'),new ReviewerSmokeSafetyError('constructor','private-provider-secret'),new ReviewerSmokeSafetyError('__proto__','private-provider-secret'),{code:'REVIEWER_SMOKE_IDENTITY_MISMATCH',message:'private-provider-secret'}])('does not expose raw or structurally spoofed failures %#',async error=>{
    const log=vi.spyOn(console,'error').mockImplementation(()=>{})
    resetReviewerSmokeSessionMock.mockRejectedValue(error)
    const response=await POST(request({token:'review-token-12345',state:'required_setup'}))
    expect(response.status).toBe(500);expect(await response.json()).toEqual({error:'Unable to prepare reviewer smoke session.'})
    expect(JSON.stringify(log.mock.calls)).not.toContain('private-provider-secret')
  })

  it('rejects an empty token in preview', async () => {
    const response = await POST(request({ token: '', state: 'required_setup' }))

    expect(response.status).toBe(403)
    expect(resetReviewerSmokeSessionMock).not.toHaveBeenCalled()
  })

  it.each([
    ['cross-origin', { origin: 'https://evil.example' }, 403],
    ['cross-site fetch metadata', { 'sec-fetch-site': 'cross-site' }, 403],
    ['text/plain', { 'content-type': 'text/plain' }, 415],
  ])('rejects %s requests before reset', async (_label, headers, status) => {
    const response = await POST(
      request(
        { token: 'review-token-12345', state: 'required_setup' },
        headers,
      ),
    )

    expect(response.status).toBe(status)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(resetReviewerSmokeSessionMock).not.toHaveBeenCalled()
  })

  it('rejects an oversized JSON request before reset', async () => {
    const response = await POST(
      request({
        token: 'review-token-12345',
        state: 'required_setup',
        padding: 'x'.repeat(2_048),
      }),
    )

    expect(response.status).toBe(413)
    expect(resetReviewerSmokeSessionMock).not.toHaveBeenCalled()
  })

  it('resets the reusable reviewer session in production when the token matches', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('VERCEL_ENV', 'production')
    resetReviewerSmokeSessionMock.mockResolvedValue({
      ok: true,
      email: 'sparkle-reviewer+preview@neonrabbit.net',
      password: 'preview-only-password',
      state: 'required_setup',
      next: '/nic-nac?onboarding=required-setup',
    })

    const response = await POST(
      request({
          token: 'review-token-12345',
          state: 'required_setup',
      }),
    )

    expect(response.status).toBe(200)
    expect(resetReviewerSmokeSessionMock).toHaveBeenCalledWith('required_setup')
  })

  it('blocks reviewer setup in production without the matching token', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('VERCEL_ENV', 'production')

    const response = await POST(
      request({
          state: 'required_setup',
      }),
    )

    expect(response.status).toBe(403)
    expect(resetReviewerSmokeSessionMock).not.toHaveBeenCalled()
  })

  it('resets the reusable reviewer session for a valid preview token', async () => {
    resetReviewerSmokeSessionMock.mockResolvedValue({
      ok: true,
      email: 'sparkle-reviewer+preview@neonrabbit.net',
      password: 'preview-only-password',
      state: 'required_setup',
      next: '/nic-nac?onboarding=required-setup',
    })

    const response = await POST(
      request({
          token: 'review-token-12345',
          state: 'required_setup',
      }),
    )

    expect(response.status).toBe(200)
    expect(resetReviewerSmokeSessionMock).toHaveBeenCalledWith('required_setup')
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        ok: true,
        state: 'required_setup',
        next: '/nic-nac?onboarding=required-setup',
      }),
    )
  })
})
