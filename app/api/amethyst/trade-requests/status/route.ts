import { NextResponse } from 'next/server'
import { getTradeRequestReceiptStatus } from '@/lib/services/trade-requests'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const attempts = new Map<string, { count: number; resetAt: number }>()
const MAX_BUCKETS = 10_000
const PRIVATE_HEADERS = { 'Cache-Control': 'no-store, private', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex, nofollow' }

export async function GET(request: Request) {
  const ip = (request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')?.trim() || 'unknown').slice(0, 128)
  const now = Date.now()
  const previous = attempts.get(ip)
  const next = !previous || previous.resetAt <= now ? { count: 1, resetAt: now + 60_000 } : { ...previous, count: previous.count + 1 }
  if (!previous && attempts.size >= MAX_BUCKETS) {
    const oldestKey = attempts.keys().next().value as string | undefined
    if (oldestKey) attempts.delete(oldestKey)
  }
  attempts.set(ip, next)
  if (next.count > 30) return NextResponse.json({ error: 'Too many requests.' }, { status: 429, headers: PRIVATE_HEADERS })

  const token = new URL(request.url).searchParams.get('token') ?? ''
  if (!/^[a-f0-9]{64}$/.test(token)) return NextResponse.json({ error: 'Receipt not found.' }, { status: 404, headers: PRIVATE_HEADERS })
  try {
    const status = await getTradeRequestReceiptStatus(createAdminClient(), token)
    if (!status) return NextResponse.json({ error: 'Receipt not found.' }, { status: 404, headers: PRIVATE_HEADERS })
    return NextResponse.json(status, { headers: PRIVATE_HEADERS })
  } catch (error) {
    console.error('[amethyst/trade-requests/status] Error:', error)
    return NextResponse.json({ error: 'Could not check this receipt.' }, { status: 503, headers: PRIVATE_HEADERS })
  }
}
