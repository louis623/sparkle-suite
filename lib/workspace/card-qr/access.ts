import { isSuiteSmokeEnvironment } from '@/lib/sparkle-suite/live-founder-availability'

export const CARD_QR_WORKSPACE_SECTION = 'card-qr' as const

/**
 * Client gate. Next inlines only a direct `process.env.NEXT_PUBLIC_*` read.
 * Do not pass `process.env` into this function — that stays false in the browser.
 */
export function isCardQrToolEnabled() {
  return process.env.NEXT_PUBLIC_SPARKLE_ENVIRONMENT === 'smoke'
}

/** API and checkout require both Smoke markers, same as the rest of Suite Smoke. */
export function isCardQrSmokeRuntime(env: NodeJS.ProcessEnv = process.env) {
  return isSuiteSmokeEnvironment(env)
}

export function isWorkspaceSectionVisible(section: { smokeOnly?: boolean }) {
  return section.smokeOnly !== true || isCardQrToolEnabled()
}
