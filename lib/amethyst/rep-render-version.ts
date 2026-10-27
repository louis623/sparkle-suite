/** Chunk 1 is deliberately incapable of enabling any other rep or page. */
export function repRenderV2Enabled(slug: string | null | undefined, allowlist = process.env.REP_RENDER_V2_SLUGS) {
  const normalized = slug?.trim().toLowerCase()
  return normalized === 'dudesfizzfest' && (allowlist ?? '').split(',').map(entry => entry.trim().toLowerCase()).includes(normalized)
}

/** Only the public route's server-resolved identity may opt in. */
export function shouldUseRepRenderV2(asset: string[], options: { publicSiteSlugOverride?: string | null }) {
  return asset.join('/') === 'Homepage.html' && repRenderV2Enabled(options.publicSiteSlugOverride)
}
