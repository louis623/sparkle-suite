'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import styles from './ChatHistory.module.css'

const NEAR_BOTTOM_PX = 100

export function ChatHistory({ children }: { children: ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  // Defaults to true so the very first render snaps to bottom.
  const stickToBottomRef = useRef(true)

  useEffect(() => {
    const scroll = scrollRef.current
    const inner = innerRef.current
    if (!scroll || !inner) return

    const updateStick = () => {
      stickToBottomRef.current =
        scroll.scrollTop + scroll.clientHeight >= scroll.scrollHeight - NEAR_BOTTOM_PX
    }

    const onScroll = () => {
      updateStick()
    }
    scroll.addEventListener('scroll', onScroll, { passive: true })

    const ro = new ResizeObserver(() => {
      if (stickToBottomRef.current) {
        scroll.scrollTop = scroll.scrollHeight
      }
    })
    ro.observe(inner)

    // Initial snap.
    scroll.scrollTop = scroll.scrollHeight

    return () => {
      scroll.removeEventListener('scroll', onScroll)
      ro.disconnect()
    }
  }, [])

  return (
    <div ref={scrollRef} className={`${styles.scroll} thumper-scroll`}>
      <div ref={innerRef} className={styles.inner}>
        {children}
      </div>
    </div>
  )
}
