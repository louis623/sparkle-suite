import type { LineupSetupReadiness } from '@/lib/live-lineup/setup-readiness'
const reasons = new Set(['ready','invalid_tenant','clock_invalid','schema_unavailable','unavailable','not_initialized',
  'invalid_state','tenant_mismatch','awaiting_ready','source_not_ready','stale','lease_expired','publisher_unavailable',
  'publisher_revoked','publisher_expired','state_changed'])
export function isLineupSetupReadiness(value: unknown): value is LineupSetupReadiness {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const r = value as LineupSetupReadiness
  const timestamp = (v: unknown) => typeof v === 'string' && Number.isFinite(Date.parse(v))
  const integer = (v: unknown) => Number.isSafeInteger(v) && (v as number) >= 0
  return r.protocol === 2 && typeof r.ready === 'boolean' && reasons.has(r.reason) && r.ready === (r.reason === 'ready')
    && (r.checkedAt === null || timestamp(r.checkedAt)) && (r.lastReadyAt === null || timestamp(r.lastReadyAt))
    && (r.generation === null || integer(r.generation)) && (r.revision === null || integer(r.revision))
    && (!r.ready || (timestamp(r.checkedAt) && timestamp(r.lastReadyAt) && integer(r.generation) && integer(r.revision)
      && Date.parse(r.checkedAt!) >= Date.parse(r.lastReadyAt!) && Date.parse(r.checkedAt!) - Date.parse(r.lastReadyAt!) <= 45_000))
}
export function readinessHelp(reason: LineupSetupReadiness['reason']): string {
  if (reason === 'publisher_revoked' || reason === 'publisher_expired') return 'Reconnect the extension with the assigned Live Queue code shown in your Workspace.'
  if (reason === 'stale' || reason === 'lease_expired') return 'Updates are not current. Keep the selected Bomb Party Party Orders tab open and check the extension, then verify again.'
  if (reason === 'state_changed') return 'The source changed during verification. Please verify again.'
  if (reason === 'not_initialized' || reason === 'awaiting_ready' || reason === 'source_not_ready' || reason === 'publisher_unavailable') return 'No ready source verified yet. Enter the assigned Live Queue code in the extension, select your Party Orders tab and show, then verify again.'
  return 'The connection could not be verified. Try again or ask Nic-Nac for support. Your existing lineup is unchanged.'
}
