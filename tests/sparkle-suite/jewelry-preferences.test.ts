import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { createCustomerAudienceSignup } from '@/lib/services/customer-audience'
import {
  JEWELRY_NOTES_MAX_LENGTH,
  NOT_SURE_SLUG,
  PREFERENCE_MAX_PICKS,
  RING_SIZE_VALUES,
  fallbackPreferenceOptions,
  joinPreferenceLabels,
  legacyFavoriteChipText,
  readSignupPreferences,
} from '@/lib/sparkle-suite/jewelry-preferences'
import {
  loadPreferenceOptions,
  normalizeFinderPreferenceOptions,
  resetPreferenceOptionsCache,
} from '@/lib/sparkle-suite/load-preference-options'

const validPicks = {
  favoriteStones: ['ruby', 'opal'],
  favoriteMaterials: ['gold'],
  favoriteCuts: ['round'],
  favoriteCollections: [NOT_SURE_SLUG],
}

describe('Finder-parity preference lists', () => {
  it('keeps the bundled lists at Finder counts, with not_sure on every list', () => {
    expect(fallbackPreferenceOptions.stone.filter((option) => option.slug !== NOT_SURE_SLUG)).toHaveLength(24)
    expect(fallbackPreferenceOptions.material.filter((option) => option.slug !== NOT_SURE_SLUG)).toHaveLength(8)
    expect(fallbackPreferenceOptions.cut.filter((option) => option.slug !== NOT_SURE_SLUG)).toHaveLength(13)
    expect(
      fallbackPreferenceOptions.collection.filter((option) => option.slug !== NOT_SURE_SLUG && !option.isRetired),
    ).toHaveLength(22)
    expect(fallbackPreferenceOptions.collection.filter((option) => option.isRetired)).toHaveLength(12)

    for (const options of Object.values(fallbackPreferenceOptions)) {
      expect(options.some((option) => option.slug === NOT_SURE_SLUG && option.label === 'Not sure yet')).toBe(true)
      expect(new Set(options.map((option) => option.slug)).size).toBe(options.length)
    }
  })

  it('uses Finder ring sizes, whole sizes only', () => {
    expect([...RING_SIZE_VALUES]).toEqual(['5', '6', '7', '8', '9', '10', '11', 'not_sure'])
    expect(RING_SIZE_VALUES).not.toContain('5.5')
    expect(RING_SIZE_VALUES).not.toContain('12')
  })
})

describe('signup preference validation', () => {
  it('requires one to three picks and lets Not sure yet stand alone', () => {
    expect(PREFERENCE_MAX_PICKS).toBe(3)

    const missing = readSignupPreferences({
      ...validPicks,
      favoriteStones: [],
    })
    expect(missing.ok).toBe(false)
    if (!missing.ok) expect(missing.detail).toBe('missing_stone')

    const notSure = readSignupPreferences({
      ...validPicks,
      favoriteStones: [NOT_SURE_SLUG],
      favoriteMaterials: [NOT_SURE_SLUG],
      favoriteCuts: [NOT_SURE_SLUG],
      favoriteCollections: [NOT_SURE_SLUG],
    })
    expect(notSure.ok).toBe(true)
    if (notSure.ok && notSure.picks) {
      expect(notSure.picks.favoriteStones).toEqual([NOT_SURE_SLUG])
      expect(notSure.picks.labels).toEqual({
        favoriteGemOrStone: null,
        favoriteMaterial: null,
        favoriteCut: null,
        favoriteCollection: null,
      })
    }

    const exclusive = readSignupPreferences({
      ...validPicks,
      favoriteStones: [NOT_SURE_SLUG, 'ruby'],
    })
    expect(exclusive.ok).toBe(false)
    if (!exclusive.ok) expect(exclusive.detail).toBe('exclusive_stone')

    const tooMany = readSignupPreferences({
      ...validPicks,
      favoriteCuts: ['round', 'oval', 'pear', 'heart'],
    })
    expect(tooMany.ok).toBe(false)
    if (!tooMany.ok) expect(tooMany.detail).toBe('too_many_cut')

    const unknown = readSignupPreferences({
      ...validPicks,
      favoriteMaterials: ['platinum'],
    })
    expect(unknown.ok).toBe(false)
    if (!unknown.ok) expect(unknown.detail).toBe('unknown_material')
  })

  it('accepts ring sizes from the Finder list and notes up to 500 characters', () => {
    const saved = readSignupPreferences({
      ...validPicks,
      ringSize: '7',
      jewelryNotes: 'a'.repeat(JEWELRY_NOTES_MAX_LENGTH),
    })
    expect(saved.ok).toBe(true)
    if (saved.ok) {
      expect(saved.picks?.ringSize).toBe('7')
      expect(saved.picks?.jewelryNotes).toHaveLength(500)
    }

    expect(readSignupPreferences({ ...validPicks, ringSize: '' }).ok).toBe(true)
    expect(readSignupPreferences({ ...validPicks, ringSize: '5.5' }).ok).toBe(false)
    expect(readSignupPreferences({ ...validPicks, ringSize: '12' }).ok).toBe(false)
    expect(readSignupPreferences({ ...validPicks, ringSize: 'not_sure' }).ok).toBe(true)
    expect(readSignupPreferences({ ...validPicks, jewelryNotes: 'a'.repeat(501) }).ok).toBe(false)
  })

  it('requires the four lists even when an old form omits them', () => {
    const legacy = readSignupPreferences({
      ringSize: ' ',
      jewelryNotes: '   ',
    })
    expect(legacy.ok).toBe(false)
    if (!legacy.ok) {
      expect(legacy.message).toBe(
        'Refresh the page and pick at least one favorite in each list, or choose Not sure yet.',
      )
      expect(legacy.detail).toBe('missing_stone')
    }
  })

  it('joins readable labels for the legacy text columns', () => {
    expect(joinPreferenceLabels(['ruby', 'opal'], 'stone')).toBe('Ruby, Opal (incl. fire opal)')
    expect(joinPreferenceLabels([NOT_SURE_SLUG], 'collection')).toBeNull()
    expect(joinPreferenceLabels(['ruby', NOT_SURE_SLUG], 'stone')).toBe('Ruby')
    expect(legacyFavoriteChipText('Not sure yet')).toBeNull()
    expect(legacyFavoriteChipText('Ruby')).toBe('Ruby')
    expect(joinPreferenceLabels([], 'cut')).toBeNull()
  })
})

