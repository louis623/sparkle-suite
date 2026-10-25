/**
 * Finder-parity jewelry favorites for Sparkle Suite rep-site sign-up.
 * Slugs and labels match Sparkle Finder's favorites form.
 * "Not sure yet" is the slug not_sure and cannot be combined with other picks.
 * Hidden options stay valid for stored values. The public options payload includes them with isHidden true.
 * Pickers leave them out unless the customer already saved one.
 */

export type PreferenceKind = 'stone' | 'material' | 'cut' | 'collection'

export const PREFERENCE_MAX_PICKS = 3

export const NOT_SURE_SLUG = 'not_sure'
export const NOT_SURE_LABEL = 'Not sure yet'

export const PREFERENCE_KINDS: PreferenceKind[] = [
  'stone',
  'material',
  'cut',
  'collection',
]

export const preferenceFieldNames = {
  stone: 'favoriteStones',
  material: 'favoriteMaterials',
  cut: 'favoriteCuts',
  collection: 'favoriteCollections',
} as const

export const preferencePickerLabels: Record<PreferenceKind, string> = {
  stone: 'Favorite stones',
  material: 'Favorite metals & finishes',
  cut: 'Favorite cuts',
  collection: 'Favorite Bomb Party collections',
}

export const RING_SIZE_NOT_SURE = 'not_sure' as const

export const RING_SIZE_OPTIONS = [
  { value: '5', label: '5' },
  { value: '6', label: '6' },
  { value: '7', label: '7' },
  { value: '8', label: '8' },
  { value: '9', label: '9' },
  { value: '10', label: '10' },
  { value: '11', label: '11' },
  { value: RING_SIZE_NOT_SURE, label: 'Not sure' },
] as const

export const RING_SIZE_VALUES = RING_SIZE_OPTIONS.map((option) => option.value)

export type RingSizeValue = (typeof RING_SIZE_OPTIONS)[number]['value']

export const JEWELRY_NOTES_MAX_LENGTH = 500

export const invalidPreferencesMessage =
  'Choose up to 3 favorites in each list. Not sure yet stands on its own.'

export const missingPreferencesMessage =
  'Refresh the page and pick at least one favorite in each list, or choose Not sure yet.'

export type PreferenceOption = {
  slug: string
  label: string
  isRetired?: boolean
  /** Stored values still validate. Public preference-option responses include these with isHidden true. */
  isHidden?: boolean
  groupLabel?: string
  sortOrder?: number
  source?: 'library' | 'bomb_party' | 'both' | 'standard'
}

export type PreferenceOptionsByKind = Record<PreferenceKind, PreferenceOption[]>

export type CustomerSignupPreferencePicks = {
  favoriteStones: string[]
  favoriteMaterials: string[]
  favoriteCuts: string[]
  favoriteCollections: string[]
  ringSize: RingSizeValue | null
  jewelryNotes: string
  labels: {
    favoriteGemOrStone: string | null
    favoriteMaterial: string | null
    favoriteCut: string | null
    favoriteCollection: string | null
  }
}

type PreferenceOptionSeed = {
  slug: string
  label: string
  source: NonNullable<PreferenceOption['source']>
  isRetired?: boolean
  isHidden?: boolean
  groupLabel?: string
}

const notSure = (groupLabel?: string): PreferenceOptionSeed => ({
  slug: NOT_SURE_SLUG,
  label: NOT_SURE_LABEL,
  source: 'standard',
  groupLabel,
})

const stoneSeeds: PreferenceOptionSeed[] = [
  notSure(),
  { slug: 'diamond-cz', label: 'Diamond CZ (clear sparkle)', source: 'both' },
  { slug: 'ruby', label: 'Ruby', source: 'library' },
  {
    slug: 'magnesite',
    label: 'Magnesite (lapis, malachite, carnelian, howlite, coral)',
    source: 'library',
  },
  { slug: 'rose-quartz', label: 'Rose Quartz', source: 'library' },
  { slug: 'tourmaline', label: 'Tourmaline (incl. Paraiba)', source: 'library' },
  { slug: 'emerald', label: 'Emerald', source: 'library' },
  { slug: 'sapphire', label: 'Sapphire (blue, pink, peach)', source: 'library' },
  { slug: 'opal', label: 'Opal (incl. fire opal)', source: 'library' },
  { slug: 'quartz', label: 'Quartz (clear, blue, rutilated)', source: 'library' },
  { slug: 'spinel', label: 'Spinel', source: 'library' },
  { slug: 'ice-crystal', label: 'Ice Crystal', source: 'library' },
  { slug: 'black-onyx', label: 'Black Onyx', source: 'library' },
  { slug: 'amethyst', label: 'Amethyst / Purple', source: 'library' },
  { slug: 'lavender', label: 'Lavender', source: 'library' },
  { slug: 'pearl', label: 'Pearl', source: 'library' },
  { slug: 'smoky-topaz', label: 'Smoky Topaz', source: 'library' },
  { slug: 'blue-topaz', label: 'Blue Topaz', source: 'library' },
  { slug: 'citrine', label: 'Citrine / Yellow', source: 'library' },
  { slug: 'garnet', label: 'Garnet', source: 'library' },
  { slug: 'turquoise', label: 'Turquoise', source: 'library' },
  { slug: 'moonstone', label: 'Moonstone', source: 'library' },
  { slug: 'amazonite', label: 'Amazonite', source: 'library' },
  { slug: 'obsidian', label: 'Obsidian', source: 'library' },
  { slug: 'aquamarine', label: 'Aquamarine', source: 'standard' },
]

