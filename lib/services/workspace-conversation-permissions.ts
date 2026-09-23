import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ServiceError } from '@/lib/services/errors'

export type WorkspaceConversationType = 'team_onboarding' | 'support' | 'rep_direct' | 'owner_direct'
export type WorkspaceConversationState = 'pending' | 'open' | 'resolved' | 'closed' | 'blocked'
export type WorkspaceConversationAction = 'read' | 'send' | 'mark_state' | 'decide_request' | 'report'

export interface RepConversationMembership {
  id: string
  conversationId: string
  conversationType: WorkspaceConversationType
  conversationState: WorkspaceConversationState
  membershipState: 'pending' | 'active' | 'declined' | 'left' | 'blocked'
  role: 'requester' | 'recipient' | 'team_lead'
}
type ParticipantRow = {
  id: string
  conversation_id: string
  membership_state: RepConversationMembership['membershipState']
  role: RepConversationMembership['role']
  workspace_conversations:
    | { conversation_type: WorkspaceConversationType; state: WorkspaceConversationState }
    | Array<{ conversation_type: WorkspaceConversationType; state: WorkspaceConversationState }>
}

function forbidden(message = 'You do not have access to that conversation.') {
  return new ServiceError({
    code: 'CONVERSATION_FORBIDDEN',
    message: 'conversation actor is not authorized',
    userMessage: message,
    statusCode: 403,
  })
}

export async function requireRepConversationMembership(
  supabase: SupabaseClient,
  repId: string,
  conversationId: string,
): Promise<RepConversationMembership> {
  const { data, error } = await supabase
    .from('workspace_conversation_participants')
    .select('id, conversation_id, membership_state, role, workspace_conversations!inner(conversation_type, state)')
    .eq('conversation_id', conversationId)
    .eq('principal_type', 'rep')
    .eq('rep_id', repId)
    .maybeSingle()

  if (error) {
    throw new ServiceError({
      code: 'CONVERSATION_ACCESS_LOOKUP_FAILED',
      message: 'failed to verify conversation membership',
      userMessage: 'That conversation could not be opened right now.',
      statusCode: 500,
      cause: error,
    })
  }
  if (!data) throw forbidden()

  const row = data as unknown as ParticipantRow
  const conversation = Array.isArray(row.workspace_conversations)
    ? row.workspace_conversations[0]
    : row.workspace_conversations
  if (!conversation) throw forbidden()

  return {
    id: row.id,
    conversationId: row.conversation_id,
    conversationType: conversation.conversation_type,
    conversationState: conversation.state,
    membershipState: row.membership_state,
    role: row.role,
  }
}

export function assertRepConversationAction(
  membership: RepConversationMembership,
  action: WorkspaceConversationAction,
) {
  if (membership.membershipState === 'blocked' || membership.membershipState === 'left') {
    throw forbidden('That conversation is no longer available.')
  }

  if (action === 'read' || action === 'mark_state' || action === 'report') {
    if (!['pending', 'active'].includes(membership.membershipState)) throw forbidden()
    return
  }

  if (action === 'decide_request') {
    if (
      membership.conversationType !== 'rep_direct' ||
      membership.conversationState !== 'pending' ||
      membership.role !== 'recipient' ||
      membership.membershipState !== 'pending'
    ) {
      throw new ServiceError({
        code: 'MESSAGE_REQUEST_NOT_PENDING',
        message: 'conversation is not a pending request for this recipient',
        userMessage: 'That message request has already been handled.',
        statusCode: 409,
      })
    }
    return
  }

  if (membership.membershipState !== 'active') throw forbidden()
  if (membership.conversationState === 'closed' || membership.conversationState === 'blocked') {
    throw new ServiceError({
      code: 'CONVERSATION_NOT_REPLYABLE',
      message: `cannot send to ${membership.conversationState} conversation`,
      userMessage: 'That conversation is no longer accepting replies.',
      statusCode: 409,
    })
  }
  if (membership.conversationType === 'rep_direct' && membership.conversationState !== 'open') {
    throw new ServiceError({
      code: 'MESSAGE_REQUEST_NOT_ACCEPTED',
      message: 'rep network request has not been accepted',
      userMessage: 'Messaging opens after the request is accepted.',
      statusCode: 409,
    })
  }
}
