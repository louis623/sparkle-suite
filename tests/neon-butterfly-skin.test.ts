import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import {
  AMETHYST_CUSTOMER_SITE_TEMPLATE,
  DEFAULT_AMETHYST_APPEARANCE_PRESET,
  getAmethystAppearancePreset,
  normalizeAmethystAppearancePreset,
  normalizeCustomerSiteTemplate,
} from '@/lib/amethyst/appearance-presets'
import {
  buildAmethystHomepageTweakDefaults,
  defaultAmethystHomepageTemplateData,
} from '@/lib/amethyst/homepage-template-data'
import {
  buildAmethystTradeTweakDefaults,
  defaultAmethystTradeTemplateData,
} from '@/lib/amethyst/trade-template-data'
import {
  buildAmethystJoinTweakDefaults,
  defaultAmethystJoinTemplateData,
} from '@/lib/amethyst/join-template-data'
import {
  getAmethystSkinCard,
  normalizeAmethystSkinSelection,
} from '@/lib/amethyst/skin-cards'
import { GET as getSkinPreview } from '@/app/skin-preview/[skin]/[page]/route'

const root = process.cwd()
const read = (...parts: string[]) =>
  readFileSync(resolve(root, ...parts), 'utf8')

describe('Neon Butterfly Amethyst skin', () => {
  it('registers one visual-only preset across Homepage, Dance Floor, and Join', () => {
    const preset = getAmethystAppearancePreset('neon_butterfly')
    const expected = {
      preset: 'neon_butterfly',
      primaryColor: '#ff2acd',
      accentColor: '#ffc24a',
      bgTone: 'neonButterfly',
      headingFont: 'playfair',
      bodyFont: 'dmSans',
      headingWeight: 600,
      bgTreatment: 'neon-butterfly',
      cardSurface: 'neon-velvet-glass',
      textureOverlay: 'neon-butterflies',
      buttonEnergy: 'neon-lift',
      tradeFlair: 'butterfly-glow',
    }

    expect(preset.label).toBe('Neon Butterfly')
    expect(buildAmethystHomepageTweakDefaults(defaultAmethystHomepageTemplateData, preset.id)).toMatchObject(expected)
    expect(buildAmethystTradeTweakDefaults(defaultAmethystTradeTemplateData, preset.id)).toMatchObject(expected)
    expect(buildAmethystJoinTweakDefaults(defaultAmethystJoinTemplateData, preset.id)).toMatchObject(expected)
    expect(normalizeAmethystAppearancePreset('neon_butterfly')).toBe('neon_butterfly')
    expect(normalizeAmethystSkinSelection('NB-01')).toBe('neon_butterfly')
    expect(normalizeAmethystSkinSelection('Neon Butterfly')).toBe('neon_butterfly')

    expect(AMETHYST_CUSTOMER_SITE_TEMPLATE).toBe('amethyst')
    expect(normalizeCustomerSiteTemplate('neon_butterfly')).toBe('amethyst')
    expect(DEFAULT_AMETHYST_APPEARANCE_PRESET).toBe('sparkle_suite_morganite')
  })

  it('publishes a complete rep-facing browsing card', () => {
    expect(getAmethystSkinCard('neon_butterfly')).toMatchObject({
      id: 'neon_butterfly',
      code: 'NB-01',
      label: 'Neon Butterfly',
      previewHref: '/skin-preview/neon_butterfly/homepage',
      headingFont: 'Playfair Display',
      bodyFont: 'DM Sans',
    })
  })

  it.each(['homepage', 'trade', 'join', 'unsubscribe'] as const)(
    'serves a safe shared-component %s preview',
    async (page) => {
      const response = await getSkinPreview(
        new Request(`https://www.yoursparklesuite.com/skin-preview/neon_butterfly/${page}?c=ignored-customer`),
        { params: Promise.resolve({ skin: 'neon_butterfly', page }) },
      )
      expect(response.status).toBe(200)
      expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow')
      const html = await response.text()
      expect(html).toContain('Skin preview · Sample content')
      expect(html).toContain('Neon Butterfly')
      expect(html).toContain('neon_butterfly')
      expect(html).toContain('sandbox="allow-scripts"')
      expect(html).not.toContain('ignored-customer')
      expect(html).not.toContain('allow-same-origin')
    },
  )

  it('ships original responsive artwork and bounded accessible motion', () => {
    const css = read('public', 'amethyst', 'neon-butterfly.css')
    const motion = read('public', 'amethyst', 'neon-butterfly.js')

    expect(css).toContain('body.bg-neon-butterfly')
    expect(css).toContain('velvet-room-desktop.webp')
    expect(css).toContain('velvet-room-mobile.webp')
    expect(css).toContain('@media (prefers-reduced-motion: reduce)')
    expect(css).toContain('.nb-motion-control')
    expect(css).toContain('animation-play-state: paused')
    expect(motion).toContain('Pause animation')
    expect(motion).toContain('Resume animation')
    expect(motion).toContain("document.hidden")
    expect(motion).not.toContain('requestAnimationFrame')
    expect(motion).not.toContain('setInterval')

    expect(motion).toContain('nb-wing--left')
    expect(motion).toContain('nb-wing--right')
    expect(motion).toContain('neon-sign-pink.png')
    expect(motion).toContain('neon-sign-gold.png')
    expect(motion).toContain('neon-sign-violet.png')
    expect(motion).toContain('<img class="nb-butterfly-art"')
    expect(motion).not.toContain('<svg')
    expect(css).toContain('.nb-butterfly-art')
    expect(css).toContain('transform-origin: 100% 50%')
    expect(css).toContain('transform-origin: 0 50%')
    expect(motion).not.toContain('INNER_PATH')
    expect(motion).not.toContain('nb-butterfly-detail')
    expect(css).toContain('@keyframes nb-wing-flap-left')
    expect(css).toContain('@keyframes nb-wing-flap-right')
    expect(css).toContain('--nb-flap-duration: 19s')
    expect(css).toContain('--nb-flap-duration: 23s')
    expect(css).toContain('--nb-flap-duration: 27s')

    for (const asset of ['velvet-room-desktop.webp', 'velvet-room-mobile.webp']) {
      const bytes = readFileSync(resolve(root, 'public', 'amethyst', 'skins', 'neon-butterfly', asset))
      expect(bytes.length).toBeGreaterThan(20_000)
      expect(bytes.length).toBeLessThan(250_000)
      expect(bytes.toString('ascii', 0, 4)).toBe('RIFF')
      expect(bytes.toString('ascii', 8, 12)).toBe('WEBP')
    }

    for (const asset of ['neon-sign-pink.png', 'neon-sign-gold.png', 'neon-sign-violet.png']) {
      const bytes = readFileSync(resolve(root, 'public', 'amethyst', 'skins', 'neon-butterfly', asset))
      expect(bytes.length).toBeGreaterThan(5_000)
      expect(bytes.length).toBeLessThan(150_000)
      expect(bytes.toString('hex', 0, 8)).toBe('89504e470d0a1a0a')
    }
  })

  it.each(['Homepage.html', 'Trade.html', 'Join.html', 'Unsubscribe.html'])(
    'loads the shared Neon Butterfly skin on %s',
    (page) => {
      const html = read('public', 'amethyst', page)
      expect(html).toContain('neon-butterfly.css')
      expect(html).toContain('neon-butterfly.js')
    },
  )

  it('adds the preset to the database constraint without dropping legacy ids', () => {
    const migration = read(
      'supabase',
      'migrations',
      '20260914000100_add_neon_butterfly_appearance_preset.sql',
    )
    for (const id of ['neon_butterfly', 'pearl', 'luxe', 'ocean_sapphire']) {
      expect(migration).toContain(`'${id}'`)
    }
  })
})
