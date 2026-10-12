import {
  AMETHYST_APPEARANCE_PRESETS,
  DEFAULT_AMETHYST_APPEARANCE_PRESET,
  type AmethystAppearancePresetId,
} from '@/lib/amethyst/appearance-presets'
import type { CardQrTemplateId } from '@/lib/workspace/card-qr/design'
import { qrModuleColor } from '@/lib/workspace/card-qr/flyer-contrast'

export interface CardQrPalette {
  name: string
  background: string
  ink: string
  muted: string
  accent: string
  panel: string
  qrDark: string
  qrLight: string
}

const MATCH_SITE_SURFACES: Record<
  AmethystAppearancePresetId,
  Pick<CardQrPalette, 'background' | 'ink' | 'muted' | 'panel'>
> = {
  amethyst: { background: '#f4edff', ink: '#24124a', muted: '#5c4d78', panel: '#ffffff' },
  sparkle_suite_morganite: { background: '#fff4f8', ink: '#3a1630', muted: '#7a5368', panel: '#ffffff' },
  black_diamond: { background: '#111111', ink: '#f8f1dc', muted: '#d9cba8', panel: '#1c1c1c' },
  moonstone: { background: '#1c1630', ink: '#f4f0ff', muted: '#c9bddf', panel: '#2a2344' },
  alpine_opal: { background: '#f3fbff', ink: '#1d2340', muted: '#4d5d78', panel: '#ffffff' },
  emerald_garden: { background: '#f3fbf6', ink: '#123028', muted: '#3f6556', panel: '#ffffff' },
  gnome_garden: { background: '#f8f3ea', ink: '#3a2018', muted: '#6d5346', panel: '#fffaf3' },
  neon_butterfly: { background: '#140018', ink: '#ffe6f7', muted: '#e7b6d4', panel: '#2a0a2e' },
  halloween_pumpkin_witch: { background: '#1a0d08', ink: '#fff4e8', muted: '#f0c9a0', panel: '#2a160f' },
  halloween_pumpkin_cat: { background: '#1a0d08', ink: '#fff4e8', muted: '#f0c9a0', panel: '#2a160f' },
  gilded_autumn: { background: '#fff6ea', ink: '#3a2410', muted: '#7a5a32', panel: '#fffaf3' },
  rose_gold: { background: '#fff5f6', ink: '#3a1824', muted: '#7a5360', panel: '#ffffff' },
  midnight_rose: { background: '#2a1218', ink: '#fff1ea', muted: '#e7c2b6', panel: '#3b1c24' },
  pearl_rose: { background: '#fff8f6', ink: '#3a2430', muted: '#7a5d68', panel: '#ffffff' },
  rose_champagne: { background: '#fff7f4', ink: '#3a2430', muted: '#7a5d68', panel: '#ffffff' },
  garnet: { background: '#fff5f5', ink: '#3a1014', muted: '#7a4548', panel: '#ffffff' },
  amber: { background: '#fff8f1', ink: '#3a220c', muted: '#7a5a32', panel: '#ffffff' },
  velvet: { background: '#1a1024', ink: '#f7efff', muted: '#d2c0ea', panel: '#2a1b3a' },
  rose_quartz: { background: '#fdf4ff', ink: '#3a1848', muted: '#7a5a88', panel: '#ffffff' },
}

/**
 * Dark brand color for QR modules. Light primaries are not used as-is.
 * qrModuleColor darkens anything that is under 7:1 on white.
 */
const CARD_QR_THEME_DARK: Record<AmethystAppearancePresetId, string> = {
  amethyst: '#3d0cb0',
  sparkle_suite_morganite: '#5b1e3b',
  black_diamond: '#1a1408',
  moonstone: '#2a2150',
  alpine_opal: '#3a1848',
  emerald_garden: '#064e3b',
  gnome_garden: '#3a2018',
  neon_butterfly: '#3a0a28',
  halloween_pumpkin_witch: '#6b2e0a',
  halloween_pumpkin_cat: '#6b2e0a',
  gilded_autumn: '#3a2410',
  rose_gold: '#5a2434',
  midnight_rose: '#4a1c28',
  pearl_rose: '#5a2434',
  rose_champagne: '#5a2430',
  garnet: '#6b1218',
  amber: '#7a3410',
  velvet: '#4a1868',
  rose_quartz: '#5a1848',
}

function presetId(value: string | null | undefined): AmethystAppearancePresetId {
  if (value && value in AMETHYST_APPEARANCE_PRESETS) {
    return value as AmethystAppearancePresetId
  }
  return DEFAULT_AMETHYST_APPEARANCE_PRESET
}

export function resolveCardQrPalette(input: {
  templateId: CardQrTemplateId
  appearancePreset?: string | null
}): CardQrPalette {
  // Saved template ids (including halloween and classic-ivory) are ignored.
  // The flyer and the QR follow the current site theme. Modules are a dark
  // theme color on a white quiet zone, at least 7:1 against white.
  const id = presetId(input.appearancePreset)
  const preset = AMETHYST_APPEARANCE_PRESETS[id]
  const surface = MATCH_SITE_SURFACES[id]
  return {
    name: preset.label,
    ...surface,
    accent: preset.values.primaryColor,
    qrDark: qrModuleColor(CARD_QR_THEME_DARK[id]),
    qrLight: '#FFFFFF',
  }
}
