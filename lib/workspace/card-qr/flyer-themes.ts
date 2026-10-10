import path from 'node:path'
import {
  AMETHYST_APPEARANCE_PRESET_IDS,
  type AmethystAppearancePresetId,
} from '@/lib/amethyst/appearance-presets'

export type FlyerDesignStatus = 'art' | 'simple' | 'custom' | 'retired'

/** Frosted panels let the plate show through. Solid panels stay nearly opaque. */
export type FlyerPanelStyle = 'frosted' | 'solid'

export interface FlyerThemeRecord {
  theme: AmethystAppearancePresetId
  status: FlyerDesignStatus
  /** Repo-relative 1080×1920 wraparound plate. Shared themes only. */
  plate?: string
  /** Repo-relative source art the plate was rebuilt from. */
  source?: string
  /** Defaults to solid. Frosted is only for themes Louis picked that way. */
  panelStyle?: FlyerPanelStyle
  note: string
}

const skin = (folder: string, file: string) => `public/amethyst/skins/${folder}/${file}`

export const FLYER_THEME_RECORDS: readonly FlyerThemeRecord[] = [
  {
    theme: 'amethyst',
    status: 'art',
    source: skin('am01-unicorn', 'hero-poster.webp'),
    plate: skin('am01-unicorn', 'flyer/plate.webp'),
    panelStyle: 'frosted',
    note: 'Louis pick 2026-10-09: unicorn poster plate. Frosted title and steps panels. QR card stays solid white.',
  },
  {
    theme: 'sparkle_suite_morganite',
    status: 'simple',
    plate: skin('morganite', 'flyer/plate.webp'),
    note: 'Louis pick 2026-10-09: v1 blush paper and sparkle. Placeholder; Morganite is going to be redone or scrapped. Solid panels.',
  },
  {
    theme: 'black_diamond',
    status: 'custom',
    note: 'Hand-made per rep. The generator does not ship a plate.',
  },
  {
    theme: 'moonstone',
    status: 'simple',
    plate: skin('moonstone', 'flyer/plate.webp'),
    note: 'Louis pick 2026-10-09: v1 night-sky paper and sparkle. Solid panels. Non-art themes use option 1.',
  },
  {
    theme: 'alpine_opal',
    status: 'custom',
    note: 'Hand-made per rep. The generator does not ship a plate.',
  },
  {
    theme: 'emerald_garden',
    status: 'simple',
    plate: skin('emerald-garden', 'flyer/plate.webp'),
    note: 'Louis pick 2026-10-09: v1 mint paper and sparkle. Solid panels. Non-art themes use option 1.',
  },
  {
    theme: 'gnome_garden',
    status: 'custom',
    note: 'Hand-made per rep. Kim’s storybook flyer is the reference, not a generated plate.',
  },
  {
    theme: 'neon_butterfly',
    status: 'custom',
    note: 'Hand-made per rep. Kelly’s butterfly flyer is the reference, not a generated plate.',
  },
  {
    theme: 'halloween_pumpkin_witch',
    status: 'art',
    source: skin('halloween-pumpkin-witch', 'hero-desktop.webp'),
    plate: skin('halloween-pumpkin-witch', 'flyer/plate.webp'),
    note: 'Louis pick 2026-10-09: hero v2, witch only. Solid panels.',
  },
  {
    theme: 'halloween_pumpkin_cat',
    status: 'art',
    source: skin('halloween-pumpkin-cat', 'hero-mobile.webp'),
    plate: skin('halloween-pumpkin-cat', 'flyer/plate.webp'),
    note: 'Louis pick 2026-10-09: hero v1, centered. Solid panels.',
  },
  {
    theme: 'gilded_autumn',
    status: 'art',
    source: skin('gilded-autumn', 'hero-poster.webp'),
    plate: skin('gilded-autumn', 'flyer/plate.webp'),
    panelStyle: 'frosted',
    note: 'Louis pick 2026-10-09: v1 plate with frosted title and steps panels. QR card stays solid white.',
  },
  {
    theme: 'rose_gold',
    status: 'simple',
    plate: skin('rose-gold', 'flyer/plate.webp'),
    note: 'Louis pick 2026-10-09: v1 theme-color paper and sparkle. Solid panels. Non-art themes use option 1.',
  },
  {
    theme: 'midnight_rose',
    status: 'art',
    source: skin('midnight-rose', 'hero-poster.webp'),
    plate: skin('midnight-rose', 'flyer/plate.webp'),
    note: 'Louis pick 2026-10-09: v2 hero with solid panels. The hero has no roses.',
  },
  {
    theme: 'pearl_rose',
    status: 'art',
    source: skin('pearl-rose', 'hero-poster.webp'),
    plate: skin('pearl-rose', 'flyer/plate.webp'),
    note: 'Louis pick 2026-10-09: v2 hero with solid panels.',
  },
  {
    theme: 'rose_champagne',
    status: 'art',
    source: skin('rose-champagne', 'hero-poster.webp'),
    plate: skin('rose-champagne', 'flyer/plate.webp'),
    note: 'Louis pick 2026-10-09: v2 hero with solid panels.',
  },
  {
    theme: 'garnet',
    status: 'simple',
    plate: skin('garnet', 'flyer/plate.webp'),
    note: 'Louis pick 2026-10-09: v1 theme-color paper and sparkle. Solid panels. Non-art themes use option 1.',
  },
  {
    theme: 'amber',
    status: 'simple',
    plate: skin('amber', 'flyer/plate.webp'),
    note: 'Louis pick 2026-10-09: v1 theme-color paper and sparkle. Solid panels. Non-art themes use option 1.',
  },
  {
    theme: 'velvet',
    status: 'simple',
    plate: skin('velvet', 'flyer/plate.webp'),
    note: 'Louis pick 2026-10-09: v1 theme-color paper and sparkle. Solid panels. Non-art themes use option 1.',
  },
  {
    theme: 'rose_quartz',
    status: 'retired',
    note: 'Retired theme. A generated pink plate still renders if a saved preset asks for it.',
  },
]

const recordsByTheme = new Map(FLYER_THEME_RECORDS.map((record) => [record.theme, record]))

export function flyerThemeRecord(theme: AmethystAppearancePresetId) {
  const record = recordsByTheme.get(theme)
  if (!record) throw new Error(`Missing flyer design record for ${theme}.`)
  return record
}

export function flyerPanelStyle(theme: AmethystAppearancePresetId): FlyerPanelStyle {
  return flyerThemeRecord(theme).panelStyle ?? 'solid'
}

export function flyerPlateAbsolute(theme: AmethystAppearancePresetId) {
  const plate = flyerThemeRecord(theme).plate
  if (!plate) return null
  return path.join(/*turbopackIgnore: true*/ process.cwd(), plate)
}

export function assertFlyerThemeRecordsComplete() {
  const seen = new Set<AmethystAppearancePresetId>()
  for (const record of FLYER_THEME_RECORDS) {
    if (seen.has(record.theme)) throw new Error(`Duplicate flyer design record for ${record.theme}.`)
    seen.add(record.theme)
  }
  for (const theme of AMETHYST_APPEARANCE_PRESET_IDS) {
    if (!seen.has(theme)) throw new Error(`Theme ${theme} has no flyer design record.`)
  }
}
