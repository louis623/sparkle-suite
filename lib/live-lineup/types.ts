/** Private v2 state. Never serialize publisher identity, order IDs, or undo to a public site. */
export type ParserState = 'ready' | 'loading' | 'partial' | 'invalid'
export type LineupConnection = 'connecting' | 'connected' | 'delayed' | 'offline'
export interface SourceEntry { id: string; name: string; orderedAt: number | null }
export interface PublisherLease { id: string; claimId: string; epoch: number; leaseExpiresAt: string; lastSequence: number }
export interface LineupShow { generation: number; partyIds: string[]; excludedPartyIds: string[]; carryEntryIds: string[]; startedAt: string }
/** Token-authenticated worker setup only. No customer names or publisher credentials. */
export interface SourceDescriptor {
  protocol: 2
  generation: number
  scope: { partyIds: string[]; excludedPartyIds: string[]; startedAt: string; carryEntryIds: string[] } | null
  serverTime: string
}
export interface LineupState {
  schemaVersion: 2
  revision: number
  show: LineupShow | null
  entries: SourceEntry[]
  order: string[]
  held: string[]
  revealedIds: string[]
  undo: { order: string[]; held: string[] } | null
  publisher: PublisherLease | null
  lastReceivedAt: string | null
  /** Last authoritative ready snapshot, not a parser/loading heartbeat. Preserved across publisher claims. */
  lastReadyAt: string | null
  lastChangedAt: string | null
  parserState: ParserState
  sourceVersion: string | null
}
export interface SourcePacket {
  /** Unscoped prototype packets are generation zero only; never accepted into a later show. */
  generation?: number
  publisherId: string
  epoch: number
  sequence: number
  sourceVersion: string
  parserState: ParserState
  entries: SourceEntry[]
  /** Explicitly observed revealed orders. Absence from a filtered table is NOT removal. */
  revealedIds: string[]
  /** Scoped shows need order dates even for revelations, to exclude historical rows safely. */
  revealedEntries?: Pick<SourceEntry, 'id' | 'orderedAt'>[]
}
export type LineupCommand = { expectedRevision: number } & (
  | { type: 'move'; entryId: string; beforeEntryId: string | null }
  | { type: 'hold' | 'return' | 'reveal-next'; entryId: string }
  | { type: 'undo' }
  | { type: 'start-show'; partyIds: string[]; carryEntryIds: string[]; confirmed: true }
  | { type: 'filter-parties'; excludedPartyIds: string[] }
)
export type LineupError = 'invalid_payload' | 'invalid_time' | 'revision_conflict' | 'publisher_conflict'
  | 'lease_expired' | 'stale_sequence' | 'capacity_exceeded' | 'entry_not_found' | 'invalid_move' | 'nothing_to_undo' | 'show_changed' | 'invalid_scope'
export type LineupResult = { ok: true; state: LineupState } | { ok: false; code: LineupError }
export interface WorkspaceLineupEntry { id: string; name: string; position: number; held: boolean }
export interface WorkspaceLineupSnapshot {
  management?: {generation: number; partyIds: string[]; excludedPartyIds: string[]; candidates: WorkspaceLineupEntry[]}
  revision: number
  connection: LineupConnection
  lastReceivedAt: string | null
  lastChangedAt: string | null
  sourceVersion: string | null
  canManage: boolean
  entries: WorkspaceLineupEntry[]
  heldEntries: WorkspaceLineupEntry[]
  undoAvailable: boolean
  warning: string | null
}
