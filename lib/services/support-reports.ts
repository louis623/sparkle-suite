import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import {
  type SupportAuditAlertPayload,
  sendGoogleChatSupportAlert,
} from '@/lib/ops/google-chat-alerts'
import {
  type ClientAccountSnapshot,
  ensureClientAccountProfile,
} from '@/lib/services/client-account-profiles'
import { runSupportAuditForReport } from '@/lib/services/support-auditor'

export type SupportReportSource = 'help_form' | 'nic_nac' | 'message_center'
export type SupportReportType =
  | 'help_question'
  | 'site_issue'
  | 'bug'
  | 'suggested_upgrade'
  | 'workflow_idea'
export type SupportReportUrgency = 'normal' | 'blocking' | 'showtime_urgent'
export type SupportReportStatus =
  | 'open'
  | 'reviewing'
  | 'planned'
  | 'resolved'
  | 'closed'
export type SupportReportNotificationStatus =
  | 'delivered'
  | 'not_configured'
  | 'failed'

export interface CreateSupportReportInput {
  repId: string
  repEmail?: string
  source: SupportReportSource
  reportType: SupportReportType
  urgency?: SupportReportUrgency
  pageOrWorkflow?: string
  title: string
  details: string
  expectedResult?: string
  actualResult?: string
  contactOk?: boolean
  conversationId?: string
  runId?: string
}

export interface CreateSupportReportResult {
  ok: true
  reportId: string
  notificationStatus: SupportReportNotificationStatus
}

const SUPPORT_REPORT_SELECT = [
  'id',
  'rep_id',
  'client_account_profile_id',
  'client_snapshot',
  'conversation_id',
  'run_id',
  'source',
  'report_type',
  'urgency',
  'status',
  'page_or_workflow',
  'title',
  'details',
  'expected_result',
  'actual_result',
  'contact_ok',
  'notification_channel',
  'notification_status',
  'notification_error',
  'audit_status',
  'audit_started_at',
  'audit_completed_at',
  'audit_error',
  'resolution_snapshot',
  'created_at',
  'updated_at',
  'support_audits(status, findings, recommended_first_action, ai_summary, template_summary, created_at)',
].join(', ')

const createSupportReportSchema = z.object({
  repId: z.string().trim().min(1),
  repEmail: z.string().trim().email().optional(),
  source: z.enum(['help_form', 'nic_nac', 'message_center']),
  reportType: z.enum(['help_question', 'site_issue', 'bug', 'suggested_upgrade', 'workflow_idea']),
  urgency: z.enum(['normal', 'blocking', 'showtime_urgent']).default('normal'),
  pageOrWorkflow: z.string().trim().max(180).optional(),
  title: z.string().trim().min(3).max(160),
  details: z.string().trim().min(10).max(3000),
  expectedResult: z.string().trim().max(1200).optional(),
  actualResult: z.string().trim().max(1200).optional(),
  contactOk: z.boolean().default(true),
  conversationId: z.string().trim().max(180).optional(),
  runId: z.string().trim().max(180).optional(),
})

const updateOperatorSupportReportStatusSchema = z.object({
  reportId: z.string().trim().min(1),
  status: z.enum(['open', 'reviewing', 'planned', 'resolved', 'closed']),
})

function emptyToNull(value: string | undefined) {
  const normalized = value?.trim()
  return normalized ? normalized : null
}

function reportTypeLabel(reportType: SupportReportType) {
  if (reportType === 'help_question') return 'Help question'
  if (reportType === 'site_issue') return 'Site issue'
  if (reportType === 'suggested_upgrade') return 'Suggested upgrade'
  if (reportType === 'workflow_idea') return 'Workflow idea'
  return 'Bug'
}

function sourceLabel(source: SupportReportSource) {
  if (source === 'help_form') return 'Help form'
  if (source === 'message_center') return 'Message Center'
  return 'Nic-Nac'
}

function notificationErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message.slice(0, 300)
  return String(error).slice(0, 300)
}

async function markNotification(
  supabase: SupabaseClient,
  reportId: string,
  notificationStatus: SupportReportNotificationStatus,
  notificationError: string | null,
) {
  const { error } = await supabase
    .from('support_reports')
    .update({
      notification_status: notificationStatus,
      notification_error: notificationError,
      updated_at: new Date().toISOString(),
    })
    .eq('id', reportId)

  if (error) {
    console.error('[support-reports] notification status update failed', {
      reportId,
      notificationStatus,
      error,
    })
  }
}

async function markAuditFailed(
  supabase: SupabaseClient,
  reportId: string,
  auditError: unknown,
) {
  const now = new Date().toISOString()
  const { error } = await supabase
    .from('support_reports')
    .update({
      audit_status: 'failed',
      audit_completed_at: now,
      audit_error: notificationErrorMessage(auditError),
      updated_at: now,
    })
    .eq('id', reportId)

  if (error) {
    console.error('[support-reports] audit failure status update failed', {
      reportId,
      error,
    })
  }
}

