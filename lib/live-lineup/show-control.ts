import type { LineupState, ParserState } from './types'
import { LIVE_LINEUP_RELEASE } from './release'

export const SHOW_IDLE_MS = 7_200_000
export const OPEN_LINEUP_HOLD_MS = SHOW_IDLE_MS
export const SHOW_CONNECTION_MS = 90_000
export const NO_SHARED_PARTY = 'Make sure you have an open party selected in the Live Lineup extension.'
export const STARTED_DISCONNECTED = "Show started, but your Live Lineup extension isn't connected."
export const STARTED_WAITING = 'Show started, waiting for your first order.'
export const SHOW_CHANGED_ELSEWHERE = 'Your show was changed from another screen.'

export type ShowAction = 'show-start' | 'show-stop'
export type ShowMode = 'auto' | 'started' | 'stopped'
export type ShowSelection = 'unknown' | 'none' | 'some'
export type ShowSourceStatus = ParserState | 'unavailable' | 'unknown'
export interface ShowControl {
  revision: number
  mode: ShowMode
  phase: 'active' | 'ended'
  selection: ShowSelection
  selectedPartyCount: number
  runId: string | null
  deadline: string | null
  actor: 'workspace' | 'extension' | 'auto'
  waitingForFirstOrder: boolean
}
export interface LineupExtensionStatus {
  connected: boolean
  lastSeenAt: string | null
  workerVersion: string | null
  readerVersion: string | null
  ackControlRevision: number | null
  sourceStatus: ShowSourceStatus
  latestPublishedVersion: string | null
  updateNeeded: boolean
}
export type ShowCommand = {type:ShowAction; requestId:string; expectedControlRevision:number}
export type ShowCommandReceipt = {requestId:string; action:ShowAction; revision:number; runId:string|null}

export const showVersion = (value: unknown): value is string =>
  typeof value === 'string' && /^[0-9]{1,5}(\.[0-9]{1,5}){1,3}$/.test(value)
export const showUuid = (value: unknown): value is string =>
  typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value)
export const showRevision = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
export const showTime = (value: unknown): value is string =>
  typeof value === 'string' && Number.isFinite(Date.parse(value))
export const showSourceStatus = (value: unknown): value is ShowSourceStatus =>
  typeof value === 'string' && ['ready','loading','partial','invalid','unavailable','unknown'].includes(value)
export const showAction = (value: unknown): value is ShowAction => value === 'show-start' || value === 'show-stop'
const showMode = (value: unknown): value is ShowMode => value === 'auto' || value === 'started' || value === 'stopped'
const actor = (value: unknown): value is ShowControl['actor'] => value === 'workspace' || value === 'extension' || value === 'auto'

export function compareShowVersions(left: string, right: string) {
  const a = left.split('.').map(Number), b = right.split('.').map(Number)
  for (let i=0; i<4; i++) {
    const delta = (a[i] ?? 0) - (b[i] ?? 0)
    if (delta) return Math.sign(delta)
  }
  return 0
}

export interface ControlRow {
  rep_id: string
  revision: number
  mode: ShowMode
  run_id: string | null
  idle_deadline_at: string | null
  run_ready_since: string | null
  run_generation: number | null
  run_lineup_revision?: number | null
  seen_order_ids?: string[]
  changed_by: ShowControl['actor']
  auto_check_new_parties: boolean
  last_extension_seen_at: string | null
  worker_version: string | null
  reader_version: string | null
  tab_present: boolean
  reader_responding: boolean
  source_status: ShowSourceStatus
  ack_control_revision: number | null
}

export const CONTROL_FIELDS = 'rep_id,revision,mode,run_id,idle_deadline_at,run_ready_since,run_generation,run_lineup_revision,seen_order_ids,changed_by,auto_check_new_parties,last_extension_seen_at,worker_version,reader_version,tab_present,reader_responding,source_status,ack_control_revision'
const normalizeRevision = (value: unknown): unknown =>
  typeof value === 'string' && /^[0-9]{1,16}$/.test(value) ? Number(value) : value
export function parseControlRow(value: unknown, repId: string): ControlRow | null {
  if (!value || typeof value !== 'object') return null
  const row = {...value} as Record<string,unknown>
  for (const key of ['revision','run_generation','run_lineup_revision','ack_control_revision']) row[key] = normalizeRevision(row[key])
  if (row.rep_id !== repId || !showRevision(row.revision) || !showMode(row.mode) || !actor(row.changed_by)
    || !(row.run_id === null || showUuid(row.run_id))
    || !(row.run_generation === null || showRevision(row.run_generation))
    || !(row.run_lineup_revision === null || showRevision(row.run_lineup_revision))
    || !Array.isArray(row.seen_order_ids) || row.seen_order_ids.length > 12000
    || row.seen_order_ids.some(id=>typeof id !== 'string' || id.length > 128)
    || !(row.ack_control_revision === null || showRevision(row.ack_control_revision) && row.ack_control_revision <= row.revision)
    || ![row.idle_deadline_at,row.run_ready_since,row.last_extension_seen_at].every(time=>time === null || showTime(time))
    || ![row.worker_version,row.reader_version].every(version=>version === null || showVersion(version))
    || typeof row.auto_check_new_parties !== 'boolean' || typeof row.tab_present !== 'boolean'
    || typeof row.reader_responding !== 'boolean' || row.reader_responding && !row.tab_present
    || !showSourceStatus(row.source_status)) return null
  return row as unknown as ControlRow
}

