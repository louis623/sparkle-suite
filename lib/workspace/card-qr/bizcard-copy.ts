import { normalizeAmethystCustomDomainCandidate } from '@/lib/amethyst/host-routing'
import { SOCIAL_HERO_ORDER } from '@/lib/public-site/social-hero'
import { flyerFirstName } from '@/lib/workspace/card-qr/flyer-copy'

/** One handle for the card. Instagram, then TikTok, then the rest. Links become @handle. */
export function bizcardSocialHandle(handles: Record<string, string | null | undefined> | null | undefined) {
  const all = handles ?? {}
  const order = ['instagram', 'tiktok', ...SOCIAL_HERO_ORDER.filter((p) => p !== 'instagram' && p !== 'tiktok')]
  for (const platform of order) {
    const raw = all[platform]?.trim()
    if (!raw) continue
    const seg = raw
      .replace(/^https?:\/\/(www\.|m\.)?/i, '')
      .replace(/[?#].*$/, '')
      .replace(/\/+$/, '')
      .split('/')
      .pop()
      ?.replace(/^@/, '')
    if (seg && /^[A-Za-z0-9._]{1,30}$/.test(seg) && !/\.(com|net|org)$/i.test(seg)) return `@${seg}`
  }
  return ''
}

/** Custom domain only (Louis, Oct 8): no custom domain means no website line. */
export function bizcardWebsite(customDomain: string | null | undefined) {
  const host = normalizeAmethystCustomDomainCandidate(customDomain)
  return host ? host.replace(/^www\./i, '').toLowerCase() : ''
}

/**
 * Back name. The approved custom cards carry a last name the account lacks
 * (Kim's account only says "Kim"); use it only when it extends the account name.
 */
export function bizcardName(displayName: string | null | undefined, fullName?: string) {
  const name = displayName?.trim() ?? ''
  if (fullName && (!name || (!/\s/.test(name) && fullName.toLowerCase().startsWith(`${name.toLowerCase()} `)))) {
    return fullName
  }
  return name
}

export function bizcardFrontCopy(input: { businessName?: string | null; displayName?: string | null; fullName?: string }) {
  const business = input.businessName?.trim() ?? ''
  const display = input.displayName?.trim() || input.fullName || ''
  return { showTitle: business || display, firstName: flyerFirstName(display) }
}
