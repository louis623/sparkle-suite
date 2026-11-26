import { NextResponse } from 'next/server'
import { processDueLookPreviews } from '@/lib/look-preview/queue'
import { validBearer } from '@/lib/services/swap-maintenance'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return NextResponse.json({ error: 'look preview cron secret is not configured.' }, { status: 503 })
  if (!validBearer(request, secret)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  try {
    const result = await processDueLookPreviews(1)
    return NextResponse.json({ ok: true, ...result })
  } catch {
    return NextResponse.json({ ok: false, status: 'sweep-failed' }, { status: 500 })
  }
}