export function projectShowControl(row: ControlRow | null, state: LineupState | null, now: number) {
  const parties = state?.show?.partyIds ?? [], exclusions = new Set(state?.show?.excludedPartyIds ?? [])
  const selectedPartyCount = parties.filter(id=>!exclusions.has(id)).length
  const selection: ShowSelection = selectedPartyCount ? 'some' : parties.length ? 'none' : 'unknown'
  const lastSeenAt = row?.last_extension_seen_at ?? state?.lastReceivedAt ?? null
  const age = lastSeenAt ? now - Date.parse(lastSeenAt) : Infinity
  const connected = age >= 0 && age <= SHOW_CONNECTION_MS && (row?.worker_version
    ? row.tab_present && row.reader_responding
    : Boolean(state?.lastReceivedAt))
  const workerVersion = row?.worker_version ?? (showVersion(state?.sourceVersion) ? state.sourceVersion : null)
  const publishedAt = LIVE_LINEUP_RELEASE.publishedAt
  const latestPublishedVersion = LIVE_LINEUP_RELEASE.rolloutEnabled && publishedAt && Date.parse(publishedAt) <= now
    ? LIVE_LINEUP_RELEASE.version : null
  const legacyLastReady = state?.lastReadySourceAt ?? state?.lastReadyAt ?? null
  const legacyDeadline = legacyLastReady === null ? null : new Date(Date.parse(legacyLastReady) + OPEN_LINEUP_HOLD_MS).toISOString()
  const managed = !!row && (row.revision > 0 || !!row.run_id || row.mode !== 'auto')
  const deadline = managed ? row.idle_deadline_at : legacyDeadline
  const expired = deadline === null || now >= Date.parse(deadline)
  const waiting = managed && row.mode === 'started' && selection === 'unknown' && row.auto_check_new_parties && !expired
  const legacyConfigured = !state?.bootstrapPending && (!!state?.show || !state?.entries.length)
  const running = managed
    ? row.mode !== 'stopped' && !!row.run_id && !expired && (selection === 'some' || waiting)
    : Boolean(legacyLastReady && legacyConfigured && !expired && selection !== 'none')
  const showControl: ShowControl = {
    revision: row?.revision ?? 0,
    mode: managed && expired && row.mode === 'started' ? 'stopped' : row?.mode ?? 'auto',
    phase: running ? 'active' : 'ended', selection, selectedPartyCount,
    runId: row?.run_id ?? null, deadline, actor: row?.changed_by ?? 'auto',
    waitingForFirstOrder: Boolean(waiting),
  }
  const extensionStatus: LineupExtensionStatus = { connected,lastSeenAt,workerVersion,
    readerVersion:row?.reader_version ?? state?.diagnostics?.readerVersion ?? null,
    ackControlRevision:row?.ack_control_revision ?? null,
    sourceStatus:row?.source_status ?? state?.parserState ?? 'unknown',
    latestPublishedVersion,updateNeeded:Boolean(workerVersion && latestPublishedVersion && compareShowVersions(workerVersion,latestPublishedVersion) < 0),
  }
  const allowRows = running && (!managed || Boolean(row?.run_ready_since && state?.lastReadyAt
    && row.run_generation === (state.show?.generation ?? 0) && state.revision >= (row.run_lineup_revision ?? 0)))
  return {showControl,extensionStatus,allowRows}
}

export function isShowControl(value: unknown): value is ShowControl {
  if (!value || typeof value !== 'object') return false
  const c = value as Partial<ShowControl>
  return showRevision(c.revision) && showMode(c.mode) && (c.phase === 'active' || c.phase === 'ended')
    && (c.selection === 'unknown' || c.selection === 'none' || c.selection === 'some')
    && showRevision(c.selectedPartyCount) && c.selectedPartyCount <= 100 && (c.selection === 'some') === (c.selectedPartyCount > 0)
    && (c.runId === null || showUuid(c.runId)) && (c.deadline === null || showTime(c.deadline)) && actor(c.actor)
    && typeof c.waitingForFirstOrder === 'boolean'
}

export function isLineupExtensionStatus(value: unknown): value is LineupExtensionStatus {
  if (!value || typeof value !== 'object') return false
  const c = value as Partial<LineupExtensionStatus>
  return typeof c.connected === 'boolean' && (c.lastSeenAt === null || showTime(c.lastSeenAt))
    && [c.workerVersion,c.readerVersion,c.latestPublishedVersion].every(version=>version === null || showVersion(version))
    && (c.ackControlRevision === null || showRevision(c.ackControlRevision))
    && showSourceStatus(c.sourceStatus) && typeof c.updateNeeded === 'boolean'
}
