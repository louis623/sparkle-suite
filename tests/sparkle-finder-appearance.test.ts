import { describe, expect, it, vi } from 'vitest'
import { SPARKLE_FINDER_APPEARANCE_PRESET_IDS } from '@/lib/sparkle-finder/appearance-presets'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { FinderAppearanceControlCenter } from '@/app/control-center/_components/FinderAppearanceControlCenter'

import {
  loadSparkleFinderAppearanceSetting,
  resolveSparkleFinderAppearance,
  saveSparkleFinderAppearanceSetting,
} from '@/lib/sparkle-finder/appearance'

describe('Sparkle Finder appearance settings', () => {
  it('provides complete semantic tokens for every Finder-supported appearance ID', () => {
    const expectedKeys = Object.keys(resolveSparkleFinderAppearance('amethyst').tokens).sort()
    for (const preset of SPARKLE_FINDER_APPEARANCE_PRESET_IDS) {
      const appearance = resolveSparkleFinderAppearance(preset)
      expect(appearance.preset).toBe(preset)
      expect(Object.keys(appearance.tokens).sort()).toEqual(expectedKeys)
      expect(Object.values(appearance.tokens).every((value) => value.length > 0)).toBe(true)
    }
    expect(resolveSparkleFinderAppearance(undefined).preset).toBe('amethyst')
  })

  it('does not offer or save the Suite-only gnome skin in Finder', async () => {
    const initialAppearance = resolveSparkleFinderAppearance('amethyst')
    const html = renderToStaticMarkup(createElement(FinderAppearanceControlCenter, { initialAppearance }))
    expect(html).not.toContain('GG-01')
    expect(html).not.toContain('gnome_garden')
    expect(html.match(/type="radio"/g)).toHaveLength(11)
    expect(resolveSparkleFinderAppearance('gnome_garden').preset).toBe('amethyst')
    const admin = { from: vi.fn() }
    await expect(saveSparkleFinderAppearanceSetting(admin as never, 'gnome_garden', 'operator@example.com')).rejects.toThrow('Unknown Sparkle Finder appearance preset.')
    expect(admin.from).not.toHaveBeenCalled()
  })

  it('resolves the approved Amethyst preset into public semantic tokens', () => {
    const appearance = resolveSparkleFinderAppearance('amethyst')

    expect(appearance).toMatchObject({
      schemaVersion: 1,
      preset: 'amethyst',
      label: 'Chasing Unicorns (Amethyst)',
      tokens: {
        background: '#E8DFF5',
        primary: '#5C0EFF',
        accent: '#FF1AC2',
        headingFont: 'italiana',
        bodyFont: 'inter',
      },
    })
  })

  it('falls back to Amethyst when the global setting is missing or invalid', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })
    const eq = vi.fn(() => ({ maybeSingle }))
    const select = vi.fn(() => ({ eq }))
    const admin = { from: vi.fn(() => ({ select })) }

    await expect(loadSparkleFinderAppearanceSetting(admin as never)).resolves.toMatchObject({
      preset: 'amethyst',
    })

    expect(admin.from).toHaveBeenCalledWith('sparkle_finder_brand_settings')
  })

  it('upserts only normalized customer-site preset IDs', async () => {
    const single = vi.fn().mockResolvedValue({
      data: { appearance_preset: 'rose_quartz' },
      error: null,
    })
    const select = vi.fn(() => ({ single }))
    const upsert = vi.fn(() => ({ select }))
    const admin = { from: vi.fn(() => ({ upsert })) }

    const saved = await saveSparkleFinderAppearanceSetting(
      admin as never,
      'rose_quartz',
      'operator@example.com',
    )

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'global',
        appearance_preset: 'rose_quartz',
        updated_by: 'operator@example.com',
      }),
      { onConflict: 'id' },
    )
    expect(saved.preset).toBe('rose_quartz')
  })
})
