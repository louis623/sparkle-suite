export const PUBLIC_SITE_SLUG_MIN_LENGTH = 3
export const PUBLIC_SITE_SLUG_MAX_LENGTH = 48

export const RESERVED_PUBLIC_SITE_SLUGS = new Set([
  'login',
  'logout',
  'admin',
  'api',
  'support',
  'pricing',
  'start',
  'terms',
  'privacy',
  'nicnac',
  'nic-nac',
  'workspace',
  'dashboard',
  'account',
  'settings',
  'help',
  'docs',
  'amethyst',
  'prelaunch',
  'controlcenter',
  'control-center',
  'onboarding',
])

export type PublicSiteSlugValidation =
  | { ok: true }
  | { ok: false; reason: 'empty' | 'format' | 'reserved' | 'too_short' | 'too_long' }

export function generatePublicSiteSlug(value: string | null | undefined) {
  return (value ?? '')
    .toLowerCase()
    .replace(/['’]s\b/g, '')
    .replace(/[^a-z0-9]/g, '')
}

export function validatePublicSiteSlug(
  value: string | null | undefined,
): PublicSiteSlugValidation {
  const slug = value?.trim().toLowerCase() ?? ''
  if (!slug) return { ok: false, reason: 'empty' }
  if (!/^[a-z0-9]+$/.test(slug)) return { ok: false, reason: 'format' }
  if (slug.length < PUBLIC_SITE_SLUG_MIN_LENGTH) {
    return { ok: false, reason: 'too_short' }
  }
  if (slug.length > PUBLIC_SITE_SLUG_MAX_LENGTH) {
    return { ok: false, reason: 'too_long' }
  }
  if (RESERVED_PUBLIC_SITE_SLUGS.has(slug)) {
    return { ok: false, reason: 'reserved' }
  }
  return { ok: true }
}

export function getPublicSiteSlugAlternatives(base: string) {
  const cleanBase = generatePublicSiteSlug(base).slice(
    0,
    PUBLIC_SITE_SLUG_MAX_LENGTH - 4,
  )
  const fallback = cleanBase.length >= PUBLIC_SITE_SLUG_MIN_LENGTH
    ? cleanBase
    : 'sparkleshow'
  return [`${fallback}live`, `${fallback}shop`, `${fallback}bp`].filter(
    (candidate) => validatePublicSiteSlug(candidate).ok,
  )
}

export function buildPublicSitePath(slug: string | null | undefined) {
  const cleanSlug = generatePublicSiteSlug(slug)
  return cleanSlug ? `/${cleanSlug}` : '/amethyst/Homepage.html'
}

export function buildPublicSiteUrl(
  slug: string,
  origin = 'https://www.yoursparklesuite.com',
) {
  return `${origin.replace(/\/$/, '')}${buildPublicSitePath(slug)}`
}
