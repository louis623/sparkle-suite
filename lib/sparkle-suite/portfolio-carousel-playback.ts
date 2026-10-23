export type PeekPlaybackState = 'idle' | 'loading' | 'playing' | 'waiting' | 'paused' | 'error'
export const CAROUSEL_DWELL_MS = 15_000
export const CAROUSEL_FAILURE_MS = 8_000
export type CarouselClock = { viewedMs: number; waitingMs: number; fallback: boolean }
export const newCarouselClock = (): CarouselClock => ({ viewedMs: 0, waitingMs: 0, fallback: false })

/** Only visible, centered, unpaused time counts. Loading has its own bounded clock. */
export function tickCarouselClock(clock: CarouselClock, elapsedMs: number, eligible: boolean, playback: PeekPlaybackState): CarouselClock {
  if (!eligible) return clock
  const elapsed = Math.max(0, elapsedMs)
  if (clock.fallback) return { ...clock, viewedMs: clock.viewedMs + elapsed }
  if (playback === 'playing') return { ...clock, viewedMs: clock.viewedMs + elapsed, waitingMs: 0 }
  const waitingMs = clock.waitingMs + elapsed
  if (playback === 'error' || waitingMs >= CAROUSEL_FAILURE_MS) {
    // Give the complete poster dwell even when a recording fails mid-playback.
    return { viewedMs: 0, waitingMs: 0, fallback: true }
  }
  return { ...clock, waitingMs }
}
