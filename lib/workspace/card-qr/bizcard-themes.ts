import type { AmethystAppearancePresetId } from '@/lib/amethyst/appearance-presets'
import { normalizeAmethystCustomDomainCandidate } from '@/lib/amethyst/host-routing'

/** Louis-approved 2026-10-09 business card looks. Ported from /workspace/bizcard-mock. */
export type BizcardKey =
  | 'pumpkin-cat'
  | 'pumpkin-witch'
  | 'amethyst'
  | 'gilded-autumn'
  | 'midnight-rose'
  | 'pearl-rose'
  | 'rose-champagne'
  | 'morganite'
  | 'moonstone'
  | 'emerald-garden'
  | 'rose-gold'
  | 'garnet'
  | 'amber'
  | 'velvet'
  | 'custom-kim'
  | 'custom-kelly'
  | 'custom-lindsey'
  | 'custom-brittany'

export interface BizcardTheme {
  key: BizcardKey
  /** Site theme used for the QR color. */
  qrTheme: AmethystAppearancePresetId
  align: 'left' | 'top' | 'center'
  /** Own front (gradient title) for Lindsey and Brittany. */
  own?: 'lindsey' | 'brittany'
  tw?: number
  maxw?: number
  cmaxh?: number
  ytop?: number
  hmax?: number
  nscale?: number
  panel?: string
  frost?: [number, number]
  /** Front text gets a soft dark shadow (art scrim themes). */
  shadow: boolean
  back: string
  name: string
  ink: string
  sub: string
  rule: string
  title: string
  script: string
}

const t = (theme: BizcardTheme) => theme

export const BIZCARD_THEMES: Record<BizcardKey, BizcardTheme> = {
  'pumpkin-cat': t({ key: 'pumpkin-cat', qrTheme: 'halloween_pumpkin_cat', align: 'left', tw: 0.47, shadow: true,
    back: '#1c0e08', name: '#ffa04d', ink: '#fff4e8', sub: '#f0c9a0', rule: '#5e3218', title: '#fff4e8', script: '#ffa04d' }),
  amethyst: t({ key: 'amethyst', qrTheme: 'amethyst', align: 'left', tw: 0.4, shadow: true,
    back: '#26105c', name: '#ff8fd0', ink: '#ffffff', sub: '#cdb8ff', rule: '#4f3398', title: '#ffffff', script: '#ff9bd6' }),
  'midnight-rose': t({ key: 'midnight-rose', qrTheme: 'midnight_rose', align: 'top', shadow: true,
    back: '#2a1218', name: '#efb5a3', ink: '#fff1ea', sub: '#e7c2b6', rule: '#5a303b', title: '#fff1ea', script: '#efb5a3' }),
  morganite: t({ key: 'morganite', qrTheme: 'sparkle_suite_morganite', align: 'center', shadow: false,
    back: '#4a1838', name: '#ffb8dc', ink: '#ffffff', sub: '#f3cfe2', rule: '#74385e', title: '#3a1630', script: '#d81b8a' }),
  'pumpkin-witch': t({ key: 'pumpkin-witch', qrTheme: 'halloween_pumpkin_witch', align: 'left', tw: 0.44, shadow: false,
    back: '#1c0e08', name: '#ff8a3d', ink: '#fff4e8', sub: '#f0c9a0', rule: '#5e3218', title: '#fff4e8', script: '#ff8a3d' }),
  'gilded-autumn': t({ key: 'gilded-autumn', qrTheme: 'gilded_autumn', align: 'center', panel: '#fff6ea', frost: [0.42, 9], cmaxh: 300, hmax: 120, shadow: false,
    back: '#3a2410', name: '#f2b766', ink: '#fff6ea', sub: '#e8cfa8', rule: '#6a4826', title: '#3a2410', script: '#6a2c0e' }),
  'pearl-rose': t({ key: 'pearl-rose', qrTheme: 'pearl_rose', align: 'top', shadow: false,
    back: '#3a2430', name: '#f3b9c4', ink: '#fff8f6', sub: '#ecd3d9', rule: '#654552', title: '#3a2430', script: '#954354' }),
  'rose-champagne': t({ key: 'rose-champagne', qrTheme: 'rose_champagne', align: 'top', shadow: false,
    back: '#45232d', name: '#f6c1b0', ink: '#fff7f4', sub: '#efd4cc', rule: '#6e4450', title: '#3a2430', script: '#82344a' }),
  moonstone: t({ key: 'moonstone', qrTheme: 'moonstone', align: 'center', shadow: false,
    back: '#1c1630', name: '#c4b0ff', ink: '#f4f0ff', sub: '#c9bddf', rule: '#3d3460', title: '#f4f0ff', script: '#c4b0ff' }),
  'emerald-garden': t({ key: 'emerald-garden', qrTheme: 'emerald_garden', align: 'center', hmax: 170, nscale: 1.3, cmaxh: 290, shadow: false,
    back: '#0f3a2e', name: '#86e3bb', ink: '#f3fbf6', sub: '#bfe3d2', rule: '#2b5f4e', title: '#123028', script: '#047857' }),
  'rose-gold': t({ key: 'rose-gold', qrTheme: 'rose_gold', align: 'center', shadow: false,
    back: '#4a1e2b', name: '#f7a8bb', ink: '#fff5f6', sub: '#f0cfd7', rule: '#74404f', title: '#3a1824', script: '#b8304f' }),
  garnet: t({ key: 'garnet', qrTheme: 'garnet', align: 'center', shadow: false,
    back: '#4a0f16', name: '#ff9e9e', ink: '#fff5f5', sub: '#f2cccc', rule: '#73303a', title: '#3a1014', script: '#a51818' }),
  amber: t({ key: 'amber', qrTheme: 'amber', align: 'center', shadow: false,
    back: '#4a2608', name: '#ffb46b', ink: '#fff8f1', sub: '#f2d8b8', rule: '#734a26', title: '#3a220c', script: '#b4500c' }),
  velvet: t({ key: 'velvet', qrTheme: 'velvet', align: 'center', shadow: false,
    back: '#1a1024', name: '#d3a6ff', ink: '#f7efff', sub: '#d2c0ea', rule: '#3e2a55', title: '#f7efff', script: '#d3a6ff' }),
  'custom-kim': t({ key: 'custom-kim', qrTheme: 'gnome_garden', align: 'top', maxw: 690, cmaxh: 300, ytop: 150, shadow: true,
    back: '#173126', name: '#f4c45e', ink: '#fff3d6', sub: '#e6dcc0', rule: '#3b5a48', title: '#fff3d6', script: '#f4c45e' }),
  'custom-kelly': t({ key: 'custom-kelly', qrTheme: 'neon_butterfly', align: 'top', maxw: 700, cmaxh: 330, ytop: 186, shadow: true,
    back: '#2a0a2e', name: '#ff7ad9', ink: '#ffe6f7', sub: '#e7b6d4', rule: '#5a2560', title: '#ffffff', script: '#ffc24a' }),
  'custom-lindsey': t({ key: 'custom-lindsey', qrTheme: 'alpine_opal', align: 'center', own: 'lindsey', nscale: 0.9, shadow: false,
    back: '#1e1b4b', name: '#f9a8d4', ink: '#f0f9ff', sub: '#c7d2fe', rule: '#3b3878', title: '#ffffff', script: '#ffffff' }),
  'custom-brittany': t({ key: 'custom-brittany', qrTheme: 'black_diamond', align: 'center', own: 'brittany', shadow: false,
    back: '#080808', name: '#d4af37', ink: '#f8f1dc', sub: '#d9cba8', rule: '#3a3220', title: '#ffffff', script: '#ffffff' }),
}

