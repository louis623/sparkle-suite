import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import { renderHomepageFirstPaint } from '@/lib/amethyst/homepage-first-paint'
import { defaultAmethystHomepageTemplateData } from '@/lib/amethyst/homepage-template-data'
import { defaultAmethystTradeTemplateData } from '@/lib/amethyst/trade-template-data'
import { defaultAmethystJoinTemplateData } from '@/lib/amethyst/join-template-data'

it('cannot submit personal data as URL query parameters before signup hydration', async () => {
  const result = await renderHomepageFirstPaint(readFileSync('public/amethyst/Homepage.html','utf8'), {
    appearancePreset:'amethyst',homepage:defaultAmethystHomepageTemplateData,
    trade:defaultAmethystTradeTemplateData,join:defaultAmethystJoinTemplateData,
  },new URL('https://example.com/privacy-proof'))
  const form = result.match(/<form class="hp-signup-form"[\s\S]*?<\/form>/)?.[0]
  expect(form).toBeTruthy()
  expect(form).toMatch(/^<form[^>]*method="post"/)
  expect(form).toMatch(/^<form[^>]*action="#signup"/)
  expect(form).toMatch(/<button type="submit"[^>]*disabled=""/)
  // The same-page action has no POST handler and cannot write audience data.
  // Disabled submit is enabled only after the component's effect attaches JS.
  const jsx=readFileSync('public/amethyst/homepage.jsx','utf8')
  expect(jsx).toContain('useEffect(() => { setSignupReady(true); }, [])')
  expect(jsx).toContain('if (!signupReady) return;')
})
