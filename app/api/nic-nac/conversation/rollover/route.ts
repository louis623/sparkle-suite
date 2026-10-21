import { randomUUID } from 'crypto'
import { NextResponse } from 'next/server'
import { AuthError, getPaidNicNacContext } from '@/lib/nic-nac/auth'
import { ServiceError } from '@/lib/services/errors'
import {
  getConversationOwner,
  deleteConversationMessages,
  insertConversationMessages,
  loadConversationForClient,
} from '@/lib/nic-nac/persistence'
import { findActionableApproval } from '@/lib/nic-nac/hitl-state'
import {
  buildNicNacRolloverMessages,
  shouldCarryTradeBoardIntakeOnRollover,
} from '@/lib/nic-nac/rollover'
import { logNicNacRollover } from '@/lib/nic-nac/rollover-telemetry'
import {
  getActiveTradeBoardIntakeSession,
  transferActiveTradeBoardIntakeConversation,
} from '@/lib/nic-nac/workflows/trade-board-intake-store'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  let ctx
  try {
    ctx = await getPaidNicNacContext()
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    }
    if (err instanceof ServiceError) {
      return NextResponse.json(
        { error: err.userMessage, code: err.code },
        { status: err.statusCode },
      )
    }
    throw err
  }

  const body = (await request.json().catch(() => null)) as {
    conversationId?: string
  } | null
  const sourceConversationId = body?.conversationId
  if (!sourceConversationId) {
    return NextResponse.json({ error: 'missing_conversation_id' }, { status: 400 })
  }

  const { repId, supabase } = ctx
  const owner = await getConversationOwner(supabase, sourceConversationId)
  if (!owner) {
    return NextResponse.json({ error: 'conversation_not_found' }, { status: 404 })
  }
  if (owner !== repId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const sourceMessages = await loadConversationForClient(supabase, sourceConversationId)
  if (findActionableApproval(sourceMessages)) {
    return NextResponse.json({ error: 'pending_approval' }, { status: 409 })
  }

  const conversationId = randomUUID()
  const nowIso = new Date().toISOString()
  const admin = createAdminClient()
  let carryWorkflow = false
  try {
    const activeIntake = await getActiveTradeBoardIntakeSession(admin, {
      repId,
      conversationId: sourceConversationId,
      nowIso,
    })
    carryWorkflow = shouldCarryTradeBoardIntakeOnRollover(activeIntake)
  } catch {
    carryWorkflow = false
  }
  const messages = buildNicNacRolloverMessages(sourceMessages, undefined, {
    dropPendingPiece: !carryWorkflow,
  })
  await insertConversationMessages(supabase, {
    conversationId,
    repId,
    messages,
  })
  let workflowTransfer: Awaited<
    ReturnType<typeof transferActiveTradeBoardIntakeConversation>
  > = null
  if (carryWorkflow) {
    try {
      workflowTransfer = await transferActiveTradeBoardIntakeConversation(
        admin,
        {
          repId,
          sourceConversationId,
          destinationConversationId: conversationId,
          nowIso,
        },
      )
    } catch (error) {
      await deleteConversationMessages(supabase, { conversationId, repId })
      throw error
    }
  }
  if (workflowTransfer?.replayed) {
    await deleteConversationMessages(supabase, { conversationId, repId })
    const replayMessages = await loadConversationForClient(
      supabase,
      workflowTransfer.destinationConversationId,
    )
    return NextResponse.json({
      conversationId: workflowTransfer.destinationConversationId,
      messages: replayMessages,
      carriedMessageCount: replayMessages.length,
      workflowId: workflowTransfer.workflowId,
    })
  }
  await logNicNacRollover({
    repId,
    sourceConversationId,
    destinationConversationId: conversationId,
    carriedMessageCount: messages.length,
  })

  return NextResponse.json({
    conversationId,
    messages,
    carriedMessageCount: messages.length,
    workflowId: workflowTransfer?.workflowId ?? null,
  })
}
