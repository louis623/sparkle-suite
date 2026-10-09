import { NextResponse } from 'next/server'
import {
  buildCardQrFlyerCopy,
  CARD_QR_FLYER_BEING_BUILT,
  isCustomFlyerTheme,
} from '@/lib/workspace/card-qr/flyer-copy'
import { FlyerQrDecodeError } from '@/lib/workspace/card-qr/flyer-decode'
import {
  flyerBytesSha256,
  renderCheckedFlyerFiles,
} from '@/lib/workspace/card-qr/flyer-encode'
import {
  parseCardQrFlyerFormat,
  type CardQrFlyerFormat,
} from '@/lib/workspace/card-qr/flyer-format'
import { isKnownFlyerTheme } from '@/lib/workspace/card-qr/flyer-fonts'
import {
  cardQrErrorResponse,
  loadCardQrContext,
} from '@/lib/workspace/card-qr/context'
import { resolveCardQrPalette } from '@/lib/workspace/card-qr/palette'
import { renderCardQrFlyerParts } from '@/lib/workspace/card-qr/render'
import { ServiceError } from '@/lib/services/errors'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DECODE_FAILED = {
  code: 'CARD_QR_FLYER_DECODE_FAILED',
  error: "We couldn't make a flyer that scans right. We've been notified.",
} as const

function readFlyerFormat(body: unknown, request: Request): CardQrFlyerFormat {
  const record = body && typeof body === 'object' ? (body as { format?: unknown }) : {}
  const queryFormat = new URL(request.url).searchParams.get('format')
  const raw = record.format !== undefined ? record.format : queryFormat
  const format = parseCardQrFlyerFormat(raw)
  if (!format) {
    throw new ServiceError({
      code: 'CARD_QR_FLYER_FORMAT_INVALID',
      message: 'Flyer format must be png or jpg.',
      userMessage: 'Choose JPG or PNG.',
      statusCode: 400,
    })
  }
  return format
}

export async function POST(request: Request) {
  try {
    const context = await loadCardQrContext(request)
    const body = await request.json().catch(() => {
      throw new SyntaxError('Invalid request payload.')
    })
    const format = readFlyerFormat(body, request)
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
    if (isCustomFlyerTheme(appearancePreset)) {
      return NextResponse.json(CARD_QR_FLYER_BEING_BUILT, {
        headers: { 'Cache-Control': 'no-store' },
      })
    }
    const copy = buildCardQrFlyerCopy({
      businessName: context.settings.businessName,
      displayName: context.settings.displayName,
      tagline: context.settings.tagline,
      customDomain: context.customDomain,
    })
    const palette = resolveCardQrPalette({
      templateId: 'match-site',
      appearancePreset,
    })
    const parts = await renderCardQrFlyerParts({
      palette,
      showTitle: copy.showTitle,
      tagline: copy.tagline,
      firstName: copy.firstName,
      website: copy.website,
      appearancePreset,
      destinationUrl: context.destinationUrl,
      showQr: true,
    })
    let files: { png: Buffer; jpg: Buffer }
    try {
      files = await renderCheckedFlyerFiles(parts.flyer, context.destinationUrl, parts.layout.qr)
    } catch (error) {
      console.error('CARD_QR_FLYER_DECODE_FAILED', {
        theme: appearancePreset,
        repId: context.repId,
        format,
        expected: context.destinationUrl,
        decoded: error instanceof FlyerQrDecodeError ? error.decoded : null,
      })
      return NextResponse.json(DECODE_FAILED, { status: 422 })
    }
    const file = format === 'jpg' ? files.jpg : files.png
    const extension = format === 'jpg' ? 'jpg' : 'png'
    return new NextResponse(new Uint8Array(file), {
      headers: {
        'Content-Type': format === 'jpg' ? 'image/jpeg' : 'image/png',
        'Content-Disposition': `attachment; filename="sparkle-qr-flyer.${extension}"`,
        'Cache-Control': 'no-store',
        'X-Card-Qr-Flyer-Sha256': flyerBytesSha256(file),
      },
    })
  } catch (error) {
    return cardQrErrorResponse(error)
  }
}
