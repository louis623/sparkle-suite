// Production /api/thumper route. Ports app/api/thumper/spike/route.ts and
// adds Guardian telemetry + Enforcer audit hooks at the route handler level.
//
// Telemetry approach is fixed: closure-wrapper around tool.execute (NOT the
// AI SDK onStepFinish/onToolCall hook path). See lib/thumper/guardian-telemetry.ts.

import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { streamText, stepCountIs, convertToModelMessages, type UIMessage } from 'ai'
import { createAnthropic } from '@ai-sdk/anthropic'

// Pin baseURL explicitly to avoid an inherited ANTHROPIC_BASE_URL env var
// (sometimes set without /v1) from steering the SDK to the wrong endpoint.
const anthropic = createAnthropic({ baseURL: 'https://api.anthropic.com/v1' })
import { getAuthenticatedThumperContext, AuthError } from '@/lib/thumper/auth'
import {
  loadCanonicalHistory,
  insertUserMessage,
  reserveAssistantMessage,
  completeAssistant,
  abortAssistant,
  recordApprovalEvent,
} from '@/lib/thumper/persistence'
import { buildAllTools } from '@/lib/thumper/tools'
import { THUMPER_SYSTEM_PROMPT } from '@/lib/thumper/system-prompt'
import { probeConversationOwner } from '@/lib/thumper/probe-conversation-owner'
import { logIncident } from '@/lib/thumper/guardian-telemetry'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

interface PostBody {
  conversationId: string
  messages: UIMessage[]
}

// Scan messages for HITL approval-responded parts. AI SDK v6 mutates the
// assistant message parts in place when the user clicks approve/reject.
function extractApprovalResponses(
  messages: UIMessage[]
): Array<{ approvalId: string; approved: boolean; toolName: string }> {
  const out: Array<{ approvalId: string; approved: boolean; toolName: string }> = []
  for (const m of messages) {
    for (const part of m.parts ?? []) {
      const p = part as unknown as {
        type?: string
        state?: string
        approval?: { id?: string; approved?: boolean }
        toolName?: string
      }
      if (p?.state === 'approval-responded' && p?.approval?.id) {
        out.push({
          approvalId: p.approval.id,
          approved: p.approval.approved ?? false,
          toolName:
            p.toolName ??
            (p.type?.startsWith('tool-') ? p.type.slice('tool-'.length) : 'unknown'),
        })
      }
    }
  }
  return out
}

export async function POST(request: Request) {
  const runId = randomUUID()
  const responseHeaders = { 'x-thumper-run-id': runId }

  let ctx
  try {
    ctx = await getAuthenticatedThumperContext()
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json(
        { error: 'unauthenticated' },
        { status: 401, headers: responseHeaders }
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

  console.info('[thumper] run', { runId, conversationId, repId })

  // Ownership probe — admin client, NOT RLS-filtered. RLS would return null
  // for cross-tenant conversations and silently let cross-tenant injection
  // through (red-team attack #7).
  let existingOwner: string | null = null
  try {
    existingOwner = await probeConversationOwner(conversationId)
  } catch (err) {
    await logIncident({
      errorType: 'probe_owner_failed',
      repId,
      conversationId,
      severity: 'error',
      details: { runId, message: (err as Error).message },
    })
    throw err
  }
  if (existingOwner && existingOwner !== repId) {
    return NextResponse.json(
      { error: 'forbidden' },
      { status: 403, headers: responseHeaders }
    )
  }

  // Approval replay protection. UNIQUE(approval_id) is the durable backstop.
  const approvals = extractApprovalResponses(messages)
  for (const a of approvals) {
    const { replayed } = await recordApprovalEvent(supabase, {
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
  const existingHistory = await loadCanonicalHistory(supabase, conversationId)
  const existingIds = new Set(existingHistory.map((m) => m.id))
  for (const m of messages) {
    if (m.role !== 'user') continue
    if (existingIds.has(m.id)) continue
    await insertUserMessage(supabase, {
      conversationId,
      repId,
      messageId: m.id,
      parts: m.parts,
    })
  }

  // Reserve assistant row before streamText starts. Same ID is wired to the
  // SDK via generateMessageId so the DB row and SDK-emitted message stay in
  // sync even if the stream aborts.
  const assistantMessageId = randomUUID()
  await reserveAssistantMessage(supabase, {
    conversationId,
    repId,
    messageId: assistantMessageId,
  })

  const tools = buildAllTools({ repId, supabase, conversationId, runId })

  const modelMessages = await convertToModelMessages(messages)
  const result = streamText({
    model: anthropic('claude-haiku-4-5-20251001'),
    system: THUMPER_SYSTEM_PROMPT,
    messages: modelMessages,
    tools,
    stopWhen: stepCountIs(5),
    providerOptions: {
      anthropic: {
        cacheControl: { type: 'ephemeral' },
      },
    },
    onError: async (err) => {
      console.error('[thumper] streamText error:', err)
      await logIncident({
        errorType: 'streamtext_error',
        repId,
        conversationId,
        severity: 'error',
        details: { runId, message: (err as { error?: Error })?.error?.message ?? String(err) },
      })
    },
    onFinish: (event) => {
      console.log('[thumper] streamText finish', {
        runId,
        rep: rep.email,
        conversationId,
        totalUsage: event.totalUsage,
      })
    },
  })

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    generateMessageId: () => assistantMessageId,
    headers: responseHeaders,
    onFinish: async ({ responseMessage, isAborted }) => {
      try {
        if (isAborted) {
          await abortAssistant(supabase, {
            conversationId,
            messageId: responseMessage.id,
            parts: responseMessage.parts,
          })
        } else {
          await completeAssistant(supabase, {
            conversationId,
            messageId: responseMessage.id,
            parts: responseMessage.parts,
          })
        }
      } catch (err) {
        console.error('[thumper] persistence onFinish error:', err)
        await logIncident({
          errorType: 'persistence_finish_failed',
          repId,
          conversationId,
          severity: 'error',
          details: { runId, message: (err as Error).message, isAborted },
        })
      }
    },
    consumeSseStream: async ({ stream }) => {
      const reader = stream.getReader()
      try {
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done } = await reader.read()
          if (done) break
        }
      } catch (err) {
        console.error('[thumper] consumeSseStream error:', err)
      } finally {
        reader.releaseLock()
      }
    },
  })
}
