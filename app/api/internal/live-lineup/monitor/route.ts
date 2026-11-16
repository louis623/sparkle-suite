import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { monitorConfiguration } from '@/lib/live-lineup/monitor-delivery'
import { runLineupMonitor } from '@/lib/live-lineup/monitor-service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return NextResponse.json({error: 'monitor_not_configured'}, {status: 503})
  const expected = Buffer.from(`Bearer ${secret}`), actual = Buffer.from(request.headers.get('authorization') ?? '')
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return NextResponse.json({error: 'unauthorized'}, {status: 401})
  const configuration = monitorConfiguration()
  if (!configuration.monitoring) return NextResponse.json({status: 'disabled', configuration}, {headers: {'Cache-Control': 'no-store'}})
  try {
    const result = await runLineupMonitor(createAdminClient())
    return NextResponse.json(result, {headers: {'Cache-Control': 'no-store'}})
  } catch {
    return NextResponse.json({error: 'monitor_unavailable'}, {status: 503, headers: {'Cache-Control': 'no-store'}})
  }
}