describe('preference option fallback', () => {
  it('uses the bundled lists when no Finder URL is configured', async () => {
    resetPreferenceOptionsCache()
    const fetchImpl = async () => {
      throw new Error('Finder should not be called')
    }

    const loaded = await loadPreferenceOptions({
      finderUrl: null,
      fetchImpl: fetchImpl as typeof fetch,
    })

    expect(loaded.source).toBe('fallback')
    expect(loaded.options).toBe(fallbackPreferenceOptions)
  })

  it('falls back when Finder fails or returns a list that cannot be used', async () => {
    resetPreferenceOptionsCache()
    const missing = await loadPreferenceOptions({
      finderUrl: 'https://finder.example/api/public/finder/preference-options',
      fetchImpl: (async () => new Response('nope', { status: 404 })) as typeof fetch,
    })
    expect(missing.source).toBe('fallback')
    expect(missing.options.stone).toHaveLength(25)

    resetPreferenceOptionsCache()
    const broken = await loadPreferenceOptions({
      finderUrl: 'https://finder.example/api/public/finder/preference-options',
      fetchImpl: (async () => {
        throw new Error('offline')
      }) as typeof fetch,
    })
    expect(broken.source).toBe('fallback')
    expect(normalizeFinderPreferenceOptions({ options: { stone: [] } })).toBeNull()
  })

  it('accepts a complete Finder payload', async () => {
    resetPreferenceOptionsCache()
    const remote = {
      options: {
        stone: [{ slug: 'not_sure', label: 'Not sure yet' }, { slug: 'ruby', label: 'Ruby' }],
        material: [{ slug: 'not_sure', label: 'Not sure yet' }, { slug: 'gold', label: 'Gold plated' }],
        cut: [{ slug: 'not_sure', label: 'Not sure yet' }, { slug: 'round', label: 'Round' }],
        collection: [{ slug: 'not_sure', label: 'Not sure yet' }, { slug: 'originals', label: 'Originals (monthly rings)' }],
      },
    }
    const loaded = await loadPreferenceOptions({
      finderUrl: 'https://finder.example/api/public/finder/preference-options',
      fetchImpl: (async () => Response.json(remote)) as typeof fetch,
    })
    expect(loaded.source).toBe('finder')
    expect(loaded.options.stone.map((option) => option.slug)).toEqual(['not_sure', 'ruby'])
  })
})

