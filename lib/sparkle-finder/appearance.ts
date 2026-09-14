import {
  AMETHYST_APPEARANCE_PRESETS,
  type AmethystAppearancePresetId,
} from '@/lib/amethyst/appearance-presets'
import { createAdminClient } from '@/lib/supabase/admin'
import { SPARKLE_FINDER_APPEARANCE_PRESET_IDS } from './appearance-presets'

type AdminClient = ReturnType<typeof createAdminClient>

export const SPARKLE_FINDER_APPEARANCE_SCHEMA_VERSION = 1 as const
export const DEFAULT_SPARKLE_FINDER_APPEARANCE_PRESET = 'amethyst' as const

export type SparkleFinderAppearanceTokens = {
  background: string
  backgroundSoft: string
  surface: string
  surfaceSoft: string
  foreground: string
  foregroundMuted: string
  primary: string
  primaryStrong: string
  accent: string
  border: string
  borderStrong: string
  panel: string
  panelText: string
  headingFont: string
  bodyFont: string
}

export type SparkleFinderAppearance = {
  schemaVersion: typeof SPARKLE_FINDER_APPEARANCE_SCHEMA_VERSION
  preset: AmethystAppearancePresetId
  label: string
  description: string
  tokens: SparkleFinderAppearanceTokens
}

const FINDER_THEME_TOKENS: Record<AmethystAppearancePresetId, SparkleFinderAppearanceTokens> = {
  amethyst: {
    background: '#E8DFF5', backgroundSoft: '#F2EBFA', surface: '#FFFFFF', surfaceSoft: '#F7F0FF',
    foreground: '#2A1F40', foregroundMuted: '#5C576A', primary: '#5C0EFF', primaryStrong: '#480DDF',
    accent: '#FF1AC2', border: 'rgba(72, 13, 223, 0.18)', borderStrong: 'rgba(72, 13, 223, 0.32)',
    panel: '#1A1230', panelText: '#FFFFFF', headingFont: 'italiana', bodyFont: 'inter',
  },
  sparkle_suite_morganite: {
    background: '#FBF5F2', backgroundSoft: '#F6EDE8', surface: '#FFFFFF', surfaceSoft: '#FFF6FA',
    foreground: '#402924', foregroundMuted: '#775D57', primary: '#EE2C9B', primaryStrong: '#D81B87',
    accent: '#FF4CAE', border: 'rgba(64, 41, 36, 0.12)', borderStrong: 'rgba(238, 44, 155, 0.34)',
    panel: '#36221D', panelText: '#F6E7DA', headingFont: 'playfair', bodyFont: 'dmSans',
  },
  black_diamond: {
    background: '#0D0D10', backgroundSoft: '#17171C', surface: '#201F25', surfaceSoft: '#292831',
    foreground: '#F8F5EC', foregroundMuted: '#CBC5B8', primary: '#D4AF37', primaryStrong: '#A9871F',
    accent: '#00D9FF', border: 'rgba(212, 175, 55, 0.24)', borderStrong: 'rgba(0, 217, 255, 0.42)',
    panel: '#080808', panelText: '#F8F5EC', headingFont: 'playfair', bodyFont: 'dmSans',
  },
  moonstone: {
    background: '#15121D', backgroundSoft: '#211B2D', surface: '#F8FAFC', surfaceSoft: '#EEF0F5',
    foreground: '#241B33', foregroundMuted: '#655D70', primary: '#7C3AED', primaryStrong: '#5B21B6',
    accent: '#CBD5E1', border: 'rgba(124, 58, 237, 0.22)', borderStrong: 'rgba(203, 213, 225, 0.46)',
    panel: '#120E1A', panelText: '#F8FAFC', headingFont: 'playfair', bodyFont: 'dmSans',
  },
  alpine_opal: {
    background: '#FDF2F8', backgroundSoft: '#EFF8FF', surface: '#FFFFFF', surfaceSoft: '#F3F4FF',
    foreground: '#3F1748', foregroundMuted: '#6C5C78', primary: '#EC4899', primaryStrong: '#BE185D',
    accent: '#38BDF8', border: 'rgba(147, 51, 234, 0.18)', borderStrong: 'rgba(56, 189, 248, 0.38)',
    panel: '#4C1D67', panelText: '#FFFFFF', headingFont: 'playfair', bodyFont: 'dmSans',
  },
  emerald_garden: {
    background: '#F8F7F0', backgroundSoft: '#EEF4EC', surface: '#FFFDF7', surfaceSoft: '#F3F0E5',
    foreground: '#173F33', foregroundMuted: '#577067', primary: '#059669', primaryStrong: '#064E3B',
    accent: '#E5D3B3', border: 'rgba(6, 78, 59, 0.16)', borderStrong: 'rgba(229, 211, 179, 0.58)',
    panel: '#064E3B', panelText: '#FFFDF7', headingFont: 'playfair', bodyFont: 'dmSans',
  },
  gnome_garden: {
    background: '#F5EDDA', backgroundSoft: '#E5E7D7', surface: '#FFF3D6', surfaceSoft: '#FFF9EC',
    foreground: '#2E251D', foregroundMuted: '#655A46', primary: '#842421', primaryStrong: '#78221F',
    accent: '#F4C45E', border: '#D4C49F', borderStrong: '#CFB77C',
    panel: '#173126', panelText: '#FFF3D6', headingFont: 'playfair', bodyFont: 'dmSans',
  },
  neon_butterfly: {
    background: '#120414', backgroundSoft: '#1D071F', surface: '#261029', surfaceSoft: '#321137',
    foreground: '#FFF5FA', foregroundMuted: '#D8BDD8', primary: '#FF2ACD', primaryStrong: '#D817A9',
    accent: '#FFC24A', border: 'rgba(255, 84, 215, 0.28)', borderStrong: 'rgba(255, 194, 74, 0.5)',
    panel: '#09010C', panelText: '#FFF5FA', headingFont: 'playfair', bodyFont: 'dmSans',
  },
  rose_gold: {
    background: '#FFF5F6', backgroundSoft: '#FFF0F3', surface: '#FFFFFF', surfaceSoft: '#FFF8F3',
    foreground: '#4A2530', foregroundMuted: '#7B5B63', primary: '#E04F73', primaryStrong: '#B72C52',
    accent: '#F5C66D', border: 'rgba(224, 79, 115, 0.18)', borderStrong: 'rgba(245, 198, 109, 0.52)',
    panel: '#552633', panelText: '#FFF8F3', headingFont: 'playfair', bodyFont: 'dmSans',
  },
  garnet: {
    background: '#FFE5DD', backgroundSoft: '#FFF1EC', surface: '#FFFFFF', surfaceSoft: '#FFF7F4',
    foreground: '#4B1414', foregroundMuted: '#795555', primary: '#B91C1C', primaryStrong: '#920000',
    accent: '#FF9180', border: 'rgba(185, 28, 28, 0.18)', borderStrong: 'rgba(255, 145, 128, 0.5)',
    panel: '#650D0D', panelText: '#FFF7F4', headingFont: 'playfair', bodyFont: 'dmSans',
  },
  amber: {
    background: '#FFF5E8', backgroundSoft: '#FFF0DA', surface: '#FFFFFF', surfaceSoft: '#FFF8EF',
    foreground: '#4A230F', foregroundMuted: '#795C4A', primary: '#F97316', primaryStrong: '#C2410C',
    accent: '#FFB781', border: 'rgba(249, 115, 22, 0.2)', borderStrong: 'rgba(255, 183, 129, 0.54)',
    panel: '#761A00', panelText: '#FFF8EF', headingFont: 'playfair', bodyFont: 'dmSans',
  },
  velvet: {
    background: '#FFE8FF', backgroundSoft: '#F9E8FF', surface: '#FFFFFF', surfaceSoft: '#FCEFFF',
    foreground: '#371144', foregroundMuted: '#705675', primary: '#9333EA', primaryStrong: '#6300B9',
    accent: '#FB96FF', border: 'rgba(147, 51, 234, 0.2)', borderStrong: 'rgba(251, 150, 255, 0.46)',
    panel: '#3B095B', panelText: '#FFF5FF', headingFont: 'playfair', bodyFont: 'dmSans',
  },
  rose_quartz: {
    background: '#FFF0FD', backgroundSoft: '#FFE8FA', surface: '#FFFFFF', surfaceSoft: '#FFF5FD',
    foreground: '#47134E', foregroundMuted: '#765779', primary: '#E879F9', primaryStrong: '#A21CAF',
    accent: '#63146E', border: 'rgba(232, 121, 249, 0.22)', borderStrong: 'rgba(99, 20, 110, 0.38)',
    panel: '#63146E', panelText: '#FFF5FD', headingFont: 'playfair', bodyFont: 'dmSans',
  },
}

