import { normalizeAmethystAppearancePreset } from '@/lib/amethyst/appearance-presets'
import { repRenderV2Enabled } from '@/lib/amethyst/rep-render-version'
import { isBrittWithBlingSettings } from '@/lib/britt-with-bling/profile'
import { isMileHighFizzSettings } from '@/lib/mile-high-fizz/profile'
import type { HeroAnimationType, SiteSettingsDashboardResult } from '@/lib/services/types'

/**
 * The homepage renderer (v2/homepage.jsx) mounts a custom hero only when
 * publicSiteVariant is one of these. Standard pages ignore the rep's
 * three-way hero choice once the slug is on the v2 allowlist.
 */
export const RENDERER_CUSTOM_HERO_VARIANTS = [
  'mile_high_fizz_hybrid',
  'britt_with_bling_hybrid',
  'bling_kitchen_hybrid',
] as const

export type RendererCustomHeroVariant = (typeof RENDERER_CUSTOM_HERO_VARIANTS)[number]

export function isRendererCustomHeroVariant(
  value: string | null | undefined,
): value is RendererCustomHeroVariant {
  return (
    value === 'mile_high_fizz_hybrid' ||
    value === 'britt_with_bling_hybrid' ||
    value === 'bling_kitchen_hybrid'
  )
}

/**
 * The variant the homepage mapper hands the renderer.
 * Mile High Fizz and Britt with Bling stay custom only on the skin the
 * mapper requires. Bling Kitchen settings do not set a homepage variant;
 * the renderer uses the custom kitchen hero only when publicSiteVariant
 * is already bling_kitchen_hybrid.
 */
function profileText(value: string | null | undefined) {
  return value?.trim() ?? ''
}

/** Profile checks trim these fields. A partial row must not throw. */
function withProfileText(settings: SiteSettingsDashboardResult): SiteSettingsDashboardResult {
  return {
    ...settings,
    email: profileText(settings.email),
    businessName: profileText(settings.businessName),
    teamName: profileText(settings.teamName),
  }
}

export function homepageRendererVariant(
  settings: SiteSettingsDashboardResult,
  publicSiteSlug?: string | null,
): RendererCustomHeroVariant | undefined {
  const readable = withProfileText(settings)
  const skin = normalizeAmethystAppearancePreset(readable.appearancePreset)
  if (isMileHighFizzSettings(readable) && skin === 'alpine_opal') return 'mile_high_fizz_hybrid'
  if (isBrittWithBlingSettings(readable, publicSiteSlug) && skin === 'black_diamond') {
    return 'britt_with_bling_hybrid'
  }
  return undefined
}

export function heroMotionApplies(input: {
  publicSiteSlug?: string | null
  publicSiteVariant?: string | null
  settings?: SiteSettingsDashboardResult
  allowlist?: string | null
}) {
  const variant =
    input.publicSiteVariant ??
    (input.settings ? homepageRendererVariant(input.settings, input.publicSiteSlug) : undefined)
  return isRendererCustomHeroVariant(variant) || !repRenderV2Enabled(input.publicSiteSlug, input.allowlist ?? undefined)
}

export type HeroMotionControl = 'switch' | 'choices' | 'theme'

/** Custom layout wins over the legacy three-choice control. A v2 standard page hides both. */
export function heroMotionControl(input: {
  settings: SiteSettingsDashboardResult
  publicSiteSlug?: string | null
}): HeroMotionControl {
  if (homepageRendererVariant(input.settings, input.publicSiteSlug)) return 'switch'
  if (input.settings.heroMotionApplies === false) return 'theme'
  return 'choices'
}

/** True when the footer tagline also fills an empty line under the headline. */
export function grandfatheredHeadlineFallback(
  settings: SiteSettingsDashboardResult,
  publicSiteSlug?: string | null,
) {
  const readable = withProfileText(settings)
  return isBrittWithBlingSettings(readable, publicSiteSlug) || isMileHighFizzSettings(readable)
}

export function applyHeroMotionSwitch(input: {
  on: boolean
  current: HeroAnimationType
  remembered: HeroAnimationType | null
}): { heroAnimationType: HeroAnimationType; remembered: HeroAnimationType | null } {
  if (!input.on) {
    const remembered = input.current !== 'still' ? input.current : input.remembered
    return { heroAnimationType: 'still', remembered }
  }
  const restored = input.remembered && input.remembered !== 'still' ? input.remembered : 'sparkle_rise'
  return { heroAnimationType: restored, remembered: restored }
}

/** My Website save. Team I manage stays on the Team Management save. An untouched hero control sends nothing. */
export function myWebsiteSavePayload(
  draft: SiteSettingsDashboardResult,
  options: { includeHeroAnimation: boolean },
) {
  const payload: Record<string, unknown> = { ...draft }
  delete payload.teamName
  delete payload.recruitingLink
  delete payload.heroMotionApplies
  delete payload.grandfatheredHeadlineFallback
  if (!options.includeHeroAnimation) delete payload.heroAnimationType
  return payload
}
