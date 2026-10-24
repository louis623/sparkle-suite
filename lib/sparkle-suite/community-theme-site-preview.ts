import { buildSkinPreviewDocument, type SkinPreviewSkin } from '@/lib/amethyst/skin-preview'
import { sealOpaqueMarketingDocument } from '@/lib/sparkle-suite/landing-demo-preview'

/** Themes Louis locked for the community carousel. Every id is a shipped skin. */
export const COMMUNITY_CAROUSEL_THEME_IDS = [
  'amethyst',
  'halloween_pumpkin_witch',
  'halloween_pumpkin_cat',
  'gilded_autumn',
  'fall_owl_harvest_moon',
  'gobble_and_fizz',
  'pie_please',
  'midnight_rose',
  'pearl_rose',
  'rose_champagne',
  'sunset_beach',
] as const satisfies readonly SkinPreviewSkin[]

export type CommunityCarouselThemeId = (typeof COMMUNITY_CAROUSEL_THEME_IDS)[number]

export function isCommunityCarouselTheme(value: string | null): value is CommunityCarouselThemeId {
  return !!value && (COMMUNITY_CAROUSEL_THEME_IDS as readonly string[]).includes(value)
}

/** Keep the real header, lineup, and hero inside a 16:9 marketing frame. */
const PEEK_CROP = [
  '.hp-header-inner{padding-top:8px!important;padding-bottom:8px!important}',
  '.hp-lrq-inner{padding:10px 24px!important}',
  '.hp-hero{min-height:460px!important}',
  '.hp-hero-inner{padding:32px 24px 24px!important}',
].join('')

/** Sample customer homepage for one community theme, using that theme's art. */
export async function communityThemeSiteDocument(theme: CommunityCarouselThemeId, origin: string) {
  const document = await buildSkinPreviewDocument(theme, 'homepage', origin)
  const sealed = await sealOpaqueMarketingDocument(document, theme, PEEK_CROP)
  // The carousel listener can attach after the first ready post. Keep announcing.
  const repeat = `<script>setInterval(function(){if(document.documentElement.dataset.previewReady==="true"){parent.postMessage({type:"sparkle-landing-ready",theme:${JSON.stringify(theme)}},"*")}},400)</script>`
  return sealed.replace('</body>', repeat + '</body>')
}
