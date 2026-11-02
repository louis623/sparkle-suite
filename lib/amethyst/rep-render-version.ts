import { validatePublicSiteSlug } from '@/lib/public-site/show-link'

/** Valid rep slugs only; no wildcard or per-page syntax is accepted. */
export function parseRepRenderV2Allowlist(value: string | null | undefined): ReadonlySet<string> {
  return new Set((value ?? '').split(',').map(entry => entry.trim().toLowerCase())
    .filter(entry => validatePublicSiteSlug(entry).ok))
}

/** Any listed rep gets all three SSR pages. Everyone else keeps legacy. */
export function repRenderV2Enabled(slug: string | null | undefined, allowlist = process.env.REP_RENDER_V2_SLUGS) {
  const normalized = slug?.trim().toLowerCase()
  return Boolean(normalized && validatePublicSiteSlug(normalized).ok && parseRepRenderV2Allowlist(allowlist).has(normalized))
}

/** Only server-resolved route identity may opt in, for all three pages together. */
export function shouldUseRepRenderV2(asset: string[], options: {
  publicSiteSlugOverride?: string | null
  renderGateSlug?: string | null
}) {
  return ['Homepage.html', 'Trade.html', 'Join.html'].includes(asset.join('/')) &&
    repRenderV2Enabled(options.publicSiteSlugOverride ?? options.renderGateSlug)
}
