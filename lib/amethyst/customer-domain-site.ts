import { normalizeAmethystCustomDomainCandidate } from './host-routing'
import { resolveAmethystPreviewRep } from './preview-rep'
import { createAdminClient } from '@/lib/supabase/admin'

export type CustomerDomainSiteState =
  | { kind: 'not_customer_host' }
  | { kind: 'serve'; host: string; repId: string }
  | { kind: 'unavailable'; host: string }

type Dependencies = {
  createAdminClient?: typeof createAdminClient
  resolveAmethystPreviewRep?: typeof resolveAmethystPreviewRep
}

/**
 * Decides what a real customer domain may serve. A customer domain only ever
 * serves its own rep's site; it never falls back to the Sasha/Jane demo data or
 * to Suite marketing pages. Unknown domains, denied reps, and lookup failures
 * all fail closed to "unavailable".
 */
export async function resolveCustomerDomainSiteState(
  hostValue: string | null | undefined,
  dependencies: Dependencies = {},
): Promise<CustomerDomainSiteState> {
  const host = normalizeAmethystCustomDomainCandidate(hostValue)
  if (!host) return { kind: 'not_customer_host' }

  try {
    const admin = (dependencies.createAdminClient ?? createAdminClient)()
    const rep = await (dependencies.resolveAmethystPreviewRep ??
      resolveAmethystPreviewRep)(admin, { repId: host, select: 'id', strict: true })
    return rep ? { kind: 'serve', host, repId: rep.id } : { kind: 'unavailable', host }
  } catch {
    return { kind: 'unavailable', host }
  }
}

export const CUSTOMER_SITE_NOINDEX_HEADERS = {
  'Cache-Control': 'no-store',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
} as const

const UNAVAILABLE_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow, noarchive" />
<title>This site is temporarily unavailable</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;font:16px/1.5 system-ui,-apple-system,sans-serif;background:#faf7f5;color:#333;text-align:center;padding:24px}h1{font-size:1.4rem;margin:0 0 .5rem}p{margin:0;color:#666}</style>
</head>
<body><main><h1>This site is temporarily unavailable</h1><p>Please check back soon.</p></main></body>
</html>`

export function renderCustomerSiteUnavailableResponse() {
  return new Response(UNAVAILABLE_HTML, {
    status: 503,
    headers: {
      ...CUSTOMER_SITE_NOINDEX_HEADERS,
      'Content-Type': 'text/html; charset=utf-8',
      'Retry-After': '3600',
    },
  })
}

export function renderCustomerSiteNotFoundResponse() {
  return new Response('Not found', {
    status: 404,
    headers: {
      ...CUSTOMER_SITE_NOINDEX_HEADERS,
      'Content-Type': 'text/plain; charset=utf-8',
    },
  })
}
