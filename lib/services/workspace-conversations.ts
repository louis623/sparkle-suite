import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ServiceError } from '@/lib/services/errors'
import {
  assertRepConversationAction,
  requireRepConversationMembership,
  type WorkspaceConversationState,
  type WorkspaceConversationType,
} from '@/lib/services/workspace-conversation-permissions'
import { assertWorkspaceConversationComposingEnabled } from '@/lib/services/workspace-conversation-feature-flags'
import { operatorConversationSearch } from '@/lib/services/operator-conversation-search'

export type WorkspaceConversationView = 'all' | 'team' | 'rep_network' | 'support' | 'archived'

export interface WorkspaceConversationSummary {
  kind: 'conversation'
  id: string
  conversationId: string
  conversationType: WorkspaceConversationType
  type: WorkspaceConversationType
  state: WorkspaceConversationState
  subject: string
  participantLabels: string[]
  senderDisplayName: string
  latestMessagePreview: string
  lastMessageAt: string
  updatedAt: string
  unreadCount: number
  isArchived: boolean
  isMuted: boolean
  archivedAt: string | null
  mutedAt: string | null
  membershipState: string
  requestDirection?: 'incoming' | 'outgoing'
  requestState?: 'pending' | 'accepted' | 'declined' | 'blocked'
  context: Record<string, unknown>
}

export interface WorkspaceConversationMessage {
  id: string
  senderType: string
  senderLabel: string
  body: string
  kind: 'message' | 'system_status' | 'moderation_notice'
  createdAt: string
  isOwn: boolean
  isModerated: boolean
  metadata: Record<string, unknown>
}

export interface WorkspaceConversationDetail {
  conversation: WorkspaceConversationSummary
  messages: WorkspaceConversationMessage[]
  attachments: WorkspaceConversationAttachment[]
}

export interface WorkspaceConversationAttachment {
  id: string
  contentType: string
  byteSize: number
  width: number
  height: number
  slot: number
  createdAt: string
  signedReadHref: string
}

type ConversationRow = {
  id: string
  conversation_type: WorkspaceConversationType
  state: WorkspaceConversationState
  subject: string
  context_snapshot: Record<string, unknown> | null
  last_message_at: string
  latest_message_preview: string
  latest_message_sender_display_name: string | null
  updated_at: string
}

type ParticipantRow = {
  id: string
  conversation_id: string
  principal_type: string
  rep_id: string | null
  role: string
  membership_state: string
  last_read_at: string | null
  archived_at: string | null
  muted_at: string | null
  unread_count: number
}

type ConversationPageRow = ConversationRow & {
  participant_id: string
  participant_role: string
  participant_membership_state: string
  participant_last_read_at: string | null
  participant_archived_at: string | null
  participant_muted_at: string | null
  participant_unread_count: number
  total_unread: number | string | null
}

type MessageRow = {
  id: string
  conversation_id: string
  sender_principal_type: string
  sender_rep_id: string | null
  sender_display_name: string
  kind: WorkspaceConversationMessage['kind']
  body: string
  metadata: Record<string, unknown> | null
  moderated_at: string | null
  created_at: string
}

type AttachmentRow = {
  id: string
  content_type: string
  byte_size: number
  width: number
  height: number
  attachment_slot: number
  created_at: string
}

type OperatorParticipantRow = {
  conversation_id: string
  principal_type: 'rep' | 'onboarding_guest' | 'support_queue'
  role: string
  unread_count: number
  rep:
    | { display_name: string | null; business_name: string | null }
    | Array<{ display_name: string | null; business_name: string | null }>
    | null
}

function operatorParticipantLabel(row: OperatorParticipantRow | undefined) {
  if (!row) return null
  const rep = Array.isArray(row.rep) ? row.rep[0] : row.rep
  return normalizeBody(rep?.business_name) || normalizeBody(rep?.display_name) || null
}

const CONVERSATION_SELECT =
  'id, conversation_type, state, subject, context_snapshot, last_message_at, latest_message_preview, latest_message_sender_display_name, updated_at'
