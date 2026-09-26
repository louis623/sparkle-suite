export const SOCIAL_PLATFORMS = [
  { key: 'instagram', label: 'Instagram', domains: ['instagram.com'] },
  { key: 'facebook', label: 'Facebook', domains: ['facebook.com', 'fb.com', 'fb.watch'] },
  { key: 'tiktok', label: 'TikTok', domains: ['tiktok.com'] },
  { key: 'youtube', label: 'YouTube', domains: ['youtube.com', 'youtu.be'] },
  { key: 'whatnot', label: 'Whatnot', domains: ['whatnot.com'] },
] as const

/**
 * Hero CTA preference stored beside platform visibility in site_settings.social_visibility.
 * Missing or false keeps the landing-hero Facebook VIP button hidden.
 * Platform keys use the opposite default: a missing platform key stays visible.
 */
export const FACEBOOK_VIP_HERO_VISIBILITY_KEY = 'facebookVipHero' as const

export type SocialVisibility = Partial<Record<typeof SOCIAL_PLATFORMS[number]['key'], boolean>> & {
  facebookVipHero?: boolean
}

export function isSocialVisibilityValue(value: unknown): value is SocialVisibility {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  return Object.entries(value).every(([key, visible]) =>
    typeof visible === 'boolean' &&
    (key === FACEBOOK_VIP_HERO_VISIBILITY_KEY || SOCIAL_PLATFORMS.some(platform => platform.key === key)),
  )
}

export function normalizeSocialVisibility(value: unknown): SocialVisibility {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const record = value as Record<string, unknown>
  const normalized: SocialVisibility = Object.fromEntries(SOCIAL_PLATFORMS.filter(({ key }) =>
    typeof record[key] === 'boolean',
  ).map(({ key }) => [key, record[key]]))
  if (typeof record[FACEBOOK_VIP_HERO_VISIBILITY_KEY] === 'boolean') {
    normalized.facebookVipHero = record[FACEBOOK_VIP_HERO_VISIBILITY_KEY]
  }
  return normalized
}

export function isFacebookVipHeroEnabled(value: SocialVisibility | null | undefined) {
  return value?.facebookVipHero === true
}

export function socialVisibilitySelectors(value: SocialVisibility = {}): string[] {
  return SOCIAL_PLATFORMS.filter(({ key }) => value[key] === false).flatMap(({ domains }) =>
    domains.flatMap(domain => ['https://', 'http://', '//'].flatMap(protocol => [
      `a[href^="${protocol}${domain}/" i]`,
      `a[href="${protocol}${domain}" i]`,
      `a[href^="${protocol}www.${domain}/" i]`,
      `a[href="${protocol}www.${domain}" i]`,
      `a[href^="${protocol}m.${domain}/" i]`,
      `a[href^="${protocol}vm.${domain}/" i]`,
    ])),
  )
}
