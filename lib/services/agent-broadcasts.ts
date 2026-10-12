import type { SupabaseClient } from '@supabase/supabase-js'

import { ServiceError } from '@/lib/services/errors'
import { previewWorkspaceMessageAudience } from '@/lib/services/workspace-message-audience'
import {
  WORKSPACE_MESSAGE_CATEGORIES,
  normalizeWorkspaceMessageActionUrl,
  normalizeWorkspaceMessageBody,
  normalizeWorkspaceMessageText,
  type WorkspaceMessageCategory,
} from '@/lib/services/workspace-message-permissions'
import { publishWorkspaceMessage } from '@/lib/services/workspace-messages'
import {
  deliverSuiteListNotice,
  publicationNoticeContent,
  renderSuiteOfficialNoticeHtml,
  type SuiteListDelivery,
} from '@/lib/services/suite-official-notice'

export const BROADCAST_AGENT_NAMES = ['suite', 'bunny'] as const
export type BroadcastAgentName = (typeof BROADCAST_AGENT_NAMES)[number]

const OWNER_CATEGORIES = [
  'announcement',
  'business_update',
  'customer_activity',
  'monthly_report',
  'platform_update',
  'help_update',
  'blog',
  'video',
] as const satisfies readonly WorkspaceMessageCategory[]

export type AgentBroadcastInput = {
  agentName: string
  title: string
  body: string
  category: string
  audience: { kind: 'all_active' } | { kind: 'selected'; repIds: string[] }
  actionUrl?: string | null
  emailSuiteList?: boolean
  idempotencyKey?: string
}

function broadcastError(code: string, message: string, statusCode = 400) {
  return new ServiceError({ code, message, userMessage: message, statusCode })
}

export function assertBroadcastAgentName(agentName: string): BroadcastAgentName {
  if (agentName !== 'suite' && agentName !== 'bunny') {
    throw broadcastError('BROADCAST_AGENT_UNKNOWN', 'agentName must be suite or bunny.')
  }
  return agentName
}

export function agentBroadcastIdempotencyKey(agentName: BroadcastAgentName, idempotencyKey: string) {
  const key = idempotencyKey.trim()
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{7,179}$/.test(key)) {
    throw broadcastError(
      'BROADCAST_IDEMPOTENCY_INVALID',
      'idempotencyKey must be 8 to 180 letters, numbers, dots, colons, underscores, or hyphens.',
    )
  }
  return `agent:${agentName}:${key}`
}

function normalizeBroadcast(input: AgentBroadcastInput) {
  const agentName = assertBroadcastAgentName(input.agentName)
  if (!OWNER_CATEGORIES.includes(input.category as (typeof OWNER_CATEGORIES)[number])) {
    throw broadcastError('BROADCAST_CATEGORY_UNSUPPORTED', 'Choose a Workspace broadcast category the owner sender can publish.')
  }
  if (!WORKSPACE_MESSAGE_CATEGORIES.includes(input.category as WorkspaceMessageCategory)) {
    throw broadcastError('BROADCAST_CATEGORY_UNSUPPORTED', 'That category is not a Workspace message category.')
  }
  const text = normalizeWorkspaceMessageText({
    title: input.title,
    summary: null,
    actionLabel: input.actionUrl?.trim() ? 'Open update' : null,
  })
  const body = normalizeWorkspaceMessageBody(input.body)
  const actionUrl = input.actionUrl?.trim() ? normalizeWorkspaceMessageActionUrl(input.actionUrl) : null
  if (input.audience?.kind !== 'all_active' && input.audience?.kind !== 'selected') {
    throw broadcastError('BROADCAST_AUDIENCE_REQUIRED', 'Choose all active reps or a selected rep audience.')
  }
  const audience =
    input.audience.kind === 'all_active'
      ? { kind: 'all_active' as const }
      : {
          kind: 'selected' as const,
          repIds: [...new Set(input.audience.repIds.map((id) => id.trim()).filter(Boolean))],
        }
  if (audience.kind === 'selected' && (audience.repIds.length < 1 || audience.repIds.length > 500)) {
    throw broadcastError('BROADCAST_AUDIENCE_REQUIRED', 'Select between 1 and 500 reps.')
  }
  const emailSuiteList = input.emailSuiteList === true
  const paragraph = body.map((block) => ('text' in block ? block.text : '')).filter(Boolean).join('\n\n')
  const notice = publicationNoticeContent({
    title: text.title,
    summary: paragraph.slice(0, 240),
    body: paragraph,
    actionUrl,
  })
  const email = renderSuiteOfficialNoticeHtml(notice)
  return {
    agentName,
    text,
    body,
    paragraph,
    actionUrl,
    audience,
    category: input.category as WorkspaceMessageCategory,
    emailSuiteList,
    notice,
    email,
  }
}

export async function previewAgentBroadcast(supabase: SupabaseClient, input: AgentBroadcastInput) {
  const normalized = normalizeBroadcast(input)
  const audience = await previewWorkspaceMessageAudience(supabase, normalized.audience)
  return {
    agentName: normalized.agentName,
    emailSuiteList: normalized.emailSuiteList,
    workspace: {
      title: normalized.text.title,
      body: normalized.paragraph,
      category: normalized.category,
      actionUrl: normalized.actionUrl,
      audience: normalized.audience,
      recipientCount: audience.count,
    },
    email: {
      html: normalized.email.html,
      subject: normalized.notice.headline,
      variables: normalized.email.variables,
      willSend: normalized.emailSuiteList,
    },
  }
}

export async function publishAgentBroadcast(
  supabase: SupabaseClient,
  input: AgentBroadcastInput,
  deps?: { publish?: typeof publishWorkspaceMessage; deliver?: typeof deliverSuiteListNotice },
) {
  if (!input.idempotencyKey?.trim()) {
    throw broadcastError('BROADCAST_IDEMPOTENCY_REQUIRED', 'An idempotencyKey is required before a broadcast can be published.')
  }
  const normalized = normalizeBroadcast(input)
  const idempotencyKey = agentBroadcastIdempotencyKey(normalized.agentName, input.idempotencyKey)
  const publish = deps?.publish ?? publishWorkspaceMessage
  const publication = await publish(supabase, {
    senderKey: 'owner',
    title: normalized.text.title,
    summary: normalized.paragraph.slice(0, 240),
    body: normalized.body,
    category: normalized.category,
    priority: 'normal',
    actionLabel: normalized.actionUrl ? 'Open update' : null,
    actionUrl: normalized.actionUrl,
    audience: normalized.audience,
    idempotencyKey,
    sourceType: 'agent_broadcast',
    sourceId: normalized.agentName,
  })
  let suiteListEmail: SuiteListDelivery | null = null
  if (normalized.emailSuiteList) {
    const deliver = deps?.deliver ?? deliverSuiteListNotice
    suiteListEmail = await deliver({
      supabase,
      idempotencyKey: `suite-list:publication:${publication.id}`,
      sourceKind: 'workspace_publication',
      sourceId: publication.id,
      content: normalized.notice,
    })
  }
  return {
    agentName: normalized.agentName,
    idempotencyKey,
    emailSuiteList: normalized.emailSuiteList,
    publication,
    suiteListEmail,
    emailPreview: {
      html: normalized.email.html,
      subject: normalized.notice.headline,
    },
  }
}
