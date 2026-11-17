import { readFileSync, readdirSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
describe('Dance Floor wording and scope', () => {
  it('has no forbidden customer wording or later-phase controls in new components', () => {
    const root = 'app/nic-nac/components/dance-floor/'
    const source = readdirSync(root).filter(name => name.endsWith('.tsx')).map(name => readFileSync(root + name, 'utf8')).join('\n')
    expect(source).not.toMatch(/\bSold\b|\bTraded\b|Pending trade|\bsold\b|Finder|What's working|Sitting 30\+ days|Needs a photo/)
    expect(source).not.toMatch(/>Edit<|>Remove<|quantity.*stepper/)
    expect(source).toContain('Coming soon in this rebuild.')
    expect(source).toContain("You'll be able to finish these here soon.")
    expect(source).toContain('ph-no-capture')
  })
})