export function isSparkleFinderAppearancePreset(value: unknown): value is AmethystAppearancePresetId {
  return typeof value === 'string' && (SPARKLE_FINDER_APPEARANCE_PRESET_IDS as readonly string[]).includes(value)
}

export function resolveSparkleFinderAppearance(value: unknown): SparkleFinderAppearance {
  const preset = isSparkleFinderAppearancePreset(value)
    ? value
    : DEFAULT_SPARKLE_FINDER_APPEARANCE_PRESET
  const source = AMETHYST_APPEARANCE_PRESETS[preset]
  return {
    schemaVersion: SPARKLE_FINDER_APPEARANCE_SCHEMA_VERSION,
    preset,
    label: source.label,
    description: source.description,
    tokens: FINDER_THEME_TOKENS[preset],
  }
}

export async function loadSparkleFinderAppearanceSetting(
  admin: AdminClient = createAdminClient(),
): Promise<SparkleFinderAppearance> {
  const { data, error } = await admin
    .from('sparkle_finder_brand_settings')
    .select('appearance_preset')
    .eq('id', 'global')
    .maybeSingle()
  if (error) throw error
  return resolveSparkleFinderAppearance(data?.appearance_preset)
}

export async function saveSparkleFinderAppearanceSetting(
  admin: AdminClient,
  value: unknown,
  operatorEmail: string,
): Promise<SparkleFinderAppearance> {
  if (!isSparkleFinderAppearancePreset(value)) {
    throw new Error('Unknown Sparkle Finder appearance preset.')
  }
  const { data, error } = await admin
    .from('sparkle_finder_brand_settings')
    .upsert({
      id: 'global',
      appearance_preset: value,
      updated_at: new Date().toISOString(),
      updated_by: operatorEmail.trim().toLowerCase(),
    }, { onConflict: 'id' })
    .select('appearance_preset')
    .single()
  if (error || !data) throw error ?? new Error('Appearance save returned no row.')
  return resolveSparkleFinderAppearance(data.appearance_preset)
}
