import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { isThemeStudioHarnessEnabled } from '@/app/dev/theme-studio-harness/access'

describe('theme studio harness access', () => {
  it('is on in development, on for Smoke, and off in production', () => {
    expect(isThemeStudioHarnessEnabled({ NODE_ENV: 'development' })).toBe(true)
    expect(isThemeStudioHarnessEnabled({ NODE_ENV: 'development', SPARKLE_ENVIRONMENT: 'production' })).toBe(true)
    expect(isThemeStudioHarnessEnabled({ NODE_ENV: 'production', SPARKLE_ENVIRONMENT: 'smoke' })).toBe(true)
    expect(isThemeStudioHarnessEnabled({ NODE_ENV: 'production' })).toBe(false)
    expect(isThemeStudioHarnessEnabled({ NODE_ENV: 'production', SPARKLE_ENVIRONMENT: 'production' })).toBe(false)
    expect(isThemeStudioHarnessEnabled({ NODE_ENV: 'test' })).toBe(false)
  })

  it('404s through notFound unless development or smoke, and does not use the dev-only public Nic-Nac check', () => {
    const page = readFileSync('app/dev/theme-studio-harness/page.tsx', 'utf8')
    const devOnly = readFileSync('app/dev/public-nic-nac/page.tsx', 'utf8')
    expect(page).toContain('isThemeStudioHarnessEnabled()')
    expect(page).toContain('notFound()')
    expect(page).not.toContain("NODE_ENV !== 'development'")
    expect(devOnly).toContain("NODE_ENV !== 'development'")
  })
})