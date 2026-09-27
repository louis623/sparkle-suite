import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(),
}))

import { AccountSecurityCard } from '@/app/nic-nac/components/AccountSecurityCard'

describe('Sparkle Suite Account Security card', () => {
  it('renders two new-password fields and the shared strong-password guidance', () => {
    const html = renderToStaticMarkup(<AccountSecurityCard />)
    const source = readFileSync(
      'app/nic-nac/components/AccountSecurityCard.tsx',
      'utf8',
    )

    expect(html).toContain('Password &amp; security')
    expect(html).toContain('name="newPassword"')
    expect(html).toContain('name="newPasswordConfirm"')
    expect(source.match(/autoComplete="new-password"/g)).toHaveLength(2)
    expect(html).toContain('minLength="12"')
    expect(html).toContain(
      'Use at least 12 characters, including uppercase, lowercase, a number, and a symbol.',
    )
  })

  it('uses the shared validator before updating the authenticated user', () => {
    const source = readFileSync(
      'app/nic-nac/components/AccountSecurityCard.tsx',
      'utf8',
    )

    expect(source).toContain('getNewPasswordValidationError(')
    expect(source).toContain('getPasswordMinLength()')
    expect(source).toContain('getPasswordRequirements()')
    expect(source).toContain('supabase.auth.updateUser({')
    expect(source).toContain('password: newPassword')
    expect(source).not.toContain('password: newPasswordConfirm')
  })

  it('keeps the normal security form visible but disables every mutation control in support mode', () => {
    const html = renderToStaticMarkup(
      <AccountSecurityCard mutationsDisabled />,
    )

    expect(html).toContain('Password &amp; security')
    expect(html.match(/disabled=""/g)).toHaveLength(3)
    expect(html).toContain('Update password')
  })
})
