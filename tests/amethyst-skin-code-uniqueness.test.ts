import { describe, expect, it } from 'vitest'
import {
  AMETHYST_SKIN_CARDS,
  normalizeAmethystSkinSelection,
} from '@/lib/amethyst/skin-cards'

describe('Amethyst theme codes', () => {
  it('assigns a unique code to every theme', () => {
    const codes = AMETHYST_SKIN_CARDS.map((skin) => skin.code)
    const duplicates = codes.filter(
      (code, index) => codes.indexOf(code) !== index,
    )

    expect(duplicates).toEqual([])
    expect(new Set(codes).size).toBe(AMETHYST_SKIN_CARDS.length)
  })

  it('maps SB-01 to Sunset Beach and SV-01 to Silver Bells', () => {
    expect(normalizeAmethystSkinSelection('SB-01')).toBe('sunset_beach')
    expect(normalizeAmethystSkinSelection('sb-01')).toBe('sunset_beach')
    expect(normalizeAmethystSkinSelection('SV-01')).toBe('silver_bells')
    expect(normalizeAmethystSkinSelection('sv-01')).toBe('silver_bells')
    expect(normalizeAmethystSkinSelection('Silver Bells')).toBe('silver_bells')
    expect(normalizeAmethystSkinSelection('Sunset Beach')).toBe('sunset_beach')
  })
})
