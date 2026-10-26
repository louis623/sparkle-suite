import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import { renderHomepageFirstPaint } from '@/lib/amethyst/homepage-first-paint'
import { defaultAmethystHomepageTemplateData } from '@/lib/amethyst/homepage-template-data'
import { defaultAmethystTradeTemplateData } from '@/lib/amethyst/trade-template-data'
import { defaultAmethystJoinTemplateData } from '@/lib/amethyst/join-template-data'

it.each([false,true])('keeps exactly one footer rep sentence when the intro duplicates it: %s', async duplicate => {
  const identity='Lindsey is the rep for Mile High Fizz.'
  const intro='Public show details remain readable.'
  const html=await renderHomepageFirstPaint(readFileSync('public/amethyst/Homepage.html','utf8'),{
    appearancePreset:'amethyst',homepage:{...defaultAmethystHomepageTemplateData,businessName:'Mile High Fizz',repName:'Lindsey',aboutParagraphs:[(duplicate?identity+' ':'')+intro]},
    trade:defaultAmethystTradeTemplateData,join:defaultAmethystJoinTemplateData,
  },new URL('https://example.com/milehighfizz'))
  const footer=html.match(/<div class="hp-footer-identity">([\s\S]*?)<\/div>/)?.[1] ?? ''
  expect(footer.split(identity)).toHaveLength(2)
  expect(footer).toContain(intro)
  // This is the same Footer component hydrated by the browser, not an
  // imperative post-load deletion that would leave duplicate no-JS HTML.
  expect(html).toContain('data-server-rendered="true"')
})
