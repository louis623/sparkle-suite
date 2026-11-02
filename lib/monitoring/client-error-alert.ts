import 'server-only'
import { createHash } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { getResendConfig } from '@/lib/resend/config'
import { PRELAUNCH_WAITLIST_OWNER_ALERT_EMAIL } from '@/lib/prelaunch/waitlist-owner-alert'
import { sanitizeClientError } from './client-error-payload'

export const CLIENT_ALERT_DAILY_CAP = 20
export const CLIENT_ALERT_HOUR_MS = 3_600_000

type Source = { file: string; line: number }
type Admission = { allowed: boolean; batchId?: string; schedule?: boolean; delayMs?: number }
type Reservation = { reservationId: string; fingerprint: string; repeatCount: number; diagnostic: Record<string, unknown> }

export function clientErrorFingerprint(messageHash: string, source: Source) {
  return createHash('sha256').update(JSON.stringify([messageHash, source.file, source.line])).digest('hex')
}

export async function enqueueClientError(input: Record<string, unknown>, ipHash: string, source: Source): Promise<Admission> {
  if (process.env.CLIENT_ERROR_ALERTS !== 'on' || !getResendConfig()) return { allowed: false }
  const sanitized = sanitizeClientError(input)
  const diagnostic = {
    message: sanitized.message, sourceFile: source.file, sourceLine: source.line,
    path: sanitized.path, userAgent: sanitized.userAgent,
    deployment: process.env.VERCEL_DEPLOYMENT_ID || process.env.VERCEL_GIT_COMMIT_SHA || 'local',
  }
  const { data, error } = await createAdminClient().rpc('ss_admit_client_error', {
    p_ip_hash: ipHash,
    p_fingerprint: clientErrorFingerprint(input.messageHash as string, source),
    p_diagnostic: diagnostic,
  })
  if (error) throw new Error('Monitoring admission unavailable')
  return data as Admission
}

export async function deliverClientErrorBatch(batchId: string, delayMs: number) {
  if (process.env.CLIENT_ERROR_ALERTS !== 'on') return
  // The first worker waits until its entire IP window can be classified.
  // Excess reports never reserve an email slot, including the first ten in a flood.
  await new Promise(resolve => setTimeout(resolve, Math.min(61_000, Math.max(0, delayMs))))
  if (process.env.CLIENT_ERROR_ALERTS !== 'on') return
  const config = getResendConfig()
  if (!config) return
  const { data, error } = await createAdminClient().rpc('ss_claim_client_error_batch', { p_batch_id: batchId })
  if (error) throw new Error('Monitoring claim unavailable')
  for (const reservation of (data ?? []) as Reservation[]) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + config.RESEND_API_KEY,
          'Content-Type': 'application/json',
          'Idempotency-Key': 'client-error/' + reservation.reservationId,
        },
        body: JSON.stringify({
          from: config.RESEND_FROM_EMAIL,
          to: [PRELAUNCH_WAITLIST_OWNER_ALERT_EMAIL],
          subject: 'Sparkle Suite browser error',
          text: JSON.stringify({ ...reservation.diagnostic, fingerprint: reservation.fingerprint,
            repeatsSincePreviousAlert: reservation.repeatCount }, null, 2),
        }),
        signal: AbortSignal.timeout(5000),
      })
      if (!response.ok && response.status !== 409) throw new Error('Provider rejected alert')
    } catch {
      // Keep the reservation after an uncertain provider result. Never reset
      // the hourly/global budget or retry with a new idempotency key.
      console.error('[client-error] Owner alert unavailable')
    }
  }
}