/** Shared site theme -> approved card. */
export const BIZCARD_SHARED_THEMES: Partial<Record<string, BizcardKey>> = {
  halloween_pumpkin_cat: 'pumpkin-cat',
  halloween_pumpkin_witch: 'pumpkin-witch',
  amethyst: 'amethyst',
  gilded_autumn: 'gilded-autumn',
  midnight_rose: 'midnight-rose',
  pearl_rose: 'pearl-rose',
  rose_champagne: 'rose-champagne',
  sparkle_suite_morganite: 'morganite',
  moonstone: 'moonstone',
  emerald_garden: 'emerald-garden',
  rose_gold: 'rose-gold',
  garnet: 'garnet',
  amber: 'amber',
  velvet: 'velvet',
}

interface CustomCardRep {
  key: BizcardKey | null
  slugs: string[]
  domains: string[]
  themes: string[]
  /** Full name from the approved card when the account only has a first name. */
  fullName?: string
}

/**
 * Custom-site reps get their own card no matter which skin they run today.
 * Heather (BlingKitchen) is still being built: key null.
 */
export const BIZCARD_CUSTOM_REPS: CustomCardRep[] = [
  { key: 'custom-kim', slugs: ['goforthebling'], domains: ['goforthebling.com'], themes: ['gnome_garden'], fullName: 'Kim Goforth' },
  { key: 'custom-kelly', slugs: ['sparklybutterflies'], domains: ['sparklybutterflies.com'], themes: ['neon_butterfly'], fullName: 'Kelly Joseph' },
  { key: 'custom-lindsey', slugs: ['milehighfizz'], domains: ['milehighfizz.com'], themes: [], fullName: 'Lindsey Chapman' },
  { key: 'custom-brittany', slugs: ['brittwithbling'], domains: ['brittwithbling.com'], themes: [], fullName: 'Brittany Osborne' },
  { key: null, slugs: ['blingkitchen'], domains: ['theblingkitchen.com', 'blingkitchen.com'], themes: [] },
]

/** Custom presets nobody has an approved card for yet (test accounts on Black Diamond / Alpine Opal). */
const UNAPPROVED_CUSTOM_THEMES = ['alpine_opal', 'black_diamond']

export const BIZCARD_BEING_BUILT_MESSAGE = 'Your custom card is being built.'

export type BizcardResolution =
  | { status: 'ready'; key: BizcardKey; fullName?: string }
  | { status: 'being_built' }
  | { status: 'unknown_theme' }

export function resolveBizcard(input: {
  appearancePreset: string
  publicSiteSlug?: string | null
  customDomain?: string | null
}): BizcardResolution {
  const slug = input.publicSiteSlug?.trim().toLowerCase() || ''
  const host = (normalizeAmethystCustomDomainCandidate(input.customDomain) || '').replace(/^www\./, '')
  for (const rep of BIZCARD_CUSTOM_REPS) {
    if ((slug && rep.slugs.includes(slug)) || (host && rep.domains.includes(host))) {
      return rep.key ? { status: 'ready', key: rep.key, fullName: rep.fullName } : { status: 'being_built' }
    }
  }
  for (const rep of BIZCARD_CUSTOM_REPS) {
    if (rep.key && rep.themes.includes(input.appearancePreset)) {
      return { status: 'ready', key: rep.key }
    }
  }
  if (UNAPPROVED_CUSTOM_THEMES.includes(input.appearancePreset)) return { status: 'being_built' }
  const shared = BIZCARD_SHARED_THEMES[input.appearancePreset]
  return shared ? { status: 'ready', key: shared } : { status: 'unknown_theme' }
}
