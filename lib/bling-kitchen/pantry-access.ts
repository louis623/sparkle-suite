/**
 * Public In the Pantry is an explicit allowlist, not a default and not a
 * name/email/team match. A new rep never receives the page, nav, or crawl
 * entry unless their site id, public slug, or custom domain is listed here.
 */
export const BLING_KITCHEN_PANTRY_REP_IDS = [
  '9a971c05-3631-443e-bcb8-4e9a26e15885',
] as const

export const BLING_KITCHEN_PANTRY_SLUGS = ['blingkitchen'] as const

export const BLING_KITCHEN_PANTRY_DOMAINS = ['theblingkitchen.com'] as const

const REP_IDS = new Set<string>(BLING_KITCHEN_PANTRY_REP_IDS)
const SLUGS = new Set<string>(BLING_KITCHEN_PANTRY_SLUGS)
const DOMAINS = new Set<string>(BLING_KITCHEN_PANTRY_DOMAINS)

function clean(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? ''
}

function apexDomain(value: string | null | undefined) {
  const host = clean(value)
  return host.startsWith('www.') ? host.slice('www.'.length) : host
}

export function isBlingKitchenPantryAllowed(input: {
  repId?: string | null
  publicSiteSlug?: string | null
  customDomain?: string | null
}) {
  const repId = clean(input.repId)
  const slug = clean(input.publicSiteSlug)
  const domain = apexDomain(input.customDomain)
  const domainFromRepId = repId.includes('.') ? apexDomain(repId) : ''

  return (
    (repId !== '' && REP_IDS.has(repId)) ||
    (slug !== '' && SLUGS.has(slug)) ||
    (domain !== '' && DOMAINS.has(domain)) ||
    (domainFromRepId !== '' && DOMAINS.has(domainFromRepId))
  )
}

type PantryLinkedPages = {
  homepage: { pantryPageUrl?: string }
  trade: { pantryPageUrl?: string }
  join: { pantryPageUrl?: string }
}

/** Drop nav and footer pantry links the shared mapper still emits for a name match. */
export function restrictPantryTemplateData<T extends PantryLinkedPages>(
  data: T,
  identity: {
    repId?: string | null
    publicSiteSlug?: string | null
    customDomain?: string | null
  },
): T {
  if (isBlingKitchenPantryAllowed(identity)) return data
  return {
    ...data,
    homepage: { ...data.homepage, pantryPageUrl: undefined },
    trade: { ...data.trade, pantryPageUrl: undefined },
    join: { ...data.join, pantryPageUrl: undefined },
  }
}

export function pantryNotFoundResponse() {
  return new Response('Not found', {
    status: 404,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Robots-Tag': 'noindex',
    },
  })
}
