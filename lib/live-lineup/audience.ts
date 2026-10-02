import type { WorkspaceLineupEntry, WorkspaceLineupSnapshot } from './types'

/** Longest stored preference is favorite collection (160). Chips must accept that length. */
export const LINEUP_PREFERENCE_MAX = 160
const BIRTHDAY_DAYS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

export function sanitizeLineupPreference(value: unknown): string {
  if (typeof value !== 'string') return ''
  return Array.from(value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/gu, ' ').trim()).slice(0, LINEUP_PREFERENCE_MAX).join('')
}

export function sanitizeLineupLabel(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const text = Array.from(value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/gu, ' ').trim()).slice(0, 80).join('')
  return text || null
}

/** Month/day without a year. Invalid or impossible dates become empty so one bad row cannot drop every chip. */
export function sanitizeLineupBirthday(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const match = /^(?:[1-9]|1[0-2])\/(?:[1-9]|[12]\d|3[01])$/.exec(value)
  if (!match) return null
  const [monthText, dayText] = value.split('/')
  const month = Number(monthText)
  const day = Number(dayText)
  return day <= BIRTHDAY_DAYS[month - 1] ? `${month}/${day}` : null
}

export interface LineupAudienceMatch {
  status?: 'matched' | 'needs_clarification' | 'unavailable'
  audienceId?: string | null
  label?: string | null
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
    [...snapshot.entries, ...snapshot.heldEntries].map(e => [e.id, e.name, e.lastName, e.identityEligible, e.sourceIdentityVersion])])
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
    || !Array.isArray(result.matches) || result.matches.length > snapshot.entries.length + snapshot.heldEntries.length) return false
  const entries = new Map([...snapshot.entries, ...snapshot.heldEntries].map(e => [e.id, e]))
  const seen = new Set<string>()
  return result.matches.every(match => {
    const entry = entries.get(match?.id)
    if (!entry || seen.has(match.id) || !eligibleAudienceIdentity(entry) || match.sourceIdentityVersion !== entry.sourceIdentityVersion
      || !(match.birthday === null || (typeof match.birthday === 'string' && /^(?:[1-9]|1[0-2])\/(?:[1-9]|[12]\d|3[01])$/.test(match.birthday)))
      || !Array.isArray(match.preferences) || match.preferences.length > 4
      || match.preferences.some(text => typeof text !== 'string' || !text || text.length > LINEUP_PREFERENCE_MAX || /[\u0000-\u001f\u007f]/.test(text))) return false
    if (match.status !== undefined && (!['matched','needs_clarification','unavailable'].includes(match.status)
      || (match.status === 'matched' ? typeof match.audienceId !== 'string' : match.audienceId !== null || match.birthday !== null || match.preferences.length !== 0)
      || !(match.label == null || typeof match.label === 'string' && match.label.length <= 80))) return false
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
