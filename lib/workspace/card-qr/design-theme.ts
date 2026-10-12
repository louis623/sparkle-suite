import { AMETHYST_SKIN_CARDS } from '@/lib/amethyst/skin-cards'
import { BIZCARD_SHARED_THEMES, BIZCARD_THEMES, type BizcardKey } from '@/lib/workspace/card-qr/bizcard-themes'
import { CARD_QR_SHARED_FLYER_THEMES } from '@/lib/workspace/card-qr/flyer-copy'
import { resolveCardQrPalette } from '@/lib/workspace/card-qr/palette'
import { ServiceError } from '@/lib/services/errors'

/**
 * Design theme picker (Louis, Oct 11): a per-visit override for the QR colors, flyer and card.
 * Never saved and never touches the live site. "site" means the rep's own site design.
 */
export const CARD_QR_DESIGN_THEME_SITE = 'site'

export interface CardQrDesignThemeOption {
  /** "site" or a shared theme id. */
  id: string
  /** Theme id used for QR colors. */
  preset: string
  label: string
  thumb: string | null
  dots: string[]
  qrDark: string
  isSite: boolean
}

function option(id: string, preset: string, label: string, key: BizcardKey | null, isSite: boolean, swatches?: string[]): CardQrDesignThemeOption {
  const card = key ? BIZCARD_THEMES[key] : null
  const qrDark = resolveCardQrPalette({ templateId: 'match-site', appearancePreset: preset }).qrDark
  const dots = (swatches && swatches.length ? swatches.slice(0, 3) : card ? [card.back, card.name, card.sub] : [])
  return { id, preset, label, thumb: key ? `/card-qr-themes/${key}.webp` : null, dots: [...dots, qrDark].slice(0, 4), qrDark, isSite }
}

/**
 * Site design first, then the 14 shared themes. A shared-theme rep's own theme is the site tile
 * (not listed twice). siteCardKey is the rep's resolved card art (custom reps get their own).
 */
export function cardQrDesignThemeOptions(sitePreset: string, siteCardKey: BizcardKey | null): CardQrDesignThemeOption[] {
  const skins = new Map(AMETHYST_SKIN_CARDS.map((c) => [c.id as string, c]))
  const shared = CARD_QR_SHARED_FLYER_THEMES as readonly string[]
  const siteIsShared = shared.includes(sitePreset) && (!siteCardKey || BIZCARD_SHARED_THEMES[sitePreset] === siteCardKey)
  const siteSkin = skins.get(sitePreset)
  const site = option(
    CARD_QR_DESIGN_THEME_SITE,
    sitePreset,
    siteIsShared ? siteSkin?.label ?? 'Your site' : 'Your custom design',
    siteCardKey ?? BIZCARD_SHARED_THEMES[sitePreset] ?? null,
    true,
    siteIsShared ? siteSkin?.swatches.map((s) => s.value) : undefined,
  )
  const rest = shared
    .filter((id) => !(siteIsShared && id === sitePreset))
    .map((id) => option(id, id, skins.get(id)?.label ?? id, BIZCARD_SHARED_THEMES[id] ?? null, false, skins.get(id)?.swatches.map((s) => s.value)))
  return [site, ...rest]
}

/**
 * Server side: the theme a render should use. null / "site" mean the
 * rep's own design (unchanged behavior). Anything else must be one of the 14 shared themes.
 */
export function readCardQrDesignTheme(value: unknown, _sitePreset?: string): string | null {
  if (value === undefined || value === null || value === '' || value === CARD_QR_DESIGN_THEME_SITE) return null
  if (typeof value === 'string' && (CARD_QR_SHARED_FLYER_THEMES as readonly string[]).includes(value)) return value
  throw new ServiceError({
    code: 'CARD_QR_DESIGN_THEME_INVALID',
    message: 'Design theme must be the site design or one of the shared themes.',
    userMessage: 'Pick one of the design themes shown.',
    statusCode: 400,
  })
}
