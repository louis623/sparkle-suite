import {
  toPublicFounderAvailability,
  unavailablePublicFounderAvailability,
  type PublicFounderAvailability,
} from '@/lib/sparkle-suite/public-founder-availability'

/**
 * Smoke env values are rejected when they contain the production host, so the
 * live URL stays in source. Smoke reads this endpoint; it does not count its
 * own database and it does not invent a number. Smoke only needs the status
 * (founder pricing offered or full), so the public endpoint never has to
 * expose a slot count.
 */
export const LIVE_FOUNDER_AVAILABILITY_URL = 'https://www.yoursparklesuite.com/api/public/founder-availability'

export function isSuiteSmokeEnvironment(env: NodeJS.ProcessEnv = process.env) {
  return env.SPARKLE_ENVIRONMENT === 'smoke' && env.NEXT_PUBLIC_SPARKLE_ENVIRONMENT === 'smoke'
}

/** Accepts a status-only payload. Any count Live may still send is dropped. */
export function parseLiveFounderAvailability(payload: unknown): PublicFounderAvailability | null {
  const parsed = toPublicFounderAvailability(payload)
  return parsed.status === 'unavailable' ? null : parsed
}

export async function readLiveFounderAvailability(fetchImpl: typeof fetch = fetch): Promise<PublicFounderAvailability> {
  try {
    const response = await fetchImpl(LIVE_FOUNDER_AVAILABILITY_URL, {
      cache: 'no-store',
      signal: AbortSignal.timeout(1500),
    })
    if (!response.ok) return unavailablePublicFounderAvailability()
    return parseLiveFounderAvailability(await response.json()) ?? unavailablePublicFounderAvailability()
  } catch {
    return unavailablePublicFounderAvailability()
  }
}

/**
 * Server-render the correct offer in each environment without calling Stripe.
 * Returns only `{ status, checkedAt }` because the result is passed to a client
 * component and serialized into the page source.
 */
export async function readLandingFounderAvailability(fetchImpl: typeof fetch = fetch): Promise<PublicFounderAvailability> {
  const { connection } = await import('next/server')
  await connection()
  if (isSuiteSmokeEnvironment()) return readLiveFounderAvailability(fetchImpl)
  const { getFounderAvailability } = await import('./founder-availability-service')
  return toPublicFounderAvailability(await getFounderAvailability())
}
