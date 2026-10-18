import { normalizeSparkleOrigin } from './sparkle-crawl'
import { getPublicRepName } from '@/lib/amethyst/public-rep-name'

type JsonLdScalar = string | number | boolean | null
type JsonLdValue = JsonLdScalar | JsonLdObject | JsonLdValue[]

export type JsonLdObject = {
  [key: string]: JsonLdValue
}

export interface AmethystStructuredEvent {
  title: string
  description?: string | null
  eventTime: string
  durationMinutes?: number
  url?: string
}

export interface AmethystPublicPageStructuredDataInput {
  origin: string | URL
  path: string
  title: string
  description: string
  repName: string
  businessName: string
  repCity?: string
  repState?: string
  shopUrl?: string
  sameAs?: string[]
  events?: AmethystStructuredEvent[]
}

export interface AmethystPublicPageJsonLd {
  '@context': 'https://schema.org'
  '@graph': JsonLdObject[]
}

function resolvePublicUrl(origin: string, pathOrUrl: string) {
  return new URL(pathOrUrl, origin).toString()
}

function compactStrings(values: string[] | undefined): string[] {
  return (values ?? []).map((value) => value.trim()).filter(Boolean)
}

function publishedLocation(repCity: string | undefined, repState: string | undefined) {
  const city = repCity?.trim()
  const state = repState?.trim()
  if (!city && !state) return undefined
  return { city, state }
}

/**
 * City and state only. Street addresses are never published.
 * Callers pass location only when the public Join template already shows it.
 */
function buildPostalAddress(
  repCity: string | undefined,
  repState: string | undefined,
): JsonLdObject | undefined {
  const location = publishedLocation(repCity, repState)
  if (!location) return undefined

  return {
    '@type': 'PostalAddress',
    ...(location.city ? { addressLocality: location.city } : {}),
    ...(location.state ? { addressRegion: location.state } : {}),
    addressCountry: 'US',
  }
}

function buildAreaServed(
  repCity: string | undefined,
  repState: string | undefined,
): JsonLdObject | undefined {
  const location = publishedLocation(repCity, repState)
  if (!location) return undefined

  return {
    '@type': 'AdministrativeArea',
    ...(location.city ? { addressLocality: location.city } : {}),
    ...(location.state ? { addressRegion: location.state } : {}),
    addressCountry: 'US',
  }
}

function buildEventJsonLd(
  event: AmethystStructuredEvent,
  origin: string,
  pageUrl: string,
  index: number,
): JsonLdObject {
  const startDate = new Date(event.eventTime)
  const endDate =
    event.durationMinutes && Number.isFinite(event.durationMinutes)
      ? new Date(startDate.getTime() + event.durationMinutes * 60_000)
      : null
  const eventUrl = event.url ? resolvePublicUrl(origin, event.url) : pageUrl

  return {
    '@type': 'Event',
    '@id': `${pageUrl}#event-${index + 1}`,
    name: event.title,
    ...(event.description ? { description: event.description } : {}),
    startDate: startDate.toISOString(),
    ...(endDate ? { endDate: endDate.toISOString() } : {}),
    eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
    eventStatus: 'https://schema.org/EventScheduled',
    url: eventUrl,
    location: {
      '@type': 'VirtualLocation',
      url: eventUrl,
    },
  }
}

export function buildAmethystPublicPageJsonLd(
  input: AmethystPublicPageStructuredDataInput,
): AmethystPublicPageJsonLd {
  const origin = normalizeSparkleOrigin(input.origin)
  const pageUrl = resolvePublicUrl(origin, input.path)
  const repId = `${origin}/#rep`
  const repName = getPublicRepName(input.repName)
  const areaServed = buildAreaServed(input.repCity, input.repState)
  const address = buildPostalAddress(input.repCity, input.repState)
  const sameAs = compactStrings(input.sameAs)

  const graph: JsonLdObject[] = [
    {
      '@type': 'WebSite',
      '@id': `${origin}/#website`,
      name: input.businessName,
      url: origin,
      inLanguage: 'en-US',
    },
    {
      '@type': 'WebPage',
      '@id': `${pageUrl}#webpage`,
      name: input.title,
      description: input.description,
      url: pageUrl,
      isPartOf: {
        '@id': `${origin}/#website`,
      },
      inLanguage: 'en-US',
    },
    {
      '@type': 'Person',
      '@id': repId,
      name: repName,
      ...(sameAs.length ? { sameAs } : {}),
      ...(address ? { address } : {}),
    },
    {
      '@type': 'LocalBusiness',
      '@id': `${origin}/#local-business`,
      name: input.businessName,
      url: origin,
      ...(input.shopUrl ? { hasOfferCatalog: { url: input.shopUrl } } : {}),
      ...(address ? { address } : {}),
      ...(areaServed ? { areaServed } : {}),
      founder: {
        '@id': repId,
      },
    },
    {
      '@type': 'ProfessionalService',
      '@id': `${origin}/#professional-service`,
      name: `${input.businessName} live jewelry reveals`,
      serviceType: 'Live jewelry reveals and customer dance floor support',
      provider: {
        '@id': repId,
      },
      brand: {
        '@type': 'Brand',
        name: 'Bomb Party',
      },
      ...(areaServed ? { areaServed } : {}),
    },
    ...(input.events ?? []).map((event, index) =>
      buildEventJsonLd(event, origin, pageUrl, index),
    ),
  ]

  return {
    '@context': 'https://schema.org',
    '@graph': graph,
  }
}

export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c')
}