const PARTICIPANT_SELECT =
  'id, conversation_id, principal_type, rep_id, role, membership_state, last_read_at, archived_at, muted_at, unread_count'
const MESSAGE_SELECT =
  'id, conversation_id, sender_principal_type, sender_rep_id, sender_display_name, kind, body, metadata, moderated_at, created_at'

function serviceFailure(code: string, message: string, userMessage: string, cause: unknown) {
  return new ServiceError({ code, message, userMessage, statusCode: 500, cause })
}

function normalizeBody(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function preview(body: string) {
  const compact = body.replace(/\s+/g, ' ').trim()
  return compact.length > 180 ? `${compact.slice(0, 177)}…` : compact
}

function viewType(view: WorkspaceConversationView | undefined) {
  if (view === 'team') return 'team_onboarding'
  if (view === 'rep_network') return 'rep_direct'
  if (view === 'support') return 'support'
  return null
}

function makeSummary(args: {
  conversation: ConversationRow
  ownParticipant: ParticipantRow
  participants?: ParticipantRow[]
  messages?: MessageRow[]
}): WorkspaceConversationSummary {
  const rows = args.messages ?? []
  const latest = rows[0]
  const labels = Array.from(
    new Set(
      rows
        .filter((message) => message.sender_rep_id !== args.ownParticipant.rep_id)
        .map((message) => message.sender_display_name)
        .filter(Boolean),
    ),
  )
  const isRepDirect = args.conversation.conversation_type === 'rep_direct'
  const requestState = isRepDirect
    ? args.conversation.state === 'pending'
      ? 'pending'
      : args.conversation.state === 'blocked'
        ? 'blocked'
        : args.conversation.state === 'open'
          ? 'accepted'
          : 'declined'
    : undefined

  return {
    kind: 'conversation',
    id: args.conversation.id,
    conversationId: args.conversation.id,
    conversationType: args.conversation.conversation_type,
    type: args.conversation.conversation_type,
    state: args.conversation.state,
    subject: args.conversation.subject,
    participantLabels: labels.length > 0
      ? labels
      : [args.conversation.latest_message_sender_display_name ?? args.conversation.subject],
    senderDisplayName: labels[0] ?? args.conversation.latest_message_sender_display_name ?? args.conversation.subject,
    latestMessagePreview: latest ? preview(latest.body) : args.conversation.latest_message_preview,
    lastMessageAt: args.conversation.last_message_at,
    updatedAt: args.conversation.updated_at,
    unreadCount: args.ownParticipant.unread_count,
    isArchived: Boolean(args.ownParticipant.archived_at),
    isMuted: Boolean(args.ownParticipant.muted_at),
    archivedAt: args.ownParticipant.archived_at,
    mutedAt: args.ownParticipant.muted_at,
    membershipState: args.ownParticipant.membership_state,
    ...(isRepDirect
      ? {
          requestDirection: args.ownParticipant.role === 'requester' ? 'outgoing' as const : 'incoming' as const,
          requestState,
        }
      : {}),
    context: args.conversation.context_snapshot ?? {},
  }
}

export async function listRepConversations(
  supabase: SupabaseClient,
  repId: string,
  options: {
    view?: WorkspaceConversationView
    limit?: number
    archived?: boolean
    beforeLastMessageAt?: string
    beforeId?: string
    equalTimestampMode?: 'include_all' | 'same_kind' | 'exclude_all'
  } = {},
) {
  // This RPC joins and filters before limiting. The former two-query shape
  // limited an arbitrary membership prefix first, which could omit a matching
  // Team, Support, or Rep Network thread and undercount unread messages.
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 1000)
  const filterType = viewType(options.view)
  const result = await supabase.rpc('list_workspace_rep_conversation_page', {
    p_rep_id: repId,
    p_conversation_type: filterType,
    p_archived: options.view === 'archived' || Boolean(options.archived),
    p_limit: limit,
    p_before_last_message_at: options.beforeLastMessageAt ?? null,
    p_before_id: options.beforeId ?? null,
    p_equal_timestamp_mode: options.beforeLastMessageAt
      ? options.equalTimestampMode ?? 'same_kind'
      : null,
  })
  if (result.error) {
    throw serviceFailure(
      'CONVERSATION_LIST_FAILED',
      'failed to load canonical conversation page',
      'Messages could not be loaded right now.',
      result.error,
    )
  }
  const rows = (result.data ?? []) as unknown as ConversationPageRow[]
  const summaries = rows.map((row) => makeSummary({
    conversation: row,
    ownParticipant: {
      id: row.participant_id,
      conversation_id: row.id,
      principal_type: 'rep',
      rep_id: repId,
      role: row.participant_role,
      membership_state: row.participant_membership_state,
      last_read_at: row.participant_last_read_at,
      archived_at: row.participant_archived_at,
      muted_at: row.participant_muted_at,
      unread_count: row.participant_unread_count,
    },
  }))
  return {
    messages: summaries,
    unreadCount: rows.length > 0 ? Number(rows[0].total_unread ?? 0) : 0,
    nextCursor: null,
  }
}

