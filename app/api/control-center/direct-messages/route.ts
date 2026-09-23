import { NextResponse } from 'next/server'
import { z } from 'zod'

import { requireOwnerDirectAccess, requireOwnerDirectSameOrigin } from '@/lib/control-center/owner-direct-auth'
import { operatorCommunicationError } from '@/lib/control-center/operator-communication-route'
import { listOwnerDirectMessages, sendOwnerDirectMessage } from '@/lib/services/workspace-owner-direct'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const sendSchema = z.object({
  repId: z.string().uuid(), body: z.string().trim().min(1).max(10_000),
  clientRequestId: z.string().trim().min(1).max(180),
  uploadIds: z.array(z.string().uuid()).max(3).default([]),
})

export async function GET(request: Request) {
  try {
    await requireOwnerDirectAccess()
    const url = new URL(request.url)
    const options = z.object({
      recipientQuery: z.string().max(80).optional(), threadQuery: z.string().max(80).optional(),
      recipientOffset: z.coerce.number().int().min(0).max(100_000).default(0),
      threadOffset: z.coerce.number().int().min(0).max(100_000).default(0),
    }).safeParse(Object.fromEntries(url.searchParams))
    if (!options.success) return NextResponse.json({ error: 'Check the message search and try again.' }, { status: 400 })
    return NextResponse.json({ ok: true, ...await listOwnerDirectMessages(createAdminClient(), options.data) })
  } catch (error) {
    return operatorCommunicationError(error, 'Direct messages could not be loaded.')
  }
}

export async function POST(request: Request) {
  try {
    requireOwnerDirectSameOrigin(request)
    const access = await requireOwnerDirectAccess()
    const input = sendSchema.safeParse(await request.json())
    if (!input.success) {
      return NextResponse.json({ error: 'Choose one rep and write a message.' }, { status: 400 })
    }
    const result = await sendOwnerDirectMessage(createAdminClient(), {
      ...input.data, operatorRepId: access.operator.repId,
    })
    return NextResponse.json({ ok: true, ...result }, { status: result.created ? 201 : 200 })
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof z.ZodError || error instanceof TypeError) {
      return NextResponse.json({ error: 'Choose one rep and write a message.' }, { status: 400 })
    }
    return operatorCommunicationError(error, 'The direct message could not be sent.')
  }
}
