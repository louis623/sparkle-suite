import { beforeEach, describe, expect, it, vi } from 'vitest'

const getResendConfigMock = vi.fn()
const isResendEnabledMock = vi.fn()

vi.mock('@/lib/resend/config', () => ({
  getResendConfig: () => getResendConfigMock(),
  isResendEnabled: () => isResendEnabledMock(),
}))

import {
  PRELAUNCH_WAITLIST_WELCOME_EMAIL_SKIP_REASON,
  sendPrelaunchEmail,
  sendPrelaunchWaitlistWelcomeEmail,
  skipPrelaunchWaitlistWelcomeEmail,
} from '@/lib/prelaunch/waitlist-email'

describe('sendPrelaunchWaitlistWelcomeEmail', () => {
  beforeEach(() => {
    getResendConfigMock.mockReset()
    isResendEnabledMock.mockReset()
    vi.stubGlobal('fetch', vi.fn())
  })

  it('skips signup confirmation because Nic-Nac first-touch owns outreach', async () => {
    isResendEnabledMock.mockReturnValue(true)
    getResendConfigMock.mockReturnValue({
      RESEND_API_KEY: 'rk_test',
      RESEND_FROM_EMAIL: 'updates@neonrabbit.net',
    })

    await expect(
      sendPrelaunchWaitlistWelcomeEmail({
        email: 'jamie@example.com',
        name: 'Jamie Hart',
      }),
    ).resolves.toEqual({
      status: 'skipped',
      reason: PRELAUNCH_WAITLIST_WELCOME_EMAIL_SKIP_REASON,
    })
    expect(isResendEnabledMock).not.toHaveBeenCalled()
    expect(getResendConfigMock).not.toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('records a skipped welcome-email result for waitlist signup', () => {
    expect(skipPrelaunchWaitlistWelcomeEmail()).toEqual({
      status: 'skipped',
      reason: PRELAUNCH_WAITLIST_WELCOME_EMAIL_SKIP_REASON,
    })
  })
})

describe('sendPrelaunchEmail', () => {
  beforeEach(() => {
    getResendConfigMock.mockReset()
    isResendEnabledMock.mockReset()
    vi.stubGlobal('fetch', vi.fn())
  })

  it('skips without failing when Resend is not configured', async () => {
    isResendEnabledMock.mockReturnValueOnce(false)

    await expect(
      sendPrelaunchEmail({
        email: 'jamie@example.com',
        content: {
          subject: 'Next step for your Sparkle Suite consult',
          text: 'Please choose a consult time.',
        },
      }),
    ).resolves.toEqual({
      status: 'skipped',
      reason: 'resend_not_configured',
    })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('sends operator-owned prelaunch email through Resend', async () => {
    isResendEnabledMock.mockReturnValueOnce(true)
    getResendConfigMock.mockReturnValueOnce({
      RESEND_API_KEY: 'rk_test',
      RESEND_FROM_EMAIL: 'updates@neonrabbit.net',
    })
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ id: 'email_123' }), { status: 200 }),
    )

    await expect(
      sendPrelaunchEmail({
        email: 'JAMIE@EXAMPLE.COM',
        content: {
          subject: 'Next step for your Sparkle Suite consult',
          text: 'Please choose a consult time.',
        },
      }),
    ).resolves.toEqual({
      status: 'sent',
      providerId: 'email_123',
    })

    expect(fetch).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({
        method: 'POST',
        headers: {
          Authorization: 'Bearer rk_test',
          'Content-Type': 'application/json',
        },
      }),
    )
    const [, options] = vi.mocked(fetch).mock.calls[0]
    expect(JSON.parse(String(options?.body))).toEqual({
      from: 'updates@neonrabbit.net',
      to: ['jamie@example.com'],
      subject: 'Next step for your Sparkle Suite consult',
      text: 'Please choose a consult time.',
    })
  })

  it('returns a failed status when Resend rejects the send', async () => {
    isResendEnabledMock.mockReturnValueOnce(true)
    getResendConfigMock.mockReturnValueOnce({
      RESEND_API_KEY: 'rk_test',
      RESEND_FROM_EMAIL: 'updates@neonrabbit.net',
    })
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'bad request' }), {
        status: 400,
      }),
    )

    await expect(
      sendPrelaunchEmail({
        email: 'jamie@example.com',
        content: {
          subject: 'Next step for your Sparkle Suite consult',
          text: 'Please choose a consult time.',
        },
      }),
    ).resolves.toEqual({
      status: 'failed',
      error: 'bad request',
    })
  })
})
