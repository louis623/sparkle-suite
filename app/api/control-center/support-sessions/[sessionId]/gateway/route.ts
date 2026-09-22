import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'

import * as accountBilling from '@/app/api/nic-nac/account-billing/route'
import * as calendarSummary from '@/app/api/nic-nac/calendar-summary/route'
import * as conversationAttachment from '@/app/api/nic-nac/conversations/[conversationId]/attachments/[attachmentId]/route'
import * as conversationAttachments from '@/app/api/nic-nac/conversations/[conversationId]/attachments/route'
import * as conversationMessages from '@/app/api/nic-nac/conversations/[conversationId]/messages/route'
import * as conversationRequestDecision from '@/app/api/nic-nac/conversations/[conversationId]/request-decision/route'
import * as conversation from '@/app/api/nic-nac/conversations/[conversationId]/route'
import * as conversationState from '@/app/api/nic-nac/conversations/[conversationId]/state/route'
import * as conversationRepDirectory from '@/app/api/nic-nac/conversations/rep-directory/route'
import * as conversationRepRequests from '@/app/api/nic-nac/conversations/rep-requests/route'
import * as conversationSupport from '@/app/api/nic-nac/conversations/support/route'
import * as customerAudience from '@/app/api/nic-nac/customer-audience/route'
import * as fulfillmentQueue from '@/app/api/nic-nac/fulfillment-queue/route'
import * as jewelryLibrary from '@/app/api/nic-nac/jewelry-library/route'
import * as joinTeamRoster from '@/app/api/nic-nac/join-team-roster/route'
import * as joinTeamRosterPhoto from '@/app/api/nic-nac/join-team-roster/photo/route'
import * as me from '@/app/api/nic-nac/me/route'
import * as messages from '@/app/api/nic-nac/messages/route'
import * as nicNac from '@/app/api/nic-nac/route'
import * as nicNacConversationState from '@/app/api/nic-nac/conversation-state/route'
import * as nicNacConversationClear from '@/app/api/nic-nac/conversation/clear/route'
import * as resources from '@/app/api/nic-nac/resources/route'
import * as resourceLibrary from '@/app/api/nic-nac/resource-library/route'
import * as sendEmail from '@/app/api/nic-nac/send-email/route'
import * as siteAnalytics from '@/app/api/nic-nac/site-analytics/route'
import * as siteRecipes from '@/app/api/nic-nac/site-recipes/route'
import * as siteRecipeDraft from '@/app/api/nic-nac/site-recipes/draft/route'
import * as siteRecipeImage from '@/app/api/nic-nac/site-recipes/image/route'
import * as siteSettings from '@/app/api/nic-nac/site-settings/route'
import * as siteSettingsMedia from '@/app/api/nic-nac/site-settings/media/route'
import * as skinOptions from '@/app/api/nic-nac/skin-options/route'
import * as teamParticipants from '@/app/api/nic-nac/team-onboarding/participants/route'
import * as teamParticipant from '@/app/api/nic-nac/team-onboarding/participants/[participantId]/route'
import * as teamParticipantMessages from '@/app/api/nic-nac/team-onboarding/participants/[participantId]/messages/route'
import * as supportAccessHistory from '@/app/api/nic-nac/support-access-history/route'
import * as supportReports from '@/app/api/nic-nac/support-reports/route'
import * as tradeBoard from '@/app/api/nic-nac/trade-board/route'
import * as tradeHistory from '@/app/api/nic-nac/trade-history/route'
import * as tradeRequests from '@/app/api/nic-nac/trade-requests/route'
import * as tradeRevealScreenshot from '@/app/api/nic-nac/trade-requests/[requestId]/reveal-screenshot/route'
import * as tradeSwapCleanup from '@/app/api/nic-nac/trade-swap-cleanup/route'
import * as walletSummary from '@/app/api/nic-nac/wallet-summary/route'
import * as setupState from '@/app/api/self-serve/setup-state/route'
import * as workspaceLiveLineup from '@/app/api/workspace/live-lineup/route'
import {
  appendOperatorSupportAuditEvent,
  OperatorSupportAuditUnavailableError,
} from '@/lib/operator-support/audit'
import { loadVerifiedOperatorSupportContext } from '@/lib/operator-support/http'
import { normalizeOperatorSupportMutationRequestId } from '@/lib/operator-support/mutation-guard'
import { runWithOperatorSupportRequestContext } from '@/lib/operator-support/request-context'
import {
  getOperatorSupportRouteClassification,
  isOperatorSupportGatewayClassificationAllowed,
  type OperatorSupportHttpMethod,
} from '@/lib/operator-support/route-classification'
import { OperatorSupportError } from '@/lib/operator-support/session-service'
import type {
  OperatorSupportWorkspaceArea,
  SupportCapability,
} from '@/lib/operator-support/types'

