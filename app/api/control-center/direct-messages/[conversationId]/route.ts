import { NextResponse } from 'next/server'
import { z } from 'zod'

import { requireOwnerDirectAccess } from '@/lib/control-center/owner-direct-auth'
import { operatorCommunicationError } from '@/lib/control-center/operator-communication-route'
import { getOwnerDirectConversation } from '@/lib/services/workspace-owner-direct'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_request: Request, context: { params: Promise<{ conversationId: string }> }) {
  try {
    await requireOwnerDirectAccess()
    const id = z.string().uuid().safeParse((await context.params).conversationId)
    if (!id.success) return NextResponse.json({ error: 'Choose a valid direct message.' }, { status: 400 })
    return NextResponse.json({ ok: true, ...await getOwnerDirectConversation(createAdminClient(), id.data) })
  } catch (error) {
    return operatorCommunicationError(error, 'That direct message could not be loaded.')
  }
}
