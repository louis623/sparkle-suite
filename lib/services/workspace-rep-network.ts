import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ServiceError } from '@/lib/services/errors'
import { requireRepConversationMembership, assertRepConversationAction } from '@/lib/services/workspace-conversation-permissions'
import { assertWorkspaceConversationComposingEnabled } from '@/lib/services/workspace-conversation-feature-flags'

export const REP_NETWORK_LIMITS = {
  newRequestsPerRollingDay: 5,
  messagesPerRollingHour: 60,
  reportsPerConversation: 3,
} as const

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

type RepMessageContextType =
  | 'dance_floor_dancer'
  | 'trade_request'
  | 'rep_profile'

type SafeRepMessageContext = {
  type: RepMessageContextType
  id: string
  snapshot: {
    label: string
    value: string
    href: string
    source: RepMessageContextType
  }
}

async function loadPublicRepIdentity(supabase: SupabaseClient, repId: string) {
  const { data, error } = await supabase
    .from('reps')
    .select('id, display_name, business_name, status')
    .eq('id', repId)
    .maybeSingle()
  if (error || !data) {
    throw new ServiceError({ code: 'REP_NETWORK_RECIPIENT_NOT_FOUND', message: 'target rep not found', userMessage: 'That rep is not available for messaging.', statusCode: 404, cause: error })
  }
  return {
    id: data.id as string,
    label: normalizeText(data.business_name) || normalizeText(data.display_name) || 'Sparkle Suite rep',
  }
}

function relatedRecordMissing() {
  return new ServiceError({
    code: 'REP_NETWORK_CONTEXT_NOT_FOUND',
    message: 'rep message request context was not found or is not shareable',
    userMessage: 'That related Workspace item is no longer available.',
    statusCode: 404,
  })
}

export async function buildSafeRepMessageRequestContext(
  supabase: SupabaseClient,
  input: {
    senderRepId: string
    recipientRepId: string
    recipientLabel: string
    contextType?: RepMessageContextType
    contextId?: string
  },
): Promise<SafeRepMessageContext> {
  const contextType = input.contextType ?? 'rep_profile'

  if (contextType === 'rep_profile') {
    if (input.contextId && input.contextId !== input.recipientRepId) {
      throw relatedRecordMissing()
    }
    return {
      type: 'rep_profile',
      id: input.recipientRepId,
      snapshot: {
        label: 'Rep Network',
        value: input.recipientLabel.slice(0, 160),
        href: '/nic-nac?section=messages&view=rep-network',
        source: 'rep_profile',
      },
    }
  }

  if (!input.contextId) throw relatedRecordMissing()

  if (contextType === 'dance_floor_dancer') {
    const listing = await supabase
      .from('trade_listings')
      .select('id, rep_id, design:jewelry_designs(item_number, design_name)')
      .eq('id', input.contextId)
      .maybeSingle()
    if (listing.error) {
      throw new ServiceError({
        code: 'REP_NETWORK_CONTEXT_LOAD_FAILED',
        message: 'failed to validate dancer context',
        userMessage: 'That related dancer could not be checked right now.',
        statusCode: 500,
        cause: listing.error,
      })
    }
    if (!listing.data || listing.data.rep_id !== input.recipientRepId) {
      throw relatedRecordMissing()
    }
    const rawDesign = listing.data.design
    const design = Array.isArray(rawDesign) ? rawDesign[0] : rawDesign
    const itemNumber = normalizeText(design?.item_number)
    const designName = normalizeText(design?.design_name)
    return {
      type: contextType,
      id: input.contextId,
      snapshot: {
        label: 'Dance Floor dancer',
        value: (itemNumber || designName || 'Related dancer').slice(0, 160),
        href: '/nic-nac?section=trade-board',
        source: contextType,
      },
    }
  }

  const tradeRequest = await supabase
    .from('trade_requests')
    .select('id, listing:trade_listings(rep_id)')
    .eq('id', input.contextId)
    .maybeSingle()
  if (tradeRequest.error) {
    throw new ServiceError({
      code: 'REP_NETWORK_CONTEXT_LOAD_FAILED',
      message: 'failed to validate trade request context',
      userMessage: 'That related swap request could not be checked right now.',
      statusCode: 500,
      cause: tradeRequest.error,
    })
  }
  const rawListing = tradeRequest.data?.listing
  const listing = Array.isArray(rawListing) ? rawListing[0] : rawListing
  if (
    !tradeRequest.data ||
    !listing ||
    ![input.senderRepId, input.recipientRepId].includes(listing.rep_id)
  ) {
    throw relatedRecordMissing()
  }
  return {
    type: contextType,
    id: input.contextId,
    snapshot: {
      label: 'Swap request',
      value: 'Related swap request',
      href: '/nic-nac?section=trade-board',
      source: contextType,
    },
  }
}

