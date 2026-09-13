export type ReviewerSmokeState =
  | 'checkout_required'
  | 'required_setup'
  | 'dashboard_unlocked'

export const REVIEWER_SMOKE_NEXT_PATHS: Record<ReviewerSmokeState, string> = {
  checkout_required: '/nic-nac?onboarding=checkout-required',
  required_setup: '/nic-nac?onboarding=required-setup',
  dashboard_unlocked: '/nic-nac',
}

export function reviewerSmokeModeEnabled(env: NodeJS.ProcessEnv = process.env) {
  const flag = env.SPARKLE_REVIEWER_SMOKE_MODE?.trim().toLowerCase()
  if (flag !== 'true' && flag !== '1') return false
  return getReviewerSmokeToken(env).length >= 12
}

export function workspaceReviewAccessEnabled(env: NodeJS.ProcessEnv = process.env) {
  return env.VERCEL_ENV !== 'production'
}

export function getReviewerSmokeToken(env: NodeJS.ProcessEnv = process.env) {
  return env.SPARKLE_REVIEWER_SMOKE_TOKEN?.trim() ?? ''
}

export function isReviewerSmokeTokenValid(
  token: unknown,
  env: NodeJS.ProcessEnv = process.env,
) {
  const expected = getReviewerSmokeToken(env)
  if (!reviewerSmokeModeEnabled(env)) return false

  const received = typeof token === 'string' ? token.trim() : ''
  return expected.length >= 12 && received === expected
}

export function reviewerSmokeControlsVisible(
  token: unknown,
  env: NodeJS.ProcessEnv = process.env,
) {
  if (!reviewerSmokeModeEnabled(env)) return false
  return isReviewerSmokeTokenValid(token, env)
}

export function getReviewerSmokeDiagnostics(
  token: unknown,
  env: NodeJS.ProcessEnv = process.env,
) {
  const expected = getReviewerSmokeToken(env)
  const received = typeof token === 'string' ? token.trim() : ''
  return {
    enabled: reviewerSmokeModeEnabled(env),
    modeFlag: env.SPARKLE_REVIEWER_SMOKE_MODE?.trim().toLowerCase() ?? null,
    nodeEnv: env.NODE_ENV ?? null,
    vercelEnv: env.VERCEL_ENV ?? null,
    expectedTokenLength: expected.length,
    receivedTokenLength: received.length,
    tokenMatches: expected.length >= 12 && received === expected,
  }
}

export function getReviewerSmokePersona(env: NodeJS.ProcessEnv = process.env) {
  return {
    displayName:
      env.SPARKLE_REVIEWER_SMOKE_DISPLAY_NAME?.trim() || 'Britt Test Rep',
    email:
      env.SPARKLE_REVIEWER_SMOKE_EMAIL?.trim().toLowerCase() ||
      'sparkle-reviewer+preview@neonrabbit.net',
    password:
      env.SPARKLE_REVIEWER_SMOKE_PASSWORD?.trim() ||
      'SparkleReviewer2026!',
  }
}

export function normalizeReviewerSmokeState(value: unknown): ReviewerSmokeState {
  return value === 'required_setup' || value === 'dashboard_unlocked'
    ? value
    : 'checkout_required'
}
