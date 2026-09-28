import type { WorkspaceLineupEntry, WorkspaceLineupSnapshot } from './types'

export interface LineupAudienceMatch {
  id: string
  sourceIdentityVersion: string
  birthday: string | null
  preferences: string[]
}
export interface LineupAudienceResult {
  tenantContext: string
  generation: number
  audienceVersion: string
  matches: LineupAudienceMatch[]
}
export function lineupIdentityContext(snapshot: WorkspaceLineupSnapshot): string {
  return JSON.stringify([snapshot.tenantContext, snapshot.management?.generation,
    snapshot.entries.map(e => [e.id, e.name, e.lastName, e.identityEligible, e.sourceIdentityVersion])])
}
export function eligibleAudienceIdentity(entry: WorkspaceLineupEntry): boolean {
  return entry.identityEligible === true && !!entry.lastName?.trim() && !!entry.sourceIdentityVersion
}
/** Exactly the fields needed by private Workspace chips; no broad contact response. */
export function isLineupAudienceResult(value: unknown, snapshot: WorkspaceLineupSnapshot): value is LineupAudienceResult {
  if (!value || typeof value !== 'object') return false
  const result = value as LineupAudienceResult
  if (result.tenantContext !== snapshot.tenantContext || result.generation !== snapshot.management?.generation
    || typeof result.audienceVersion !== 'string' || !/^\d{1,19}$/.test(result.audienceVersion)
    || !Array.isArray(result.matches) || result.matches.length > snapshot.entries.length) return false
  const entries = new Map(snapshot.entries.map(e => [e.id, e]))
  const seen = new Set<string>()
  return result.matches.every(match => {
    const entry = entries.get(match?.id)
    if (!entry || seen.has(match.id) || !eligibleAudienceIdentity(entry) || match.sourceIdentityVersion !== entry.sourceIdentityVersion
      || !(match.birthday === null || (typeof match.birthday === 'string' && /^(?:[1-9]|1[0-2])\/(?:[1-9]|[12]\d|3[01])$/.test(match.birthday)))
      || !Array.isArray(match.preferences) || match.preferences.length > 4
      || match.preferences.some(text => typeof text !== 'string' || !text || text.length > 100 || /[\u0000-\u001f\u007f]/.test(text))) return false
    seen.add(match.id); return true
  })
}

/** An edit invalidates in-flight work synchronously, before its replacement query begins. */
export function isCurrentLineupAudienceResult(value: unknown, snapshot: WorkspaceLineupSnapshot, fence: {
  requestEpoch: number; currentEpoch: number; requestContext: string; currentContext: string; minimumVersion: string
}): value is LineupAudienceResult {
  return fence.requestEpoch === fence.currentEpoch && fence.requestContext === fence.currentContext
    && isLineupAudienceResult(value, snapshot) && /^\d{1,19}$/.test(fence.minimumVersion)
    && BigInt(value.audienceVersion) >= BigInt(fence.minimumVersion)
}
