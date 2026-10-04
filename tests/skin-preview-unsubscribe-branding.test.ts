import { describe, expect, it } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { runInNewContext } from 'node:vm'
import { transformSync } from 'esbuild'
import { buildSkinPreviewDocument } from '@/lib/amethyst/skin-preview'

const profiles = [
  ['midnight_rose', 'Sparkle by Sasha'],
  ['rose_gold', 'Sparkle by Sasha'],
  ['gilded_autumn', 'Sparkle by Sasha'],
  ['gnome_garden', 'The Gnome Forest'],
  ['neon_butterfly', "Kelly's Sparkle Lounge"],
  ['halloween_pumpkin_cat', 'Sparkle by Sasha'],
  ['halloween_pumpkin_witch', 'Moonlit Pumpkin Sparkle'],
] as const

describe('sample skin unsubscribe branding', () => {
  it.each(profiles)('%s uses its sample business in title and rendered preferences copy', async (skin, businessName) => {
    const document = await buildSkinPreviewDocument(skin, 'unsubscribe', 'https://www.yoursparklesuite.com')
    const source = [...document.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)]
      .map(match => match[1]).find(text => text.includes('function UnsubscribePage()'))
    expect(source).toBeTruthy()
    const fixture = JSON.parse(document.match(/window\.AMETHYST_HOMEPAGE_TEMPLATE_DATA = (.*?);\n/)![1])
    let rendered: React.ReactNode = null
    const context = {
      React,
      ReactDOM: {createRoot: () => ({render: (element: React.ReactNode) => {rendered = element}})},
      window: {SparkleSuiteFooterCredit: () => React.createElement('span', null, 'Powered by Sparkle Suite'), AMETHYST_HOMEPAGE_TEMPLATE_DATA: fixture, AMETHYST_RUNTIME_CONTEXT: {targeted:true}, location: {search:''}},
      document: {getElementById: () => ({}), body:{classList:{add:()=>{}}}, documentElement:{style:{setProperty:()=>{}}}},
      URLSearchParams,
    }
    runInNewContext(transformSync(source!,{loader:'jsx',format:'iife'}).code,context)
    const html=renderToStaticMarkup(rendered)
    const escapedName=businessName.replaceAll("'",'&#x27;')
    expect(html).toContain(`Stop SMS updates, email updates, or both from ${escapedName}.`)
    expect(document).toContain(`<title>Manage updates - ${businessName}</title>`)
    expect(html).not.toContain('the Amethyst preview site')
    expect(document).toContain("form-action 'none'")
  })
})
