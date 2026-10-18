import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('login does not activate a trial', () => {
  it('signs in without calling the removed activation route', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'app/login/_client.tsx'),
      'utf8',
    )

    expect(source).toContain('supabase.auth.signInWithPassword')
    expect(source).toContain("searchParams.get('email')")
    expect(source).not.toContain('/api/account/activate-trial')
    expect(source).toContain('No Sparkle Suite account is associated with this email. Try a different email.')
    expect(source).not.toMatch(/trial/i)
    expect(existsSync(resolve(process.cwd(), 'app/api/account/activate-trial/route.ts'))).toBe(false)
  })
})
