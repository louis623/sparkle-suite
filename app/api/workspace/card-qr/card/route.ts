import { NextResponse } from 'next/server'
import { ServiceError } from '@/lib/services/errors'
import { cardQrErrorResponse, loadCardQrContext } from '@/lib/workspace/card-qr/context'
import { parseCardQrDesign } from '@/lib/workspace/card-qr/design'
import { BIZCARD_BEING_BUILT_MESSAGE } from '@/lib/workspace/card-qr/bizcard-themes'
import { renderCardQrCardFiles } from '@/lib/workspace/card-qr/card-files'

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
    const files = await renderCardQrCardFiles(context, design, body?.theme, output)
    if (files.status === 'being_built') {
      return NextResponse.json(
        { code: 'CARD_QR_CARD_BEING_BUILT', status: 'being_built', message: BIZCARD_BEING_BUILT_MESSAGE },
        { headers: { 'Cache-Control': 'no-store' } },
      )
    }
    if (files.status === 'unknown_theme') {
      return NextResponse.json(
        { code: 'CARD_QR_THEME_UNKNOWN', error: "This site's saved theme isn't one the card knows." },
        { status: 409 },
      )
    }
    if (files.status === 'decode_failed') {
      console.error('CARD_QR_CARD_DECODE_FAILED', { key: files.key, repId: context.repId, icon: design.qrIcon, decoded: files.decoded })
      return NextResponse.json(
        { code: 'CARD_QR_CARD_DECODE_FAILED', error: "We couldn't make a card back that scans right. We've been notified." },
        { status: 422 },
      )
    }
    if (files.status === 'too_full') {
      return NextResponse.json(
        { code: 'CARD_QR_CARD_TOO_FULL', error: files.warnings[files.warnings.length - 1], warnings: files.warnings },
        { status: 422 },
      )
    }
    const key = files.key
    if (output === 'pdf' && files.pdf) {
      return new NextResponse(new Uint8Array(files.pdf), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="sparkle-business-card-${key}-p1-front-p2-back.pdf"`,
          'Cache-Control': 'no-store',
        },
      })
    }
    const png = (files.front ?? files.back)!
    return new NextResponse(new Uint8Array(png), {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="sparkle-business-card-${key}-${output}.png"`,
        // Rep-facing notes (URI-encoded JSON list) when details were wrapped or left off.
        ...(output === 'back' && files.warnings.length ? { 'X-Card-Qr-Card-Warnings': encodeURIComponent(JSON.stringify(files.warnings)) } : {}),
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    return cardQrErrorResponse(error)
  }
}
