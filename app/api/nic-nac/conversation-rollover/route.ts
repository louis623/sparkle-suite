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
import { prepareNicNacRolloverMessages } from '@/lib/nic-nac/rollover'
import { enrichKnownFromPieceMessages } from '@/lib/nic-nac/workflows/trade-board-known-fields'
import { logNicNacRollover } from '@/lib/nic-nac/rollover-telemetry'
import {
  copyConfirmedPieceDetailsToConversation,
  getActiveTradeBoardIntakeSession,
  saveCarriedPieceDetails,
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
  const activeIntake = await getActiveTradeBoardIntakeSession(admin, {
    repId,
    conversationId: sourceConversationId,
    nowIso,
  })
  const unfinished =
    activeIntake &&
    (activeIntake.status === 'active' ||
      activeIntake.status === 'needs_human_review')
  const known = unfinished
    ? enrichKnownFromPieceMessages(activeIntake.known, sourceMessages)
    : null
  const prepared = prepareNicNacRolloverMessages(sourceMessages, known)
  const messages = prepared.messages
  await insertConversationMessages(supabase, {
    conversationId,
    repId,
    messages,
  })
  const carryItem = prepared.carry?.itemNumber?.trim().toUpperCase() || ''
  const storedItem = known?.itemNumber?.trim().toUpperCase() || ''
  try {
    if (unfinished && activeIntake && carryItem && carryItem === storedItem) {
      await copyConfirmedPieceDetailsToConversation(admin, {
        repId,
        conversationId,
        source: { ...activeIntake, known: known ?? activeIntake.known },
      })
    } else if (prepared.carry?.itemNumber) {
      await saveCarriedPieceDetails(admin, {
        repId,
        conversationId,
        known: {
          itemNumber: prepared.carry.itemNumber,
          jewelryType: prepared.carry.jewelryType,
          designName: prepared.carry.designName,
          collectionName: prepared.carry.collectionName,
          material: prepared.carry.material,
          mainStone: prepared.carry.mainStone,
          ringSize: prepared.carry.ringSize,
          rarityClassification: prepared.carry.rarity,
        },
      })
    }
  } catch {
    // The fresh chat still opens. Details are also in the one notice.
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
    workflowId: null,
  })
}
