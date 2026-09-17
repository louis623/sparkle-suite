// Production /api/nic-nac route. Ports app/api/nic-nac/spike/route.ts and
// adds Guardian telemetry + Enforcer audit hooks at the route handler level.
//
// Telemetry approach is fixed: closure-wrapper around tool.execute (NOT the
// AI SDK onStepFinish/onToolCall hook path). See lib/nic-nac/guardian-telemetry.ts.

import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { isDeepStrictEqual } from 'node:util'
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
  type UIMessageChunk,
} from 'ai'
import { getPaidNicNacContext, AuthError } from '@/lib/nic-nac/auth'
import { ServiceError } from '@/lib/services/errors'
import {
  loadCanonicalHistory,
  insertUserMessage,
  reserveAssistantMessage,
  completeAssistant,
  abortAssistant,
  checkpointAssistant,
  recordApprovalEvent,
} from '@/lib/nic-nac/persistence'
import {
  getToolIntentsForMessages,
  type NicNacToolIntent,
} from '@/lib/nic-nac/tools'
import { probeConversationOwner } from '@/lib/nic-nac/probe-conversation-owner'
import {
  logIncident,
  logToolExecution,
} from '@/lib/nic-nac/guardian-telemetry'
import {
  decideAssistantMessageId,
  shouldCheckpointContinuation,
} from '@/lib/nic-nac/hitl-state'
import { selectMessagesForModel } from '@/lib/nic-nac/model-context'
import {
  logNicNacRun,
  normalizeRunUsage,
  type NicNacRunUsage,
} from '@/lib/nic-nac/run-telemetry'
import { getNicNacModelPolicy } from '@/lib/nic-nac/core/model-policy'
import { estimateNicNacRunCostCents } from '@/lib/nic-nac/core/model-cost'
import {
  createSuiteOperatorSupportProductContext,
  createSuiteRepWorkspaceProductContext,
} from '@/lib/nic-nac/core/product-context'
import { getOperatorSupportRequestContext } from '@/lib/operator-support/request-context'
import {
  assertOperatorSupportConversationId,
  insertOperatorSupportConversationMessage,
  loadOperatorSupportConversation,
  recordOperatorSupportApprovalEvent,
} from '@/lib/nic-nac/support-conversation'
import { assembleNicNacContext } from '@/lib/nic-nac/core/context-assembler'
import { loadSuiteRepMemoryCards } from '@/lib/nic-nac/core/memory/rep-memory-cards'
import { classifyNicNacMissionScopeForMessages } from '@/lib/nic-nac/core/mission-guard'
import { createNicNacStaticTextStreamResponse } from '@/lib/nic-nac/core/static-stream'
import { createAdminClient } from '@/lib/supabase/admin'
import { normalizeNicNacAssistantParts } from '@/lib/nic-nac/message-normalize'
import {
  getOrCreateTradeBoardIntakeContext,
} from '@/lib/nic-nac/workflows/trade-board-intake-context'
import { getOrCreateTradeWorkflowContext } from '@/lib/nic-nac/workflows/trade-workflow-context'
import { getOrCreateCalendarWorkflowContext } from '@/lib/nic-nac/workflows/calendar-workflow-context'
import { arbitrateNicNacWorkflowTurn } from '@/lib/nic-nac/workflows/workflow-turn-arbitration'
import { summarizeHardFailDetection } from '@/lib/nic-nac/workflows/trade-board-intake-eval'
import {
  getNicNacMandatoryToolFollowUpText,
  getNicNacToolOnlyRecoveryText,
  getNicNacToolFailure,
  isRenderableNicNacStreamChunk,
  NIC_NAC_EMPTY_RESPONSE_FALLBACK,
  recoverNicNacEmptyCalendarRead,
} from '@/lib/nic-nac/core/stream-output-guard'
import { readMyShowsForNicNac } from '@/lib/nic-nac/tools/list-my-shows'
import { buildPersonalizedRepGreeting } from '@/lib/nic-nac/core/rep-personalization'
import { createConfiguredNicNacAgent } from '@/lib/nic-nac/agent'
import {
  buildNicNacWorkflowTaskContext,
  loadNicNacWorkflowTaskContinuity,
  renderNicNacWorkflowTaskContext,
} from '@/lib/nic-nac/agent/workflow-task-context'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

interface PostBody {
  conversationId: string
  messages: UIMessage[]
  mode?: 'workspace' | 'required_setup'
}

function readTextFromMessage(message: UIMessage | undefined): string {
  return (
    message?.parts
      ?.filter(
        (part): part is { type: 'text'; text: string } =>
          part.type === 'text' &&
          typeof (part as { text?: unknown }).text === 'string',
      )
      .map((part) => part.text)
      .join('\n') ?? ''
  )
}

function extractStreamErrorMessage(err: unknown): string {
  const seen = new Set<unknown>()
  const messages: string[] = []
  const codes: string[] = []

  const visit = (value: unknown) => {
    if (!value || seen.has(value)) return
    if (typeof value !== 'object') {
      if (typeof value === 'string' && value.trim()) messages.push(value.trim())
      return
    }

    seen.add(value)
    const record = value as Record<string, unknown>
    const message = record.message
    const code = record.code
    const type = record.type
    if (typeof message === 'string' && message.trim()) {
      messages.push(message.trim())
    }
    if (typeof code === 'string' && code.trim()) codes.push(code.trim())
    if (typeof type === 'string' && type.trim()) codes.push(type.trim())
    visit(record.error)
    visit(record.cause)
  }

  visit(err)

  const prefix = Array.from(new Set(codes)).join(':')
  const message = Array.from(new Set(messages)).join(' | ')
  if (prefix && message) return `${prefix}: ${message}`
  if (message) return message
  if (prefix) return prefix
  return String(err)
}

