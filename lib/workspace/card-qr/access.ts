export const CARD_QR_WORKSPACE_SECTION = 'card-qr' as const

export const CARD_QR_ENTRY_TITLE = 'QR codes, QR flyers, business cards'

export const CARD_QR_ENTRY_ACTION = 'Open tool'

export const CARD_QR_HUB_BODY =
  'Build your site QR. Download a free QR code flyer, or order printed cards that match your site.'

/**
 * Same two-marker check as `lib/sparkle-suite/live-founder-availability`.
 * Kept local because this module ships in the Workspace client bundle, and
 * that file now reaches a `server-only` module (founder availability service).
 */
function isSuiteSmokeEnvironment(env: NodeJS.ProcessEnv) {
  return env.SPARKLE_ENVIRONMENT === 'smoke' && env.NEXT_PUBLIC_SPARKLE_ENVIRONMENT === 'smoke'
}

/**
 * Client gate. Next inlines only a direct `process.env.NEXT_PUBLIC_*` read.
 * Do not pass `process.env` into this function — that stays false in the browser.
 */
export function isCardQrToolEnabled() {
  return process.env.NEXT_PUBLIC_SPARKLE_ENVIRONMENT === 'smoke' || process.env.NEXT_PUBLIC_CARD_QR_ENABLED === 'true'
}

/** API and checkout require both Smoke markers, same as the rest of Suite Smoke. */
export function isCardQrSmokeRuntime(env: NodeJS.ProcessEnv = process.env) {
  return isSuiteSmokeEnvironment(env)
}

/** Server gate: always on Smoke; on Live only when CARD_QR_ENABLED=true (and the client flag for the UI). */
export function isCardQrServerEnabled(env: NodeJS.ProcessEnv = process.env) {
  return isSuiteSmokeEnvironment(env) || env.CARD_QR_ENABLED === 'true'
}

export type CardQrEnvironment = 'smoke' | 'live'

/**
 * Stripe mode for business cards. Smoke is always test-only. Live accepts livemode keys and
 * sessions only when CARD_QR_STRIPE_LIVE=true; otherwise Live is test-only too.
 */
export function cardQrStripeRuntime(env: NodeJS.ProcessEnv = process.env): { environment: CardQrEnvironment; allowLive: boolean } {
  const environment: CardQrEnvironment = isSuiteSmokeEnvironment(env) ? 'smoke' : 'live'
  return { environment, allowLive: environment === 'live' && env.CARD_QR_STRIPE_LIVE === 'true' }
}

export function isWorkspaceSectionVisible(section: { smokeOnly?: boolean }) {
  return section.smokeOnly !== true || isCardQrToolEnabled()
}
