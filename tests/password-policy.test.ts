import { describe, expect, it } from 'vitest'
import {
  getNewPasswordValidationError,
  getPasswordMinLength,
  getPasswordRequirements,
  PASSWORD_MIN_LENGTH,
  PASSWORD_REQUIREMENTS,
} from '@/lib/auth/password-policy'

const liveEnv = {
  SPARKLE_ENVIRONMENT: 'production',
  NEXT_PUBLIC_SPARKLE_ENVIRONMENT: 'production',
}

describe('Sparkle Suite password policy', () => {
  it('keeps the live minimum and character-class rules as the default', () => {
    expect(PASSWORD_MIN_LENGTH).toBe(12)
    expect(getPasswordMinLength({})).toBe(12)
    expect(getPasswordMinLength(liveEnv)).toBe(12)
    expect(getPasswordRequirements(liveEnv)).toBe(PASSWORD_REQUIREMENTS)
    expect(getNewPasswordValidationError('pass', 'pass', {})).toBe(
      PASSWORD_REQUIREMENTS,
    )
  })

  it('accepts a matching strong password', () => {
    expect(
      getNewPasswordValidationError(
        'SparkleSuite2026!',
        'SparkleSuite2026!',
        liveEnv,
      ),
    ).toBeNull()
  })

  it('requires the new password to be entered twice accurately', () => {
    expect(
      getNewPasswordValidationError(
        'SparkleSuite2026!',
        'SparkleSuite2026?',
        liveEnv,
      ),
    ).toBe('Enter the same new password twice.')
  })

  it.each([
    ['too short', 'Suite2!a'],
    ['an uppercase letter', 'sparklesuite2026!'],
    ['a lowercase letter', 'SPARKLESUITE2026!'],
    ['a number', 'SparkleSuitePass!'],
    ['a symbol', 'SparkleSuite2026'],
  ])('rejects a password missing %s', (_case, password) => {
    expect(getNewPasswordValidationError(password, password, liveEnv)).toBe(
      PASSWORD_REQUIREMENTS,
    )
  })

  it.each([
    { SPARKLE_ENVIRONMENT: 'smoke' },
    { NEXT_PUBLIC_SPARKLE_ENVIRONMENT: 'smoke' },
    {
      SPARKLE_ENVIRONMENT: 'smoke',
      NEXT_PUBLIC_SPARKLE_ENVIRONMENT: 'smoke',
    },
  ])('relaxes length and character classes on Smoke only', (env) => {
    expect(getPasswordMinLength(env)).toBe(6)
    expect(getPasswordRequirements(env)).toBe(
      'Smoke only — any password you can remember.',
    )
    expect(getNewPasswordValidationError('simple', 'simple', env)).toBeNull()
    expect(getNewPasswordValidationError('pass', 'pass', env)).toBe(
      'Smoke only — any password you can remember.',
    )
    expect(getNewPasswordValidationError('pass', 'word', env)).toBe(
      'Enter the same new password twice.',
    )
  })
})
