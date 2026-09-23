import { NextResponse } from 'next/server'
import {
  getPaidNicNacContext,
  AuthError,
} from '@/lib/nic-nac/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { ServiceError } from '@/lib/services/errors'
import {
  approveTrade,
  getTradeRequests,
  getPendingTradeRequestCount,
  rejectTrade,
} from '@/lib/services/trade-requests'
import { approveTradeWithRevealedItemCapture } from '@/lib/services/trade-swaps'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function readLimit(url: URL) {
  const raw = url.searchParams.get('limit')
  if (!raw) return undefined
  const parsed = Number.parseInt(raw, 10)
  return Number.isSafeInteger(parsed) && parsed >= 1 && parsed <= 50 ? parsed : null
}

function readOffset(url: URL) {
  const raw = url.searchParams.get('offset')
  if (!raw) return 0
  const parsed = Number(raw)
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null
}

function readStatus(value: string | null) {
  if (!value) return undefined
  if (value === 'pending' || value === 'approved' || value === 'denied' || value === 'cancelled') {
    return value
  }
  return null
}

function serviceErrorResponse(error: ServiceError) {
  return NextResponse.json(
    { code: error.code, error: error.userMessage },
    { status: error.statusCode },
  )
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const limit = readLimit(url)
    const statusFilter = readStatus(url.searchParams.get('status'))
    const offset = readOffset(url)
    const requestId = url.searchParams.get('requestId')?.trim() || undefined
    const summary = url.searchParams.get('summary') === '1'

    if (limit === null) {
      return NextResponse.json({ error: 'limit must be a whole number.' }, { status: 400 })
    }
    if (statusFilter === null) {
      return NextResponse.json({ error: 'status is invalid.' }, { status: 400 })
    }
    if (offset === null) return NextResponse.json({ error: 'offset must be a nonnegative whole number.' }, { status: 400 })

    const { repId, supabase } = await getPaidNicNacContext()
    const requests = await getTradeRequests(supabase, repId, {
      statusFilter,
      limit: summary ? 8 : limit ?? undefined,
      offset,
      requestId,
    })
    if (summary) {
      const pendingCount = await getPendingTradeRequestCount(supabase, repId)
      return NextResponse.json({ pendingCount, requests }, { headers: { 'Cache-Control': 'no-store' } })
    }
    return NextResponse.json(requests, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    }
    if (error instanceof ServiceError) return serviceErrorResponse(error)
    throw error
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const action = typeof body?.action === 'string' ? body.action.trim() : ''
    const requestId = typeof body?.requestId === 'string' ? body.requestId.trim() : ''
    const repNotes = typeof body?.repNotes === 'string' ? body.repNotes : undefined
    const verification = {
      verifiedOfferedFamily: typeof body?.verifiedOfferedFamily === 'string' ? body.verifiedOfferedFamily.trim() : '',
      verifiedOfferedType: body?.verifiedOfferedType,
      verificationConfirmed: body?.verificationConfirmed === true,
      finalConfirmation: body?.finalConfirmation === true,
    }

    const { repId } = await getPaidNicNacContext()
    const supabase = createAdminClient()

    if (action === 'approve') {
      const revealedItemNumber =
        typeof body?.revealedItemNumber === 'string'
          ? body.revealedItemNumber.trim()
          : ''
      if (revealedItemNumber) {
        const result = await approveTradeWithRevealedItemCapture(
          supabase,
          repId,
          {
            requestId,
            revealedItemNumber,
            revealedRingSize:
              typeof body?.revealedRingSize === 'string'
                ? body.revealedRingSize
                : undefined,
            repNotes,
            verification,
          },
        )
        return NextResponse.json({ ok: true, result })
      }

      const result = await approveTrade(supabase, repId, requestId, repNotes, verification)
      return NextResponse.json({ ok: true, result })
    }

    if (action === 'reject') {
      const reason =
        body?.reason === 'collection_mismatch' ||
        body?.reason === 'jewelry_type_mismatch' ||
        body?.reason === 'item_unavailable' ||
        body?.reason === 'other'
          ? body.reason
          : undefined
      const customerExplanation = typeof body?.customerExplanation === 'string' ? body.customerExplanation : undefined
      const result = await rejectTrade(supabase, repId, requestId, reason, repNotes, customerExplanation)
      return NextResponse.json({ ok: true, result })
    }

    return NextResponse.json(
      { error: 'action must be approve or reject.' },
      { status: 400 },
    )
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid request payload.' }, { status: 400 })
    }
    if (error instanceof AuthError) {
      return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    }
    if (error instanceof ServiceError) return serviceErrorResponse(error)
    throw error
  }
}
