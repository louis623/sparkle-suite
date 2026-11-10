import type { AmethystPantryTemplateData } from './pantry-template-data'
import { applyBlingKitchenHomepage, applyBlingKitchenTrade, applyBlingKitchenJoin, BLING_KITCHEN_PROFILE } from '@/lib/bling-kitchen/profile'
import { AMETHYST_APPEARANCE_PRESET_IDS } from './appearance-presets'
import type { AmethystPreviewTemplateData } from './preview-template-data'
import {
  applyBrittWithBlingHomepage, applyBrittWithBlingTrade, applyBrittWithBlingJoin,
  BRITT_WITH_BLING_PROFILE, BRITT_WITH_BLING_TEAM_MEMBERS,
} from '@/lib/britt-with-bling/profile'

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
      (slug !== 'dudesfizzfest' && slug !== 'milehighfizz')) return null
  const theme = url.searchParams.get('ssrReviewTheme')
  if (theme === 'macies_christmas_globe' && slug !== 'dudesfizzfest') return null
  const layout = url.searchParams.get('ssrReviewLayout')
  if (!AMETHYST_APPEARANCE_PRESET_IDS.some(id => id === theme) ||
      (layout !== null && !Object.hasOwn(SSR_REVIEW_LAYOUTS, layout))) return null
  const tiktok = url.searchParams.get('ssrReviewTikTok')
  if (tiktok !== null && tiktok !== 'same-videos') return null
  return { theme: theme as AmethystPreviewTemplateData['appearancePreset'], layout, tiktok }
}

export function homepageSmokeReview(data: AmethystPreviewTemplateData, url: URL, slug?: string | null) {
  const selection = smokeReviewSelection(url, slug)
  if (!selection) return data
  const { theme, layout } = selection
  if (theme === 'macies_christmas_globe' && (!layout || layout === 'standard')) {
    const display = { businessName: 'Main Gem Co.', repName: 'Katelin' }
    data = {
      ...data,
      homepage: { ...data.homepage, ...display, heroHeadlineOverride: '', heroHeadline: 'Christmas at Main Gem Co.', heroSub: 'Join Katelin and Macie Grey for live jewelry reveals.' },
      trade: { ...data.trade, ...display },
      join: { ...data.join, ...display },
    }
  }
  if (layout === 'britt_with_bling') {
    const profile = BRITT_WITH_BLING_PROFILE
    const identity = { repName: profile.publicName, businessName: profile.businessName, teamName: profile.teamName }
    data = { ...data,
      homepage: applyBrittWithBlingHomepage({ ...data.homepage, ...identity,
        tagline: '', heroHeadlineOverride: '',
        streamLinks: { ...data.homepage.streamLinks, shop: profile.shopUrl, watch: profile.tiktokUrl, tiktok: profile.tiktokUrl, facebook: profile.facebookVipUrl },
        socialLinks: [{ label: 'TikTok', shortLabel: 'TT', href: profile.tiktokUrl }, { label: 'Facebook', shortLabel: 'FB', href: profile.facebookVipUrl }],
      }),
      trade: applyBrittWithBlingTrade({ ...data.trade, ...identity }),
      join: applyBrittWithBlingJoin({ ...data.join, ...identity }, BRITT_WITH_BLING_TEAM_MEMBERS),
    }
  }
  if (layout === 'bling_kitchen') {
    const profile = BLING_KITCHEN_PROFILE
    const identity = { repName: profile.publicName, businessName: profile.businessName, teamName: profile.teamName }
    data = { ...data,
      homepage: { ...applyBlingKitchenHomepage({ ...data.homepage, ...identity }),
        pantryPageUrl: undefined, aboutMediaSlots: [], heroImageUrl: profile.heroImageUrl },
      trade: { ...applyBlingKitchenTrade({ ...data.trade, ...identity }), pantryPageUrl: undefined },
      join: { ...applyBlingKitchenJoin({ ...data.join, ...identity }), pantryPageUrl: undefined },
    }
  }
  if (selection.tiktok === 'same-videos') {
    // Controlled same-video comparison, not a copy of another rep's saved data.
    // These public IDs came from Louis's evidence. No fixture is persisted.
    const ids = ['7476510653268806958', '7387364398832094495', '7338490860503387434']
    const britt = layout === 'britt_with_bling'
    data = { ...data, homepage: { ...data.homepage,
      showcaseVideoUrl: britt ? BRITT_WITH_BLING_PROFILE.showcaseVideoUrl
        : 'https://www.tiktok.com/@brittwithbling/video/7602795836380073229',
      showcaseVideoVisible: true, showAboutSection: true, aboutMediaManaged: true,
      aboutMediaSlots: [
        { typeLabel: 'Portrait', caption: '', href: '', mediaUrl: BRITT_WITH_BLING_PROFILE.heroImageUrl },
        ...ids.map((id, index) => ({ typeLabel: `Short video ${index + 1}`, caption: '',
          href: `https://www.tiktok.com/@brittwithbling/video/${id}`, mediaUrl: '' })),
      ],
    } }
  }
  const variant = layout === null ? data.homepage.publicSiteVariant : SSR_REVIEW_LAYOUTS[layout as keyof typeof SSR_REVIEW_LAYOUTS]
  return { ...data, ssrReview: true, appearancePreset: theme as AmethystPreviewTemplateData['appearancePreset'],
    homepage: { ...data.homepage, publicSiteVariant: variant },
    trade: { ...data.trade, publicSiteVariant: variant },
    join: { ...data.join, publicSiteVariant: variant } }
}

/** Repository-only photos for Heather's pantry on the approved Smoke preview. */
export function pantrySmokeReview(data: AmethystPantryTemplateData, slug?: string | null) {
  if (process.env.VERCEL_ENV !== 'preview' ||
      process.env.VERCEL_PROJECT_ID !== 'prj_VTY0rpz2O3VBJqJv69iBz8tzLexQ' ||
      process.env.NEXT_PUBLIC_SPARKLE_ENVIRONMENT !== 'smoke' ||
      process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://pukemqiwlyqmyytxkdmo.supabase.co' ||
      slug !== 'blingkitchen') return data
  const replace = (value: unknown, key = ''): unknown => {
    if (typeof value === 'string' && value.startsWith('https://bqhzfkgkjyuhlsozpylf')) {
      return key === 'heroImageUrl' ? '/amethyst/bling-kitchen/homepage-hero-pendant.jpg' : '/amethyst/bling-kitchen/tile-wall.webp'
    }
    if (Array.isArray(value)) return value.map(item => replace(item))
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, replace(item, key)]))
    return value
  }
  return replace(data) as AmethystPantryTemplateData
}
