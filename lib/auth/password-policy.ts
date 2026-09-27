const LIVE_PASSWORD_MIN_LENGTH = 12
const SMOKE_PASSWORD_MIN_LENGTH = 6

const LIVE_PASSWORD_REQUIREMENTS =
  'Use at least 12 characters, including uppercase, lowercase, a number, and a symbol.'

const SMOKE_PASSWORD_REQUIREMENTS =
  'Smoke only — any password you can remember.'

type PasswordPolicyEnv = {
  SPARKLE_ENVIRONMENT?: string
  NEXT_PUBLIC_SPARKLE_ENVIRONMENT?: string
}

export type PasswordPolicy = {
  minLength: number
  requirements: string
  requireCharacterClasses: boolean
}

export function isSmokePasswordEnvironment(
  env: PasswordPolicyEnv = process.env,
) {
  return (
    env.NEXT_PUBLIC_SPARKLE_ENVIRONMENT === 'smoke' ||
    env.SPARKLE_ENVIRONMENT === 'smoke'
  )
}

export function getPasswordPolicy(
  env: PasswordPolicyEnv = process.env,
): PasswordPolicy {
  if (isSmokePasswordEnvironment(env)) {
    return {
      minLength: SMOKE_PASSWORD_MIN_LENGTH,
      requirements: SMOKE_PASSWORD_REQUIREMENTS,
      requireCharacterClasses: false,
    }
  }

  return {
    minLength: LIVE_PASSWORD_MIN_LENGTH,
    requirements: LIVE_PASSWORD_REQUIREMENTS,
    requireCharacterClasses: true,
  }
}

export function getPasswordMinLength(env: PasswordPolicyEnv = process.env) {
  return getPasswordPolicy(env).minLength
}

export function getPasswordRequirements(env: PasswordPolicyEnv = process.env) {
  return getPasswordPolicy(env).requirements
}

/** Live policy. User-facing forms should call getPasswordMinLength(). */
export const PASSWORD_MIN_LENGTH = LIVE_PASSWORD_MIN_LENGTH

/** Live policy. User-facing forms should call getPasswordRequirements(). */
export const PASSWORD_REQUIREMENTS = LIVE_PASSWORD_REQUIREMENTS

export function getNewPasswordValidationError(
  password: string,
  passwordConfirmation: string,
  env: PasswordPolicyEnv = process.env,
) {
  if (password !== passwordConfirmation) {
    return 'Enter the same new password twice.'
  }

  const policy = getPasswordPolicy(env)

  if (password.length < policy.minLength) {
    return policy.requirements
  }

  if (!policy.requireCharacterClasses) {
    return null
  }

  if (!/[a-z]/.test(password)) {
    return policy.requirements
  }

  if (!/[A-Z]/.test(password)) {
    return policy.requirements
  }

  if (!/\d/.test(password)) {
    return policy.requirements
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    return policy.requirements
  }

  return null
}