export async function getRepConversation(
  supabase: SupabaseClient,
  repId: string,
  conversationId: string,
): Promise<WorkspaceConversationDetail> {
  const membership = await requireRepConversationMembership(supabase, repId, conversationId)
  assertRepConversationAction(membership, 'read')
  const [conversationResult, participantsResult, messagesResult, attachmentsResult] = await Promise.all([
    supabase.from('workspace_conversations').select(CONVERSATION_SELECT).eq('id', conversationId).single(),
    supabase.from('workspace_conversation_participants').select(PARTICIPANT_SELECT).eq('conversation_id', conversationId),
    supabase.from('workspace_conversation_messages').select(MESSAGE_SELECT).eq('conversation_id', conversationId).order('created_at', { ascending: true }).order('id', { ascending: true }),
    supabase
      .from('workspace_conversation_attachments')
      .select('id, content_type, byte_size, width, height, attachment_slot, created_at')
      .eq('conversation_id', conversationId)
      .order('attachment_slot', { ascending: true }),
  ])
  if (
    conversationResult.error ||
    participantsResult.error ||
    messagesResult.error ||
    attachmentsResult.error ||
    !conversationResult.data
  ) {
    throw serviceFailure(
      'CONVERSATION_LOAD_FAILED',
      'failed to load conversation detail',
      'That conversation could not be loaded right now.',
      conversationResult.error ??
        participantsResult.error ??
        messagesResult.error ??
        attachmentsResult.error,
    )
  }
  const conversation = conversationResult.data as unknown as ConversationRow
  const participants = (participantsResult.data ?? []) as unknown as ParticipantRow[]
  const rows = (messagesResult.data ?? []) as unknown as MessageRow[]
  const own = participants.find((row) => row.rep_id === repId)
  if (!own) throw new ServiceError({ code: 'CONVERSATION_FORBIDDEN', message: 'membership disappeared', statusCode: 403 })
  const summary = makeSummary({
    conversation,
    ownParticipant: own,
    participants,
    messages: [...rows].reverse(),
  })
  return {
    conversation: summary,
    messages: rows.map((row) => ({
      id: row.id,
      senderType: row.sender_principal_type,
      senderLabel: row.sender_display_name,
      body: row.moderated_at ? 'This message is unavailable.' : row.body,
      kind: row.kind,
      createdAt: row.created_at,
      isOwn: row.sender_rep_id === repId,
      isModerated: Boolean(row.moderated_at),
      metadata: row.metadata ?? {},
    })),
    attachments: ((attachmentsResult.data ?? []) as unknown as AttachmentRow[]).map(
      (attachment) => ({
        id: attachment.id,
        contentType: attachment.content_type,
        byteSize: attachment.byte_size,
        width: attachment.width,
        height: attachment.height,
        slot: attachment.attachment_slot,
        createdAt: attachment.created_at,
        signedReadHref: `/api/nic-nac/conversations/${conversationId}/attachments/${attachment.id}`,
      }),
    ),
  }
}

