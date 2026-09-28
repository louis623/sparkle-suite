'use client'

import { useId, useMemo } from 'react'
import type { WorkspaceLineupSnapshot } from '@/lib/live-lineup/types'
import { partyVisibilityCommand, type WorkspaceLineupCommand } from './live-lineup-client'
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
  return <details className={styles.pairing}>
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
  </details>
}