const materialSeeds: PreferenceOptionSeed[] = [
  notSure(),
  { slug: 'rhodium', label: 'Silver-tone (rhodium plated)', source: 'both' },
  { slug: 'hematite', label: 'Hematite / gunmetal (dark)', source: 'library' },
  { slug: 'gold', label: 'Gold plated', source: 'library' },
  { slug: 'matte-gold', label: 'Matte gold', source: 'library' },
  { slug: 'rose-gold', label: 'Rose gold plated', source: 'library' },
  { slug: 'sterling', label: 'Sterling silver (.925)', source: 'both' },
  { slug: 'vermeil', label: 'Gold vermeil (gold over sterling)', source: 'bomb_party' },
  { slug: 'silver-plated', label: 'Silver plated', source: 'library', isHidden: true },
  { slug: 'matte-rhodium', label: 'Matte rhodium', source: 'library', isHidden: true },
]

const cutSeeds: PreferenceOptionSeed[] = [
  notSure(),
  { slug: 'round', label: 'Round', source: 'standard' },
  { slug: 'oval', label: 'Oval', source: 'standard' },
  { slug: 'emerald-cut', label: 'Emerald cut (rectangle)', source: 'standard' },
  { slug: 'princess', label: 'Princess (square)', source: 'standard' },
  { slug: 'cushion', label: 'Cushion', source: 'standard' },
  { slug: 'pear', label: 'Pear / Teardrop', source: 'standard' },
  { slug: 'marquise', label: 'Marquise', source: 'standard' },
  { slug: 'heart', label: 'Heart', source: 'standard' },
  { slug: 'radiant', label: 'Radiant', source: 'standard' },
  { slug: 'asscher', label: 'Asscher', source: 'standard' },
  { slug: 'baguette', label: 'Baguette', source: 'standard' },
  { slug: 'cabochon', label: 'Cabochon (smooth, domed)', source: 'standard' },
  { slug: 'halo', label: 'Halo (stone ringed with sparkle)', source: 'standard' },
]

