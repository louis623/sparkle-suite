import type { SupabaseClient } from '@supabase/supabase-js'
import {
  claimWorkspaceMessageOutboxEvents,
  completeWorkspaceMessageOutboxEvent,
  enqueueWorkspaceMessageOutboxEvent,
  failWorkspaceMessageOutboxEvent,
  type WorkspaceMessageOutboxEvent,
} from '@/lib/services/workspace-message-outbox'
import { publishWorkspaceMessage } from '@/lib/services/workspace-messages'
import {
  attachWeeklyBirthdayReportPublication,
  buildWeeklyBirthdayReportBlocks,
  buildWeeklyBirthdayReportSummary,
  buildWeeklyBirthdayReportTitle,
  collectWeeklyBirthdayReportData,
  getWeeklyBirthdayReportPeriod,
  isWeeklyBirthdayReportDue,
  saveWeeklyBirthdayReportSnapshot,
  SPARKLE_ECOSYSTEM_TIME_ZONE,
} from '@/lib/services/workspace-weekly-birthday-reports'
import {
  attachMonthlyReportPublication,
  buildMonthlyReportBlocks,
  collectMonthlyReportData,
  getMonthlyReportPeriod,
  isMonthlyReportDue,
  saveMonthlyReportSnapshot,
} from '@/lib/services/workspace-monthly-reports'
import { publishOperatorSupportEndNotice } from '@/lib/operator-support/messages'
import {
  getOperatorSupportSession,
  recordOperatorSupportCompletionNotice,
} from '@/lib/operator-support/session-service'

const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtu.be',
])

export function getTrustedYouTubeUrl(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      !url.port &&
      YOUTUBE_HOSTS.has(url.hostname.toLowerCase())
      ? url.toString()
      : null
  } catch {
    return null
  }
}

