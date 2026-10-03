import { FOUNDER_PRICING_REP_LIMIT } from '@/lib/stripe/sparkle-suite-pricing'
import { unavailableFounderAvailability, type FounderAvailability } from '@/lib/sparkle-suite/founder-availability'

/**
 * Smoke env values are rejected when they contain the production host, so the
 * live URL stays in source. Smoke reads this endpoint; it does not count its
 * own database and it does not invent a number.
 */
export const LIVE_FOUNDER_AVAILABILITY_URL = 'https://www.yoursparklesuite.com/api/public/founder-availability'

export function isSuiteSmokeEnvironment(env: NodeJS.ProcessEnv = process.env) {
  return env.SPARKLE_ENVIRONMENT === 'smoke' && env.NEXT_PUBLIC_SPARKLE_ENVIRONMENT === 'smoke'
}

export function parseLiveFounderAvailability(payload: unknown): FounderAvailability | null {
  if (!payload || typeof payload !== 'object') return null
  const data = payload as { status?: unknown; remaining?: unknown; checkedAt?: unknown }
  const checkedAt = data.checkedAt == null ? null : typeof data.checkedAt === 'string' && data.checkedAt.length > 0 ? data.checkedAt : undefined
  if (checkedAt === undefined) return null
  if (data.status === 'available' && Number.isInteger(data.remaining) && (data.remaining as number) > 0 && (data.remaining as number) <= FOUNDER_PRICING_REP_LIMIT) {
    return { status: 'available', remaining: data.remaining as number, checkedAt }
  }
  if (data.status === 'full' && data.remaining === 0) return { status: 'full', remaining: 0, checkedAt }
  return null
}

export async function readLiveFounderAvailability(fetchImpl: typeof fetch = fetch): Promise<FounderAvailability> {
  try {
    const response = await fetchImpl(LIVE_FOUNDER_AVAILABILITY_URL, {
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    })
    if (!response.ok) return unavailableFounderAvailability()
    return parseLiveFounderAvailability(await response.json()) ?? unavailableFounderAvailability()
  } catch {
    return unavailableFounderAvailability()
  }
}

/** Undefined outside Suite Smoke, so production rendering does not call live. */
export async function readLandingFounderAvailability(fetchImpl: typeof fetch = fetch): Promise<FounderAvailability | undefined> {
  if (!isSuiteSmokeEnvironment()) return undefined
  const { connection } = await import('next/server')
  await connection()
  return readLiveFounderAvailability(fetchImpl)
}
