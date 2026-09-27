export const SPARKLE_SUITE_MARKETING_URL = 'https://www.yoursparklesuite.com/'
export const SPARKLE_SUITE_POWERED_BY_LABEL = "This site's powered by Sparkle Suite"

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Server-rendered credit used by pages that are not the shared browser footer script. */
export function renderSparkleSuitePoweredByLinkHtml() {
  const label = escapeHtml(SPARKLE_SUITE_POWERED_BY_LABEL)
  const href = escapeHtml(SPARKLE_SUITE_MARKETING_URL)
  return `<a class="ss-powered-by" href="${href}" target="_blank" rel="noreferrer noopener" aria-label="${label} (opens in a new tab)">${label}</a>`
}
