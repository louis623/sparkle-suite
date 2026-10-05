import { isSuiteSmokeEnvironment } from '@/lib/sparkle-suite/live-founder-availability'

export const CARD_QR_WORKSPACE_SECTION = 'card-qr' as const

/**
 * Workspace UI can only see the public marker. Smoke deploys set both markers.
 * Live leaves them unset, so the tool stays out of Tools.
 */
export function isCardQrToolEnabled(env: NodeJS.ProcessEnv = process.env) {
  return env.NEXT_PUBLIC_SPARKLE_ENVIRONMENT === 'smoke'
}

/** API and checkout require both Smoke markers, same as the rest of Suite Smoke. */
export function isCardQrSmokeRuntime(env: NodeJS.ProcessEnv = process.env) {
  return isSuiteSmokeEnvironment(env)
}

export function isWorkspaceSectionVisible(
  section: { smokeOnly?: boolean },
  env: NodeJS.ProcessEnv = process.env,
) {
  return section.smokeOnly !== true || isCardQrToolEnabled(env)
}
