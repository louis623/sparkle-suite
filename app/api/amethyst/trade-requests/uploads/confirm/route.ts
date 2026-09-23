import { NextResponse } from 'next/server'

import { resolveAmethystPreviewRep } from '@/lib/amethyst/preview-rep'
import { resolveAmethystRequestTarget } from '@/lib/amethyst/request-rep-target'
import { ServiceError } from '@/lib/services/errors'
import { confirmTradeUpload } from '@/lib/services/trade-request-uploads'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: Request) {
  try {
    const origin = request.headers.get('origin')
    if (origin && new URL(origin).host !== new URL(request.url).host) {
      return NextResponse.json({ code: 'TRADE_UPLOAD_ORIGIN', error: 'Open the Dance Floor page and try again.' }, { status: 403 })
    }
    if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json') ||
        Number(request.headers.get('content-length') ?? 0) > 16 * 1024) {
      return NextResponse.json({ code: 'TRADE_UPLOAD_INVALID_REQUEST', error: 'Refresh the trade form and try again.' }, { status: 400 })
    }
    const input = await request.json() as Record<string, unknown>
    const admin = createAdminClient()
    const target = resolveAmethystRequestTarget(request)
    const targetRep = target.targeted ? await resolveAmethystPreviewRep(admin, {
      env: process.env,
      publicSiteSlug: target.publicSiteSlug,
      repId: target.repId ?? target.customDomain,
      select: 'id, email',
    }) : null
    if (target.targeted && !targetRep?.id) {
      return NextResponse.json({ code: 'TRADE_UPLOAD_UNAVAILABLE', error: 'Trade requests are temporarily unavailable.' }, { status: 503 })
    }
    const result = await confirmTradeUpload(admin, {
      uploadId: typeof input.uploadId === 'string' ? input.uploadId : '',
      listingId: typeof input.listingId === 'string' ? input.listingId : '',
      submissionId: typeof input.submissionId === 'string' ? input.submissionId : '',
      expectedRepId: targetRep?.id,
    })
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } })
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof TypeError) {
      return NextResponse.json({ code: 'TRADE_UPLOAD_INVALID_REQUEST', error: 'Refresh the trade form and try again.' }, { status: 400 })
    }
    if (error instanceof ServiceError) {
      return NextResponse.json({ code: error.code, error: error.userMessage }, { status: error.statusCode })
    }
    console.error('[trade-upload/confirm] error', error)
    return NextResponse.json({ code: 'TRADE_UPLOAD_UNAVAILABLE', error: 'Photo upload is temporarily unavailable.' }, { status: 503 })
  }
}