const collectionSeeds: PreferenceOptionSeed[] = [
  notSure('Active'),
  { slug: 'originals', label: 'OGs', source: 'both', groupLabel: 'Active' },
  { slug: 'birthday', label: 'Birthday Collections (monthly)', source: 'both', groupLabel: 'Active' },
  { slug: 'exclusives', label: 'Exclusives', source: 'both', groupLabel: 'Active' },
  { slug: 'obsidia', label: 'Obsidia', source: 'both', groupLabel: 'Active' },
  { slug: 'halo', label: 'Halo', source: 'both', groupLabel: 'Active' },
  { slug: 'charmelier', label: 'Charmelier', source: 'both', groupLabel: 'Active' },
  { slug: 'outlaw', label: 'Outlaw', source: 'both', groupLabel: 'Active' },
  { slug: 'jewel-candy', label: 'Jewel Candy (Summer / Holiday)', source: 'both', groupLabel: 'Active' },
  {
    slug: 'stacks',
    label: 'Stacks (Spring / Summer / Halloween / Holiday)',
    source: 'both',
    groupLabel: 'Active',
  },
  {
    slug: 'delicate-stacked-rings',
    label: 'Delicate Stacked Rings',
    source: 'bomb_party',
    groupLabel: 'Active',
  },
  { slug: 'luxe-layers', label: 'Luxe Layers', source: 'bomb_party', groupLabel: 'Active' },
  { slug: 'luxe-bands', label: 'Luxe Bands', source: 'bomb_party', groupLabel: 'Active' },
  { slug: 'lumina', label: 'Lumina', source: 'bomb_party', groupLabel: 'Active' },
  { slug: 'untamed', label: 'Untamed', source: 'bomb_party', groupLabel: 'Active' },
  { slug: 'sterling-club', label: 'Sterling Club', source: 'bomb_party', groupLabel: 'Active' },
  { slug: 'originals-kids', label: 'Originals Kids', source: 'bomb_party', groupLabel: 'Active' },
  { slug: 'sirens', label: 'Sirens', source: 'bomb_party', groupLabel: 'Active' },
  { slug: 'simply', label: 'Simply Hoops / Studs / Sets', source: 'bomb_party', groupLabel: 'Active' },
  {
    slug: 'awareness',
    label: 'Awareness Collections (Mental Health, Lymphoma)',
    source: 'bomb_party',
    groupLabel: 'Active',
  },
  { slug: 'resort-wear', label: 'Resort Wear', source: 'bomb_party', groupLabel: 'Active' },
  { slug: 'mens-timeless', label: "Men's Timeless", source: 'bomb_party', groupLabel: 'Active' },
  {
    slug: 'reign',
    label: 'Reign (Princess / Villain)',
    source: 'bomb_party',
    isRetired: true,
    groupLabel: 'Older collections',
  },
  {
    slug: 'greek-goddess',
    label: 'Greek Goddess',
    source: 'bomb_party',
    isRetired: true,
    groupLabel: 'Older collections',
  },
  {
    slug: 'zen-gems',
    label: 'Zen Gems',
    source: 'bomb_party',
    isRetired: true,
    groupLabel: 'Older collections',
  },
  {
    slug: 'iceland-dreams',
    label: 'Iceland Dreams',
    source: 'bomb_party',
    isRetired: true,
    groupLabel: 'Older collections',
  },
  {
    slug: 'galaxia',
    label: 'Galaxia',
    source: 'bomb_party',
    isRetired: true,
    groupLabel: 'Older collections',
  },
  {
    slug: 'versailles',
    label: 'Versailles',
    source: 'bomb_party',
    isRetired: true,
    groupLabel: 'Older collections',
  },
  {
    slug: 'desert-queen',
    label: 'Desert Queen / Desert Sunset',
    source: 'bomb_party',
    isRetired: true,
    groupLabel: 'Older collections',
  },
  {
    slug: 'bella-amore',
    label: 'Bella Amore / Mila Bella',
    source: 'bomb_party',
    isRetired: true,
    groupLabel: 'Older collections',
  },
  {
    slug: 'mermaid-treasures',
    label: 'Mermaid Treasures',
    source: 'bomb_party',
    isRetired: true,
    groupLabel: 'Older collections',
  },
  {
    slug: 'girl-boss',
    label: 'Girl Boss',
    source: 'bomb_party',
    isRetired: true,
    groupLabel: 'Older collections',
  },
  {
    slug: 'farmhouse',
    label: 'Farmhouse (incl. Bringback)',
    source: 'bomb_party',
    isRetired: true,
    groupLabel: 'Older collections',
  },
  {
    slug: 'catch-a-unicorn',
    label: 'Catch a Unicorn',
    source: 'bomb_party',
    isRetired: true,
    groupLabel: 'Older collections',
  },
  { slug: 'gem-society', label: 'Gem Society', source: 'bomb_party', groupLabel: 'Active', isHidden: true },
]

function toOptions(seeds: PreferenceOptionSeed[]): PreferenceOption[] {
  return seeds.map((seed, index) => ({
    slug: seed.slug,
    label: seed.label,
    isRetired: seed.isRetired === true,
    isHidden: seed.isHidden === true,
    groupLabel: seed.groupLabel,
    sortOrder: index,
    source: seed.source,
  }))
}

export const fallbackPreferenceOptions: PreferenceOptionsByKind = {
  stone: toOptions(stoneSeeds),
  material: toOptions(materialSeeds),
  cut: toOptions(cutSeeds),
  collection: toOptions(collectionSeeds),
}

const ringSizeValueSet = new Set<string>(RING_SIZE_VALUES)

export function isRingSizeValue(value: string): value is RingSizeValue {
  return ringSizeValueSet.has(value)
}

/** Options the picker renders. Hidden rows stay out unless that slug is already saved. */
export function optionsForPreferencePicker(
  options: readonly PreferenceOption[],
  selected: readonly string[],
): PreferenceOption[] {
  const list = Array.isArray(options) ? options : []
  const selectedSlugs = new Set(selected)
  const visible = list.filter((option) => option.isHidden !== true)
  const savedHidden = list.filter((option) => option.isHidden === true && selectedSlugs.has(option.slug))
  return [...visible, ...savedHidden]
}

