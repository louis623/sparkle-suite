import {
  renderCustomerSiteNotFoundResponse,
  resolveCustomerDomainSiteState,
} from '@/lib/amethyst/customer-domain-site'
import { buildCustomerSiteSitemap, loadCustomerSiteCrawlData } from '@/lib/seo/customer-site-crawl'
import { buildSparkleSitemap, resolveSparkleRequestOrigin } from '@/lib/seo/sparkle-crawl'

export const dynamic = 'force-dynamic'

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function renderSitemapXml(entries: ReturnType<typeof buildSparkleSitemap>) {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries.flatMap((entry) => [
      '  <url>',
      `    <loc>${escapeXml(entry.url)}</loc>`,
      ...(entry.lastModified
        ? [`    <lastmod>${new Date(entry.lastModified).toISOString()}</lastmod>`]
        : []),
      ...(entry.changeFrequency
        ? [`    <changefreq>${entry.changeFrequency}</changefreq>`]
        : []),
      ...(entry.priority === undefined ? [] : [`    <priority>${entry.priority.toFixed(1)}</priority>`]),
      '  </url>',
    ]),
    '</urlset>',
  ].join('\n')
}

export async function GET(request: Request) {
  const origin = resolveSparkleRequestOrigin(request)
  const site = await resolveCustomerDomainSiteState(new URL(origin).hostname)
  if (site.kind === 'unavailable') return renderCustomerSiteNotFoundResponse()
  const customerSite =
    site.kind === 'serve' ? await loadCustomerSiteCrawlData(origin) : null
  // A real customer domain never serves the Suite or demo crawl files.
  if (site.kind === 'serve' && !customerSite) return renderCustomerSiteNotFoundResponse()
  const sitemap = customerSite
    ? buildCustomerSiteSitemap(origin, customerSite)
    : buildSparkleSitemap(origin)

  return new Response(renderSitemapXml(sitemap), {
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'application/xml; charset=utf-8',
    },
  })
}
