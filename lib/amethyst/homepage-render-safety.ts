/** SSR is an enhancement: failures must not remove a valid client-rendered site. */
export async function bestEffortHomepage<T>(work: () => Promise<T>, deadlineMs = 5000): Promise<T | null> {
  const started = performance.now()
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const result = await Promise.race([
      Promise.resolve().then(work),
      new Promise<null>(resolve => { timer = setTimeout(() => resolve(null), deadlineMs) }),
    ])
    // A synchronous render can hold the event loop past the timer. Never let
    // that race publish a late result merely because its microtask ran first.
    const elapsedMs = performance.now() - started
    if (result === null || elapsedMs > deadlineMs) {
      console.warn('homepage_ssr_fallback', JSON.stringify({ reason: 'deadline', elapsedMs, deadlineMs }))
      return null
    }
    return result
  } catch (error) {
    console.warn('homepage_ssr_fallback', JSON.stringify({ reason: 'error', elapsedMs: performance.now() - started, deadlineMs, error: error instanceof Error ? error.message : 'Unknown render error' }))
    return null
  } finally {
    if (timer) clearTimeout(timer)
  }
}
