'use client'

import { useEffect, useId, useLayoutEffect, useRef, type RefObject } from 'react'
import { ControlTip } from './ControlTip'
import {
  discardConfirmMessage,
  SAVED_LABEL,
  unsavedChangesLabel,
  workspaceLeaveHref,
} from './site-settings-save'
import styles from './SiteSaveBar.module.css'

export function SiteSaveBar({
  changes,
  pending = false,
  saved = false,
  serverError = null,
  onDiscard,
  onSave,
}: {
  changes: string[]
  pending?: boolean
  saved?: boolean
  serverError?: string | null
  onDiscard: () => void
  onSave: () => void
}) {
  const barRef = useRef<HTMLDivElement>(null)
  const visible = changes.length > 0 || pending || saved || Boolean(serverError)
  useSaveBarOffset(barRef, visible)
  if (!visible) return null

  const showingSaved = saved && changes.length === 0 && !pending && !serverError
  const status = pending
    ? 'Saving...'
    : showingSaved
      ? SAVED_LABEL
      : unsavedChangesLabel(changes.length)

  return (
    <div ref={barRef} className={styles.bar} data-testid="site-save-bar" data-site-save-bar="">
      <div className={styles.copy}>
        <p className={styles.status} role="status" data-testid="site-save-status">
          {status}
        </p>
        {changes.length > 0 ? <p className={styles.changes}>{changes.join(', ')}</p> : null}
      </div>
      {serverError ? (
        <p className={styles.error} role="alert">
          {serverError}
        </p>
      ) : null}
      {showingSaved ? null : (
        <div className={styles.actions}>
          <button type="button" className={styles.discard} onClick={onDiscard} disabled={pending}>
            Discard
          </button>
          <ControlTip tip="save-site-settings">
            <button type="button" className={styles.save} onClick={onSave} disabled={pending}>
              {pending ? 'Saving...' : 'Save & publish'}
            </button>
          </ControlTip>
        </div>
      )}
    </div>
  )
}

export type SiteDiscardOpener = { open: () => void }

export function SiteLeaveGuard({
  active,
  count,
  onDiscard,
  openerRef,
}: {
  active: boolean
  count: number
  onDiscard: () => void
  openerRef?: RefObject<SiteDiscardOpener | null>
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const pendingHref = useRef<string | null>(null)
  const allowUnload = useRef(false)

  useEffect(() => {
    if (!openerRef) return
    openerRef.current = {
      open: () => {
        pendingHref.current = null
        dialogRef.current?.showModal()
      },
    }
    return () => {
      openerRef.current = null
    }
  }, [openerRef])

  useEffect(() => {
    if (!active) return
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (allowUnload.current) return
      event.preventDefault()
      event.returnValue = ''
    }
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const anchor = (event.target as Element | null)?.closest?.('a')
      if (!anchor) return
      const href = workspaceLeaveHref({
        href: anchor.getAttribute('href'),
        currentHref: window.location.href,
        target: anchor.getAttribute('target'),
        download: anchor.hasAttribute('download'),
      })
      if (!href) return
      event.preventDefault()
      event.stopPropagation()
      pendingHref.current = href
      dialogRef.current?.showModal()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    document.addEventListener('click', onClick, true)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      document.removeEventListener('click', onClick, true)
    }
  }, [active])

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby={titleId}
      onClose={(event) => {
        const dialog = event.currentTarget
        const choice = dialog.returnValue
        dialog.returnValue = ''
        if (choice !== 'discard') {
          pendingHref.current = null
          return
        }
        const href = pendingHref.current
        pendingHref.current = null
        onDiscard()
        if (href) {
          allowUnload.current = true
          window.location.assign(href)
          window.setTimeout(() => {
            allowUnload.current = false
          }, 1500)
        }
      }}
    >
      <h1 id={titleId} className={styles.dialogTitle}>
        {discardConfirmMessage(count)}
      </h1>
      <form method="dialog" className={styles.dialogActions}>
        <button type="submit" className={styles.confirmDiscard} value="discard">
          Discard changes
        </button>
        <button type="submit" className={styles.keep} value="keep" autoFocus>
          Keep editing
        </button>
      </form>
    </dialog>
  )
}

const FIELD_CLEARANCE = 16

function useSaveBarOffset(barRef: RefObject<HTMLDivElement | null>, active: boolean) {
  const lastField = useRef<HTMLElement | null>(null)
  useLayoutEffect(() => {
    const root = document.documentElement
    if (!active) {
      lastField.current = null
      root.style.removeProperty('--site-save-bar-height')
      root.style.removeProperty('--site-save-bar-stack')
      root.style.removeProperty('--site-save-bar-block')
      root.style.scrollPaddingBottom = ''
      root.style.paddingBottom = ''
      return
    }
    const rememberField = (bar: HTMLElement) => {
      const activeNode = document.activeElement
      if (!(activeNode instanceof HTMLElement) || bar.contains(activeNode)) return
      const block = activeNode.closest('[data-site-field], label')
      if (block instanceof HTMLElement && !bar.contains(block)) lastField.current = block
    }
    const clear = (bar: HTMLElement) => {
      rememberField(bar)
      const block = lastField.current
      if (!block?.isConnected || bar.contains(block)) return
      const barRect = bar.getBoundingClientRect()
      const blockRect = block.getBoundingClientRect()
      const limit = barRect.top - FIELD_CLEARANCE
      if (blockRect.bottom <= limit || blockRect.top >= barRect.bottom) return
      const delta = blockRect.bottom - limit
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const behavior = reduce ? 'auto' : 'smooth'
      const scroller = block.closest('[data-workspace-scroll]')
      if (scroller instanceof HTMLElement && scroller.scrollHeight > scroller.clientHeight + 1) {
        scroller.scrollBy({ top: delta, behavior })
      } else {
        window.scrollBy({ top: delta, behavior })
      }
    }
    const apply = () => {
      const bar = barRef.current
      const tabs = document.querySelector('[data-workspace-tab-bar]')
      const tabTop = tabs?.getBoundingClientRect().top ?? window.innerHeight
      const clearance = Math.max(0, window.innerHeight - tabTop)
      if (bar) bar.style.bottom = `${clearance + 8}px`
      const block = (bar?.offsetHeight ?? 0) + FIELD_CLEARANCE
      const stack = block + clearance
      root.style.setProperty('--site-save-bar-height', `${stack}px`)
      root.style.setProperty('--site-save-bar-stack', `${stack}px`)
      root.style.setProperty('--site-save-bar-block', `${block}px`)
      root.style.scrollPaddingBottom = `${stack}px`
      root.style.paddingBottom = document.querySelector('[data-workspace-scroll]') ? '' : `${block}px`
      if (bar) clear(bar)
    }
    apply()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(apply)
    if (barRef.current) observer?.observe(barRef.current)
    const tabs = document.querySelector('[data-workspace-tab-bar]')
    if (tabs) observer?.observe(tabs)
    window.addEventListener('resize', apply)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', apply)
      root.style.removeProperty('--site-save-bar-height')
      root.style.removeProperty('--site-save-bar-stack')
      root.style.removeProperty('--site-save-bar-block')
      root.style.scrollPaddingBottom = ''
      root.style.paddingBottom = ''
    }
  }, [active, barRef])
}
