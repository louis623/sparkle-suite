import { AMETHYST_APPEARANCE_PRESET_IDS, normalizeAmethystAppearancePreset, type AmethystAppearancePresetId } from '@/lib/amethyst/appearance-presets'
import { AMETHYST_SKIN_CARDS } from '@/lib/amethyst/skin-cards'

export type LandingTheme = { id: AmethystAppearancePresetId; label: string; colors: string[] }
export type LandingDemo = {
  slug: string
  businessName: string
  theme: AmethystAppearancePresetId
  themeLabel: string
  headline: string
  subtitle: string
  ticker: string
  themes: LandingTheme[]
}

// Normalize only after membership validation: the shared normalizer defaults
// invalid values to Morganite, which must never silently replace this demo.
export function exactLandingTheme(value: unknown): AmethystAppearancePresetId | null {
  return typeof value === 'string' && AMETHYST_APPEARANCE_PRESET_IDS.includes(value as AmethystAppearancePresetId)
    ? normalizeAmethystAppearancePreset(value) : null
}

// Keep the owner-approved picker identical across Smoke and Live catalogs.
// This does not constrain the saved demo theme or rep theme inventory.
const LANDING_CHOICES = new Set<AmethystAppearancePresetId>([
  'amethyst', 'halloween_pumpkin_cat', 'gilded_autumn',
  'midnight_rose', 'pearl_rose', 'rose_champagne',
])

export function communityLandingThemes(rows: { skin_id: string; visibility: string }[]): LandingTheme[] {
  const community = new Set(rows.filter(row => row.visibility === 'community').map(row => row.skin_id))
  return AMETHYST_SKIN_CARDS.filter(card => community.has(card.id) && card.visibility === 'community' && card.selectable !== false && LANDING_CHOICES.has(card.id))
    .map(card => ({ id: card.id, label: card.label, colors: card.swatches.slice(0, 3).map(swatch => swatch.value) }))
}

export function permittedLandingTheme(demo: LandingDemo, requested: string | null) {
  if (!requested) return demo.theme
  return requested === demo.theme || demo.themes.some(theme => theme.id === requested) ? exactLandingTheme(requested) : null
}
