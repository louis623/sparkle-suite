import { NextResponse } from 'next/server'
import { z } from 'zod'
import { dismissalInput } from '@/lib/control-center/video-dismissal'
import { requireOwnerDirectAccess, requireOwnerDirectSameOrigin } from '@/lib/control-center/owner-direct-auth'
import { operatorCommunicationError } from '@/lib/control-center/operator-communication-route'
import { reopenTikTokDismissal } from '@/lib/services/tiktok-video-queue'
import { createAdminClient } from '@/lib/supabase/admin'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function POST(request: Request) {
  try {
    requireOwnerDirectSameOrigin(request)
    const access = await requireOwnerDirectAccess()
    const input = dismissalInput.parse(await request.json())
    const result = await reopenTikTokDismissal(createAdminClient(), input)
    return NextResponse.json({ ok: true, result })
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError) return NextResponse.json({ error: 'Check the video details and try again.' }, { status: 400 })
    return operatorCommunicationError(error, 'The video queue could not be updated.')
  }
}
