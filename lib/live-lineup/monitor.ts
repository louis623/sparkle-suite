import { createHash } from 'node:crypto'
import { parseParserStructure, isLineupState, lineupFreshness } from './model'
import type { LineupState } from './types'

export const MONITOR_FAILURE_MS = 180_000
export const MONITOR_CONTACT_MS = 90_000
export const MONITOR_SAMPLE_GAP_MS = 90_000
export const MONITOR_OWNER_EMAIL = 'louis@neonrabbit.net'
export type MonitorHealth = 'healthy' | 'unhealthy' | 'unknown'
export type MonitorFacts = {
  repId: string; slug: string; health: MonitorHealth; reason: string;
  revision: number | null; receivedAt: string | null; lastReadyAt: string | null;
  workerVersion: string | null; readerVersion: string | null;
  structureHash: string | null; lastGoodStructureHash: string | null;
  publicVerification: 'not_checked' | 'matched' | 'mismatch' | 'unknown';
}
export type MonitorState = {
  observedAt: string; lastReadyAt: string | null; lastReceivedAt: string | null;
  sourceRevision: number | null; unhealthySince: string | null;
  lastGoodStructureHash?: string | null; recoveringIncidentId?: string | null; reason?: string;
  recoveryStreak: number; incidentId: string | null; health: MonitorHealth;
}
export type MonitorEvent = {kind: 'incident' | 'recovery'; incidentId: string}
const version = (v: unknown): v is string => typeof v === 'string' && /^\d{1,5}(?:\.\d{1,5}){1,3}$/.test(v)
const epoch = (v: string | null | undefined) => v ? Date.parse(v) : NaN
const iso = (n: number) => new Date(n).toISOString()

/** Explicit safe projection: never persist/order/email the private source JSON. */
export function monitorFacts(repId: string, slug: string, raw: unknown, now: number): MonitorFacts {
  const state: LineupState | null = isLineupState(raw) ? raw : null
  const received = epoch(state?.lastReceivedAt)
  const contactFresh = Number.isFinite(received) && received <= now && now - received < MONITOR_CONTACT_MS
  const diagnostics = state?.diagnostics
  const workerVersion = state && version(state.sourceVersion) ? state.sourceVersion : null
  const readerVersion = diagnostics && version(diagnostics.readerVersion) ? diagnostics.readerVersion : null
  const mismatch = Boolean(diagnostics && diagnostics.receivedAt === state?.lastReceivedAt
    && diagnostics.sourceVersion === workerVersion && readerVersion !== workerVersion)
  const health: MonitorHealth = !state || !contactFresh ? 'unknown'
    : !mismatch && lineupFreshness(state, now).fresh ? 'healthy' : 'unhealthy'
  return {repId, slug: /^[a-z0-9-]{1,100}$/.test(slug) ? slug : repId,
    health, reason: !state ? 'state_unavailable' : !contactFresh ? 'feed_unverified'
      : mismatch ? 'reader_version_mismatch' : state.parserReason ?? (health === 'healthy' ? 'ready' : 'source_not_ready'),
    revision: state?.revision ?? null, receivedAt: state?.lastReceivedAt ?? null,
    lastReadyAt: state?.lastReadyAt ?? null, workerVersion, readerVersion,
    structureHash: diagnostics?.receivedAt === state?.lastReceivedAt && diagnostics?.sourceVersion === workerVersion ? structureSignature(diagnostics?.structure) : null, lastGoodStructureHash: null, publicVerification: 'not_checked'}
}

/** A scheduler gap/silence never counts as three minutes of confirmed bad reads. */
export function advanceMonitor(previous: MonitorState | null, facts: MonitorFacts, now: number, newIncidentId: string) {
  const recentSample = previous && now >= epoch(previous.observedAt) && now - epoch(previous.observedAt) <= MONITOR_SAMPLE_GAP_MS
  const newReceipt = !previous || facts.receivedAt !== previous.lastReceivedAt && facts.revision !== previous.sourceRevision
  const goodReadSinceSample = Boolean(previous && facts.lastReadyAt && facts.lastReadyAt !== previous.lastReadyAt)
  const continuation = recentSample && previous.health === 'unhealthy'
    && (facts.reason === 'public_feed_mismatch' && previous.reason === 'public_feed_mismatch' || !goodReadSinceSample)
  let unhealthySince = facts.health === 'unhealthy' ? (continuation ? previous.unhealthySince : null) ?? iso(now) : null
  if (unhealthySince && epoch(unhealthySince) > now) unhealthySince = iso(now)
  const recoveryStreak = facts.health === 'healthy'
    ? (recentSample && previous.health === 'healthy' ? previous.recoveryStreak : 0) + (newReceipt ? 1 : 0) : 0
  let incidentId = previous?.incidentId ?? null
  let recoveringIncidentId = previous?.recoveringIncidentId ?? null
  let event: MonitorEvent | null = null
  if (facts.health === 'unhealthy' && unhealthySince && now - epoch(unhealthySince) >= MONITOR_FAILURE_MS && !incidentId) {
    incidentId = newIncidentId
    recoveringIncidentId = null
    event = {kind: 'incident', incidentId}
  } else if (facts.health === 'healthy' && recoveryStreak >= 2 && (incidentId || recoveringIncidentId)) {
    event = {kind: 'recovery', incidentId: (incidentId || recoveringIncidentId)!}
    incidentId = null
    recoveringIncidentId = null
  }
  const state: MonitorState = {observedAt: iso(now), lastReadyAt: facts.lastReadyAt, lastReceivedAt: facts.receivedAt,
    sourceRevision: facts.revision, unhealthySince, recoveringIncidentId, reason: facts.reason,
    lastGoodStructureHash: facts.health === 'healthy' && facts.structureHash ? facts.structureHash : previous?.lastGoodStructureHash ?? null, recoveryStreak: Math.min(2, recoveryStreak), incidentId, health: facts.health}
  return {state, event}
}

