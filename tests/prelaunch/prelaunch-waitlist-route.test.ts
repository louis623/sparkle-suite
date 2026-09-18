import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const insertMock = vi.fn()
const updateEqMock = vi.fn()
const updateMock = vi.fn(() => ({ eq: updateEqMock }))
const fromMock = vi.fn(() => ({ insert: insertMock, update: updateMock }))
const afterMock = vi.fn()

vi.mock('next/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/server')>()
  return {
    ...actual,
    after: (...args: unknown[]) => afterMock(...args),
  }
})

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: fromMock,
  }),
}))

import { POST } from '@/app/api/prelaunch/waitlist/route'
import { PRELAUNCH_WAITLIST_WELCOME_EMAIL_SKIP_REASON } from '@/lib/prelaunch/waitlist-email'
import { resetBuildListWebhookConfigLogForTests } from '@/lib/prelaunch/build-list-webhook'
import { resetPrelaunchRequestGuardForTests } from '@/lib/prelaunch/request-guard'

const originalWebhookUrl = process.env.BUILD_LIST_WEBHOOK_URL
const originalWebhookKey = process.env.BUILD_LIST_WEBHOOK_KEY

function restoreWebhookEnv() {
  if (originalWebhookUrl === undefined) {
    delete process.env.BUILD_LIST_WEBHOOK_URL
  } else {
    process.env.BUILD_LIST_WEBHOOK_URL = originalWebhookUrl
  }
  if (originalWebhookKey === undefined) {
    delete process.env.BUILD_LIST_WEBHOOK_KEY
  } else {
    process.env.BUILD_LIST_WEBHOOK_KEY = originalWebhookKey
  }
}

function mockSuccessfulInsert(data: {
  id: string
  name: string
  email: string
  created_at?: string
}) {
  const singleMock = vi.fn().mockResolvedValueOnce({
    data,
    error: null,
  })
  const selectMock = vi.fn(() => ({ single: singleMock }))
  insertMock.mockReturnValueOnce({ select: selectMock })
  return selectMock
}

describe('POST /api/prelaunch/waitlist', () => {
  beforeEach(() => {
    resetPrelaunchRequestGuardForTests()
    resetBuildListWebhookConfigLogForTests()
    fromMock.mockClear()
    insertMock.mockReset()
    updateMock.mockClear()
    updateEqMock.mockReset()
    afterMock.mockReset()
    delete process.env.BUILD_LIST_WEBHOOK_URL
    delete process.env.BUILD_LIST_WEBHOOK_KEY
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    restoreWebhookEnv()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('stores a qualified prelaunch waitlist signup without sending a welcome email', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
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
    expect(selectMock).toHaveBeenCalledWith('id, name, email, created_at')
    expect(fetchMock).not.toHaveBeenCalled()
    expect(updateMock).toHaveBeenCalledWith({
      welcome_email_status: 'skipped',
      welcome_email_provider_id: null,
      welcome_email_error: PRELAUNCH_WAITLIST_WELCOME_EMAIL_SKIP_REASON,
      welcome_email_sent_at: null,
    })
    expect(updateEqMock).toHaveBeenCalledWith('id', 'waitlist-1')
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
    expect(afterMock).not.toHaveBeenCalled()
  })

  it('schedules a build-list webhook after a successful signup', async () => {
    process.env.BUILD_LIST_WEBHOOK_URL = 'https://bot.example.test/build-list'
    process.env.BUILD_LIST_WEBHOOK_KEY = 'test-build-list-key'
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    })
    vi.stubGlobal('fetch', fetchMock)

    mockSuccessfulInsert({
      id: 'waitlist-webhook-1',
      name: 'Jamie Hart',
      email: 'jamie@example.com',
      created_at: '2026-09-18T20:00:00.000Z',
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
          tiktokHandle: '',
          teamRepName: '',
          smsConsent: false,
          emailConsent: true,
        }),
      }),
    )

    expect(response.status).toBe(201)
    await expect(response.json()).resolves.toEqual({
      ok: true,
      welcomeEmail: { status: 'skipped' },
    })
    expect(updateMock).toHaveBeenCalledWith({
      welcome_email_status: 'skipped',
      welcome_email_provider_id: null,
      welcome_email_error: PRELAUNCH_WAITLIST_WELCOME_EMAIL_SKIP_REASON,
      welcome_email_sent_at: null,
    })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(afterMock).toHaveBeenCalledTimes(1)

    await afterMock.mock.calls[0][0]()

    expect(fetchMock).toHaveBeenCalledWith(
      'https://bot.example.test/build-list',
      {
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-build-list-key',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event: 'build_list_signup',
          leadId: 'waitlist-webhook-1',
          name: 'Jamie Hart',
          email: 'jamie@example.com',
          shopName: null,
          source: 'prelaunch_site',
          createdAt: '2026-09-18T20:00:00.000Z',
        }),
      },
    )
  })

  it('keeps the 201 signup response when the build-list webhook fails', async () => {
    process.env.BUILD_LIST_WEBHOOK_URL = 'https://bot.example.test/build-list'
    process.env.BUILD_LIST_WEBHOOK_KEY = 'test-build-list-key'
    const fetchMock = vi.fn().mockRejectedValue(new Error('webhook down'))
    vi.stubGlobal('fetch', fetchMock)
    const errorSpy = vi.mocked(console.error)

    mockSuccessfulInsert({
      id: 'waitlist-webhook-2',
      name: 'Jamie Hart',
      email: 'jamie@example.com',
      created_at: '2026-09-18T20:01:00.000Z',
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
          tiktokHandle: '',
          teamRepName: '',
          smsConsent: false,
          emailConsent: true,
        }),
      }),
    )

    expect(response.status).toBe(201)
    await expect(response.json()).resolves.toEqual({
      ok: true,
      welcomeEmail: { status: 'skipped' },
    })

    await expect(afterMock.mock.calls[0][0]()).resolves.toBeUndefined()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(errorSpy).toHaveBeenCalledWith(
      '[prelaunch/waitlist] Build-list webhook failed.',
    )
    expect(
      errorSpy.mock.calls.flat().every((value) => {
        return typeof value !== 'string' || !value.includes('test-build-list-key')
      }),
    ).toBe(true)
  })
})
