export type QueueAttribution = { src?: string; campaign?: string }

const STORAGE_KEY = 'sparkle-suite-queue-attribution'

/** Only voluntary campaign labels: never URLs, referrers, click IDs or identity data. */
export function normalizeQueueAttribution(value: unknown): QueueAttribution {
  const input = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  const src = typeof input.src === 'string' ? input.src.trim().toLowerCase() : ''
  if (!/^[a-z0-9_-]{1,40}$/.test(src)) return {}
  const campaign = typeof input.campaign === 'string' ? input.campaign.trim().toLowerCase() : ''
  return {
    src,
    ...(/^[a-z0-9_-]{1,80}$/.test(campaign) ? { campaign } : {}),
  }
}

export function queueAttributionFromSearch(search: string): QueueAttribution {
  const params = new URLSearchParams(search)
  return normalizeQueueAttribution({ src: params.get('src'), campaign: params.get('campaign') })
}

export function withQueueAttribution(href: string, attribution: QueueAttribution): string {
  // Attribution never leaves the marketing origin, including protocol-relative URLs.
  if (!href.startsWith('/') || href.startsWith('//') || href.includes('\\')) return href
  const normalized = normalizeQueueAttribution(attribution)
  if (!normalized.src) return href
  const url = new URL(href, 'https://sparkle-suite.invalid')
  url.searchParams.set('src', normalized.src)
  if (normalized.campaign) url.searchParams.set('campaign', normalized.campaign)
  else url.searchParams.delete('campaign')
  return url.pathname + url.search + url.hash
}

/** Source stays in the existing private waitlist record; no schema migration required. */
export function queueSignupSource(attribution: QueueAttribution): string {
  const normalized = normalizeQueueAttribution(attribution)
  if (!normalized.src) return 'prelaunch_site'
  return 'prelaunch_site?' + new URLSearchParams(normalized as Record<string, string>).toString()
}

export function readBrowserQueueAttribution(): QueueAttribution {
  if (typeof window === 'undefined') return {}
  const explicit = queueAttributionFromSearch(window.location.search)
  if (explicit.src) return explicit
  try {
    return normalizeQueueAttribution(JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) || '{}'))
  } catch {
    return {}
  }
}

/** Tab-session only. An explicit valid new tagged visit replaces the previous campaign. */
export function rememberBrowserQueueAttribution(): void {
  if (typeof window === 'undefined') return
  const explicit = queueAttributionFromSearch(window.location.search)
  if (!explicit.src) return
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(explicit))
  } catch {
    // Safari/TikTok storage restrictions must never prevent navigation or signup.
  }
}