type RouteContext = { params: Promise<Record<string, string>> }
type RouteHandler = (request: Request, context: RouteContext) => Promise<Response>
type RouteModule = Partial<Record<OperatorSupportHttpMethod, RouteHandler>>

const STATIC_ROUTE_MODULES = new Map<string, RouteModule>([
  ['/api/self-serve/setup-state', setupState as unknown as RouteModule],
  ['/api/workspace/live-lineup', workspaceLiveLineup as unknown as RouteModule],
  ['/api/nic-nac', nicNac as unknown as RouteModule],
  ['/api/nic-nac/conversation-state', nicNacConversationState as unknown as RouteModule],
  ['/api/nic-nac/conversation/clear', nicNacConversationClear as unknown as RouteModule],
  ['/api/nic-nac/account-billing', accountBilling as unknown as RouteModule],
  ['/api/nic-nac/me', me as unknown as RouteModule],
  ['/api/nic-nac/calendar-summary', calendarSummary as unknown as RouteModule],
  ['/api/nic-nac/conversations/rep-directory', conversationRepDirectory as unknown as RouteModule],
  ['/api/nic-nac/conversations/rep-requests', conversationRepRequests as unknown as RouteModule],
  ['/api/nic-nac/conversations/support', conversationSupport as unknown as RouteModule],
  ['/api/nic-nac/customer-audience', customerAudience as unknown as RouteModule],
  ['/api/nic-nac/fulfillment-queue', fulfillmentQueue as unknown as RouteModule],
  ['/api/nic-nac/jewelry-library', jewelryLibrary as unknown as RouteModule],
  ['/api/nic-nac/join-team-roster', joinTeamRoster as unknown as RouteModule],
  ['/api/nic-nac/join-team-roster/photo', joinTeamRosterPhoto as unknown as RouteModule],
  ['/api/nic-nac/messages', messages as unknown as RouteModule],
  ['/api/nic-nac/resources', resources as unknown as RouteModule],
  ['/api/nic-nac/resource-library', resourceLibrary as unknown as RouteModule],
  ['/api/nic-nac/send-email', sendEmail as unknown as RouteModule],
  ['/api/nic-nac/site-analytics', siteAnalytics as unknown as RouteModule],
  ['/api/nic-nac/site-recipes', siteRecipes as unknown as RouteModule],
  ['/api/nic-nac/site-recipes/draft', siteRecipeDraft as unknown as RouteModule],
  ['/api/nic-nac/site-recipes/image', siteRecipeImage as unknown as RouteModule],
  ['/api/nic-nac/site-settings', siteSettings as unknown as RouteModule],
  ['/api/nic-nac/site-settings/media', siteSettingsMedia as unknown as RouteModule],
  ['/api/nic-nac/skin-options', skinOptions as unknown as RouteModule],
  ['/api/nic-nac/team-onboarding/participants', teamParticipants as unknown as RouteModule],
  ['/api/nic-nac/support-access-history', supportAccessHistory as unknown as RouteModule],
  ['/api/nic-nac/support-reports', supportReports as unknown as RouteModule],
  ['/api/nic-nac/trade-board', tradeBoard as unknown as RouteModule],
  ['/api/nic-nac/trade-history', tradeHistory as unknown as RouteModule],
  ['/api/nic-nac/trade-requests', tradeRequests as unknown as RouteModule],
  ['/api/nic-nac/trade-swap-cleanup', tradeSwapCleanup as unknown as RouteModule],
  ['/api/nic-nac/wallet-summary', walletSummary as unknown as RouteModule],
])

