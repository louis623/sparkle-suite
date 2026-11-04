import {
  NOT_SURE_SLUG,
  PREFERENCE_KINDS,
  type PreferenceKind,
  type PreferenceOption,
  type PreferenceOptionsByKind,
  fallbackPreferenceOptions,
} from '@/lib/sparkle-suite/jewelry-preferences'

/**
 * Finder publishes the shared lists at
 * https://yoursparklefinder.com/api/public/finder/preference-options.
 * Live Finder still serves those options from code until its beta migrations
 * are applied. The bundled copy is the default. Set
 * SPARKLE_FINDER_PREFERENCE_OPTIONS_URL to opt into a live fetch.
 * Any failure returns the bundled copy and never throws.
 */
export const FINDER_PREFERENCE_OPTIONS_PATH = '/api/public/finder/preference-options'

const FINDER_OPTIONS_CACHE_MS = 5 * 60 * 1000
const FINDER_OPTIONS_TIMEOUT_MS = 2500
const SLUG_PATTERN = /^[a-z0-9]+([_-][a-z0-9]+)*$/

export type PreferenceOptionsSource = 'fallback' | 'finder'

export type PreferenceOptionsLoadResult = {
  options: PreferenceOptionsByKind
  source: PreferenceOptionsSource
}

type CacheEntry = {
  at: number
  url: string
  result: PreferenceOptionsLoadResult
}

let cache: CacheEntry | null = null

export function resetPreferenceOptionsCache() {
  cache = null
}

export function finderPreferenceOptionsUrl(
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  const configured = env.SPARKLE_FINDER_PREFERENCE_OPTIONS_URL?.trim()
  return configured ? configured : null
}

export async function loadPreferenceOptions(input?: {
  finderUrl?: string | null
  fetchImpl?: typeof fetch
  now?: number
  env?: NodeJS.ProcessEnv
}): Promise<PreferenceOptionsLoadResult> {
  const fallback: PreferenceOptionsLoadResult = {
    options: fallbackPreferenceOptions,
    source: 'fallback',
  }
  const finderUrl =
    input && 'finderUrl' in input
      ? input.finderUrl?.trim() || null
      : finderPreferenceOptionsUrl(input?.env)
  if (!finderUrl) return fallback

  const now = input?.now ?? Date.now()
  if (cache && cache.url === finderUrl && now - cache.at < FINDER_OPTIONS_CACHE_MS) {
    return cache.result
  }

  try {
    const fetchImpl = input?.fetchImpl ?? fetch
    const response = await fetchImpl(finderUrl, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(FINDER_OPTIONS_TIMEOUT_MS),
    })
    if (!response.ok) return remember(finderUrl, now, fallback)

    const body = await response.json()
    const options = normalizeFinderPreferenceOptions(body)
    if (!options) return remember(finderUrl, now, fallback)

    return remember(finderUrl, now, { options, source: 'finder' })
  } catch {
    return remember(finderUrl, now, fallback)
  }
}

function remember(
  url: string,
  now: number,
  result: PreferenceOptionsLoadResult,
): PreferenceOptionsLoadResult {
  cache = { at: now, url, result }
  return result
}

export function normalizeFinderPreferenceOptions(body: unknown): PreferenceOptionsByKind | null {
  if (!body || typeof body !== 'object') return null
  const options = (body as { options?: unknown }).options
  if (!options || typeof options !== 'object') return null

  const grouped = {} as PreferenceOptionsByKind
  for (const kind of PREFERENCE_KINDS) {
    const rows = (options as Record<string, unknown>)[kind]
    const normalized = normalizeKindOptions(rows)
    if (!normalized) return null
    grouped[kind] = normalized
  }
  return grouped
}

function normalizeKindOptions(rows: unknown): PreferenceOption[] | null {
  if (!Array.isArray(rows) || rows.length === 0) return null
  const seen = new Set<string>()
  const options: PreferenceOption[] = []

  for (const row of rows) {
    if (!row || typeof row !== 'object') return null
    const record = row as Record<string, unknown>
    if (typeof record.slug !== 'string' || typeof record.label !== 'string') return null
    const slug = record.slug.trim()
    const label = record.label.trim()
    if (!SLUG_PATTERN.test(slug) || label.length < 1 || label.length > 80) return null
    if (seen.has(slug)) continue
    seen.add(slug)
    options.push({
      slug,
      label,
      isRetired: record.isRetired === true,
      ...(record.isHidden === true ? { isHidden: true } : {}),
      groupLabel: typeof record.groupLabel === 'string' ? record.groupLabel : undefined,
      sortOrder: typeof record.sortOrder === 'number' ? record.sortOrder : options.length,
      source: isPreferenceSource(record.source) ? record.source : undefined,
    })
  }

  if (!seen.has(NOT_SURE_SLUG)) return null
  return options
}

function isPreferenceSource(
  value: unknown,
): value is NonNullable<PreferenceOption['source']> {
  return value === 'library' || value === 'bomb_party' || value === 'both' || value === 'standard'
}

export type { PreferenceKind }
