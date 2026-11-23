import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

function cssFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return cssFiles(path)
    return entry.name.endsWith('.css') ? [path] : []
  })
}

function isScopedTickerLabel(selector: string) {
  if (/\.hp-ticker-row\.reverse\b/.test(selector)) return false
  return /\.hp-ticker-row(?::not\(\.reverse\))?(?:\s+|>|\+|~)\.hp-ticker-label\b/.test(selector)
}

describe('public lineup label uses the same scoped ticker colors', () => {
  const files = cssFiles('public/amethyst')
  it('finds the known theme label rules', () => {
    const themed = files.filter((file) => {
      const css = readFileSync(file, 'utf8')
      return (css.match(/[^{}]+\{[^{}]*\}/g) ?? []).some((block) =>
        block.slice(0, block.indexOf('{')).split(',').some((selector) => isScopedTickerLabel(selector.trim())),
      )
    })
    expect(themed.map((file) => file.split('/').at(-1)).sort()).toEqual([
      'fall-owl.css',
      'gobble-and-fizz.css',
      'halloween-pumpkin-cat.css',
      'halloween-pumpkin-witch.css',
      'homepage.css',
      'midnight-rose.css',
      'pearl-rose.css',
      'pie-please.css',
      'rose-champagne.css',
      'silver-bells.css',
      'starlight-christmas-hollow.css',
      'sunset-beach.css',
    ])
  })

  for (const file of files) {
    it(`${file} repeats each forward ticker-label rule for the lineup label`, () => {
      const css = readFileSync(file, 'utf8')
      const blocks = css.match(/[^{}]+\{[^{}]*\}/g) ?? []
      for (const block of blocks) {
        const selectors = block.slice(0, block.indexOf('{')).split(',').map((selector) => selector.trim()).filter(Boolean)
        if (!selectors.some(isScopedTickerLabel)) continue
        expect(selectors.some((selector) => /\.hp-lineup-label\b/.test(selector)), block.slice(0, 180)).toBe(true)
        expect(block).not.toMatch(/\.hp-ticker-row\.reverse[^{]*\.hp-lineup-label/)
      }
    })
  }
})
