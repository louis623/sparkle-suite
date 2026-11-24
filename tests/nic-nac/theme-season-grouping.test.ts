import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { AMETHYST_SKIN_CARDS } from '@/lib/amethyst/skin-cards'
import {
  easternDateParts,
  groupThemesBySeason,
  seasonsActiveOn,
  studioThemes,
} from '@/lib/amethyst/theme-seasons'

const OCT_15 = new Date('2026-10-15T16:00:00.000Z')
const NOV_23 = new Date('2026-11-23T17:00:00.000Z')
const JAN_10 = new Date('2026-01-10T17:00:00.000Z')
const OCT_31_LATE = new Date('2026-11-01T03:59:00.000Z')
const NOV_1_MIDNIGHT = new Date('2026-11-01T04:00:00.000Z')
const DEC_31_LATE = new Date('2027-01-01T04:59:00.000Z')
const JAN_1_MIDNIGHT = new Date('2027-01-01T05:00:00.000Z')

const themes = [
  { id: 'halloween_pumpkin_cat', season: 'halloween' as const },
  { id: 'gobble_and_fizz', season: 'thanksgiving' as const },
  { id: 'silver_bells', season: 'christmas' as const },
  { id: 'rose_champagne', season: 'none' as const },
  { id: 'amethyst', season: 'none' as const },
]

describe('theme season grouping', () => {
  it('uses the Eastern calendar date', () => {
    expect(easternDateParts(OCT_31_LATE)).toMatchObject({ year: 2026, month: 10, day: 31 })
    expect(easternDateParts(NOV_1_MIDNIGHT)).toMatchObject({ year: 2026, month: 11, day: 1 })
    expect(easternDateParts(DEC_31_LATE)).toMatchObject({ year: 2026, month: 12, day: 31 })
    expect(easternDateParts(JAN_1_MIDNIGHT)).toMatchObject({ year: 2027, month: 1, day: 1 })
  })

  it('puts Halloween in season on Oct 15 and parks the other holidays on Year-round', () => {
    const groups = groupThemesBySeason(themes, 'rose_champagne', OCT_15)
    expect(groups.inSeason.map((theme) => theme.id)).toEqual(['halloween_pumpkin_cat'])
    expect(groups.yearRound.map((theme) => theme.id)).toEqual([
      'rose_champagne',
      'amethyst',
      'gobble_and_fizz',
      'silver_bells',
    ])
    expect(groups.outOfSeason.map((theme) => theme.id)).toEqual(['gobble_and_fizz', 'silver_bells'])
  })

  it('puts Thanksgiving and Christmas in season on Nov 23 and Halloween at the end of Year-round', () => {
    const groups = groupThemesBySeason(themes, 'rose_champagne', NOV_23)
    expect(groups.inSeason.map((theme) => theme.id)).toEqual(['gobble_and_fizz', 'silver_bells'])
    expect(groups.yearRound[0]?.id).toBe('rose_champagne')
    expect(groups.yearRound.at(-1)?.id).toBe('halloween_pumpkin_cat')
    expect(groups.outOfSeason.map((theme) => theme.id)).toEqual(['halloween_pumpkin_cat'])
  })

  it('puts nothing in season on Jan 10', () => {
    const groups = groupThemesBySeason(themes, 'rose_champagne', JAN_10)
    expect(groups.inSeason).toEqual([])
    expect(groups.yearRound.map((theme) => theme.id)).toEqual([
      'rose_champagne',
      'amethyst',
      'halloween_pumpkin_cat',
      'gobble_and_fizz',
      'silver_bells',
    ])
  })

  it('flips at Eastern midnight on Oct 31 and Dec 31', () => {
    expect(seasonsActiveOn(OCT_31_LATE)).toEqual(['halloween'])
    expect(seasonsActiveOn(NOV_1_MIDNIGHT)).toEqual(['thanksgiving'])
    expect(seasonsActiveOn(DEC_31_LATE)).toEqual(['christmas'])
    expect(seasonsActiveOn(JAN_1_MIDNIGHT)).toEqual([])
    expect(groupThemesBySeason(themes, 'amethyst', OCT_31_LATE).inSeason.map((theme) => theme.id)).toEqual(['halloween_pumpkin_cat'])
    expect(groupThemesBySeason(themes, 'amethyst', NOV_1_MIDNIGHT).inSeason.map((theme) => theme.id)).toEqual(['gobble_and_fizz'])
  })

  it('lists the saved theme first in its group', () => {
    const inSeason = groupThemesBySeason(themes, 'silver_bells', NOV_23)
    expect(inSeason.inSeason[0]?.id).toBe('silver_bells')
    const yearRound = groupThemesBySeason(themes, 'amethyst', JAN_10)
    expect(yearRound.yearRound[0]?.id).toBe('amethyst')
    const parked = groupThemesBySeason(themes, 'halloween_pumpkin_cat', JAN_10)
    expect(parked.yearRound[0]?.id).toBe('halloween_pumpkin_cat')
  })

  it('keeps an unoffered saved theme selected at the front with no unsaved offer', () => {
    const saved = AMETHYST_SKIN_CARDS.find((card) => card.id === 'rose_quartz')
    expect(saved?.selectable).toBe(false)
    const offered = AMETHYST_SKIN_CARDS.filter((card) => card.selectable !== false && card.id !== 'rose_quartz')
    const studio = studioThemes(offered, saved!, JAN_10)
    expect(studio.savedOffered).toBe(false)
    expect(studio.yearRound[0]?.id).toBe('rose_quartz')
    expect(studio.inSeason.some((theme) => theme.id === 'rose_quartz')).toBe(false)
  })

  it('tags real themes and points picture themes at a 480px thumbnail', () => {
    const byId = Object.fromEntries(AMETHYST_SKIN_CARDS.map((card) => [card.id, card]))
    expect(byId.halloween_pumpkin_cat?.season).toBe('halloween')
    expect(byId.halloween_pumpkin_witch?.season).toBe('halloween')
    expect(byId.gobble_and_fizz?.season).toBe('thanksgiving')
    expect(byId.pie_please?.season).toBe('thanksgiving')
    expect(byId.fall_owl_harvest_moon?.season).toBe('thanksgiving')
    expect(byId.gilded_autumn?.season).toBe('thanksgiving')
    expect(byId.silver_bells?.season).toBe('christmas')
    expect(byId.starlight_christmas_hollow?.season).toBe('christmas')
    expect(byId.macies_christmas_globe?.season).toBe('christmas')
    expect(byId.rose_champagne?.season).toBe('none')
    expect(byId.black_diamond?.label).toBe('Black Diamond')
    for (const id of [
      'sparkle_suite_morganite',
      'moonstone',
      'emerald_garden',
      'rose_gold',
      'garnet',
      'amber',
      'velvet',
      'black_diamond',
      'alpine_opal',
    ]) {
      expect(byId[id]?.thumb).toBeNull()
      expect(byId[id]?.previewColors.length).toBeGreaterThan(0)
    }
    expect(byId.rose_champagne?.thumb).toBe('/amethyst/skins/rose-champagne/thumb.webp')
    expect(existsSync('public/amethyst/skins/rose-champagne/thumb.webp')).toBe(true)
    expect(existsSync('public/amethyst/skins/silver-bells/thumb.webp')).toBe(true)
    expect(existsSync('public/amethyst/skins/gobble-and-fizz/thumb.webp')).toBe(true)
  })
})
