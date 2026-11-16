/** Private v2 state. Never serialize publisher identity, order IDs, or undo to a public site. */
export type ParserState = 'ready' | 'loading' | 'partial' | 'invalid'
export const INVALID_PARSER_REASONS = [
  'invalid_scope', 'columns_changed', 'duplicate_columns', 'missing_order_identity', 'duplicate_order_identity',
  'invalid_order_time', 'invalid_first_name', 'capacity_exceeded', 'scan_capacity_exceeded', 'parser_exception',
] as const
export type InvalidParserReason = typeof INVALID_PARSER_REASONS[number]
export const LOADING_PARSER_REASONS = ['table_missing', 'table_busy', 'table_incomplete', 'table_settling'] as const
export const PARTIAL_PARSER_REASONS = ['table_incomplete', 'row_incomplete', 'reveal_state_missing', 'selected_party_not_visible'] as const
export type ParserReason = InvalidParserReason | typeof LOADING_PARSER_REASONS[number] | typeof PARTIAL_PARSER_REASONS[number]
export const UPDATE_STATES = ['unknown','checking','no_update','throttled','downloaded','installing','failed'] as const
export type UpdateState = typeof UPDATE_STATES[number]
export const STRUCTURE_COLUMNS = ['PartyID','OrderID','FirstName','LastName','OrderDate','IsRevealed','unknown'] as const
export const STRUCTURE_BUCKETS = ['0','1-10','11-100','101-1000','1001-10000','10001+'] as const
export interface ParserStructure {
  version: 1
  columns: (typeof STRUCTURE_COLUMNS[number])[]
  bodyCount: number
  rowCount: typeof STRUCTURE_BUCKETS[number]
  unmatchedRows: typeof STRUCTURE_BUCKETS[number]
  hasOrderIdAttribute: boolean
  hasPartyIdAttribute: boolean
  hasOrderTimeAttribute: boolean
}
export const FAILURE_STAGES = ['identity','row','date','name','reveal','columns','scope','capacity','table'] as const
export const VALUE_FORMATS = ['missing','plain','labelled','unsupported'] as const
export const VALUE_LENGTHS = ['0','1-10','11-100','101-1000','1001+'] as const
export const VALUE_CHARACTERS = ['ascii_letters','digits','whitespace','separator','non_ascii','other','control'] as const
export interface ValueShape {
  format: typeof VALUE_FORMATS[number]
  length: typeof VALUE_LENGTHS[number]
  characters: (typeof VALUE_CHARACTERS[number])[]
}
export interface IdentityEvidence {
  problem: 'none' | 'missing' | 'unsupported_format' | 'conflict'
  attribute: ValueShape
  cell: ValueShape
  link: ValueShape
  comparisons: {attributeCell: 'match' | 'mismatch' | 'unavailable'; attributeLink: 'match' | 'mismatch' | 'unavailable'; cellLink: 'match' | 'mismatch' | 'unavailable'}
}
export interface ParserFailure {
  version: 1
  stage: typeof FAILURE_STAGES[number]
  rowIndex: number | null
  cellCount: number | null
  order?: IdentityEvidence
  party?: IdentityEvidence
}
export interface DiagnosticHistoryEntry {
  firstSeenAt: string
  lastSeenAt: string
  count: number
  report: PublisherDiagnostics
}
/** Private, allowlisted observations only; never authority to renew or declare readiness. */
export interface PublisherDiagnostics {
  /** Existing sourceVersion terminology means the worker package version. */
  sourceVersion: string
  readerVersion: string | null
  updateState: UpdateState
  structure?: ParserStructure
  failure?: ParserFailure
  parserState: ParserState
  parserReason?: ParserReason
}
export type LineupConnection = 'connecting' | 'connected' | 'delayed' | 'offline'
export interface SourceEntry { id: string; name: string; orderedAt: number | null; lastName?: string; identityEligible?: boolean; sourceIdentityVersion?: string }
export interface PublisherLease { id: string; claimId: string; epoch: number; leaseExpiresAt: string; lastSequence: number; capabilities?: 'lineup-2.0.5' }
export interface SourceObservation { documentId: string; serial: number; serverTime: string; settled: boolean }
export interface AcceptedObservation extends SourceObservation { epoch: number; generation: number }
export interface RevealRestoration {
  entry: SourceEntry; category: 'order' | 'held'; position: number; previousId: string | null; nextId: string | null
  checked: AcceptedObservation
  /** Parked because the party was missing, not because the order was revealed. */
  reason?: 'party-absent'
}
export interface PartyAbsence {
  partyIds: string[]
  since: string
  packets: number
}
export interface LineupRevealEvent { cursor: number; entryId: string; at: string; groupEntryIds: string[] }
export interface LineupShow { generation: number; partyIds: string[]; excludedPartyIds: string[]; carryEntryIds: string[]; startedAt: string }
/** Token-authenticated worker setup only. No customer names or publisher credentials. */
export interface SourceDescriptor {
  orderScope?: 'selected-parties'
  protocol: 2
  generation: number
  scope: { partyIds: string[]; excludedPartyIds: string[]; startedAt: string; carryEntryIds: string[] } | null
  serverTime: string
  configured?: { applied: true; claimId: string; epoch: number; generation: number; partyIds: string[]; excludedPartyIds: string[] }
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
  parserReason?: ParserReason | null
  sourceVersion: string | null
  diagnostics?: (PublisherDiagnostics & {receivedAt: string}) | null
  /** Private failure evidence: max 12 signatures, expires after 14 days without a matching accepted receipt. */
  diagnosticHistory?: DiagnosticHistoryEntry[]
  sourceObservation?: AcceptedObservation | null
  lastReadyObservation?: AcceptedObservation | null
  lastReadySourceAt?: string | null
  bootstrapPending?: boolean
  retiredDocumentIds?: string[]
  restorations?: RevealRestoration[]
  revealEvents?: LineupRevealEvent[]
  revealEventCursor?: number
  restorationNotice?: string | null
  /** Consecutive ready packets that omitted these show parties. */
  partyAbsence?: PartyAbsence | null
}
export interface SourcePacket {
  /** Unscoped prototype packets are generation zero only; never accepted into a later show. */
  generation?: number
  publisherId: string
  claimId?: string
  observation?: SourceObservation
  epoch: number
  sequence: number
  sourceVersion: string
  diagnostics?: PublisherDiagnostics
  parserState: ParserState
  parserReason?: ParserReason | null
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
  | 'lease_expired' | 'stale_sequence' | 'stale_observation' | 'source_not_ready' | 'capacity_exceeded' | 'entry_not_found' | 'invalid_move' | 'nothing_to_undo' | 'show_changed' | 'invalid_scope'
export type LineupResult = { ok: true; state: LineupState } | { ok: false; code: LineupError }
export interface WorkspaceLineupEntry { id: string; name: string; position: number; held: boolean; lastName?: string; identityEligible?: boolean; sourceIdentityVersion?: string }
export interface WorkspaceLineupSnapshot {
  tenantContext?: string
  management?: {generation: number; partyIds: string[]; excludedPartyIds: string[]; candidates: WorkspaceLineupEntry[]}
  revision: number
  connection: LineupConnection
  lastReceivedAt: string | null
  lastChangedAt: string | null
  sourceVersion: string | null
  canManage: boolean
  authorized?: boolean
  runtimeWritable?: boolean
  canRecover?: boolean
  serverTime?: string
  freshUntil?: string | null
  freshForMs?: number
  entries: WorkspaceLineupEntry[]
  heldEntries: WorkspaceLineupEntry[]
  undoAvailable: boolean
  warning: string | null
}