export async function sendRepConversationMessage(
  supabase: SupabaseClient,
  input: {
    repId: string
    repDisplayName: string
    conversationId: string
    body: unknown
    clientRequestId: string
  },
) {
  const membership = await requireRepConversationMembership(supabase, input.repId, input.conversationId)
  assertRepConversationAction(membership, 'send')
  assertWorkspaceConversationComposingEnabled(membership.conversationType)
  const body = normalizeBody(input.body)
  const requestId = normalizeBody(input.clientRequestId)
  if (!body || body.length > 10000 || !requestId || requestId.length > 180) {
    throw new ServiceError({
      code: 'INVALID_MESSAGE',
      message: 'message body or client request id is invalid',
      userMessage: 'Write a message before sending it.',
      statusCode: 400,
    })
  }
  if (membership.conversationType === 'rep_direct') {
    const direct = await supabase.rpc('send_workspace_rep_direct_message', {
      p_conversation_id: input.conversationId,
      p_sender_rep_id: input.repId,
      p_sender_display_name: normalizeBody(input.repDisplayName) || 'Sparkle Suite rep',
      p_body: body,
      p_client_request_id: requestId,
    })
    const row = Array.isArray(direct.data) ? direct.data[0] : direct.data
    if (direct.error || !row) {
      const message = String((direct.error as { message?: unknown } | null)?.message ?? '')
      if (message.includes('message limit')) throw new ServiceError({ code: 'REP_NETWORK_MESSAGE_LIMIT', message, userMessage: 'You have reached the current Rep Network message limit. Try again a little later.', statusCode: 429 })
      if (message.includes('blocked')) throw new ServiceError({ code: 'REP_NETWORK_BLOCKED', message, userMessage: 'Messaging is unavailable between these reps.', statusCode: 403 })
      if (message.includes('suspended') || message.includes('eligibility')) throw new ServiceError({ code: 'REP_NETWORK_NOT_ELIGIBLE', message, userMessage: 'Rep Network messaging is currently unavailable.', statusCode: 403 })
      throw serviceFailure('MESSAGE_SEND_FAILED', 'failed to save atomic rep direct message', 'Your message could not be sent right now.', direct.error)
    }
    const saved = row as MessageRow
    return {
      id: saved.id,
      conversationId: saved.conversation_id,
      senderType: saved.sender_principal_type,
      senderLabel: saved.sender_display_name,
      body: saved.body,
      kind: saved.kind,
      createdAt: saved.created_at,
      isOwn: true,
      isModerated: false,
      metadata: saved.metadata ?? {},
    }
  }
  const senderIdentityKey = `rep:${input.repId}`
  const payload = {
    conversation_id: input.conversationId,
    sender_principal_type: 'rep',
    sender_identity_key: senderIdentityKey,
    sender_rep_id: input.repId,
    sender_display_name: normalizeBody(input.repDisplayName) || 'Sparkle Suite rep',
    kind: 'message',
    body,
    client_request_id: requestId,
  }
  const { data, error } = await supabase
    .from('workspace_conversation_messages')
    .upsert(payload, { onConflict: 'conversation_id,sender_identity_key,client_request_id', ignoreDuplicates: true })
    .select(MESSAGE_SELECT)
    .maybeSingle()
  if (error) {
    throw serviceFailure('MESSAGE_SEND_FAILED', 'failed to save conversation message', 'Your message could not be sent right now.', error)
  }
  let saved = data as unknown as MessageRow | null
  if (!saved) {
    const existing = await supabase
      .from('workspace_conversation_messages')
      .select(MESSAGE_SELECT)
      .eq('conversation_id', input.conversationId)
      .eq('sender_identity_key', senderIdentityKey)
      .eq('client_request_id', requestId)
      .single()
    if (existing.error || !existing.data) {
      throw serviceFailure('MESSAGE_SEND_FAILED', 'failed to resolve idempotent message', 'Your message could not be sent right now.', existing.error)
    }
    saved = existing.data as unknown as MessageRow
  }
  await Promise.all([
    supabase.from('workspace_conversations').update({ last_message_at: saved.created_at, updated_at: saved.created_at }).eq('id', input.conversationId),
    supabase.from('workspace_conversation_participants').update({ last_read_at: saved.created_at, updated_at: saved.created_at }).eq('conversation_id', input.conversationId).eq('rep_id', input.repId),
  ])
  return {
    id: saved.id,
    conversationId: saved.conversation_id,
    senderType: saved.sender_principal_type,
    senderLabel: saved.sender_display_name,
    body: saved.body,
    kind: saved.kind,
    createdAt: saved.created_at,
    isOwn: true,
    isModerated: false,
    metadata: saved.metadata ?? {},
  }
}

