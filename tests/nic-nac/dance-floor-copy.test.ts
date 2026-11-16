import { readFileSync, readdirSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
describe('Dance Floor wording and scope', () => {
  it('has no forbidden customer wording or later-phase controls in new components', () => {
    const root = 'app/nic-nac/components/dance-floor/'
    const source = readdirSync(root).filter(name => name.endsWith('.tsx')).map(name => readFileSync(root + name, 'utf8')).join('\n')
    expect(source).not.toMatch(/\bSold\b|\bTraded\b|Pending trade|\bsold\b|Finder|What's working/)
    expect(source).toContain('>Edit<')
    expect(source).toContain('>Remove</button>')
    expect(source).not.toContain('FloorInsights')
    expect(source).not.toContain('Add dancers')
    expect(source).not.toContain('Add to Floor')
    expect(source).toContain('Private. Only you can see notes.')
    expect(source).toContain('ph-no-capture')
  })
})
