import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { isAmethystPlatformHost, normalizeAmethystCustomDomainCandidate } from '@/lib/amethyst/host-routing'

const CUSTOMER_SITE_ROUTES: Record<string, string> = {
  '/': '/customer-site/home',
  '/trade': '/customer-site/trade',
  '/faq': '/customer-site/faq',
  '/join': '/customer-site/join',
  '/in-the-pantry': '/customer-site/in-the-pantry',
}

const BRITT_WITH_BLING_APEX = 'brittwithbling.com'

/** Old Britt with Bling URLs that still receive search impressions. */
const BRITT_LEGACY_PATHS: Record<string, string> = {
  '/about': '/#about',
  '/diamonds-unicorns': '/#wibp',
  '/join-team': '/join',
  '/embed': '/',
}

const SUITE_MARKETING_PATHS = ['/portfolio', '/tools', '/prelaunch', '/adventure', '/demo']

export function normalizePublicPath(pathname: string) {
  if (pathname.length > 1 && pathname.endsWith('/')) return pathname.replace(/\/+$/, '')
  return pathname
}

export function brittLegacyDestination(pathname: string): string | null {
  return BRITT_LEGACY_PATHS[normalizePublicPath(pathname)] ?? null
}

export function isSuiteMarketingPath(pathname: string) {
  const path = normalizePublicPath(pathname)
  return SUITE_MARKETING_PATHS.some((page) => path === page || path.startsWith(`${page}/`))
}

function repApexHost(host: string) {
  return host.startsWith('www.') ? host.slice('www.'.length) : host
}

function notFoundResponse() {
  return new NextResponse('Not found', {
    status: 404,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Robots-Tag': 'noindex',
    },
  })
}

function redirectBrittLegacy(request: NextRequest, destination: string) {
  const hashAt = destination.indexOf('#')
  const pathname = hashAt >= 0 ? destination.slice(0, hashAt) || '/' : destination
  const hash = hashAt >= 0 ? destination.slice(hashAt + 1) : ''
  const url = request.nextUrl.clone()
  url.protocol = 'https:'
  url.hostname = BRITT_WITH_BLING_APEX
  url.pathname = pathname
  url.hash = hash
  return NextResponse.redirect(url, 301)
}

/**
 * Public /amethyst/*.html documents are the old indexable template URLs.
 * The app still reads those files from disk for customer-site rendering and
 * skin previews, and still serves CSS, JS, and images from /amethyst/.
 * Dance Floor's live path is /trade on a rep custom domain. The Suite host
 * has no /trade page, so that same document consolidates to /.
 */
export function legacyAmethystHtmlDestination(
  pathname: string,
  onCustomerDomain: boolean,
): string | null {
  const match = pathname.match(/^\/amethyst\/([^/]+)$/)
  if (!match) return null

  let file = match[1]
  try {
    file = decodeURIComponent(file)
  } catch {
    return null
  }
  if (!file.toLowerCase().endsWith('.html')) return null
  if (file.toLowerCase() === 'trade.html' && onCustomerDomain) return '/trade'
  return '/'
}

export function proxy(request: NextRequest) {
  const headers = new Headers(request.headers)
  // Only this proxy may introduce the internal tenant handoff header.
  headers.delete('x-sparkle-customer-domain')
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host')
  const customerDomain = normalizeAmethystCustomDomainCandidate(host)
  const onCustomerDomain = Boolean(customerDomain) && !isAmethystPlatformHost(host)

  if (
    onCustomerDomain &&
    customerDomain &&
    repApexHost(customerDomain) === BRITT_WITH_BLING_APEX
  ) {
    const legacyDestination = brittLegacyDestination(request.nextUrl.pathname)
    if (legacyDestination) return redirectBrittLegacy(request, legacyDestination)
  }

  // Suite sales pages stay on yoursparklesuite.com. A rep host should not
  // publish them.
  if (onCustomerDomain && isSuiteMarketingPath(request.nextUrl.pathname)) {
    return notFoundResponse()
  }

  // Every www path on a rep custom domain, including sitemap, robots, assets,
  // and legacy HTML, consolidates onto the apex before a response is served.
  // Suite www.yoursparklesuite.com is not a customer domain and stays on www.
  if (onCustomerDomain && customerDomain?.startsWith('www.')) {
    const canonicalUrl = request.nextUrl.clone()
    canonicalUrl.hostname = customerDomain.slice('www.'.length)
    const legacyPath = legacyAmethystHtmlDestination(canonicalUrl.pathname, true)
    if (legacyPath) canonicalUrl.pathname = legacyPath
    return NextResponse.redirect(canonicalUrl, 308)
  }

  if (request.nextUrl.pathname.startsWith('/onboarding/')) {
    const response = NextResponse.next({ request: { headers } })
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive')
    response.headers.set('Cache-Control', 'private, no-store, max-age=0')
    response.headers.set('Referrer-Policy', 'no-referrer')
    return response
  }
  const legacyPath = legacyAmethystHtmlDestination(
    request.nextUrl.pathname,
    onCustomerDomain,
  )
  if (legacyPath) {
    const canonicalUrl = request.nextUrl.clone()
    canonicalUrl.pathname = legacyPath
    return NextResponse.redirect(canonicalUrl, 308)
  }
  if (customerDomain && (request.nextUrl.pathname === '/faq/articles' || request.nextUrl.pathname.startsWith('/faq/articles/'))) {
    return notFoundResponse()
  }
  // /faq on the Suite host is the marketing FAQ. Rep previews stay on /faq?c=
  // and custom domains keep the customer Dance Floor FAQ.
  const previewRep = request.nextUrl.searchParams.get('c')?.trim()
  if (!customerDomain && request.nextUrl.pathname === '/faq' && previewRep) {
    const url = request.nextUrl.clone()
    url.pathname = '/internal/customer-faq-preview'
    return NextResponse.rewrite(url, { request: { headers } })
  }
  if (!customerDomain || !onCustomerDomain) {
    return NextResponse.next({ request: { headers } })
  }

  const publicAssetPath = CUSTOMER_SITE_ROUTES[request.nextUrl.pathname]
  if (!publicAssetPath) return NextResponse.next({ request: { headers } })

  const url = request.nextUrl.clone()
  url.pathname = publicAssetPath
  // The rewrite request header is not retained by Vercel's internal route
  // boundary. Carry the already-normalized tenant in the internal rewrite URL
  // as well; this is never exposed in the canonical customer URL.
  url.searchParams.set('c', customerDomain)

  // Rewrites replace the host with the platform route. Preserve the verified
  // original custom domain so server-rendered metadata uses the same tenant.
  headers.set('x-sparkle-customer-domain', customerDomain)
  return NextResponse.rewrite(url, { request: { headers } })
}

export const config = {
  // Run on every public path so a www customer host redirects before sitemap,
  // robots, legacy HTML, or any other response can advertise that host.
  // Next internals stay out of the proxy.
  matcher: ['/((?!_next/static|_next/image).*)'],
}
