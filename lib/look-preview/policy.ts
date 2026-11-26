import { normalizeAmethystCustomDomainCandidate } from '@/lib/amethyst/host-routing'
import { validatePublicSiteSlug } from '@/lib/public-site/show-link'

export const LOOK_PREVIEW_DEBOUNCE_MS = 8000
export const LOOK_PREVIEW_MAX_ATTEMPTS = 3
export const LOOK_PREVIEW_BUSY_MS = 70_000

export function chooseLookPreviewCandidate<T extends {
  attemptCount: number
  updatedAtMs: number
  processingStartedAtMs: number | null
}>(rows: readonly T[], nowMs: number) {
  return rows
    .filter((row) => row.attemptCount < LOOK_PREVIEW_MAX_ATTEMPTS)
    .filter((row) => row.processingStartedAtMs == null || nowMs - row.processingStartedAtMs >= LOOK_PREVIEW_BUSY_MS)
    .sort((a, b) => a.attemptCount - b.attemptCount || a.updatedAtMs - b.updatedAtMs)[0] ?? null
}

/** True when no capture is running, or the current stamp is older than the busy window. */
export function canClaimLookPreview(
  processingStartedAt: string | null | undefined,
  nowMs: number,
  busyMs = LOOK_PREVIEW_BUSY_MS,
) {
  if (!processingStartedAt) return true
  const startedMs = new Date(processingStartedAt).getTime()
  if (!Number.isFinite(startedMs)) return true
  return nowMs - startedMs >= busyMs
}

/** PostgREST `or` clause: claim only when processing_started_at is null or stale. */
export function lookPreviewClaimOrFilter(nowMs: number, busyMs = LOOK_PREVIEW_BUSY_MS) {
  const staleBefore = new Date(nowMs - busyMs).toISOString()
  return `processing_started_at.is.null,processing_started_at.lt."${staleBefore}"`
}

/** Final writes may apply only while this run still holds the processing stamp it claimed. */
export function lookPreviewWriteOwnsClaim(
  currentProcessingStartedAt: string | null | undefined,
  claimedProcessingStartedAt: string | null | undefined,
) {
  return Boolean(claimedProcessingStartedAt) && currentProcessingStartedAt === claimedProcessingStartedAt
}

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

export const LOOK_PREVIEW_POLL_START_MS = 3_000
export const LOOK_PREVIEW_POLL_MAX_MS = 12_000
export const LOOK_PREVIEW_POLL_WINDOW_MS = 120_000

export function lookPreviewStillPending(status: string | null | undefined) {
  return status === 'updating' || status === 'missing'
}

export function nextLookPreviewPollDelay(attempt: number) {
  const step = Math.max(0, attempt)
  return Math.min(Math.round(LOOK_PREVIEW_POLL_START_MS * 1.5 ** step), LOOK_PREVIEW_POLL_MAX_MS)
}

export const LOOK_PREVIEW_MARKER_WAIT_MS = 12_000
export const LOOK_PREVIEW_SETTLE_MS = 700
const BLANK_TEXT_LENGTH = 40

export type LookPreviewPageSignals = {
  httpStatus: number
  hasHpHeader: boolean
  hasHpHero: boolean
  hasTemplateSrc: boolean
  fontsReady: boolean
  heroDecoded: boolean
  settled: boolean
  textLength: number
}

export type LookPreviewReadyDecision =
  | { action: 'capture'; mode: 'markers' | 'settled' }
  | { action: 'wait' }
  | { action: 'skip'; reason: 'page-missing' | 'blank' }

/** Ready when this page's own header and hero are painted, or the 200 page has settled with real content. */
export function decideLookPreviewReady(signals: LookPreviewPageSignals): LookPreviewReadyDecision {
  if (signals.httpStatus === 404 || signals.httpStatus === 410) {
    return { action: 'skip', reason: 'page-missing' }
  }
  if (signals.httpStatus !== 200) return { action: 'wait' }
  const hasMarkers = signals.hasHpHeader && signals.hasHpHero
  if (hasMarkers) {
    if (!signals.fontsReady || !signals.heroDecoded) return { action: 'wait' }
    return { action: 'capture', mode: 'markers' }
  }
  if (!signals.settled) return { action: 'wait' }
  if (signals.textLength < BLANK_TEXT_LENGTH) return { action: 'skip', reason: 'blank' }
  return { action: 'capture', mode: 'settled' }
}

export function applyLookPreviewSkip<T extends { desktopUrl: string | null; phoneUrl: string | null }>(
  row: T,
  reason: 'page-missing' | 'blank',
) {
  return {
    ...row,
    status: 'skipped' as const,
    desktopUrl: row.desktopUrl,
    phoneUrl: row.phoneUrl,
    attemptCount: LOOK_PREVIEW_MAX_ATTEMPTS,
    lastError: reason,
  }
}

export function lookPreviewFailureDetails(error: unknown) {
  const raw = error instanceof Error ? error.message : 'capture failed'
  const errorMessage = raw.replace(/https?:\/\/\S+/gi, '[url]').replace(/\s+/g, ' ').trim().slice(0, 240)
  return {
    errorName: error instanceof Error ? error.name : 'Error',
    errorMessage: errorMessage || 'capture failed',
  }
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
