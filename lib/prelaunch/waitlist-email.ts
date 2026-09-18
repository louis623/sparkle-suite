import { getResendConfig, isResendEnabled } from '@/lib/resend/config'
import type { SparkleSuitePrelaunchEmailContent } from '@/lib/prelaunch/email-content'

export const PRELAUNCH_WAITLIST_WELCOME_EMAIL_SKIP_REASON =
  'nic_nac_first_touch_owns_outreach' as const

export type PrelaunchWaitlistWelcomeEmailSkipReason =
  | 'resend_not_configured'
  | typeof PRELAUNCH_WAITLIST_WELCOME_EMAIL_SKIP_REASON

export type PrelaunchWaitlistWelcomeEmailResult =
  | { status: 'sent'; providerId: string }
  | { status: 'skipped'; reason: PrelaunchWaitlistWelcomeEmailSkipReason }
  | { status: 'failed'; error: string }

export function skipPrelaunchWaitlistWelcomeEmail(): Extract<
  PrelaunchWaitlistWelcomeEmailResult,
  { status: 'skipped' }
> {
  return {
    status: 'skipped',
    reason: PRELAUNCH_WAITLIST_WELCOME_EMAIL_SKIP_REASON,
  }
}

export interface PrelaunchWaitlistWelcomeEmailInput {
  email: string
  name: string
}

function getResendErrorMessage(payload: unknown) {
  if (
    payload &&
    typeof payload === 'object' &&
    'message' in payload &&
    typeof payload.message === 'string'
  ) {
    return payload.message
  }

  if (
    payload &&
    typeof payload === 'object' &&
    'error' in payload &&
    typeof payload.error === 'string'
  ) {
    return payload.error
  }

  return null
}

export async function sendPrelaunchEmail(input: {
  email: string
  content: SparkleSuitePrelaunchEmailContent
}): Promise<PrelaunchWaitlistWelcomeEmailResult> {
  if (!isResendEnabled()) {
    return { status: 'skipped', reason: 'resend_not_configured' }
  }

  const resendConfig = getResendConfig()
  if (!resendConfig) {
    return { status: 'skipped', reason: 'resend_not_configured' }
  }

  const recipientEmail = input.email.trim().toLowerCase()

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendConfig.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: resendConfig.RESEND_FROM_EMAIL,
        to: [recipientEmail],
        subject: input.content.subject,
        text: input.content.text,
      }),
    })

    const payload = (await response.json().catch(() => null)) as
      | { id?: string; message?: string; error?: string }
      | null

    if (!response.ok || !payload?.id) {
      return {
        status: 'failed',
        error: getResendErrorMessage(payload) ?? 'Unknown Resend error',
      }
    }

    return { status: 'sent', providerId: payload.id }
  } catch (error) {
    return {
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown Resend error',
    }
  }
}

export async function sendPrelaunchWaitlistWelcomeEmail(
  _input: PrelaunchWaitlistWelcomeEmailInput,
): Promise<PrelaunchWaitlistWelcomeEmailResult> {
  // Signup confirmation is owned by Nic-Nac Phase 1 first-touch.
  // The Suite must not email the lead from the public waitlist path.
  return skipPrelaunchWaitlistWelcomeEmail()
}
