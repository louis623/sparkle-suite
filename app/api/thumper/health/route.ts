import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// In-memory token bucket — 60 req/min per IP. Resets on cold start; fine for
// v1 since this endpoint has no auth and is intentionally cheap.
const RATE_LIMIT_MAX = 60
const RATE_LIMIT_WINDOW_MS = 60_000
const buckets = new Map<string, { count: number; windowStart: number }>()

function rateLimit(ip: string): boolean {
  const now = Date.now()
  const bucket = buckets.get(ip)
  if (!bucket || now - bucket.windowStart > RATE_LIMIT_WINDOW_MS) {
    buckets.set(ip, { count: 1, windowStart: now })
    return true
  }
  if (bucket.count >= RATE_LIMIT_MAX) return false
  bucket.count++
  return true
}

export async function GET(request: Request) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip')?.trim() ||
    'unknown'
  if (!rateLimit(ip)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
  }

  const supabase = createAdminClient()

  // db_reachable — single trivial query
  let dbReachable = false
  try {
    const { error } = await supabase.from('reps').select('id', { count: 'exact', head: true }).limit(1)
    dbReachable = !error
  } catch {
    dbReachable = false
  }

  // recent_error_rate — last 15 min, warn/error/critical incidents over total tool executions
  let recentErrorRate = 0
  try {
    const fifteenMinAgo = new Date(Date.now() - 15 * 60_000).toISOString()
    const [incidentsRes, executionsRes] = await Promise.all([
      supabase
        .from('thumper_incidents')
        .select('id', { count: 'exact', head: true })
        .in('severity', ['warn', 'error', 'critical'])
        .gte('created_at', fifteenMinAgo),
      supabase
        .from('tool_executions')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', fifteenMinAgo),
    ])
    const incidents = incidentsRes.count ?? 0
    const executions = executionsRes.count ?? 0
    recentErrorRate = executions > 0 ? incidents / executions : 0
  } catch {
    recentErrorRate = 0
  }

  return NextResponse.json({
    api_reachable: true,
    db_reachable: dbReachable,
    recent_error_rate: recentErrorRate,
    timestamp: new Date().toISOString(),
  })
}
