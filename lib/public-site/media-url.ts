export function normalizePublicMediaUrl(value: unknown) {
  if (typeof value !== 'string') return ''
  const trimmed = value.trim()
  if (!trimmed) return ''

  const decoded = trimmed
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')

  const candidates = [decoded]
  const attributePattern = /\b(?:cite|src|href)\s*=\s*["']([^"']+)["']/gi
  let attributeMatch: RegExpExecArray | null
  while ((attributeMatch = attributePattern.exec(decoded))) {
    candidates.push(attributeMatch[1])
  }

  const embeddedUrls = decoded.match(/https?:\/\/[^\s"'<>]+/gi)
  if (embeddedUrls) candidates.push(...embeddedUrls)

  for (const candidate of candidates) {
    try {
      const url = new URL(candidate.replace(/&amp;/gi, '&'))
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        return url.toString()
      }
    } catch {
      // Keep looking through URLs extracted from embed markup.
    }
  }

  return ''
}

export function isSupportedPublicVideoUrl(value: string) {
  try {
    const url = new URL(value)
    const host = url.hostname.toLowerCase().replace(/^www\./, '')

    if (host === 'tiktok.com') {
      return /(?:\/video\/|\/player\/v1\/|\/embed\/(?:v2\/)?)[0-9]+/i.test(url.pathname)
    }

    if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      return (
        /^\/(?:shorts|embed|live)\/[\w-]{6,}/i.test(url.pathname) ||
        /^[\w-]{6,}$/.test(url.searchParams.get('v') ?? '')
      )
    }

    if (host === 'youtu.be') return /^\/[\w-]{6,}/.test(url.pathname)

    if (host === 'instagram.com') {
      return /^\/(?:reel|reels|p)\/[\w-]+/i.test(url.pathname)
    }

    return host === 'facebook.com' || host === 'fb.watch'
  } catch {
    return false
  }
}

const TIKTOK_SHORT_LINK_HOSTS = new Set([
  'tiktok.com',
  'www.tiktok.com',
  'vm.tiktok.com',
  'vt.tiktok.com',
])

function isTikTokShortCode(value: string) {
  return /^[A-Za-z0-9]{6,32}$/.test(value)
}

export function isTikTokShortVideoUrl(value: unknown) {
  const normalized = normalizePublicMediaUrl(value)
  if (!normalized) return false

  try {
    const url = new URL(normalized)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false
    if (url.username || url.password) return false
    if (url.port) return false
    const host = url.hostname.toLowerCase().replace(/\.$/, '')
    if (!TIKTOK_SHORT_LINK_HOSTS.has(host)) return false
    const segments = url.pathname.split('/').filter(Boolean)
    if (host === 'vm.tiktok.com' || host === 'vt.tiktok.com') {
      return segments.length === 1 && isTikTokShortCode(segments[0])
    }
    return segments.length === 2 && segments[0] === 't' && isTikTokShortCode(segments[1])
  } catch {
    return false
  }
}

export function normalizeSupportedPublicVideoUrl(value: unknown) {
  const normalized = normalizePublicMediaUrl(value)
  return normalized && isSupportedPublicVideoUrl(normalized) ? normalized : ''
}

// Supported players stay as entered. TikTok share links are kept for the
// settings draft and resolved to a video URL when the rep saves.
export function publicVideoDraftUrl(value: unknown) {
  const normalized = normalizePublicMediaUrl(value)
  if (!normalized) return ''
  if (isSupportedPublicVideoUrl(normalized) || isTikTokShortVideoUrl(normalized)) {
    return normalized
  }
  return ''
}
