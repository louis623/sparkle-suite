import {
  renderSparkleRobotsText,
  resolveSparkleRequestOrigin,
} from '@/lib/seo/sparkle-crawl'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const origin = resolveSparkleRequestOrigin(request)
  return new Response(renderSparkleRobotsText(origin), {
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'text/plain; charset=utf-8',
    },
  })
}
