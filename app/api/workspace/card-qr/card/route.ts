import { NextResponse } from 'next/server'
import { ServiceError } from '@/lib/services/errors'
import { readCardQrDesignTheme } from '@/lib/workspace/card-qr/design-theme'
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
  bizcardSocial,
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
    })) as { output?: unknown; design?: unknown; theme?: unknown } | null
    const output = readOutput(body?.output)
    const design = parseCardQrDesign(body?.design)
    const override = readCardQrDesignTheme(body?.theme, context.settings.appearancePreset)
    // A picked shared theme uses that theme's card art, even for custom-site reps. Render only.
    const resolved = override
      ? resolveBizcard({ appearancePreset: override })
      : resolveBizcard({
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
    const social = bizcardSocial(context.settings.socialHandles, design.socialPlatform)
    const back = output === 'front'
      ? null
      : await renderBizcardBack({
          key,
          qrUrl,
          qrIcon: design.qrIcon,
          fields: design.fields,
          name: bizcardName(context.settings.displayName, fullName),
          email: context.settings.email,
          website: bizcardWebsite(context.customDomain),
          textLinkNumber: design.textLinkNumber,
          social: social.handle,
          socialPlatform: social.platform,
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
      if (back.overflow) {
        return NextResponse.json(
          { code: 'CARD_QR_CARD_TOO_FULL', error: back.warnings[back.warnings.length - 1], warnings: back.warnings },
          { status: 422 },
        )
      }
      const pdf = await buildBizcardPrintPdf({ front: front.png, back: back.png })
      return new NextResponse(new Uint8Array(pdf), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="sparkle-business-card-${key}-p1-front-p2-back.pdf"`,
          'Cache-Control': 'no-store',
        },
      })
    }
    const png = (front ?? back)!.png
    return new NextResponse(new Uint8Array(png), {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="sparkle-business-card-${key}-${output}.png"`,
        // Rep-facing notes (URI-encoded JSON list) when details were wrapped or left off.
        ...(back && back.warnings.length ? { 'X-Card-Qr-Card-Warnings': encodeURIComponent(JSON.stringify(back.warnings)) } : {}),
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    return cardQrErrorResponse(error)
  }
}
