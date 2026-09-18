import 'server-only'
import { createHash } from 'node:crypto'
import { createMcpHandler, McpServer } from '@modelcontextprotocol/server'
import { z } from 'zod'

import { listReportedOperatorConversations } from '@/lib/control-center/operator-network-safety'
import { listOperatorSupportReports } from '@/lib/services/support-reports'
import { listOperatorConversations } from '@/lib/services/workspace-conversations'
import { previewWorkspaceMessageAudience } from '@/lib/services/workspace-message-audience'
import {
  normalizeWorkspaceMessageActionUrl,
  normalizeWorkspaceMessageBody,
  normalizeWorkspaceMessageText,
  WORKSPACE_MESSAGE_CATEGORIES,
  WORKSPACE_MESSAGE_PRIORITIES,
} from '@/lib/services/workspace-message-permissions'
import { listWorkspaceMessagePublications } from '@/lib/services/workspace-messages'
import {
  createRemyReplyApprovalRequest,
  sendApprovedRemyReply,
} from '@/lib/remy-communications/reply-approvals'
import {
  buildControlCenterWaitlistGetResult,
  buildControlCenterWaitlistListResult,
  getControlCenterWaitlistLead,
  listControlCenterWaitlistLeads,
  normalizeWaitlistStatusFilter,
} from '@/lib/remy-communications/waitlist'
import { getControlCenterOperatorHealth } from '@/lib/remy-communications/operator-health'
import { getControlCenterNicNacUsage } from '@/lib/remy-communications/nic-nac-usage'
import { buildAccountingAgentSummary } from '@/lib/control-center/accounting-agent-api'
import { loadSparkleSuiteAccountingProjection } from '@/lib/control-center/accounting'
import { createAdminClient } from '@/lib/supabase/admin'

const ACTOR_KEY = 'sparkle-control-center'
const MAX_CALLS_PER_MINUTE = 60

const toolNames = [
  'communications_get_inbox_summary',
  'communications_list_support_reports',
  'communications_get_support_report',
  'communications_list_network_safety_queue',
  'communications_list_broadcasts',
  'communications_draft_support_reply',
  'communications_request_support_reply_approval',
  'communications_send_approved_support_reply',
  'communications_draft_broadcast',
  'communications_draft_task_candidate',
  'control_center_list_waitlist_leads',
  'control_center_get_waitlist_lead',
  'control_center_get_operator_health',
  'control_center_get_nic_nac_usage',
  'control_center_get_accounting_summary',
] as const

type ToolName = (typeof toolNames)[number]

