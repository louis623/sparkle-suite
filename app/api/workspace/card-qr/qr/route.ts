import { NextResponse } from 'next/server'
import {
  cardQrErrorResponse,
  loadCardQrContext,
} from '@/lib/workspace/card-qr/context'
import { resolveCardQrPalette } from '@/lib/workspace/card-qr/palette'
import { renderCardQrPng } from '@/lib/workspace/card-qr/render'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const context = await loadCardQrContext(request)
    const skin = new URL(request.url).searchParams.get('skin')
    const palette = resolveCardQrPalette({
      templateId: 'match-site',
      appearancePreset: skin || context.settings.appearancePreset,
    })
    const png = await renderCardQrPng(context.destinationUrl, palette)
    return new NextResponse(new Uint8Array(png), {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': 'inline; filename="sparkle-site-qr.png"',
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    return cardQrErrorResponse(error)
  }
}