function decodeRouteSegment(value: string) {
  try {
    const decoded = decodeURIComponent(value)
    if (!decoded || /[\\/\0]/.test(decoded)) return null
    return decoded
  } catch {
    return null
  }
}

function resolveRoute(path: string): {
  module: RouteModule
  pattern: string
  params: Record<string, string>
} | null {
  const direct = STATIC_ROUTE_MODULES.get(path)
  if (direct) return { module: direct, pattern: path, params: {} }

  let match = path.match(/^\/api\/nic-nac\/conversations\/([^/]+)\/attachments\/([^/]+)$/)
  if (match) {
    const conversationId = decodeRouteSegment(match[1]!)
    const attachmentId = decodeRouteSegment(match[2]!)
    if (!conversationId || !attachmentId) return null
    return {
      module: conversationAttachment as unknown as RouteModule,
      pattern: '/api/nic-nac/conversations/[conversationId]/attachments/[attachmentId]',
      params: { conversationId, attachmentId },
    }
  }

  match = path.match(/^\/api\/nic-nac\/conversations\/([^/]+)\/attachments$/)
  if (match) {
    const conversationId = decodeRouteSegment(match[1]!)
    if (!conversationId) return null
    return {
      module: conversationAttachments as unknown as RouteModule,
      pattern: '/api/nic-nac/conversations/[conversationId]/attachments',
      params: { conversationId },
    }
  }

  match = path.match(/^\/api\/nic-nac\/conversations\/([^/]+)\/(messages|request-decision|state)$/)
  if (match) {
    const conversationId = decodeRouteSegment(match[1]!)
    const action = match[2]!
    if (!conversationId) return null
    const modules: Record<string, RouteModule> = {
      messages: conversationMessages as unknown as RouteModule,
      'request-decision': conversationRequestDecision as unknown as RouteModule,
      state: conversationState as unknown as RouteModule,
    }
    const patterns: Record<string, string> = {
      messages: '/api/nic-nac/conversations/[conversationId]/messages',
      'request-decision': '/api/nic-nac/conversations/[conversationId]/request-decision',
      state: '/api/nic-nac/conversations/[conversationId]/state',
    }
    return {
      module: modules[action]!,
      pattern: patterns[action]!,
      params: { conversationId },
    }
  }

  match = path.match(/^\/api\/nic-nac\/conversations\/([^/]+)$/)
  if (match) {
    const conversationId = decodeRouteSegment(match[1]!)
    if (!conversationId) return null
    return {
      module: conversation as unknown as RouteModule,
      pattern: '/api/nic-nac/conversations/[conversationId]',
      params: { conversationId },
    }
  }

  match = path.match(/^\/api\/nic-nac\/team-onboarding\/participants\/([^/]+)\/messages$/)
  if (match) {
    const participantId = decodeRouteSegment(match[1]!)
    if (!participantId) return null
    return {
      module: teamParticipantMessages as unknown as RouteModule,
      pattern: '/api/nic-nac/team-onboarding/participants/[participantId]/messages',
      params: { participantId },
    }
  }

  match = path.match(/^\/api\/nic-nac\/team-onboarding\/participants\/([^/]+)$/)
  if (match) {
    const participantId = decodeRouteSegment(match[1]!)
    if (!participantId) return null
    return {
      module: teamParticipant as unknown as RouteModule,
      pattern: '/api/nic-nac/team-onboarding/participants/[participantId]',
      params: { participantId },
    }
  }
  match = path.match(/^\/api\/nic-nac\/trade-requests\/([^/]+)\/reveal-screenshot$/)
  if (match) {
    const requestId = decodeRouteSegment(match[1]!)
    if (!requestId) return null
    return {
      module: tradeRevealScreenshot as unknown as RouteModule,
      pattern: '/api/nic-nac/trade-requests/[requestId]/reveal-screenshot',
      params: { requestId },
    }
  }
  return null
}

