import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { sendOperatorSupportReply } from '@/lib/services/workspace-conversations'

type ReplyApprovalStatus =
  | 'requested'
  | 'approved'
  | 'declined'
  | 'executing'
  | 'executed'
  | 'expired'

type ReplyApprovalRow = {
  id: string
  support_report_id: string
  conversation_id: string
  proposed_reply: string
  status: ReplyApprovalStatus
  requested_at: string
  expires_at: string
  approved_at: string | null
  approved_by_operator_id: string | null
  approved_by_operator_email: string | null
  decision_note: string | null
  claimed_at: string | null
  executed_at: string | null
  sent_message_id: string | null
  support_reports?: { title: string } | Array<{ title: string }> | null
}

function asRow(value: unknown) {
  return value as ReplyApprovalRow
}

function reportTitle(row: ReplyApprovalRow) {
  const report = Array.isArray(row.support_reports)
    ? row.support_reports[0]
    : row.support_reports
  return report?.title ?? 'Support reply'
}

function mapApproval(row: ReplyApprovalRow) {
  return {
    id: row.id,
    reportId: row.support_report_id,
    conversationId: row.conversation_id,
    reportTitle: reportTitle(row),
    reply: row.proposed_reply,
    status: row.status,
    requestedAt: row.requested_at,
    expiresAt: row.expires_at,
    approvedAt: row.approved_at,
    approvedBy: row.approved_by_operator_email,
    decisionNote: row.decision_note,
    executedAt: row.executed_at,
  }
}

const APPROVAL_SELECT = [
  'id',
  'support_report_id',
  'conversation_id',
  'proposed_reply',
  'status',
  'requested_at',
  'expires_at',
  'approved_at',
  'approved_by_operator_id',
  'approved_by_operator_email',
  'decision_note',
  'claimed_at',
  'executed_at',
  'sent_message_id',
  'support_reports(title)',
].join(', ')

export async function createRemyReplyApprovalRequest(
  supabase: SupabaseClient,
  input: { reportId: string; reply: string },
) {
  const reply = input.reply.trim()
  if (!reply || reply.length > 5_000) throw new Error('Reply text is invalid.')
  const report = await supabase
    .from('support_reports')
    .select('id, workspace_conversation_id')
    .eq('id', input.reportId)
    .maybeSingle()
  if (report.error || !report.data?.workspace_conversation_id) {
    throw new Error('Support report is unavailable for approval.')
  }
  const saved = await supabase
    .from('remy_communications_reply_approvals')
    .insert({
      support_report_id: input.reportId,
      conversation_id: report.data.workspace_conversation_id,
      proposed_reply: reply,
    })
    .select(APPROVAL_SELECT)
    .single()
  if (saved.error || !saved.data) throw new Error('Reply approval request could not be saved.')
  return mapApproval(asRow(saved.data))
}

export async function listRemyReplyApprovals(
  supabase: SupabaseClient,
  options: { status?: 'requested' | 'approved' | 'executed'; limit?: number; expireRequests?: boolean } = {},
) {
  const now = new Date().toISOString()
  if(options.expireRequests!==false) await supabase
    .from('remy_communications_reply_approvals')
    .update({ status: 'expired' })
    .eq('status', 'requested')
    .lt('expires_at', now)

  let query = supabase
    .from('remy_communications_reply_approvals')
    .select(APPROVAL_SELECT)
    .order('requested_at', { ascending: false })
    .limit(Math.min(Math.max(options.limit ?? 50, 1), 100))
  if (options.status) query = query.eq('status', options.status)
  if(options.expireRequests===false&&options.status==='requested')query=query.gt('expires_at',now)
  const result = await query
  if (result.error) throw result.error
  return (result.data ?? []).map((row) => mapApproval(asRow(row)))
}

export async function decideRemyReplyApproval(
  supabase: SupabaseClient,
  input: {
    requestId: string
    decision: 'approve' | 'decline'
    operatorId: string
    operatorEmail: string
    note?: string
  },
) {
  const now = new Date().toISOString()
  const update = input.decision === 'approve'
    ? {
        status: 'approved',
        approved_at: now,
        approved_by_operator_id: input.operatorId,
        approved_by_operator_email: input.operatorEmail,
        decision_note: input.note?.trim() || null,
      }
    : {
        status: 'declined',
        decision_note: input.note?.trim() || null,
      }
  let query = supabase
    .from('remy_communications_reply_approvals')
    .update(update)
    .eq('id', input.requestId)
    .eq('status', 'requested')
  if (input.decision === 'approve') query = query.gt('expires_at', now)
  const saved = await query.select(APPROVAL_SELECT).maybeSingle()
  if (saved.error) throw saved.error
  if (!saved.data) throw new Error('This reply approval is no longer available.')
  return mapApproval(asRow(saved.data))
}

export async function sendApprovedRemyReply(
  supabase: SupabaseClient,
  requestId: string,
) {
  const now = new Date().toISOString()
  const claimed = await supabase
    .from('remy_communications_reply_approvals')
    .update({ status: 'executing', claimed_at: now })
    .eq('id', requestId)
    .eq('status', 'approved')
    .gt('expires_at', now)
    .select(APPROVAL_SELECT)
    .maybeSingle()
  if (claimed.error) throw claimed.error
  if (!claimed.data) throw new Error('This reply is not currently approved for sending.')
  const approval = asRow(claimed.data)
  try {
    const message = await sendOperatorSupportReply(supabase, {
      conversationId: approval.conversation_id,
      operatorId: `remy-communications:approved-by:${approval.approved_by_operator_id ?? 'operator'}`,
      body: approval.proposed_reply,
      // This key is deterministic so a retry after an interrupted completion
      // cannot send the same approved reply twice.
      clientRequestId: `remy-approved:${approval.id}`,
    })
    const completed = await supabase
      .from('remy_communications_reply_approvals')
      .update({ status: 'executed', executed_at: new Date().toISOString(), sent_message_id: message.id })
      .eq('id', approval.id)
      .eq('status', 'executing')
      .select(APPROVAL_SELECT)
      .single()
    if (completed.error || !completed.data) throw new Error('Reply sent, but approval completion could not be recorded.')
    return { approval: mapApproval(asRow(completed.data)), message }
  } catch (error) {
    await supabase
      .from('remy_communications_reply_approvals')
      .update({ status: 'approved', claimed_at: null })
      .eq('id', approval.id)
      .eq('status', 'executing')
    throw error
  }
}
