import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}))

import LoginPage from '@/app/login/page'
import ResetPasswordPage from '@/app/reset-password/page'

describe('Sparkle Suite password reset and change flow', () => {
  it('links sign-in users to the password reset page', () => {
    const html = renderToStaticMarkup(LoginPage())

    expect(html).toContain('href="/reset-password"')
    expect(html).toContain('Forgot or need to change your password?')
  })

  it('renders a password reset surface that confirms new passwords before updating', () => {
    const html = renderToStaticMarkup(ResetPasswordPage())
    const source = readFileSync('app/reset-password/_client.tsx', 'utf8')

    expect(html).toContain('Reset your Sparkle Suite password')
    expect(html).toContain('Send reset link')
    expect(source).toContain("name=\"newPassword\"")
    expect(source).toContain("name=\"newPasswordConfirm\"")
    expect(source).toContain("autoComplete=\"new-password\"")
    expect(source).toContain('updateUser({')
    expect(source).toContain('password: newPassword')
    expect(source).toContain('resetPasswordForEmail')
    expect(source).toContain("new URL('/api/auth/callback', window.location.origin)")
    expect(source).toContain("resetCallbackUrl.searchParams.set('next', '/reset-password')")
    expect(source).toContain('getNewPasswordValidationError(')
    expect(source).toContain('getPasswordMinLength()')
    expect(source).toContain('getPasswordRequirements()')
    expect(source).not.toContain('updateUser({ password: newPasswordConfirm })')
  })
})
