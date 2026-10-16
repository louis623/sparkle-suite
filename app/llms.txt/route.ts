import {
  renderCustomerSiteNotFoundResponse,
  resolveCustomerDomainSiteState,
} from '@/lib/amethyst/customer-domain-site'
import { buildDefaultSparkleLlmsText } from '@/lib/seo/llms'
import { resolveSparkleRequestOrigin } from '@/lib/seo/sparkle-crawl'
import {
  buildCustomerSiteLlmsText,
  loadCustomerSiteCrawlData,
} from '@/lib/seo/customer-site-crawl'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const origin = resolveSparkleRequestOrigin(request)
  const site = await resolveCustomerDomainSiteState(new URL(origin).hostname)
  if (site.kind === 'unavailable') return renderCustomerSiteNotFoundResponse()
  const customerSite =
    site.kind === 'serve' ? await loadCustomerSiteCrawlData(origin) : null
  // A real customer domain never serves the Suite or demo crawl files.
  if (site.kind === 'serve' && !customerSite) return renderCustomerSiteNotFoundResponse()
  return new Response(
    customerSite
      ? buildCustomerSiteLlmsText(origin, customerSite)
      : buildDefaultSparkleLlmsText(origin),
    {
      headers: {
        'Cache-Control': 'public, max-age=0, must-revalidate',
        'Content-Type': 'text/plain; charset=utf-8',
      },
    },
  )
}
