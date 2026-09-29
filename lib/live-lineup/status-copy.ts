/** Presentation-only Live Lineup status words. Does not change parser, lease, publish, or read behavior. */
export const LIVE_LINEUP_STATUS = {
  connecting: 'Connecting',
  updating: 'Connected + Updating',
  reconnecting: 'Reconnecting',
  attention: 'Needs attention',
  off: 'Off',
} as const

export type LiveLineupStatusTone = keyof typeof LIVE_LINEUP_STATUS

/** Server warning for a non-ready parser while the last lineup is still retained. */
export const SOURCE_NOT_READY_WARNING = 'Source is not ready. The last known lineup is retained.'

export type WorkspaceLineupConnection = 'connecting' | 'connected' | 'delayed' | 'offline'

/**
 * Workspace has no extension on/off switch. "Off" is the popup label for that switch.
 * A publisher that is offline (expired lease or no heartbeat past the offline window)
 * is a real failure here: Needs attention.
 */
export function workspaceLineupStatus(input: {
  connection?: WorkspaceLineupConnection | null
  warning?: string | null
  readError?: boolean
}): { label: string; tone: LiveLineupStatusTone } {
  if (input.readError) return { label: LIVE_LINEUP_STATUS.reconnecting, tone: 'reconnecting' }
  switch (input.connection) {
    case 'offline':
      return { label: LIVE_LINEUP_STATUS.attention, tone: 'attention' }
    case 'connected':
      return { label: LIVE_LINEUP_STATUS.updating, tone: 'updating' }
    case 'delayed':
      // A source that is momentarily not ready is a routine refresh. A late heartbeat is reconnecting.
      if (input.warning === SOURCE_NOT_READY_WARNING) return { label: LIVE_LINEUP_STATUS.updating, tone: 'updating' }
      return { label: LIVE_LINEUP_STATUS.reconnecting, tone: 'reconnecting' }
    default:
      return { label: LIVE_LINEUP_STATUS.connecting, tone: 'connecting' }
  }
}
