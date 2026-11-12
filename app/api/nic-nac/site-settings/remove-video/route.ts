import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getPaidNicNacContext, AuthError } from '@/lib/nic-nac/auth'
import { requireOwnerDirectAccess, requireOwnerDirectSameOrigin } from '@/lib/control-center/owner-direct-auth'
import { operatorCommunicationError } from '@/lib/control-center/operator-communication-route'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSiteSettingsDashboard } from '@/lib/services/site-settings'
import { tiktokQueueRpc } from '@/lib/services/tiktok-video-queue'
import { ServiceError } from '@/lib/services/errors'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const schema = z.object({
  slotKey: z.enum(['showcase', 'about_2', 'about_3', 'about_4']),
  expectedUrl: z.string().min(1).max(4096),
  repId: z.string().uuid().optional(),
}).strict()

export async function POST(request: Request) {
  try {
    requireOwnerDirectSameOrigin(request)
    const input = schema.parse(await request.json())
    let repId: string
    let client
    if (input.repId) {
      await requireOwnerDirectAccess()
      repId = input.repId
      client = createAdminClient()
    } else {
      const context = await getPaidNicNacContext()
      repId = context.repId
      client = context.supabase
    }
    await tiktokQueueRpc(createAdminClient(), 'remove_tiktok_slot', {
      p_rep_id: repId, p_slot_key: input.slotKey, p_expected_url: input.expectedUrl,
    })
    const settings = await getSiteSettingsDashboard(client, repId)
    return NextResponse.json({ ok: true, settings })
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError) return NextResponse.json({ error: 'Check the video details and try again.' }, { status: 400 })
    if (error instanceof AuthError) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    if (error instanceof ServiceError) return NextResponse.json({ error: error.userMessage }, { status: error.statusCode })
    return operatorCommunicationError(error, 'The video could not be removed.')
  }
}
