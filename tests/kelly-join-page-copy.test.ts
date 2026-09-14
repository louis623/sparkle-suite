import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe("Kelly's Sparkly Butterflies join-page copy", () => {
  const jsx = readFileSync(
    resolve(process.cwd(), 'public/amethyst/join.jsx'),
    'utf8',
  )

  it('uses a Kelly-only recruiting section with fewer, useful choices', () => {
    expect(jsx).toContain("publicSiteSlug === \"sparklybutterflies\"")
    expect(jsx).toContain('Come sparkle with Kelly')
    expect(jsx).toContain('A real welcome from Kelly')
    expect(jsx).toContain('Ask Kelly a question')
    expect(jsx).toContain("See Kelly's starter packs")
    expect(jsx).toContain("Read Kelly's FAQs")
    expect(jsx).toContain("Visit Kelly's Facebook community")
  })

  it('keeps the recruiting and FAQ headings visible below the sticky site chrome', () => {
    const css = readFileSync(
      resolve(process.cwd(), 'public/amethyst/join.css'),
      'utf8',
    )

    expect(css).toMatch(/\.jp-why\s*\{[\s\S]*?scroll-margin-top:\s*220px;/)
    expect(css).toMatch(/#faq\s*\{[\s\S]*?scroll-margin-top:\s*220px;/)
  })

  it('makes every Kelly FAQ question and answer specific to Kelly', () => {
    expect(jsx).toContain('KELLY_FAQ_QUESTIONS')
    expect(jsx).toContain("What is it like to join Kelly's Sparkly Butterflies team?")
    expect(jsx).toContain("How much does it cost to join Kelly's team?")
    expect(jsx).toContain('Does Kelly expect me to have experience?')
    expect(jsx).toContain('How much time will Kelly expect me to commit?')
    expect(jsx).toContain('What support does Kelly offer new team members?')
    expect(jsx).toContain('Can Kelly guarantee how much I will earn?')
    expect(jsx).toContain('Kelly cannot guarantee income')
  })
})
