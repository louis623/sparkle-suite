import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { buildSparkleSitemap } from '@/lib/seo/sparkle-crawl'

describe('Sparkle Suite public routes', () => {
  it('keeps the Suite home and does not publish /adventure', () => {
    const home = readFileSync(join(process.cwd(), 'app/page.tsx'), 'utf8')

    expect(home).toContain('<SparkleSuitePublicLanding')
    expect(home).not.toContain('MarketingHub')
    expect(existsSync(join(process.cwd(), 'app/adventure/page.tsx'))).toBe(false)
    expect(existsSync(join(process.cwd(), 'app/_components/marketing-hub.tsx'))).toBe(false)
    expect(buildSparkleSitemap().map((entry) => entry.url)).not.toContain(
      'https://www.yoursparklesuite.com/adventure',
    )
  })
})
