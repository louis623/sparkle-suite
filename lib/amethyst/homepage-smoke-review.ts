import { AMETHYST_APPEARANCE_PRESET_IDS } from './appearance-presets'
import type { AmethystPreviewTemplateData } from './preview-template-data'

export const SSR_REVIEW_LAYOUTS = {
  standard: undefined,
  mile_high_fizz: 'mile_high_fizz_hybrid',
  britt_with_bling: 'britt_with_bling_hybrid',
  bling_kitchen: 'bling_kitchen_hybrid',
} as const

/** Read-only fixtures, restricted to the approved Smoke project/database/demo. */
export function smokeReviewSelection(url: URL, slug?: string | null) {
  if (process.env.VERCEL_ENV !== 'preview' ||
      process.env.VERCEL_PROJECT_ID !== 'prj_VTY0rpz2O3VBJqJv69iBz8tzLexQ' ||
      process.env.NEXT_PUBLIC_SPARKLE_ENVIRONMENT !== 'smoke' ||
      process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://pukemqiwlyqmyytxkdmo.supabase.co' ||
      slug !== 'dudesfizzfest') return null
  const theme = url.searchParams.get('ssrReviewTheme')
  const layout = url.searchParams.get('ssrReviewLayout')
  if (!AMETHYST_APPEARANCE_PRESET_IDS.some(id => id === theme) ||
      (layout !== null && !Object.hasOwn(SSR_REVIEW_LAYOUTS, layout))) return null
  return { theme: theme as AmethystPreviewTemplateData['appearancePreset'], layout }
}

export function homepageSmokeReview(data: AmethystPreviewTemplateData, url: URL, slug?: string | null) {
  const selection = smokeReviewSelection(url, slug)
  if (!selection) return data
  const { theme, layout } = selection
  const variant = layout === null ? data.homepage.publicSiteVariant : SSR_REVIEW_LAYOUTS[layout as keyof typeof SSR_REVIEW_LAYOUTS]
  return { ...data, ssrReview: true, appearancePreset: theme as AmethystPreviewTemplateData['appearancePreset'],
    homepage: { ...data.homepage, publicSiteVariant: variant },
    trade: { ...data.trade, publicSiteVariant: variant },
    join: { ...data.join, publicSiteVariant: variant } }
}
