'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import styles from './ChatHistory.module.css'

const NEAR_BOTTOM_PX = 100

export function ChatHistory({
  children,
  isStreaming,
}: {
  children: ReactNode
  isStreaming: boolean
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  // Defaults to true so the very first render snaps to bottom.
  const stickToBottomRef = useRef(true)
  // Mirror prop into a ref so the ResizeObserver callback always reads the
  // current value (no stale closure).
  const isStreamingRef = useRef(isStreaming)
  useEffect(() => {
    isStreamingRef.current = isStreaming
  }, [isStreaming])

  useEffect(() => {
    const scroll = scrollRef.current
    const inner = innerRef.current
    if (!scroll || !inner) return

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // Hybrid scroll strategy, signal-driven:
    //   - During active streaming (isStreamingRef.current === true): instant
    //     scroll. Smooth animations queue up and fight rapidly arriving tokens,
    //     producing the "viewport falls behind, then jumps" glitch.
    //   - Discrete events (streaming completes, new conversation loaded):
    //     smooth scroll. Single-fire repaints look intentional with smooth.
    // The previous time-gap heuristic broke down when the model paused mid-
    // stream (between steps, during a tool call): gaps stretched past the
    // threshold, kicking off a smooth animation that fought the next token batch.
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
      if (prefersReduced || isStreamingRef.current) {
        // Instant. Cancels any in-flight smooth animation by direct assignment.
        isAnimatingSmooth = false
        scroll.scrollTop = scroll.scrollHeight
        return
      }
      // Smooth — discrete transition.
      isAnimatingSmooth = true
      scroll.scrollTo({ top: scroll.scrollHeight, behavior: 'smooth' })
      // Browser smooth-scroll completes within ~600ms; clear the flag after a
      // generous window so onScroll resumes updating stickiness.
      window.setTimeout(() => {
        isAnimatingSmooth = false
      }, 600)
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
