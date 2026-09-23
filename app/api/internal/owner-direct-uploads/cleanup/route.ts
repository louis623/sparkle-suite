import { NextResponse } from 'next/server'

import { cleanupExpiredOwnerDirectUploads } from '@/lib/services/workspace-owner-direct'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return NextResponse.json({ error: 'cron secret is not configured' }, { status: 503 })
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  try {
    const result = await cleanupExpiredOwnerDirectUploads(createAdminClient())
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    console.error('[owner-direct-uploads/cleanup] failed', error)
    return NextResponse.json({ error: 'Private upload cleanup failed.' }, { status: 500 })
  }
}