export async function updateRepConversationState(
  supabase: SupabaseClient,
  input: {
    repId: string
    conversationId: string
    read?: boolean
    archived?: boolean
    muted?: boolean
  },
) {
  const membership = await requireRepConversationMembership(supabase, input.repId, input.conversationId)
  assertRepConversationAction(membership, 'mark_state')
  if (input.read === undefined && input.archived === undefined && input.muted === undefined) {
    throw new ServiceError({ code: 'INVALID_STATE_UPDATE', message: 'no state requested', userMessage: 'Choose a message state to update.' })
  }
  const now = new Date().toISOString()
  const update: Record<string, string | number | null> = { updated_at: now }
  if (input.read !== undefined) {
    update.last_read_at = input.read ? now : null
    if (input.read) update.unread_count = 0
  }
  if (input.archived !== undefined) update.archived_at = input.archived ? now : null
  if (input.muted !== undefined) update.muted_at = input.muted ? now : null
  const { data, error } = await supabase
    .from('workspace_conversation_participants')
    .update(update)
    .eq('id', membership.id)
    .eq('rep_id', input.repId)
    .select(PARTICIPANT_SELECT)
    .single()
  if (error || !data) {
    throw serviceFailure('CONVERSATION_STATE_UPDATE_FAILED', 'failed to update own participant state', 'That message state could not be saved.', error)
  }
  const row = data as unknown as ParticipantRow
  return {
    conversationId: row.conversation_id,
    isRead: Boolean(row.last_read_at),
    isArchived: Boolean(row.archived_at),
    isMuted: Boolean(row.muted_at),
  }
}