describe('customer signup preference save', () => {
  it('saves slug arrays and fills the legacy text columns with labels', async () => {
    const { client, inserts, logs } = mockAudienceClient()
    const parsed = readSignupPreferences({
      ...validPicks,
      ringSize: '8',
      jewelryNotes: ' Loves stacks. ',
    })
    if (!parsed.ok || !parsed.picks) throw new Error('expected picks')

    await createCustomerAudienceSignup(client, 'rep-1', {
      firstName: 'Jamie',
      lastName: 'Lane',
      email: 'jamie@example.com',
      smsConsent: false,
      emailConsent: true,
      marketingConsent: false,
      favoriteGemOrStone: 'ignored free text',
      preferencePicks: parsed.picks,
    })

    expect(inserts[0]).toMatchObject({
      favorite_stones: ['ruby', 'opal'],
      favorite_materials: ['gold'],
      favorite_cuts: ['round'],
      favorite_collections: ['not_sure'],
      favorite_gem_or_stone: 'Ruby, Opal (incl. fire opal)',
      favorite_material: 'Gold plated',
      favorite_cut: 'Round',
      favorite_collection: null,
      ring_size: '8',
      jewelry_notes: 'Loves stacks.',
      notes: null,
    })
    expect(logs[0]).toMatchObject({
      action: 'created',
      changes: {
        favorite_stones: ['ruby', 'opal'],
        favorite_gem_or_stone: 'Ruby, Opal (incl. fire opal)',
        jewelry_notes: 'Loves stacks.',
      },
    })
  })

  it('still stores the old single-text favorites when no pick arrays are sent', async () => {
    const { client, inserts } = mockAudienceClient()

    await createCustomerAudienceSignup(client, 'rep-1', {
      firstName: 'Jamie',
      lastName: 'Lane',
      email: 'jamie@example.com',
      smsConsent: false,
      emailConsent: true,
      marketingConsent: false,
      favoriteGemOrStone: 'Moonstone',
      favoriteCollection: 'Originals',
      preferencePicks: null,
    })

    expect(inserts[0]).toMatchObject({
      favorite_gem_or_stone: 'Moonstone',
      favorite_collection: 'Originals',
    })
    expect(inserts[0]).not.toHaveProperty('favorite_stones')
    expect(inserts[0]).not.toHaveProperty('jewelry_notes')
    expect(inserts[0]).not.toHaveProperty('ring_size')
  })
})

