export const SOCIAL_PLATFORMS = [
  { key: 'instagram', label: 'Instagram', domains: ['instagram.com'] },
  { key: 'facebook', label: 'Facebook', domains: ['facebook.com', 'fb.com', 'fb.watch'] },
  { key: 'tiktok', label: 'TikTok', domains: ['tiktok.com'] },
  { key: 'youtube', label: 'YouTube', domains: ['youtube.com', 'youtu.be'] },
  { key: 'whatnot', label: 'Whatnot', domains: ['whatnot.com'] },
] as const

export type SocialVisibility = Partial<Record<typeof SOCIAL_PLATFORMS[number]['key'], boolean>>

export function normalizeSocialVisibility(value: unknown): SocialVisibility {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(SOCIAL_PLATFORMS.filter(({ key }) =>
    typeof (value as Record<string, unknown>)[key] === 'boolean',
  ).map(({ key }) => [key, (value as Record<string, boolean>)[key]]))
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
