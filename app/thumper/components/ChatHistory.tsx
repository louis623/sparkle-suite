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

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // Hybrid scroll strategy. Smooth-scroll-on-every-token can't keep up with
    // streaming (tokens arrive every ~50-100ms; smooth animations take ~300ms),
    // so the viewport falls behind and the chat appears to "expand off-screen"
    // until streaming finishes. Instead:
    //   - Tight RO bursts (gap <= STREAMING_GAP_MS) → instant scroll. This is
    //     active streaming; we need the viewport pinned to bottom every tick.
    //   - Quiet-then-fire (gap > STREAMING_GAP_MS) → smooth scroll. This is a
    //     discrete event: new user message, streaming complete repaint, etc.
    // Seeded with `performance.now()` so the very first RO fire after mount
    // (history populating into the DOM) is treated as a tight follow-up — no
    // animated slide on initial load.
    const STREAMING_GAP_MS = 200
    const SMOOTH_GUARD_MS = 600
    let lastFireTime = performance.now()
    let smoothGuardTimer: ReturnType<typeof setTimeout> | null = null
    let isAnimatingSmooth = false

    const updateStick = () => {
      stickToBottomRef.current =
        scroll.scrollTop + scroll.clientHeight >= scroll.scrollHeight - NEAR_BOTTOM_PX
    }

    const onScroll = () => {
      // Suppress only during smooth animations; instant scrollTop=scrollHeight
      // assignments leave us at the bottom so updateStick() correctly keeps
      // stickiness asserted.
      if (isAnimatingSmooth) return
      updateStick()
    }
    scroll.addEventListener('scroll', onScroll, { passive: true })

    const triggerScroll = () => {
      const now = performance.now()
      const gap = now - lastFireTime
      lastFireTime = now

      if (prefersReduced || gap <= STREAMING_GAP_MS) {
        // Instant. Cancels any in-flight smooth animation by direct assignment;
        // that's intentional — streaming just resumed, catch up immediately.
        if (smoothGuardTimer !== null) {
          clearTimeout(smoothGuardTimer)
          smoothGuardTimer = null
        }
        isAnimatingSmooth = false
        scroll.scrollTop = scroll.scrollHeight
        return
      }

      // Smooth — discrete transition.
      isAnimatingSmooth = true
      scroll.scrollTo({ top: scroll.scrollHeight, behavior: 'smooth' })
      if (smoothGuardTimer !== null) clearTimeout(smoothGuardTimer)
      smoothGuardTimer = setTimeout(() => {
        smoothGuardTimer = null
        isAnimatingSmooth = false
      }, SMOOTH_GUARD_MS)
    }

    const ro = new ResizeObserver(() => {
      if (!stickToBottomRef.current) return
      triggerScroll()
    })
    ro.observe(inner)

    // Initial snap stays instant — animating the first paint looks worse.
    scroll.scrollTop = scroll.scrollHeight

    return () => {
      scroll.removeEventListener('scroll', onScroll)
      ro.disconnect()
      if (smoothGuardTimer !== null) clearTimeout(smoothGuardTimer)
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
