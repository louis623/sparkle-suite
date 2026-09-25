import { NextResponse } from 'next/server'
import {
  getPaidNicNacContext,
  AuthError,
} from '@/lib/nic-nac/auth'
import { ServiceError } from '@/lib/services/errors'
import {
  getFulfillmentLogPage,
  updateFulfillmentStatus,
} from '@/lib/services/trade-fulfillment'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function serviceErrorResponse(error: ServiceError) {
  return NextResponse.json(
    { code: error.code, error: error.userMessage },
    { status: error.statusCode },
  )
}

export async function GET(request: Request) {
  try {
    const { repId, supabase } = await getPaidNicNacContext()
    const params = new URL(request.url).searchParams
    const filter = params.get('filter') ?? 'open'
    const page = Number(params.get('page') ?? '1')
    if (!['open', 'done', 'all'].includes(filter) || !Number.isSafeInteger(page) || page < 1) {
      return NextResponse.json({ error: 'Invalid fulfillment filter or page.' }, { status: 400 })
    }
    const log = await getFulfillmentLogPage(supabase, repId, filter as 'open' | 'done' | 'all', page)
    return NextResponse.json(log)
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
    const { repId, supabase } = await getPaidNicNacContext()

    const nextStatus =
      body?.nextStatus === 'approved' ||
      body?.nextStatus === 'shipped' ||
      body?.nextStatus === 'completed'
        ? body.nextStatus
        : null

    if (!nextStatus) {
      return NextResponse.json(
        { error: 'nextStatus must be approved, shipped, or completed.' },
        { status: 400 },
      )
    }

    if (body?.shippingNotes !== undefined &&
        (typeof body.shippingNotes !== 'string' || body.shippingNotes.length > 300)) {
      return NextResponse.json({ error: 'Shipping notes must be 300 characters or fewer.' }, { status: 400 })
    }

    const identifier =
      typeof body?.requestId === 'string' && body.requestId.trim()
        ? { requestId: body.requestId.trim() }
        : { customerName: typeof body?.customerName === 'string' ? body.customerName.trim() : '' }

    const result = await updateFulfillmentStatus(supabase, repId, {
      ...identifier,
      nextStatus,
      shippingNotes:
        typeof body?.shippingNotes === 'string' ? body.shippingNotes : undefined,
      addToBoard: body?.addToBoard === true,
    })

    return NextResponse.json({ ok: true, result })
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
