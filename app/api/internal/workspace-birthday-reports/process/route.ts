import { NextResponse } from 'next/server'
import {
  enqueueDueWeeklyBirthdayReports,
  processWorkspaceMessageAutomation,
} from '@/lib/services/workspace-message-automation'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function authorize(request: Request) {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) {
    return NextResponse.json(
      { error: 'workspace birthday report cron secret is not configured.' },
      { status: 503 },
    )
  }
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  return null
}

export async function GET(request: Request) {
  const authError = authorize(request)
  if (authError) return authError
  const admin = createAdminClient()
  const now = new Date()
  const enqueued = await enqueueDueWeeklyBirthdayReports({ supabase: admin, now })
  const batches = []
  for (let index = 0; index < 20; index += 1) {
    const result = await processWorkspaceMessageAutomation({
      supabase: admin,
      workerId: `vercel-weekly-birthdays-${now.getTime()}-${index}`,
      limit: 100,
      now,
    })
    batches.push(result)
    if (result.claimed < 100) break
  }
  return NextResponse.json({
    ok: true,
    enqueued: enqueued.length,
    claimed: batches.reduce((sum, result) => sum + result.claimed, 0),
    completed: batches.reduce((sum, result) => sum + result.completed, 0),
    failed: batches.reduce((sum, result) => sum + result.failed, 0),
  })
}
