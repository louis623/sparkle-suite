import { NextResponse } from 'next/server'
import {
  buildCardQrCopyLines,
  parseCardQrDesign,
} from '@/lib/workspace/card-qr/design'
import {
  cardQrErrorResponse,
  loadCardQrContext,
} from '@/lib/workspace/card-qr/context'
import { resolveCardQrPalette } from '@/lib/workspace/card-qr/palette'
import { renderCardQrFlyerPng } from '@/lib/workspace/card-qr/render'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const context = await loadCardQrContext(request)
    const body = await request.json().catch(() => {
      throw new SyntaxError('Invalid request payload.')
    })
    const record = body && typeof body === 'object' ? (body as { design?: unknown; appearancePreset?: unknown }) : {}
    const design = parseCardQrDesign(record.design)
    const palette = resolveCardQrPalette({
      templateId: design.templateId,
      appearancePreset:
        typeof record.appearancePreset === 'string'
          ? record.appearancePreset
          : context.settings.appearancePreset,
    })
    const png = await renderCardQrFlyerPng({
      palette,
      lines: buildCardQrCopyLines({
        displayName: context.settings.displayName,
        businessName: context.settings.businessName,
        email: context.settings.email,
        socialHandles: context.settings.socialHandles,
        design,
      }),
      destinationUrl: context.destinationUrl,
      showQr: design.fields.qr,
    })
    return new NextResponse(new Uint8Array(png), {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': 'attachment; filename="sparkle-qr-flyer.png"',
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    return cardQrErrorResponse(error)
  }
}
