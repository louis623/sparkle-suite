'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import styles from './ChatHistory.module.css'

const NEAR_BOTTOM_PX = 80

export function ChatHistory({
  children,
  scrollKey,
}: {
  children: ReactNode
  // bumped on each new message — triggers auto-scroll if near bottom
  scrollKey: number | string
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const nearBottom =
      el.scrollTop + el.clientHeight >= el.scrollHeight - NEAR_BOTTOM_PX
    if (nearBottom) {
      el.scrollTop = el.scrollHeight
    }
  }, [scrollKey])

  return (
    <div ref={ref} className={`${styles.scroll} thumper-scroll`}>
      <div className={styles.inner}>{children}</div>
    </div>
  )
}
