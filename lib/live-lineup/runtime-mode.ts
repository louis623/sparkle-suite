import 'server-only'

export const LIVE_LINEUP_MODE_ENV = 'SPARKLE_LIVE_LINEUP_MODE'

export type LiveLineupRuntimeMode = 'active' | 'read_only'

/**
 * Fail closed for every configured value except the documented active mode.
 * An absent variable preserves the normal release behavior.
 */
export function getLiveLineupRuntimeMode(
  value: string | undefined = process.env[LIVE_LINEUP_MODE_ENV],
): LiveLineupRuntimeMode {
  return value === undefined || value === 'active' ? 'active' : 'read_only'
}

export function liveLineupOwnerMutationsAvailable(
  value?: string,
) {
  return getLiveLineupRuntimeMode(value) === 'active'
}
