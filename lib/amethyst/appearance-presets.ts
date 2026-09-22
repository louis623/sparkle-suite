export const AMETHYST_CUSTOMER_SITE_TEMPLATE = 'amethyst' as const

export const AMETHYST_APPEARANCE_PRESET_IDS = [
  'amethyst',
  'sparkle_suite_morganite',
  'black_diamond',
  'moonstone',
  'alpine_opal',
  'emerald_garden',
  'gnome_garden',
  'neon_butterfly',
  'halloween_pumpkin_witch',
  'rose_gold',
  'garnet',
  'amber',
  'velvet',
  'rose_quartz',
] as const

export type AmethystCustomerSiteTemplate = typeof AMETHYST_CUSTOMER_SITE_TEMPLATE
export type AmethystAppearancePresetId =
  (typeof AMETHYST_APPEARANCE_PRESET_IDS)[number]

export const DEFAULT_AMETHYST_APPEARANCE_PRESET =
  'sparkle_suite_morganite' satisfies AmethystAppearancePresetId

export interface AmethystAppearancePreset {
  id: AmethystAppearancePresetId
  label: string
  description: string
  values: {
    primaryColor: string
    accentColor: string
    bgTone: string
    headingFont: string
    bodyFont: string
    headingWeight: number
    shapeRadius: string
    density: string
    saturation: number
    heroMotion: string
    sparkleLevel: string
    bgTreatment: string
    cardSurface: string
    textureOverlay: string
    buttonEnergy: string
    ctaEmphasis: string
    tradeFlair: string
    cursorEffect: string
    tickerSpeed: number
  }
}

export const AMETHYST_APPEARANCE_PRESETS: Record<
  AmethystAppearancePresetId,
  AmethystAppearancePreset
