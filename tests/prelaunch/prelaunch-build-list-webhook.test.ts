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
        created_at: '2026-09-18T20:00:00.000Z',
      }),
    ).toEqual({
      event: 'build_list_signup',
      leadId: 'lead-1',
      name: 'Jamie Hart',
      email: 'jamie@example.com',
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
        status: 503,
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
      '[prelaunch/waitlist] Build-list webhook failed: 503',
    )
    expect(
      JSON.stringify(errorSpy.mock.calls).includes('test-build-list-key'),
    ).toBe(false)
  })
})
