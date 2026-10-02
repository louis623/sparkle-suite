type SmokeHomeEnv = {
  SPARKLE_ENVIRONMENT?: string
  NEXT_PUBLIC_SPARKLE_ENVIRONMENT?: string
}

/**
 * Smoke serves the two-card hub at `/`.
 * Live and any non-smoke build keep the marketing landing at `/`.
 */
export function isSuiteSmokeHomeHub(env: SmokeHomeEnv = process.env) {
  return (
    env.NEXT_PUBLIC_SPARKLE_ENVIRONMENT === 'smoke' ||
    env.SPARKLE_ENVIRONMENT === 'smoke'
  )
}
