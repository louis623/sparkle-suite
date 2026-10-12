import { NextResponse } from 'next/server'
import { resolveCardQrRequestOrigin } from '@/lib/workspace/card-qr/destination'
import { lookupCardQrShortLinkReps } from '@/lib/workspace/card-qr/short-link-lookup'
import {
  cardQrUuidPrefixFromCode,
  resolveCardQrShortLinkTarget,
} from '@/lib/workspace/card-qr/short-link'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function shortLinkPage(input: { title: string; message: string; status: number }) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${input.title}</title>
<style>
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #fff4f8; color: #3a1630; font: 18px/1.5 Georgia, "Times New Roman", serif; }
  main { max-width: 28rem; padding: 32px 24px; }
  h1 { font-size: 1.6rem; line-height: 1.25; margin: 0 0 12px; }
  p { margin: 0; }
</style>
</head>
<body>
<main>
  <h1>${input.title}</h1>
  <p>${input.message}</p>
</main>
</body>
</html>`
  return new NextResponse(html, {
    status: input.status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  })
}

function unknownCodePage() {
  return shortLinkPage({
    status: 404,
    title: 'This QR link is not in use',
    message: 'The code does not match a Sparkle Suite site. Ask the person who shared it for a new code.',
  })
}

/**
 * Public short link for Cards & QR. Logged-out visitors are the point of the scan.
 * Unknown codes and prefix collisions get the same friendly 404.
 */
export async function GET(request: Request, context: { params: Promise<{ code: string }> }) {
  const { code } = await context.params
  const prefix = cardQrUuidPrefixFromCode(code)
  if (!prefix) return unknownCodePage()
  try {
    const rows = await lookupCardQrShortLinkReps(prefix)
    const target = resolveCardQrShortLinkTarget(code, rows, resolveCardQrRequestOrigin(request))
    if (target.status === 404) return unknownCodePage()
    const response = NextResponse.redirect(target.location, 302)
    response.headers.set('Cache-Control', 'no-store')
    response.headers.set('X-Robots-Tag', 'noindex, nofollow')
    return response
  } catch (error) {
    console.error('CARD_QR_SHORT_LINK_LOOKUP_FAILED', {
      message: error instanceof Error ? error.message : 'lookup failed',
    })
    return shortLinkPage({
      status: 503,
      title: 'This short link is not available right now',
      message: 'Try the scan again in a little while.',
    })
  }
}
