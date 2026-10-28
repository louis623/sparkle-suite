/** Only the Fizz Festival demo may use the three approved SSR pages. */
export function repRenderV2Enabled(slug: string | null | undefined, allowlist = process.env.REP_RENDER_V2_SLUGS) {
  const normalized = slug?.trim().toLowerCase()
  return normalized === 'dudesfizzfest' && (allowlist ?? '').split(',').map(entry => entry.trim().toLowerCase()).includes(normalized)
}

/** Only the public route's server-resolved identity may opt in. */
export function shouldUseRepRenderV2(asset: string[], options: { publicSiteSlugOverride?: string | null }) {
  return ['Homepage.html', 'Trade.html', 'Join.html'].includes(asset.join('/')) && repRenderV2Enabled(options.publicSiteSlugOverride)
}