/**
 * Shared preference-options payload. Hidden ids stay in the list with isHidden: true.
 * A Finder payload that omits the flag, or omits the row, still includes the bundled hidden ids.
 */
export function preferenceOptionsPayload(
  options: PreferenceOptionsByKind = fallbackPreferenceOptions,
): PreferenceOptionsByKind {
  const payload = {} as PreferenceOptionsByKind
  for (const kind of PREFERENCE_KINDS) {
    const bundledHidden = fallbackPreferenceOptions[kind].filter((option) => option.isHidden)
    const hiddenSlugs = new Set(bundledHidden.map((option) => option.slug))
    const rows = options[kind].map((option) =>
      hiddenSlugs.has(option.slug) ? { ...option, isHidden: true as const } : option,
    )
    const present = new Set(rows.map((option) => option.slug))
    for (const hidden of bundledHidden) {
      if (!present.has(hidden.slug)) rows.push(hidden)
    }
    payload[kind] = rows
  }
  return payload
}

export function visiblePreferenceOptions(
  options: PreferenceOptionsByKind = fallbackPreferenceOptions,
): PreferenceOptionsByKind {
  const visible = {} as PreferenceOptionsByKind
  for (const kind of PREFERENCE_KINDS) {
    const bundledHidden = new Set(
      fallbackPreferenceOptions[kind].filter((option) => option.isHidden).map((option) => option.slug),
    )
    visible[kind] = options[kind].filter(
      (option) => option.isHidden !== true && !bundledHidden.has(option.slug),
    )
  }
  return visible
}

export function knownPreferenceSlugs(
  kind: PreferenceKind,
  options: PreferenceOptionsByKind = fallbackPreferenceOptions,
): Set<string> {
  const slugs = new Set(options[kind].map((option) => option.slug))
  for (const option of fallbackPreferenceOptions[kind]) {
    if (option.isHidden) slugs.add(option.slug)
  }
  return slugs
}

export type PreferenceParseResult =
  | { ok: true; value: string[] }
  | { ok: false; reason: 'too_many' | 'unknown' | 'exclusive' | 'missing' | 'invalid' }

