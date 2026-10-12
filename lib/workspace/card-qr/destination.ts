import { normalizeAmethystCustomDomainCandidate } from '@/lib/amethyst/host-routing'
import { buildCustomerSparkleSiteHref } from '@/lib/nic-nac/rep-links'

export interface CardQrRepTarget {
  customDomain?: string | null
  publicSiteSlug?: string | null
  repId?: string | null
}

export function buildCardQrSiteHref(target: CardQrRepTarget) {
  const customDomain = normalizeAmethystCustomDomainCandidate(target.customDomain)
  if (customDomain) return `https://${customDomain}`
  return buildCustomerSparkleSiteHref({
    publicSiteSlug: target.publicSiteSlug,
    repId: target.repId,
  })
}

export function resolveCardQrDestination(
  siteHref: string | null | undefined,
  origin: string | null | undefined,
) {
  const href = siteHref?.trim() ?? ''
  if (!href) return null
  if (/^https:\/\//i.test(href)) return href.replace(/\/$/, '')
  const base = origin?.trim().replace(/\/$/, '') ?? ''
  if (!base) return null
  return `${base}${href.startsWith('/') ? href : `/${href}`}`
}

export function buildCardQrDestinationForRep(
  target: CardQrRepTarget,
  origin: string,
) {
  return resolveCardQrDestination(buildCardQrSiteHref(target), origin)
}

function parseOrigin(value: string | null | undefined) {
  if (!value) return null
  try {
    return new URL(value).origin
  } catch {
    return null
  }
}

function isLocalHost(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1'
}

function isAllowedCardQrOrigin(origin: string, configuredOrigin: string | null) {
  let url: URL
  try {
    url = new URL(origin)
  } catch {
    return false
  }
  if (url.protocol !== 'https:' && !isLocalHost(url.hostname)) return false
  if (configuredOrigin && origin === configuredOrigin) return true
  if (isLocalHost(url.hostname)) return true
  if (url.hostname === 'yoursparklesuite.com' || url.hostname === 'www.yoursparklesuite.com') return true
  return url.hostname.endsWith('.vercel.app')
}

/**
 * Origin for the rep's site QR. Reads the public app URL and the request host only.
 * Do not call getAppUrl() or getStripeConfig() — those throw when Smoke has no Stripe secrets.
 */
export function resolveCardQrRequestOrigin(
  request: Request,
  env: NodeJS.ProcessEnv = process.env,
) {
  const configuredOrigin = parseOrigin(env.NEXT_PUBLIC_APP_URL)
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim()
  const host = forwardedHost || request.headers.get('host')
  const proto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() || 'https'
  const candidates = [
    parseOrigin(request.headers.get('origin')),
    parseOrigin(request.url),
    host ? parseOrigin(`${proto}://${host}`) : null,
    configuredOrigin,
  ]
  for (const candidate of candidates) {
    if (candidate && isAllowedCardQrOrigin(candidate, configuredOrigin)) return candidate
  }
  return configuredOrigin ?? 'http://localhost:3000'
}

export function isReadyCardQrDestination(url: string | null | undefined) {
  if (!url) return false
  try {
    const parsed = new URL(url)
    const local = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1'
    if (parsed.protocol !== 'https:' && !local) return false
    if (
      parsed.pathname === '/amethyst/Homepage.html' &&
      !parsed.searchParams.get('c')
    ) {
      return false
    }
    return true
  } catch {
    return false
  }
}
