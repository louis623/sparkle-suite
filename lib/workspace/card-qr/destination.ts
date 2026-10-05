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
