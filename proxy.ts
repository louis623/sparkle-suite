import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { isAmethystPlatformHost, normalizeAmethystCustomDomainCandidate } from '@/lib/amethyst/host-routing'

const CUSTOMER_SITE_ROUTES: Record<string, string> = {
  '/': '/customer-site/home',
  '/trade': '/customer-site/trade',
  '/join': '/customer-site/join',
  '/in-the-pantry': '/customer-site/in-the-pantry',
}

export function proxy(request: NextRequest) {
  const headers = new Headers(request.headers)
  // Only this proxy may introduce the internal tenant handoff header.
  headers.delete('x-sparkle-customer-domain')
  if (request.nextUrl.pathname.startsWith('/onboarding/')) {
    const response = NextResponse.next({ request: { headers } })
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive')
    response.headers.set('Cache-Control', 'private, no-store, max-age=0')
    response.headers.set('Referrer-Policy', 'no-referrer')
    return response
  }
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host')
  const customerDomain = normalizeAmethystCustomDomainCandidate(host)
  if (!customerDomain || isAmethystPlatformHost(host)) {
    return NextResponse.next({ request: { headers } })
  }

  // Customer domains use the apex hostname as their one public search identity.
  // Keep existing www links working, but permanently consolidate their crawl
  // signals and visitors onto that preferred hostname before any page rewrite.
  if (customerDomain.startsWith('www.')) {
    const canonicalUrl = request.nextUrl.clone()
    canonicalUrl.hostname = customerDomain.slice('www.'.length)
    return NextResponse.redirect(canonicalUrl, 308)
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
  matcher: [
    '/',
    '/trade',
    '/join',
    '/in-the-pantry',
    '/onboarding/:path*',
    '/api/:path*',
  ],
}
