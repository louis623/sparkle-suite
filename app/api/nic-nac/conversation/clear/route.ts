import { NextResponse } from 'next/server'
import { getPaidNicNacContext, AuthError } from '@/lib/nic-nac/auth'
import { clearNicNacConversationChain } from '@/lib/nic-nac/persistence'
import { createAdminClient } from '@/lib/supabase/admin'
import { ServiceError } from '@/lib/services/errors'
import { getOperatorSupportRequestContext } from '@/lib/operator-support/request-context'
import {
  assertOperatorSupportConversationId,
  clearOperatorSupportConversation,
} from '@/lib/nic-nac/support-conversation'

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
    conversationId?: unknown
    nextConversationId?: unknown
  } | null
  const conversationId =
    typeof body?.conversationId === 'string' ? body.conversationId.trim() : ''
  const nextConversationId =
    typeof body?.nextConversationId === 'string' ? body.nextConversationId.trim() : ''
  if (!conversationId) {
    return NextResponse.json({ error: 'missing_conversation_id' }, { status: 400 })
  }

  const supportContext = getOperatorSupportRequestContext()
  let clearedConversationIds: string[]
  if (supportContext) {
    const supportScope = {
      supportSessionId: supportContext.session.id,
      operatorRepId: supportContext.actor.operatorRepId,
      targetRepId: supportContext.actor.subjectRepId,
    }
    try {
      assertOperatorSupportConversationId(conversationId, supportScope)
    } catch {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }
    clearedConversationIds = await clearOperatorSupportConversation(
      ctx.supabase,
      supportScope,
    )
  } else {
    clearedConversationIds = await clearNicNacConversationChain(
      ctx.supabase,
      createAdminClient(),
      ctx.repId,
      conversationId,
      nextConversationId,
    )
  }
  return NextResponse.json({
    cleared: true,
    clearedConversationIds,
  })
}
