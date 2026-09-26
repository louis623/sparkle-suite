import type { ArchiveRecoveryRequest, LineupArchiveSummary } from '@/lib/live-lineup/archive-recovery'
import type { WorkspaceLineupEntry, WorkspaceLineupSnapshot } from '@/lib/live-lineup/types'
import { canConfirmShow, canRecoverLineup, isWorkspaceLineupSnapshot } from './live-lineup-client'

export type ArchiveDetail = LineupArchiveSummary & { candidates: WorkspaceLineupEntry[] }
export type ArchivePage = { archives: LineupArchiveSummary[]; nextBeforeGeneration: number | null }
const integer = (value: unknown, min = 0): value is number => Number.isSafeInteger(value) && (value as number) >= min
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
function isSummary(value: unknown): value is LineupArchiveSummary {
  if (!value || typeof value !== 'object') return false
  const a = value as LineupArchiveSummary
  return integer(a.generation) && integer(a.revision, 1) && typeof a.archivedAt === 'string' && Number.isFinite(Date.parse(a.archivedAt))
    && integer(a.waitingCount) && integer(a.heldCount) && a.waitingCount + a.heldCount <= 2000
    && Array.isArray(a.partyIds) && a.partyIds.length <= 100 && new Set(a.partyIds).size === a.partyIds.length
    && a.partyIds.every(id => typeof id === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,60}$/.test(id))
}
export function isArchivePage(value: unknown, beforeGeneration?: number): value is ArchivePage {
  if (!value || typeof value !== 'object') return false
  const p = value as ArchivePage
  return Array.isArray(p.archives) && p.archives.length <= 20 && p.archives.every(isSummary)
    && p.archives.every((a, i) => (beforeGeneration === undefined || a.generation < beforeGeneration) && (!i || a.generation < p.archives[i-1].generation))
    && (p.nextBeforeGeneration === null || (p.archives.length > 0 && integer(p.nextBeforeGeneration)
      && p.nextBeforeGeneration === p.archives.at(-1)!.generation && p.nextBeforeGeneration > 0))
}
export function isArchiveDetail(value: unknown, summary: LineupArchiveSummary): value is ArchiveDetail {
  if (!isSummary(value)) return false
  const a = value as ArchiveDetail
  if (!['generation','revision','archivedAt','partyIds','waitingCount','heldCount'].every(key => same(a[key as keyof LineupArchiveSummary], summary[key as keyof LineupArchiveSummary]))
    || !Array.isArray(a.candidates) || a.candidates.length !== a.waitingCount + a.heldCount) return false
  const seen = new Set<string>()
  return a.candidates.every((e, i) => {
    if (!e || typeof e.id !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9:_-]{0,127}$/.test(e.id) || seen.has(e.id)
      || typeof e.name !== 'string' || !e.name.trim() || e.name !== e.name.trim() || e.name.length > 100 || /[\u0000-\u001f\u007f]/.test(e.name)
      || (a.generation > 0 && (!e.id.includes(':') || !a.partyIds.includes(e.id.split(':')[0])))
      || e.held !== (i >= a.waitingCount) || e.position !== (i < a.waitingCount ? i + 1 : i - a.waitingCount + 1)) return false
    seen.add(e.id); return true
  })
}
export function recoveryIneligibleReason(current: WorkspaceLineupSnapshot, archive: ArchiveDetail, entryId: string): string | null {
  const m = current.management
  if (!canRecoverLineup(current) || !m || m.generation < 1 || archive.generation >= m.generation) return 'Start a newer scoped show first.'
  if (!entryId.includes(':') || !m.partyIds.includes(entryId.split(':')[0])) return 'Outside the current show’s parties.'
  if (m.candidates.some(entry => entry.id === entryId)) return 'Already in the current lineup or Hold.'
  return null
}
export function archiveRecoveryRequest(preview: WorkspaceLineupSnapshot, current: WorkspaceLineupSnapshot, archive: ArchiveDetail,
  entryIds: string[], confirmed: boolean): ArchiveRecoveryRequest | null {
  if (!confirmed || !canConfirmShow(preview, current) || !entryIds.length || new Set(entryIds).size !== entryIds.length
    || entryIds.length + (current.management?.candidates.length ?? 0) > 2000) return null
  const available = new Set(archive.candidates.map(entry => entry.id))
  if (entryIds.some(id => !available.has(id) || recoveryIneligibleReason(current, archive, id))) return null
  return { archiveGeneration: archive.generation, archiveRevision: archive.revision, expectedRevision: current.revision, entryIds: [...entryIds], confirmed: true }
}
export function isArchiveRecoveryAcknowledgement(before: WorkspaceLineupSnapshot, next: unknown, archive: ArchiveDetail,
  request: ArchiveRecoveryRequest): next is WorkspaceLineupSnapshot {
  if (!isWorkspaceLineupSnapshot(next) || next.tenantContext !== before.tenantContext || !before.management || !next.management
    || request.expectedRevision !== before.revision || next.revision !== before.revision + 1
    || next.management.generation !== before.management.generation + 1 || next.undoAvailable
    || next.lastReceivedAt !== null || next.sourceVersion !== null || next.connection !== 'offline'
    || next.lastChangedAt === null || (before.lastChangedAt !== null && Date.parse(next.lastChangedAt) < Date.parse(before.lastChangedAt))
    || !same(next.management.partyIds, before.management.partyIds) || !same(next.management.excludedPartyIds, before.management.excludedPartyIds)
    || !archiveRecoveryRequest(before, before, archive, request.entryIds, request.confirmed)
    || request.archiveGeneration !== archive.generation || request.archiveRevision !== archive.revision) return false
  const selected = new Set(request.entryIds)
  const heldCount = before.management.candidates.filter(entry => entry.held).length
  const added = archive.candidates.filter(entry => selected.has(entry.id)).map((entry, i) => ({ ...entry, held: true, position: heldCount + i + 1 }))
  const candidates = [...before.management.candidates, ...added].map(entry => ({id:entry.id,name:entry.name,position:entry.position,held:entry.held}))
  const visible = candidates.filter(entry => !before.management!.excludedPartyIds.includes(entry.id.split(':')[0]))
  const project = (held: boolean) => visible.filter(entry => entry.held === held).map((entry, i) => ({...entry, position: i + 1}))
  return same(next.management.candidates, candidates) && same(next.entries, project(false)) && same(next.heldEntries, project(true))
}
