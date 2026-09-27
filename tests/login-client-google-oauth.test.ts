import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { safeRelativeRedirectPath } from '@/lib/auth/safe-redirect'

describe('login Google OAuth source', () => {
  it('keeps Google sign-in wired through the auth callback route', () => {
    const source = readFileSync('app/login/_client.tsx', 'utf8')

    expect(source).toContain('signInWithOAuth')
    expect(source).toContain("provider: 'google'")
    expect(source).toContain('/api/auth/callback')
    expect(source).toContain("await supabase.auth.signOut({ scope: 'local' })")
    expect(source).toContain("prompt: 'select_account'")
    expect(source).not.toContain("authCallbackUrl.searchParams.set('signup'")
  })

  it('explains when Google authenticated an email without a provisioned account', () => {
    const source = readFileSync('app/login/_client.tsx', 'utf8')

    expect(source).toContain("searchParams.get('error')")
    expect(source).toContain('No Sparkle Suite account is associated with this email.')
    expect(source).toContain('Try a different Google account or contact Louis.')
  })

  it('offers an email magic link through the same auth callback as Google', () => {
    const source = readFileSync('app/login/_client.tsx', 'utf8')

    expect(source).toContain('signInWithPassword')
    expect(source).toContain('signInWithOtp')
    expect(source).toContain('Email me a magic link')
    expect(source).toContain('emailRedirectTo')
    expect(source).toContain('/api/auth/callback?next=')
    expect(source).toContain('shouldCreateUser: false')
    expect(source).toContain('Check your email.')
    expect(source).toContain('You do not need a password.')
  })

  it('uses the shared safe relative redirect helper before replacing routes', () => {
    const source = readFileSync('app/login/_client.tsx', 'utf8')

    expect(source).toContain('safeRelativeRedirectPath')
    expect(safeRelativeRedirectPath('/nic-nac?section=account')).toBe(
      '/nic-nac?section=account',
    )
    expect(safeRelativeRedirectPath('https://evil.example/path')).toBe('/nic-nac')
    expect(safeRelativeRedirectPath('//evil.example/path')).toBe('/nic-nac')
    expect(safeRelativeRedirectPath('/\\\\evil.example/path')).toBe('/nic-nac')
    expect(safeRelativeRedirectPath('/\\evil.example/path')).toBe('/nic-nac')
    expect(safeRelativeRedirectPath('/%5c%5cevil.example')).toBe('/nic-nac')
    expect(safeRelativeRedirectPath('javascript:alert(1)')).toBe('/nic-nac')
    expect(safeRelativeRedirectPath(null)).toBe('/nic-nac')
  })
})
