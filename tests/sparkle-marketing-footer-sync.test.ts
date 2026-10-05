import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const copies = [
  'SparkleMarketingFooter.tsx',
  'sparkle-marketing-footer.module.css',
] as const

describe('marketing footer copies', () => {
  it('keeps the Suite and Finder Smoke copies identical', () => {
    for (const file of copies) {
      const suite = readFileSync(join(process.cwd(), 'app/_components/sparkle-marketing-footer', file), 'utf8')
      const finder = readFileSync(join(process.cwd(), 'apps/finder/components/marketing', file), 'utf8')
      expect(suite).toBe(finder)
    }
  })
})
