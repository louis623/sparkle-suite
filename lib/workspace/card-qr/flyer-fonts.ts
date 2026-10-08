import { readdirSync } from 'node:fs'
import path from 'node:path'
import {
  AMETHYST_APPEARANCE_PRESET_IDS,
  type AmethystAppearancePresetId,
} from '@/lib/amethyst/appearance-presets'
import { AMETHYST_SKIN_CARDS } from '@/lib/amethyst/skin-cards'

export const FLYER_FONT_ROOT = path.join(
  process.cwd(),
  'lib/workspace/card-qr/fonts',
)

export interface FlyerFontFace {
  family: string
  directory: string
  sourceUrl: string
}

export const FLYER_FONT_FACES = {
  'Playfair Display': {
    family: 'Playfair Display',
    directory: 'playfair-display',
    sourceUrl: 'https://github.com/google/fonts/tree/main/ofl/playfairdisplay',
  },
  'DM Sans': {
    family: 'DM Sans',
    directory: 'dm-sans',
    sourceUrl: 'https://github.com/google/fonts/tree/main/ofl/dmsans',
  },
  Italiana: {
    family: 'Italiana',
    directory: 'italiana',
    sourceUrl: 'https://github.com/google/fonts/tree/main/ofl/italiana',
  },
  Inter: {
    family: 'Inter',
    directory: 'inter',
    sourceUrl: 'https://github.com/google/fonts/tree/main/ofl/inter',
  },
  'Great Vibes': {
    family: 'Great Vibes',
    directory: 'great-vibes',
    sourceUrl: 'https://github.com/google/fonts/tree/main/ofl/greatvibes',
  },
  'Cormorant Garamond': {
    family: 'Cormorant Garamond',
    directory: 'cormorant-garamond',
    sourceUrl: 'https://github.com/google/fonts/tree/main/ofl/cormorantgaramond',
  },
  Lato: {
    family: 'Lato',
    directory: 'lato',
    sourceUrl: 'https://github.com/google/fonts/tree/main/ofl/lato',
  },
  Nunito: {
    family: 'Nunito',
    directory: 'nunito',
    sourceUrl: 'https://github.com/google/fonts/tree/main/ofl/nunito',
  },
  Bitter: {
    family: 'Bitter',
    directory: 'bitter',
    sourceUrl: 'https://github.com/google/fonts/tree/main/ofl/bitter',
  },
  Archivo: {
    family: 'Archivo',
    directory: 'archivo',
    sourceUrl: 'https://github.com/google/fonts/tree/main/ofl/archivo',
  },
  Gelasio: {
    family: 'Gelasio',
    directory: 'gelasio',
    sourceUrl: 'https://github.com/google/fonts/tree/main/ofl/gelasio',
  },
  Arimo: {
    family: 'Arimo',
    directory: 'arimo',
    sourceUrl: 'https://github.com/google/fonts/tree/main/ofl/arimo',
  },
  'Noto Sans': {
    family: 'Noto Sans',
    directory: 'noto-sans',
    sourceUrl: 'https://github.com/google/fonts/tree/main/ofl/notosans',
  },
} as const satisfies Record<string, FlyerFontFace>

export type FlyerFontFamily = keyof typeof FLYER_FONT_FACES

/**
 * Fontshare fonts are not bundled. Their ITF Free Font License v2.0 (17 Aug 2026)
 * forbids putting the files in a repository or on public servers, and forbids
 * serving them through a SaaS or design tool where third parties generate content.
 * This repo is public. These OFL look-alikes are for Louis to judge at Build 4.
 */
export const FLYER_FONT_SUBSTITUTES = {
  Boska: 'Cormorant Garamond',
  Switzer: 'Inter',
  Melodrama: 'Playfair Display',
  Sharpie: 'Great Vibes',
  Ranade: 'DM Sans',
} as const satisfies Record<string, FlyerFontFamily>

const SKIN_FONT_TO_FACE: Record<string, FlyerFontFamily> = {
  'Playfair Display': 'Playfair Display',
  'DM Sans': 'DM Sans',
  Italiana: 'Italiana',
  Inter: 'Inter',
  'Great Vibes': 'Great Vibes',
  'Cormorant Garamond': 'Cormorant Garamond',
  Lato: 'Lato',
  Nunito: 'Nunito',
  Bitter: 'Bitter',
  Archivo: 'Archivo',
  Gelasio: 'Gelasio',
  Arimo: 'Arimo',
  'Noto Sans': 'Noto Sans',
  Georgia: 'Gelasio',
  Arial: 'Arimo',
  ...FLYER_FONT_SUBSTITUTES,
}

export const FLYER_FALLBACK_FONT: FlyerFontFamily = 'Noto Sans'

function faceForSkinFont(label: string): FlyerFontFamily {
  const primary = label.split('/')[0]?.trim() ?? ''
  const face = SKIN_FONT_TO_FACE[primary]
  if (!face) {
    throw new Error(`No bundled flyer font for skin font "${label}".`)
  }
  return face
}

export const FLYER_THEME_FONTS: Record<
  AmethystAppearancePresetId,
  { heading: FlyerFontFamily; body: FlyerFontFamily }
> = Object.fromEntries(
  AMETHYST_SKIN_CARDS.map((card) => [
    card.id,
    {
      heading: faceForSkinFont(card.headingFont),
      body: faceForSkinFont(card.bodyFont),
    },
  ]),
) as Record<
  AmethystAppearancePresetId,
  { heading: FlyerFontFamily; body: FlyerFontFamily }
>

for (const id of AMETHYST_APPEARANCE_PRESET_IDS) {
  if (!FLYER_THEME_FONTS[id]) {
    throw new Error(`Flyer theme font map is missing ${id}.`)
  }
}

export function isKnownFlyerTheme(
  value: string | null | undefined,
): value is AmethystAppearancePresetId {
  return (
    typeof value === 'string' &&
    (AMETHYST_APPEARANCE_PRESET_IDS as readonly string[]).includes(value)
  )
}

const fontFileCache = new Map<FlyerFontFamily, string>()

export function flyerFontFile(family: FlyerFontFamily) {
  const cached = fontFileCache.get(family)
  if (cached) return cached
  const face = FLYER_FONT_FACES[family]
  const directory = path.join(FLYER_FONT_ROOT, face.directory)
  const file = readdirSync(directory).find((name) => /\.(ttf|otf)$/i.test(name))
  if (!file) {
    throw new Error(`Missing bundled font file for ${family}.`)
  }
  const fullPath = path.join(directory, file)
  fontFileCache.set(family, fullPath)
  return fullPath
}

export function flyerFontFilesForTheme(theme: AmethystAppearancePresetId) {
  const fonts = FLYER_THEME_FONTS[theme]
  return [
    ...new Set([
      flyerFontFile(fonts.heading),
      flyerFontFile(fonts.body),
      flyerFontFile(FLYER_FALLBACK_FONT),
    ]),
  ]
}
