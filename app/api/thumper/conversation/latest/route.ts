import { NextResponse } from 'next/server'
import { getAuthenticatedThumperContext, AuthError } from '@/lib/thumper/auth'
import { getLatestConversationId } from '@/lib/thumper/persistence'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  let ctx
  try {
    ctx = await getAuthenticatedThumperContext()
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    }
    throw err
  }
  const { repId, supabase } = ctx
  const conversationId = await getLatestConversationId(supabase, repId)
  return NextResponse.json({ conversationId })
}
