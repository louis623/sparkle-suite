export const HOMEPAGE_PAGE_DATA_BUDGET_MS = 50

/** Keep parallel reads, but never hold the response for a slow optional read. */
export async function withinHomepageDataBudget<T>(task: Promise<T>, budgetMs = HOMEPAGE_PAGE_DATA_BUDGET_MS): Promise<T | undefined> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      task,
      new Promise<undefined>(resolve => { timer = setTimeout(() => resolve(undefined), budgetMs) }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}