function buildAuditFailureAlertPayload(input: {
  report: z.infer<typeof createSupportReportSchema>
  reportId: string
  profile: ClientAccountSnapshot
  auditError: unknown
}): SupportAuditAlertPayload {
  return {
    title: `${reportTypeLabel(input.report.reportType)}: ${input.report.title.trim()}`,
    urgency: input.report.urgency,
    clientName: input.profile.clientName,
    showName: input.profile.showName,
    phone: input.profile.phone,
    email: input.profile.email,
    reportId: input.reportId,
    issue: input.report.details.trim(),
    source: sourceLabel(input.report.source),
    workflow: emptyToNull(input.report.pageOrWorkflow) ?? 'Not provided',
    auditStatus: 'incomplete',
    summary: `The report was saved, but Support Auditor could not finish the account check: ${notificationErrorMessage(input.auditError)}`,
    findings: [],
    recommendedFirstAction: 'Open the report in Control Center and review manually.',
  }
}

export async function createSupportReport(
  supabase: SupabaseClient,
  input: CreateSupportReportInput,
): Promise<CreateSupportReportResult> {
  const report = createSupportReportSchema.parse(input)
  const clientProfile = await ensureClientAccountProfile(supabase, report.repId.trim())
  const insertPayload = {
    rep_id: report.repId.trim(),
    client_account_profile_id: clientProfile.profileId,
    client_snapshot: clientProfile,
    conversation_id: emptyToNull(report.conversationId),
    run_id: emptyToNull(report.runId),
    source: report.source,
    report_type: report.reportType,
    urgency: report.urgency,
    status: 'open',
    page_or_workflow: emptyToNull(report.pageOrWorkflow),
    title: report.title.trim(),
    details: report.details.trim(),
    expected_result: emptyToNull(report.expectedResult),
    actual_result: emptyToNull(report.actualResult),
    contact_ok: report.contactOk,
    notification_channel: 'google_chat',
    notification_status: 'pending',
    audit_status: 'pending',
  }

  const { data, error } = await supabase
    .from('support_reports')
    .insert(insertPayload)
    .select(SUPPORT_REPORT_SELECT)
    .single()

  if (error || !data) {
    throw error ?? new Error('support report insert failed')
  }

  const row = data as unknown as { id: string }
  let alertPayload: SupportAuditAlertPayload
  try {
    const auditResult = await runSupportAuditForReport(supabase, {
      reportId: row.id,
    })
    alertPayload = auditResult.alertPayload
  } catch (auditError) {
    await markAuditFailed(supabase, row.id, auditError)
    alertPayload = buildAuditFailureAlertPayload({
      report,
      reportId: row.id,
      profile: clientProfile,
      auditError,
    })
  }

  try {
    const alertResult = await sendGoogleChatSupportAlert(alertPayload)

    if (alertResult.delivered) {
      await markNotification(supabase, row.id, 'delivered', null)
      return { ok: true, reportId: row.id, notificationStatus: 'delivered' }
    }

    await markNotification(
      supabase,
      row.id,
      'not_configured',
      alertResult.reason,
    )
    return { ok: true, reportId: row.id, notificationStatus: 'not_configured' }
  } catch (notificationError) {
    await markNotification(
      supabase,
      row.id,
      'failed',
      notificationErrorMessage(notificationError),
    )
    return { ok: true, reportId: row.id, notificationStatus: 'failed' }
  }
}

export async function listOperatorSupportReports(
  supabase: SupabaseClient,
  options: { status?: SupportReportStatus; limit?: number; offset?: number } = {},
) {
  let query = supabase.from('support_reports').select(SUPPORT_REPORT_SELECT)

  if (options.status) {
    query = query.eq('status', options.status)
  }

  const limit = Math.min(Math.max(options.limit ?? 50, 1), 100)
  const ordered = query
    .order('urgency_rank', { ascending: false })
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
  const { data, error } = await (options.offset === undefined ? ordered.limit(limit) : ordered.range(options.offset, options.offset + limit - 1))

  if (error) throw error
  return data ?? []
}

export async function updateOperatorSupportReportStatus(
  supabase: SupabaseClient,
  input: { reportId: string; status: SupportReportStatus },
) {
  const parsed = updateOperatorSupportReportStatusSchema.parse(input)

  const { data, error } = await supabase
    .from('support_reports')
    .update({
      status: parsed.status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', parsed.reportId.trim())
    .select(SUPPORT_REPORT_SELECT)
    .single()

  if (error || !data) {
    throw error ?? new Error('support report status update failed')
  }

  return data
}
