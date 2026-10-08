import { NextResponse } from 'next/server'
import { buildCardQrCopyLines } from '@/lib/workspace/card-qr/design'
import {
  FlyerQrDecodeError,
  assertFlyerQrDecodes,
} from '@/lib/workspace/card-qr/flyer-decode'
import { isKnownFlyerTheme } from '@/lib/workspace/card-qr/flyer-fonts'
import {
  cardQrErrorResponse,
  loadCardQrContext,
} from '@/lib/workspace/card-qr/context'
import { resolveCardQrPalette } from '@/lib/workspace/card-qr/palette'
import { renderCardQrFlyerPng } from '@/lib/workspace/card-qr/render'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DECODE_FAILED = {
  code: 'CARD_QR_FLYER_DECODE_FAILED',
  error: "We couldn't make a flyer that scans right. We've been notified.",
} as const

export async function POST(request: Request) {
  try {
    const context = await loadCardQrContext(request)
    await request.json().catch(() => {
      throw new SyntaxError('Invalid request payload.')
    })
    const appearancePreset = context.settings.appearancePreset
    if (!isKnownFlyerTheme(appearancePreset)) {
      return NextResponse.json(
        {
          code: 'CARD_QR_THEME_UNKNOWN',
          error: "This site's saved theme isn't one the flyer knows.",
        },
        { status: 409 },
      )
    }
    const palette = resolveCardQrPalette({
      templateId: 'match-site',
      appearancePreset,
    })
    const png = await renderCardQrFlyerPng({
      palette,
      lines: buildCardQrCopyLines({
        displayName: context.settings.displayName,
        businessName: context.settings.businessName,
        email: context.settings.email,
        socialHandles: context.settings.socialHandles,
      }),
      businessName: context.settings.businessName,
      appearancePreset,
      destinationUrl: context.destinationUrl,
      showQr: true,
    })
    try {
      await assertFlyerQrDecodes(png, context.destinationUrl)
    } catch (error) {
      console.error('CARD_QR_FLYER_DECODE_FAILED', {
        theme: appearancePreset,
        repId: context.repId,
        expected: context.destinationUrl,
        decoded: error instanceof FlyerQrDecodeError ? error.decoded : null,
      })
      return NextResponse.json(DECODE_FAILED, { status: 422 })
    }
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
