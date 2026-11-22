'use client'

import { useId, useMemo } from 'react'
import type { WorkspaceLineupSnapshot } from '@/lib/live-lineup/types'
import { partyVisibilityCommand, type WorkspaceLineupCommand } from './live-lineup-client'
import { NO_SHARED_PARTY, STARTED_DISCONNECTED, STARTED_WAITING, type ShowAction } from '@/lib/live-lineup/show-control'
import { ControlTip } from './ControlTip'
import styles from './LiveLineupCard.module.css'

export function LiveLineupShowControls({snapshot, disabled, submit}: {snapshot: WorkspaceLineupSnapshot; disabled: boolean;
  submit: (command: WorkspaceLineupCommand, drag?: WorkspaceLineupSnapshot, preview?: WorkspaceLineupSnapshot) => Promise<boolean | undefined>}) {
  const id = useId()
  const partyCounts = useMemo(() => {
    const counts = new Map<string, {waiting: number; held: number}>()
    for (const entry of snapshot.management?.candidates ?? []) {
      const partyId = entry.id.split(':')[0], count = counts.get(partyId) ?? {waiting: 0, held: 0}
      if (entry.held) count.held++; else count.waiting++
      counts.set(partyId, count)
    }
    return counts
  }, [snapshot.management?.candidates])
  if (!snapshot.management) return null
  return <ControlTip tip="party-controls" block><details className={styles.pairing}>
    <summary>Party controls</summary>
    {snapshot.management.generation > 0 ? <fieldset className={styles.partyVisibility} disabled={disabled} aria-describedby={`${id}-visibility-help`}>
      <legend>Parties visible in this lineup</legend>
      <p id={`${id}-visibility-help`}>Uncheck a party to hide its customers from the lineup. Saved order and holds are preserved. Check it again to resume updates and restore visibility. This does not change Bomb Party orders.</p>
      <div className={styles.partyVisibilityList} tabIndex={0} role="region" aria-label="Scrollable party visibility choices">
        {snapshot.management.partyIds.map(partyId => {
          const counts = partyCounts.get(partyId) ?? {waiting: 0, held: 0}
          const visible = !snapshot.management!.excludedPartyIds.includes(partyId)
          return <label key={partyId}>
            <input type="checkbox" checked={visible} aria-label={`Show party ${partyId} in this lineup`} onChange={event => {
              const command = partyVisibilityCommand(snapshot, partyId, event.target.checked)
              if (command) void submit(command, undefined, snapshot)
            }} />
            <span><strong>Party {partyId}</strong><small>{visible ? 'Visible' : 'Hidden'} · {counts.waiting} waiting · {counts.held} held privately</small></span>
          </label>
        })}
      </div>
      {snapshot.management.excludedPartyIds.length === snapshot.management.partyIds.length && <p>All selected parties are hidden. Their customers remain private and can be shown again here.</p>}
      <p>Each change appears after the server confirms it. Restore visibility here; Undo below applies to ordering and holds.</p>
    </fieldset> : <p>Parties appear automatically when the connected extension reads the Live Party Orders page. No scheduled show is needed.</p>}
  </details></ControlTip>
}

export function ShowActionButton({snapshot, disabled, onAction}: {
  snapshot: WorkspaceLineupSnapshot | null
  disabled: boolean
  onAction: (action: ShowAction) => void
}) {
  const control = snapshot?.showControl
  if (!control) return null
  const on = control.phase === 'active' || control.mode === 'started'
  return <button type="button" className={on ? styles.stopShow : styles.startShow} disabled={disabled}
    onClick={() => onAction(on ? 'show-stop' : 'show-start')}>
    {on ? 'Stop Show' : 'Start Show'}
  </button>
}

export function LiveLineupExtensionDetails({snapshot, label, tone, onStatus}: {
  snapshot: WorkspaceLineupSnapshot | null
  label: string
  tone: string
  onStatus: () => void
}) {
  const control = snapshot?.showControl
  const extension = snapshot?.extensionStatus
  const isStarted = control?.mode === 'started'
  let version = 'Extension version not reported.'
  if (extension?.workerVersion) {
    if (extension.updateNeeded) version = 'Extension update needed — running ' + extension.workerVersion
      + '; latest ' + extension.latestPublishedVersion + '.'
    else version = extension.connected ? 'Extension ' + extension.workerVersion : 'Last reported version ' + extension.workerVersion
  }
  const warnings = []
  if (control?.selection === 'none') warnings.push(NO_SHARED_PARTY)
  if (isStarted && !extension?.connected) warnings.push(STARTED_DISCONNECTED)
  const readerMismatch = extension?.connected && extension.readerVersion && extension.readerVersion !== extension.workerVersion
  return <div className={styles.extensionDetails}>
    <div className={styles.extensionRow}>
      {snapshot && <span>{version}</span>}
      <button type="button" className={styles.statusButton} data-connection={tone} aria-haspopup="dialog" onClick={onStatus}>
        <span className={styles.statusLine}><span className={styles.dot} aria-hidden="true" />{extension?.connected && tone === 'updating' ? 'Connected' : label}</span>
        {tone === 'attention' && <span className={styles.statusHint}>Tap for status</span>}
      </button>
    </div>
    {warnings.length > 0 && <div className={styles.showWarning} role="alert">{warnings.map(warning => <p key={warning}>{warning}</p>)}</div>}
    {control?.waitingForFirstOrder && <p className={styles.showWaiting} role="status">{STARTED_WAITING}</p>}
    {readerMismatch && <p className={styles.showWarning} role="status">The Party Orders page is still using reader {extension.readerVersion}.</p>}
  </div>
}