// Inspect only the final assistant turn for HITL approval responses. AI SDK v6
// mutates that assistant message in place when the user clicks approve/reject;
// older responded parts are conversation history and must not replay on a
// later ordinary user turn.
function extractApprovalResponses(
  messages: UIMessage[]
): Array<{
  messageId: string
  approvalId: string
  approved: boolean
  toolName: string
  toolCallId: string
  input: unknown
}> {
  const out: Array<{
    messageId: string
    approvalId: string
    approved: boolean
    toolName: string
    toolCallId: string
    input: unknown
  }> = []
  const message = messages.at(-1)
  if (message?.role !== 'assistant') return out
  for (const part of message.parts ?? []) {
      const p = part as unknown as {
        type?: string
        state?: string
        approval?: { id?: string; approved?: boolean }
        toolName?: string
        toolCallId?: string
        input?: unknown
      }
      if (
        p?.state === 'approval-responded' &&
        p?.approval?.id &&
        p.toolCallId
      ) {
        out.push({
          messageId: message.id,
          approvalId: p.approval.id,
          approved: p.approval.approved ?? false,
          toolName:
            p.toolName ??
            (p.type?.startsWith('tool-') ? p.type.slice('tool-'.length) : 'unknown'),
          toolCallId: p.toolCallId,
          input: p.input ?? {},
        })
      }
  }
  return out
}

type CanonicalApprovalRequest = {
  messageId: string
  approvalId: string
  toolName: string
  toolCallId: string
  input: unknown
}

function getCanonicalApprovalRequests(
  messages: UIMessage[],
): CanonicalApprovalRequest[] {
  const lastAssistant = [...messages]
    .reverse()
    .find((message) => message.role === 'assistant')
  if (!lastAssistant) return []
  const parts = lastAssistant.parts ?? []
  let lastStepStart = -1
  for (let index = 0; index < parts.length; index += 1) {
    if ((parts[index] as { type?: string }).type === 'step-start') {
      lastStepStart = index
    }
  }
  const requests: CanonicalApprovalRequest[] = []
  for (let index = lastStepStart + 1; index < parts.length; index += 1) {
    const part = parts[index] as UIMessage['parts'][number] & {
      type?: string
      state?: string
      toolName?: string
      input?: unknown
      toolCallId?: string
      approval?: { id?: string }
    }
    if (
      part.state !== 'approval-requested' ||
      !part.approval?.id ||
      !part.toolCallId
    ) {
      continue
    }
    const toolName =
      part.toolName ??
      (part.type?.startsWith('tool-') ? part.type.slice('tool-'.length) : undefined)
    if (!toolName) continue
    requests.push({
      messageId: lastAssistant.id,
      approvalId: part.approval.id,
      toolName,
      toolCallId: part.toolCallId,
      input: part.input ?? {},
    })
  }
  return requests
}

function validateApprovalResponseProvenance(args: {
  clientMessages: UIMessage[]
  canonicalMessages: UIMessage[]
  responses: ReturnType<typeof extractApprovalResponses>
}): { valid: true } | { valid: false; approvalId?: string } {
  if (args.responses.length === 0) return { valid: true }
  const lastClient = args.clientMessages.at(-1)
  if (lastClient?.role !== 'assistant') return { valid: false }
  const canonical = new Map(
    getCanonicalApprovalRequests(args.canonicalMessages).map((request) => [
      request.approvalId,
      request,
    ]),
  )
  const seen = new Set<string>()
  for (const response of args.responses) {
    const request = canonical.get(response.approvalId)
    if (
      seen.has(response.approvalId) ||
      !request ||
      response.messageId !== lastClient.id ||
      response.messageId !== request.messageId ||
      response.toolName !== request.toolName ||
      response.toolCallId !== request.toolCallId ||
      !isDeepStrictEqual(response.input, request.input)
    ) {
      return { valid: false, approvalId: response.approvalId }
    }
    seen.add(response.approvalId)
  }
  return { valid: true }
}

