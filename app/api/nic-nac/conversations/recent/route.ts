import { NextResponse } from 'next/server'
import { AuthError, getPaidNicNacContext } from '@/lib/nic-nac/auth'
import { listRecentNicNacConversations } from '@/lib/nic-nac/persistence'
import { ServiceError } from '@/lib/services/errors'
import { createAdminClient } from '@/lib/supabase/admin'

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

  const current = new URL(request.url).searchParams.get('current')?.trim() || null
  let rolloverEdges: Array<{
    sourceConversationId: string
    destinationConversationId: string
  }> = []
  try {
    const admin = createAdminClient()
    const { data } = await admin
      .from('nic_nac_rollovers')
      .select('source_conversation_id, destination_conversation_id')
      .eq('rep_id', ctx.repId)
      .order('created_at', { ascending: false })
      .limit(40)
    rolloverEdges = (data ?? []).flatMap((row) => {
      const source = (row as { source_conversation_id?: string }).source_conversation_id?.trim()
      const destination = (row as { destination_conversation_id?: string })
        .destination_conversation_id?.trim()
      if (!source || !destination) return []
      return [{ sourceConversationId: source, destinationConversationId: destination }]
    })
  } catch {
    rolloverEdges = []
  }
  try {
    const conversations = await listRecentNicNacConversations(ctx.supabase, ctx.repId, 5, {
      excludeConversationId: current,
      rolloverEdges,
    })
    return NextResponse.json({ conversations })
  } catch {
    return NextResponse.json({ error: 'recent_unavailable' }, { status: 503 })
  }
}
