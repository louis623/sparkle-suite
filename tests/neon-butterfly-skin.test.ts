import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import sharp from 'sharp'

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
  getAmethystSkinCardsForRep,
  getAmethystSkinCard,
  getAmethystSkinDropdownLabel,
  isAmethystSkinSelectionAvailableToRep,
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

  it('shows Neon Butterfly only to Kelly and Louis demo with Kelly\'s special label', () => {
    const kellyRepId = 'b5404543-b90a-41cf-85f6-4e6d1d576cfa'
    const louisDemoRepId = 'ac3e643a-6ccf-4400-8230-662f63a07f3e'
    const kellyCards = getAmethystSkinCardsForRep(kellyRepId)
    const otherCards = getAmethystSkinCardsForRep('another-rep')
    const neonCard = kellyCards.find(({ id }) => id === 'neon_butterfly')

    expect(neonCard).toBeDefined()
    expect(getAmethystSkinDropdownLabel(neonCard!)).toBe(
      'Neon Butterfly (NB-01) — Only Kelly has',
    )
    expect(otherCards.some(({ id }) => id === 'neon_butterfly')).toBe(false)
    expect(isAmethystSkinSelectionAvailableToRep('NB-01', kellyRepId)).toBe(true)
    expect(isAmethystSkinSelectionAvailableToRep('NB-01', louisDemoRepId)).toBe(true)
    expect(isAmethystSkinSelectionAvailableToRep('Neon Butterfly', 'another-rep')).toBe(false)
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
    expect(css).toContain('font-variant-ligatures: none')
    expect(css).toContain('.hp-hero-sub { max-width: 44ch; }')
    expect(css).toContain('kelly-studio-desktop.webp')
    expect(css).toContain('kelly-studio-mobile.webp')
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
    expect(motion).toContain('<img class="nb-butterfly-art"')
    expect(motion).toContain('kelly-sign-pink.png')
    expect(motion).toContain('kelly-sign-gold.png')
    expect(motion).toContain('kelly-sign-violet.png')
    expect(motion).not.toContain('<svg')
    expect(motion).not.toContain('neon-sign-')
    expect(css).toContain('.nb-butterfly-art')
    expect(css).toContain('.nb-wing--left')
    expect(css).toContain('drop-shadow(0 0 22px currentColor)')
    expect(motion).not.toContain('INNER_PATH')
    expect(motion).not.toContain('nb-butterfly-detail')
    expect(css).toContain('@keyframes nb-wing-flap-left')
    expect(css).toContain('@keyframes nb-wing-flap-right')
    expect(motion).toContain("duration: 17")
    expect(motion).toContain("duration: 21")
    expect(motion).toContain("duration: 19")
    expect(motion).toContain("{ tone: 'pink', place: 'crown'")
    expect(motion).toContain("{ tone: 'gold', place: 'left'")
    expect(motion).toContain("{ tone: 'violet', place: 'right'")
    expect(css).not.toContain('nb-butterfly--flyer')

    for (const asset of ['kelly-studio-desktop.webp', 'kelly-studio-mobile.webp']) {
      const bytes = readFileSync(resolve(root, 'public', 'amethyst', 'skins', 'neon-butterfly', asset))
      expect(bytes.length).toBeGreaterThan(20_000)
      expect(bytes.length).toBeLessThan(250_000)
      expect(bytes.toString('ascii', 0, 4)).toBe('RIFF')
      expect(bytes.toString('ascii', 8, 12)).toBe('WEBP')
    }

    for (const asset of ['kelly-sign-pink.png', 'kelly-sign-gold.png', 'kelly-sign-violet.png']) {
      const bytes = readFileSync(resolve(root, 'public', 'amethyst', 'skins', 'neon-butterfly', asset))
      expect(bytes.length).toBeGreaterThan(20_000)
      expect(bytes.length).toBeLessThan(150_000)
      expect(bytes.toString('hex', 0, 8)).toBe('89504e470d0a1a0a')
    }
  })

  it('keeps the source-faithful Kelly sign cutouts transparent outside the neon tubes', async () => {
    for (const asset of ['kelly-sign-pink.png', 'kelly-sign-gold.png', 'kelly-sign-violet.png']) {
      const { data, info } = await sharp(
        resolve(root, 'public', 'amethyst', 'skins', 'neon-butterfly', asset),
      ).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
      const alphaAt = (x: number, y: number) => data[(y * info.width + x) * info.channels + 3]
      const edgeAlphas = [
        ...Array.from({ length: info.width }, (_, x) => alphaAt(x, 0)),
        ...Array.from({ length: info.width }, (_, x) => alphaAt(x, info.height - 1)),
        ...Array.from({ length: info.height }, (_, y) => alphaAt(0, y)),
        ...Array.from({ length: info.height }, (_, y) => alphaAt(info.width - 1, y)),
      ]
      const visiblePixels = Array.from(
        { length: info.width * info.height },
        (_, index) => data[index * info.channels + 3],
      ).filter((alpha) => alpha > 4).length
      const opaqueDarkPixels = Array.from({ length: info.width * info.height }, (_, index) => {
        const offset = index * info.channels
        return data[offset + 3] > 8 && Math.max(data[offset], data[offset + 1], data[offset + 2]) < 40
      }).filter(Boolean).length

      expect(Math.max(...edgeAlphas)).toBe(0)
      expect(visiblePixels / (info.width * info.height)).toBeLessThan(0.17)
      expect(opaqueDarkPixels).toBe(0)
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

  it('locks the preset to Kelly and Louis demo while making it Kelly\'s live default', () => {
    const migration = read(
      'supabase',
      'migrations',
      '20260914000200_make_neon_butterfly_kelly_exclusive.sql',
    )

    expect(migration).toContain("public_site_slug = 'sparklybutterflies'")
    expect(migration).toContain("email = 'louis@neonrabbit.net'")
    expect(migration).toContain("appearance_preset <> 'neon_butterfly'")
    expect(migration).toContain("appearance_preset = 'neon_butterfly'")
    expect(migration).toContain("customer_site_template = 'amethyst'")
    expect(migration).toContain('b5404543-b90a-41cf-85f6-4e6d1d576cfa')
    expect(migration).toContain('ac3e643a-6ccf-4400-8230-662f63a07f3e')
  })
})