export async function POST(request: Request) {
  const runId = randomUUID()
  const runStartedAt = Date.now()
  const responseHeaders: Record<string, string> = {
    'x-nic-nac-run-id': runId,
    'x-nic-nac-orchestrator': 'agent',
  }
  const modelPolicy = getNicNacModelPolicy('human_default')

  let ctx
  try {
    ctx = await getPaidNicNacContext()
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json(
        { error: 'unauthenticated' },
        { status: 401, headers: responseHeaders }
      )
    }
    if (err instanceof ServiceError) {
      return NextResponse.json(
        { error: err.userMessage, code: err.code },
        { status: err.statusCode, headers: responseHeaders },
      )
    }
    await logIncident({
      errorType: 'auth_unexpected',
      severity: 'error',
      details: { runId, message: (err as Error).message },
    })
    throw err
  }
  const { repId, rep, supabase } = ctx
  const supportContext = getOperatorSupportRequestContext()
  const supportScope = supportContext
    ? {
        supportSessionId: supportContext.session.id,
        operatorRepId: supportContext.actor.operatorRepId,
        targetRepId: supportContext.actor.subjectRepId,
      }
    : null
  const productContext = supportContext
    ? createSuiteOperatorSupportProductContext({
        targetRepId: repId,
        targetUserId: rep.auth_user_id,
        operatorRepId: supportContext.actor.operatorRepId,
        supportSessionId: supportContext.session.id,
      })
    : createSuiteRepWorkspaceProductContext({
        repId,
        userId: rep.auth_user_id,
      })

  let body: PostBody
  try {
    body = (await request.json()) as PostBody
  } catch {
    return NextResponse.json(
      { error: 'invalid_json' },
      { status: 400, headers: responseHeaders }
    )
  }

  if (!body.conversationId || !Array.isArray(body.messages) || body.messages.length === 0) {
    return NextResponse.json(
      { error: 'missing_fields' },
      { status: 400, headers: responseHeaders }
    )
  }

  const { conversationId, messages } = body
  if (supportScope) {
    try {
      assertOperatorSupportConversationId(conversationId, supportScope)
    } catch {
      return NextResponse.json(
        { error: 'support_conversation_mismatch' },
        { status: 403, headers: responseHeaders },
      )
    }
  }
  const mode = body.mode === 'required_setup' ? 'required_setup' : 'workspace'

  console.info('[nic-nac] run', { runId, conversationId, repId })

  // Ownership probe — admin client, NOT RLS-filtered. RLS would return null
  // for cross-tenant conversations and silently let cross-tenant injection
  // through (red-team attack #7). Parallelized with the canonical-history load
  // since neither depends on the other; saves ~one round-trip of pre-stream
  // latency.
  let existingOwner: string | null = null
  let existingHistory: Awaited<ReturnType<typeof loadCanonicalHistory>>
  try {
    ;[existingOwner, existingHistory] = await Promise.all([
      probeConversationOwner(conversationId),
      supportScope
        ? loadOperatorSupportConversation(supabase, supportScope)
        : loadCanonicalHistory(supabase, conversationId),
    ])
  } catch (err) {
    const message = (err as Error).message
    await logIncident({
      errorType: 'pre_stream_setup_failed',
      repId,
      conversationId,
      severity: 'error',
      details: { runId, message },
    })
    if (mode === 'required_setup') {
      return NextResponse.json(
        {
          error: 'Required setup chat failed.',
          code: 'REQUIRED_SETUP_CHAT_CONTEXT_MISSING',
          detail:
            'Nic-Nac could not load this required setup conversation context.',
        },
        { status: 500, headers: responseHeaders },
      )
    }
    throw err
  }
  if (existingOwner && existingOwner !== repId) {
    return NextResponse.json(
      { error: 'forbidden' },
      { status: 403, headers: responseHeaders }
    )
  }

  const missionScope = classifyNicNacMissionScopeForMessages(messages)

  if (missionScope.action === 'redirect') {
    const existingIds = new Set(existingHistory.map((m) => m.id))
    for (const m of messages) {
      if (m.role !== 'user') continue
      if (existingIds.has(m.id)) continue
      if (supportScope) {
        await insertOperatorSupportConversationMessage(supabase, supportScope, m)
      } else {
        await insertUserMessage(supabase, {
          conversationId,
          repId,
          messageId: m.id,
          parts: m.parts,
        })
      }
    }

    const assistantMessageId = randomUUID()
    if (supportScope) {
      await insertOperatorSupportConversationMessage(supabase, supportScope, {
        id: assistantMessageId,
        role: 'assistant',
        parts: [],
        status: 'pending',
      })
    } else {
      await reserveAssistantMessage(supabase, {
        conversationId,
        repId,
        messageId: assistantMessageId,
      })
    }
    await completeAssistant(supabase, {
      conversationId,
      messageId: assistantMessageId,
      parts: [{ type: 'text', text: missionScope.message }],
    })
    await logNicNacRun({
      runId,
      repId,
      conversationId,
      model: 'mission_redirect',
      status: 'complete',
      latencyMs: Date.now() - runStartedAt,
      intents: [],
      toolNames: [],
      productContext,
      modelContext: {
        originalMessageCount: messages.length,
        modelMessageCount: 0,
        droppedMessageCount: 0,
        estimatedTokens: 0,
        wasCompacted: false,
      },
      usage: {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        estimatedCostCents: 0,
      },
      errorMessage: `mission_redirect:${missionScope.reason}`,
    })

    return createNicNacStaticTextStreamResponse({
      message: missionScope.message,
      messageId: assistantMessageId,
      headers: responseHeaders,
    })
  }

  const personalizedGreeting = buildPersonalizedRepGreeting({
    latestUserText: readTextFromMessage(
      [...messages].reverse().find((message) => message.role === 'user'),
    ),
    repDisplayName: rep.display_name,
  })
  if (mode === 'workspace' && personalizedGreeting) {
    const existingIds = new Set(existingHistory.map((message) => message.id))
    for (const message of messages) {
      if (message.role !== 'user' || existingIds.has(message.id)) continue
      if (supportScope) {
        await insertOperatorSupportConversationMessage(
          supabase,
          supportScope,
          message,
        )
      } else {
        await insertUserMessage(supabase, {
          conversationId,
          repId,
          messageId: message.id,
          parts: message.parts,
        })
      }
    }

    const assistantMessageId = randomUUID()
    if (supportScope) {
      await insertOperatorSupportConversationMessage(supabase, supportScope, {
        id: assistantMessageId,
        role: 'assistant',
        parts: [],
        status: 'pending',
      })
    } else {
      await reserveAssistantMessage(supabase, {
        conversationId,
        repId,
        messageId: assistantMessageId,
      })
    }
    await completeAssistant(supabase, {
      conversationId,
      messageId: assistantMessageId,
      parts: [{ type: 'text', text: personalizedGreeting }],
    })
    await logNicNacRun({
      runId,
      repId,
      conversationId,
      model: 'personalized_greeting',
      status: 'complete',
      latencyMs: Date.now() - runStartedAt,
      intents: [],
      toolNames: [],
      productContext,
      modelContext: {
        originalMessageCount: messages.length,
        modelMessageCount: 0,
        droppedMessageCount: 0,
        estimatedTokens: 0,
        wasCompacted: false,
      },
      usage: {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        estimatedCostCents: 0,
      },
      errorMessage: 'personalized_greeting',
    })

    return createNicNacStaticTextStreamResponse({
      message: personalizedGreeting,
      messageId: assistantMessageId,
      headers: responseHeaders,
    })
  }

  const repMemoryCards = await loadSuiteRepMemoryCards({
    repId,
    supabase,
    onError: async (err) => {
      await logIncident({
        errorType: 'rep_memory_context_failed',
        repId,
        conversationId,
        severity: 'warn',
        details: { runId, message: err.message },
      })
    },
  })
  const assembledContext = assembleNicNacContext({
    productContext,
    memoryCards: repMemoryCards,
  })

  // Approval replay protection. UNIQUE(approval_id) is the durable backstop.
  const approvals = extractApprovalResponses(messages)
  const approvalProvenance = validateApprovalResponseProvenance({
    clientMessages: messages,
    canonicalMessages: existingHistory,
    responses: approvals,
  })
  if (!approvalProvenance.valid) {
    return NextResponse.json(
      {
        error: 'approval_not_issued',
        approvalId: approvalProvenance.approvalId,
      },
      { status: 400, headers: responseHeaders },
    )
  }
  for (const a of approvals) {
    const { replayed } = supportScope
      ? await recordOperatorSupportApprovalEvent(supabase, supportScope, a)
      : await recordApprovalEvent(supabase, {
          conversationId,
          repId,
          approvalId: a.approvalId,
          toolName: a.toolName,
          approved: a.approved,
        })
    if (replayed) {
      return NextResponse.json(
        { error: 'approval_replayed', approvalId: a.approvalId },
        { status: 400, headers: responseHeaders }
      )
    }
  }

  // Idempotent persist of any new user-role messages from the client array.
  const existingIds = new Set(existingHistory.map((m) => m.id))
  for (const m of messages) {
    if (m.role !== 'user') continue
    if (existingIds.has(m.id)) continue
    if (supportScope) {
      await insertOperatorSupportConversationMessage(supabase, supportScope, m)
    } else {
      await insertUserMessage(supabase, {
        conversationId,
        repId,
        messageId: m.id,
        parts: m.parts,
      })
    }
  }

  // Reserve the assistant row before the agent stream starts. The same ID is
  // used by the outer UI stream so the DB row and client message stay in sync
  // even if the model or a tool aborts.
  //
  // For HITL continuation (last message is an assistant turn carrying an
  // approval-responded part), reuse that turn's id instead of generating a
  // new one — this matches the AI SDK's continuation pattern and keeps the
  // resume's output-available state on the original DB row, not a parallel
  // one that would resurrect a dead approval card on reload.
  const { messageId: assistantMessageId, isContinuation } =
    decideAssistantMessageId(messages, () => randomUUID())
  if (!isContinuation) {
    if (supportScope) {
      await insertOperatorSupportConversationMessage(supabase, supportScope, {
        id: assistantMessageId,
        role: 'assistant',
        parts: [],
        status: 'pending',
      })
    } else {
      await reserveAssistantMessage(supabase, {
        conversationId,
        repId,
        messageId: assistantMessageId,
      })
    }
  }

  const latestUserMessage = [...messages]
    .reverse()
    .find((message) => message.role === 'user')
  const latestUserText = readTextFromMessage(latestUserMessage)
  const latestToolIntents: NicNacToolIntent[] =
    mode === 'required_setup'
      ? ['required_setup']
      : getToolIntentsForMessages(messages)
  // Workflow arbitration now protects transaction state only. It does not
  // choose, retain, remove, or force tools. The permission-scoped agent catalog
  // below is independent of this text classifier, so an old workflow can never
  // capture a new explicit request before the model reasons.
  const workflowNowIso = new Date().toISOString()
  const workflowSupabase = createAdminClient()
  const supportCapabilities = supportContext?.session.capabilities
  const workflowContinuityAccess = {
    calendar:
      !supportCapabilities || supportCapabilities.includes('calendar.manage'),
    tradeBoard:
      !supportCapabilities || supportCapabilities.includes('inventory.manage'),
    trade:
      !supportCapabilities || supportCapabilities.includes('inventory.manage'),
  }
  const workflowTaskContinuity = await loadNicNacWorkflowTaskContinuity({
    mode,
    supabase,
    workflowSupabase,
    repId,
    conversationId,
    nowIso: workflowNowIso,
    access: workflowContinuityAccess,
  })
  const workflowTurn = arbitrateNicNacWorkflowTurn(latestToolIntents, {
    tradeBoard: workflowTaskContinuity.tradeBoardSession?.updatedAt,
    trade: workflowTaskContinuity.tradeSession?.updatedAt,
    calendar: workflowTaskContinuity.calendarSession?.updatedAt,
  }, {
    // The new agent receives unfinished work as facts. A vague/unrecognized
    // turn must not be silently assigned to whichever workflow was updated
    // most recently. Deliberate immediate follow-ups are already recognized by
    // getToolIntentsForMessages above.
    allowImplicitPassiveContinuation: false,
  })
  const tradeBoardWorkflowContext =
    workflowContinuityAccess.tradeBoard && workflowTurn.tradeBoard
    ? await getOrCreateTradeBoardIntakeContext({
        supabase,
        workflowSupabase,
        repId,
        conversationId,
        messages,
        latestUserMessageId: latestUserMessage?.id,
        mode,
        nowIso: workflowNowIso,
        preloadedSession: workflowTaskContinuity.tradeBoardSession,
      })
    : {
        sessionBefore: null,
        sessionAfter: null,
        workflowIntents: [] as NicNacToolIntent[],
        toolPolicySource: 'latest_turn_intent' as const,
        workflowPromptState: '',
      }
  const activeTradeBoardWorkflow =
    tradeBoardWorkflowContext.sessionAfter ??
    workflowTaskContinuity.tradeBoardSession
  const tradeWorkflowContext = workflowContinuityAccess.trade && workflowTurn.trade
    ? await getOrCreateTradeWorkflowContext({
        supabase: workflowSupabase,
        repId,
        conversationId,
        latestUserText,
        latestToolIntents,
        messages,
        latestUserMessageId: latestUserMessage?.id,
        mode,
        nowIso: workflowNowIso,
        preloadedSession: workflowTaskContinuity.tradeSession,
      })
    : { sessionBefore: null, sessionAfter: null, activeWorkflow: null }
  const calendarWorkflowContext =
    workflowContinuityAccess.calendar && workflowTurn.calendar
    ? await getOrCreateCalendarWorkflowContext({
        supabase,
        workflowSupabase: supabase,
        repId,
        conversationId,
        messages,
        latestUserMessageId: latestUserMessage?.id,
        mode,
        nowIso: workflowNowIso,
        preloadedSession: workflowTaskContinuity.calendarSession,
        defaultTimeZone: rep.time_zone,
      })
    : {
        sessionBefore: null,
        sessionAfter: null,
        activeWorkflow: null,
        workflowIntents: [] as NicNacToolIntent[],
        toolPolicySource: 'latest_turn_intent' as const,
        workflowPromptState: '',
      }
  const activeTradeWorkflow =
    tradeWorkflowContext.sessionAfter ?? workflowTaskContinuity.tradeSession
  const activeCalendarWorkflow =
    calendarWorkflowContext.sessionAfter ??
    workflowTaskContinuity.calendarSession
  const runtimeTaskContext = buildNicNacWorkflowTaskContext({
    calendarSession: activeCalendarWorkflow,
    tradeBoardSession: activeTradeBoardWorkflow,
    tradeSession: activeTradeWorkflow,
  })
  let runUsage: NicNacRunUsage | undefined
  const configuredAgent = createConfiguredNicNacAgent({
    mode,
    productContext,
    repDisplayName: rep.display_name,
    memoryContext: assembledContext.promptText,
    taskContext: renderNicNacWorkflowTaskContext(runtimeTaskContext),
    modelPolicy,
    toolContext: {
      repId,
      supabase,
      conversationId,
      runId,
      defaultTimeZone: rep.time_zone,
      agentHarness: true,
      latestUserText,
      latestUserHasImage:
        latestUserMessage?.parts?.some(
          (part) =>
            (part as { type?: string }).type === 'file' &&
            (part as { mediaType?: string }).mediaType?.startsWith('image/'),
        ) ?? false,
      activeTradeBoardWorkflow,
      activeTradeWorkflow,
      activeCalendarWorkflow,
      operatorSupport: supportContext
        ? {
            supportSessionId: supportContext.session.id,
            operatorRepId: supportContext.actor.operatorRepId,
            capabilities: supportContext.session.capabilities,
          }
        : undefined,
    },
    onFinish: (event) => {
      runUsage = normalizeRunUsage(event.totalUsage)
      runUsage.estimatedCostCents = estimateNicNacRunCostCents(
        modelPolicy,
        runUsage,
      )
      console.log('[nic-nac] agent finish', {
        runId,
        rep: rep.email,
        conversationId,
        totalUsage: event.totalUsage,
      })
    },
  })
  const toolIntents = configuredAgent.catalog.allowedIntents
  const requestedToolIntents = configuredAgent.catalog.requestedIntents
  const activeToolNames = configuredAgent.catalog.toolNames
  const toolPolicySource = configuredAgent.catalog.source
  console.info('[nic-nac] agent capability catalog', {
    runId,
    conversationId,
    product: productContext.product,
    surface: productContext.surface,
    requestedIntents: requestedToolIntents,
    intents: toolIntents,
    blockedIntents: configuredAgent.catalog.blockedIntents,
    blockedTools: configuredAgent.catalog.blockedToolNames,
    toolCount: activeToolNames.length,
    tools: activeToolNames,
    toolChoice: configuredAgent.agent.toolChoice,
    maxSteps: configuredAgent.agent.maxSteps,
    maxOutputTokens: configuredAgent.agent.maxOutputTokens,
    maxRetries: configuredAgent.agent.maxRetries,
    timeout: configuredAgent.agent.timeout,
    recoverableTaskCount: runtimeTaskContext.pausedGoals.length,
  })

  const modelContext = selectMessagesForModel(messages)
  if (modelContext.wasCompacted) {
    console.info('[nic-nac] model context compacted', {
      runId,
      conversationId,
      originalMessageCount: messages.length,
      modelMessageCount: modelContext.messages.length,
      droppedMessageCount: modelContext.droppedMessageCount,
      estimatedTokens: modelContext.estimatedTokens,
    })
  }

  const modelMessages = await convertToModelMessages(modelContext.messages)
  let streamErrorMessage: string | undefined
  let emptyOutputRecovered = false
  const executedToolNames: string[] = []
  const toolFailures: Array<{
    toolName: string
    errorTier: string
    code: string | null
    stage: string | null
  }> = []

  // Server-owned ThinkingIndicator phase stream. The route emits transient
  // `data-thinking` signals so the client never has to sniff `parts`. State:
  //   activeToolCalls — depth (handles parallel/nested tool calls)
  //   currentlyVisible — server's belief about whether the rabbit should show
  //   toolEverFired   — distinguishes preamble→hide('plain-text') from
  //                     post-tool→hide('final-text')
  // No global `toolConfirmed` / `hideSent` latches: confirm re-fires on every
  // depth 0→1 transition so tool→text→tool sequences re-show correctly.
  const stream = createUIMessageStream({
    originalMessages: messages,
    generateId: () => assistantMessageId,
    execute: async ({ writer }) => {
      let activeToolCalls = 0
      let currentlyVisible = false
      let toolEverFired = false
      let sawRenderableOutput = false
      let streamAborted = false
      let pendingFinishChunk: Extract<UIMessageChunk, { type: 'finish' }> | null = null
      const toolNamesByCallId = new Map<string, string>()
      let toolOnlyRecoveryText: string | null = null
      let toolFailureRecoveryText: string | null = null
      let mandatoryToolFollowUpText: string | null = null
      let renderedText = ''

      const emitHide = (reason: 'plain-text' | 'final-text' | 'finish' | 'error') => {
        if (!currentlyVisible) return
        currentlyVisible = false
        writer.write({
          type: 'data-thinking',
          data: { phase: 'hide', messageId: assistantMessageId, reason },
          transient: true,
        })
      }

      // Explicit assistant start chunk so the client has an assistant row to
      // render during TTFT, plus provisional show. The reserved
      // assistantMessageId is wired via createUIMessageStream's generateId.
      writer.write({ type: 'start', messageId: assistantMessageId })
      writer.write({
        type: 'data-thinking',
        data: { phase: 'show', messageId: assistantMessageId },
        transient: true,
      })
      currentlyVisible = true

      // Inspect chunks before forwarding so we can hide on first visible
      // non-whitespace text. sendStart:false because we already emitted start.
      // The try begins before stream creation so both an initial provider
      // rejection and a later iterator failure receive the same persistence,
      // incident, and visible-error treatment. The finally guarantees a
      // terminal hide in every case.
      const activeToolCallIds = new Set<string>()
      try {
        for (let agentAttempt = 1; agentAttempt <= 2; agentAttempt += 1) {
          const result = await configuredAgent.agent.stream({
            messages: modelMessages,
            abortSignal: request.signal,
          })
          for await (const chunk of result.toUIMessageStream({ sendStart: false })) {
            if (chunk.type === 'finish') {
              pendingFinishChunk = chunk
              continue
            }
            if (chunk.type === 'abort' || chunk.type === 'error') {
              streamAborted = true
            }
            if (chunk.type === 'tool-input-available') {
              toolNamesByCallId.set(chunk.toolCallId, chunk.toolName)
              if (!activeToolCallIds.has(chunk.toolCallId)) {
                activeToolCallIds.add(chunk.toolCallId)
                activeToolCalls = activeToolCallIds.size
                toolEverFired = true
                if (activeToolCalls === 1) {
                  writer.write({
                    type: 'data-thinking',
                    data: { phase: 'confirm', messageId: assistantMessageId },
                    transient: true,
                  })
                  currentlyVisible = true
                }
              }
            }
            if (chunk.type === 'tool-output-available') {
              activeToolCallIds.delete(chunk.toolCallId)
              activeToolCalls = activeToolCallIds.size
              const toolName = toolNamesByCallId.get(chunk.toolCallId)
              if (toolName) {
                executedToolNames.push(toolName)
                const failure = getNicNacToolFailure(toolName, chunk.output)
                if (failure) {
                  toolFailures.push({
                    toolName: failure.toolName,
                    errorTier: failure.errorTier,
                    code: failure.code,
                    stage: failure.stage,
                  })
                  toolFailureRecoveryText =
                    getNicNacToolOnlyRecoveryText(toolName, chunk.output, {
                      latestUserText,
                    }) ??
                    NIC_NAC_EMPTY_RESPONSE_FALLBACK
                }
                toolOnlyRecoveryText =
                  getNicNacToolOnlyRecoveryText(toolName, chunk.output, {
                    latestUserText,
                  }) ??
                  toolOnlyRecoveryText
                mandatoryToolFollowUpText =
                  getNicNacMandatoryToolFollowUpText(toolName, chunk.output) ??
                  mandatoryToolFollowUpText
              }
            }
            if (
              chunk.type === 'tool-output-error' ||
              chunk.type === 'tool-output-denied' ||
              chunk.type === 'tool-approval-request'
            ) {
              activeToolCallIds.delete(chunk.toolCallId)
              activeToolCalls = activeToolCallIds.size
            }
            if (
              toolFailureRecoveryText &&
              ['text-start', 'text-delta', 'text-end'].includes(chunk.type)
            ) {
              continue
            }
            if (isRenderableNicNacStreamChunk(chunk)) {
              sawRenderableOutput = true
            }
            if (chunk.type === 'text-delta') renderedText += chunk.delta
            if (
              chunk.type === 'text-delta' &&
              /\S/.test(chunk.delta) &&
              currentlyVisible &&
              activeToolCalls === 0
            ) {
              emitHide(toolEverFired ? 'final-text' : 'plain-text')
            }
            writer.write(chunk)
          }

          const shouldRetryEmptyAgentTurn =
            agentAttempt === 1 &&
            !streamAborted &&
            !streamErrorMessage &&
            !sawRenderableOutput &&
            !toolEverFired
          if (!shouldRetryEmptyAgentTurn) break

          pendingFinishChunk = null
          await logIncident({
            errorType: 'agent_empty_output_retry',
            repId,
            conversationId,
            severity: 'warn',
            details: { runId, attempt: agentAttempt },
          })
        }
        if (
          !streamAborted &&
          !streamErrorMessage &&
          !sawRenderableOutput &&
          !toolOnlyRecoveryText
        ) {
          const calendarRecoveryStartedAt = Date.now()
          const calendarRecovery = await recoverNicNacEmptyCalendarRead({
            latestUserText,
            executedToolNames,
            readShows: (input) =>
              readMyShowsForNicNac({ repId, supabase }, input),
          })
          if (calendarRecovery) {
            executedToolNames.push(calendarRecovery.toolName)
            toolOnlyRecoveryText = calendarRecovery.text
            await logToolExecution({
              toolName: calendarRecovery.toolName,
              repId,
              conversationId,
              runId,
              success: calendarRecovery.succeeded,
              durationMs: Date.now() - calendarRecoveryStartedAt,
              errorMessage: calendarRecovery.errorMessage ?? undefined,
            })
            if (!calendarRecovery.succeeded) {
              toolFailures.push({
                toolName: calendarRecovery.toolName,
                errorTier: 'escalate',
                code: 'EMPTY_TURN_CALENDAR_READ_FAILED',
                stage: 'empty_turn_recovery',
              })
            }
            await logIncident({
              errorType: calendarRecovery.succeeded
                ? 'empty_model_output_calendar_read_recovered'
                : 'empty_model_output_calendar_read_recovery_failed',
              repId,
              conversationId,
              severity: calendarRecovery.succeeded ? 'warn' : 'error',
              details: {
                runId,
                toolName: calendarRecovery.toolName,
                errorMessage: calendarRecovery.errorMessage,
              },
            })
          }
        }
        if (!streamAborted && !streamErrorMessage && toolFailureRecoveryText) {
          const fallbackTextId = randomUUID()
          writer.write({ type: 'text-start', id: fallbackTextId })
          writer.write({
            type: 'text-delta',
            id: fallbackTextId,
            delta: toolFailureRecoveryText,
          })
          writer.write({ type: 'text-end', id: fallbackTextId })
        } else if (
          !streamAborted &&
          !streamErrorMessage &&
          mandatoryToolFollowUpText &&
          !/add\b[\s\S]{0,80}\b(?:received|got)\b[\s\S]{0,80}\b(?:Dance Floor|board)|(?:received|got)\b[\s\S]{0,80}\badd\b[\s\S]{0,80}\b(?:Dance Floor|board)/i.test(
            renderedText,
          )
        ) {
          const followUpTextId = randomUUID()
          writer.write({ type: 'text-start', id: followUpTextId })
          writer.write({
            type: 'text-delta',
            id: followUpTextId,
            delta: `${sawRenderableOutput ? '\n\n' : ''}${mandatoryToolFollowUpText}`,
          })
          writer.write({ type: 'text-end', id: followUpTextId })
        } else if (!streamAborted && !streamErrorMessage && !sawRenderableOutput) {
          emptyOutputRecovered = true
          const fallbackTextId = randomUUID()
          writer.write({ type: 'text-start', id: fallbackTextId })
          writer.write({
            type: 'text-delta',
            id: fallbackTextId,
            delta: toolOnlyRecoveryText ?? NIC_NAC_EMPTY_RESPONSE_FALLBACK,
          })
          writer.write({ type: 'text-end', id: fallbackTextId })
        }
        if (pendingFinishChunk) writer.write(pendingFinishChunk)
      } catch (err) {
        streamErrorMessage = extractStreamErrorMessage(err)
        console.error('[nic-nac] agent stream error:', err)
        await logIncident({
          errorType: 'agent_stream_error',
          repId,
          conversationId,
          severity: 'error',
          details: { runId, message: streamErrorMessage },
        })
        throw err
      } finally {
        emitHide('finish')
      }
    },
    onFinish: async ({ responseMessage, isAborted, isContinuation: sdkIsContinuation }) => {
      // data-thinking parts are transient and will not appear in
      // responseMessage.parts, so persistence stays clean.
      //
      // Continuation (HITL resume): the prior turn already committed with
      // status='complete'; we're augmenting its parts with the post-approval
      // state. Use checkpointAssistant (parts-only UPDATE) and never flip
      // status to 'aborted' — that would erase the approval-asking turn
      // from canonical history (loadCanonicalHistory drops non-complete
      // assistant rows from the model's view).
      try {
        const normalizedParts = normalizeNicNacAssistantParts(responseMessage.parts)
        const hardFailSummary = summarizeHardFailDetection(
          responseMessage.parts
            .filter((part) => (part as { type?: string }).type === 'text')
            .map((part) => (part as { text?: string }).text ?? ''),
        )
        if (sdkIsContinuation) {
          if (shouldCheckpointContinuation({
            isAborted,
            streamErrorMessage,
            parts: normalizedParts,
          })) {
            await checkpointAssistant(supabase, {
              conversationId,
              messageId: responseMessage.id,
              parts: normalizedParts,
            })
          }
        } else if (isAborted || streamErrorMessage) {
          await abortAssistant(supabase, {
            conversationId,
            messageId: responseMessage.id,
            parts: normalizedParts,
          })
        } else {
          await completeAssistant(supabase, {
            conversationId,
            messageId: responseMessage.id,
            parts: normalizedParts,
          })
        }
        await logNicNacRun({
          runId,
          repId,
          conversationId,
          model: modelPolicy.modelId,
          modelPolicy: modelPolicy.key,
          modelProvider: modelPolicy.provider,
          reasoningLevel: modelPolicy.reasoning,
          productContext,
          status:
            streamErrorMessage || toolFailures.length > 0
              ? 'error'
              : isAborted
                ? 'aborted'
                : 'complete',
          latencyMs: Date.now() - runStartedAt,
          intents: toolIntents,
          toolNames: activeToolNames,
          executedToolNames,
          toolFailures,
          modelContext: {
            originalMessageCount: messages.length,
            modelMessageCount: modelContext.messages.length,
            droppedMessageCount: modelContext.droppedMessageCount,
            estimatedTokens: modelContext.estimatedTokens,
            wasCompacted: modelContext.wasCompacted,
          },
          contextAssembly: assembledContext.telemetry,
          usage: runUsage,
          errorMessage:
            streamErrorMessage ??
            (toolFailures.length > 0
              ? `tool_failure:${toolFailures
                  .map(
                    (failure) =>
                      `${failure.toolName}:${failure.code ?? failure.errorTier}`,
                  )
                  .join(',')}`
              : undefined) ??
            (emptyOutputRecovered ? 'empty_model_output_recovered' : undefined),
          workflow: activeTradeBoardWorkflow
            ? {
                id: activeTradeBoardWorkflow.id,
                type: activeTradeBoardWorkflow.workflowType,
                phaseBefore:
                  tradeBoardWorkflowContext.sessionBefore?.phase ??
                  activeTradeBoardWorkflow.phase,
                phaseAfter: activeTradeBoardWorkflow.phase,
                statusBefore:
                  tradeBoardWorkflowContext.sessionBefore?.status ??
                  activeTradeBoardWorkflow.status,
                statusAfter: activeTradeBoardWorkflow.status,
                toolPolicySource,
                photoRoles: activeTradeBoardWorkflow.photos.map((photo) => ({
                  declaredRole: photo.declaredRole,
                  visualRole: photo.visualRole,
                  roleConfirmed: photo.roleConfirmed,
                  quality: photo.quality,
                })),
                hardFailPhraseCount: hardFailSummary.count,
                hardFailPhrases: hardFailSummary.phrases,
              }
            : tradeWorkflowContext.sessionAfter
              ? {
                  id: tradeWorkflowContext.sessionAfter.id,
                  type: tradeWorkflowContext.sessionAfter.workflowType,
                  phaseBefore:
                    tradeWorkflowContext.sessionBefore?.phase ??
                    tradeWorkflowContext.sessionAfter.phase,
                  phaseAfter: tradeWorkflowContext.sessionAfter.phase,
                  statusBefore:
                    tradeWorkflowContext.sessionBefore?.status ??
                    tradeWorkflowContext.sessionAfter.status,
                  statusAfter: tradeWorkflowContext.sessionAfter.status,
                  toolPolicySource,
                  photoRoles: [],
                  hardFailPhraseCount: hardFailSummary.count,
                  hardFailPhrases: hardFailSummary.phrases,
                }
              : calendarWorkflowContext.sessionAfter
                ? {
                    id: calendarWorkflowContext.sessionAfter.id,
                    type: calendarWorkflowContext.sessionAfter.workflowType,
                    phaseBefore:
                      calendarWorkflowContext.sessionBefore?.phase ??
                      calendarWorkflowContext.sessionAfter.phase,
                    phaseAfter: calendarWorkflowContext.sessionAfter.phase,
                    statusBefore:
                      calendarWorkflowContext.sessionBefore?.status ??
                      calendarWorkflowContext.sessionAfter.status,
                    statusAfter: calendarWorkflowContext.sessionAfter.status,
                    toolPolicySource,
                    photoRoles: [],
                    hardFailPhraseCount: hardFailSummary.count,
                    hardFailPhrases: hardFailSummary.phrases,
                  }
                : undefined,
        })
      } catch (err) {
        console.error('[nic-nac] persistence onFinish error:', err)
        await logIncident({
          errorType: 'persistence_finish_failed',
          repId,
          conversationId,
          severity: 'error',
          details: { runId, message: (err as Error).message, isAborted },
        })
      }
    },
  })

  return createUIMessageStreamResponse({
    stream,
    headers: responseHeaders,
    consumeSseStream: async ({ stream }) => {
      const reader = stream.getReader()
      try {
        while (true) {
          const { done } = await reader.read()
          if (done) break
        }
      } catch (err) {
        console.error('[nic-nac] consumeSseStream error:', err)
      } finally {
        reader.releaseLock()
      }
    },
  })
}