export function incidentStillSendable(state: MonitorState | null, facts: MonitorFacts, incidentId: string, now: number) {
  return Boolean(state && state.incidentId === incidentId && state.health === 'unhealthy' && facts.health === 'unhealthy'
    && (state.reason === 'public_feed_mismatch' && facts.reason === 'public_feed_mismatch' || state.lastReadyAt === facts.lastReadyAt) && state.unhealthySince && now - epoch(state.unhealthySince) >= MONITOR_FAILURE_MS
    && now >= epoch(state.observedAt) && now - epoch(state.observedAt) <= MONITOR_SAMPLE_GAP_MS)
}

export type ReleaseDescriptor = {protocol: number; version: string; publishedAt: string | null; rolloutEnabled: boolean}
export function adoptionDue(release: ReleaseDescriptor, now: number) {
  return release.protocol === 1 && release.rolloutEnabled && version(release.version)
    && Number.isFinite(epoch(release.publishedAt)) && now - epoch(release.publishedAt) >= 86_400_000
}
function compareVersion(a: string, b: string) {
  const x = a.split('.').map(Number), y = b.split('.').map(Number)
  for (let i = 0; i < Math.max(x.length, y.length); i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) - (y[i] ?? 0)
  return 0
}
export function classifyAdoption(facts: MonitorFacts, release: ReleaseDescriptor, now: number): 'updated' | 'older' | 'unknown' {
  const receipt = epoch(facts.receivedAt), published = epoch(release.publishedAt)
  if (!release.rolloutEnabled || !version(release.version) || !Number.isFinite(published) || !Number.isFinite(receipt)
    || receipt < published || receipt > now || !facts.workerVersion) return 'unknown'
  if (compareVersion(facts.workerVersion, release.version) < 0) return now - receipt <= 300_000 ? 'older' : 'unknown'
  return facts.readerVersion === facts.workerVersion ? 'updated' : 'unknown'
}

/** Hash only the validated structural contract; row counts change normally and are excluded. */
export function structureSignature(raw: unknown): string | null {
  const structure = parseParserStructure(raw)
  if (!structure) return null
  return createHash('sha256').update(JSON.stringify({version:structure.version,columns:structure.columns,
    bodyCount:structure.bodyCount,hasOrderIdAttribute:structure.hasOrderIdAttribute,
    hasPartyIdAttribute:structure.hasPartyIdAttribute,hasOrderTimeAttribute:structure.hasOrderTimeAttribute})).digest('hex')
}
export function groupChangedStructures(facts: MonitorFacts[]) {
  const groups = new Map<string,{reason:string;structureHash:string;affectedReps:string[]}>()
  for (const fact of facts) {
    if (fact.health !== 'unhealthy' || !fact.structureHash || !fact.lastGoodStructureHash || fact.structureHash === fact.lastGoodStructureHash) continue
    const key = fact.reason + ':' + fact.structureHash
    const group = groups.get(key) ?? {reason:fact.reason,structureHash:fact.structureHash,affectedReps:[]}
    group.affectedReps.push(fact.repId); groups.set(key,group)
  }
  return [...groups.values()].filter(group => group.affectedReps.length >= 2)
}

export type MonitorShowWindow = {event_time: string; duration_minutes: number | null}
/** Scheduled time is expectation, never proof that the rep is broadcasting. */
export function applyExpectedShow(facts: MonitorFacts, windows: MonitorShowWindow[], now: number): MonitorFacts {
  if (facts.health !== 'unknown' || facts.reason !== 'feed_unverified' || !facts.receivedAt) return facts
  const contact = Date.parse(facts.receivedAt)
  const expected = windows.some(window => {
    const start = Date.parse(window.event_time), duration = window.duration_minutes
    return Number.isFinite(start) && Number.isInteger(duration) && duration! > 0 && duration! <= 1440
      && now >= start && now < start + duration! * 60_000 && contact >= start && contact <= now
      && now - contact >= MONITOR_CONTACT_MS
  })
  return expected ? {...facts, health:'unhealthy', reason:'feed_stopped_show_unverified'} : facts
}
