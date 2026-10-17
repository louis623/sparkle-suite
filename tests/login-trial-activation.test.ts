import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('login payment-first sign-in', () => {
  it('signs an approved rep in without starting free access', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'app/login/_client.tsx'),
      'utf8',
    )
    const signInIndex = source.indexOf('supabase.auth.signInWithPassword')

    expect(signInIndex).toBeGreaterThan(-1)
    expect(source).not.toContain("fetch('/api/account/activate-trial'")
    expect(source).not.toMatch(/trial/i)
    expect(source).toContain('No Sparkle Suite account is associated with this email.')
  })
})