export async function createRepMessageRequest(
  supabase: SupabaseClient,
  input: {
    senderRepId: string
    senderDisplayName: string
    recipientRepId: string
    body: unknown
    clientRequestId: string
    subject?: unknown
    contextType?: RepMessageContextType
    contextId?: string
  },
) {
  assertWorkspaceConversationComposingEnabled('rep_direct')
  const body = normalizeText(input.body)
  const clientRequestId = normalizeText(input.clientRequestId)
  if (!body || body.length > 10000 || !clientRequestId) {
    throw new ServiceError({ code: 'INVALID_MESSAGE_REQUEST', message: 'request body and client id required', userMessage: 'Write a short introduction first.' })
  }
  const recipient = await loadPublicRepIdentity(supabase, input.recipientRepId)
  const context = await buildSafeRepMessageRequestContext(supabase, {
    senderRepId: input.senderRepId,
    recipientRepId: input.recipientRepId,
    recipientLabel: recipient.label,
    contextType: input.contextType,
    contextId: input.contextId,
  })
  const subject = normalizeText(input.subject) || `Message request for ${recipient.label}`
  const { data, error } = await supabase.rpc('create_workspace_rep_message_request', {
    p_sender_rep_id: input.senderRepId,
    p_sender_display_name: normalizeText(input.senderDisplayName) || 'Sparkle Suite rep',
    p_recipient_rep_id: input.recipientRepId,
    p_subject: subject,
    p_body: body,
    p_client_request_id: clientRequestId,
    p_context_type: context.type,
    p_context_id: context.id,
    p_context_snapshot: context.snapshot,
  })
  const row = Array.isArray(data) ? data[0] : data
  if (error || !row) {
    const message = String((error as { message?: unknown } | null)?.message ?? '')
    if (message.includes('request limit')) throw new ServiceError({ code: 'REP_NETWORK_REQUEST_LIMIT', message, userMessage: 'You have reached today’s new message request limit.', statusCode: 429 })
    if (message.includes('blocked')) throw new ServiceError({ code: 'REP_NETWORK_BLOCKED', message, userMessage: 'Messaging is unavailable between these reps.', statusCode: 403 })
    if (message.includes('suspended')) throw new ServiceError({ code: 'REP_NETWORK_SUSPENDED', message, userMessage: 'Rep Network messaging is currently unavailable.', statusCode: 403 })
    throw new ServiceError({ code: 'REP_NETWORK_REQUEST_CREATE_FAILED', message: 'failed to create atomic rep message request', userMessage: 'That message request could not be sent right now.', statusCode: 500, cause: error })
  }
  return {
    conversationId: row.conversation_id as string,
    state: row.conversation_state as string,
    created: Boolean(row.was_created),
  }
}

export async function decideRepMessageRequest(
  supabase: SupabaseClient,
  input: { repId: string; conversationId: string; decision: 'accept' | 'decline' | 'decline_and_block'; reason?: string },
) {
  const membership = await requireRepConversationMembership(supabase, input.repId, input.conversationId)
  assertRepConversationAction(membership, 'decide_request')
  const result = await supabase.rpc('decide_workspace_rep_message_request', {
    p_conversation_id: input.conversationId,
    p_recipient_rep_id: input.repId,
    p_decision: input.decision,
    p_reason: normalizeText(input.reason),
  })
  const row = Array.isArray(result.data) ? result.data[0] : result.data
  if (result.error || !row) {
    const message = String((result.error as { message?: unknown } | null)?.message ?? '')
    if (message.includes('not pending') || message.includes('recipient membership')) {
      throw new ServiceError({ code: 'MESSAGE_REQUEST_NOT_PENDING', message, userMessage: 'That message request has already been handled.', statusCode: 409, cause: result.error })
    }
    throw new ServiceError({ code: 'MESSAGE_REQUEST_DECISION_FAILED', message: 'atomic request decision failed', userMessage: 'That message request could not be updated right now.', statusCode: 500, cause: result.error })
  }
  return { conversationId: row.conversation_id as string, decision: row.decision as typeof input.decision, state: row.conversation_state as string }
}

