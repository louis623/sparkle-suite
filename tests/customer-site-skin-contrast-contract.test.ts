import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { AMETHYST_APPEARANCE_PRESETS, AMETHYST_APPEARANCE_PRESET_IDS } from '@/lib/amethyst/appearance-presets'

const readCustomerSiteCss = (file: string) =>
  readFileSync(resolve(process.cwd(), 'public', 'amethyst', file), 'utf8')

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const cssRule = (selector: string, property: string) =>
  new RegExp(
    `${escapeRegex(selector)}\\s*\\{[^}]*${escapeRegex(property)}\\s*:`,
    's',
  )

const cardSurfaceClass = (surface: string) =>
  surface === 'holographic' ? 'fx-holographic' : `surface-${surface}`

describe('customer-site skin contrast contract', () => {
  const homepageCss = readCustomerSiteCss('homepage.css')
  const joinCss = readCustomerSiteCss('join.css')
  const tradeCss = readCustomerSiteCss('trade.css')
  const midnightCss = readCustomerSiteCss('midnight-rose.css')
  const presets = Object.values(AMETHYST_APPEARANCE_PRESETS)

  it('gives every selectable skin a semantic foreground contract for its card surface', () => {
    expect(presets.map(({ id }) => id)).toEqual([...AMETHYST_APPEARANCE_PRESET_IDS])

    for (const preset of presets) {
      const selector = preset.id === 'midnight_rose'
        ? 'body.bg-midnight-rose'
        : `body.${cardSurfaceClass(preset.values.cardSurface)}`
      const css = preset.id === 'midnight_rose' ? midnightCss : homepageCss

      expect(css).toMatch(cssRule(selector, '--hp-card-fg'))
      expect(css).toMatch(cssRule(selector, '--hp-card-muted'))
      expect(css).toMatch(cssRule(selector, '--hp-card-accent'))
      expect(css).toMatch(cssRule(selector, '--hp-final-fg'))
      expect(css).toMatch(cssRule(selector, '--hp-final-muted'))
      expect(css).toMatch(cssRule(selector, '--hp-final-icon-fg'))
    }
  })

  it('makes Join final cards consume semantic foreground tokens instead of hard-coded white text', () => {
    for (const [selector, property, token] of [
      ['.jp-final-card', 'color', 'var(--hp-final-fg)'],
      ['.jp-final-title', 'color', 'var(--hp-final-fg)'],
      ['.jp-final-sub', 'color', 'var(--hp-final-muted)'],
      ['.jp-final-note', 'color', 'var(--hp-final-muted)'],
      ['.jp-final-icon', 'color', 'var(--hp-final-icon-fg)'],
    ]) {
      expect(joinCss).toMatch(
        new RegExp(
          `${escapeRegex(selector)}\\s*\\{[^}]*${escapeRegex(property)}\\s*:\\s*${escapeRegex(token)}\\s*;`,
          's',
        ),
      )
    }
  })

  it('uses a skin-aware foreground token for all customer action controls and active Trade filters', () => {
    for (const preset of presets) {
      const selector = preset.id === 'midnight_rose' ? 'body.bg-midnight-rose' : `body.btn-${preset.values.buttonEnergy}`
      expect(preset.id === 'midnight_rose' ? midnightCss : homepageCss).toMatch(cssRule(selector, '--hp-action-fg'))
    }

    for (const [selector, css] of [
      ['.hp-btn-primary', homepageCss],
      ['.hp-shop-btn', homepageCss],
      ['.hp-signup-submit', homepageCss],
      ['.tp-card-expand-cta', tradeCss],
      ['.jp-spot-btn', joinCss],
      ['.jp-final-btn', joinCss],
      ['.tp-filter-pill.active', tradeCss],
    ] as const) {
      expect(css).toMatch(
        new RegExp(
          `${escapeRegex(selector)}\\s*\\{[^}]*color\\s*:\\s*var\\(--hp-action-fg\\)\\s*;`,
          's',
        ),
      )
    }
  })
})
