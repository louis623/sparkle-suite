'use client'

import { useId, useMemo, useState } from 'react'
import type { WorkspaceLineupSnapshot } from '@/lib/live-lineup/types'
import { canConfirmShow, partyVisibilityCommand, type WorkspaceLineupCommand } from './live-lineup-client'
import styles from './LiveLineupCard.module.css'

export function LiveLineupShowControls({snapshot, disabled, submit}: {snapshot: WorkspaceLineupSnapshot; disabled: boolean;
  submit: (command: WorkspaceLineupCommand, drag?: WorkspaceLineupSnapshot, preview?: WorkspaceLineupSnapshot) => Promise<boolean | undefined>}) {
  const id = useId()
  const [preview, setPreview] = useState<WorkspaceLineupSnapshot | null>(null)
  const [parties, setParties] = useState('')
  const [carry, setCarry] = useState<string[]>([])
  const [confirmed, setConfirmed] = useState(false)
  const stale = useMemo(() => !!preview && !canConfirmShow(preview, snapshot), [preview, snapshot])
  const partyCounts = useMemo(() => {
    const counts = new Map<string, {waiting: number; held: number}>()
    for (const entry of snapshot.management?.candidates ?? []) {
      const partyId = entry.id.split(':')[0], count = counts.get(partyId) ?? {waiting: 0, held: 0}
      if (entry.held) count.held++; else count.waiting++
      counts.set(partyId, count)
    }
    return counts
  }, [snapshot.management?.candidates])
  const carrySet = new Set(carry)
  if (!snapshot.management) return null
  const chosenParties = parties.split(',').map(p => p.trim()).filter(Boolean)
  const validParties = chosenParties.length > 0 && chosenParties.length <= 100 && new Set(chosenParties).size === chosenParties.length
    && chosenParties.every(p => /^[A-Za-z0-9][A-Za-z0-9_-]{0,60}$/.test(p))
  const invalidCarry = carry.some(entryId => !chosenParties.includes(entryId.split(':')[0]))
  function review() {
    setPreview(snapshot); setParties(snapshot.management!.partyIds.join(', ')); setCarry([]); setConfirmed(false)
  }
  return <details className={styles.pairing} onToggle={event => { if (!event.currentTarget.open) {setPreview(null); setConfirmed(false)} }}>
    <summary>Show controls</summary>
    {snapshot.management.generation > 0 ? <fieldset className={styles.partyVisibility} disabled={disabled} aria-describedby={`${id}-visibility-help`}>
      <legend>Parties visible in this show</legend>
      <p id={`${id}-visibility-help`}>Uncheck a party to hide its customers from the lineup. Orders keep updating privately, with their order and holds preserved. Check it again to restore visibility. This does not change Bomb Party orders or the show’s source scope.</p>
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
    </fieldset> : <p>Party visibility controls become available after you start a scoped show below.</p>}
    <p>A new show archives the current lineup and pauses its source. Select the new show in the extension before updates resume. Bomb Party orders are unchanged.</p>
    {!preview ? <button type="button" disabled={disabled} onClick={review}>Review a new show</button> : <div className={styles.pairForm}>
      <label htmlFor={id}>Party IDs for the new show, separated by commas</label>
      <input id={id} value={parties} disabled={disabled} maxLength={6200} onChange={event => {setParties(event.target.value); setConfirmed(false)}} />
      <fieldset disabled={disabled} className={styles.carryChoices}>
        <legend>Carry customers forward—none selected automatically</legend>
        {preview.management!.candidates.map(entry => <label key={entry.id}><input type="checkbox" checked={carrySet.has(entry.id)} onChange={event => {
          setCarry(current => event.target.checked ? [...current, entry.id] : current.filter(value => value !== entry.id)); setConfirmed(false)
        }} />{entry.name} · {entry.held ? 'Held' : `Waiting ${entry.position}`} · Order {entry.id}</label>)}
        {!preview.management!.candidates.length && <p>No current customers to carry.</p>}
      </fieldset>
      <p>{carry.length} carried; {preview.management!.candidates.length - carry.length} left in the private archive. Carried holds stay private and order is preserved.</p>
      {invalidCarry && <p role="alert">Include each carried customer’s party ID above.</p>}
      {stale && <p role="alert">The lineup changed while you reviewed it. Review again before starting.</p>}
      <label><input type="checkbox" checked={confirmed} disabled={disabled || stale} onChange={event => setConfirmed(event.target.checked)} />I reviewed the carry choices and understand the remaining customers leave the active lineup.</label>
      <button type="button" disabled={disabled || stale || !confirmed || !validParties || invalidCarry} onClick={async () => {
        if (await submit({type:'start-show',partyIds:chosenParties,carryEntryIds:carry,confirmed:true}, undefined, preview)) setPreview(null)
      }}>Confirm new show</button>
      <button type="button" disabled={disabled} onClick={review}>Review current lineup again</button>
      <button type="button" disabled={disabled} onClick={() => {setPreview(null);setConfirmed(false)}}>Cancel</button>
    </div>}
  </details>
}
