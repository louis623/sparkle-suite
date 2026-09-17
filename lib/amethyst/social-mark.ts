export const SOCIAL_PLATFORMS = [
  'tiktok',
  'facebook',
  'instagram',
  'youtube',
  'whatnot',
  'website',
] as const

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number]

export const SOCIAL_PLATFORM_LABELS: Record<SocialPlatform, string> = {
  tiktok: 'TikTok',
  facebook: 'Facebook',
  instagram: 'Instagram',
  youtube: 'YouTube',
  whatnot: 'Whatnot',
  website: 'Website',
}

export const TEAM_SOCIAL_SLOTS = [
  { key: 'tiktok', kind: 'tt', label: 'TikTok' },
  { key: 'facebook', kind: 'fb', label: 'Facebook VIP' },
  { key: 'instagram', kind: 'ig', label: 'Instagram' },
  { key: 'website', kind: 'web', label: 'Website' },
  { key: 'youtube', kind: 'yt', label: 'YouTube' },
  { key: 'whatnot', kind: 'wn', label: 'Whatnot' },
] as const

const KEY_ALIASES: Record<string, SocialPlatform> = {
  tt: 'tiktok',
  tiktok: 'tiktok',
  fb: 'facebook',
  facebook: 'facebook',
  ig: 'instagram',
  instagram: 'instagram',
  insta: 'instagram',
  yt: 'youtube',
  youtube: 'youtube',
  wn: 'whatnot',
  whatnot: 'whatnot',
  web: 'website',
  website: 'website',
  crown: 'website',
}

const HOST_ALIASES: Array<[SocialPlatform, readonly string[]]> = [
  ['tiktok', ['tiktok.com']],
  ['facebook', ['facebook.com', 'fb.com', 'fb.watch']],
  ['instagram', ['instagram.com']],
  ['youtube', ['youtube.com', 'youtu.be']],
  ['whatnot', ['whatnot.com']],
]

export function socialPlatformLabel(platform: SocialPlatform): string {
  return SOCIAL_PLATFORM_LABELS[platform]
}

export function socialMarkUsesStroke(platform: SocialPlatform): boolean {
  return platform === 'instagram' || platform === 'website'
}

export function socialMarkClassName(
  baseClassName: string,
  platform: SocialPlatform,
): string {
  return socialMarkUsesStroke(platform)
    ? `${baseClassName} ${baseClassName}-stroke`
    : baseClassName
}

export function isLiveSocialHref(href: unknown): boolean {
  if (typeof href !== 'string') return false

  const value = href.trim()
  if (!value) return false

  const lowered = value.toLowerCase()
  if (
    lowered === '#' ||
    lowered === '/' ||
    lowered === 'about:blank' ||
    lowered === 'javascript:void(0)' ||
    lowered === 'javascript:void(0);'
  ) {
    return false
  }

  if (value.startsWith('#') || /^javascript:/i.test(value)) return false

  if (/^https?:\/\//i.test(value) || value.startsWith('//')) {
    try {
      const url = new URL(value.startsWith('//') ? `https:${value}` : value)
      return Boolean(url.hostname)
    } catch {
      return false
    }
  }

  return false
}

export function resolveSocialPlatform(input: {
  key?: string | null
  href?: string | null
  label?: string | null
  shortLabel?: string | null
}): SocialPlatform | null {
  const fromHref = platformFromHref(input.href)
  if (fromHref && fromHref !== 'website') return fromHref

  const fromKey =
    platformFromToken(input.key) || platformFromToken(input.shortLabel)
  if (fromKey) return fromKey

  const fromLabel = platformFromLabel(input.label)
  if (fromLabel) return fromLabel

  if (fromHref === 'website') return 'website'
  if (isLiveSocialHref(input.href)) return 'website'
  return null
}

function platformFromToken(value?: string | null): SocialPlatform | null {
  if (!value) return null
  return KEY_ALIASES[value.trim().toLowerCase()] ?? null
}

function platformFromLabel(value?: string | null): SocialPlatform | null {
  if (!value) return null
  const key = value.toLowerCase()
  if (/\bwhatnot\b/.test(key)) return 'whatnot'
  if (/\b(?:instagram|insta)\b/.test(key) || key === 'ig') return 'instagram'
  if (/\b(?:facebook|fb)\b/.test(key)) return 'facebook'
  if (/\b(?:youtube|youtu\.be)\b/.test(key) || key === 'yt') return 'youtube'
  if (/\b(?:tiktok|tik tok)\b/.test(key) || key === 'tt') return 'tiktok'
  if (/\b(?:website|web|site)\b/.test(key)) return 'website'
  return null
}

function platformFromHref(href?: string | null): SocialPlatform | null {
  if (!isLiveSocialHref(href) || typeof href !== 'string') return null

  try {
    const url = new URL(href.startsWith('//') ? `https:${href}` : href)
    const host = url.hostname.toLowerCase().replace(/^www\./, '')
    for (const [platform, hosts] of HOST_ALIASES) {
      if (hosts.some((allowed) => host === allowed || host.endsWith(`.${allowed}`))) {
        return platform
      }
    }
    return 'website'
  } catch {
    return null
  }
}
