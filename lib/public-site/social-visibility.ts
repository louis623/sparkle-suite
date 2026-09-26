export const SOCIAL_PLATFORMS = [
  { key: 'instagram', label: 'Instagram', domains: ['instagram.com'] },
  { key: 'facebook', label: 'Facebook', domains: ['facebook.com', 'fb.com', 'fb.watch'] },
  { key: 'tiktok', label: 'TikTok', domains: ['tiktok.com'] },
  { key: 'youtube', label: 'YouTube', domains: ['youtube.com', 'youtu.be'] },
  { key: 'whatnot', label: 'Whatnot', domains: ['whatnot.com'] },
] as const

/**
 * Hero CTA preferences stored beside platform visibility in site_settings.social_visibility.
 * Missing or false keeps that platform's landing-hero button hidden.
 * Platform keys use the opposite default: a missing platform key stays visible
 * in the footer, social strip, and other non-hero spots.
 * facebookHero is accepted as an alias and folded into facebookVipHero so a
 * saved facebookVipHero: true is never dropped.
 */
export const FACEBOOK_VIP_HERO_VISIBILITY_KEY = 'facebookVipHero' as const
export const FACEBOOK_HERO_VISIBILITY_ALIAS = 'facebookHero' as const

export type SocialPlatformKey = (typeof SOCIAL_PLATFORMS)[number]['key']

export const SOCIAL_HERO_FLAG_KEYS = [
  'instagramHero',
  'facebookVipHero',
  'facebookHero',
  'tiktokHero',
  'youtubeHero',
  'whatnotHero',
] as const

export type SocialHeroFlagKey = (typeof SOCIAL_HERO_FLAG_KEYS)[number]

export type SocialVisibility = Partial<Record<SocialPlatformKey, boolean>> &
  Partial<Record<SocialHeroFlagKey, boolean>>

const SOCIAL_HERO_FLAG_KEY_SET = new Set<string>(SOCIAL_HERO_FLAG_KEYS)

export function socialHeroFlagKey(platform: SocialPlatformKey): Exclude<SocialHeroFlagKey, 'facebookHero'> {
  if (platform === 'facebook') return FACEBOOK_VIP_HERO_VISIBILITY_KEY
  return `${platform}Hero`
}

export function isSocialVisibilityValue(value: unknown): value is SocialVisibility {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  return Object.entries(value).every(([key, visible]) =>
    typeof visible === 'boolean' &&
    (SOCIAL_HERO_FLAG_KEY_SET.has(key) || SOCIAL_PLATFORMS.some(platform => platform.key === key)),
  )
}

export function normalizeSocialVisibility(value: unknown): SocialVisibility {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const record = value as Record<string, unknown>
  const normalized: SocialVisibility = Object.fromEntries(SOCIAL_PLATFORMS.filter(({ key }) =>
    typeof record[key] === 'boolean',
  ).map(({ key }) => [key, record[key]]))

  for (const platform of SOCIAL_PLATFORMS) {
    const flagKey = socialHeroFlagKey(platform.key)
    if (typeof record[flagKey] === 'boolean') {
      normalized[flagKey] = record[flagKey]
    }
  }

  if (typeof normalized.facebookVipHero !== 'boolean' && typeof record[FACEBOOK_HERO_VISIBILITY_ALIAS] === 'boolean') {
    normalized.facebookVipHero = record[FACEBOOK_HERO_VISIBILITY_ALIAS]
  }

  return normalized
}

export function isSocialHeroEnabled(
  value: SocialVisibility | null | undefined,
  platform: SocialPlatformKey,
) {
  if (!value) return false
  const flagKey = socialHeroFlagKey(platform)
  if (typeof value[flagKey] === 'boolean') return value[flagKey] === true
  if (platform === 'facebook' && value.facebookHero === true) return true
  return false
}

export function isFacebookVipHeroEnabled(value: SocialVisibility | null | undefined) {
  return isSocialHeroEnabled(value, 'facebook')
}

export function socialVisibilitySelectors(value: SocialVisibility = {}): string[] {
  return SOCIAL_PLATFORMS.filter(({ key }) => value[key] === false).flatMap(({ domains }) =>
    domains.flatMap(domain => ['https://', 'http://', '//'].flatMap(protocol => [
      `a[href^="${protocol}${domain}/" i]:not([data-hero-cta])`,
      `a[href="${protocol}${domain}" i]:not([data-hero-cta])`,
      `a[href^="${protocol}www.${domain}/" i]:not([data-hero-cta])`,
      `a[href="${protocol}www.${domain}" i]:not([data-hero-cta])`,
      `a[href^="${protocol}m.${domain}/" i]:not([data-hero-cta])`,
      `a[href^="${protocol}vm.${domain}/" i]:not([data-hero-cta])`,
    ])),
  )
}
