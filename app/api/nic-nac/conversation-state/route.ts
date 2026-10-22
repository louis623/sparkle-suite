import { NextResponse } from 'next/server'
import { getPaidNicNacContext, AuthError } from '@/lib/nic-nac/auth'
import { ServiceError } from '@/lib/services/errors'
import {
  findForwardRolloverDestination,
  getConversationOwner,
  getLatestConversationId,
  loadConversationForClient,
} from '@/lib/nic-nac/persistence'
import { retireSupersededPreviews } from '@/lib/nic-nac/turn-replies'
import { createAdminClient } from '@/lib/supabase/admin'
import { getLatestNicNacRunHealth } from '@/lib/nic-nac/run-telemetry'
import { getOperatorSupportRequestContext } from '@/lib/operator-support/request-context'
import {
  assertOperatorSupportConversationId,
  loadOperatorSupportConversation,
} from '@/lib/nic-nac/support-conversation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
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
  const url = new URL(request.url)
  const conversationId = url.searchParams.get('conversationId')?.trim() ?? ''
  const supportContext = getOperatorSupportRequestContext()
  const supportScope = supportContext
    ? {
        supportSessionId: supportContext.session.id,
        operatorRepId: supportContext.actor.operatorRepId,
        targetRepId: supportContext.actor.subjectRepId,
      }
    : null

  if (!conversationId) {
    if (supportScope) {
      return NextResponse.json({ conversationId: supportScope.supportSessionId })
    }
    const latestConversationId = await getLatestConversationId(supabase, repId)
    return NextResponse.json({ conversationId: latestConversationId })
  }

  if (supportScope) {
    try {
      assertOperatorSupportConversationId(conversationId, supportScope)
    } catch {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }
    const [messages, runHealth] = await Promise.all([
      loadOperatorSupportConversation(supabase, supportScope),
      getLatestNicNacRunHealth(repId, conversationId),
    ])
    return NextResponse.json({ conversationId, messages, runHealth })
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
