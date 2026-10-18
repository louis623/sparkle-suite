import { resolveSparkleRequestOrigin } from '@/lib/seo/sparkle-crawl'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const origin = resolveSparkleRequestOrigin(request)
  return new Response(
    `User-Agent: *\nAllow: /\nDisallow: /api/\nDisallow: /internal/\nDisallow: /onboarding/\nSitemap: ${origin}/sitemap.xml\n`,
    {
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'text/plain; charset=utf-8',
      },
    },
  )
}
