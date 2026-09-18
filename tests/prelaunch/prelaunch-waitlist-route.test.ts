import { beforeEach, describe, expect, it, vi } from 'vitest'

const insertMock = vi.fn()
const updateEqMock = vi.fn()
const updateMock = vi.fn(() => ({ eq: updateEqMock }))
const fromMock = vi.fn(() => ({ insert: insertMock, update: updateMock }))
const sendPrelaunchWaitlistWelcomeEmailMock = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: fromMock,
  }),
}))

vi.mock('@/lib/prelaunch/waitlist-email', () => ({
  sendPrelaunchWaitlistWelcomeEmail: (...args: unknown[]) =>
    sendPrelaunchWaitlistWelcomeEmailMock(...args),
}))

import { POST } from '@/app/api/prelaunch/waitlist/route'
import { resetPrelaunchRequestGuardForTests } from '@/lib/prelaunch/request-guard'

describe('POST /api/prelaunch/waitlist', () => {
  beforeEach(() => {
    resetPrelaunchRequestGuardForTests()
    fromMock.mockClear()
    insertMock.mockReset()
    updateMock.mockClear()
    updateEqMock.mockReset()
    sendPrelaunchWaitlistWelcomeEmailMock.mockReset()
  })

  it('stores a qualified prelaunch waitlist signup', async () => {
    const singleMock = vi.fn().mockResolvedValueOnce({
      data: {
        id: 'waitlist-1',
        name: 'Jamie Hart',
        email: 'jamie@example.com',
      },
      error: null,
    })
    const selectMock = vi.fn(() => ({ single: singleMock }))
    insertMock.mockReturnValueOnce({ select: selectMock })
    sendPrelaunchWaitlistWelcomeEmailMock.mockResolvedValueOnce({
      status: 'sent',
      providerId: 'email-1',
    })
    updateEqMock.mockResolvedValueOnce({ error: null })

    const response = await POST(
      new Request('http://localhost/api/prelaunch/waitlist', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: 'Jamie Hart',
          email: 'jamie@example.com',
          phone: '303-555-0123',
          tiktokHandle: '@jamiehart',
          teamRepName: 'Lindsey',
          setupPain: 'Too many links and DMs',
          smsConsent: true,
          emailConsent: true,
        }),
      }),
    )

    expect(fromMock).toHaveBeenCalledWith('sparkle_suite_waitlist')
    expect(insertMock).toHaveBeenCalledWith({
      name: 'Jamie Hart',
      email: 'jamie@example.com',
      phone: '303-555-0123',
      tiktok_handle: '@jamiehart',
      team_rep_name: 'Lindsey',
      setup_pain: 'Too many links and DMs',
      sms_consent: true,
      email_consent: true,
      source: 'prelaunch_site',
    })
    expect(selectMock).toHaveBeenCalledWith('id, name, email')
    expect(sendPrelaunchWaitlistWelcomeEmailMock).toHaveBeenCalledWith({
      email: 'jamie@example.com',
      name: 'Jamie Hart',
    })
    expect(updateMock).toHaveBeenCalledWith({
      welcome_email_status: 'sent',
      welcome_email_provider_id: 'email-1',
      welcome_email_error: null,
      welcome_email_sent_at: expect.any(String),
    })
    expect(updateEqMock).toHaveBeenCalledWith('id', 'waitlist-1')
    expect(response.status).toBe(201)
    await expect(response.json()).resolves.toEqual({
      ok: true,
      welcomeEmail: { status: 'sent' },
    })
  })

  it('keeps the waitlist signup when the welcome email fails', async () => {
    const singleMock = vi.fn().mockResolvedValueOnce({
      data: {
        id: 'waitlist-1',
        name: 'Jamie Hart',
        email: 'jamie@example.com',
      },
      error: null,
    })
    insertMock.mockReturnValueOnce({
      select: vi.fn(() => ({ single: singleMock })),
    })
    sendPrelaunchWaitlistWelcomeEmailMock.mockResolvedValueOnce({
      status: 'failed',
      error: 'bad request',
    })
    updateEqMock.mockResolvedValueOnce({ error: null })

    const response = await POST(
      new Request('http://localhost/api/prelaunch/waitlist', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: 'Jamie Hart',
          email: 'jamie@example.com',
          phone: '303-555-0123',
          tiktokHandle: '@jamiehart',
          teamRepName: 'Lindsey',
          smsConsent: true,
          emailConsent: true,
        }),
      }),
    )

    expect(updateMock).toHaveBeenCalledWith({
      welcome_email_status: 'failed',
      welcome_email_provider_id: null,
      welcome_email_error: 'bad request',
      welcome_email_sent_at: null,
    })
    expect(response.status).toBe(201)
    await expect(response.json()).resolves.toEqual({
      ok: true,
      welcomeEmail: { status: 'failed' },
    })
  })

  it('records a skipped welcome email when resend is not configured', async () => {
    const singleMock = vi.fn().mockResolvedValueOnce({
      data: {
        id: 'waitlist-1',
        name: 'Jamie Hart',
        email: 'jamie@example.com',
      },
      error: null,
    })
    insertMock.mockReturnValueOnce({
      select: vi.fn(() => ({ single: singleMock })),
    })
    sendPrelaunchWaitlistWelcomeEmailMock.mockResolvedValueOnce({
      status: 'skipped',
      reason: 'resend_not_configured',
    })
    updateEqMock.mockResolvedValueOnce({ error: null })

    const response = await POST(
      new Request('http://localhost/api/prelaunch/waitlist', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: 'Jamie Hart',
          email: 'jamie@example.com',
          phone: '303-555-0123',
          tiktokHandle: '@jamiehart',
          teamRepName: 'Lindsey',
          smsConsent: true,
          emailConsent: true,
        }),
      }),
    )

    expect(updateMock).toHaveBeenCalledWith({
      welcome_email_status: 'skipped',
      welcome_email_provider_id: null,
      welcome_email_error: 'resend_not_configured',
      welcome_email_sent_at: null,
    })
    expect(response.status).toBe(201)
    await expect(response.json()).resolves.toEqual({
      ok: true,
      welcomeEmail: { status: 'skipped' },
    })
  })

  it('returns a validation error for missing email consent', async () => {
    const response = await POST(
      new Request('http://localhost/api/prelaunch/waitlist', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: 'Jamie Hart',
          email: 'jamie@example.com',
          phone: '303-555-0123',
          tiktokHandle: '@jamiehart',
          teamRepName: 'Lindsey',
          smsConsent: true,
          emailConsent: false,
        }),
      }),
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      code: 'INVALID_INPUT',
      error: 'Please agree to get launch updates by email.',
    })
  })

  it('stores an email-only waitlist signup without SMS consent', async () => {
    const singleMock = vi.fn().mockResolvedValueOnce({
      data: {
        id: 'waitlist-email-only',
        name: 'Jamie Hart',
        email: 'jamie@example.com',
      },
      error: null,
    })
    const selectMock = vi.fn(() => ({ single: singleMock }))
    insertMock.mockReturnValueOnce({ select: selectMock })
    sendPrelaunchWaitlistWelcomeEmailMock.mockResolvedValueOnce({
      status: 'skipped',
      reason: 'resend_not_configured',
    })
    updateEqMock.mockResolvedValueOnce({ error: null })

    const response = await POST(
      new Request('http://localhost/api/prelaunch/waitlist', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: 'Jamie Hart',
          email: 'jamie@example.com',
          phone: '',
          tiktokHandle: '@jamiehart',
          teamRepName: 'Lindsey',
          smsConsent: false,
          emailConsent: true,
        }),
      }),
    )

    expect(insertMock).toHaveBeenCalledWith({
      name: 'Jamie Hart',
      email: 'jamie@example.com',
      phone: null,
      tiktok_handle: '@jamiehart',
      team_rep_name: 'Lindsey',
      setup_pain: null,
      sms_consent: false,
      email_consent: true,
      source: 'prelaunch_site',
    })
    expect(response.status).toBe(201)
  })

  it('stores a name-and-email build-queue signup without optional TikTok or team-rep fields', async () => {
    const singleMock = vi.fn().mockResolvedValueOnce({
      data: {
        id: 'waitlist-name-email',
        name: 'TEST Lead',
        email: 'test@example.com',
      },
      error: null,
    })
    const selectMock = vi.fn(() => ({ single: singleMock }))
    insertMock.mockReturnValueOnce({ select: selectMock })
    sendPrelaunchWaitlistWelcomeEmailMock.mockResolvedValueOnce({
      status: 'skipped',
      reason: 'resend_not_configured',
    })
    updateEqMock.mockResolvedValueOnce({ error: null })

    const response = await POST(
      new Request('http://localhost/api/prelaunch/waitlist', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: 'TEST Lead',
          email: 'test@example.com',
          phone: '',
          tiktokHandle: '',
          teamRepName: '',
          smsConsent: false,
          emailConsent: true,
        }),
      }),
    )

    expect(fromMock).toHaveBeenCalledWith('sparkle_suite_waitlist')
    expect(insertMock).toHaveBeenCalledWith({
      name: 'TEST Lead',
      email: 'test@example.com',
      phone: null,
      tiktok_handle: null,
      team_rep_name: null,
      setup_pain: null,
      sms_consent: false,
      email_consent: true,
      source: 'prelaunch_site',
    })
    expect(response.status).toBe(201)
  })

  it('rejects a bot-trap submission before writing to the waitlist', async () => {
    const response = await POST(
      new Request('http://localhost/api/prelaunch/waitlist', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': '198.51.100.8',
        },
        body: JSON.stringify({
          name: 'Jamie Hart',
          email: 'jamie@example.com',
          phone: '303-555-0123',
          tiktokHandle: '@jamiehart',
          teamRepName: 'Lindsey',
          website: 'https://spam.example',
          smsConsent: true,
          emailConsent: true,
        }),
      }),
    )

    expect(insertMock).not.toHaveBeenCalled()
    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      code: 'SPAM_SUBMISSION',
      error: 'Submission could not be saved.',
    })
  })

  it('rate limits rapid repeat waitlist submissions from one address', async () => {
    const buildRequest = () =>
      new Request('http://localhost/api/prelaunch/waitlist', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': '203.0.113.22',
        },
        body: JSON.stringify({
          name: 'Jamie Hart',
          email: 'jamie@example.com',
          phone: '303-555-0123',
          tiktokHandle: '@jamiehart',
          teamRepName: 'Lindsey',
          smsConsent: true,
          emailConsent: true,
        }),
      })

    for (let index = 0; index < 5; index += 1) {
      const singleMock = vi.fn().mockResolvedValueOnce({
        data: {
          id: `waitlist-${index}`,
          name: 'Jamie Hart',
          email: 'jamie@example.com',
        },
        error: null,
      })
      insertMock.mockReturnValueOnce({
        select: vi.fn(() => ({ single: singleMock })),
      })
      sendPrelaunchWaitlistWelcomeEmailMock.mockResolvedValueOnce({
        status: 'skipped',
        reason: 'not configured',
      })
      updateEqMock.mockResolvedValueOnce({ error: null })

      expect((await POST(buildRequest())).status).toBe(201)
    }

    const response = await POST(buildRequest())

    expect(response.status).toBe(429)
    await expect(response.json()).resolves.toEqual({
      code: 'RATE_LIMITED',
      error: 'Please wait a minute and try again.',
    })
  })

  it('returns 500 when the insert fails', async () => {
    const singleMock = vi.fn().mockResolvedValueOnce({
      data: null,
      error: new Error('database unavailable'),
    })
    insertMock.mockReturnValueOnce({
      select: vi.fn(() => ({ single: singleMock })),
    })

    const response = await POST(
      new Request('http://localhost/api/prelaunch/waitlist', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: 'Jamie Hart',
          email: 'jamie@example.com',
          phone: '303-555-0123',
          tiktokHandle: '@jamiehart',
          teamRepName: 'Lindsey',
          smsConsent: true,
          emailConsent: true,
        }),
      }),
    )

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({
      error: 'Failed to save your waitlist spot right now.',
    })
  })
})
