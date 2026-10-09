import { NextResponse } from 'next/server'
import { ServiceError } from '@/lib/services/errors'
import {
  cardQrErrorResponse,
  loadCardQrContext,
} from '@/lib/workspace/card-qr/context'
import { parseCardQrDesign } from '@/lib/workspace/card-qr/design'
import { FlyerQrDecodeError, assertFlyerQrDecodes } from '@/lib/workspace/card-qr/flyer-decode'
import {
  BIZCARD_BEING_BUILT_MESSAGE,
  resolveBizcard,
} from '@/lib/workspace/card-qr/bizcard-themes'
import {
  bizcardFrontCopy,
  bizcardName,
  bizcardSocialHandle,
  bizcardWebsite,
} from '@/lib/workspace/card-qr/bizcard-copy'
import {
  buildBizcardPrintPdf,
  renderBizcardBack,
  renderBizcardFront,
} from '@/lib/workspace/card-qr/bizcard-render'
import { requireCardQrShortUrl } from '@/lib/workspace/card-qr/short-link'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

type Output = 'front' | 'back' | 'pdf'

function readOutput(value: unknown): Output {
  if (value === 'front' || value === 'back' || value === 'pdf') return value
  throw new ServiceError({
    code: 'CARD_QR_CARD_OUTPUT_INVALID',
    message: 'Card output must be front, back, or pdf.',
    userMessage: 'Choose the front, the back, or the print PDF.',
    statusCode: 400,
  })
}

export async function POST(request: Request) {
  try {
    const context = await loadCardQrContext(request)
    const body = (await request.json().catch(() => {
      throw new SyntaxError('Invalid request payload.')
    })) as { output?: unknown; design?: unknown } | null
    const output = readOutput(body?.output)
    const design = parseCardQrDesign(body?.design)
    const resolved = resolveBizcard({
      appearancePreset: context.settings.appearancePreset,
      publicSiteSlug: context.rep.public_site_slug,
      customDomain: context.customDomain,
    })
    if (resolved.status === 'being_built') {
      return NextResponse.json(
        { code: 'CARD_QR_CARD_BEING_BUILT', status: 'being_built', message: BIZCARD_BEING_BUILT_MESSAGE },
        { headers: { 'Cache-Control': 'no-store' } },
      )
    }
    if (resolved.status !== 'ready') {
      return NextResponse.json(
        { code: 'CARD_QR_THEME_UNKNOWN', error: "This site's saved theme isn't one the card knows." },
        { status: 409 },
      )
    }
    const key = resolved.key
    const fullName = resolved.fullName
    const qrUrl = requireCardQrShortUrl(context.origin, context.repId)
    const front = output === 'back'
      ? null
      : await renderBizcardFront({ key, ...bizcardFrontCopy({ ...context.settings, fullName }) })
    const back = output === 'front'
      ? null
      : await renderBizcardBack({
          key,
          qrUrl,
          qrIcon: design.qrIcon,
          fields: design.fields,
          name: bizcardName(context.settings.displayName, fullName),
          email: context.settings.email,
          website: bizcardWebsite(context.customDomain, context.destinationUrl),
          textLinkNumber: design.textLinkNumber,
          social: bizcardSocialHandle(context.settings.socialHandles),
        })
    if (back) {
      const t = back.layout.tile
      try {
        await assertFlyerQrDecodes(back.png, qrUrl, { x: t.x, y: t.y, width: t.size, height: t.size })
      } catch (error) {
        console.error('CARD_QR_CARD_DECODE_FAILED', {
          key,
          repId: context.repId,
          icon: design.qrIcon,
          decoded: error instanceof FlyerQrDecodeError ? error.decoded : null,
        })
        return NextResponse.json(
          { code: 'CARD_QR_CARD_DECODE_FAILED', error: "We couldn't make a card back that scans right. We've been notified." },
          { status: 422 },
        )
      }
    }
    if (output === 'pdf' && front && back) {
      const pdf = await buildBizcardPrintPdf({ front: front.png, back: back.png, label: 'Sparkle Suite business card' })
      return new NextResponse(new Uint8Array(pdf), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename="sparkle-business-card-print.pdf"',
          'Cache-Control': 'no-store',
        },
      })
    }
    const png = (front ?? back)!.png
    return new NextResponse(new Uint8Array(png), {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="sparkle-business-card-${output}.png"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    return cardQrErrorResponse(error)
  }
}
