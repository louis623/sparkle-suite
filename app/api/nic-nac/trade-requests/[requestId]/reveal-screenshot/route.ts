import { NextResponse } from 'next/server'

import {
  AuthError,
  getPaidNicNacContext,
} from '@/lib/nic-nac/auth'
import { ServiceError } from '@/lib/services/errors'
import { getTradeRequestRevealScreenshotForRep } from '@/lib/services/trade-requests'
import { getTradeRequestRevealScreenshotSignedUrl } from '@/lib/services/storage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function serviceErrorResponse(error: ServiceError) {
  return NextResponse.json(
    { code: error.code, error: error.userMessage },
    { status: error.statusCode },
  )
}

export async function GET(
  request: Request,
  context: { params: Promise<{ requestId: string }> },
) {
  try {
    const { requestId } = await context.params
    const { repId, supabase } = await getPaidNicNacContext()
    const screenshot = await getTradeRequestRevealScreenshotForRep(
      supabase,
      repId,
      requestId,
    )

    if (!screenshot) {
      return NextResponse.json(
        { error: 'Screenshot is unavailable or has expired.' },
        { status: 410 },
      )
    }

    const ttl = Math.min(300, Math.floor((Date.parse(screenshot.expiresAt) - Date.now()) / 1000))
    if (ttl < 1) return NextResponse.json({error:'Photo expired.'},{status:410})
    const thumbnail = new URL(request.url).searchParams.get('variant') === 'thumb'
    const signedUrl = await getTradeRequestRevealScreenshotSignedUrl(
      thumbnail ? screenshot.thumbPath ?? screenshot.objectPath : screenshot.objectPath, ttl,
    )
    return new Response(null,{status:307,headers:{Location:signedUrl,'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'}})
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    }
    if (error instanceof ServiceError) return serviceErrorResponse(error)
    throw error
  }
}
