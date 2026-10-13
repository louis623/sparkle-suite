import { NextResponse } from 'next/server'
import { getControlCenterAccess } from '@/lib/supabase/operator-auth'
import { runCardQrApproverEmailCheck } from '@/lib/workspace/card-qr/approver-email-check'
import { sendCardQrApproverEmail } from '@/lib/workspace/card-qr/printer-approval'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function hasCronSecret(request: Request) {
  const secret = process.env.CRON_SECRET?.trim()
  return Boolean(secret) && request.headers.get('authorization') === `Bearer ${secret}`
}

export function isNineAmNewYork(now = new Date()) {
  const hour = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', hourCycle: 'h23' }).format(now)
  return Number(hour) === 9
}

/** Daily cron (Vercel): retry unsent approval emails, alert Louis about any left. */
export async function GET(request: Request) {
  if (!process.env.CRON_SECRET?.trim()) return NextResponse.json({ error: 'cron secret is not configured.' }, { status: 503 })
  if (!hasCronSecret(request)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  // Vercel crons are UTC-only, so two schedules (13:00 and 14:00 UTC) fire; only the one that is
  // 9 AM in New York runs. ?force=1 runs regardless (manual use).
  const force = new URL(request.url).searchParams.get('force') === '1'
  if (!force && !isNineAmNewYork()) return NextResponse.json({ ok: true, skipped: 'not 9 AM ET' })
  return NextResponse.json({ ok: true, ...(await runCardQrApproverEmailCheck()) })
}

/** Admin resend for one order. Idempotent: sends only if not already sent and not in flight. */
export async function POST(request: Request) {
  if (!hasCronSecret(request)) {
    try {
      await getControlCenterAccess()
    } catch {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
  }
  const body = (await request.json().catch(() => null)) as { orderId?: unknown } | null
  const orderId = typeof body?.orderId === 'string' ? body.orderId : ''
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) return NextResponse.json({ error: 'orderId (uuid) is required.' }, { status: 400 })
  const result = await sendCardQrApproverEmail(orderId)
  return NextResponse.json({ ok: result === 'sent' || result === 'skipped', result })
}
