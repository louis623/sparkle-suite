import { AMETHYST_APPEARANCE_PRESET_IDS } from './appearance-presets'
import type { AmethystPreviewTemplateData } from './preview-template-data'

export const SSR_REVIEW_LAYOUTS = {
  standard: undefined,
  mile_high_fizz: 'mile_high_fizz_hybrid',
  britt_with_bling: 'britt_with_bling_hybrid',
  bling_kitchen: 'bling_kitchen_hybrid',
} as const

/** Read-only fixtures, restricted to the approved Smoke project/database/demo. */
export function homepageSmokeReview(data: AmethystPreviewTemplateData, url: URL, slug?: string | null) {
  if (process.env.VERCEL_ENV !== 'preview' ||
      process.env.VERCEL_PROJECT_ID !== 'prj_VTY0rpz2O3VBJqJv69iBz8tzLexQ' ||
      process.env.NEXT_PUBLIC_SPARKLE_ENVIRONMENT !== 'smoke' ||
      process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://pukemqiwlyqmyytxkdmo.supabase.co' ||
      slug !== 'dudesfizzfest') return data
  const theme = url.searchParams.get('ssrReviewTheme')
  const layout = url.searchParams.get('ssrReviewLayout')
  if (!AMETHYST_APPEARANCE_PRESET_IDS.some(id => id === theme) ||
      !layout || !Object.hasOwn(SSR_REVIEW_LAYOUTS, layout)) return data
  return { ...data, ssrReview: true, appearancePreset: theme as AmethystPreviewTemplateData['appearancePreset'],
    homepage: { ...data.homepage, publicSiteVariant: SSR_REVIEW_LAYOUTS[layout as keyof typeof SSR_REVIEW_LAYOUTS] } }
}
