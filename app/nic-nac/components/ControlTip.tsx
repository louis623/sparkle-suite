'use client'

import { useId, useLayoutEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useDelayedHoverTip } from './use-delayed-hover-tip'
import { workspaceControlTipText, type WorkspaceControlTipId } from './workspace-control-tips'
import styles from './ControlTip.module.css'

export function ControlTip({
  tip,
  block = false,
  listItem = false,
  children,
}: {
  tip: WorkspaceControlTipId
  block?: boolean
  listItem?: boolean
  children: ReactNode
}) {
  const tipId = useId()
  const { rootRef, open, handlers } = useDelayedHoverTip()
  const [placed, setPlaced] = useState(false)
  const [box, setBox] = useState<{ top: number; left: number } | null>(null)
  const text = workspaceControlTipText(tip)

  useLayoutEffect(() => {
    if (!open) return
    const host = rootRef.current
    const bubble = document.getElementById(tipId)
    if (!host || !bubble) return

    const place = () => {
      const rect = host.getBoundingClientRect()
      const bubbleRect = bubble.getBoundingClientRect()
      const margin = 8
      let top = rect.top - bubbleRect.height - margin
      if (top < margin) top = Math.min(rect.bottom + margin, window.innerHeight - bubbleRect.height - margin)
      let left = rect.left
      const maxLeft = window.innerWidth - bubbleRect.width - margin
      if (left > maxLeft) left = Math.max(margin, maxLeft)
      if (left < margin) left = margin
      setBox({ top: Math.round(top), left: Math.round(left) })
      setPlaced(true)
    }

    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open, rootRef, text, tipId])

  return (
    <span
      ref={rootRef}
      className={block ? styles.hostBlock : styles.host}
      role={listItem ? 'listitem' : undefined}
      data-control-tip={tip}
      aria-describedby={open ? tipId : undefined}
      {...handlers}
    >
      {children}
      {open && typeof document !== 'undefined'
        ? createPortal(
            <p
              id={tipId}
              role="tooltip"
              className={styles.bubble}
              data-testid={`control-tip-${tip}`}
              data-placed={placed ? 'true' : 'false'}
              style={box ? { top: box.top, left: box.left } : undefined}
            >
              {text}
            </p>,
            document.body,
          )
        : null}
    </span>
  )
}