> = {
  amethyst: {
    id: 'amethyst',
    label: 'Amethyst',
    description: 'The default Sparkle Suite customer-site look.',
    values: {
      primaryColor: '#5C0EFF',
      accentColor: '#FF1AC2',
      bgTone: 'lavender',
      headingFont: 'italiana',
      bodyFont: 'inter',
      headingWeight: 600,
      shapeRadius: 'soft',
      density: 'regular',
      saturation: 130,
      heroMotion: 'sparkle_rise',
      sparkleLevel: 'glittery',
      bgTreatment: 'confetti',
      cardSurface: 'holographic',
      textureOverlay: 'sparkle',
      buttonEnergy: 'calm',
      ctaEmphasis: 'standard',
      tradeFlair: 'holo-unicorn',
      cursorEffect: 'sparkle',
      tickerSpeed: 1,
    },
  },
  sparkle_suite_morganite: {
    id: 'sparkle_suite_morganite',
    label: 'Sparkle Suite/Morganite',
    description:
      'Sparkle Suite polish with blush paper, plum ink, and refined pink accents.',
    values: {
      primaryColor: '#ee2c9b',
      accentColor: '#ff4cae',
      bgTone: 'suiteBlush',
      headingFont: 'playfair',
      bodyFont: 'dmSans',
      headingWeight: 500,
      shapeRadius: 'soft',
      density: 'regular',
      saturation: 104,
      heroMotion: 'soft_glow',
      sparkleLevel: 'subtle',
      bgTreatment: 'suite-paper',
      cardSurface: 'warm-paper',
      textureOverlay: 'none',
      buttonEnergy: 'suite-lift',
      ctaEmphasis: 'standard',
      tradeFlair: 'soft-pink-lift',
      cursorEffect: 'default',
      tickerSpeed: 1,
    },
  },
  black_diamond: {
    id: 'black_diamond',
    label: 'Black Diamond',
    description:
      'Black velvet reveal-night polish with gold, blush, and cyan live accents.',
    values: {
      primaryColor: '#d4af37',
      accentColor: '#00d9ff',
      bgTone: 'blackDiamond',
      headingFont: 'playfair',
      bodyFont: 'dmSans',
      headingWeight: 600,
      shapeRadius: 'soft',
      density: 'regular',
      saturation: 112,
      heroMotion: 'sparkle_rise',
      sparkleLevel: 'glittery',
      bgTreatment: 'black-velvet',
      cardSurface: 'dark-metallic',
      textureOverlay: 'sparkle',
      buttonEnergy: 'diamond-lift',
      ctaEmphasis: 'standard',
      tradeFlair: 'cyan-diamond',
      cursorEffect: 'default',
      tickerSpeed: 1,
    },
  },
  moonstone: {
    id: 'moonstone',
    label: 'Moonstone',
    description:
      'Purple, silver, and charcoal polish with cool moonlit cards and refined sparkle.',
    values: {
      primaryColor: '#7c3aed',
      accentColor: '#cbd5e1',
      bgTone: 'moonstone',
      headingFont: 'playfair',
      bodyFont: 'dmSans',
      headingWeight: 600,
      shapeRadius: 'soft',
      density: 'regular',
      saturation: 108,
      heroMotion: 'soft_glow',
      sparkleLevel: 'subtle',
      bgTreatment: 'moonstone-charcoal',
      cardSurface: 'silver-pearl',
      textureOverlay: 'none',
      buttonEnergy: 'moonstone-lift',
      ctaEmphasis: 'standard',
      tradeFlair: 'silver-violet',
      cursorEffect: 'default',
      tickerSpeed: 1,
    },
  },
  alpine_opal: {
    id: 'alpine_opal',
    label: 'Alpine Opal',
    description:
      'Iridescent mountain-lake polish with bright pink, violet, and icy blue reveal energy.',
    values: {
      primaryColor: '#ec4899',
      accentColor: '#38bdf8',
      bgTone: 'alpineOpal',
      headingFont: 'playfair',
      bodyFont: 'dmSans',
      headingWeight: 600,
      shapeRadius: 'soft',
      density: 'regular',
      saturation: 112,
      heroMotion: 'sparkle_rise',
      sparkleLevel: 'glittery',
      bgTreatment: 'alpine-opal',
      cardSurface: 'frosted-opal',
      textureOverlay: 'sparkle',
      buttonEnergy: 'alpine-pop',
      ctaEmphasis: 'standard',
      tradeFlair: 'opal-summit',
      cursorEffect: 'default',
      tickerSpeed: 1,
    },
  },
  emerald_garden: {
    id: 'emerald_garden',
    label: 'Emerald Garden',
    description:
      'Serene emerald spa styling with gardenia ivory, eucalyptus depth, and champagne-edged cards.',
    values: {
      primaryColor: '#059669',
      accentColor: '#E5D3B3',
      bgTone: 'emeraldGarden',
      headingFont: 'greatVibes',
      bodyFont: 'lato',
      headingWeight: 400,
      shapeRadius: 'soft',
      density: 'regular',
      saturation: 104,
      heroMotion: 'soft_glow',
      sparkleLevel: 'subtle',
      bgTreatment: 'emerald-garden',
      cardSurface: 'spa-ivory',
      textureOverlay: 'none',
      buttonEnergy: 'garden-lift',
      ctaEmphasis: 'standard',
      tradeFlair: 'champagne-botanical',
      cursorEffect: 'default',
      tickerSpeed: 1,
    },
  },
  gnome_garden: {
    id: 'gnome_garden',
    label: 'Gnome Forest',
    description:
      'A welcoming woodland with warm lanterns, parchment cards, and friendly gnome details.',
    values: {
      primaryColor: '#842421',
      accentColor: '#F4C45E',
      bgTone: 'gnomeGarden',
      headingFont: 'playfair',
      bodyFont: 'dmSans',
      headingWeight: 600,
      shapeRadius: 'soft',
      density: 'regular',
      saturation: 100,
      heroMotion: 'soft_glow',
      sparkleLevel: 'subtle',
      bgTreatment: 'gnome-garden',
      cardSurface: 'storybook-parchment',
      textureOverlay: 'fireflies',
      buttonEnergy: 'lantern-lift',
      ctaEmphasis: 'standard',
      tradeFlair: 'mushroom-glow',
      cursorEffect: 'default',
      tickerSpeed: 1,
    },
  },
  neon_butterfly: {
    id: 'neon_butterfly',
    label: 'Neon Butterfly',
    description:
      'A living neon lounge with velvet plum depth, glowing butterflies, and warm golden light.',
    values: {
      primaryColor: '#ff2acd',
      accentColor: '#ffc24a',
      bgTone: 'neonButterfly',
      headingFont: 'playfair',
      bodyFont: 'dmSans',
      headingWeight: 600,
      shapeRadius: 'soft',
      density: 'regular',
      saturation: 112,
      heroMotion: 'soft_glow',
      sparkleLevel: 'subtle',
      bgTreatment: 'neon-butterfly',
      cardSurface: 'neon-velvet-glass',
      textureOverlay: 'neon-butterflies',
      buttonEnergy: 'neon-lift',
      ctaEmphasis: 'standard',
      tradeFlair: 'butterfly-glow',
      cursorEffect: 'default',
      tickerSpeed: 1,
    },
  },
  halloween_pumpkin_witch: {
    id: 'halloween_pumpkin_witch',
    label: 'Halloween Pumpkin and Witch',
    description:
      'A sparkling black-and-orange Halloween night with a glowing jack-o-lantern, silver moon, flying witch, and bats.',
    values: {
      primaryColor: '#ff6a00',
      accentColor: '#f4eee3',
      bgTone: 'halloweenPumpkinWitch',
      headingFont: 'playfair',
      bodyFont: 'dmSans',
      headingWeight: 600,
      shapeRadius: 'soft',
      density: 'regular',
      saturation: 112,
      heroMotion: 'witch_flight',
      sparkleLevel: 'glittery',
      bgTreatment: 'halloween-pumpkin-witch',
      cardSurface: 'midnight-glass',
      textureOverlay: 'halloween-sparkles',
      buttonEnergy: 'pumpkin-glow',
      ctaEmphasis: 'standard',
      tradeFlair: 'moonlit-sparkles',
      cursorEffect: 'default',
      tickerSpeed: 1,
    },
  },
  rose_gold: {
    id: 'rose_gold',
    label: 'Rose Gold',
    description:
      'Rose, pearl, and champagne jewelry polish with soft coastal-card warmth.',
    values: {
      primaryColor: '#e04f73',
      accentColor: '#f5c66d',
      bgTone: 'roseGold',
      headingFont: 'playfair',
      bodyFont: 'dmSans',
      headingWeight: 600,
      shapeRadius: 'soft',
      density: 'regular',
      saturation: 108,
      heroMotion: 'sparkle_rise',
      sparkleLevel: 'subtle',
      bgTreatment: 'rose-gold-paper',
      cardSurface: 'pearl-rose',
      textureOverlay: 'none',
      buttonEnergy: 'rose-gold-lift',
      ctaEmphasis: 'standard',
      tradeFlair: 'champagne-rose',
      cursorEffect: 'default',
      tickerSpeed: 1,
    },
  },
  garnet: {
    id: 'garnet',
    label: 'Garnet',
    description:
      'Warm boutique red with blush shell surfaces and lipstick-polish confidence.',
    values: {
      primaryColor: '#B91C1C',
      accentColor: '#920000',
      bgTone: 'garnet',
      headingFont: 'boska',
      bodyFont: 'switzer',
      headingWeight: 600,
      shapeRadius: 'soft',
      density: 'regular',
      saturation: 112,
      heroMotion: 'soft_glow',
      sparkleLevel: 'subtle',
      bgTreatment: 'garnet-shell',
      cardSurface: 'blush-shell',
      textureOverlay: 'none',
      buttonEnergy: 'garnet-lift',
      ctaEmphasis: 'standard',
      tradeFlair: 'ruby-polish',
      cursorEffect: 'default',
      tickerSpeed: 1,
    },
  },
  amber: {
    id: 'amber',
    label: 'Amber',
    description:
      'Energetic orange with sunny pearl cards, peach borders, and reveal-party warmth.',
    values: {
      primaryColor: '#F97316',
      accentColor: '#761A00',
      bgTone: 'amber',
      headingFont: 'melodrama',
      bodyFont: 'nunito',
      headingWeight: 600,
      shapeRadius: 'soft',
      density: 'regular',
      saturation: 116,
      heroMotion: 'sparkle_rise',
      sparkleLevel: 'subtle',
      bgTreatment: 'amber-paper',
      cardSurface: 'sunlit-pearl',
      textureOverlay: 'none',
      buttonEnergy: 'amber-pop',
      ctaEmphasis: 'standard',
      tradeFlair: 'citrine-glow',
      cursorEffect: 'default',
      tickerSpeed: 1,
    },
  },
  velvet: {
    id: 'velvet',
    label: 'Velvet',
    description:
      'Rich elegant purple with orchid gloss, plush cards, and boutique-night depth.',
    values: {
      primaryColor: '#9333EA',
      accentColor: '#6300B9',
      bgTone: 'velvet',
      headingFont: 'bitter',
      bodyFont: 'archivo',
      headingWeight: 600,
      shapeRadius: 'soft',
      density: 'regular',
      saturation: 110,
      heroMotion: 'sparkle_rise',
      sparkleLevel: 'glittery',
      bgTreatment: 'velvet-orchid',
      cardSurface: 'plush-orchid',
      textureOverlay: 'sparkle',
      buttonEnergy: 'velvet-lift',
      ctaEmphasis: 'standard',
      tradeFlair: 'orchid-gloss',
      cursorEffect: 'default',
      tickerSpeed: 1,
    },
  },
  rose_quartz: {
    id: 'rose_quartz',
    label: 'Rose Quartz',
    description:
      'Soft fun pink with quartz glow, playful sparkle, and deep plum contrast.',
    values: {
      primaryColor: '#E879F9',
      accentColor: '#63146E',
      bgTone: 'roseQuartz',
      headingFont: 'sharpie',
      bodyFont: 'ranade',
      headingWeight: 600,
      shapeRadius: 'soft',
      density: 'regular',
      saturation: 114,
      heroMotion: 'sparkle_rise',
      sparkleLevel: 'glittery',
      bgTreatment: 'quartz-paper',
      cardSurface: 'pink-quartz',
      textureOverlay: 'sparkle',
      buttonEnergy: 'quartz-pop',
      ctaEmphasis: 'standard',
      tradeFlair: 'pink-spark',
      cursorEffect: 'default',
      tickerSpeed: 1,
    },
  },
}

export function normalizeCustomerSiteTemplate(
  value: string | null | undefined,
): AmethystCustomerSiteTemplate {
  return AMETHYST_CUSTOMER_SITE_TEMPLATE
}

export function normalizeAmethystAppearancePreset(
  value: string | null | undefined,
): AmethystAppearancePresetId {
  return AMETHYST_APPEARANCE_PRESET_IDS.includes(
    value as AmethystAppearancePresetId,
  )
    ? (value as AmethystAppearancePresetId)
    : DEFAULT_AMETHYST_APPEARANCE_PRESET
}

export function getAmethystAppearancePreset(
  value: string | null | undefined,
): AmethystAppearancePreset {
  return AMETHYST_APPEARANCE_PRESETS[normalizeAmethystAppearancePreset(value)]
}

export function applyAmethystAppearancePreset<
  T extends { preset: string } & Partial<AmethystAppearancePreset['values']>,
>(defaults: T, value: string | null | undefined): T {
  const preset = getAmethystAppearancePreset(value)

  return {
    ...defaults,
    ...preset.values,
    preset: preset.id,
  }
}
