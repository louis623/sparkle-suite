import type { MetadataRoute } from 'next'

export const SPARKLE_PUBLIC_ORIGIN = 'https://www.yoursparklesuite.com'

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]'])
const PREVIEW_HOST_SUFFIXES = ['.vercel.app', '.vercel.sh', '.now.sh']
const DEFAULT_PUBLIC_HOSTS = new Set([
  'www.yoursparklesuite.com',
  'yoursparklesuite.com',
])

type SparklePublicRoute = {
  path: string
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']
  priority: number
}

const SPARKLE_PUBLIC_LAST_MODIFIED = new Date('2026-05-10')

const SPARKLE_PUBLIC_ROUTES: SparklePublicRoute[] = [
  {
    path: '/prelaunch',
    changeFrequency: 'weekly',
    priority: 1,
  },
  {
    path: '/privacy-policy',
    changeFrequency: 'yearly',
    priority: 0.4,
  },
  {
    path: '/terms-and-conditions',
    changeFrequency: 'yearly',
    priority: 0.4,
  },
]

export function normalizeSparkleOrigin(
  origin: string | URL = SPARKLE_PUBLIC_ORIGIN,
): string {
  const parsed = new URL(origin)

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('Sparkle crawl origins must use http or https.')
  }

  return parsed.origin
}

function firstForwardedValue(value: string | null | undefined) {
  return value?.split(',')[0]?.trim() || null
}

function normalizeSparkleHost(value: string | null | undefined) {
  const candidate = firstForwardedValue(value)
  if (!candidate) return null

  try {
    const parsed = new URL(
      /^[a-z][a-z\d+\-.]*:\/\//i.test(candidate)
        ? candidate
        : `https://${candidate}`,
    )
    return parsed.hostname.trim().toLowerCase().replace(/\.$/, '') || null
  } catch {
    return null
  }
}

function isLocalOrPreviewSparkleHost(host: string | null) {
  if (!host) return true
  if (LOCAL_HOSTS.has(host) || host.endsWith('.localhost')) return true

  return PREVIEW_HOST_SUFFIXES.some(
    (suffix) => host === suffix.slice(1) || host.endsWith(suffix),
  )
}

function resolveRequestProtocol(
  headers: Pick<Headers, 'get'>,
  requestUrl?: string | URL,
) {
  const forwardedProtocol = firstForwardedValue(headers.get('x-forwarded-proto'))
  if (forwardedProtocol === 'https' || forwardedProtocol === 'http') {
    return `${forwardedProtocol}:`
  }

  if (requestUrl) {
    try {
      const parsed = new URL(requestUrl)
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
        return parsed.protocol
      }
    } catch {
      return 'https:'
    }
  }

  return 'https:'
}

export function resolveSparkleRequestOriginFromHeaders(
  headers: Pick<Headers, 'get'>,
  requestUrl?: string | URL,
) {
  const requestUrlHost = requestUrl ? new URL(requestUrl).host : null
  const host = normalizeSparkleHost(
    // Vercel preserves the customer domain in Host for metadata route
    // handlers, while x-forwarded-host can be the internal platform host.
    // Prefer the direct request Host so a tenant sitemap never adopts the
    // Sparkle Suite platform origin.
    headers.get('host') ?? headers.get('x-forwarded-host') ?? requestUrlHost,
  )

  if (DEFAULT_PUBLIC_HOSTS.has(host ?? '') || isLocalOrPreviewSparkleHost(host)) {
    return SPARKLE_PUBLIC_ORIGIN
  }

  return normalizeSparkleOrigin(`${resolveRequestProtocol(headers, requestUrl)}//${host}`)
}

export function resolveSparkleRequestOrigin(request: Request) {
  return resolveSparkleRequestOriginFromHeaders(request.headers, request.url)
}

export function buildSparkleSitemap(
  origin: string | URL = SPARKLE_PUBLIC_ORIGIN,
): MetadataRoute.Sitemap {
  const normalizedOrigin = normalizeSparkleOrigin(origin)

  return SPARKLE_PUBLIC_ROUTES.map((route) => ({
    url: `${normalizedOrigin}${route.path}`,
    lastModified: SPARKLE_PUBLIC_LAST_MODIFIED,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }))
}

export function buildSparkleRobots(
  origin: string | URL = SPARKLE_PUBLIC_ORIGIN,
): MetadataRoute.Robots {
  const normalizedOrigin = normalizeSparkleOrigin(origin)

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/internal/', '/onboarding/'],
      },
    ],
    sitemap: `${normalizedOrigin}/sitemap.xml`,
    host: normalizedOrigin,
  }
}