function chooseCapability(
  capabilities: readonly SupportCapability[] | undefined,
  method: OperatorSupportHttpMethod,
) {
  if (!capabilities?.length) return 'workspace.view' as const
  const suffix = method === 'GET' || method === 'HEAD' ? '.view' : '.manage'
  return capabilities.find((item) => item.endsWith(suffix)) ?? capabilities[0]!
}

function workspaceArea(capability: SupportCapability): OperatorSupportWorkspaceArea {
  if (capability.startsWith('site.')) return 'site'
  if (capability.startsWith('inventory.')) return 'inventory'
  if (capability.startsWith('calendar.')) return 'calendar'
  if (capability.startsWith('customers.')) return 'customers'
  if (capability.startsWith('team.')) return 'team'
  if (capability.startsWith('messages.')) return 'messages'
  if (capability.startsWith('nic_nac.')) return 'nic_nac'
  if (capability.startsWith('live_queue.')) return 'live_queue'
  return 'workspace'
}

async function cloneForOriginalRoute(request: Request, path: string) {
  const source = new URL(request.url)
  const url = new URL(path, source.origin)
  source.searchParams.forEach((value, key) => {
    if (key !== 'path') url.searchParams.append(key, value)
  })
  const method = request.method.toUpperCase()
  return new Request(url, {
    method,
    headers: request.headers,
    body:
      method === 'GET' || method === 'HEAD'
        ? undefined
        : await request.arrayBuffer(),
  })
}

