'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { PointerEvent, KeyboardEvent, ReactNode, RefObject } from 'react'
import { createPortal } from 'react-dom'
import type { WorkspaceLineupEntry, WorkspaceLineupSnapshot } from '@/lib/live-lineup/types'
import { canAcceptWorkspaceRefresh, canRecoverLineup, workspaceFreshnessDeadline, workspaceWriteEligible, canRebaseDrag, dragScrollDelta, edgeScrollSpeed, isLineupCommandAcknowledgement, isShowCommandAcknowledgement, isWorkspaceLineupSnapshot, pointerDropAnchor } from './live-lineup-client'
import type { WorkspaceLineupCommand } from './live-lineup-client'
import styles from './LiveLineupCard.module.css'
import palette from './RepDashboard.module.css'
import { LineupCustomerEditor } from './LineupCustomerEditor'
import { useLineupAudience } from './use-lineup-audience'
import { ControlTip } from './ControlTip'
import { LiveLineupExtensionDetails, LiveLineupShowControls, ShowActionButton } from './LiveLineupShowControls'
import { LiveLineupArchiveControls } from './LiveLineupArchiveControls'
import { LiveLineupPublisherControls } from './LiveLineupPublisherControls'
import { archiveRecoveryRequest, isArchiveRecoveryAcknowledgement, type ArchiveDetail } from './live-lineup-archive-client'
import { canConfirmShow } from './live-lineup-client'
import { groupLineupEntries, moveLineupCustomer } from '@/lib/live-lineup/grouping'
import { workspaceLineupStatus } from '@/lib/live-lineup/status-copy'
import { SHOW_CHANGED_ELSEWHERE, type ShowAction, type ShowCommand } from '@/lib/live-lineup/show-control'
import { isDemoLineupSnapshot } from '@/lib/live-lineup/demo'

const ENDPOINT = '/api/workspace/live-lineup'

type LineupGroupKeyInput = { tuple: string | null; members: readonly string[] }

/** Keys for one displayed group list. The same customer can occupy two non-adjacent groups. */
export function lineupGroupKeys(groups: readonly LineupGroupKeyInput[]): string[] {
  const seen = new Map<string, number>()
  return groups.map(group => {
    if (group.tuple === null) return `o:${group.members[0]}`
    const earlier = seen.get(group.tuple) ?? 0
    seen.set(group.tuple, earlier + 1)
    return `c:${group.tuple}#${earlier}`
  })
}

