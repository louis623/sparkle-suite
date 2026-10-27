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

/** Deployment-only QA delay: never enabled on production or outside this preview project. */
export function delayPreviewHomepageData(publicSiteSlug?: string | null) {
  if (process.env.VERCEL_ENV !== 'preview' ||
      process.env.VERCEL_PROJECT_ID !== 'prj_VTY0rpz2O3VBJqJv69iBz8tzLexQ' ||
      publicSiteSlug !== 'dudesfizzfest') return
  const milliseconds = Number(process.env.SSR_PREVIEW_PAGE_DATA_DELAY_MS)
  if (Number.isFinite(milliseconds) && milliseconds > 0) {
    return new Promise<void>(resolve => setTimeout(resolve, Math.min(milliseconds, 10000)))
  }
}

/** Approved QA presentation override; all content still comes from Smoke, with no saved edits. */
export function previewHomepageTheme<T extends { appearancePreset: string }>(data: T, publicSiteSlug?: string | null): T {
  if (process.env.VERCEL_ENV === 'preview' &&
      process.env.VERCEL_PROJECT_ID === 'prj_VTY0rpz2O3VBJqJv69iBz8tzLexQ' &&
      publicSiteSlug === 'dudesfizzfest' &&
      process.env.SSR_PREVIEW_THEME_OVERRIDE === 'halloween_pumpkin_cat') {
    return { ...data, appearancePreset: 'halloween_pumpkin_cat' }
  }
  return data
}