function requiredString(payload: Record<string, unknown>, key: string) {
  const value = payload[key]
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Message automation payload is missing ${key}`)
  }
  return value.trim()
}

async function processCustomerSignup(
  supabase: SupabaseClient,
  event: WorkspaceMessageOutboxEvent,
) {
  const repId = requiredString(event.payload, 'repId')
  const audienceId = requiredString(event.payload, 'audienceId')
  const customerFirstName = requiredString(event.payload, 'customerFirstName')
  return publishWorkspaceMessage(supabase, {
    senderKey: 'customer_signup_notifier',
    title: 'New customer joined your list',
    summary: `${customerFirstName} signed up through your customer site.`,
    body: `${customerFirstName} is now in your Customer List. Open the record to review any preferences they chose to share.`,
    category: 'customer_activity',
    priority: 'normal',
    actionLabel: 'View customer',
    actionUrl: `/nic-nac?section=customer-list&customer=${encodeURIComponent(audienceId)}`,
    audience: { kind: 'selected', repIds: [repId] },
    idempotencyKey: event.idempotencyKey,
    sourceType: 'customer_signup',
    sourceId: audienceId,
  })
}

async function processMonthlyReport(
  supabase: SupabaseClient,
  event: WorkspaceMessageOutboxEvent,
) {
  const repId = requiredString(event.payload, 'repId')
  const timeZone = requiredString(event.payload, 'timeZone')
  const generated = await collectMonthlyReportData({
    supabase,
    repId,
    timeZone,
    now: new Date(requiredString(event.payload, 'runAt')),
  })
  const snapshot = await saveMonthlyReportSnapshot({
    supabase,
    repId,
    ...generated,
  })
  const publication = await publishWorkspaceMessage(supabase, {
    senderKey: 'monthly_reporter',
    title: `${generated.period.previousMonthLabel} business report`,
    summary: 'Your monthly Sparkle Suite business activity at a glance.',
    body: buildMonthlyReportBlocks(generated),
    category: 'monthly_report',
    priority: 'important',
    actionLabel: 'Open workspace',
    actionUrl: '/nic-nac',
    audience: { kind: 'selected', repIds: [repId] },
    idempotencyKey: event.idempotencyKey,
    sourceType: 'monthly_report_snapshot',
    sourceId: String(snapshot.id),
  })
  await attachMonthlyReportPublication({
    supabase,
    snapshotId: String(snapshot.id),
    publicationId: publication.id,
  })
  return publication
}

async function processWeeklyBirthdayReport(
  supabase: SupabaseClient,
  event: WorkspaceMessageOutboxEvent,
) {
  const repId = requiredString(event.payload, 'repId')
  const runAt = new Date(requiredString(event.payload, 'runAt'))
  const generated = await collectWeeklyBirthdayReportData({
    supabase,
    repId,
    now: runAt,
    timeZone: SPARKLE_ECOSYSTEM_TIME_ZONE,
  })
  if (
    generated.customerBirthdays.length === 0 &&
    generated.teamBirthdays.length === 0
  ) {
    return null
  }
  const snapshot = await saveWeeklyBirthdayReportSnapshot({
    supabase,
    repId,
    ...generated,
  })
  const publication = await publishWorkspaceMessage(supabase, {
    senderKey: 'birthday_reporter',
    title: buildWeeklyBirthdayReportTitle(generated.period),
    summary: buildWeeklyBirthdayReportSummary(generated),
    body: buildWeeklyBirthdayReportBlocks(generated),
    category: 'birthday_report',
    priority: 'important',
    actionLabel: 'Open Customer List',
    actionUrl: '/nic-nac?section=customer-list',
    audience: { kind: 'selected', repIds: [repId] },
    idempotencyKey: event.idempotencyKey,
    sourceType: 'weekly_birthday_report_snapshot',
    sourceId: String(snapshot.id),
  })
  await attachWeeklyBirthdayReportPublication({
    supabase,
    snapshotId: String(snapshot.id),
    publicationId: publication.id,
  })
  return publication
}

async function processResourcePublished(
  supabase: SupabaseClient,
  event: WorkspaceMessageOutboxEvent,
) {
  const resourceId = requiredString(event.payload, 'resourceId')
  const revisionId = requiredString(event.payload, 'revisionId')
  const [{ data: resource, error: resourceError }, { data: revision, error: revisionError }] =
    await Promise.all([
      supabase
        .from('workspace_resources')
        .select('id, resource_key, resource_type, title, summary, video_provider, video_url, status')
        .eq('id', resourceId)
        .single(),
      supabase
        .from('workspace_resource_revisions')
        .select('id, version, change_summary, announcement_status')
        .eq('id', revisionId)
        .eq('resource_id', resourceId)
        .single(),
    ])
  if (resourceError || !resource) throw resourceError ?? new Error('Resource not found')
  if (revisionError || !revision) throw revisionError ?? new Error('Resource revision not found')
  if (resource.status !== 'published') {
    throw new Error('Only published resources can be announced')
  }

  const resourceType = String(resource.resource_type)
  const category =
    resourceType === 'blog' ? 'blog' : resourceType === 'video' ? 'video' : 'help_update'
  const version = Number(revision.version)
  const title =
    resourceType === 'blog'
      ? `New blog: ${resource.title}`
      : resourceType === 'video'
        ? `New video: ${resource.title}`
        : version === 1
          ? `New help resource: ${resource.title}`
          : `Help updated: ${resource.title}`
  const resourceLibraryUrl = `/nic-nac?section=resources&resource=${encodeURIComponent(
    String(resource.resource_key),
  )}`
  const youtubeUrl =
    resourceType === 'video' && resource.video_provider === 'youtube'
      ? getTrustedYouTubeUrl(resource.video_url)
      : null
  const publication = await publishWorkspaceMessage(supabase, {
    senderKey: 'resource_publisher',
    title,
    summary: String(revision.change_summary),
    body: String(resource.summary),
    category,
    priority: 'normal',
    actionLabel: 'Open in Resources & Help',
    actionUrl: resourceLibraryUrl,
    secondaryActionLabel: youtubeUrl ? 'Watch on YouTube' : null,
    secondaryActionUrl: youtubeUrl,
    audience: { kind: 'all_active' },
    idempotencyKey: event.idempotencyKey,
    sourceType: 'workspace_resource',
    sourceId: resourceId,
  })

  const { error: updateError } = await supabase
    .from('workspace_resource_revisions')
    .update({
      announcement_status: 'published',
      publication_id: publication.id,
      announcement_error: null,
    })
    .eq('id', revisionId)
  if (updateError) throw updateError
  return publication
}

async function processOperatorSupportCompletionNotice(
  supabase: SupabaseClient,
  event: WorkspaceMessageOutboxEvent,
) {
  const sessionId = requiredString(event.payload, 'sessionId')
  const session = await getOperatorSupportSession(supabase, { sessionId })
  if (!session) throw new Error('Operator support session was not found')
  if (!['ended', 'expired', 'revoked', 'failed'].includes(session.status)) {
    throw new Error('Operator support session is not closed')
  }
  const publication = await publishOperatorSupportEndNotice(
    supabase,
    session,
    event.payload.changedAnything === true,
  )
  await recordOperatorSupportCompletionNotice(supabase, {
    sessionId,
    endPublicationId: publication.id,
  })
  return publication
}

async function processEvent(
  supabase: SupabaseClient,
  event: WorkspaceMessageOutboxEvent,
) {
  if (event.eventType === 'customer_signup_created') {
    return processCustomerSignup(supabase, event)
  }
  if (event.eventType === 'monthly_report_due') {
    return processMonthlyReport(supabase, event)
  }
  if (event.eventType === 'weekly_birthday_report_due') {
    return processWeeklyBirthdayReport(supabase, event)
  }
  if (event.eventType === 'workspace_resource_published') {
    return processResourcePublished(supabase, event)
  }
  if (event.eventType === 'operator_support_completion_notice') {
    return processOperatorSupportCompletionNotice(supabase, event)
  }
  throw new Error(`Unsupported Message Center automation event: ${event.eventType}`)
}

export async function enqueueDueMonthlyReports(args: {
  supabase: SupabaseClient
  now?: Date
}) {
  const now = args.now ?? new Date()
  const { data, error } = await args.supabase
    .from('reps')
    .select('id, time_zone')
    .eq('status', 'active')
  if (error) throw error

  const results: Array<{ repId: string; idempotencyKey: string }> = []
  for (const rep of data ?? []) {
    const timeZone =
      typeof rep.time_zone === 'string' && rep.time_zone.trim()
        ? rep.time_zone.trim()
        : 'America/New_York'
    if (!isMonthlyReportDue(now, timeZone)) continue
    const period = getMonthlyReportPeriod(now, timeZone)
    const idempotencyKey = `monthly-report:${rep.id}:${period.reportMonth.slice(0, 7)}`
    await enqueueWorkspaceMessageOutboxEvent(args.supabase, {
      eventType: 'monthly_report_due',
      idempotencyKey,
      payload: {
        repId: rep.id,
        timeZone,
        reportMonth: period.reportMonth,
        runAt: now.toISOString(),
      },
    })
    results.push({ repId: String(rep.id), idempotencyKey })
  }
  return results
}

export async function enqueueDueWeeklyBirthdayReports(args: {
  supabase: SupabaseClient
  now?: Date
}) {
  const now = args.now ?? new Date()
  if (!isWeeklyBirthdayReportDue(now, SPARKLE_ECOSYSTEM_TIME_ZONE)) return []
  const period = getWeeklyBirthdayReportPeriod(now, SPARKLE_ECOSYSTEM_TIME_ZONE)
  const reps: Array<{ id: string }> = []
  const pageSize = 500
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await args.supabase
      .from('reps')
      .select('id')
      .eq('status', 'active')
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1)
    if (error) throw error
    const page = (data ?? []) as Array<{ id: string }>
    reps.push(...page)
    if (page.length < pageSize) break
  }

  const results: Array<{ repId: string; idempotencyKey: string }> = []
  for (const rep of reps) {
    const repId = String(rep.id)
    const idempotencyKey = `weekly-birthday-report:${repId}:${period.weekStart}`
    await enqueueWorkspaceMessageOutboxEvent(args.supabase, {
      eventType: 'weekly_birthday_report_due',
      idempotencyKey,
      payload: {
        repId,
        timeZone: SPARKLE_ECOSYSTEM_TIME_ZONE,
        weekStart: period.weekStart,
        runAt: now.toISOString(),
      },
    })
    results.push({ repId, idempotencyKey })
  }
  return results
}

export async function processWorkspaceMessageAutomation(args: {
  supabase: SupabaseClient
  workerId: string
  limit?: number
  now?: Date
}) {
  const events = await claimWorkspaceMessageOutboxEvents(args.supabase, {
    workerId: args.workerId,
    limit: args.limit ?? 25,
  })
  const results: Array<{
    eventId: string
    eventType: string
    status: 'completed' | 'failed'
    error?: string
  }> = []

  for (const event of events) {
    try {
      await processEvent(args.supabase, event)
      await completeWorkspaceMessageOutboxEvent(args.supabase, {
        eventId: event.id,
        workerId: args.workerId,
      })
      results.push({ eventId: event.id, eventType: event.eventType, status: 'completed' })
    } catch (error) {
      const retryMinutes = Math.min(60, 2 ** Math.min(event.attemptCount + 1, 5))
      await failWorkspaceMessageOutboxEvent(args.supabase, {
        eventId: event.id,
        workerId: args.workerId,
        error,
        retryAt: new Date(
          (args.now ?? new Date()).getTime() + retryMinutes * 60_000,
        ).toISOString(),
      })
      results.push({
        eventId: event.id,
        eventType: event.eventType,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return { claimed: events.length, completed: results.filter((r) => r.status === 'completed').length, failed: results.filter((r) => r.status === 'failed').length, results }
}
