import { NextResponse } from 'next/server'
import { z } from 'zod'

import { requireOwnerDirectAccess } from '@/lib/control-center/owner-direct-auth'
import { operatorCommunicationError } from '@/lib/control-center/operator-communication-route'
import { createOwnerDirectAttachmentSignedRead } from '@/lib/services/workspace-owner-direct'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_request: Request, context: { params: Promise<{ conversationId: string; attachmentId: string }> }) {
  try {
    await requireOwnerDirectAccess()
    const ids = z.object({ conversationId: z.string().uuid(), attachmentId: z.string().uuid() }).safeParse(await context.params)
    if (!ids.success) return NextResponse.json({ error: 'Choose a valid image.' }, { status: 400 })
    return NextResponse.json(await createOwnerDirectAttachmentSignedRead(createAdminClient(), { ...ids.data, ownerAuthorized: true }))
  } catch (error) {
    return operatorCommunicationError(error, 'That image could not be opened right now.')
  }
}
