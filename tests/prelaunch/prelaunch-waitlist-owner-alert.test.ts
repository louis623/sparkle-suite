import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const afterMock = vi.fn()
const getResendConfigMock = vi.fn()
const isResendEnabledMock = vi.fn()

vi.mock('next/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/server')>()
  return {
    ...actual,
    after: (...args: unknown[]) => afterMock(...args),
  }
})

vi.mock('@/lib/resend/config', () => ({
  getResendConfig: () => getResendConfigMock(),
  isResendEnabled: () => isResendEnabledMock(),
}))

import { buildBuildListSignupWebhookPayload } from '@/lib/prelaunch/build-list-webhook'
import { notifyPrelaunchWaitlistOwnerAfterResponse } from '@/lib/prelaunch/waitlist-owner-alert'

const signup = buildBuildListSignupWebhookPayload({
  id: 'lead-1',
  name: 'Jamie Hart',
  email: 'jamie@example.com',
  phone: '303-555-0123',
  tiktok_handle: '@jamiehart',
  team_rep_name: 'Lindsey',
  setup_pain: 'Too many links and DMs',
  sms_consent: true,
  email_consent: true,
  source: 'prelaunch_site',
  created_at: '2026-10-14T14:06:45.000Z',
})

describe('prelaunch waitlist owner alert', () => {
  beforeEach(() => {
    afterMock.mockReset()
    getResendConfigMock.mockReset()
    isResendEnabledMock.mockReset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('does not throw when the owner alert fails, and it never addresses the lead', async () => {
    isResendEnabledMock.mockReturnValue(true)
    getResendConfigMock.mockReturnValue({
      RESEND_API_KEY: 'rk_test_owner_alert',
      RESEND_FROM_EMAIL: 'Sparkle Suite <notifications@yoursparklesuite.com>',
    })
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      text: async () => '{"message":"sandbox rejected"}',
    })
    vi.stubGlobal('fetch', fetchMock)
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    notifyPrelaunchWaitlistOwnerAfterResponse(signup)

    await expect(afterMock.mock.calls[0][0]()).resolves.toBeUndefined()

    const [, options] = fetchMock.mock.calls[0]
    const body = JSON.parse(String(options?.body))
    expect(body.from).toBe('Sparkle Suite <notifications@yoursparklesuite.com>')
    expect(body.to).toEqual(['louis@neonrabbit.net'])
    expect(body.to).not.toContain(signup.email)
    expect(body.text).toContain(signup.email)
    expect(body.text).toContain(signup.phone)
    expect(body.text).toContain(signup.tiktokHandle)
    expect(body.text).toContain(signup.teamRepName)
    expect(body.text).toContain(signup.setupPain)
    expect(body.text).toContain('SMS consent: yes')
    expect(body.text).toContain('Email consent: yes')
    const logged = errorSpy.mock.calls
      .flat()
      .map((value) => (value instanceof Error ? value.message : String(value)))
      .join('\n')
    expect(logged).toContain('502')
    expect(logged).toContain('sandbox rejected')
    expect(logged).not.toContain('rk_test_owner_alert')
  })
})