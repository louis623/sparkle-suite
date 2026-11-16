import 'server-only'
import { createHmac } from 'node:crypto'
import { getResendConfig } from '@/lib/resend/config'
import { MONITOR_OWNER_EMAIL } from './monitor'

export type MonitorDelivery = {
  id: string; incident_id: string | null; rep_id: string | null;
  kind: 'incident' | 'recovery' | 'adoption'; channel: 'email' | 'webhook';
  payload: {subject: string; text: string; event: Record<string, unknown>};
  attempt_count: number; created_at: string;
}
export function monitorConfiguration(env: NodeJS.ProcessEnv = process.env) {
  const monitoring = env.LIVE_LINEUP_MONITOR_ENABLED === 'true'
  const production = env.VERCEL_ENV === 'production' && env.SPARKLE_ENVIRONMENT !== 'smoke'
  const delivery = monitoring && production && env.LIVE_LINEUP_ALERT_DELIVERY_ENABLED === 'true'
  const email = Boolean(env.RESEND_API_KEY?.trim() && env.RESEND_FROM_EMAIL?.trim())
  let hook = false
  try {
    const url = new URL(env.LIVE_LINEUP_ALERT_WEBHOOK_URL ?? '')
    // Server-selected HTTPS destination only. No redirect/auth leakage or private literal destinations.
    hook = url.protocol === 'https:' && !url.username && !url.password && !url.hash
      && url.port === '' && !/^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[)/i.test(url.hostname)
      && url.hostname.includes('.') && !url.hostname.endsWith('.local')
      && Boolean(env.LIVE_LINEUP_ALERT_WEBHOOK_SECRET?.trim())
  } catch {}
  return {monitoring, delivery, emailConfigured: email, webhookConfigured: hook,
    emailStatus: !delivery ? 'disabled' : email ? 'configured_unverified' : 'not_configured',
    externalWatchHookStatus: !delivery ? 'disabled' : hook ? 'configured_unverified' : 'not_configured',
    // Configuration readiness for the required Vercel cron -> email path; not delivery proof.
    ready: delivery && email,
    disabledReason: !monitoring ? 'monitor_disabled' : !production ? 'external_delivery_requires_production'
      : !delivery ? 'delivery_disabled' : null}
}

/** Provider acceptance is not proof of mailbox delivery. The ledger keeps that distinction. */
export async function deliverMonitorJob(job: MonitorDelivery, fetchImpl: typeof fetch = fetch): Promise<string> {
  const status = monitorConfiguration()
  if (!status.delivery) throw new Error('delivery_disabled')
  if (job.channel === 'email') {
    const config = getResendConfig()
    if (!config) throw new Error('email_not_configured')
    const response = await fetchImpl('https://api.resend.com/emails', {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(5000),
      headers: {Authorization: `Bearer ${config.RESEND_API_KEY}`, 'Content-Type': 'application/json',
        'Idempotency-Key': `live-lineup/${job.id}`},
      body: JSON.stringify({from: config.RESEND_FROM_EMAIL, to: [MONITOR_OWNER_EMAIL], subject: job.payload.subject, text: job.payload.text}),
    })
    const body = await boundedProviderJson(response) as {id?: unknown} | null
    if (!response.ok || typeof body?.id !== 'string' || !/^[a-zA-Z0-9_-]{1,200}$/.test(body.id)) throw new Error(`email_provider_${response.status}`)
    return body.id
  }
  if (!status.webhookConfigured) throw new Error('webhook_not_configured')
  const body = JSON.stringify({eventId: job.id, ...job.payload.event})
  const timestamp = String(Math.floor(Date.now() / 1000))
  const signature = createHmac('sha256', process.env.LIVE_LINEUP_ALERT_WEBHOOK_SECRET!).update(`${timestamp}.${body}`).digest('hex')
  const response = await fetchImpl(process.env.LIVE_LINEUP_ALERT_WEBHOOK_URL!, {
    method: 'POST', redirect: 'error', signal: AbortSignal.timeout(5000),
    headers: {'Content-Type': 'application/json', 'X-Sparkle-Timestamp': timestamp, 'X-Sparkle-Signature': `sha256=${signature}`,
      'Idempotency-Key': `live-lineup/${job.id}`}, body,
  })
  if (!response.ok) throw new Error(`webhook_provider_${response.status}`)
  return 'hook_accepted'
}

/** Stable body across retries, with a deliberately small, allowlisted incident event. */
export function incidentPayload(kind: 'incident' | 'recovery', facts: {
  repId: string; slug: string; reason: string; receivedAt: string | null; lastReadyAt: string | null;
  workerVersion: string | null; readerVersion: string | null;
  publicVerification?: 'not_checked' | 'matched' | 'mismatch' | 'unknown';
}, firstFailure: string | null, at: string) {
  const event = {type: `live_lineup_${kind}`, repId: facts.repId, slug: facts.slug, reason: facts.reason,
    firstFailureAt: firstFailure, observedAt: at, lastContactAt: facts.receivedAt, lastGoodReadAt: facts.lastReadyAt,
    workerVersion: facts.workerVersion, readerVersion: facts.readerVersion, publicVerification: facts.publicVerification ?? 'not_checked'}
  return {subject: `Sparkle Suite: ${facts.slug} lineup ${kind === 'incident' ? 'needs attention' : 'reporting again'}`,
    text: [kind === 'incident' ? (facts.reason === 'feed_stopped_show_unverified' ? 'Feed stopped; show status unverified. The calendar still expects this show to be running. No feed has returned during the three-minute confirmation window.' : 'Live Lineup has reported trouble for at least three continuous minutes.')
      : 'Live Lineup has sent two fresh, healthy reports and its public feed matches the reported readiness and update time.',
    `Rep: ${facts.slug}`, `First failure observed: ${firstFailure ?? 'unknown'}`, `Last good read: ${facts.lastReadyAt ?? 'none'}`,
    `Worker version: ${facts.workerVersion ?? 'unknown'}; reader version: ${facts.readerVersion ?? 'unknown'}`,
    `Reported reason: ${facts.reason}`, `Public feed verification: ${facts.publicVerification ?? 'not_checked'}.`,
    kind === 'incident' ? 'Next step: investigate this rep’s diagnostics and check whether other reps have the same reason.'
      : 'Recovery verified for the reporting pipeline. This does not prove every real Bomb Party order was captured.'].join('\n'), event}
}

async function boundedProviderJson(response: Response): Promise<unknown> {
  if (!response.body || Number(response.headers.get('content-length') ?? 0) > 16384) return null
  const reader = response.body.getReader(), chunks: Uint8Array[] = []
  let length = 0
  for (;;) {
    const chunk = await reader.read()
    if (chunk.done) break
    length += chunk.value.byteLength
    if (length > 16384) {await reader.cancel(); return null}
    chunks.push(chunk.value)
  }
  try {return JSON.parse(Buffer.concat(chunks).toString('utf8'))} catch {return null}
}
