import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { RequiredSetupLookPicker } from '@/app/nic-nac/components/RequiredSetupLookPicker'
import { AMETHYST_SKIN_CARDS } from '@/lib/amethyst/skin-cards'

describe('skin browsing preview', () => {
  it('offers separate new-tab previews without applying a skin', () => {
    const onChoose = vi.fn()
    const html = renderToStaticMarkup(createElement(RequiredSetupLookPicker, { onChoose }))
    const card = html.split('<article').find((markup) => markup.includes('GG-01'))!

    expect(card).toContain('href="/skin-preview/gnome_garden/homepage"')
    expect(card).toContain('target="_blank"')
    expect(card).toContain('rel="noopener noreferrer"')
    expect(card).toContain('aria-label="Preview Gnome Forest (opens in a new tab)"')
    expect(card).toContain('Preview this skin')
    expect(card).toMatch(/<button[^>]*type="button"[^>]*>Choose this customer-site Look<\/button>/)
    expect(html).not.toContain('href="/skin-preview/neon_butterfly/homepage"')
    expect(html).not.toContain('Neon Butterfly')
    expect(html).toContain('href="/skin-preview/halloween_pumpkin_witch/homepage"')
    expect(html).toContain('Halloween Pumpkin and Witch')
    expect(html.match(/Preview this skin/g)).toHaveLength(2)
    expect(onChoose).not.toHaveBeenCalled()
    expect(AMETHYST_SKIN_CARDS.filter(({ previewHref }) => previewHref).map(({ id }) => id)).toEqual([
      'gnome_garden',
      'neon_butterfly',
      'halloween_pumpkin_witch',
    ])
  })

  it('keeps read-only preview available while applying a skin is disabled', () => {
    const html = renderToStaticMarkup(createElement(RequiredSetupLookPicker, { onChoose: vi.fn(), disabled: true }))
    const card = html.split('<article').find((markup) => markup.includes('GG-01'))!

    expect(card).toContain('href="/skin-preview/gnome_garden/homepage"')
    expect(card).toMatch(/<button[^>]*disabled=""[^>]*>/)
  })
})
