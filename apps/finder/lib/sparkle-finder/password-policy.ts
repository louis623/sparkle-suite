const LIVE_PASSWORD_MIN_LENGTH = 8;
const SMOKE_PASSWORD_MIN_LENGTH = 6;

const LIVE_PASSWORD_REQUIREMENTS = "Use at least 8 characters.";

const SMOKE_PASSWORD_REQUIREMENTS = "Smoke only — any password you can remember.";

const PASSWORD_MISMATCH_MESSAGE = "Those passwords did not match. Please enter the same password twice.";

interface PasswordPolicyEnv extends NodeJS.ProcessEnv {
  SPARKLE_ENVIRONMENT?: string;
  NEXT_PUBLIC_SPARKLE_ENVIRONMENT?: string;
}

export type PasswordPolicy = {
  minLength: number;
  requirements: string;
  requireCharacterClasses: boolean;
};

export function isSmokePasswordEnvironment(env: PasswordPolicyEnv = process.env) {
  return env.NEXT_PUBLIC_SPARKLE_ENVIRONMENT === "smoke" || env.SPARKLE_ENVIRONMENT === "smoke";
}

export function getPasswordPolicy(env: PasswordPolicyEnv = process.env): PasswordPolicy {
  if (isSmokePasswordEnvironment(env)) {
    return {
      minLength: SMOKE_PASSWORD_MIN_LENGTH,
      requirements: SMOKE_PASSWORD_REQUIREMENTS,
      requireCharacterClasses: false,
    };
  }

  // Finder live already uses an 8-character minimum and does not require
  // character classes. Only Smoke drops to the Supabase Auth floor of 6.
  return {
    minLength: LIVE_PASSWORD_MIN_LENGTH,
    requirements: LIVE_PASSWORD_REQUIREMENTS,
    requireCharacterClasses: false,
  };
}

export function getPasswordMinLength(env: PasswordPolicyEnv = process.env) {
  return getPasswordPolicy(env).minLength;
}

export function getPasswordRequirements(env: PasswordPolicyEnv = process.env) {
  return getPasswordPolicy(env).requirements;
}

/** Live policy. User-facing forms should call getPasswordMinLength(). */
export const PASSWORD_MIN_LENGTH = LIVE_PASSWORD_MIN_LENGTH;

/** Live policy. User-facing forms should call getPasswordRequirements(). */
export const PASSWORD_REQUIREMENTS = LIVE_PASSWORD_REQUIREMENTS;

export function getNewPasswordValidationError(
  password: string,
  passwordConfirmation: string,
  env: PasswordPolicyEnv = process.env,
) {
  if (password !== passwordConfirmation) {
    return PASSWORD_MISMATCH_MESSAGE;
  }

  const policy = getPasswordPolicy(env);

  if (password.length < policy.minLength) {
    return policy.requirements;
  }

  if (!policy.requireCharacterClasses) {
    return null;
  }

  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    return policy.requirements;
  }

  return null;
}
