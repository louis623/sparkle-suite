import {
  isSocialHeroEnabled,
  SOCIAL_PLATFORMS,
  type SocialPlatformKey,
  type SocialVisibility,
} from './social-visibility'

/**
 * Landing-hero CTA order, after Shop and Watch Now, on every Amethyst hero.
 * Labels stay short and identical from site to site.
 */
export const SOCIAL_HERO_ORDER = [
  'facebook',
  'tiktok',
  'instagram',
  'whatnot',
  'youtube',
] as const satisfies readonly SocialPlatformKey[]

export const SOCIAL_HERO_LABELS: Record<SocialPlatformKey, string> = {
  facebook: 'Facebook VIP',
  tiktok: 'TikTok',
  instagram: 'Instagram',
  whatnot: 'Whatnot',
  youtube: 'YouTube',
}

export interface SocialHeroLink {
  key: SocialPlatformKey
  label: string
  href: string
}

const HANDLE_URL: Record<SocialPlatformKey, (handle: string) => string> = {
  instagram: (handle) => `https://www.instagram.com/${handle}`,
  facebook: (handle) => `https://www.facebook.com/${handle}`,
  tiktok: (handle) => `https://www.tiktok.com/@${handle}`,
  youtube: (handle) => `https://www.youtube.com/@${handle}`,
  whatnot: (handle) => `https://www.whatnot.com/user/${handle}`,
}

function platformDomains(platform: SocialPlatformKey) {
  return SOCIAL_PLATFORMS.find((item) => item.key === platform)?.domains ?? []
}

function hostMatchesPlatform(platform: SocialPlatformKey, hostname: string) {
  const host = hostname.toLowerCase().replace(/^www\./, '')
  return platformDomains(platform).some(
    (domain) => host === domain || host.endsWith(`.${domain}`),
  )
}

/**
 * One URL check for every social platform. A bare handle becomes that
 * platform's public URL. Empty, hash, credentialed, off-domain, and
 * domain-only links return '' so heroes never render a dead button.
 */
export function resolveSocialPlatformUrl(
  platform: SocialPlatformKey,
  value: string | null | undefined,
) {
  const cleaned = value?.trim() ?? ''
  if (!cleaned || cleaned === '#') return ''

  const handle = cleaned.replace(/^@/, '').replace(/^\/+/, '')
  const candidate = /^https?:\/\//i.test(cleaned)
    ? cleaned
    : HANDLE_URL[platform](handle)

  try {
    const url = new URL(candidate)
    if (url.username || url.password) return ''
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return ''
    if (!hostMatchesPlatform(platform, url.hostname)) return ''
    if ((url.pathname === '/' || url.pathname === '') && !url.search) return ''
    return url.toString()
  } catch {
    return ''
  }
}

export function resolveSocialHeroLinks(input: {
  socialHandles?: Record<string, string | null | undefined> | null
  socialVisibility?: SocialVisibility | null
}): SocialHeroLink[] {
  const handles = input.socialHandles ?? {}
  return SOCIAL_HERO_ORDER.flatMap((platform) => {
    if (!isSocialHeroEnabled(input.socialVisibility, platform)) return []
    const href = resolveSocialPlatformUrl(platform, handles[platform])
    if (!href) return []
    return [{ key: platform, label: SOCIAL_HERO_LABELS[platform], href }]
  })
}

export type SocialPlacementSummary = 'Footer · Hero' | 'Footer' | 'Hero' | 'Hidden'

/**
 * What a rep should expect from the two switches.
 * Show on site defaults on when the platform key is missing.
 * Show in hero defaults off. No real URL means the link is nowhere.
 */
export function describeSocialPlacement(
  platform: SocialPlatformKey,
  rawUrl: string | null | undefined,
  visibility: SocialVisibility | null | undefined,
): {
  href: string
  showOnSite: boolean
  showInHero: boolean
  summary: SocialPlacementSummary | ''
} {
  const href = resolveSocialPlatformUrl(platform, rawUrl)
  if (!href) {
    return { href: '', showOnSite: false, showInHero: false, summary: '' }
  }

  const showOnSite = visibility?.[platform] !== false
  const showInHero = isSocialHeroEnabled(visibility, platform)
  if (showOnSite && showInHero) {
    return { href, showOnSite, showInHero, summary: 'Footer · Hero' }
  }
  if (showOnSite) return { href, showOnSite, showInHero, summary: 'Footer' }
  if (showInHero) return { href, showOnSite, showInHero, summary: 'Hero' }
  return { href, showOnSite, showInHero, summary: 'Hidden' }
}
