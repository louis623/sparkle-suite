/**
 * Cross-product marketing destinations.
 *
 * Production and any build without a Smoke marker keep the live hosts.
 * Smoke builds already set SPARKLE_ENVIRONMENT and
 * NEXT_PUBLIC_SPARKLE_ENVIRONMENT to "smoke", so the same pages can point
 * at the other product's Smoke landing without a new URL env var. The Smoke
 * env guard rejects live-host strings, so those hosts stay code defaults.
 */

const FINDER_LIVE_MARKETING_HREF = 'https://yoursparklefinder.com'
const FINDER_SMOKE_MARKETING_HREF = 'https://sparkle-finder-smoke.vercel.app/learn'

interface MarketingDestinationEnv extends NodeJS.ProcessEnv {
  SPARKLE_ENVIRONMENT?: string
  NEXT_PUBLIC_SPARKLE_ENVIRONMENT?: string
}

export function isSparkleMarketingSmoke(
  env: MarketingDestinationEnv = process.env,
) {
  return (
    env.NEXT_PUBLIC_SPARKLE_ENVIRONMENT === 'smoke' ||
    env.SPARKLE_ENVIRONMENT === 'smoke'
  )
}

/** Finder landing a Suite marketing page should open. */
export function sparkleFinderMarketingHref(
  env: MarketingDestinationEnv = process.env,
) {
  return isSparkleMarketingSmoke(env)
    ? FINDER_SMOKE_MARKETING_HREF
    : FINDER_LIVE_MARKETING_HREF
}
