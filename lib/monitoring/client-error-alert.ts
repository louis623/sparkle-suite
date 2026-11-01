import 'server-only'
import { createHash } from 'node:crypto'
import { getResendConfig } from '@/lib/resend/config'
import { PRELAUNCH_WAITLIST_OWNER_ALERT_EMAIL } from '@/lib/prelaunch/waitlist-owner-alert'
import { sanitizeClientError } from './client-error-payload'

export const CLIENT_ALERT_DAILY_CAP = 10
const quietSlots = new Map<number, number>()
const DAY = 86_400_000

export async function alertClientError(input: Record<string, unknown>) {
  if (process.env.CLIENT_ERROR_ALERTS !== 'on') return 'disabled'
  const config = getResendConfig()
  if (!config) return 'unconfigured'
  // Never trust a browser-provided deployment ID for rate-limit scope.
  const deployment = process.env.VERCEL_DEPLOYMENT_ID || process.env.VERCEL_GIT_COMMIT_SHA || 'local'
  const diagnostic = sanitizeClientError(input)
  const fingerprint = createHash('sha256').update(JSON.stringify(diagnostic)).digest('hex')
  const slot = parseInt(fingerprint.slice(0, 8), 16) % CLIENT_ALERT_DAILY_CAP
  const now = Date.now()
  if (now - (quietSlots.get(slot) ?? 0) < DAY) return 'suppressed'
  // Bound logs and provider calls within each warm instance, including concurrent requests.
  quietSlots.set(slot, now)
  console.error('[client-error]', { deployment, fingerprint, ...diagnostic })
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        // Ten fixed deployment slots. Resend retains keys for 24h across instances.
        // Collisions deliberately suppress another fingerprint: a strict bounded budget.
        'Idempotency-Key': `client-error/${deployment}/${slot}`,
      },
      body: JSON.stringify({
        from: config.RESEND_FROM_EMAIL,
        to: [PRELAUNCH_WAITLIST_OWNER_ALERT_EMAIL],
        subject: 'Sparkle Suite browser error',
        text: JSON.stringify({ deployment, fingerprint, ...diagnostic }, null, 2),
      }),
      signal: AbortSignal.timeout(5000),
    })
    if (response.status === 409) return 'suppressed'
    if (!response.ok) throw new Error('Alert provider rejected request')
    return response.headers.get('idempotent-replayed') === 'true' ? 'suppressed' : 'sent'
  } catch {
    // Keep this instance quiet even on ambiguous timeouts; never retry without the same key.
    console.error('[client-error] Owner alert unavailable')
    return 'unavailable'
  }
}
