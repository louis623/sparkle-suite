'use client'

import { useEffect, useRef, useState } from 'react'
import type { WorkspaceLineupSnapshot } from '@/lib/live-lineup/types'
import { canConfirmShow } from './live-lineup-client'
import { archiveRecoveryRequest, isArchiveDetail, isArchivePage, recoveryIneligibleReason, type ArchiveDetail, type ArchivePage } from './live-lineup-archive-client'
import type { LineupArchiveSummary } from '@/lib/live-lineup/archive-recovery'
import styles from './LiveLineupCard.module.css'

export function LiveLineupArchiveControls({ snapshot, disabled, recover }: { snapshot: WorkspaceLineupSnapshot; disabled: boolean;
  recover: (archive: ArchiveDetail, preview: WorkspaceLineupSnapshot, ids: string[]) => Promise<boolean> }) {
  const [page, setPage] = useState<ArchivePage | null>(null)
  const [detail, setDetail] = useState<ArchiveDetail | null>(null)
  const [preview, setPreview] = useState<WorkspaceLineupSnapshot | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [confirmed, setConfirmed] = useState(false)
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')
  const controller = useRef<AbortController | null>(null)
  const mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; controller.current?.abort() } }, [])
  function clearPreview() { setDetail(null); setPreview(null); setSelected([]); setConfirmed(false) }
  async function load(summary?: LineupArchiveSummary, beforeGeneration?: number) {
    if (disabled || controller.current) return
    const request = new AbortController(); controller.current = request
    const timer = window.setTimeout(() => request.abort(), 10000)
    setPending(true); setMessage(''); clearPreview()
    try {
      const query = summary ? `?generation=${summary.generation}` : beforeGeneration === undefined ? '' : `?beforeGeneration=${beforeGeneration}`
      const response = await fetch(`/api/workspace/live-lineup/archives${query}`, { cache: 'no-store', signal: request.signal })
      if (!response.ok) throw Error('Archive unavailable')
      const data: unknown = await response.json()
      if (!mounted.current || request.signal.aborted) return
      if (summary) {
        if (!isArchiveDetail(data, summary)) throw Error('Archive changed')
        setDetail(data); setPreview(snapshot)
      } else {
        if (!isArchivePage(data, beforeGeneration)) throw Error('Invalid archives')
        setPage(data)
      }
    } catch {
      if (mounted.current && !request.signal.aborted) setMessage('Archive not confirmed. Reload the list and review it again. No lineup changes were made.')
      else if (mounted.current) setMessage('Archive request stopped. Reload to try again.')
    } finally {
      window.clearTimeout(timer)
      if (controller.current === request) controller.current = null
      if (mounted.current) setPending(false)
    }
  }
  const stale = !!preview && !canConfirmShow(preview, snapshot)
  const valid = !!detail && !!preview && !!archiveRecoveryRequest(preview, snapshot, detail, selected, confirmed)
  return <details className={styles.pairing} onToggle={event => {
    if (!event.currentTarget.open) { controller.current?.abort(); clearPreview() }
  }}>
    <summary>Recover from a private archive</summary>
    <p>Review a previous show and choose specific customers to recover into private Hold. Their names will not enter the public waiting lineup. Current orders and holds stay in place.</p>
    <p>Recovery pauses the source and clears Undo. Select the updated show in the extension to resume updates. Bomb Party orders are unchanged.</p>
    <button type="button" disabled={disabled || pending} onClick={() => void load()}>Load latest archives</button>
    {page && <div className={styles.archiveChoices} role="region" tabIndex={0} aria-label="Scrollable archived shows">
      {page.archives.map(archive => <button key={archive.generation} type="button" disabled={disabled || pending} onClick={() => void load(archive)}>
        Review show {archive.generation} · {new Date(archive.archivedAt).toLocaleString()} · {archive.waitingCount} waiting / {archive.heldCount} held
      </button>)}
      {!page.archives.length && <p>No private archives on this page.</p>}
    </div>}
    {page?.nextBeforeGeneration != null && <button type="button" disabled={disabled || pending} onClick={() => void load(undefined, page.nextBeforeGeneration!)}>Older archives</button>}
    {detail && <div>
      <h3>Review archived show {detail.generation}</h3>
      <fieldset className={styles.archiveChoices} disabled={disabled || pending || stale}>
        <legend>Choose customers—none selected automatically</legend>
        {detail.candidates.map(entry => {
          const reason = recoveryIneligibleReason(snapshot, detail, entry.id)
          return <label key={entry.id}><input type="checkbox" checked={selected.includes(entry.id)} disabled={!!reason}
            onChange={event => { setSelected(current => event.target.checked ? [...current, entry.id] : current.filter(id => id !== entry.id)); setConfirmed(false) }} />
            <span>{entry.name} · Order {entry.id} · Previously {entry.held ? 'held' : 'waiting'}{reason && <small>{reason}</small>}</span></label>
        })}
        {!detail.candidates.length && <p>No customers in this archive.</p>}
      </fieldset>
      <p>{selected.length} selected for private Hold. Orders marked revealed in the current show cannot be recovered. Review every recovered hold before returning it.</p>
      {stale && <p role="alert">The current lineup changed. Reload and review the archive before recovering.</p>}
      <label className={styles.archiveConfirm}><input type="checkbox" checked={confirmed} disabled={disabled || pending || stale || !selected.length}
        onChange={event => setConfirmed(event.target.checked)} />I reviewed these customers and understand recovery pauses the source and clears Undo.</label>
      <button type="button" disabled={disabled || pending || !valid} onClick={async () => {
        if (!detail || !preview) return
        const success = await recover(detail, preview, selected)
        clearPreview()
        if (mounted.current) setMessage(success ? 'Saved. Waiting for the connection to resume. Recovered orders are in private Hold.'
          : 'Recovery not confirmed. The current lineup is being reloaded; reload and review this archive before trying again.')
      }}>Confirm recovery into private Hold</button>
      <button type="button" disabled={disabled || pending} onClick={clearPreview}>Cancel recovery</button>
    </div>}
    <p role="status" aria-live="polite">{pending ? 'Loading private archive…' : message}</p>
  </details>
}
