import { NextResponse } from 'next/server'
import { processReadyPhotoEnhancementQueue } from '@/lib/services/photo-enhancement-queue'
import {
  clearExpiredTradeRequestRevealScreenshots,
  getExpiredTradeRequestRevealScreenshotPaths,
} from '@/lib/services/trade-requests'
import { removeTradeRequestRevealScreenshots } from '@/lib/services/storage'
import { cleanupTradeUploadTickets } from '@/lib/services/trade-request-uploads'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function readLimit(url: URL) {
  const raw = url.searchParams.get('limit')
  if (!raw) return undefined
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) {
    return NextResponse.json(
      { error: 'photo queue cron secret is not configured.' },
      { status: 503 },
    )
  }

  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  return null
}

export async function GET(request: Request) {
  const authError = isAuthorized(request)
  if (authError) return authError

  const limit = readLimit(new URL(request.url))
  if (limit === null) {
    return NextResponse.json(
      { error: 'limit must be a positive whole number.' },
      { status: 400 },
    )
  }

  const admin = createAdminClient()
  const tradeUploadTicketCleanup = await cleanupTradeUploadTickets(admin)
  const result = await processReadyPhotoEnhancementQueue(admin, {
    limit: limit ?? 25,
  })
  const expiredScreenshotPaths =
    await getExpiredTradeRequestRevealScreenshotPaths(admin)

  if (expiredScreenshotPaths.length > 0) {
    await removeTradeRequestRevealScreenshots(expiredScreenshotPaths)
    await clearExpiredTradeRequestRevealScreenshots(
      admin,
      expiredScreenshotPaths,
    )
  }

  return NextResponse.json({
    ok: true,
    result,
    tradeRequestScreenshotCleanup: {
      removedCount: expiredScreenshotPaths.length,
    },
    tradeUploadTicketCleanup,
  })
}
