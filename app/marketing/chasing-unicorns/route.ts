import { skinPreviewMediaSource } from '@/lib/amethyst/skin-preview'
import { buildChasingUnicornsMarketingDocument } from '@/lib/sparkle-suite/chasing-unicorns-marketing-preview'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const origin = new URL(request.url).origin
  const document = await buildChasingUnicornsMarketingDocument(origin)
  return new Response(document, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
      'Referrer-Policy': 'no-referrer',
      'Content-Security-Policy': `default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' https://unpkg.com; style-src 'unsafe-inline' ${origin} https://fonts.googleapis.com https://api.fontshare.com; font-src ${origin} https://fonts.gstatic.com https://cdn.fontshare.com https://api.fontshare.com data:; img-src ${origin} https: data: blob:; media-src ${skinPreviewMediaSource('amethyst', origin)}; frame-src 'none'; connect-src 'none'; form-action 'none'; base-uri ${origin}; frame-ancestors 'self'; object-src 'none'`,
    },
  })
}
