import { NextResponse } from 'next/server'
import { requireOwnerDirectAccess } from '@/lib/control-center/owner-direct-auth'
import { operatorCommunicationError } from '@/lib/control-center/operator-communication-route'
import { listTikTokQueue } from '@/lib/services/tiktok-video-queue'
import { createAdminClient } from '@/lib/supabase/admin'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function GET(request: Request) {
  try {
    await requireOwnerDirectAccess()
    const tab = new URL(request.url).searchParams.get('tab') ?? 'queue'
    if (tab !== 'queue' && tab !== 'archive') return NextResponse.json({ error: 'Choose Queue or Archive.' }, { status: 400 })
    return NextResponse.json(await listTikTokQueue(createAdminClient(), tab))
  } catch (error) { return operatorCommunicationError(error, 'The video queue could not be loaded.') }
}
