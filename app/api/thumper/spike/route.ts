import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { streamText, stepCountIs, convertToModelMessages, type UIMessage } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { getAuthenticatedThumperContext, AuthError } from '@/lib/thumper/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  loadCanonicalHistory,
  getConversationOwner,
  insertUserMessage,
  reserveAssistantMessage,
  completeAssistant,
  abortAssistant,
  recordApprovalEvent,
} from '@/lib/thumper/persistence'
import { makeListMyTradeBoardTool } from '@/lib/thumper/tools/list-my-trade-board'
import { makeRemoveListingTool } from '@/lib/thumper/tools/remove-listing'
import { getSystemPrompt } from '@/lib/thumper/system-prompt'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

interface PostBody {
  conversationId: string
  messages: UIMessage[]
  cacheMode?: 'padded' | 'stripped'
}

// Scan an array of messages for approval-responded parts. In AI SDK v6 these
// live on the ASSISTANT message whose parts were mutated in place when the
// user clicked approve/reject on the client.
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
  let ctx
  try {
    ctx = await getAuthenticatedThumperContext()
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    }
    throw err
  }
  const { repId, rep, supabase } = ctx

  let body: PostBody
  try {
    body = (await request.json()) as PostBody
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  if (!body.conversationId || !Array.isArray(body.messages) || body.messages.length === 0) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 })
  }

  const { conversationId, messages } = body
  const cacheMode = body.cacheMode ?? 'padded'

  // Ownership check. MUST use admin client — an RLS-filtered client returns
  // null for cross-tenant conversations (red-team attack #7), which would
  // silently let a rep inject into another rep's conversationId.
  const adminSupabase = createAdminClient()
  const existingOwner = await getConversationOwner(adminSupabase, conversationId)
  if (existingOwner && existingOwner !== repId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  // Approval replay protection: every approval-responded part in the client
  // messages must be either new (recorded in approval_events) or already
  // recorded (duplicate = explicit replay). UNIQUE(approval_id) is the
  // durable backstop.
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
        { status: 400 }
      )
    }
  }

  // Persist any user-role messages from the client array that aren't already
  // in the DB. ON CONFLICT DO NOTHING makes this idempotent.
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

  const tools = {
    list_my_trade_board: makeListMyTradeBoardTool({ repId, supabase }),
    remove_listing: makeRemoveListingTool({ repId, supabase }),
  }

  const systemPrompt = getSystemPrompt({ includePadding: cacheMode === 'padded' })

  const modelMessages = await convertToModelMessages(messages)
  const result = streamText({
    model: anthropic('claude-haiku-4-5-20251001'),
    system: systemPrompt,
    messages: modelMessages,
    tools,
    stopWhen: stepCountIs(5),
    providerOptions: {
      anthropic: {
        cacheControl: { type: 'ephemeral' },
      },
    },
    onError: (err) => {
      console.error('[thumper] streamText error:', err)
    },
    onFinish: (event) => {
      console.log('[thumper] streamText finish', {
        rep: rep.email,
        conversationId,
        totalUsage: event.totalUsage,
        providerMetadata: event.providerMetadata,
      })
    },
  })

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    generateMessageId: () => assistantMessageId,
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
