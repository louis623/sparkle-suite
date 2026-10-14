import { after } from 'next/server'

import type { BuildListSignupWebhookPayload } from '@/lib/prelaunch/build-list-webhook'
import { getResendConfig, isResendEnabled } from '@/lib/resend/config'

/** Owner inbox only. The public waitlist path must never email the lead. */
export const PRELAUNCH_WAITLIST_OWNER_ALERT_EMAIL = 'louis@neonrabbit.net'

function display(value: string | null | undefined) {
  return value && value.trim() ? value.trim() : '(none)'
}

export function buildPrelaunchWaitlistOwnerAlert(
  payload: BuildListSignupWebhookPayload,
) {
  const text = [
    'New Sparkle Suite build-list signup.',
    '',
    `Lead ID: ${payload.leadId}`,
    `Name: ${display(payload.name)}`,
    `Email: ${display(payload.email)}`,
    `Phone: ${display(payload.phone)}`,
    `TikTok: ${display(payload.tiktokHandle)}`,
    `Team rep: ${display(payload.teamRepName)}`,
    `Setup needs: ${display(payload.setupPain)}`,
    `SMS consent: ${payload.smsConsent ? 'yes' : 'no'}`,
    `Email consent: ${payload.emailConsent ? 'yes' : 'no'}`,
    `Shop name: ${display(payload.shopName)}`,
    `Source: ${display(payload.source)}`,
    `Created: ${display(payload.createdAt)}`,
  ].join('\n')

  return {
    fromEnv: 'RESEND_FROM_EMAIL' as const,
    to: [PRELAUNCH_WAITLIST_OWNER_ALERT_EMAIL],
    subject: `Build-list signup: ${payload.name}`,
    text,
  }
}

async function readResponseBody(response: { text?: () => Promise<string> }) {
  try {
    if (typeof response.text !== 'function') return ''
    return (await response.text()).slice(0, 2000)
  } catch {
    return ''
  }
}

export async function sendPrelaunchWaitlistOwnerAlert(
  payload: BuildListSignupWebhookPayload,
) {
  const alert = buildPrelaunchWaitlistOwnerAlert(payload)
  if (
    alert.to.length !== 1 ||
    alert.to[0] !== PRELAUNCH_WAITLIST_OWNER_ALERT_EMAIL
  ) {
    throw new Error('Owner alert recipient must stay the owner inbox.')
  }

  if (!isResendEnabled()) {
    console.warn(
      '[prelaunch/waitlist] Owner alert skipped because Resend is not configured.',
    )
    return
  }

  const resendConfig = getResendConfig()
  if (!resendConfig) {
    console.warn(
      '[prelaunch/waitlist] Owner alert skipped because Resend is not configured.',
    )
    return
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendConfig.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: resendConfig.RESEND_FROM_EMAIL,
      to: alert.to,
      subject: alert.subject,
      text: alert.text,
    }),
  })

  const body = await readResponseBody(response)
  let providerId: string | null = null
  try {
    const parsed = body ? (JSON.parse(body) as { id?: unknown }) : null
    providerId = typeof parsed?.id === 'string' ? parsed.id : null
  } catch {
    providerId = null
  }

  if (!response.ok || !providerId) {
    throw new Error(`Owner alert failed: ${response.status} ${body}`)
  }
}

export function notifyPrelaunchWaitlistOwnerAfterResponse(
  payload: BuildListSignupWebhookPayload,
) {
  try {
    after(async () => {
      try {
        await sendPrelaunchWaitlistOwnerAlert(payload)
      } catch (error) {
        console.error('[prelaunch/waitlist] Owner alert failed.', error)
      }
    })
  } catch (error) {
    console.error('[prelaunch/waitlist] Owner alert schedule failed.', error)
  }
}