async function handleGateway(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params
  const url = new URL(request.url)
  const path = url.searchParams.get('path')?.trim() ?? ''
  const method = request.method.toUpperCase() as OperatorSupportHttpMethod
  const resolved = resolveRoute(path)
  const classification = resolved
    ? getOperatorSupportRouteClassification(resolved.pattern)
    : getOperatorSupportRouteClassification(path)

  try {
    if (
      !classification ||
      !isOperatorSupportGatewayClassificationAllowed(
        classification.classification,
      )
    ) {
      const blockedMutation = !['GET', 'HEAD', 'OPTIONS'].includes(method)
      const context = await loadVerifiedOperatorSupportContext(sessionId, {
        capability: 'workspace.view',
        mutation: blockedMutation,
        request,
      })
      await appendOperatorSupportAuditEvent(context.supabase, {
        supportSessionId: sessionId,
        operatorRepId: context.session.operatorRepId,
        targetRepId: context.session.targetRepId,
        eventType: 'blocked_action_attempted',
        workspaceArea: 'security',
        actionName: path || 'unknown_workspace_route',
        result: 'denied',
        errorCode: 'SUPPORT_ACTION_BLOCKED',
        requestId: request.headers.get('x-sparkle-support-request-id'),
      })
      return NextResponse.json(
        { error: 'That action is unavailable during support access.', code: 'SUPPORT_ACTION_BLOCKED' },
        { status: 403 },
      )
    }
    const allowedMethods = (
      'supportMethods' in classification && classification.supportMethods
        ? classification.supportMethods
        : classification.methods
    ) as readonly OperatorSupportHttpMethod[]
    if (!resolved || !allowedMethods.includes(method)) {
      return NextResponse.json(
        { error: 'That support operation is not available.', code: 'SUPPORT_ACTION_BLOCKED' },
        { status: 403 },
      )
    }

    const handler = resolved.module[method]
    if (!handler) {
      return NextResponse.json({ error: 'Method not allowed.' }, { status: 405 })
    }
    const classifiedCapabilities =
      'capabilities' in classification ? classification.capabilities : undefined
    const capability = chooseCapability(classifiedCapabilities, method)
    const mutation = !['GET', 'HEAD', 'OPTIONS'].includes(method)
    // Opening a streamed Nic-Nac turn persists conversation metadata, but it
    // is not itself an account/content change. Individual tools perform and
    // durably audit any real mutations inside the stream.
    const auditAsMutation = mutation && resolved.pattern !== '/api/nic-nac'
    const context = await loadVerifiedOperatorSupportContext(sessionId, {
      capability,
      mutation,
      request,
    })
    const requestId = mutation
      ? normalizeOperatorSupportMutationRequestId(
          request.headers.get('x-sparkle-support-request-id'),
        )
      : request.headers.get('x-sparkle-support-request-id')?.trim() || null
    if (mutation && !requestId) {
      return NextResponse.json(
        { error: 'A valid support request ID is required.', code: 'SUPPORT_REQUEST_ID_INVALID' },
        { status: 400 },
      )
    }
    const auditBase = {
      supportSessionId: sessionId,
      operatorRepId: context.session.operatorRepId,
      targetRepId: context.session.targetRepId,
      workspaceArea: workspaceArea(capability),
      capability,
      actionName: `${method.toLowerCase()} ${resolved.pattern}`,
      requestId,
    } as const

    if (auditAsMutation) {
      const { data: priorAttempt, error: priorAttemptError } = await context.supabase
        .from('operator_support_audit_events')
        .select('id')
        .eq('support_session_id', sessionId)
        .eq('event_type', 'mutation_attempted')
        .eq('idempotency_key', requestId!)
        .limit(1)
      if (priorAttemptError) throw new OperatorSupportAuditUnavailableError(undefined, { cause: priorAttemptError })
      if ((priorAttempt ?? []).length > 0) {
        return NextResponse.json(
          {
            error: 'This support mutation was already attempted. Refresh the Workspace to verify its result before trying a new action.',
            code: 'SUPPORT_REQUEST_ALREADY_ATTEMPTED',
          },
          { status: 409 },
        )
      }
      await appendOperatorSupportAuditEvent(context.supabase, {
        ...auditBase,
        eventType: 'mutation_attempted',
        result: 'attempted',
        resourceType: 'support_request',
        resourceId: randomUUID(),
        idempotencyKey: requestId,
      })
    } else {
      await appendOperatorSupportAuditEvent(context.supabase, {
        ...auditBase,
        eventType: 'workspace_area_viewed',
        result: 'succeeded',
        idempotencyKey: mutation ? requestId : `view:${sessionId}:${workspaceArea(capability)}`,
        actionName: mutation ? 'nic_nac_turn' : `view_${workspaceArea(capability)}`,
        requestId: mutation ? requestId : null,
      })
    }

    const originalRequest = await cloneForOriginalRoute(request, path)
    let response: Response
    try {
      response = await runWithOperatorSupportRequestContext(context, () =>
        handler(originalRequest, { params: Promise.resolve(resolved.params) }),
      )
    } catch (error) {
      if (auditAsMutation) {
        await appendOperatorSupportAuditEvent(context.supabase, {
          ...auditBase,
          eventType: 'mutation_failed',
          result: 'failed',
          errorCode: 'DOMAIN_MUTATION_FAILED',
          idempotencyKey: requestId,
        })
      }
      throw error
    }

    if (auditAsMutation) {
      if (!response.ok) {
        await appendOperatorSupportAuditEvent(context.supabase, {
          ...auditBase,
          eventType: 'mutation_failed',
          result: 'failed',
          errorCode: `HTTP_${response.status}`,
          idempotencyKey: requestId,
        })
      } else {
        try {
          await appendOperatorSupportAuditEvent(context.supabase, {
            ...auditBase,
            eventType: 'mutation_succeeded',
            result: 'succeeded',
            idempotencyKey: requestId,
          })
        } catch (error) {
          // The durable attempted event prevents a blind retry. We cannot
          // truthfully acknowledge success until its outcome audit is stored.
          console.error('[operator-support/gateway] mutation outcome audit failed', error)
          return NextResponse.json(
            {
              error: 'The change may have completed, but its final audit result could not be stored. Refresh to verify the account; do not repeat the action.',
              code: 'SUPPORT_AUDIT_OUTCOME_UNCONFIRMED',
            },
            { status: 409 },
          )
        }
      }
    }
    return response
  } catch (error) {
    if (error instanceof OperatorSupportError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      )
    }
    console.error('[operator-support/gateway]', error)
    return NextResponse.json(
      { error: 'The support request could not be completed safely.' },
      { status: 500 },
    )
  }
}

export const GET = handleGateway
export const POST = handleGateway
export const PUT = handleGateway
export const PATCH = handleGateway
export const DELETE = handleGateway
