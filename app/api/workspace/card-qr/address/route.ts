import { NextResponse } from 'next/server'
import { ServiceError } from '@/lib/services/errors'
import { cardQrErrorResponse, loadCardQrContext } from '@/lib/workspace/card-qr/context'
import { readCardQrShipAddress, saveCardQrShipAddress } from '@/lib/workspace/card-qr/ship-address-store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const context = await loadCardQrContext(request)
    const loaded = await readCardQrShipAddress(context.supabase, context.repId)
    return NextResponse.json(loaded, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return cardQrErrorResponse(error)
  }
}

export async function PUT(request: Request) {
  try {
    const context = await loadCardQrContext(request)
    const body = await request.json().catch(() => {
      throw new SyntaxError('Invalid request payload.')
    })
    const saved = await saveCardQrShipAddress(context.supabase, context.repId, (body as { address?: unknown } | null)?.address)
    return NextResponse.json({ ok: true, ...saved }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    if (error instanceof ServiceError && error.code === 'CARD_QR_ADDRESS_INVALID') {
      return NextResponse.json(
        { code: error.code, error: error.userMessage, fields: (error as ServiceError & { fields?: unknown }).fields ?? {} },
        { status: 400 },
      )
    }
    return cardQrErrorResponse(error)
  }
}
