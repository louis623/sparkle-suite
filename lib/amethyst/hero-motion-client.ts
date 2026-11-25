import type { HeroAnimationType, SiteSettingsDashboardResult } from '@/lib/services/types'

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
  delete payload.heroMotionMode
  delete payload.grandfatheredHeadlineFallback
  if (!options.includeHeroAnimation) delete payload.heroAnimationType
  return payload
}
