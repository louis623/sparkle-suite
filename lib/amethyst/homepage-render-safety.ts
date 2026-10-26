/** SSR is an enhancement: failures must not remove a valid client-rendered site. */
export async function bestEffortHomepage<T>(work: () => Promise<T>, deadlineMs = 1500): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      Promise.resolve().then(work),
      new Promise<null>(resolve => { timer = setTimeout(() => resolve(null), deadlineMs) }),
    ])
  } catch {
    return null
  } finally {
    if (timer) clearTimeout(timer)
  }
}
