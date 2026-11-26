/** The review harness is for local development and the Smoke project. Live must 404. */
export function isThemeStudioHarnessEnabled(
  env: { NODE_ENV?: string; SPARKLE_ENVIRONMENT?: string } = process.env,
) {
  return env.NODE_ENV === 'development' || env.SPARKLE_ENVIRONMENT === 'smoke'
}
