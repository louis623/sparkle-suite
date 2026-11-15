import { normalizeAmethystCustomDomainCandidate } from '@/lib/amethyst/host-routing'
import type { Publication } from './types'

// An explicit publication decision is required. An id, slug, or preview href is never evidence.
export function danceFloorPublication(input: {
  published?: boolean | null; repId?: string | null; publicSiteSlug?: string | null;
  customDomain?: string | null; origin: string
}): Publication {
  if (input.published == null) return { status: 'unknown' }
  if (!input.published) return { status: 'unpublished' }
  const domain = normalizeAmethystCustomDomainCandidate(input.customDomain)
  const slug = input.publicSiteSlug?.trim().toLowerCase()
  return { status: 'published', tradeUrl: domain ? `https://${domain}/trade` :
    slug ? new URL(`/${encodeURIComponent(slug)}/trade`, input.origin).href : null }
}