type AuditOutcome = 'success' | 'tool_error' | 'rate_limited'

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
      .join(',')}}`
  }
  return JSON.stringify(value) ?? 'null'
}

function requestDigest(input: unknown) {
  return createHash('sha256').update(canonicalJson(input)).digest('hex')
}

function safeResourceIds(values: unknown[]) {
  return values
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
    .slice(0, 20)
}

async function recordAuditEvent(input: {
  toolName: ToolName
  arguments: unknown
  outcome: AuditOutcome
  resourceIds?: string[]
  detail?: Record<string, string | number | boolean | null>
}) {
  const { error } = await createAdminClient()
    .from('remy_communications_agent_audit_events')
    .insert({
      actor_key: ACTOR_KEY,
      operation: input.toolName,
      tool_name: input.toolName,
      outcome: input.outcome,
      request_digest: requestDigest(input.arguments),
      resource_ids: safeResourceIds(input.resourceIds ?? []),
      details: input.detail ?? {},
    })
  if (error) throw new Error('Remy audit logging is unavailable.')
}

async function assertRateLimit() {
  const cutoff = new Date(Date.now() - 60_000).toISOString()
  const { count, error } = await createAdminClient()
    .from('remy_communications_agent_audit_events')
    .select('id', { count: 'exact', head: true })
    .eq('actor_key', ACTOR_KEY)
    .gte('created_at', cutoff)
  if (error) throw new Error('Remy rate-limit check is unavailable.')
  if ((count ?? 0) >= MAX_CALLS_PER_MINUTE) throw new RemyRateLimitError()
}

class RemyRateLimitError extends Error {}

function textResult(value: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(value) }],
  }
}

function errorResult(message: string) {
  return {
    content: [{ type: 'text' as const, text: message }],
    isError: true,
  }
}

async function runTool<T>(
  toolName: ToolName,
  argumentsValue: unknown,
  work: () => Promise<{ result: T; resourceIds?: string[] }>,
) {
  try {
    await assertRateLimit()
    const output = await work()
    await recordAuditEvent({
      toolName,
      arguments: argumentsValue,
      outcome: 'success',
      resourceIds: output.resourceIds,
      detail: { draftOnly: toolName.startsWith('communications_draft_') },
    })
    return textResult(output.result)
  } catch (error) {
    const outcome: AuditOutcome = error instanceof RemyRateLimitError ? 'rate_limited' : 'tool_error'
    try {
      await recordAuditEvent({
        toolName,
        arguments: argumentsValue,
        outcome,
        detail: { errorClass: error instanceof Error ? error.constructor.name : 'unknown' },
      })
    } catch {
      // The primary error remains intentionally generic; do not leak database state.
    }
    return errorResult(
      error instanceof RemyRateLimitError
        ? 'Rate limit reached. Try again in one minute.'
        : 'This Sparkle Suite Control Center tool is temporarily unavailable. Use the human Control Center workflow.',
    )
  }
}

function mapSupportReport(row: Record<string, unknown>) {
  return {
    reportId: row.id,
    conversationId: row.workspace_conversation_id ?? row.conversation_id ?? null,
    type: row.report_type,
    urgency: row.urgency,
    status: row.status,
    title: row.title,
    pageOrWorkflow: row.page_or_workflow ?? null,
    details: row.details,
    expectedResult: row.expected_result ?? null,
    actualResult: row.actual_result ?? null,
    auditStatus: row.audit_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

const supportReportIdSchema = z.object({
  reportId: z.string().uuid(),
})

export function createControlCenterMcpServer() {
  const server = new McpServer({
    name: 'sparkle-suite-control-center',
    version: '1.2.0',
  })

  server.registerTool(
    'communications_get_inbox_summary',
    {
      description: 'Read a minimized summary of current Support Inbox conversations. This never opens, marks read, replies to, or modifies a conversation.',
      inputSchema: z.object({ limit: z.number().int().min(1).max(50).default(25) }),
    },
    async ({ limit }) => runTool('communications_get_inbox_summary', { limit }, async () => {
      const result = await listOperatorConversations(createAdminClient(), { type: 'support', limit })
      return {
        result: {
          conversations: result.conversations.map((conversation) => ({
            conversationId: conversation.id,
            subject: conversation.subject,
            state: conversation.state,
            latestMessagePreview: conversation.latestMessagePreview,
            updatedAt: conversation.updatedAt,
            supportReport: conversation.supportReport
              ? {
                  reportId: conversation.supportReport.id,
                  type: conversation.supportReport.reportType,
                  urgency: conversation.supportReport.urgency,
                  status: conversation.supportReport.status,
                  title: conversation.supportReport.title,
                  auditStatus: conversation.supportReport.auditStatus,
                }
              : null,
          })),
          nextCursor: result.nextCursor,
          notice: 'Read-only summary. Use a human operator for any reply or status change.',
        },
      }
    }),
  )

  server.registerTool(
    'communications_list_support_reports',
    {
      description: 'List Support Inbox reports with minimized metadata. No customer contact details, attachments, or conversations are returned.',
      inputSchema: z.object({
        status: z.enum(['open', 'reviewing', 'planned', 'resolved', 'closed']).optional(),
        limit: z.number().int().min(1).max(50).default(25),
      }),
    },
    async ({ status, limit }) => runTool('communications_list_support_reports', { status, limit }, async () => {
      const reports = await listOperatorSupportReports(createAdminClient(), { status, limit })
      return {
        result: {
          reports: reports.map((report) => mapSupportReport(report as unknown as Record<string, unknown>)),
          notice: 'Read-only. Human approval is required for status changes and Task List promotion.',
        },
        resourceIds: reports.map((report) => String((report as unknown as Record<string, unknown>).id)),
      }
    }),
  )

  server.registerTool(
    'communications_get_support_report',
    {
      description: 'Read one Support Inbox report without opening the customer conversation or changing its unread state. Excludes customer contact details and attachments.',
      inputSchema: supportReportIdSchema,
    },
    async ({ reportId }) => runTool('communications_get_support_report', { reportId }, async () => {
      const { data, error } = await createAdminClient()
        .from('support_reports')
        .select('id, workspace_conversation_id, report_type, urgency, status, title, details, expected_result, actual_result, page_or_workflow, audit_status, created_at, updated_at')
        .eq('id', reportId)
        .maybeSingle()
      if (error || !data) throw new Error('Support report was not found.')
      return { result: { report: mapSupportReport(data as Record<string, unknown>) }, resourceIds: [reportId] }
    }),
  )

  server.registerTool(
    'communications_list_network_safety_queue',
    {
      description: 'List only reported Rep Network conversations for Network Safety triage. It never exposes ordinary private rep conversations and cannot moderate or suspend anyone.',
      inputSchema: z.object({ limit: z.number().int().min(1).max(50).default(25) }),
    },
    async ({ limit }) => runTool('communications_list_network_safety_queue', { limit }, async () => {
      const result = await listReportedOperatorConversations(createAdminClient(), { limit })
      return {
        result: {
          conversations: result.conversations.map((conversation) => ({
            conversationId: conversation.id,
            subject: conversation.subject,
            state: conversation.state,
            reportedCount: conversation.reportedCount,
            latestMessagePreview: conversation.latestMessagePreview,
            updatedAt: conversation.updatedAt,
          })),
          notice: 'Reported items only. Human review is required for any moderation or messaging suspension.',
        },
      }
    }),
  )

  server.registerTool(
    'communications_list_broadcasts',
    {
      description: 'List official Message Center broadcasts and delivery counts. It cannot create, edit, or publish a broadcast.',
      inputSchema: z.object({ limit: z.number().int().min(1).max(50).default(25) }),
    },
    async ({ limit }) => runTool('communications_list_broadcasts', { limit }, async () => {
      const publications = await listWorkspaceMessagePublications(createAdminClient(), { limit })
      return {
        result: {
          broadcasts: publications.map((publication) => ({
            publicationId: publication.id,
            title: publication.title,
            summary: publication.summary,
            category: publication.category,
            priority: publication.priority,
            status: publication.status,
            audienceCount: publication.audienceCount,
            deliveryCount: publication.deliveryCount,
            readCount: publication.readCount,
            publishedAt: publication.publishedAt,
            updatedAt: publication.updatedAt,
          })),
          notice: 'Read-only. Publishing remains the Control Center Review & publish → audience review → final Publish now flow.',
        },
      }
    }),
  )

  server.registerTool(
    'communications_draft_support_reply',
    {
      description: 'Prepare a support-reply draft for a human operator. This does not send, save, open, or alter the conversation.',
      inputSchema: z.object({
        reportId: z.string().uuid(),
        reply: z.string().trim().min(3).max(5_000),
      }),
    },
    async ({ reportId, reply }) => runTool('communications_draft_support_reply', { reportId, reply }, async () => ({
      result: {
        draft: { reportId, reply },
        requiresHumanApproval: true,
        approvalPath: `/control-center/messages?view=support&reportId=${encodeURIComponent(reportId)}`,
        notice: 'Draft only. A human operator must review and send it from the Support Inbox.',
      },
      resourceIds: [reportId],
    })),
  )

  server.registerTool(
    'communications_request_support_reply_approval',
    {
      description: 'Ask the internal operator to approve one exact Support reply. This creates no message and expires after 15 minutes unless the operator approves it in Sparkle Suite Control Center.',
      inputSchema: z.object({
        reportId: z.string().uuid(),
        reply: z.string().trim().min(3).max(5_000),
      }),
    },
    async ({ reportId, reply }) => runTool(
      'communications_request_support_reply_approval',
      { reportId, reply },
      async () => {
        const approval = await createRemyReplyApprovalRequest(createAdminClient(), { reportId, reply })
        return {
          result: {
            approval,
            requiresOwnerApproval: true,
            approvalPath: '/control-center/messages?view=approvals',
            notice: 'The reply has not been sent. Wait until the internal operator approves this exact request, then call communications_send_approved_support_reply with its approval ID.',
          },
          resourceIds: [reportId, approval.id],
        }
      },
    ),
  )

  server.registerTool(
    'communications_send_approved_support_reply',
    {
      description: 'Send one exact Support reply only after a current, one-time internal-operator approval exists. This cannot send a modified reply, a broadcast, or any other action.',
      inputSchema: z.object({ approvalId: z.string().uuid() }),
    },
    async ({ approvalId }) => runTool(
      'communications_send_approved_support_reply',
      { approvalId },
      async () => {
        const sent = await sendApprovedRemyReply(createAdminClient(), approvalId)
        return {
          result: {
            sent: true,
            approvalId,
            messageId: sent.message.id,
            sentAt: sent.message.createdAt,
            notice: 'Sent as Sparkle Suite Support after the recorded one-time operator approval.',
          },
          resourceIds: [approvalId, sent.approval.reportId, sent.approval.conversationId],
        }
      },
    ),
  )

  server.registerTool(
    'communications_draft_broadcast',
    {
      description: 'Prepare a non-persistent official-broadcast draft and audience count for a human operator. It never creates, saves, schedules, or publishes a broadcast.',
      inputSchema: z.object({
        title: z.string().trim().min(3).max(160),
        summary: z.string().trim().max(500).optional(),
        body: z.string().trim().min(3).max(20_000),
        category: z.enum(WORKSPACE_MESSAGE_CATEGORIES),
        priority: z.enum(WORKSPACE_MESSAGE_PRIORITIES).default('normal'),
        actionUrl: z.string().trim().max(2_000).optional(),
        audience: z.discriminatedUnion('kind', [
          z.object({ kind: z.literal('all_active') }),
          z.object({ kind: z.literal('selected'), repIds: z.array(z.string().uuid()).min(1).max(500) }),
        ]),
      }),
    },
    async (input) => runTool('communications_draft_broadcast', input, async () => {
      const text = normalizeWorkspaceMessageText({
        title: input.title,
        summary: input.summary,
        actionLabel: input.actionUrl ? 'Open update' : null,
      })
      const body = normalizeWorkspaceMessageBody(input.body)
      const actionUrl = normalizeWorkspaceMessageActionUrl(input.actionUrl)
      const audience = await previewWorkspaceMessageAudience(createAdminClient(), input.audience)
      return {
        result: {
          draft: {
            title: text.title,
            summary: text.summary,
            body,
            category: input.category,
            priority: input.priority,
            actionUrl,
            audience: input.audience,
          },
          audiencePreview: { recipientCount: audience.count },
          requiresHumanApproval: true,
          approvalPath: '/control-center/messages',
          notice: 'Draft only. A human operator must complete Review & publish, audience review, and final Publish now.',
        },
      }
    }),
  )

  server.registerTool(
    'communications_draft_task_candidate',
    {
      description: 'Prepare a Task List candidate from a Support report. It does not create a Task List item or change the report status.',
      inputSchema: z.object({
        reportId: z.string().uuid(),
        title: z.string().trim().min(3).max(180),
        itemType: z.enum(['bug', 'feature', 'task', 'idea']),
        notes: z.string().trim().max(3_000).optional(),
      }),
    },
    async ({ reportId, title, itemType, notes }) => runTool(
      'communications_draft_task_candidate',
      { reportId, title, itemType, notes },
      async () => ({
        result: {
          candidate: { reportId, title, itemType, notes: notes ?? null },
          requiresHumanApproval: true,
          approvalPath: `/control-center/messages?view=support&reportId=${encodeURIComponent(reportId)}`,
          notice: 'Draft only. A human operator must deliberately promote the report to the live Task List.',
        },
        resourceIds: [reportId],
      }),
    ),
  )

  server.registerTool(
    'control_center_list_waitlist_leads',
    {
      description: 'List current classic Control Center waitlist/build-list leads from sparkle_suite_waitlist, the same table the public yoursparklesuite.com build-queue form writes to. Omit status to return every current lead. This is read-only and cannot email, delete, or change a lead or its status. An empty leads array means the table currently has no matching rows, not that the tool failed.',
      inputSchema: z.object({
        status: z.string().trim().max(80).optional(),
        limit: z.number().int().min(1).max(100).optional(),
      }),
    },
    async ({ status, limit }) => runTool(
      'control_center_list_waitlist_leads',
      { status, limit },
      async () => {
        const statusFilter = normalizeWaitlistStatusFilter(status)
        const leads = await listControlCenterWaitlistLeads(
          createAdminClient(),
          { status: statusFilter, limit: limit ?? 25 },
        )
        return {
          result: buildControlCenterWaitlistListResult(leads, { status: statusFilter }),
          resourceIds: leads.map((lead) => lead.leadId),
        }
      },
    ),
  )

  server.registerTool(
    'control_center_get_waitlist_lead',
    {
      description: 'Get one classic Control Center waitlist/build-list lead by ID from sparkle_suite_waitlist. Returns found:false when that ID is not currently stored; that is not an outage. This is read-only.',
      inputSchema: z.object({ leadId: z.string().uuid() }),
    },
    async ({ leadId }) => runTool(
      'control_center_get_waitlist_lead',
      { leadId },
      async () => {
        const lead = await getControlCenterWaitlistLead(
          createAdminClient(),
          leadId,
        )
        return {
          result: buildControlCenterWaitlistGetResult(lead, leadId),
          resourceIds: lead ? [leadId] : [],
        }
      },
    ),
  )

  server.registerTool(
    'control_center_get_operator_health',
    {
      description: 'Read a short Sparkle Suite and Sparkle Finder operator-health snapshot: direct production endpoint checks plus bounded Suite error/job, Support, and reported Network Safety counts with explicit coverage holes. It cannot inspect private unreported conversations, deploy, change users, or fix anything.',
      inputSchema: z.object({}),
    },
    async () => runTool(
      'control_center_get_operator_health',
      {},
      async () => ({
        result: await getControlCenterOperatorHealth(createAdminClient()),
      }),
    ),
  )

  server.registerTool(
    'control_center_get_nic_nac_usage',
    {
      description: 'Read bounded Nic-Nac usage by product surface and model, including existing estimated-cost telemetry, run spikes, failure/hard-fail counts, Sparkle Lab caps, and explicit coverage holes. This never runs Sparkle Lab or changes prompts, tools, memory, accounts, billing, or production.',
      inputSchema: z.object({}),
    },
    async () => runTool(
      'control_center_get_nic_nac_usage',
      {},
      async () => ({
        result: await getControlCenterNicNacUsage(createAdminClient()),
      }),
    ),
  )

  server.registerTool(
    'control_center_get_accounting_summary',
    {
      description: 'Read a versioned, aggregate-only accounting snapshot for Sparkle Suite or Sparkle Finder. It contains no customer identities, credentials, bank details, or financial write action. Projected recurring revenue is separate from actual cash; actuals remain unavailable until their sources are connected.',
      inputSchema: z.object({ product: z.enum(['suite', 'finder']) }),
    },
    async ({ product }) => runTool(
      'control_center_get_accounting_summary',
      { product },
      async () => {
        const suiteProjection = product === 'suite'
          ? await loadSparkleSuiteAccountingProjection(createAdminClient())
          : null
        return {
          result: buildAccountingAgentSummary({ product, suiteProjection }),
        }
      },
    ),
  )

  return server
}

export const controlCenterMcpHandler = createMcpHandler(createControlCenterMcpServer)
export const controlCenterMcpToolNames = toolNames

// Compatibility exports keep the existing single connect-card endpoint and
// tests stable while the server itself is now the shared Control Center MCP.
export const createRemyMcpServer = createControlCenterMcpServer
export const remyMcpHandler = controlCenterMcpHandler
export const remyMcpToolNames = controlCenterMcpToolNames
