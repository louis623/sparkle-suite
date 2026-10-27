import { expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { renderHomepageFirstPaint } from '@/lib/amethyst/homepage-first-paint'
import { buildAmethystHomepageBootstrapScript, defaultAmethystHomepageTemplateData as homepage } from '@/lib/amethyst/homepage-template-data'
import { defaultAmethystJoinTemplateData as join } from '@/lib/amethyst/join-template-data'
import { defaultAmethystTradeTemplateData as trade } from '@/lib/amethyst/trade-template-data'
it('renders finished Pumpkin Cat markup with one H1, production hydration and only selected styles', async () => {
  const source = readFileSync('public/amethyst/Homepage.html', 'utf8')
  const bootstrap = buildAmethystHomepageBootstrapScript(homepage, [], 'halloween_pumpkin_cat', { targeted: true })
  const html = await renderHomepageFirstPaint(source, { homepage, join, trade, appearancePreset: 'halloween_pumpkin_cat' }, new URL('https://www.yoursparklesuite.com/dudesfizzfest'), bootstrap)
  expect(html).toContain('data-server-rendered="true"')
  expect(html).toContain('class="hpc-art"')
  expect(html).toContain('hpc-motion-control')
  expect(html.match(/<h1\b/g)).toHaveLength(1)
  expect(html).toContain('/amethyst/compiled/react.js')
  expect(html).not.toMatch(/react\.development|babel|data-template-src=/)
  expect(html).not.toMatch(/(?:unicorn|sunset-beach|neon-butterfly)\.(?:css|js)/)
  expect(html).toContain('window.SPARKLE_FIRST_PAINT=')
})
