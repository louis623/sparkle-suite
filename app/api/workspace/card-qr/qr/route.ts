import { NextResponse } from 'next/server'
import { cardQrIconFromRequest } from '@/lib/workspace/card-qr/design'
import {
  cardQrErrorResponse,
  loadCardQrContext,
} from '@/lib/workspace/card-qr/context'
import { resolveCardQrPalette } from '@/lib/workspace/card-qr/palette'
import { readCardQrDesignTheme } from '@/lib/workspace/card-qr/design-theme'
import { renderCardQrPng } from '@/lib/workspace/card-qr/render'
import { requireCardQrShortUrl } from '@/lib/workspace/card-qr/short-link'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const context = await loadCardQrContext(request)
    const params = new URL(request.url).searchParams
    const skin = readCardQrDesignTheme(params.get('theme') ?? params.get('skin'), context.settings.appearancePreset)
    const icon = cardQrIconFromRequest(params.get('icon'))
    const palette = resolveCardQrPalette({
      templateId: 'match-site',
      appearancePreset: skin || context.settings.appearancePreset,
    })
    const qrUrl = requireCardQrShortUrl(context.origin, context.repId)
    const png = await renderCardQrPng(qrUrl, palette, 640, icon)
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
