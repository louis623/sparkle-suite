import 'server-only'
import { randomUUID } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { projectShowControl } from './show-control'
import { readLineupControl, readLineupState } from './service'
import { LIVE_LINEUP_RELEASE } from './release'
import { isFizzFestivalDemoState } from './demo'
import { advanceMonitor, applyExpectedShow, type MonitorShowWindow, groupChangedStructures, adoptionDue, classifyAdoption, incidentStillSendable, monitorFacts, type MonitorState } from './monitor'
import { currentParserFailure, deliverMonitorJob, incidentPayload, monitorConfiguration, type MonitorDelivery } from './monitor-delivery'
import { verifyPublicFeed } from './monitor-public'

const MAX_REPS = 50
const BATCH_SIZE = 4
type Rep = {id: string; public_site_slug: string | null}
type MonitorRow = {revision: number; data: MonitorState}

async function monitorRow(db: SupabaseClient, repId: string): Promise<MonitorRow | null> {
  const {data, error} = await db.from('live_lineup_monitor_states').select('revision,data').eq('rep_id', repId).maybeSingle()
  if (error) throw new Error('monitor_state_unavailable')
  return data as MonitorRow | null
}

async function scheduledWindows(db: SupabaseClient, repId: string, now: number): Promise<MonitorShowWindow[]> {
  const result = await db.from('calendar_events').select('event_time,duration_minutes').eq('rep_id',repId)
    .eq('status','scheduled').gte('event_time',new Date(now-86_400_000).toISOString()).lte('event_time',new Date(now).toISOString())
    .limit(101)
  if (result.error || !Array.isArray(result.data) || result.data.length > 100) throw new Error('monitor_schedule_unavailable')
  return result.data as MonitorShowWindow[]
}

async function currentMonitorFacts(db: SupabaseClient, repId: string, slug: string, source: Awaited<ReturnType<typeof readLineupState>>, now: number) {
  const control = await readLineupControl(db,repId)
  const show = projectShowControl(control,source,now).showControl
  let facts = monitorFacts(repId,slug,source,now)
  const intentionalIdle = show.phase === 'ended' && Boolean(control?.mode === 'stopped'
    || control?.idle_deadline_at && Date.parse(control.idle_deadline_at) <= now)
  if (intentionalIdle) return {...facts,health:'unknown' as const,reason:'expected_idle'}
  if (facts.health === 'unknown' && facts.reason === 'feed_unverified') {
    facts = applyExpectedShow(facts,await scheduledWindows(db,repId,now),now)
  }
  if (facts.health === 'healthy') {
    facts.publicVerification = source ? await verifyPublicFeed(repId,source,fetch,control ? show : undefined) : 'unknown'
    if (facts.publicVerification === 'mismatch') { facts.health = 'unhealthy'; facts.reason = 'public_feed_mismatch' }
    else if (facts.publicVerification !== 'matched') { facts.health = 'unknown'; facts.reason = 'public_feed_unverified' }
  }
  return facts
}

async function sampleRep(db: SupabaseClient, rep: Rep, now: number) {
  // A CAS conflict means another worker sampled first; one bounded reread is enough.
  for (let attempt = 0; attempt < 2; attempt++) {
    const previous = await monitorRow(db, rep.id)
    const source = await readLineupState(db,rep.id)
    if (isFizzFestivalDemoState(rep.id,source)) return null
    const facts = await currentMonitorFacts(db,rep.id,rep.public_site_slug ?? rep.id,source,now)
    facts.lastGoodStructureHash = previous?.data.lastGoodStructureHash ?? null
    const next = advanceMonitor(previous?.data ?? null, facts, now, randomUUID())
    const payload = next.event ? incidentPayload(next.event.kind, facts,
      previous?.data.unhealthySince ?? next.state.unhealthySince, new Date(now).toISOString(), currentParserFailure(source, now)) : null
    const {data, error} = await db.rpc('live_lineup_monitor_commit', {
      p_rep_id: rep.id, p_expected_revision: previous?.revision ?? 0, p_data: next.state,
      p_event_kind: next.event?.kind ?? null, p_incident_id: next.event?.incidentId ?? null, p_payload: payload,
    })
    if (error) throw new Error('monitor_commit_unavailable')
    if (data === true) return facts
  }
  throw new Error('monitor_revision_conflict')
}

