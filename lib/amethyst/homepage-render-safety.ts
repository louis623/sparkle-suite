/** SSR is an enhancement: failures must not remove a valid client-rendered site. */
export async function bestEffortHomepage<T>(work: () => Promise<T>, deadlineMs = 1500): Promise<T | null> {
  const started = performance.now()
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const result = await Promise.race([
      Promise.resolve().then(work),
      new Promise<null>(resolve => { timer = setTimeout(() => resolve(null), deadlineMs) }),
    ])
    // A synchronous render can hold the event loop past the timer. Never let
    // that race publish a late result merely because its microtask ran first.
    return performance.now() - started > deadlineMs ? null : result
  } catch {
    return null
  } finally {
    if (timer) clearTimeout(timer)
  }
}