export async function reportRepNetworkConversation(
  supabase: SupabaseClient,
  input: { repId: string; conversationId: string; messageId?: string; reason: 'spam' | 'harassment' | 'recruiting' | 'unsafe' | 'other'; details?: string },
) {
  const membership = await requireRepConversationMembership(supabase, input.repId, input.conversationId)
  assertRepConversationAction(membership, 'report')
  if (membership.conversationType !== 'rep_direct') throw new ServiceError({ code: 'INVALID_REPORT_TARGET', message: 'only rep network conversations can be reported' })
  const result = await supabase.rpc('create_workspace_rep_conversation_report', {
    p_conversation_id: input.conversationId,
    p_reporter_rep_id: input.repId,
    p_message_id: input.messageId ?? null,
    p_reason: input.reason,
    p_details: normalizeText(input.details),
  })
  const row = Array.isArray(result.data) ? result.data[0] : result.data
  if (result.error || !row) {
    const message = String((result.error as { message?: unknown } | null)?.message ?? '')
    if (message.includes('report limit')) throw new ServiceError({ code: 'REPORT_LIMIT_REACHED', message, userMessage: 'This conversation has already been reported for review.', statusCode: 429, cause: result.error })
    if (message.includes('does not belong')) throw new ServiceError({ code: 'INVALID_REPORT_MESSAGE', message, userMessage: 'Choose a message from this conversation.', statusCode: 400, cause: result.error })
    throw new ServiceError({ code: 'CONVERSATION_REPORT_FAILED', message: 'atomic rep conversation report failed', userMessage: 'That report could not be submitted right now.', statusCode: 500, cause: result.error })
  }
  return { id: row.report_id as string, conversationId: input.conversationId, status: row.report_status as string, createdAt: row.created_at as string }
}

export async function blockRepNetworkConversation(
  supabase: SupabaseClient,
  input: { repId: string; conversationId: string; reason?: string },
) {
  const membership = await requireRepConversationMembership(supabase, input.repId, input.conversationId)
  assertRepConversationAction(membership, 'read')
  if (membership.conversationType !== 'rep_direct') {
    throw new ServiceError({ code: 'INVALID_BLOCK_TARGET', message: 'only rep network conversations can be blocked', userMessage: 'Blocking is available only for conversations with another rep.' })
  }
  const { data, error } = await supabase.rpc('block_workspace_rep_conversation', {
    p_conversation_id: input.conversationId,
    p_blocker_rep_id: input.repId,
    p_reason: normalizeText(input.reason),
  })
  const row = Array.isArray(data) ? data[0] : data
  if (error || !row) {
    throw new ServiceError({ code: 'REP_NETWORK_BLOCK_FAILED', message: 'failed to block rep network conversation', userMessage: 'That conversation could not be blocked right now.', statusCode: 500, cause: error })
  }
  return { conversationId: row.conversation_id as string, blockedRepId: row.blocked_rep_id as string, state: row.conversation_state as 'blocked' }
}

export async function setRepNetworkSuspension(
  supabase: SupabaseClient,
  input: { repId: string; operatorId: string; suspended: boolean; reason: string },
) {
  const now = new Date().toISOString()
  const result = await supabase.from('workspace_rep_messaging_suspensions').upsert({
    rep_id: input.repId,
    reason: normalizeText(input.reason) || 'Operator safety review',
    suspended_at: input.suspended ? now : undefined,
    suspended_by_actor: input.operatorId,
    lifted_at: input.suspended ? null : now,
    lifted_by_actor: input.suspended ? null : input.operatorId,
  }, { onConflict: 'rep_id' }).select('rep_id, suspended_at, lifted_at').single()
  if (result.error || !result.data) throw result.error ?? new Error('suspension update missing')
  return { repId: input.repId, suspended: input.suspended, suspendedAt: result.data.suspended_at as string, liftedAt: result.data.lifted_at as string | null }
}

export type RepNetworkModerationAction =
  | 'dismiss_report'
  | 'remove_message'
  | 'close_conversation'
  | 'suspend_sender'

function moderationWriteFailed(operation: string, cause: unknown) {
  return new ServiceError({
    code: 'REP_NETWORK_MODERATION_FAILED',
    message: `rep network moderation failed during ${operation}`,
    userMessage: 'That moderation action could not be completed. Review the conversation and try again.',
    statusCode: 500,
    cause,
  })
}