async function finish(db: SupabaseClient, job: MonitorDelivery, worker: string,
  outcome: 'accepted' | 'retry' | 'canceled' | 'exhausted', providerId: string | null = null, retrySeconds = 60) {
  const {data, error} = await db.rpc('live_lineup_monitor_finish', {p_job_id: job.id, p_worker: worker,
    p_outcome: outcome, p_provider_id: providerId, p_retry_seconds: retrySeconds})
  if (error || data !== true) throw new Error('monitor_delivery_receipt_unavailable')
}

async function sendJobs(db: SupabaseClient, now: number) {
  const configuration = monitorConfiguration()
  if (!configuration.delivery) return {accepted: 0, deferred: 0, skippedOptionalHooks: 0, disabled: configuration.disabledReason}
  const worker = randomUUID()
  const {data, error} = await db.rpc('live_lineup_monitor_claim', {p_worker: worker, p_limit: BATCH_SIZE})
  if (error) throw new Error('monitor_delivery_claim_unavailable')
  let accepted = 0, deferred = 0, skippedOptionalHooks = 0
  if (!Array.isArray(data) || data.length > BATCH_SIZE || new Set(data.map(job => job.id)).size !== data.length) throw new Error('monitor_delivery_claim_invalid')
  const deliveries = await Promise.allSettled((data as MonitorDelivery[]).map(async job => {
    try {
      // Vercel's authenticated cron is the required alert hook. An external Watch wakeup is optional.
      if (job.channel === 'webhook' && !configuration.webhookConfigured) {
        await finish(db, job, worker, 'canceled'); skippedOptionalHooks++; return
      }
      // Provider idempotency lasts 24h. Stop blind retries before its expiry, retain uncertain status for review.
      if (job.attempt_count > 10 || now - Date.parse(job.created_at) > 23 * 3_600_000) {
        await finish(db, job, worker, 'exhausted'); deferred++; return
      }
      if (job.incident_id && job.rep_id) {
        const {data: incident, error: incidentError} = await db.from('live_lineup_monitor_incidents')
          .select('status').eq('id', job.incident_id).eq('rep_id', job.rep_id).maybeSingle()
        if (incidentError || !incident) throw new Error('incident_unavailable')
        const source = await readLineupState(db, job.rep_id)
        const facts = await currentMonitorFacts(db,job.rep_id,job.rep_id,source,Date.now())
        const current = await monitorRow(db, job.rep_id)
        if (job.kind === 'incident' && (incident.status === 'recovered' || facts.health === 'healthy' || facts.reason === 'expected_idle'
          || job.payload.event.reason === 'feed_stopped_show_unverified' && facts.reason !== 'feed_stopped_show_unverified')) {
          await finish(db, job, worker, 'canceled'); return
        }
        let permitted = job.kind === 'incident'
          ? incidentStillSendable(current?.data ?? null, facts, job.incident_id, Date.now())
          : incident.status === 'recovered' && facts.health === 'healthy'
            && current?.data.health === 'healthy' && current.data.recoveryStreak >= 2
        if (permitted && job.kind === 'recovery') permitted = facts.publicVerification === 'matched'
        if (!permitted) {await finish(db, job, worker, 'retry'); deferred++; return}
      }
      const providerId = await deliverMonitorJob(job)
      await finish(db, job, worker, 'accepted', providerId)
      accepted++
    } catch {
      // No raw provider body, token, source packet or customer data enters the ledger/logs.
      await finish(db, job, worker, 'retry', null, Math.min(600, 60 * 2 ** Math.min(job.attempt_count - 1, 4)))
      deferred++
    }
  }))
  if (deliveries.some(result => result.status === 'rejected')) throw new Error('monitor_delivery_receipt_unavailable')
  return {accepted, deferred, skippedOptionalHooks, disabled: null}
}

