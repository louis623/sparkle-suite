import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('Neon Butterfly Live Lineup readability', () => {
  it('uses a dedicated high-contrast surface for the strip and dialog', () => {
    const css = readFileSync(
      resolve(process.cwd(), 'public', 'amethyst', 'neon-butterfly.css'),
      'utf8',
    )

    expect(css).toContain('body.bg-neon-butterfly .hp-trade-preview {')
    expect(css).toContain('body.bg-neon-butterfly .hp-trade-preview-items { color: #fff5fa; }')
    expect(css).toContain('background: #FF3366;')
    expect(css).toContain('background: linear-gradient(130deg, #ff2acd, #8d2cff 78%);')
    expect(css).toContain('body.bg-neon-butterfly .hp-queue-modal {')
    expect(css).toContain('body.bg-neon-butterfly .hp-queue-modal-empty { color: #ead8e8; }')
  })
})