export async function listOperatorConversations(
  supabase: SupabaseClient,
  options: { type?: WorkspaceConversationType; state?: WorkspaceConversationState; reportedOnly?: boolean; limit?: number; offset?: number; query?: string } = {},
) {
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 100)
  const search = operatorConversationSearch(options.query)
  let query = supabase.from('workspace_conversations').select(CONVERSATION_SELECT + (search ? `,${search.select}` : ''))
  if (search) {
    query = query
      .eq('search_requester.principal_type', 'rep')
      .eq('search_requester.role', 'requester')
      .or(search.repFilter, { referencedTable: 'search_requester.search_rep' })
      .or(search.conversationFilter)
  }
  if (options.type) query = query.eq('conversation_type', options.type)
  if (options.state) query = query.eq('state', options.state)
  const reported = await supabase
    .from('workspace_conversation_reports')
    .select('conversation_id')
    .in('status', ['open', 'reviewing'])
  if (reported.error) throw serviceFailure('OPERATOR_CONVERSATION_LIST_FAILED', 'failed to load reported conversation ids', 'Network Safety could not be loaded.', reported.error)
  const reportedIds = Array.from(new Set((reported.data ?? []).map((row) => row.conversation_id as string)))
  if (options.reportedOnly || options.type === 'rep_direct') {
    if (reportedIds.length === 0) return { conversations: [], nextCursor: null }
    query = query.in('id', reportedIds)
  } else if (!options.type) {
    query = reportedIds.length > 0
      ? query.or(`conversation_type.neq.rep_direct,id.in.(${reportedIds.join(',')})`)
      : query.neq('conversation_type', 'rep_direct')
  }
  const ordered = query.order('last_message_at', { ascending: false }).order('id', { ascending: false })
  const { data, error } = await (options.offset === undefined ? ordered.limit(limit) : ordered.range(options.offset, options.offset + limit - 1))
  if (error) throw serviceFailure('OPERATOR_CONVERSATION_LIST_FAILED', 'failed to list operator conversations', 'Conversations could not be loaded.', error)
  const rows = (data ?? []) as unknown as ConversationRow[]
  if (rows.length === 0) return { conversations: [], nextCursor: null }
  const ids = rows.map((row) => row.id)
  const [reports, moderationReports, participants] = await Promise.all([
    supabase.from('support_reports').select('id, workspace_conversation_id, status, report_type, urgency, title, audit_status, created_at, client_snapshot, sparkle_suite_bug_hunt_items(id)').in('workspace_conversation_id', ids),
    supabase.from('workspace_conversation_reports').select('conversation_id, status').in('conversation_id', ids),
    supabase
      .from('workspace_conversation_participants')
      .select('conversation_id, principal_type, role, unread_count, rep:reps!workspace_conversation_participants_rep_id_fkey(display_name, business_name)')
      .in('conversation_id', ids),
  ])
  if (reports.error || moderationReports.error || participants.error) throw serviceFailure('OPERATOR_CONVERSATION_LIST_FAILED', 'failed to load operator conversation context', 'Conversations could not be loaded.', reports.error ?? moderationReports.error ?? participants.error)
  const reportRows = (reports.data ?? []) as Array<Record<string, unknown>>
  const participantRows = (participants.data ?? []) as unknown as OperatorParticipantRow[]
  return {
    conversations: rows.map((row) => {
      const report = reportRows.find((item) => item.workspace_conversation_id === row.id)
      const taskRelation = report?.sparkle_suite_bug_hunt_items
      const task = Array.isArray(taskRelation) ? taskRelation[0] : taskRelation
      const requester = participantRows.find(
        (participant) =>
          participant.conversation_id === row.id &&
          participant.principal_type === 'rep' &&
          participant.role === 'requester',
      )
      const supportQueue = participantRows.find(
        (participant) =>
          participant.conversation_id === row.id &&
          participant.principal_type === 'support_queue',
      )
      const requesterLabel = operatorParticipantLabel(requester)
      return {
        id: row.id,
        type: row.conversation_type,
        state: row.state,
        subject: row.subject,
        updatedAt: row.updated_at,
        unreadCount:
          row.conversation_type === 'support' ? supportQueue?.unread_count ?? 0 : 0,
        participantLabels:
          row.conversation_type === 'support' && requesterLabel
            ? [requesterLabel]
            : row.latest_message_sender_display_name
              ? [row.latest_message_sender_display_name]
              : [],
        latestMessagePreview: row.latest_message_preview,
        reportedCount: (moderationReports.data ?? []).filter((item) => item.conversation_id === row.id && item.status !== 'dismissed' && item.status !== 'resolved').length,
        supportReport: report ? {
          id: report.id,
          status: report.status,
          reportType: report.report_type,
          urgency: report.urgency,
          title: report.title,
          auditStatus: report.audit_status,
          createdAt: report.created_at,
          clientSnapshot: report.client_snapshot,
          taskId: task && typeof task === 'object' && 'id' in task ? task.id : null,
        } : undefined,
      }
    }),
    nextCursor: null,
  }
}

function normalizeOperatorSupportReport(report: Record<string, unknown> | null) {
  if (!report) return undefined
  const taskRelation = report.sparkle_suite_bug_hunt_items
  const task = Array.isArray(taskRelation) ? taskRelation[0] : taskRelation
  return {
    id: report.id,
    status: report.status,
    reportType: report.report_type,
    urgency: report.urgency,
    title: report.title,
    details: report.details,
    pageOrWorkflow: report.page_or_workflow,
    auditStatus: report.audit_status,
    createdAt: report.created_at,
    clientSnapshot: report.client_snapshot,
    supportAudits: report.support_audits ?? [],
    taskId: task && typeof task === 'object' && 'id' in task ? task.id : null,
  }
}

