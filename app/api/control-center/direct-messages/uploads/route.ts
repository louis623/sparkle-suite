import { NextResponse } from 'next/server'
import { z } from 'zod'

import { requireOwnerDirectAccess, requireOwnerDirectSameOrigin } from '@/lib/control-center/owner-direct-auth'
import { operatorCommunicationError } from '@/lib/control-center/operator-communication-route'
import { createOwnerDirectUploadTicket } from '@/lib/services/workspace-owner-direct'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const schema = z.object({
  repId: z.string().uuid(), clientRequestId: z.string().trim().min(1).max(180),
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  byteSize: z.number().int().min(1).max(8 * 1024 * 1024),
})

export async function POST(request: Request) {
  try {
    requireOwnerDirectSameOrigin(request)
    const access = await requireOwnerDirectAccess()
    const input = schema.safeParse(await request.json())
    if (!input.success) return NextResponse.json({ error: 'Choose a valid image.' }, { status: 400 })
    const ticket = await createOwnerDirectUploadTicket(createAdminClient(), {
      ...input.data, operatorRepId: access.operator.repId,
    })
    return NextResponse.json({ ok: true, ...ticket }, { status: 201 })
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Choose a valid image.' }, { status: 400 })
    }
    return operatorCommunicationError(error, 'The image upload could not be prepared.')
  }
}
