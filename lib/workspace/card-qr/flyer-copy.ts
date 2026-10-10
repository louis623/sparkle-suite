import { AMETHYST_SKIN_CARDS } from '@/lib/amethyst/skin-cards'
import { normalizeAmethystCustomDomainCandidate } from '@/lib/amethyst/host-routing'
import type { AmethystAppearancePresetId } from '@/lib/amethyst/appearance-presets'

/** Kelly, Kim, Lindsey, and Brittany. Hand-made files are registered in Build 8. */
export const CARD_QR_CUSTOM_FLYER_THEMES = [
  'neon_butterfly',
  'gnome_garden',
  'alpine_opal',
  'black_diamond',
] as const satisfies readonly AmethystAppearancePresetId[]

export const CARD_QR_FLYER_BEING_BUILT_MESSAGE = 'Your custom flyer is being built.'

export const CARD_QR_FLYER_BEING_BUILT = {
  code: 'CARD_QR_FLYER_BEING_BUILT',
  status: 'being_built' as const,
  message: CARD_QR_FLYER_BEING_BUILT_MESSAGE,
}

/** The 14 live shared themes. Rose Quartz is retired. Custom themes are hand-made. */
export const CARD_QR_SHARED_FLYER_THEMES = AMETHYST_SKIN_CARDS.filter(
  (card) => card.visibility === 'community' && card.selectable !== false,
).map((card) => card.id)

export function isCustomFlyerTheme(
  theme: string | null | undefined,
): theme is (typeof CARD_QR_CUSTOM_FLYER_THEMES)[number] {
  return (
    typeof theme === 'string' &&
    (CARD_QR_CUSTOM_FLYER_THEMES as readonly string[]).includes(theme)
  )
}

export interface CardQrFlyerCopy {
  showTitle: string
  tagline: string
  firstName: string
  website: string | null
}

export function flyerWebsiteLabel(customDomain: string | null | undefined) {
  const host = normalizeAmethystCustomDomainCandidate(customDomain)
  if (!host) return null
  return host.replace(/^www\./i, '').toUpperCase()
}

export function flyerFirstName(displayName: string | null | undefined) {
  const token = displayName?.trim().split(/\s+/)[0] ?? ''
  return token
}

/**
 * Flyer words only. Show title and tagline, never the ticker, email, or social links.
 * The website line exists only for a real custom domain.
 */
export function buildCardQrFlyerCopy(input: {
  businessName?: string | null
  displayName?: string | null
  tagline?: string | null
  customDomain?: string | null
}): CardQrFlyerCopy {
  const business = input.businessName?.trim() ?? ''
  const displayName = input.displayName?.trim() ?? ''
  return {
    showTitle: business || displayName,
    tagline: input.tagline?.trim() ?? '',
    firstName: flyerFirstName(displayName),
    website: flyerWebsiteLabel(input.customDomain),
  }
}

/** Flyer line for the rep-entered text-to-link number. Empty when none was entered. */
export function flyerTextLinkLine(number: string | null | undefined) {
  const n = number?.trim() ?? ''
  return n ? `Text ${n} for the shop link` : ''
}
