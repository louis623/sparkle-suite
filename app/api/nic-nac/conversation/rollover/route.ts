import { randomUUID } from 'crypto'
import { NextResponse } from 'next/server'
import { AuthError, getPaidNicNacContext } from '@/lib/nic-nac/auth'
import { ServiceError } from '@/lib/services/errors'
import {
  getConversationOwner,
  insertConversationMessages,
  loadConversationForClient,
} from '@/lib/nic-nac/persistence'
import { findActionableApproval } from '@/lib/nic-nac/hitl-state'
import { buildNicNacRolloverMessages } from '@/lib/nic-nac/rollover'
import { logNicNacRollover } from '@/lib/nic-nac/rollover-telemetry'
import { getActiveTradeBoardIntakeSession } from '@/lib/nic-nac/workflows/trade-board-intake-store'
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
  const activeIntake = await getActiveTradeBoardIntakeSession(admin, {
    repId,
    conversationId: sourceConversationId,
    nowIso,
  })
  const unfinished =
    activeIntake &&
    (activeIntake.status === 'active' ||
      activeIntake.status === 'needs_human_review')
  const messages = buildNicNacRolloverMessages(sourceMessages, undefined, {
    dropPendingPiece: true,
    ...(unfinished
      ? { unfinishedItemNumber: activeIntake.known.itemNumber ?? null }
      : {}),
  })
  await insertConversationMessages(supabase, {
    conversationId,
    repId,
    messages,
  })
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
    workflowId: null,
  })
}
