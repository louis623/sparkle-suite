import { communityThemeSiteDocument, isCommunityCarouselTheme } from '@/lib/sparkle-suite/community-theme-site-preview'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const theme = url.searchParams.get('theme')
  if (!isCommunityCarouselTheme(theme)) return new Response('Theme unavailable', { status: 404 })
  return new Response(await communityThemeSiteDocument(theme, url.origin), {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
      'X-Robots-Tag': 'noindex, nofollow',
      'Referrer-Policy': 'no-referrer',
      'Content-Security-Policy': "sandbox allow-scripts; frame-ancestors 'self'; form-action 'none'; connect-src 'none'",
    },
  })
}
