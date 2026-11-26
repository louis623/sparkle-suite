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
  message,
}: {
  active: boolean
  count: number
  onDiscard: () => void
  openerRef?: RefObject<SiteDiscardOpener | null>
  message?: string | null
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
        if (!message) onDiscard()
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
        {message ?? discardConfirmMessage(count)}
      </h1>
      <form method="dialog" className={styles.dialogActions}>
        <button type="submit" className={styles.confirmDiscard} value="discard">
          {message ? 'Leave anyway' : 'Discard changes'}
        </button>
        <button type="submit" className={styles.keep} value="keep" autoFocus>
          Keep editing
        </button>
      </form>
    </dialog>
  )
}

const FIELD_CLEARANCE = 16

function fieldBlock(node: HTMLElement) {
  const field = node.closest('[data-site-field]')
  if (field instanceof HTMLElement) return field
  const label = node.closest('label')
  return label instanceof HTMLElement ? label : node
}

/** Bottom of the field, its helper text, and anything the input describes. */
function blockBottom(block: HTMLElement) {
  let bottom = block.getBoundingClientRect().bottom
  const control = block.querySelector('input, textarea, select')
  const described = control?.getAttribute('aria-describedby') ?? ''
  for (const id of described.split(/\s+/)) {
    if (!id) continue
    const extra = document.getElementById(id)
    if (extra) bottom = Math.max(bottom, extra.getBoundingClientRect().bottom)
  }
  for (const extra of block.querySelectorAll('[data-shows-on]')) {
    bottom = Math.max(bottom, extra.getBoundingClientRect().bottom)
  }
  return bottom
}

/** The bar's top, or the visual viewport when the keyboard covers the bar. */
function obstructionTop(bar: HTMLElement) {
  const barTop = bar.getBoundingClientRect().top
  const viewport = window.visualViewport
  if (!viewport) return barTop
  return Math.min(barTop, viewport.height)
}

function scrollByDelta(block: HTMLElement, delta: number) {
  let node: HTMLElement | null = block.parentElement
  while (node && node !== document.body && node !== document.documentElement) {
    const overflow = getComputedStyle(node).overflowY
    if (
      (overflow === 'auto' || overflow === 'scroll' || overflow === 'overlay')
      && node.scrollHeight > node.clientHeight + 1
    ) {
      node.scrollTop += delta
      return
    }
    node = node.parentElement
  }
  const root = document.scrollingElement
  if (root) root.scrollTop += delta
}

function useSaveBarOffset(barRef: RefObject<HTMLDivElement | null>, active: boolean) {
  const lastField = useRef<HTMLElement | null>(null)
  useEffect(() => {
    const root = document.documentElement
    const onFocusIn = (event: FocusEvent) => {
      const target = event.target
      if (target instanceof HTMLElement && target.closest('[data-site-field]')) {
        root.dataset.siteFieldFocus = 'true'
      }
    }
    const onFocusOut = (event: FocusEvent) => {
      const next = event.relatedTarget
      if (next instanceof HTMLElement && next.closest('[data-site-field]')) return
      delete root.dataset.siteFieldFocus
    }
    document.addEventListener('focusin', onFocusIn)
    document.addEventListener('focusout', onFocusOut)
    return () => {
      document.removeEventListener('focusin', onFocusIn)
      document.removeEventListener('focusout', onFocusOut)
      delete root.dataset.siteFieldFocus
    }
  }, [])
  useLayoutEffect(() => {
    const root = document.documentElement
    if (!active) {
      lastField.current = null
      delete root.dataset.siteSaveBar
      root.style.removeProperty('--site-save-bar-height')
      root.style.removeProperty('--site-save-bar-stack')
      root.style.removeProperty('--site-save-bar-block')
      root.style.scrollPaddingBottom = ''
      root.style.paddingBottom = ''
      return
    }
    root.dataset.siteSaveBar = 'open'
    const rememberField = (bar: HTMLElement) => {
      const activeNode = document.activeElement
      if (!(activeNode instanceof HTMLElement) || bar.contains(activeNode)) return
      const block = fieldBlock(activeNode)
      if (!bar.contains(block)) lastField.current = block
    }
    const clear = (bar: HTMLElement) => {
      rememberField(bar)
      const block = lastField.current
      if (!block?.isConnected || bar.contains(block)) return
      const limit = obstructionTop(bar) - FIELD_CLEARANCE
      const bottom = blockBottom(block)
      const top = block.getBoundingClientRect().top
      if (bottom <= limit || top >= bar.getBoundingClientRect().bottom) return
      // Instant in every case, including prefers-reduced-motion: reduce.
      // A smooth correction loses to the browser's focus scroll and leaves the helper under the bar.
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      scrollByDelta(block, bottom - limit)
      if (reduceMotion) return
    }
    const apply = () => {
      const bar = barRef.current
      const tabs = document.querySelector('[data-workspace-tab-bar]')
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight
      const tabTop = tabs?.getBoundingClientRect().top ?? viewportHeight
      const clearance = Math.max(0, viewportHeight - tabTop)
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
    const settle = () => {
      const bar = barRef.current
      if (bar) clear(bar)
    }
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(apply)
    if (barRef.current) observer?.observe(barRef.current)
    const tabs = document.querySelector('[data-workspace-tab-bar]')
    if (tabs) observer?.observe(tabs)
    const viewport = window.visualViewport
    window.addEventListener('resize', apply)
    window.addEventListener('focusin', settle)
    viewport?.addEventListener('resize', apply)
    viewport?.addEventListener('scroll', settle)
    let secondFrame = 0
    const frame = window.requestAnimationFrame(() => {
      settle()
      secondFrame = window.requestAnimationFrame(settle)
    })
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', apply)
      window.removeEventListener('focusin', settle)
      viewport?.removeEventListener('resize', apply)
      viewport?.removeEventListener('scroll', settle)
      window.cancelAnimationFrame(frame)
      window.cancelAnimationFrame(secondFrame)
      delete root.dataset.siteSaveBar
      root.style.removeProperty('--site-save-bar-height')
      root.style.removeProperty('--site-save-bar-stack')
      root.style.removeProperty('--site-save-bar-block')
      root.style.scrollPaddingBottom = ''
      root.style.paddingBottom = ''
    }
  }, [active, barRef])
}
