import { NextResponse } from 'next/server'
import { z } from 'zod'

import { AuthError, getAuthenticatedNicNacContext } from '@/lib/nic-nac/auth'
import { ServiceError } from '@/lib/services/errors'
import { createOwnerDirectAttachmentSignedRead } from '@/lib/services/workspace-owner-direct'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_request: Request, context: { params: Promise<{ conversationId: string; attachmentId: string }> }) {
  try {
    const { repId } = await getAuthenticatedNicNacContext()
    const ids = z.object({ conversationId: z.string().uuid(), attachmentId: z.string().uuid() }).safeParse(await context.params)
    if (!ids.success) return NextResponse.json({ error: 'Choose a valid image.' }, { status: 400 })
    return NextResponse.json(await createOwnerDirectAttachmentSignedRead(createAdminClient(), { ...ids.data, repId }))
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    if (error instanceof ServiceError) return NextResponse.json({ code: error.code, error: error.userMessage }, { status: error.statusCode })
    console.error('[nic-nac/owner-direct/attachments] read failed', error)
    return NextResponse.json({ error: 'That image could not be opened right now.' }, { status: 500 })
  }
}