export function parsePreferenceSlugList(
  raw: unknown,
  kind: PreferenceKind,
  options: PreferenceOptionsByKind = fallbackPreferenceOptions,
  requireOne = false,
): PreferenceParseResult {
  if (!Array.isArray(raw)) {
    return { ok: false, reason: 'invalid' }
  }

  const deduped = [
    ...new Set(
      raw
        .filter((value): value is string => typeof value === 'string')
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ]

  if (raw.some((value) => typeof value !== 'string')) {
    return { ok: false, reason: 'invalid' }
  }

  if (deduped.length > PREFERENCE_MAX_PICKS) {
    return { ok: false, reason: 'too_many' }
  }

  const known = knownPreferenceSlugs(kind, options)
  if (deduped.some((slug) => !known.has(slug))) {
    return { ok: false, reason: 'unknown' }
  }

  if (deduped.includes(NOT_SURE_SLUG) && deduped.length > 1) {
    return { ok: false, reason: 'exclusive' }
  }

  if (requireOne && deduped.length < 1) {
    return { ok: false, reason: 'missing' }
  }

  return { ok: true, value: deduped }
}

export function joinPreferenceLabels(
  slugs: string[],
  kind: PreferenceKind,
  options: PreferenceOptionsByKind = fallbackPreferenceOptions,
): string | null {
  const visible = slugs.filter((slug) => slug !== NOT_SURE_SLUG)
  if (visible.length === 0) return null
  const labels = new Map(options[kind].map((option) => [option.slug, option.label]))
  for (const option of fallbackPreferenceOptions[kind]) {
    if (option.isHidden && !labels.has(option.slug)) labels.set(option.slug, option.label)
  }
  const text = visible.map((slug) => labels.get(slug) ?? slug).join(', ')
  return text.length > 0 ? text : null
}

/** Live Lineup chips read the old text columns. not_sure stays in the slug arrays and must not become a chip. */
export function legacyFavoriteChipText(value: string | null | undefined): string | null {
  const text = value?.trim() ?? ''
  if (!text || text === NOT_SURE_LABEL) return null
  return text
}

export function applyPreferenceToggle(selected: string[], slug: string, checked: boolean): string[] {
  if (!checked) return selected.filter((item) => item !== slug)
  if (slug === NOT_SURE_SLUG) return [NOT_SURE_SLUG]
  const withoutSure = selected.filter((item) => item !== NOT_SURE_SLUG)
  if (withoutSure.includes(slug) || withoutSure.length >= PREFERENCE_MAX_PICKS) {
    return withoutSure
  }
  return [...withoutSure, slug]
}

export type SignupPreferenceReadResult =
  | { ok: true; picks: CustomerSignupPreferencePicks | null }
  | { ok: false; message: string; detail: string }

type SignupPreferenceBody = {
  favoriteStones?: unknown
  favoriteMaterials?: unknown
  favoriteCuts?: unknown
  favoriteCollections?: unknown
  ringSize?: unknown
  jewelryNotes?: unknown
}

function preferenceFailureMessage(reason: PreferenceParseResult & { ok: false }): string {
  if (reason.reason === 'missing') return missingPreferencesMessage
  if (reason.reason === 'unknown' || reason.reason === 'invalid') {
    return 'Choose favorites from the list.'
  }
  return invalidPreferencesMessage
}

export function parseRingSizeAnswer(
  value: unknown,
): { ok: true; value: RingSizeValue | null } | { ok: false } {
  if (value === undefined || value === null) return { ok: true, value: null }
  if (typeof value !== 'string') return { ok: false }
  const trimmed = value.trim()
  if (!trimmed) return { ok: true, value: null }
  if (!isRingSizeValue(trimmed)) return { ok: false }
  return { ok: true, value: trimmed }
}

export function parseJewelryNotes(
  value: unknown,
): { ok: true; value: string } | { ok: false } {
  if (value === undefined || value === null) return { ok: true, value: '' }
  if (typeof value !== 'string') return { ok: false }
  const trimmed = value.trim()
  if (trimmed.length > JEWELRY_NOTES_MAX_LENGTH) return { ok: false }
  return { ok: true, value: trimmed }
}

/**
 * Validates a public sign-up body.
 * Stones, materials, cuts, and collections are always required
 * (min 1, max 3). A cached page that omits them gets the same refresh
 * message as an empty list. Ring size and notes stay optional.
 */
export function readSignupPreferences(
  input: SignupPreferenceBody,
  options: PreferenceOptionsByKind = fallbackPreferenceOptions,
): SignupPreferenceReadResult {
  const ringSize = parseRingSizeAnswer(input.ringSize)
  if (!ringSize.ok) {
    return {
      ok: false,
      detail: 'invalid ring size',
      message: 'Choose a ring size from the list, or leave it blank.',
    }
  }

  const jewelryNotes = parseJewelryNotes(input.jewelryNotes)
  if (!jewelryNotes.ok) {
    return {
      ok: false,
      detail: 'jewelry notes too long',
      message: 'Keep jewelry notes to 500 characters.',
    }
  }

  const asList = (value: unknown) => (value === undefined || value === null ? [] : value)
  const parsed = {
    stone: parsePreferenceSlugList(asList(input.favoriteStones), 'stone', options, true),
    material: parsePreferenceSlugList(asList(input.favoriteMaterials), 'material', options, true),
    cut: parsePreferenceSlugList(asList(input.favoriteCuts), 'cut', options, true),
    collection: parsePreferenceSlugList(asList(input.favoriteCollections), 'collection', options, true),
  }

  for (const kind of PREFERENCE_KINDS) {
    const result = parsed[kind]
    if (!result.ok) {
      return {
        ok: false,
        detail: `${result.reason}_${kind}`,
        message: preferenceFailureMessage(result),
      }
    }
  }

  const favoriteStones = parsed.stone.ok ? parsed.stone.value : []
  const favoriteMaterials = parsed.material.ok ? parsed.material.value : []
  const favoriteCuts = parsed.cut.ok ? parsed.cut.value : []
  const favoriteCollections = parsed.collection.ok ? parsed.collection.value : []

  return {
    ok: true,
    picks: {
      favoriteStones,
      favoriteMaterials,
      favoriteCuts,
      favoriteCollections,
      ringSize: ringSize.value,
      jewelryNotes: jewelryNotes.value,
      labels: {
        favoriteGemOrStone: joinPreferenceLabels(favoriteStones, 'stone', options),
        favoriteMaterial: joinPreferenceLabels(favoriteMaterials, 'material', options),
        favoriteCut: joinPreferenceLabels(favoriteCuts, 'cut', options),
        favoriteCollection: joinPreferenceLabels(favoriteCollections, 'collection', options),
      },
    },
  }
}
