'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import type { WorkspaceLineupEntry, WorkspaceLineupSnapshot } from '@/lib/live-lineup/types'
import { canAcceptWorkspaceRefresh, canRecoverLineup, workspaceFreshnessDeadline, workspaceWriteEligible, canRebaseDrag, dragScrollDelta, edgeScrollSpeed, isLineupCommandAcknowledgement, isWorkspaceLineupSnapshot, moveCommand, pointerDropAnchor } from './live-lineup-client'
import type { WorkspaceLineupCommand } from './live-lineup-client'
import styles from './LiveLineupCard.module.css'
import { useLineupAudience } from './use-lineup-audience'
import { LiveLineupShowControls } from './LiveLineupShowControls'
import { LiveLineupArchiveControls } from './LiveLineupArchiveControls'
import { LiveLineupPublisherControls } from './LiveLineupPublisherControls'
import { archiveRecoveryRequest, isArchiveRecoveryAcknowledgement, type ArchiveDetail } from './live-lineup-archive-client'
import { canConfirmShow } from './live-lineup-client'

const ENDPOINT = '/api/workspace/live-lineup'
const CONNECTION_LABELS = { connecting: 'Checking connection', connected: 'Connected', delayed: 'Waiting for an update', offline: 'Not connected' }

export function LiveLineupCard({ compact = false, readOnly = false }: { compact?: boolean; readOnly?: boolean }) {
  const headingId = useId()
  const instructionsId = useId()
  const [snapshot, setSnapshot] = useState<WorkspaceLineupSnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)
  const [dragging, setDragging] = useState<string | null>(null)
  const [dropBefore, setDropBefore] = useState<string | null>(null)
  const snapshotRef = useRef(snapshot)
  const active = useRef(true)
  const mutation = useRef(false)
  const readController = useRef<AbortController | null>(null)
  const writeController = useRef<AbortController | null>(null)
  const requestGeneration = useRef(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const pointerDrag = useRef<{ id: string; pointerId: number; target: HTMLButtonElement; startX: number; startY: number; x: number; y: number; started: boolean; valid: boolean; before: string | null; baseline: WorkspaceLineupSnapshot; width: number; rows: { id: string; top: number; bottom: number }[] } | null>(null)
  const {matches: audienceMatches, finishGesture} = useLineupAudience(snapshot, pointerDrag)
  const scrollSpeed = useRef(0)
  const animation = useRef<number | null>(null)
  const focusAfterSave = useRef<string | null>(null)
  const uncertainChange = useRef(false)
  const [fresh, setFresh] = useState(false)
  const freshnessDeadline = useRef(0)
  const freshnessTimer = useRef<number | null>(null)
  const suspended = useRef(true)
  const lifecycleEpoch = useRef(0)
  const canWriteNow = () => workspaceWriteEligible(snapshotRef.current, freshnessDeadline.current, performance.now(), suspended.current || document.hidden)


  const stopDrag = useCallback(() => {
    const drag = pointerDrag.current
    pointerDrag.current = null
    scrollRef.current?.querySelectorAll<HTMLElement>('[data-lineup-active]').forEach(row => {
      row.style.removeProperty('height'); row.style.removeProperty('overflow'); row.style.removeProperty('box-sizing')
    })
    finishGesture()
    scrollSpeed.current = 0
    if (animation.current !== null) cancelAnimationFrame(animation.current)
    animation.current = null
    setDragging(null)
    setDropBefore(null)
    if (drag?.target.hasPointerCapture(drag.pointerId)) drag.target.releasePointerCapture(drag.pointerId)
  }, [finishGesture])

  const lock = useCallback(() => {
    suspended.current = true
    freshnessDeadline.current = 0
    if (freshnessTimer.current !== null) window.clearTimeout(freshnessTimer.current)
    stopDrag()
    setFresh(false)
  }, [stopDrag])

  const accept = useCallback((next: unknown, requestStarted: number, requestEpoch: number): boolean => {
    if (!isWorkspaceLineupSnapshot(next)) throw new Error('Invalid lineup response')
    const tenantChanged = !!snapshotRef.current?.tenantContext && snapshotRef.current.tenantContext !== next.tenantContext
    if (!active.current || (snapshotRef.current && !tenantChanged && !canAcceptWorkspaceRefresh(snapshotRef.current, next))) return false
    if (tenantChanged) stopDrag()
    const now = performance.now()
    freshnessDeadline.current = requestEpoch === lifecycleEpoch.current ? workspaceFreshnessDeadline(next, requestStarted, now) : 0
    suspended.current = document.hidden || requestEpoch !== lifecycleEpoch.current
    if (freshnessTimer.current !== null) window.clearTimeout(freshnessTimer.current)
    const isFresh = !suspended.current && now < freshnessDeadline.current
    setFresh(isFresh)
    if (isFresh) freshnessTimer.current = window.setTimeout(() => {
      freshnessDeadline.current = 0
      stopDrag()
      setFresh(false)
    }, freshnessDeadline.current - now)
    else stopDrag()
    snapshotRef.current = next
    setSnapshot(next)
    return true
  }, [stopDrag])

  const refresh = useCallback(async () => {
    if (mutation.current || pointerDrag.current || readController.current || document.hidden) return
    const controller = new AbortController()
    readController.current = controller
    const generation = requestGeneration.current
    const requestStarted = performance.now()
    const requestEpoch = lifecycleEpoch.current
    const timeout = window.setTimeout(() => controller.abort(), 8000)
    try {
      const response = await fetch(ENDPOINT, { cache: 'no-store', signal: controller.signal })
      if (!response.ok) throw new Error('Unable to read lineup')
      const next: unknown = await response.json()
      if (generation !== requestGeneration.current || !active.current || mutation.current || pointerDrag.current) return
      if (!accept(next, requestStarted, requestEpoch)) throw new Error('Stale or inconsistent lineup response')
      setError(null)
      if (uncertainChange.current) {
        uncertainChange.current = false
        setNotice('Lineup reloaded after an unconfirmed change. Review its order and Hold list before trying again.')
      }
    } catch {
      if (active.current && generation === requestGeneration.current && !mutation.current) {
        lock()
        setError(uncertainChange.current
          ? 'Change not confirmed, and the lineup could not be reloaded. Wait for the connection to recover, then review before trying again.'
          : 'Could not refresh. Showing the last received lineup; retrying automatically.')
      }
    } finally {
      window.clearTimeout(timeout)
      if (readController.current === controller) readController.current = null
    }
  }, [accept, lock])


  useEffect(() => {
    const generationRef = requestGeneration
    active.current = true
    void refresh()
    const timer = window.setInterval(() => { void refresh() }, 5000)
    const onVisible = (event: Event) => {
      // Ref gates and pointer capture are invalidated synchronously, before any await.
      ++lifecycleEpoch.current
      lock()
      ++requestGeneration.current
      readController.current?.abort()
      readController.current = null
      if (!document.hidden && event.type !== 'pagehide' && event.type !== 'freeze') void refresh()
    }
    const onResize = () => {
      if (!pointerDrag.current) return
      stopDrag()
      setNotice('Move not saved. The view changed size; drag the order again.')
    }
    const observer = new ResizeObserver(onResize)
    if (scrollRef.current) observer.observe(scrollRef.current)
    window.addEventListener('pagehide', onVisible)
    window.addEventListener('pageshow', onVisible)
    document.addEventListener('freeze', onVisible)
    document.addEventListener('resume', onVisible)
    window.addEventListener('resize', onResize)
    window.visualViewport?.addEventListener('resize', onResize)
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', onVisible)
    return () => {
      active.current = false
      ++generationRef.current
      readController.current?.abort()
      readController.current = null
      writeController.current?.abort()
      stopDrag()
      if (freshnessTimer.current !== null) window.clearTimeout(freshnessTimer.current)
      observer.disconnect()
      window.removeEventListener('pagehide', onVisible)
      window.removeEventListener('pageshow', onVisible)
      document.removeEventListener('freeze', onVisible)
      document.removeEventListener('resume', onVisible)
      window.removeEventListener('resize', onResize)
      window.visualViewport?.removeEventListener('resize', onResize)
      if (animation.current !== null) cancelAnimationFrame(animation.current)
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', onVisible)
    }
  }, [refresh, lock, stopDrag])

  useEffect(() => {
    const id = focusAfterSave.current
    const scroller = scrollRef.current
    if (saving || !id || !scroller) return
    focusAfterSave.current = null
    const row = scroller.querySelector<HTMLElement>(`[data-lineup-entry="${CSS.escape(id)}"]`)
    if (!row) return
    // Holding/returning removes the focused button. Restore focus to the moved item
    // without scrolling the entire Workspace, including when it changed lists.
    row.focus({ preventScroll: true })
    const box = scroller.getBoundingClientRect()
    const item = row.getBoundingClientRect()
    if (item.top < box.top) scroller.scrollTop += item.top - box.top
    else if (item.bottom > box.bottom) scroller.scrollTop += item.bottom - box.bottom
  }, [snapshot, saving])

  const submit = useCallback(async (command: WorkspaceLineupCommand, dragBaseline?: WorkspaceLineupSnapshot, preview?: WorkspaceLineupSnapshot) => {
    let current = snapshotRef.current
    const recovery = command.type === 'start-show' || command.type === 'filter-parties'
    if (readOnly || !current || mutation.current || uncertainChange.current || !active.current || document.hidden
      || (recovery ? suspended.current || !canRecoverLineup(current) : !workspaceWriteEligible(current, freshnessDeadline.current, performance.now(), suspended.current))) return
    if (preview && !canConfirmShow(preview, current)) { setNotice(command.type === 'filter-parties'
      ? 'The show or its customers changed. Check the current party controls before trying again.'
      : 'The lineup changed. Review the new show again before confirming.'); return false }
    mutation.current = true
    setSaving(true)
    setNotice('')
    setError(null)
    ++requestGeneration.current
    readController.current?.abort()
    readController.current = null
    const controller = new AbortController()
    writeController.current = controller
    const timeout = window.setTimeout(() => controller.abort(), 10000)
    let reload = false
    try {
      // A long drag can span a heartbeat revision. One verified rebase prevents
      // routine liveness updates from making dragging unusable during a show.
      for (let attempt = 0; attempt < 2; attempt++) {
      if (document.hidden || suspended.current || (!recovery && !workspaceWriteEligible(current, freshnessDeadline.current, performance.now(), false))) return false
      const requestStarted = performance.now()
      const requestEpoch = lifecycleEpoch.current
      const response = await fetch(ENDPOINT, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
        body: JSON.stringify({ expectedRevision: current.revision, command }),
      })
      if (response.status === 409) {
        const failure: unknown = await response.json()
        if (attempt === 0 && dragBaseline && command.type === 'move' && failure && typeof failure === 'object'
          && (failure as { error?: unknown }).error === 'revision_conflict') {
          const latestStarted = performance.now()
          const latestEpoch = lifecycleEpoch.current
          const latestResponse = await fetch(ENDPOINT, { cache: 'no-store', signal: controller.signal })
          if (!latestResponse.ok) throw new Error('Conflict refresh failed')
          const latest: unknown = await latestResponse.json()
          if (!isWorkspaceLineupSnapshot(latest)) throw new Error('Invalid conflict snapshot')
          if (!active.current) return
          if (!accept(latest, latestStarted, latestEpoch)) throw new Error('Conflict refresh rejected')
          if (latest.revision > current.revision && canRebaseDrag(dragBaseline, latest)) { current = latest; continue }
        }
        if (active.current) setNotice('The lineup changed elsewhere. Reloading it—please check before moving again.')
        reload = true
        return
      }
      if (!response.ok) throw new Error('Save failed')
      const next: unknown = await response.json()
      if (!isWorkspaceLineupSnapshot(next) || !isLineupCommandAcknowledgement(current, next, command)) throw new Error('Missing save acknowledgment')
      accept(next, requestStarted, requestEpoch)
      if ('entryId' in command) focusAfterSave.current = command.entryId
      if (active.current) setNotice(!next.canManage ? 'Saved. Waiting for the connection to resume.' : command.type === 'undo' ? 'Last change undone.' : command.type === 'start-show'
        ? 'New show started. Selected customers carried forward; select this show in the extension to resume updates.'
        : command.type === 'filter-parties' ? 'Party visibility saved. Toggle a party on again to restore it.' : 'Lineup saved.')
      return true
      }
    } catch {
      uncertainChange.current = true
      if (active.current) setError('Save not confirmed. Reloading the lineup—check its order before trying again.')
      reload = true
    } finally {
      window.clearTimeout(timeout)
      writeController.current = null
      mutation.current = false
      if (active.current) {
        setSaving(false)
        if (reload) void refresh()
      }
    }
  }, [accept, readOnly, refresh])

  function startDrag(event: PointerEvent<HTMLButtonElement>, entry: WorkspaceLineupEntry) {
    const baseline = snapshotRef.current
    if (readOnly || !baseline || !canWriteNow() || uncertainChange.current || mutation.current || !event.isPrimary || event.button !== 0) return
    pointerDrag.current = { id: entry.id, pointerId: event.pointerId, target: event.currentTarget, startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY, started: false, valid: false, before: null, baseline, width: -1, rows: [] }
    const scroller = scrollRef.current
    if (scroller) {
      const bounds = scroller.getBoundingClientRect()
      pointerDrag.current.width = scroller.clientWidth
      pointerDrag.current.rows = Array.from(scroller.querySelectorAll<HTMLElement>('[data-lineup-active]')).map(row => {
        const box = row.getBoundingClientRect()
        row.style.height = box.height + 'px'; row.style.overflow = 'hidden'; row.style.boxSizing = 'border-box'
        return {id:row.dataset.lineupEntry!,top:box.top - bounds.top + scroller.scrollTop,bottom:box.bottom - bounds.top + scroller.scrollTop}
      })
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  async function recover(archive: ArchiveDetail, preview: WorkspaceLineupSnapshot, ids: string[]): Promise<boolean> {
    const current = snapshotRef.current
    if (readOnly || !current || !canRecoverLineup(current) || suspended.current || document.hidden || mutation.current || pointerDrag.current || uncertainChange.current || !active.current) return false
    const request = archiveRecoveryRequest(preview, current, archive, ids, true)
    if (!request) { setNotice('The lineup or recovery selection changed. Reload and review the archive again.'); return false }
    mutation.current = true; setSaving(true); setNotice(''); setError(null)
    ++requestGeneration.current; readController.current?.abort(); readController.current = null
    const controller = new AbortController(); writeController.current = controller
    const timer = window.setTimeout(() => controller.abort(), 10000)
    let reload = false
    try {
      const requestStarted = performance.now()
      const requestEpoch = lifecycleEpoch.current
      const response = await fetch(`${ENDPOINT}/archives`, {method:'POST',headers:{'Content-Type':'application/json'},
        signal:controller.signal,body:JSON.stringify(request)})
      if (!response.ok) throw Error('Recovery not confirmed')
      const next: unknown = await response.json()
      if (!active.current || controller.signal.aborted) return false
      if (!isArchiveRecoveryAcknowledgement(current, next, archive, request)) throw Error('Invalid recovery acknowledgment')
      accept(next, requestStarted, requestEpoch)
      setNotice(next.canManage ? 'Selected customers recovered into private Hold.' : 'Saved. Waiting for the connection to resume.')
      return true
    } catch {
      reload = true
      uncertainChange.current = true
      if (active.current) setError('Recovery not confirmed. Reloading the lineup—review the archive again before any retry.')
      return false
    } finally {
      window.clearTimeout(timer); writeController.current = null; mutation.current = false
      if (active.current) {setSaving(false); if (reload) void refresh()}
    }
  }

  function updateDropTarget() {
    const drag = pointerDrag.current
    const scroller = scrollRef.current
    if (!drag?.started || !scroller) return
    if (!canWriteNow()) { lock(); return }
    const bounds = scroller.getBoundingClientRect()
    drag.valid = drag.x >= bounds.left && drag.x <= bounds.right && drag.y >= bounds.top && drag.y <= bounds.bottom
    scrollSpeed.current = drag.valid ? edgeScrollSpeed(drag.y, bounds.top, bounds.bottom) : 0
    if (!drag.valid) { setDropBefore(null); return }
    // Cached content coordinates remain valid while scrolling; only a width
    // change can reflow these frozen rows. Never measure 2,000 rows each frame.
    if (drag.width !== -1 && drag.width !== scroller.clientWidth) {
      stopDrag(); setNotice('Move not saved. The view changed size; drag the order again.'); return
    }
    if (drag.width === -1) {
      drag.width = scroller.clientWidth
      drag.rows = Array.from(scroller.querySelectorAll<HTMLElement>('[data-lineup-active]')).map(row => {
        const box = row.getBoundingClientRect()
        return { id: row.dataset.lineupEntry!, top: box.top - bounds.top + scroller.scrollTop, bottom: box.bottom - bounds.top + scroller.scrollTop }
      })
    }
    drag.before = pointerDropAnchor(drag.rows, drag.id, drag.y - bounds.top + scroller.scrollTop)
    setDropBefore(drag.before)
  }

  function moveDrag(event: PointerEvent<HTMLButtonElement>) {
    const drag = pointerDrag.current
    if (!drag || drag.pointerId !== event.pointerId) return
    if (!canWriteNow()) { lock(); return }
    drag.x = event.clientX
    drag.y = event.clientY
    if (!drag.started && Math.hypot(drag.x - drag.startX, drag.y - drag.startY) < 6) return
    if (!drag.started) { drag.started = true; setDragging(drag.id) }
    event.preventDefault()
    updateDropTarget()
    if (animation.current === null) {
      let previousFrame = performance.now()
      const tick = (now: number) => {
        if (now - previousFrame > 1000) { lock(); void refresh(); return }
        if (!pointerDrag.current?.started) { animation.current = null; return }
        if (scrollRef.current) scrollRef.current.scrollTop += dragScrollDelta(scrollSpeed.current, now - previousFrame)
        previousFrame = now
        updateDropTarget()
        animation.current = requestAnimationFrame(tick)
      }
      animation.current = requestAnimationFrame(tick)
    }
  }

  function finishDrag(event: PointerEvent<HTMLButtonElement>) {
    const drag = pointerDrag.current
    if (!drag || drag.pointerId !== event.pointerId) return
    drag.x = event.clientX
    drag.y = event.clientY
    updateDropTarget()
    const command = pointerDrag.current === drag && canWriteNow() && drag.started && drag.valid ? { type: 'move' as const, entryId: drag.id, beforeEntryId: drag.before } : null
    stopDrag()
    if (command) {
      const current = snapshotRef.current?.entries ?? []
      const index = current.findIndex(entry => entry.id === command.entryId)
      if (index >= 0 && (current[index + 1]?.id ?? null) !== command.beforeEntryId) void submit(command, drag.baseline)
    }
  }

  const publisherChangeDisabled = saving || uncertainChange.current
  const baseDisabled = publisherChangeDisabled || !fresh || !snapshot?.canManage || !snapshot?.authorized
  const viewOnly = readOnly || snapshot?.authorized === false || snapshot?.runtimeWritable === false
  const disabled = viewOnly || baseDisabled
  const recoveryDisabled = readOnly || publisherChangeDisabled || suspended.current || !snapshot || !canRecoverLineup(snapshot)
  const shownConnection = snapshot?.connection === 'connected' && !fresh ? 'delayed' : snapshot?.connection ?? 'connecting'
  const entries = snapshot?.entries ?? []
  return (
    <section className={`${styles.card} ${compact ? styles.compact : ''}`} aria-labelledby={headingId} aria-busy={saving}>
      <header className={styles.header}>
        <div className={styles.titleRow}>
          <h2 id={headingId}>Live Lineup <span>{entries.length}</span></h2>
        </div>
        <p className={styles.connection} data-connection={error ? 'delayed' : shownConnection}>
          <span aria-hidden="true" />{error ? 'Not connected' : CONNECTION_LABELS[shownConnection]}
        </p>
        <p id={instructionsId} className={styles.hint}>{viewOnly ? 'Customers are shown in their current order.' : 'Move one order at a time. Drag or use the arrow buttons.'}</p>
      </header>
      {(saving || error || notice || (viewOnly || (snapshot && disabled))) && <div className={styles.feedback} aria-live="polite" aria-atomic="true">
        {saving ? 'Saving…' : error ? 'We can’t update your lineup right now. We’ll keep trying.' : notice || (viewOnly
          ? 'Lineup changes are temporarily unavailable. Customer updates will continue.'
          : 'Waiting for a fresh source update. The last received order is preserved.')}
      </div>}
      <div ref={scrollRef} className={styles.scroll} tabIndex={0} role="region" aria-label="Scrollable live lineup" aria-describedby={instructionsId}
        onKeyDown={(event) => { if (event.key === 'Escape') stopDrag() }}>
        {!snapshot && <p className={styles.empty}>{error ? 'Your lineup is unavailable right now. No orders have been changed.' : 'Loading your lineup…'}</p>}
        {snapshot && !entries.length && <p className={styles.empty}>{snapshot.management?.candidates.some(entry => !entry.held)
          ? 'Some waiting customers are hidden. Open the Live Lineup tool to show them.'
          : shownConnection === 'connected' ? 'No customers are waiting right now.' : 'Once connected, customers will appear here.'}</p>}
        <ol className={styles.list} aria-label="Customers waiting">
          {entries.map((entry, index) => (
            <li key={entry.id} data-lineup-entry={entry.id} data-lineup-active tabIndex={-1} aria-label={`${entry.name}, position ${index + 1}`} className={`${styles.row} ${dragging === entry.id ? styles.dragging : ''} ${dragging && dropBefore === entry.id ? styles.dropTarget : ''}`}>
              <div className={styles.person}>
                <button type="button" className={styles.handle} disabled={disabled} onPointerDown={(event) => startDrag(event, entry)} onPointerMove={moveDrag} onPointerUp={finishDrag} onPointerCancel={stopDrag} onLostPointerCapture={stopDrag}
                  aria-label={`Drag ${entry.name}, position ${index + 1}; use adjacent buttons to move with keyboard`} title="Drag to reorder">⠿</button>
                <span className={styles.position}>{index + 1}</span><strong>{entry.name}</strong>
              </div>
              {audienceMatches[entry.id] && <div className={styles.chips} aria-label={entry.name + ' private customer details'}>
                {audienceMatches[entry.id].birthday && <span>🎂 {audienceMatches[entry.id].birthday}</span>}
                {audienceMatches[entry.id].preferences.map((preference, chipIndex) => <span key={chipIndex}>{preference}</span>)}
              </div>}
              <div className={styles.actions}>
                <button type="button" disabled={disabled || index === 0} aria-label={`Move ${entry.name} up from position ${index + 1}`} onClick={() => { const command = moveCommand(entries, index, -1); if (command) void submit(command) }}>↑</button>
                <button type="button" disabled={disabled || index === entries.length - 1} aria-label={`Move ${entry.name} down from position ${index + 1}`} onClick={() => { const command = moveCommand(entries, index, 1); if (command) void submit(command) }}>↓</button>
                {!compact && <button type="button" disabled={disabled || index === 0} aria-label={`Reveal ${entry.name} next, position ${index + 1}`} onClick={() => void submit({ type: 'reveal-next', entryId: entry.id })}>Reveal next</button>}
                {!compact && <button type="button" disabled={disabled} aria-label={`Hold ${entry.name} for later, position ${index + 1}`} onClick={() => void submit({ type: 'hold', entryId: entry.id })}>Hold</button>}
              </div>
            </li>
          ))}
        </ol>
        {dragging && <div className={styles.endDrop}>Drop at end of lineup</div>}
        {!compact && !!snapshot?.heldEntries.length && <section className={styles.held} aria-label="Held for later">
          <h3>Held for later <span>{snapshot.heldEntries.length}</span></h3>
          <ul className={styles.list}>{snapshot.heldEntries.map((entry, index) => <li key={entry.id} data-lineup-entry={entry.id} tabIndex={-1} aria-label={`${entry.name}, held for later, position ${index + 1}`} className={styles.heldRow}><strong>{entry.name}</strong><button type="button" disabled={disabled} aria-label={`Return ${entry.name} to lineup, held position ${index + 1}`} onClick={() => void submit({ type: 'return', entryId: entry.id })}>Return</button></li>)}</ul>
        </section>}
        {!compact && snapshot && <LiveLineupShowControls snapshot={snapshot} disabled={recoveryDisabled || !!dragging} submit={submit} />}
        {!compact && <LiveLineupPublisherControls recoveryOnly onChanged={refresh} disabled={saving || !!dragging} creationDisabled={viewOnly} />}
        {!compact && snapshot && <LiveLineupArchiveControls snapshot={snapshot} disabled={recoveryDisabled || !!dragging} recover={recover} />}
      </div>
      {!compact && <footer className={styles.footer}>
        <button type="button" disabled={disabled || !!dragging || !snapshot?.undoAvailable} title="Undo the last reorder, Reveal next, Hold, or Return—not party visibility" onClick={() => void submit({ type: 'undo' })}>Undo order / hold</button>
        <span>Bomb Party orders are unchanged.</span>
      </footer>}
    </section>
  )
}
