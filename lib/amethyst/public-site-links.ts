import type { AmethystHomepageEventCard } from './homepage-upcoming-shows'
import type { AmethystPreviewTemplateData } from './preview-template-data'
import { readPublicSiteSlugFromUrl } from './request-rep-target'

export function getPublicSiteSlugFromRequest(request: Request) {
  return readPublicSiteSlugFromUrl(new URL(request.url))
}

function rewriteTradeHrefForPublicSlug(href: string, slug: string) {
  if (!href.startsWith('/amethyst/Trade.html')) return href
  const parsed = new URL(href, 'https://www.yoursparklesuite.com')
  return `/${slug}/trade${parsed.search}${parsed.hash}`
}

export function applyPublicSiteSlugToTemplateData(
  data: AmethystPreviewTemplateData,
  slug: string | null,
): AmethystPreviewTemplateData {
  if (!slug) return data
  const homeHref = `/${slug}`
  const tradeHref = `/${slug}/trade`

  return {
    ...data,
    homepage: {
      ...data.homepage,
      footerLinks: {
        ...data.homepage.footerLinks,
        home: homeHref,
        tradeBoard: tradeHref,
        faq: `/${slug}/faq`,
      },
    },
    trade: {
      ...data.trade,
      footerLinks: {
        ...data.trade.footerLinks,
        home: homeHref,
        tradeBoard: tradeHref,
        faq: `/${slug}/faq`,
        pastShows: `${homeHref}#events`,
      },
    },
  }
}

export function applyPublicSiteSlugToHomepageEvents(
  events: AmethystHomepageEventCard[],
  slug: string | null,
) {
  if (!slug) return events

  return events.map((event) => ({
    ...event,
    collections: event.collections.map((collection) => ({
      ...collection,
      href: rewriteTradeHrefForPublicSlug(collection.href, slug),
    })),
  }))
}

/**
 * Customer sites served from their own domain keep visitors on that host.
 * These links intentionally stay root-relative: the browser supplies the
 * configured custom-domain origin, without baking a domain into stored site
 * content or exposing an internal tenant target.
 */
export function applyCustomDomainToTemplateData(
  data: AmethystPreviewTemplateData,
  customDomain: string | null | undefined,
): AmethystPreviewTemplateData {
  if (!customDomain?.trim()) return data

  return {
    ...data,
    homepage: {
      ...data.homepage,
      joinTeamUrl: '/join',
      pantryPageUrl: data.homepage.pantryPageUrl ? '/in-the-pantry' : undefined,
      footerLinks: {
        ...data.homepage.footerLinks,
        home: '/',
        tradeBoard: '/trade',
        faq: '/faq',
        joinTeam: data.homepage.footerLinks.joinTeam ? '/join' : undefined,
        pastShows: '/#events',
      },
    },
    trade: {
      ...data.trade,
      pantryPageUrl: data.trade.pantryPageUrl ? '/in-the-pantry' : undefined,
      footerLinks: {
        ...data.trade.footerLinks,
        home: '/',
        tradeBoard: '/trade',
        faq: '/faq',
        joinTeam: data.trade.footerLinks.joinTeam ? '/join' : undefined,
        pastShows: '/#events',
      },
    },
    join: {
      ...data.join,
      pantryPageUrl: data.join.pantryPageUrl ? '/in-the-pantry' : undefined,
      footerLinks: {
        ...data.join.footerLinks,
        home: '/',
        tradeBoard: '/trade',
        faq: '/faq',
        joinTeam: '/join',
        pastShows: '/#top',
      },
    },
  }
}

export function applyCustomDomainToHomepageEvents(
  events: AmethystHomepageEventCard[],
  customDomain: string | null | undefined,
) {
  if (!customDomain?.trim()) return events

  return events.map((event) => ({
    ...event,
    collections: event.collections.map((collection) => ({
      ...collection,
      href: rewriteTradeHrefForCustomDomain(collection.href),
    })),
  }))
}

function rewriteTradeHrefForCustomDomain(href: string) {
  if (!href.startsWith('/amethyst/Trade.html')) return href
  const parsed = new URL(href, 'https://www.yoursparklesuite.com')
  return `/trade${parsed.search}${parsed.hash}`
}
