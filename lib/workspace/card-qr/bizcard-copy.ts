import { normalizeAmethystCustomDomainCandidate } from '@/lib/amethyst/host-routing'
import { SOCIAL_HERO_ORDER } from '@/lib/public-site/social-hero'
import { CARD_QR_SOCIAL_PLATFORM_LABELS } from '@/lib/workspace/card-qr/design'
import { flyerFirstName } from '@/lib/workspace/card-qr/flyer-copy'

/** One handle for the card. Instagram, then TikTok, then the rest. Links become @handle. */
export function bizcardSocialHandle(handles: Record<string, string | null | undefined> | null | undefined) {
  return bizcardSocial(handles).handle
}

/**
 * The handle plus the platform it came from. The rep's chosen platform goes first;
 * if that one is empty we fall back, and the mark follows the handle actually shown
 * so the icon never mislabels it. One leading @ only.
 */
export function bizcardSocial(
  handles: Record<string, string | null | undefined> | null | undefined,
  preferred?: string,
): { handle: string; platform: string } {
  const all = handles ?? {}
  const base = ['instagram', 'tiktok', ...SOCIAL_HERO_ORDER.filter((p) => p !== 'instagram' && p !== 'tiktok')]
  const order = preferred ? [preferred, ...base.filter((p) => p !== preferred)] : base
  for (const platform of order) {
    const raw = all[platform]?.trim()
    if (!raw) continue
    const path = raw.replace(/^https?:\/\/(www\.|m\.)?/i, '').replace(/[?#].*$/, '').replace(/\/+$/, '')
    const isUrl = /^[a-z0-9-]+(\.[a-z0-9-]+)+\//i.test(path)
    const segs = path.split('/')
    const at = segs.find((s) => s.startsWith('@'))
    const seg = (at ?? segs[segs.length - 1])?.replace(/^@+/, '')
    if (!seg || !/^[A-Za-z0-9._]{1,30}$/.test(seg)) continue
    if (/^(profile\.php|watch|channel|groups|pages|people)$/i.test(seg)) continue
    if (!at && !isUrl && /\.(com|net|org)$/i.test(seg)) continue
    return { handle: `@${seg}`, platform }
  }
  return { handle: '', platform: '' }
}

function socialPlatformLabel(platform: string) {
  if (platform in CARD_QR_SOCIAL_PLATFORM_LABELS) {
    return CARD_QR_SOCIAL_PLATFORM_LABELS[platform as keyof typeof CARD_QR_SOCIAL_PLATFORM_LABELS]
  }
  if (platform === 'whatnot') return 'Whatnot'
  return platform ? platform.charAt(0).toUpperCase() + platform.slice(1) : ''
}

/** Hint under the card's social picker. Names the platform the card will actually print. */
export function bizcardSocialHint(
  handles: Record<string, string | null | undefined> | null | undefined,
  preferred: string,
) {
  const chosen = socialPlatformLabel(preferred)
  const shown = bizcardSocial(handles, preferred)
  if (!shown.handle || shown.platform === preferred) {
    return shown.handle
      ? `Your ${chosen} handle shows on the back with the ${chosen} icon.`
      : `Add your ${chosen} link in Site settings to show it on the card.`
  }
  const used = socialPlatformLabel(shown.platform)
  return `Add your ${chosen} link in Site settings to show it. Until then the card uses your ${used} handle, with that app's icon.`
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