export function LiveLineupCard({ compact = false, readOnly = false, onAskCustomer }: { compact?: boolean; readOnly?: boolean; onAskCustomer?:(prompt:string)=>void }) {
  const [customerSelection,setCustomerSelection] = useState<{entry:WorkspaceLineupEntry;generation:number}|null>(null)
  const headingId = useId()
  const popupTitleId = useId()
  const orderDetailsId = useId()
  const [popup, setPopup] = useState<'status' | 'full' | null>(null)
  const popupRef = useRef<HTMLDialogElement>(null)
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())
  const keyboardInstructionsId = useId()
  const [snapshot, setSnapshot] = useState<WorkspaceLineupSnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)
  const [pendingMove, setPendingMove] = useState<{entryId: string; beforeEntryId: string | null} | null>(null)
  const [dragging, setDragging] = useState<string | null>(null)
  const [dropBefore, setDropBefore] = useState<string | null>(null)
  const [dropValid, setDropValid] = useState(false)
  const dragPreview = useRef<HTMLDivElement>(null)
  const dropMarker = useRef<HTMLDivElement>(null)
  const snapshotRef = useRef(snapshot)
  const active = useRef(true)
  const mutation = useRef(false)
  const readController = useRef<AbortController | null>(null)
  const writeController = useRef<AbortController | null>(null)
  const requestGeneration = useRef(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const pointerDrag = useRef<{ id: string; pointerId: number; target: HTMLElement; startX: number; startY: number; x: number; y: number; started: boolean; valid: boolean; before: string | null; baseline: WorkspaceLineupSnapshot; width: number; offsetX: number; offsetY: number; previewWidth: number; previewHeight: number; rows: { id: string; top: number; bottom: number }[] } | null>(null)
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
    setDropValid(false)
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
    if (snapshotRef.current?.showControl?.runId !== next.showControl?.runId) stopDrag()
    if (tenantChanged) { stopDrag(); setExpanded(new Set()); setPopup(null); setCustomerSelection(null) }
    const now = performance.now()
    freshnessDeadline.current = requestEpoch === lifecycleEpoch.current ? workspaceFreshnessDeadline(next, requestStarted, now) : 0
    suspended.current = document.hidden || requestEpoch !== lifecycleEpoch.current
    if (freshnessTimer.current !== null) window.clearTimeout(freshnessTimer.current)
    const isFresh = !suspended.current && now < freshnessDeadline.current
    setFresh(isFresh)
    if (isFresh) freshnessTimer.current = window.setTimeout(() => {
      freshnessDeadline.current = 0
      if (pointerDrag.current?.started) setNotice('Move canceled. Waiting for a fresh Bomb Party update before you can move customers again.')
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
    const observer = new ResizeObserver(() => {
      const drag = pointerDrag.current
      const scroller = scrollRef.current
      // Drag feedback changes the viewport's height. Frozen row coordinates
      // remain valid; only a width change can reflow them and invalidate a drop.
      if (drag && scroller && drag.width !== scroller.clientWidth) onResize()
    })
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
    const lineupGroups = snapshot ? groupLineupEntries(snapshot.entries) : []
    const groupIndex = lineupGroups.findIndex(group => group.members.includes(id))
    const group = groupIndex >= 0 ? lineupGroups[groupIndex] : undefined
    const groupKey = groupIndex >= 0 ? lineupGroupKeys(lineupGroups)[groupIndex] : undefined
    if (group && id !== group.members[0] && group.members.length > 1 && groupKey && !expanded.has(groupKey)) {
      setExpanded(current => new Set([...current, groupKey]))
      return
    }
    const row = scroller.querySelector<HTMLElement>(`[data-lineup-entry="${CSS.escape(id)}"]`)
    if (!row) return
    focusAfterSave.current = null
    // Holding/returning removes the focused button. Restore focus to the moved item
    // without scrolling the entire Workspace, including when it changed lists.
    const focusTarget = row.querySelector<HTMLElement>('[data-lineup-grab]') ?? row
    focusTarget.focus({ preventScroll: true })
    const box = scroller.getBoundingClientRect()
    const item = row.getBoundingClientRect()
    if (item.top < box.top) scroller.scrollTop += item.top - box.top
    else if (item.bottom > box.bottom) scroller.scrollTop += item.bottom - box.bottom
  }, [snapshot, saving, expanded])

  const submit = useCallback(async (command: WorkspaceLineupCommand, dragBaseline?: WorkspaceLineupSnapshot, preview?: WorkspaceLineupSnapshot) => {
    let current = snapshotRef.current
    const recovery = command.type === 'start-show' || command.type === 'filter-parties'
    if (readOnly || !current || mutation.current || pointerDrag.current || uncertainChange.current || !active.current || document.hidden
      || (recovery ? suspended.current || !canRecoverLineup(current) : !workspaceWriteEligible(current, freshnessDeadline.current, performance.now(), suspended.current))) return
    if (preview && !canConfirmShow(preview, current)) { setNotice(command.type === 'filter-parties'
      ? 'The show or its customers changed. Check the current party controls before trying again.'
      : 'The lineup changed. Review it again before confirming.'); return false }
    mutation.current = true
    setSaving(true)
    if (command.type === 'move-customer') setPendingMove(command)
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
      // Only retry confirmed revision conflicts with an unchanged lineup. A
      // second heartbeat can race the first retry; real order changes still stop.
      for (let attempt = 0; attempt < 3; attempt++) {
      if (document.hidden || suspended.current || (!recovery && !workspaceWriteEligible(current, freshnessDeadline.current, performance.now(), false))) return false
      const requestStarted = performance.now()
      const requestEpoch = lifecycleEpoch.current
      const response = await fetch(ENDPOINT, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
        body: JSON.stringify({ expectedRevision: current.revision, command }),
      })
      if (response.status === 409) {
        const failure: unknown = await response.json()
        if (attempt < 2 && dragBaseline && command.type === 'move-customer' && failure && typeof failure === 'object'
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
        if (active.current) setNotice(failure && typeof failure === 'object' && (failure as {error?: unknown}).error === 'source_not_ready'
          ? 'Move not saved. Waiting for a fresh Bomb Party update before you can move customers again.'
          : 'The lineup changed while you were moving this customer. Refreshed the list—please choose their position again.')
        reload = true
        return
      }
      if (!response.ok) throw new Error('Save failed')
      const next: unknown = await response.json()
      if (!isWorkspaceLineupSnapshot(next) || !isLineupCommandAcknowledgement(current, next, command)) throw new Error('Missing save acknowledgment')
      accept(next, requestStarted, requestEpoch)
      if ('entryId' in command) focusAfterSave.current = command.entryId
      if (active.current) setNotice(!next.canManage ? 'Saved. Waiting for the connection to resume.' : command.type === 'undo' ? 'Last change undone.' : command.type === 'start-show'
        ? 'Lineup reset saved. The extension will reconnect automatically.'
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
        setPendingMove(null)
        if (reload) void refresh()
      }
    }
  }, [accept, readOnly, refresh])

  function startDrag(event: PointerEvent<HTMLElement>, entry: WorkspaceLineupEntry) {
    const baseline = snapshotRef.current
    if (readOnly || !baseline || !canWriteNow() || uncertainChange.current || mutation.current || !event.isPrimary || event.button !== 0) return
    ++requestGeneration.current
    readController.current?.abort()
    readController.current = null
    const box = event.currentTarget.closest<HTMLElement>('[data-lineup-active]')!.getBoundingClientRect()
    pointerDrag.current = { offsetX: event.clientX - box.left, offsetY: event.clientY - box.top, previewWidth: box.width, previewHeight: box.height, id: entry.id, pointerId: event.pointerId, target: event.currentTarget, startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY, started: false, valid: false, before: null, baseline, width: -1, rows: [] }
    const scroller = scrollRef.current
    if (scroller) {
      const bounds = scroller.getBoundingClientRect()
      pointerDrag.current.width = scroller.clientWidth
      pointerDrag.current.rows = Array.from(scroller.querySelectorAll<HTMLElement>('[data-lineup-active]')).map(row => {
        const box = row.getBoundingClientRect()
        row.style.height = box.height + 'px'; row.style.boxSizing = 'border-box'
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
    const listBottom = scroller.querySelector<HTMLOListElement>('[aria-label="Customers waiting"]')?.getBoundingClientRect().bottom ?? bounds.bottom
    drag.valid = drag.x >= bounds.left && drag.x <= bounds.right && drag.y >= bounds.top && drag.y <= Math.min(bounds.bottom, listBottom + 12)
    scrollSpeed.current = drag.valid ? edgeScrollSpeed(drag.y, bounds.top, bounds.bottom) : 0
    setDropValid(drag.valid)
    if (dragPreview.current) {
      dragPreview.current.style.transform = `translate3d(${drag.x - drag.offsetX}px, ${drag.y - drag.offsetY}px, 0)`
      dragPreview.current.style.opacity = drag.valid ? '1' : '.6'
    }
    if (dropMarker.current) dropMarker.current.hidden = !drag.valid
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
    const anchor = drag.rows.find(row => row.id === drag.before)
    const lineY = bounds.top + (anchor?.top ?? drag.rows.at(-1)?.bottom ?? 0) - scroller.scrollTop
    if (dropMarker.current) {
      dropMarker.current.style.transform = `translate3d(${bounds.left + 6}px, ${lineY}px, 0)`
      dropMarker.current.style.width = `${bounds.width - 18}px`
      dropMarker.current.hidden = lineY < bounds.top || lineY > bounds.bottom
    }
  }

  function moveDrag(event: PointerEvent<HTMLElement>) {
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

  function finishDrag(event: PointerEvent<HTMLElement>) {
    const drag = pointerDrag.current
    if (!drag || drag.pointerId !== event.pointerId) return
    drag.x = event.clientX
    drag.y = event.clientY
    updateDropTarget()
    const command = pointerDrag.current === drag && canWriteNow() && drag.started && drag.valid ? { type: 'move-customer' as const, entryId: drag.id, beforeEntryId: drag.before } : null
    stopDrag()
    if (command) {
      const current = snapshotRef.current?.entries ?? []
      const moved = moveLineupCustomer(current, command.entryId, command.beforeEntryId)
      if (moved?.some((entry, index) => entry.id !== current[index].id)) void submit(command, drag.baseline)
    }
  }

  function keyboardMove(event: KeyboardEvent<HTMLButtonElement>, entryId: string) {
    if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const baseline = snapshotRef.current
    if (!baseline || pointerDrag.current || !canWriteNow()) return
    const customers = groupLineupEntries(baseline.entries)
    const index = customers.findIndex(group => group.members[0] === entryId)
    if (index < 0) return
    const movingUp = event.key === 'Home' || event.key === 'ArrowUp'
    if (movingUp ? index === 0 : index === customers.length - 1) return
    const beforeEntryId = event.key === 'Home' ? customers[0].members[0]
      : event.key === 'End' ? null
      : event.key === 'ArrowUp' ? customers[index - 1].members[0] : customers[index + 2]?.members[0] ?? null
    void submit({type: 'move-customer', entryId, beforeEntryId}, baseline)
  }

  const publisherChangeDisabled = saving || uncertainChange.current
  const baseDisabled = publisherChangeDisabled || !fresh || !snapshot?.canManage || !snapshot?.authorized
  async function submitShowAction(action: ShowAction) {
    const current = snapshotRef.current
    if (readOnly || !current?.showControl || !current.authorized || current.runtimeWritable === false || mutation.current) return
    const command: ShowCommand = {type:action,requestId:crypto.randomUUID(),expectedControlRevision:current.showControl.revision}
    mutation.current = true
    const generation = ++requestGeneration.current
    readController.current?.abort()
    readController.current = null
    stopDrag()
    setSaving(true)
    setNotice('')
    const controller = new AbortController()
    writeController.current = controller
    const requestStarted = performance.now()
    const requestEpoch = lifecycleEpoch.current
    const timer = window.setTimeout(() => controller.abort(), 8000)
    let reload = false
    try {
      const response = await fetch(ENDPOINT, {method:'POST',headers:{'Content-Type':'application/json'},
        signal:controller.signal,body:JSON.stringify({command})})
      if (!active.current || generation !== requestGeneration.current) return
      if (response.status === 409 && (await response.json()).error === 'control_conflict') {
        setNotice(SHOW_CHANGED_ELSEWHERE)
        reload = true
        return
      }
      if (!response.ok) throw new Error('Show change unconfirmed')
      const next: unknown = await response.json()
      if (!isWorkspaceLineupSnapshot(next) || !isShowCommandAcknowledgement(current,next,command)
        || !accept(next,requestStarted,requestEpoch)) throw new Error('Show change unconfirmed')
      setError(null)
      setNotice(action === 'show-start' ? 'Show started.' : 'Show stopped.')
    } catch {
      if (active.current && generation === requestGeneration.current) {
        setNotice('The show change could not be confirmed. Review its status before trying again.')
        reload = true
      }
    } finally {
      window.clearTimeout(timer)
      if (writeController.current === controller) writeController.current = null
      if (generation === requestGeneration.current) {
        mutation.current = false
        if (active.current) {
          setSaving(false)
          if (reload) void refresh()
        }
      }
    }
  }

  const viewOnly = readOnly || snapshot?.authorized === false || snapshot?.runtimeWritable === false
  const disabled = viewOnly || baseDisabled
  const recoveryDisabled = readOnly || publisherChangeDisabled || suspended.current || !snapshot || !canRecoverLineup(snapshot)
  const signal = workspaceLineupStatus({
    connection: snapshot?.connection ?? null,
    warning: snapshot?.warning ?? null,
    readError: Boolean(error),
  })
  const originalEntries = snapshot?.entries ?? []
  const entries = pendingMove ? moveLineupCustomer(originalEntries, pendingMove.entryId, pendingMove.beforeEntryId) ?? originalEntries : originalEntries
  const groups = groupLineupEntries(entries)
  const groupKeys = lineupGroupKeys(groups)
  const draggedGroup = groups.find(group => group.members[0] === dragging)
  const draggedEntry = entries.find(entry => entry.id === dragging)
  const remainingGroups = groups.filter(group => group.members[0] !== dragging)
  const dropPosition = dropBefore ? remainingGroups.findIndex(group => group.members[0] === dropBefore) + 1 : groups.length
  const drag = pointerDrag.current
  const entryIndex = new Map(entries.map((entry, index) => [entry.id, index]))
  const entryById = new Map(entries.map(entry => [entry.id, entry]))
  const demoConnection = isDemoLineupSnapshot(snapshot)
  const statusLabel = demoConnection ? (signal.tone === 'updating' ? 'Demo connection' : 'Demo · ' + signal.label) : signal.tone === 'updating' ? 'Live' : signal.label
  const waitingForSource = Boolean(snapshot && !viewOnly && !saving && (!fresh || !snapshot.canManage || !snapshot.authorized))
  const receivedTime = snapshot?.lastReceivedAt && Number.isFinite(Date.parse(snapshot.lastReceivedAt))
    ? new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' }).format(new Date(snapshot.lastReceivedAt)) + ' ET'
    : 'No update received'

  function customerButton(entry: WorkspaceLineupEntry) {
    const status = audienceMatches[entry.id]?.status
    if (viewOnly || !entry.identityEligible || (status !== 'matched' && status !== 'needs_clarification') || !snapshot?.management) return null
    return <ControlTip tip="customer-card"><button type="button" className={styles.customerButton} data-clarify={status === 'needs_clarification'} disabled={saving || !!dragging}
      onClick={() => setCustomerSelection({ entry, generation: snapshot.management!.generation })}>{status === 'needs_clarification' ? 'Which customer?' : 'Customer card'}</button></ControlTip>
  }

  function orderControls(entry: WorkspaceLineupEntry, index: number, position: number | null, name: string, actions: boolean, draggable = true) {
    return <>
      {draggable ? <button type="button" data-lineup-grab className={`${styles.handle} ${styles.person}`} disabled={disabled}
        onKeyDown={(event) => keyboardMove(event, entry.id)}
        aria-label={`Move ${name}, position ${position ?? index + 1}`} aria-describedby={keyboardInstructionsId} title="Drag to reorder · Arrow keys to move">
        <svg className={styles.grip} width="14" height="18" viewBox="0 0 16 20" fill="currentColor" aria-hidden="true">
          {[5, 10, 15].flatMap(y => [5, 11].map(x => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.4" />))}
        </svg>
        {position !== null && <span className={styles.position}>{position}</span>}<strong style={position === null ? { gridColumn: '2 / -1' } : undefined}>{name}</strong>
      </button> : <strong className={styles.orderName}>{name}</strong>}
      {actions && <div className={styles.actions}>
        <ControlTip tip="reveal-next"><button type="button" disabled={disabled || index === 0} aria-label={`Reveal ${entry.name} next, position ${index + 1}`} onClick={() => void submit({ type: 'reveal-next', entryId: entry.id })}>Reveal next</button></ControlTip>
        <ControlTip tip="hold"><button type="button" disabled={disabled} aria-label={`Hold ${entry.name} for later, position ${index + 1}`} onClick={() => void submit({ type: 'hold', entryId: entry.id })}>Hold</button></ControlTip>
      </div>}
    </>
  }

  function renderEntries(full = false) {
    return <ol className={styles.list} aria-label="Customers waiting">
      {groups.map((group, groupIndex) => {
        const key = groupKeys[groupIndex]
        const entry = entryById.get(group.members[0])!
        const multiple = group.members.length > 1
        const open = multiple && expanded.has(key)
        const detailsId = `${orderDetailsId}-${full ? 'full' : 'card'}-${groupIndex}`
        const cardAction = customerButton(group.members.map(id => entryById.get(id)!).find(item => audienceMatches[item.id]?.status === 'matched') ?? group.members.map(id => entryById.get(id)!).find(item => audienceMatches[item.id]?.status === 'needs_clarification') ?? entry)
        return <li key={key} data-lineup-entry={entry.id} data-lineup-active tabIndex={-1}
          onPointerDown={(event) => {
            const target = event.target instanceof Element ? event.target : null
            // The orders pill and Customer card live in the right-hand actions.
            // A press there bubbles to this row and must not start a drag, or the
            // row freezes its height and the disclosure looks like it is opening
            // and closing by itself. The controls do not stop the event.
            if (!target || target.closest('[data-lineup-order-detail], [data-lineup-row-actions], button:not([data-lineup-grab]), a, input')) return
            startDrag(event, entry)
          }}
          onPointerMove={moveDrag} onPointerUp={finishDrag} onPointerCancel={stopDrag} onLostPointerCapture={stopDrag}
          aria-label={`${group.name}, position ${groupIndex + 1}`}
          className={`${styles.row} ${fresh && snapshot?.connection === 'connected' && groupIndex === 0 ? styles.now : ''} ${dragging === entry.id ? styles.dragging : ''}`}>
          {orderControls(entry, entryIndex.get(entry.id)!, groupIndex + 1, group.name, !multiple && (!compact || full))}
          {(multiple || cardAction) && <div className={styles.rowSide} data-lineup-row-actions>
            {multiple && <button type="button" className={styles.orderToggle} aria-expanded={open} aria-controls={detailsId}
              aria-label={`${group.members.length} orders for ${group.name}`} disabled={!!dragging || saving}
              onClick={() => {
                setExpanded(current => {
                  const next = new Set(current); if (next.has(key)) next.delete(key); else next.add(key); return next
                })
              }}>
              {group.members.length} orders <span aria-hidden="true">{open ? '⌄' : '›'}</span>
            </button>}
            {cardAction}
          </div>}
          {multiple && <ol id={detailsId} className={styles.orderList} hidden={!open} aria-label={`Individual orders for ${group.name}`}>
            {open && group.members.map((id, orderIndex) => {
              const order = entryById.get(id)!
              const index = entryIndex.get(id)!
              return <li key={id} data-lineup-entry={id} data-lineup-order-detail tabIndex={-1} aria-label={`${order.name}, order ${orderIndex + 1}, position ${index + 1}`}
                className={`${styles.orderRow} ${dragging === id ? styles.dragging : ''}`}>
                {orderControls(order, index, null, `Order ${orderIndex + 1}`, true, false)}
                {audienceMatches[id] && <div className={styles.chips} aria-label={order.name + ' private customer details'}>
                  {audienceMatches[id].birthday && <span>🎂 {audienceMatches[id].birthday}</span>}
                  {audienceMatches[id].preferences.map((preference, chipIndex) => <span key={chipIndex}>{preference}</span>)}
                </div>}
              </li>
            })}
          </ol>}
        </li>
      })}
    </ol>
  }
  return (
    <section className={`${palette.palette} ${styles.card} ${compact ? styles.compact : ''}`} aria-labelledby={headingId} aria-busy={saving}>
      <header className={styles.header}>
        <div className={styles.titleRow}><h2 id={headingId}>Live Lineup</h2>
          <span className={styles.queuePill}><span className={styles.count} data-empty={groups.length === 0}>{groups.length}</span> In Queue</span>
        </div>
        <div className={styles.headerActions}>
          <span className={styles.showChip} data-live={snapshot?.showControl?.phase === 'active'}>
            <span aria-hidden="true" />{snapshot?.showControl?.phase === 'active' ? 'Live' : 'Off'}
          </span>
          <ShowActionButton snapshot={snapshot} disabled={viewOnly || saving || !snapshot?.authorized} onAction={action => void submitShowAction(action)} />
          <button type="button" className={styles.fullButton} aria-haspopup="dialog" onClick={() => { stopDrag(); setPopup('full') }}>↗ Full lineup</button>
        </div>
      </header>
      <LiveLineupExtensionDetails snapshot={snapshot} label={statusLabel} tone={signal.tone} onStatus={() => { stopDrag(); setPopup('status') }} />
      <p id={keyboardInstructionsId} className={styles.srOnly}>Keyboard: focus a customer, then use Up or Down to move all their orders one place, Home for first, or End for last. Press Escape to cancel a drag.</p>
      {(dragging || saving || error || notice || viewOnly) && <div className={styles.feedback} aria-live="polite" aria-atomic="true">
        {dragging ? (dropValid ? `Release to place at position ${dropPosition}` : 'Move back into the lineup to drop') : saving ? 'Saving…' : error ? 'We can’t update your lineup right now. We’ll keep trying.' : notice || 'Lineup changes are temporarily unavailable. Customer updates will continue.'}
      </div>}
      <div ref={popup === 'full' ? undefined : scrollRef} className={styles.scroll} tabIndex={0} role="region" aria-label="Scrollable live lineup" aria-describedby={keyboardInstructionsId}
        onKeyDown={(event) => { if (event.key === 'Escape') stopDrag() }}>
        {!snapshot && <p className={styles.empty}>{error ? 'Your lineup is unavailable right now. No orders have been changed.' : 'Loading your lineup…'}</p>}
        {snapshot && !entries.length && <p className={styles.empty}>{snapshot.management?.candidates.some(entry => !entry.held)
          ? 'Some waiting customers are hidden. Open the Live Lineup tool to show them.'
          : snapshot.connection === 'connected' ? 'No customers are waiting right now.' : 'Once connected, customers will appear here.'}</p>}
        {renderEntries()}
        {!compact && !!snapshot?.heldEntries.length && <section className={styles.held} aria-label="Held for later">
          <h3>Held for later <span>{snapshot.heldEntries.length}</span></h3>
          <ul className={styles.list}>{snapshot.heldEntries.map((entry, index) => <li key={entry.id} data-lineup-entry={entry.id} tabIndex={-1} aria-label={`${entry.name}, held for later, position ${index + 1}`} className={styles.heldRow}>
            <strong>{entry.name}</strong>
            <div className={styles.heldActions}>
              {audienceMatches[entry.id]?.birthday || audienceMatches[entry.id]?.preferences.length ? <div className={styles.chips} aria-label={entry.name + ' private customer details'}>
                {audienceMatches[entry.id].birthday && <span>🎂 {audienceMatches[entry.id].birthday}</span>}
                {audienceMatches[entry.id].preferences.map((preference, chipIndex) => <span key={chipIndex}>{preference}</span>)}
              </div> : null}
              {customerButton(entry)}
              <ControlTip tip="return"><button type="button" disabled={disabled} aria-label={`Return ${entry.name} to lineup, held position ${index + 1}`} onClick={() => void submit({ type: 'return', entryId: entry.id })}>Return</button></ControlTip>
            </div>
          </li>)}</ul>
        </section>}
        {!compact && snapshot && <LiveLineupShowControls snapshot={snapshot} disabled={recoveryDisabled || !!dragging} submit={submit} />}
        {!compact && <LiveLineupPublisherControls recoveryOnly onChanged={refresh} disabled={saving || !!dragging} creationDisabled={viewOnly} />}
        {!compact && snapshot && <LiveLineupArchiveControls snapshot={snapshot} disabled={recoveryDisabled || !!dragging} recover={recover} />}
      </div>
      {!compact && <footer className={styles.footer}>
        <button type="button" disabled={disabled || !!dragging || !snapshot?.undoAvailable} title="Undo the last reorder, Reveal next, Hold, or Return—not party visibility" onClick={() => void submit({ type: 'undo' })}>Undo order / hold</button>
        <span>Bomb Party orders are unchanged.</span>
      </footer>}
      {popup && <LineupDialog dialogRef={popupRef} titleId={popupTitleId} full={popup === 'full'} onClose={() => { stopDrag(); setPopup(null) }}>
        <header className={styles.modalHeader}>
          <div><p className={styles.eyebrow}>Live Lineup</p><h2 id={popupTitleId}>{popup === 'full' ? 'Full lineup' : 'Status'}</h2></div>
          <button type="button" className={styles.closeButton} onClick={() => { stopDrag(); setPopup(null) }} aria-label={popup === 'full' ? 'Close full lineup' : 'Close status'}>×</button>
        </header>
        {popup === 'full' ? <div ref={scrollRef} className={styles.scroll} tabIndex={0} role="region" aria-label="Full lineup orders" aria-describedby={keyboardInstructionsId}>
          {renderEntries(true)}
          {!entries.length && <p className={styles.empty}>No customers are waiting right now.</p>}
        </div> : <div className={styles.statusBody}>
          <span className={styles.statusChip} data-connection={signal.tone}><span className={styles.dot} aria-hidden="true" />{statusLabel}</span>
          {waitingForSource && <p>Waiting for a fresh source update. The last received order is preserved.</p>}
          {demoConnection && <p>Fictional orders for Fizz Festival. The demo stays connected while this workspace is open.</p>}
          <dl className={styles.metaList}>
            <div><dt>Last received</dt><dd>{receivedTime}</dd></div>
            <div><dt>Connection</dt><dd>{snapshot?.connection ? snapshot.connection[0].toUpperCase() + snapshot.connection.slice(1) : 'Connecting'}</dd></div>
          </dl>
        </div>}
      </LineupDialog>}
      {customerSelection && <LineupCustomerEditor entry={customerSelection.entry} generation={customerSelection.generation} valid={snapshot?.management?.generation===customerSelection.generation && [...(snapshot?.entries??[]),...(snapshot?.heldEntries??[])].some(e=>e.id===customerSelection.entry.id && e.sourceIdentityVersion===customerSelection.entry.sourceIdentityVersion)} onClose={()=>setCustomerSelection(null)} onAsk={onAskCustomer} />}
      {draggedEntry && drag && createPortal(<>
        <div ref={dragPreview} className={styles.dragPreview} aria-hidden="true" data-lineup-drag-preview
          style={{width: drag.previewWidth, minHeight: drag.previewHeight, transform: `translate3d(${drag.x - drag.offsetX}px, ${drag.y - drag.offsetY}px, 0)`}}>
          <div className={styles.previewPerson}><svg className={styles.grip} width="16" height="20" viewBox="0 0 16 20" fill="currentColor" aria-hidden="true">{[5, 10, 15].flatMap(y => [5, 11].map(x => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.4" />))}</svg><strong>{draggedGroup?.name ?? draggedEntry.name}</strong></div>
          {draggedGroup && draggedGroup.members.length > 1 && <span className={styles.previewCaption}>{draggedGroup.members.length} orders · moving together</span>}
          {audienceMatches[draggedEntry.id] && <div className={`${styles.chips} ${styles.previewChips}`}>
            {audienceMatches[draggedEntry.id].birthday && <span>🎂 {audienceMatches[draggedEntry.id].birthday}</span>}
            {audienceMatches[draggedEntry.id].preferences.map((value, index) => <span key={index}>{value}</span>)}
          </div>}
          <span className={styles.previewCaption}>{dropValid ? `Position ${dropPosition}` : 'Outside lineup · release to cancel'}</span>
        </div>
        <div ref={dropMarker} className={styles.dropMarker} data-lineup-drop-marker aria-hidden="true" hidden={!dropValid} />
      </>, popup === 'full' && popupRef.current ? popupRef.current : document.body)}
    </section>
  )
}

/** Native top-layer isolation traps focus while preserving the workspace token inheritance. */
function LineupDialog({ dialogRef, titleId, full, onClose, children }: { dialogRef: RefObject<HTMLDialogElement | null>; titleId: string; full: boolean; onClose: () => void; children: ReactNode }) {
  const dialog = dialogRef
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    const node = dialog.current!
    node.showModal()
    document.body.style.overflow = 'hidden'
    return () => { node.close(); document.body.style.overflow = overflow; previous?.focus({ preventScroll: true }) }
  }, [dialog])
  return <dialog ref={dialog} role="dialog" aria-modal="true" aria-labelledby={titleId}
    className={`${styles.dialog} ${full ? styles.fullDialog : styles.statusDialog}`}
    onCancel={event => { event.preventDefault(); onClose() }} onKeyDown={event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose() }
      if (event.key === 'Tab') {
        const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), [tabindex="0"]')).filter(element => !element.closest('[hidden]'))
        const first = buttons[0], last = buttons.at(-1)
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
      }
    }}>{children}</dialog>
}
