import { describe, expect, it } from 'vitest'
import { CAROUSEL_DWELL_MS, CAROUSEL_FAILURE_MS, newCarouselClock, tickCarouselClock } from '@/lib/sparkle-suite/portfolio-carousel-playback'

describe('carousel viewing time', () => {
  it('does not spend dwell before actual playback begins', () => {
    let clock = tickCarouselClock(newCarouselClock(), 4_000, true, 'loading')
    expect(clock.viewedMs).toBe(0)
    clock = tickCarouselClock(clock, CAROUSEL_DWELL_MS - 1, true, 'playing')
    expect(clock.viewedMs).toBeLessThan(CAROUSEL_DWELL_MS)
    clock = tickCarouselClock(clock, 1, true, 'playing')
    expect(clock.viewedMs).toBe(CAROUSEL_DWELL_MS)
  })
  it.each(['paused by visitor', 'not centered', 'offscreen', 'hidden tab', 'reduced motion'])(
    'suspends both clocks when %s', () => {
      const clock = tickCarouselClock(newCarouselClock(), 3_000, true, 'playing')
      expect(tickCarouselClock(clock, 60_000, false, 'playing')).toBe(clock)
      expect(tickCarouselClock(clock, 60_000, false, 'waiting')).toBe(clock)
    },
  )
  it('suspends dwell while buffering and resumes the remaining viewing time', () => {
    let clock = tickCarouselClock(newCarouselClock(), 5_000, true, 'playing')
    clock = tickCarouselClock(clock, 4_000, true, 'waiting')
    expect(clock.viewedMs).toBe(5_000)
    clock = tickCarouselClock(clock, 10_000, true, 'playing')
    expect(clock).toEqual({ viewedMs: 15_000, waitingMs: 0, fallback: false })
  })
  it('shows the poster for a complete dwell after the bounded startup or stall deadline', () => {
    for (const state of ['loading', 'waiting'] as const) {
      let clock = tickCarouselClock(newCarouselClock(), 4_000, true, 'playing')
      clock = tickCarouselClock(clock, CAROUSEL_FAILURE_MS - 1, true, state)
      expect(clock.fallback).toBe(false)
      clock = tickCarouselClock(clock, 1, true, state)
      expect(clock).toEqual({ viewedMs: 0, waitingMs: 0, fallback: true })
      clock = tickCarouselClock(clock, CAROUSEL_DWELL_MS, true, state)
      expect(clock.viewedMs).toBe(CAROUSEL_DWELL_MS)
    }
  })
  it('shows a failed recording poster immediately and can retry with a fresh clock', () => {
    const failed = tickCarouselClock(newCarouselClock(), 100, true, 'error')
    expect(failed.fallback).toBe(true)
    expect(tickCarouselClock(newCarouselClock(), 200, true, 'playing')).toEqual({ viewedMs: 200, waitingMs: 0, fallback: false })
  })
  it('navigation resets waiting, dwell, and failure state', () => {
    const previous = tickCarouselClock(newCarouselClock(), 14_000, true, 'playing')
    expect(previous.viewedMs).toBe(14_000)
    const next = newCarouselClock()
    expect(next).toEqual({ viewedMs: 0, waitingMs: 0, fallback: false })
    expect(tickCarouselClock(next, 1_000, true, 'loading').viewedMs).toBe(0)
  })
})