export async function moderateRepNetworkConversation(
  supabase: SupabaseClient,
  input: {
    conversationId: string
    operatorId: string
    action: RepNetworkModerationAction
    reason: string
    reportId?: string
    messageId?: string
  },
) {
  const conversation = await supabase.from('workspace_conversations').select('id, conversation_type, state').eq('id', input.conversationId).maybeSingle()
  if (conversation.error || !conversation.data || conversation.data.conversation_type !== 'rep_direct') throw new ServiceError({ code: 'REP_NETWORK_CONVERSATION_NOT_FOUND', message: 'rep direct conversation not found', statusCode: 404 })
  let activeReportQuery = supabase
    .from('workspace_conversation_reports')
    .select('id')
    .eq('conversation_id', input.conversationId)
    .in('status', ['open', 'reviewing'])
  if (input.action === 'dismiss_report' && input.reportId) activeReportQuery = activeReportQuery.eq('id', input.reportId)
  const activeReport = await activeReportQuery.limit(1).maybeSingle()
  if (activeReport.error || !activeReport.data) {
    throw new ServiceError({ code: 'MODERATION_REPORT_REQUIRED', message: 'active report required for rep direct moderation', userMessage: 'That Rep Network report is no longer available for moderation.', statusCode: 409, cause: activeReport.error })
  }
  const now = new Date().toISOString()
  let messageId: string | null = null
  let suspendedRepId: string | null = null
  let reportStatus: string | null = null
  if (input.action === 'dismiss_report') {
    if (!input.reportId) throw new ServiceError({ code: 'MODERATION_REPORT_REQUIRED', message: 'report id required' })
    const result = await supabase.from('workspace_conversation_reports').update({ status: 'dismissed', reviewed_at: now, reviewed_by_actor: input.operatorId }).eq('id', input.reportId).eq('conversation_id', input.conversationId).select('id').single()
    if (result.error || !result.data) {
      throw moderationWriteFailed('report dismissal', result.error)
    }
    reportStatus = 'dismissed'
  } else if (input.action === 'remove_message' || input.action === 'suspend_sender') {
    if (!input.messageId) throw new ServiceError({ code: 'MODERATION_MESSAGE_REQUIRED', message: 'message id required' })
    const message = await supabase.from('workspace_conversation_messages').select('id, sender_rep_id').eq('id', input.messageId).eq('conversation_id', input.conversationId).maybeSingle()
    if (message.error || !message.data) throw new ServiceError({ code: 'MODERATION_MESSAGE_NOT_FOUND', message: 'message not found', statusCode: 404 })
    messageId = message.data.id as string
    if (input.action === 'remove_message') {
      const removed = await supabase
        .from('workspace_conversation_messages')
        .update({ moderated_at: now, moderation_reason: normalizeText(input.reason), moderated_by_actor: input.operatorId })
        .eq('id', messageId)
        .eq('conversation_id', input.conversationId)
        .select('id')
        .single()
      if (removed.error || !removed.data) {
        throw moderationWriteFailed('message removal', removed.error)
      }
    } else {
      if (!message.data.sender_rep_id) throw new ServiceError({ code: 'MODERATION_SENDER_NOT_REP', message: 'message sender is not a rep' })
      suspendedRepId = message.data.sender_rep_id as string
      await setRepNetworkSuspension(supabase, { repId: suspendedRepId, operatorId: input.operatorId, suspended: true, reason: input.reason })
    }
  } else if (input.action === 'close_conversation') {
    const closed = await supabase
      .from('workspace_conversations')
      .update({ state: 'blocked', closed_at: now, closed_by_actor: input.operatorId, updated_at: now })
      .eq('id', input.conversationId)
      .select('id')
      .single()
    if (closed.error || !closed.data) {
      throw moderationWriteFailed('conversation close', closed.error)
    }
  }
  const audit = await supabase.from('workspace_conversation_audit_events').insert({
    conversation_id: input.conversationId,
    message_id: messageId,
    actor_type: 'operator',
    actor_id: input.operatorId,
    event_type: `rep_network_${input.action}`,
    details: { reason: normalizeText(input.reason), reportId: input.reportId ?? null, suspendedRepId },
  })
  if (audit.error) throw moderationWriteFailed('audit recording', audit.error)
  return { conversationId: input.conversationId, action: input.action, state: input.action === 'close_conversation' ? 'blocked' : conversation.data.state, reportStatus, messageId, suspendedRepId }
}
