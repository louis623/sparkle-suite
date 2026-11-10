import { NextResponse } from 'next/server'
import { cleanupTikTokQueue } from '@/lib/services/tiktok-video-queue'
import { createAdminClient } from '@/lib/supabase/admin'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return NextResponse.json({ error: 'cron secret is not configured' }, { status: 503 })
  if (request.headers.get('authorization') !== `Bearer ${secret}`) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  try {
    const result = await cleanupTikTokQueue(createAdminClient())
    console.info('[tiktok-queue/cleanup]', result)
    return NextResponse.json({ ok: true, ...result })
  } catch {
    return NextResponse.json({ error: 'Video queue cleanup failed.' }, { status: 500 })
  }
}
