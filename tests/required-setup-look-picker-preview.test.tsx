import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { RequiredSetupLookPicker } from '@/app/nic-nac/components/RequiredSetupLookPicker'
import { getCommunityAmethystSkinCards } from '@/lib/amethyst/skin-cards'

describe('skin browsing preview', () => {
  it('keeps every skin card out of the generic picker until account-scoped options load', () => {
    const onChoose = vi.fn()
    const html = renderToStaticMarkup(createElement(RequiredSetupLookPicker, { onChoose }))

    expect(html).toContain('Loading the themes available to your account…')
    expect(html).not.toContain('<article')
    expect(html).not.toContain('Gnome Forest')
    expect(html).not.toContain('Neon Butterfly')
    expect(html).not.toContain('Halloween Pumpkin and Witch')
    expect(onChoose).not.toHaveBeenCalled()
  })

  it('keeps only community preview metadata in the unauthenticated catalog view', () => {
    expect(
      getCommunityAmethystSkinCards()
        .filter(({ previewHref }) => previewHref)
        .map(({ id }) => id),
    ).toEqual(['halloween_pumpkin_witch'])
  })
})
