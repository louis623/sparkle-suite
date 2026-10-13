import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { getAmethystAppearancePreset } from '@/lib/amethyst/appearance-presets'
import { getAmethystSkinCard, normalizeAmethystSkinSelection } from '@/lib/amethyst/skin-cards'
import { skinPreviewMediaSource } from '@/lib/amethyst/skin-preview'
import fixture from './fixtures/rose-gold-collection-identity.json'

const read = (file: string) => readFileSync(file, 'utf8').replace(/\r\n/g, '\n')
const hash = (value: string | Buffer) => createHash('sha256').update(value).digest('hex')

describe('Original RG-01 and approved RG-04 coexist without a redesign', () => {
  it('restores exact original source blocks from 2e20ab44 and leaves the shared stylesheet intact', () => {
    for (const [file, expected] of Object.entries(fixture.originalBlocks)) {
      const source = read(file)
      const block = file.endsWith('skin-cards.ts')
        ? source.match(/  \{\n    id: 'rose_gold',[\s\S]*?\n  \},/)?.[0]
        : source.match(/  rose_gold: \{[\s\S]*?\n  \},/)?.[0]
      expect(block, file).toBeDefined()
      expect(hash(block!), file).toBe(expected)
    }
    expect(hash(read('public/amethyst/homepage.css'))).toBe(fixture.sharedStylesheet)
  })

  it('changes only the approved Champagne stylesheet/runtime identity gates and preserves both media files', () => {
    for (const [file, expected] of Object.entries(fixture.champagneIdentityOnly)) expect(hash(read(file)), file).toBe(expected)
    for (const [file, expected] of Object.entries(fixture.media)) expect(hash(readFileSync(file)), file).toBe(expected)
    const css = read('public/amethyst/rose-champagne.css')
    const runtime = read('public/amethyst/rose-champagne.js')
    expect(css).not.toContain('bg-rose-gold-paper')
    expect(runtime).not.toContain('rose_gold')
    expect(runtime).toContain('rose_champagne')
    expect(runtime).toContain('bg-rose-champagne')
  })

  it('keeps each collection code and label unambiguous, with no Rose Gold alias on RG-04', () => {
    for (const name of ['rose_gold', 'RG-01', 'Rose Gold']) expect(normalizeAmethystSkinSelection(name)).toBe('rose_gold')
    for (const name of ['rose_champagne', 'RG-04', 'Rose Champagne']) expect(normalizeAmethystSkinSelection(name)).toBe('rose_champagne')
    expect(getAmethystSkinCard('rose_gold')).toMatchObject({ code: 'RG-01', label: 'Rose Gold' })
    expect(getAmethystSkinCard('rose_champagne')).toMatchObject({ code: 'RG-04', label: 'Rose Champagne', visibility: 'community' })
    expect(getAmethystSkinCard('rose_champagne')?.aliases).toBeUndefined()
    expect(getAmethystAppearancePreset('rose_gold').values.primaryColor).toBe('#e04f73')
    expect(getAmethystAppearancePreset('rose_champagne').values.primaryColor).toBe('#a04e5d')
    expect(skinPreviewMediaSource('rose_gold', 'https://example.test')).toBe("'none'")
    expect(skinPreviewMediaSource('rose_champagne', 'https://example.test')).toBe('https://example.test/amethyst/skins/rose-champagne/')
  })

  it('retains inherited base treatment for RG-04 while keeping its override gate distinct from RG-01', () => {
    for (const page of ['homepage', 'trade', 'join']) {
      const source = read(`public/amethyst/${page}.jsx`)
      expect(source).toContain('if (t.bgTreatment === "rose-gold-paper") body.classList.add("bg-rose-gold-paper");')
      expect(source).toContain('if (t.bgTreatment === "rose-champagne") body.classList.add("bg-rose-gold-paper", "bg-rose-champagne");')
    }
    expect(getAmethystAppearancePreset('rose_gold').values.bgTreatment).toBe('rose-gold-paper')
    expect(getAmethystAppearancePreset('rose_champagne').values.bgTreatment).toBe('rose-champagne')
  })
})
