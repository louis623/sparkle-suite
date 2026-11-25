import { normalizeAmethystCustomDomainCandidate } from '@/lib/amethyst/host-routing'
import { validatePublicSiteSlug } from '@/lib/public-site/show-link'

export const LOOK_PREVIEW_DEBOUNCE_MS = 8000
export const LOOK_PREVIEW_MAX_ATTEMPTS = 3
export const SMOKE_PUBLIC_ORIGIN = 'https://sparkle-suite-smoke.vercel.app'
export const LIVE_PUBLIC_ORIGIN = 'https://www.yoursparklesuite.com'

/** Fields that change the top of the public site. Anything else does not recapture. */
export const LOOK_PREVIEW_FIELDS = [
  'appearancePreset',
  'customerSiteTemplate',
  'businessName',
  'displayName',
  'showJoinPage',
  'tickerText',
  'tickerVisible',
  'bannerText',
  'bannerVisible',
  'danceFloorVisible',
  'liveLineupVisible',
  'heroHeadline',
  'heroSubtitle',
  'heroImageUrl',
  'heroAnimationType',
] as const

export type LookPreviewField = (typeof LOOK_PREVIEW_FIELDS)[number]

export function lookPreviewFingerprint(settings: object) {
  const record = settings as Record<string, unknown>
  const picked: Record<string, unknown> = {}
  for (const field of LOOK_PREVIEW_FIELDS) picked[field] = record[field] ?? null
  return JSON.stringify(picked)
}

export function shouldQueueLookPreview(previousFingerprint: string | null, nextFingerprint: string) {
  return previousFingerprint !== nextFingerprint
}

export function lookPreviewDelayElapsed(queuedAtMs: number, nowMs: number, flush: boolean) {
  if (flush) return true
  return nowMs - queuedAtMs >= LOOK_PREVIEW_DEBOUNCE_MS
}

export function applyLookPreviewFailure<T extends { desktopUrl: string | null; phoneUrl: string | null; attemptCount: number }>(row: T) {
  return {
    ...row,
    status: 'failed' as const,
    desktopUrl: row.desktopUrl,
    phoneUrl: row.phoneUrl,
    attemptCount: row.attemptCount + 1,
    lastError: 'capture-failed',
  }
}

export function isMissingLookPreviewTable(error: { code?: string; message?: string } | null | undefined) {
  if (!error) return false
  if (error.code === '42P01' || error.code === 'PGRST205') return true
  const message = error.message ?? ''
  return /site_look_previews/i.test(message) && /does not exist|schema cache|could not find/i.test(message)
}

export function buildLookPreviewCaptureUrl(input: {
  slug: string
  customDomain?: string | null
  smoke: boolean
}) {
  const slug = input.slug.trim().toLowerCase()
  if (!validatePublicSiteSlug(slug).ok) throw new Error('invalid public site slug')
  if (input.smoke) return `${SMOKE_PUBLIC_ORIGIN}/${slug}`
  const customDomain = normalizeAmethystCustomDomainCandidate(input.customDomain)
  if (customDomain) return `https://${customDomain}/`
  return `${LIVE_PUBLIC_ORIGIN}/${slug}`
}

export function assertAllowedLookPreviewUrl(url: string, allowedHosts: readonly string[]) {
  const parsed = new URL(url)
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password) {
    throw new Error('look preview url blocked')
  }
  const host = parsed.hostname.toLowerCase()
  const allowed = new Set(allowedHosts.map((item) => item.toLowerCase()))
  if (!allowed.has(host)) throw new Error('look preview url blocked')
  return parsed.toString()
}
