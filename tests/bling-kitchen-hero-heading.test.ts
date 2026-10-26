import { readFileSync } from 'node:fs'
import postcss from 'postcss'
import { expect, it } from 'vitest'

it('keeps both Bling Kitchen marketing titles as H2 with their original typography', () => {
  const jsx = readFileSync('public/amethyst/homepage.jsx', 'utf8')
  expect(jsx).toContain('<h2 id="bkf-hero-title">')
  expect(jsx).toContain('<h2 id="bk-home-hero-title">')
  for (const file of ['bling-kitchen/framed-hero.css', 'homepage.css', 'neon-butterfly.css', 'gnome-garden.css', 'gilded-autumn.css']) {
    const css = readFileSync('public/amethyst/' + file, 'utf8')
    expect(css).not.toMatch(/\.(?:bkf-hero|bk-home-hero(?:-content)?)\s+h1\b/)
    expect(css).toMatch(/#(?:bkf|bk-home)-hero-title/)
  }
  const rules: { selector: string; media: string; declarations: string }[] = []
  postcss.parse(readFileSync('public/amethyst/bling-kitchen/framed-hero.css', 'utf8')).walkRules(rule => {
    if (rule.selector.includes('#bkf-hero-title')) rules.push({selector:rule.selector, media:rule.parent?.type === 'atrule' ? (rule.parent as postcss.AtRule).params : '', declarations:rule.nodes.map(node=>node.toString()).join(';')})
  })
  expect(rules.some(rule=>!rule.media && /76px\/1 "Playfair Display"/.test(rule.declarations))).toBe(true)
  expect(rules.some(rule=>rule.media.includes('max-width: 860px') && /font-size: 44px/.test(rule.declarations))).toBe(true)
})
