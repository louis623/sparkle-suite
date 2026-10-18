import {
  renderCustomerSiteNotFoundResponse,
  renderCustomerSiteUnavailableResponse,
  resolveCustomerDomainSiteState,
} from '@/lib/amethyst/customer-domain-site'
import { renderCustomerFaq } from '@/lib/amethyst/customer-faq'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Next keeps the original request URL on the route handler, so a proxy
 * rewrite's `?c=` can be absent even though `x-middleware-rewrite` has it.
 * Read the rep from the query, the rewrite URL, the handoff header, then Host.
 */
function requestUrlOf(request: Request) {
  try {
    return new URL(request.url)
  } catch {
    return new URL(request.url, 'https://localhost')
  }
}

export function readCustomerFaqRepKey(request: Request) {
  const requestUrl = requestUrlOf(request)
  const fromQuery = requestUrl.searchParams.get('c')?.trim()
  if (fromQuery) return fromQuery

  const rewrite =
    request.headers.get('x-middleware-rewrite') ??
    request.headers.get('x-nextjs-rewrite')
  if (rewrite) {
    try {
      const fromRewrite = new URL(rewrite, requestUrl).searchParams.get('c')?.trim()
      if (fromRewrite) return fromRewrite
    } catch {
      // Ignore a malformed rewrite target and keep checking the host.
    }
  }

  return (
    request.headers.get('x-sparkle-customer-domain')?.trim() ||
    request.headers.get('x-forwarded-host') ||
    request.headers.get('host') ||
    requestUrl.host
  )
}

export async function GET(request: Request) {
  const site = await resolveCustomerDomainSiteState(readCustomerFaqRepKey(request))
  if (site.kind === 'not_customer_host') return renderCustomerSiteNotFoundResponse()
  if (site.kind === 'unavailable') return renderCustomerSiteUnavailableResponse()
  return renderCustomerFaq(request, { repId: site.repId, customDomain: true })
}
