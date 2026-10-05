import { NextResponse } from 'next/server'
import { parseCardQrDesign } from '@/lib/workspace/card-qr/design'
import {
  cardQrErrorResponse,
  loadCardQrContext,
} from '@/lib/workspace/card-qr/context'
import { resolveCardQrPalette } from '@/lib/workspace/card-qr/palette'
import {
  buildCardQrPressStubLines,
  buildCardQrPressStubPdf,
} from '@/lib/workspace/card-qr/render'

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
    const pdf = buildCardQrPressStubPdf(
      buildCardQrPressStubLines({
        destinationUrl: context.destinationUrl,
        templateName: palette.name,
      }),
    )
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition':
          'attachment; filename="sparkle-business-card-press-stub.pdf"',
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    return cardQrErrorResponse(error)
  }
}
