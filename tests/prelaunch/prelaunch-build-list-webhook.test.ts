import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const afterMock = vi.fn()

vi.mock('next/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/server')>()
  return {
    ...actual,
    after: (...args: unknown[]) => afterMock(...args),
  }
})

import {
  buildBuildListSignupWebhookPayload,
  notifyBuildListSignupAfterResponse,
  resetBuildListWebhookConfigLogForTests,
} from '@/lib/prelaunch/build-list-webhook'

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

describe('build-list webhook notify', () => {
  beforeEach(() => {
    resetBuildListWebhookConfigLogForTests()
    afterMock.mockReset()
    delete process.env.BUILD_LIST_WEBHOOK_URL
    delete process.env.BUILD_LIST_WEBHOOK_KEY
  })

  afterEach(() => {
    restoreWebhookEnv()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('builds the signup payload from the inserted waitlist row', () => {
    expect(
      buildBuildListSignupWebhookPayload({
        id: 'lead-1',
        name: 'Jamie Hart',
        email: 'jamie@example.com',
        phone: '303-555-0123',
        tiktok_handle: '@jamiehart',
        team_rep_name: 'Lindsey',
        setup_pain: 'Too many links and DMs',
        sms_consent: true,
        email_consent: true,
        source: 'prelaunch_site?src=tiktok&campaign=october_dms',
        created_at: '2026-09-18T20:00:00.000Z',
      }),
    ).toEqual({
      event: 'build_list_signup',
      leadId: 'lead-1',
      name: 'Jamie Hart',
      email: 'jamie@example.com',
      phone: '303-555-0123',
      tiktokHandle: '@jamiehart',
      teamRepName: 'Lindsey',
      setupPain: 'Too many links and DMs',
      smsConsent: true,
      emailConsent: true,
      shopName: null,
      source: 'prelaunch_site?src=tiktok&campaign=october_dms',
      createdAt: '2026-09-18T20:00:00.000Z',
    })
  })

  it('keeps the original webhook keys when optional signup columns are absent', () => {
    expect(
      buildBuildListSignupWebhookPayload({
        id: 'lead-1',
        name: 'Jamie Hart',
        email: 'jamie@example.com',
        created_at: '2026-09-18T20:00:00.000Z',
      }),
    ).toEqual({
      event: 'build_list_signup',
      leadId: 'lead-1',
      name: 'Jamie Hart',
      email: 'jamie@example.com',
      phone: null,
      tiktokHandle: null,
      teamRepName: null,
      setupPain: null,
      smsConsent: false,
      emailConsent: false,
      shopName: null,
      source: 'prelaunch_site',
      createdAt: '2026-09-18T20:00:00.000Z',
    })
  })

  it('logs once and skips when the webhook env vars are not both set', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    process.env.BUILD_LIST_WEBHOOK_URL = 'https://bot.example.test/build-list'
    notifyBuildListSignupAfterResponse(
      buildBuildListSignupWebhookPayload({
        id: 'lead-1',
        name: 'Jamie Hart',
        email: 'jamie@example.com',
        created_at: '2026-09-18T20:00:00.000Z',
      }),
    )
    notifyBuildListSignupAfterResponse(
      buildBuildListSignupWebhookPayload({
        id: 'lead-2',
        name: 'Jamie Hart',
        email: 'jamie@example.com',
        created_at: '2026-09-18T20:01:00.000Z',
      }),
    )

    expect(afterMock).not.toHaveBeenCalled()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(warnSpy).toHaveBeenCalledTimes(1)
    expect(warnSpy).toHaveBeenCalledWith(
      '[prelaunch/waitlist] Build-list webhook skipped because BUILD_LIST_WEBHOOK_URL and BUILD_LIST_WEBHOOK_KEY are not both set.',
    )
  })

  it('does not throw when the deferred webhook request fails', async () => {
    process.env.BUILD_LIST_WEBHOOK_URL = 'https://bot.example.test/build-list'
    process.env.BUILD_LIST_WEBHOOK_KEY = 'test-build-list-key'
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => '{"error":"phone is required"}',
      }),
    )
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    notifyBuildListSignupAfterResponse(
      buildBuildListSignupWebhookPayload({
        id: 'lead-1',
        name: 'Jamie Hart',
        email: 'jamie@example.com',
        created_at: '2026-09-18T20:00:00.000Z',
      }),
    )

    await expect(afterMock.mock.calls[0][0]()).resolves.toBeUndefined()
    expect(errorSpy).toHaveBeenCalledWith(
      '[prelaunch/waitlist] Build-list webhook failed: 400',
      '{"error":"phone is required"}',
    )
    expect(
      JSON.stringify(errorSpy.mock.calls).includes('test-build-list-key'),
    ).toBe(false)
  })
})