async function sampleRoster(db: SupabaseClient, now: number) {
  // Never silently truncate coverage. The operator must raise/rework this bound if the active roster grows.
  const {data, error} = await db.from('reps').select('id,public_site_slug').eq('status', 'active').order('id').limit(MAX_REPS + 1)
  if (error || !Array.isArray(data)) throw new Error('monitor_roster_unavailable')
  if (data.length > MAX_REPS) throw new Error('monitor_roster_capacity')
  const facts = []
  let failures = 0
  for (let index = 0; index < data.length; index += 10) {
    const samples = await Promise.allSettled((data as Rep[]).slice(index,index+10).map(rep => sampleRep(db, rep, now)))
    for (const result of samples) {
      if (result.status === 'fulfilled') { if (result.value) facts.push(result.value) }
      else failures++
    }
  }
  let adoption = 'waiting_for_published_release_or_24_hours'
  if (adoptionDue(LIVE_LINEUP_RELEASE, now) && failures === 0) {
    const rows = facts.map(fact => ({repId: fact.repId, slug: fact.slug, category: classifyAdoption(fact, LIVE_LINEUP_RELEASE, now),
      workerVersion: fact.workerVersion, readerVersion: fact.readerVersion, lastContactAt: fact.receivedAt}))
    const payload = {subject: `Sparkle Suite extension ${LIVE_LINEUP_RELEASE.version}: 24-hour adoption check`,
      text: ['24-hour extension adoption check. Updated means a matching version reported since publication, as of the listed receipt; it does not mean the browser is online now. Old or missing reports do not prove a current older installation.',
        ...rows.map(row => `${row.slug}: ${row.category}; worker ${row.workerVersion ?? 'unknown'}; reader ${row.readerVersion ?? 'unknown'}; last report ${row.lastContactAt ?? 'none'}`),
        'Next step: Louis follows up with older or unverified reps before their next show. No reps have been contacted.'].join('\n'),
      event: {type: 'live_lineup_adoption', version: LIVE_LINEUP_RELEASE.version, publishedAt: LIVE_LINEUP_RELEASE.publishedAt, observedAt: new Date(now).toISOString(), reps: rows}}
    const result = await db.rpc('live_lineup_monitor_adoption', {p_version: LIVE_LINEUP_RELEASE.version, p_payload: payload})
    if (result.error) throw new Error('monitor_adoption_unavailable')
    adoption = 'recorded_once_per_release'
  }
  return {sampled: facts.length, sampleFailures: failures, adoption, suspectedSharedChanges: groupChangedStructures(facts),
    limits: ['silence_alerts_only_in_scheduled_window_with_prior_contact' , 'public_feed_network_failures_unknown', 'shared_change_groups_reported_not_combined_emails', 'provider_acceptance_not_mailbox_delivery']}
}

/** Both tasks are awaited even when either fails; no detached delivery work after the response. */
export async function runLineupMonitor(db: SupabaseClient, now = Date.now()) {
  const configuration = monitorConfiguration()
  if (!configuration.monitoring) return {configuration, sampled: 0, delivery: null}
  const [sampling, delivery, expiry] = await Promise.allSettled([
    sampleRoster(db,now),sendJobs(db,now),db.rpc('live_lineup_control_expire',{p_limit:64}),
  ])
  if (sampling.status === 'rejected') throw sampling.reason
  if (delivery.status === 'rejected') throw delivery.reason
  return {configuration, ...sampling.value, delivery: delivery.value, expiredShows:expiry.status === 'fulfilled' && !expiry.value.error ? expiry.value.data : null}
}
