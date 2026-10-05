import {
  AMETHYST_APPEARANCE_PRESETS,
  DEFAULT_AMETHYST_APPEARANCE_PRESET,
  type AmethystAppearancePresetId,
} from '@/lib/amethyst/appearance-presets'
import type { CardQrTemplateId } from '@/lib/workspace/card-qr/design'

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
  if (input.templateId === 'halloween') {
    return {
      name: 'Halloween',
      background: '#1a0b16',
      ink: '#fff6ea',
      muted: '#f0c9a0',
      accent: '#ff6a00',
      panel: '#2a1420',
      qrDark: '#1a0b16',
      qrLight: '#fff6ea',
    }
  }

  if (input.templateId === 'classic-ivory') {
    return {
      name: 'Classic ivory',
      background: '#f7f1e6',
      ink: '#2c2118',
      muted: '#6d5c4e',
      accent: '#8c3a55',
      panel: '#fffaf3',
      qrDark: '#2c2118',
      qrLight: '#fffaf3',
    }
  }

  const id = presetId(input.appearancePreset)
  const preset = AMETHYST_APPEARANCE_PRESETS[id]
  const surface = MATCH_SITE_SURFACES[id]
  return {
    name: preset.label,
    ...surface,
    accent: preset.values.primaryColor,
    qrDark: surface.ink,
    qrLight: surface.panel,
  }
}
