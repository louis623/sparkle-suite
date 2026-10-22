import { NextResponse } from 'next/server'
import { getPaidNicNacContext, AuthError } from '@/lib/nic-nac/auth'
import { ServiceError } from '@/lib/services/errors'
import {
  loadConversationForClient,
  getConversationOwner,
  findForwardRolloverDestination,
} from '@/lib/nic-nac/persistence'
import { createAdminClient } from '@/lib/supabase/admin'
import { retireSupersededPreviews } from '@/lib/nic-nac/turn-replies'
import { getLatestNicNacRunHealth } from '@/lib/nic-nac/run-telemetry'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
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
  const { repId, supabase } = ctx
  const { conversationId } = await params

  if (!conversationId) {
    return NextResponse.json({ error: 'missing_conversation_id' }, { status: 400 })
  }

  const owner = await getConversationOwner(supabase, conversationId)
  if (owner && owner !== repId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const [messages, runHealth] = await Promise.all([
    loadConversationForClient(supabase, conversationId),
    getLatestNicNacRunHealth(repId, conversationId),
  ])
  let visible = messages
  try {
    const movedTo = await findForwardRolloverDestination(
      createAdminClient(),
      repId,
      conversationId,
    )
    if (movedTo) visible = retireSupersededPreviews(messages)
  } catch {
    visible = messages
  }
  return NextResponse.json({ conversationId, messages: visible, runHealth })
}
