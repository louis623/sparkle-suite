import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe("Heather's and Kim's Join Team page copy", () => {
  const jsx = readFileSync(resolve(process.cwd(), 'public/amethyst/join.jsx'), 'utf8')

  it('targets only Heather and Kim by their own public identifiers', () => {
    expect(jsx).toContain('publicSiteSlug === "blingkitchen"')
    expect(jsx).toContain('runtimeRepTarget === "theblingkitchen.com"')
    expect(jsx).toContain('publicSiteSlug === "goforthebling"')
    expect(jsx).toContain('runtimeRepTarget === "goforthebling.com"')
    expect(jsx).not.toContain('isLindsey')
    expect(jsx).not.toContain('isBrittany')
  })

  it('gives Heather a concise, useful recruiting section', () => {
    expect(jsx).toContain('Find your place with Heather')
    expect(jsx).toContain('A warm welcome from Heather')
    expect(jsx).toContain('Practical guidance to get started')
    expect(jsx).toContain('A start that fits your life')
  })

  it('gives Kim a concise, useful recruiting section', () => {
    expect(jsx).toContain('Find your sparkle with Kim')
    expect(jsx).toContain('A personal welcome from Kim')
    expect(jsx).toContain('Clear answers and next steps')
    expect(jsx).toContain('Room to build your way')
  })

  it('personalizes every FAQ and working next-step label', () => {
    expect(jsx).toContain("What is it like to join ${name}'s ${teamName} team?")
    expect(jsx).toContain("How much does it cost to join ${name}'s team?")
    expect(jsx).toContain('Does ${name} expect me to have experience?')
    expect(jsx).toContain('How much time will ${name} expect me to commit?')
    expect(jsx).toContain('What support does ${name} offer new team members?')
    expect(jsx).toContain('Can ${name} guarantee how much I will earn?')
    expect(jsx).toContain('Ask {recruitingProfile.name} a question')
    expect(jsx).toContain("See {recruitingProfile.name}'s starter packs")
    expect(jsx).toContain("Read {recruitingProfile.name}'s FAQs")
  })
})