export async function getOperatorConversation(supabase: SupabaseClient, conversationId: string, options: { markRead?: boolean } = {}) {
  const [conversation, messages, report, moderationReports, attachments, participants] = await Promise.all([
    supabase.from('workspace_conversations').select(CONVERSATION_SELECT).eq('id', conversationId).single(),
    supabase.from('workspace_conversation_messages').select(MESSAGE_SELECT).eq('conversation_id', conversationId).order('created_at', { ascending: true }).order('id', { ascending: true }),
    supabase.from('support_reports').select('id, workspace_conversation_id, status, report_type, urgency, title, details, page_or_workflow, audit_status, created_at, client_snapshot, support_audits(status, findings, recommended_first_action, ai_summary, template_summary, created_at), sparkle_suite_bug_hunt_items(id)').eq('workspace_conversation_id', conversationId).maybeSingle(),
    supabase.from('workspace_conversation_reports').select('id, reason, details, status, message_id, reporter_rep_id, created_at, reporter:reps!workspace_conversation_reports_reporter_rep_id_fkey(display_name, business_name)').eq('conversation_id', conversationId).order('created_at', { ascending: false }),
    supabase.from('workspace_conversation_attachments').select('id, content_type, byte_size, width, height, attachment_slot, created_at').eq('conversation_id', conversationId).order('attachment_slot', { ascending: true }),
    supabase
      .from('workspace_conversation_participants')
      .select('conversation_id, principal_type, role, unread_count, rep:reps!workspace_conversation_participants_rep_id_fkey(display_name, business_name)')
      .eq('conversation_id', conversationId),
  ])
  if (conversation.error || !conversation.data || messages.error || report.error || moderationReports.error || attachments.error || participants.error) {
    throw serviceFailure('OPERATOR_CONVERSATION_LOAD_FAILED', 'failed to load operator conversation', 'That conversation could not be loaded.', conversation.error ?? messages.error ?? report.error ?? moderationReports.error ?? attachments.error ?? participants.error)
  }
  const row = conversation.data as unknown as ConversationRow
  const reportRow = report.data as Record<string, unknown> | null
  if (row.conversation_type === 'rep_direct' && !(moderationReports.data ?? []).some((item) => item.status === 'open' || item.status === 'reviewing')) {
    throw new ServiceError({ code: 'OPERATOR_REP_CONVERSATION_PRIVATE', message: 'unreported rep direct conversation is private', userMessage: 'That Rep Network conversation is not available for operator review.', statusCode: 404 })
  }
  const participantRows = (participants.data ?? []) as unknown as OperatorParticipantRow[]
  const requester = participantRows.find(
    (participant) =>
      participant.principal_type === 'rep' && participant.role === 'requester',
  )
  const supportQueue = participantRows.find(
    (participant) => participant.principal_type === 'support_queue',
  )
  const requesterLabel = operatorParticipantLabel(requester)
  if (row.conversation_type === 'support' && supportQueue && options.markRead !== false) {
    const markedRead = await supabase
      .from('workspace_conversation_participants')
      .update({
        last_read_at: new Date().toISOString(),
        unread_count: 0,
        updated_at: new Date().toISOString(),
      })
      .eq('conversation_id', conversationId)
      .eq('principal_type', 'support_queue')
    if (markedRead.error) {
      throw serviceFailure(
        'OPERATOR_CONVERSATION_READ_FAILED',
        'failed to mark support queue conversation read',
        'That conversation opened, but its unread state could not be updated.',
        markedRead.error,
      )
    }
  }
  return {
    conversation: {
      id: row.id,
      type: row.conversation_type,
      state: row.state,
      subject: row.subject,
      updatedAt: row.updated_at,
      unreadCount: options.markRead === false ? supportQueue?.unread_count ?? 0 : 0,
      participantLabels: requesterLabel ? [requesterLabel] : [],
      latestMessagePreview: row.latest_message_preview,
    },
    messages: ((messages.data ?? []) as unknown as MessageRow[]).map((message) => ({
      id: message.id,
      senderType: message.sender_principal_type === 'support_queue' ? 'operator' : message.sender_principal_type,
      senderLabel: message.sender_display_name,
      body: message.moderated_at ? 'This message is unavailable.' : message.body,
      createdAt: message.created_at,
      kind: message.kind,
      isInternal: false,
    })),
    supportReport: normalizeOperatorSupportReport(reportRow),
    attachments: (attachments.data ?? []).map((attachment) => ({
      id: attachment.id,
      contentType: attachment.content_type,
      byteSize: attachment.byte_size,
      width: attachment.width,
      height: attachment.height,
      slot: attachment.attachment_slot,
      createdAt: attachment.created_at,
      signedReadHref: `/api/control-center/conversations/${conversationId}/attachments/${attachment.id}`,
    })),
    reports: (moderationReports.data ?? []).map((item) => {
      const reporter = Array.isArray(item.reporter) ? item.reporter[0] : item.reporter
      return {
        id: item.id,
        reason: item.reason,
        details: item.details,
        status: item.status,
        messageId: item.message_id,
        reporterLabel: reporter?.business_name || reporter?.display_name || 'Sparkle Suite rep',
        createdAt: item.created_at,
      }
    }),
  }
}

