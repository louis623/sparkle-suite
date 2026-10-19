import type { MetadataRoute } from 'next'

import { loadAmethystPreviewTemplateData } from '@/lib/amethyst/preview-template-data'
import { isBlingKitchenPantryAllowed } from '@/lib/bling-kitchen/pantry-access'
import { normalizeAmethystCustomDomainCandidate } from '@/lib/amethyst/host-routing'
import {
  formatPublicShowTime,
  loadAmethystHomepageUpcomingShows,
} from '@/lib/amethyst/homepage-upcoming-shows'
import { buildSparkleLlmsText, type SparkleLlmsLiveShow } from '@/lib/seo/llms'
import { canonicalizeSparkleCrawlOrigin } from '@/lib/seo/sparkle-crawl'

type CustomerSiteCrawlData = {
  businessName: string
  repName: string
  summary: string
  showJoinPage: boolean
  showPantryPage: boolean
  repLocation?: string
  liveShows?: SparkleLlmsLiveShow[]
}

const CUSTOMER_SITE_LAST_MODIFIED = new Date('2026-09-03')

function clean(value: string | null | undefined) {
  return value?.replace(/\s+/g, ' ').trim() || ''
}

export function buildCustomerSiteCrawlData(input: CustomerSiteCrawlData) {
  const businessName = clean(input.businessName) || 'Customer site'
  const repName = clean(input.repName) || businessName
  const summary =
    clean(input.summary) ||
    `${businessName} is a Sparkle Suite-powered site for live jewelry reveals and customer community.`
  const pages = [
    { title: 'Home', path: '/', priority: 1 },
    { title: 'Dance Floor', path: '/trade', priority: 0.8 },
    { title: 'FAQ', path: '/faq', priority: 0.6 },
    ...(input.showJoinPage
      ? [{ title: 'Join Team', path: '/join', priority: 0.7 }]
      : []),
    ...(input.showPantryPage
      ? [{ title: 'In the Pantry', path: '/in-the-pantry', priority: 0.6 }]
      : []),
  ]

  return { businessName, repName, summary, pages, repLocation: clean(input.repLocation) || undefined }
}

export function buildCustomerSiteSitemap(
  origin: string | URL,
  input: CustomerSiteCrawlData,
): MetadataRoute.Sitemap {
  const normalizedOrigin = canonicalizeSparkleCrawlOrigin(origin)
  return buildCustomerSiteCrawlData(input).pages.map((page) => ({
    url: new URL(page.path, normalizedOrigin).toString(),
    lastModified: CUSTOMER_SITE_LAST_MODIFIED,
    changeFrequency: page.path === '/' ? 'weekly' : 'daily',
    priority: page.priority,
  }))
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export function renderCustomerSiteSitemapXml(
  origin: string | URL,
  input: CustomerSiteCrawlData,
) {
  const urls = buildCustomerSiteSitemap(origin, input)
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.flatMap((url) => [
      '  <url>',
      `    <loc>${escapeXml(url.url)}</loc>`,
      `    <lastmod>${CUSTOMER_SITE_LAST_MODIFIED.toISOString()}</lastmod>`,
      `    <changefreq>${url.changeFrequency}</changefreq>`,
      `    <priority>${url.priority?.toFixed(1)}</priority>`,
      '  </url>',
    ]),
    '</urlset>',
  ].join('\n')
}

export function buildCustomerSiteLlmsText(
  origin: string | URL,
  input: CustomerSiteCrawlData,
) {
  const crawl = buildCustomerSiteCrawlData(input)
  return buildSparkleLlmsText({
    origin: canonicalizeSparkleCrawlOrigin(origin),
    businessName: crawl.businessName,
    repName: crawl.repName,
    repLocation: crawl.repLocation,
    summary: [
      crawl.summary,
      `${crawl.businessName} is an independent Bomb Party rep. This site is not affiliated with or endorsed by Bomb Party.`,
    ].join(' '),
    publicPages: crawl.pages.map(({ title, path }) => ({ title, path })),
    liveShows: input.liveShows,
    glossary: [
      {
        term: 'Dance Floor',
        definition:
          'The public board where customers browse dancers and request a dancer swap.',
      },
      {
        term: 'Dancer',
        definition: 'A jewelry piece the rep has put up for a dancer swap.',
      },
      {
        term: 'Live reveal',
        definition:
          'A streamed Bomb Party jewelry opening where customers see pieces revealed live.',
      },
    ],
  })
}

/**
 * Returns public crawl content only for a verified customer-domain request.
 * Platform-host crawl files keep their separate Sparkle Suite product content.
 */
export async function loadCustomerSiteCrawlData(origin: string | URL) {
  const normalizedOrigin = canonicalizeSparkleCrawlOrigin(origin)
  const host = normalizeAmethystCustomDomainCandidate(
    new URL(normalizedOrigin).hostname,
  )
  if (!host) return null

  const template = await loadAmethystPreviewTemplateData({ repId: host })
  const homepage = template.homepage
  const isUntargetedDefault =
    homepage.businessName === 'Sparkle by Sasha' && homepage.repName === 'Sasha'
  if (isUntargetedDefault) return null

  const repLocation = [template.join.repCity, template.join.repState]
    .map(clean)
    .filter(Boolean)
    .join(', ')
  let liveShows: SparkleLlmsLiveShow[] = []
  try {
    const events = await loadAmethystHomepageUpcomingShows({
      repId: host,
      targeted: true,
      limit: 12,
    })
    liveShows = events.map((event) => {
      const platform = event.platforms[0]
      const title =
        event.title && event.title !== 'Upcoming live reveal'
          ? event.title
          : platform?.label
            ? `${platform.label.replace(/^(Watch on|Join me on)\s+/i, '')} live reveal`
            : 'Live reveal'
      return {
        title,
        eventTime: formatPublicShowTime(event.eventTime, event.timeZone),
        ...(platform?.href && platform.href !== '#' ? { url: platform.href } : {}),
      }
    })
  } catch {
    liveShows = []
  }

  return {
    businessName: homepage.businessName,
    repName: homepage.repName,
    summary: homepage.tagline,
    showJoinPage: homepage.showJoinPage,
    showPantryPage:
      Boolean(homepage.pantryPageUrl) &&
      isBlingKitchenPantryAllowed({ customDomain: host }),
    ...(repLocation ? { repLocation } : {}),
    liveShows,
  } satisfies CustomerSiteCrawlData
}
