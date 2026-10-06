import { readLandingDemo } from '@/lib/sparkle-suite/landing-demo'
import { permittedLandingTheme } from '@/lib/sparkle-suite/landing-demo-model'
import { landingPreviewDocument } from '@/lib/sparkle-suite/landing-demo-preview'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const demo = await readLandingDemo()
  if (!demo) return new Response('Preview temporarily unavailable', { status: 503 })
  const url = new URL(request.url)
  const theme = permittedLandingTheme(demo, url.searchParams.get('theme'))
  if (!theme) return new Response('Theme unavailable', { status: 404 })
  return new Response(await landingPreviewDocument(demo, theme, url.origin), { headers: {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Robots-Tag': 'noindex, nofollow',
    'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy': "sandbox allow-scripts; frame-ancestors 'self'; form-action 'none'; connect-src 'none'",
  } })
}