export async function sendOperatorSupportReply(
  supabase: SupabaseClient,
  input: { conversationId: string; operatorId: string; body: unknown; clientRequestId: string },
) {
  assertWorkspaceConversationComposingEnabled('support')
  const body = normalizeBody(input.body)
  const clientRequestId = normalizeBody(input.clientRequestId)
  if (!body || body.length > 10000 || !clientRequestId) {
    throw new ServiceError({ code: 'INVALID_MESSAGE', message: 'operator support reply is invalid', userMessage: 'Write a reply first.' })
  }
  const conversation = await supabase.from('workspace_conversations').select('id, conversation_type, state').eq('id', input.conversationId).maybeSingle()
  if (conversation.error || !conversation.data || conversation.data.conversation_type !== 'support') {
    throw new ServiceError({ code: 'SUPPORT_CONVERSATION_NOT_FOUND', message: 'support conversation not found', statusCode: 404 })
  }
  if (conversation.data.state === 'closed' || conversation.data.state === 'blocked') {
    throw new ServiceError({ code: 'CONVERSATION_NOT_REPLYABLE', message: 'closed support conversation', statusCode: 409 })
  }
  const payload = {
    conversation_id: input.conversationId,
    sender_principal_type: 'support_queue',
    sender_identity_key: 'support:sparkle_suite_support',
    sender_principal_key: 'sparkle_suite_support',
    sender_display_name: 'Sparkle Suite Support',
    operator_actor_id: input.operatorId,
    kind: 'message',
    body,
    client_request_id: clientRequestId,
  }
  const { data, error } = await supabase
    .from('workspace_conversation_messages')
    .upsert(payload, { onConflict: 'conversation_id,sender_identity_key,client_request_id', ignoreDuplicates: true })
    .select(MESSAGE_SELECT)
    .maybeSingle()
  if (error) throw serviceFailure('OPERATOR_REPLY_FAILED', 'failed to save operator support reply', 'The reply could not be sent.', error)
  const saved = data ?? (await supabase.from('workspace_conversation_messages').select(MESSAGE_SELECT).eq('conversation_id', input.conversationId).eq('sender_identity_key', 'support:sparkle_suite_support').eq('client_request_id', clientRequestId).single()).data
  if (!saved) throw serviceFailure('OPERATOR_REPLY_FAILED', 'idempotent operator reply missing', 'The reply could not be sent.', null)
  const message = saved as unknown as MessageRow
  await Promise.all([
    supabase.from('workspace_conversations').update({ last_message_at: message.created_at, updated_at: message.created_at }).eq('id', input.conversationId),
    supabase.from('workspace_conversation_audit_events').upsert({ conversation_id: input.conversationId, message_id: message.id, actor_type: 'operator', actor_id: input.operatorId, event_type: 'operator_reply_sent', details: {}, idempotency_key: `operator-reply:${input.conversationId}:${clientRequestId}` }, { onConflict: 'idempotency_key', ignoreDuplicates: true }),
  ])
  return { id: message.id, senderType: 'support_queue', senderLabel: 'Sparkle Suite Support', body: message.body, createdAt: message.created_at, kind: message.kind, isInternal: false }
}
