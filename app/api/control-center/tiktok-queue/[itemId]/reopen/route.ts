import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireOwnerDirectAccess, requireOwnerDirectSameOrigin } from '@/lib/control-center/owner-direct-auth'
import { operatorCommunicationError } from '@/lib/control-center/operator-communication-route'
import { reopenTikTokQueueItem } from '@/lib/services/tiktok-video-queue'
import { createAdminClient } from '@/lib/supabase/admin'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const schema = z.object({})
export async function POST(request: Request, context: { params: Promise<{ itemId: string }> }) {
  try {
    requireOwnerDirectSameOrigin(request)
    const access = await requireOwnerDirectAccess()
    const { itemId } = await context.params
    z.string().uuid().parse(itemId)
    const input = schema.parse(await request.json())
    const result = await reopenTikTokQueueItem(createAdminClient(), { itemId })
    return NextResponse.json({ ok: true, result })
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError) return NextResponse.json({ error: 'Check the video details and try again.' }, { status: 400 })
    return operatorCommunicationError(error, 'The video queue could not be updated.')
  }
}