describe('signup copy and migration parity', () => {
  it('shows the privacy line and notes label on the shared homepage sign-up', () => {
    const jsx = readFileSync(resolve(process.cwd(), 'public/amethyst/homepage.jsx'), 'utf8')
    const signup = jsx.slice(jsx.indexOf('function Signup('), jsx.indexOf('function Footer('))

    expect(signup).toContain(
      'We never sell your information. Your answers are only used by {businessName} to give you a better experience.',
    )
    const privacy = signup.slice(signup.indexOf('hp-signup-privacy'), signup.indexOf('type="submit"'))
    expect(privacy).not.toMatch(/Sparkle Finder|Sparkle Suite/)
    const actions = signup.slice(
      signup.indexOf('className="hp-signup-actions"'),
      signup.indexOf('className="hp-signup-consent slot"'),
    )
    expect(actions.indexOf('hp-signup-privacy')).toBeGreaterThan(-1)
    expect(actions.indexOf('hp-signup-privacy')).toBeLessThan(actions.indexOf('type="submit"'))
    expect(jsx).toContain('.hp-signup-privacy { margin: 0; max-width: 38rem; color: var(--hp-card-fg); font-size: 15px; font-weight: 600; line-height: 1.5; text-align: center; }')
    expect(signup).toContain("Pieces you're hunting for, sizes, or styles you love.")
    expect(signup).not.toContain('our system to know')
    expect(jsx).toContain("Let's get you on the list")
    expect(jsx).toContain('Stones you love')
    expect(jsx).toContain('Metals and finishes')
    expect(jsx).toContain('Favorite cuts')
    expect(jsx).toContain('Bomb Party collections')
    expect(jsx).toContain('How should we reach you?')
    expect(jsx).toContain('Your birthday')
    expect(jsx).toContain('Anything else?')
    expect(signup).not.toContain('Your jewelry favorites')
    expect(signup).toContain('className="hp-signup-review"')
    expect(signup).toContain('hp-signup-review-label">Name')
    expect(signup).toContain('hp-signup-review-label">Channels')
    expect(signup).toContain('hp-signup-review-label">{label}')
    expect(signup).not.toContain('hp-signup-review-label">Favorites')
    expect(signup).not.toContain('1 favorite')
    expect(signup).not.toContain('hp-signup-review-group')
    expect(signup).not.toContain('hp-signup-review-nested')
    expect(jsx).toContain('.hp-signup-review-label { margin: 0; font-size: 14px;')
    expect(jsx).toContain('min-height: 44px; min-width: 44px; padding: 10px 8px;')
    expect(signup).toContain('function birthdayReviewLabel(value)')
    expect(signup).toContain('"March"')
    expect(signup).toContain('const birthdayReview = birthdayReviewLabel(form.birthday)')
    expect(signup).toContain('{birthdayReview}')
    expect(signup).toContain('birthday: form.birthday,')
    expect(signup).toContain('function preferenceShortLabel(label)')
    expect(signup).toContain('indexOf(" (")')
    expect(signup).toContain('return "Not sure yet"')
    expect(signup).not.toContain(' picks`')
    expect(jsx).toContain('#signup .hp-signup-card { max-width: 640px; }')
    expect(jsx).toContain('#signup .hp-signup-meter { width: 100%; max-width: none; }')
    expect(jsx).toContain('@media (prefers-reduced-motion: reduce) { .hp-signup-step-panel { animation: none; opacity: 1; transform: none; } }')
    expect(signup).not.toMatch(/\b(trade|sold|sales|traded)\b/i)
    expect(signup).not.toContain('Live Queue')
    expect(signup).not.toMatch(/free trial/i)
  })

  it('keeps the database checks aligned with the shared lists', () => {
    const root = resolve(process.cwd(), 'supabase/migrations')
    const arrays = readFileSync(resolve(root, '20261020150000_ss_customer_audience_favorite_arrays.sql'), 'utf8')
    const ring = readFileSync(resolve(root, '20261020150100_ss_customer_audience_ring_size.sql'), 'utf8')
    const notes = readFileSync(resolve(root, '20261020150200_ss_customer_audience_jewelry_notes.sql'), 'utf8')

    for (const column of ['favorite_stones', 'favorite_materials', 'favorite_cuts', 'favorite_collections']) {
      expect(arrays).toContain(column)
    }
    expect(arrays).toContain('cardinality(favorite_stones) <= 3')
    expect(arrays).toContain("AND 'not_sure' = ANY (favorite_stones)")
    expect(ring).toContain("ring_size IN ('5', '6', '7', '8', '9', '10', '11', 'not_sure')")
    expect(notes).toContain('length(jewelry_notes) <= 500')
    expect(notes).toContain('rep-private notes')
  })

  it('rejects comma-joined favorite values and duplicates in a forward migration', () => {
    const root = resolve(process.cwd(), 'supabase')
    const shape = readFileSync(
      resolve(root, 'migrations/20261020235500_ss_customer_audience_favorite_slug_shape.sql'),
      'utf8',
    )
    const undo = readFileSync(
      resolve(root, 'manual/20261020235500_ss_customer_audience_favorite_slug_shape_undo.sql'),
      'utf8',
    )

    expect(shape).not.toMatch(/\bSELECT\b/)
    expect(shape).toContain("array_to_string(favorite_stones, '') !~ ','")
    expect(shape).toContain('favorite_stones[1] IS DISTINCT FROM favorite_stones[2]')
    expect(shape).toContain('favorite_collections[2] IS DISTINCT FROM favorite_collections[3]')
    expect(shape).toContain("NOTIFY pgrst, 'reload schema';")
    expect(undo).toContain('DROP CONSTRAINT IF EXISTS customer_audience_favorite_stones_check')
    expect(undo).toContain("NOTIFY pgrst, 'reload schema';")
    expect(undo).not.toContain('DROP COLUMN')
  })
})

function mockAudienceClient() {
  const inserts: Array<Record<string, unknown>> = []
  const logs: Array<Record<string, unknown>> = []
  const client = {
    from(table: string) {
      if (table === 'customer_audience_change_log') {
        return {
          insert(values: Record<string, unknown>) {
            logs.push(values)
            return Promise.resolve({ error: null })
          },
        }
      }
      if (table !== 'customer_audience') throw new Error(`Unexpected table ${table}`)
      return {
        insert(values: Record<string, unknown>) {
          inserts.push(values)
          return {
            select() {
              return {
                single() {
                  return Promise.resolve({ data: { id: 'aud-1' }, error: null })
                },
              }
            },
          }
        },
      }
    },
  }
  return { client: client as never, inserts, logs }
}
