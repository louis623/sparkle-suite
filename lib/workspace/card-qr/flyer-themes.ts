import path from 'node:path'
import {
  AMETHYST_APPEARANCE_PRESET_IDS,
  type AmethystAppearancePresetId,
} from '@/lib/amethyst/appearance-presets'

export type FlyerDesignStatus = 'art' | 'simple' | 'custom' | 'retired'

export interface FlyerThemeRecord {
  theme: AmethystAppearancePresetId
  status: FlyerDesignStatus
  /** Repo-relative 1080×1920 plate. Art themes only. */
  plate?: string
  /** Repo-relative source art the plate was rebuilt from. */
  source?: string
  note: string
}

const skin = (folder: string, file: string) => `public/amethyst/skins/${folder}/${file}`

export const FLYER_THEME_RECORDS: readonly FlyerThemeRecord[] = [
  {
    theme: 'amethyst',
    status: 'art',
    source: skin('am01-unicorn', 'hero-poster.webp'),
    plate: skin('am01-unicorn', 'flyer/plate.webp'),
    note: 'Unicorn poster recomposed top and bottom around a quiet center.',
  },
  {
    theme: 'sparkle_suite_morganite',
    status: 'simple',
    note: 'Generated blush, plum, and hot-pink light. No scene art yet.',
  },
  {
    theme: 'black_diamond',
    status: 'custom',
    note: 'Hand-made per rep. The generator does not ship a plate.',
  },
  {
    theme: 'moonstone',
    status: 'simple',
    note: 'Generated charcoal, violet, and silver light. No scene art yet.',
  },
  {
    theme: 'alpine_opal',
    status: 'custom',
    note: 'Hand-made per rep. The generator does not ship a plate.',
  },
  {
    theme: 'emerald_garden',
    status: 'simple',
    note: 'Generated gardenia, emerald, and champagne light. No scene art yet.',
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
    note: 'Witch scene recomposed around the QR window.',
  },
  {
    theme: 'halloween_pumpkin_cat',
    status: 'art',
    source: skin('halloween-pumpkin-cat', 'hero-mobile.webp'),
    plate: skin('halloween-pumpkin-cat', 'flyer/plate.webp'),
    note: 'Cat and pumpkin recomposed above and below the QR window.',
  },
  {
    theme: 'gilded_autumn',
    status: 'art',
    source: skin('gilded-autumn', 'hero-poster.webp'),
    plate: skin('gilded-autumn', 'flyer/plate.webp'),
    note: 'Autumn poster recomposed around the QR window.',
  },
  {
    theme: 'rose_gold',
    status: 'simple',
    note: 'Generated pearl, rose, and champagne light. No scene art yet.',
  },
  {
    theme: 'midnight_rose',
    status: 'art',
    source: skin('midnight-rose', 'hero-poster.webp'),
    plate: skin('midnight-rose', 'flyer/plate.webp'),
    note: 'Midnight rose poster recomposed around the QR window.',
  },
  {
    theme: 'pearl_rose',
    status: 'art',
    source: skin('pearl-rose', 'hero-poster.webp'),
    plate: skin('pearl-rose', 'flyer/plate.webp'),
    note: 'Pearl rose poster recomposed around the QR window.',
  },
  {
    theme: 'rose_champagne',
    status: 'art',
    source: skin('rose-champagne', 'hero-poster.webp'),
    plate: skin('rose-champagne', 'flyer/plate.webp'),
    note: 'Rose champagne poster recomposed around the QR window.',
  },
  {
    theme: 'garnet',
    status: 'simple',
    note: 'Generated blush shell and deep red light. No scene art yet.',
  },
  {
    theme: 'amber',
    status: 'simple',
    note: 'Generated sunlit peach and amber light. No scene art yet.',
  },
  {
    theme: 'velvet',
    status: 'simple',
    note: 'Generated orchid and deep violet light. No scene art yet.',
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
