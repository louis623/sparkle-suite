import {
  renderCustomerSiteUnavailableResponse,
  resolveCustomerDomainSiteState,
} from '@/lib/amethyst/customer-domain-site'
import { renderAmethystPublicAssetResponse } from '@/lib/amethyst/public-asset-response'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CUSTOMER_SITE_PAGE_ASSETS: Record<string, string[]> = {
  home: ['Homepage.html'],
  trade: ['Trade.html'],
  join: ['Join.html'],
  'in-the-pantry': ['Pantry.html'],
}

const CUSTOMER_SITE_CANONICAL_PATHS: Record<string, string> = {
  home: '/',
  trade: '/trade',
  join: '/join',
  'in-the-pantry': '/in-the-pantry',
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ page: string }> },
) {
  const { page } = await params
  const asset = CUSTOMER_SITE_PAGE_ASSETS[page]
  const canonicalPathOverride = CUSTOMER_SITE_CANONICAL_PATHS[page]
  if (!asset || !canonicalPathOverride) return new Response('Not found', { status: 404 })

  const requestUrl = new URL(request.url)
  const site = await resolveCustomerDomainSiteState(
    requestUrl.searchParams.get('c') ??
      request.headers.get('x-sparkle-customer-domain') ??
      requestUrl.host,
  )
  // A real customer domain never falls back to demo data.
  if (site.kind === 'unavailable') return renderCustomerSiteUnavailableResponse()

  return renderAmethystPublicAssetResponse(request, asset, {
    canonicalPathOverride,
  })
}
