import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireOwnerDirectAccess, requireOwnerDirectSameOrigin } from '@/lib/control-center/owner-direct-auth'
import { operatorCommunicationError } from '@/lib/control-center/operator-communication-route'
import { createTikTokUploadTicket } from '@/lib/services/tiktok-video-queue'
import { createAdminClient } from '@/lib/supabase/admin'
import { VIDEO_MIME, VIDEO_MAX_BYTES, POSTER_SOURCE_MAX_BYTES } from '@/lib/public-site/tiktok-video-limits'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const schema = z.object({ videoContentType: z.enum(VIDEO_MIME), videoByteSize: z.number().int().min(1).max(VIDEO_MAX_BYTES), posterContentType: z.enum(['image/webp', 'image/jpeg']), posterByteSize: z.number().int().min(1).max(POSTER_SOURCE_MAX_BYTES) })
export async function POST(request: Request, context: { params: Promise<{ itemId: string }> }) {
  try {
    requireOwnerDirectSameOrigin(request)
    const access = await requireOwnerDirectAccess()
    const { itemId } = await context.params
    z.string().uuid().parse(itemId)
    const input = schema.parse(await request.json())
    const result = await createTikTokUploadTicket(createAdminClient(), { ...input, itemId, operatorRepId: access.operator.repId })
    return NextResponse.json({ ok: true, result })
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError) return NextResponse.json({ error: 'Check the video details and try again.' }, { status: 400 })
    return operatorCommunicationError(error, 'The video queue could not be updated.')
  }
}
