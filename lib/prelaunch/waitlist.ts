import { errors } from '@/lib/services/errors'
import type {
  PrelaunchWaitlistInput,
  PrelaunchWaitlistInsert,
} from '@/lib/services/types'

function readString(value: unknown) {
  return typeof value === 'string' ? value : ''
}

function readBoolean(value: unknown) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    return (
      normalized === 'true' ||
      normalized === '1' ||
      normalized === 'yes' ||
      normalized === 'on'
    )
  }
  return false
}

export function parsePrelaunchWaitlistInput(
  value: unknown,
): PrelaunchWaitlistInput {
  const body =
    value && typeof value === 'object'
      ? (value as Record<string, unknown>)
      : {}

  return {
    name: readString(body.name ?? body.full_name),
    email: readString(body.email),
    phone: readString(body.phone),
    tiktokHandle: readString(body.tiktokHandle ?? body.tiktok_handle),
    teamRepName: readString(body.teamRepName ?? body.team_rep_name),
    setupPain: readString(body.setupPain ?? body.setup_pain),
    smsConsent: readBoolean(body.smsConsent ?? body.sms_consent),
    emailConsent: readBoolean(body.emailConsent ?? body.email_consent),
  }
}

export function validatePrelaunchWaitlistInput(
  input: PrelaunchWaitlistInput,
): PrelaunchWaitlistInput {
  const name = input.name.trim()
  const email = input.email.trim().toLowerCase()
  const phone = input.phone.trim()
  const rawTiktokHandle = input.tiktokHandle.trim()
  const teamRepName = input.teamRepName.trim()
  const setupPain = input.setupPain?.trim()

  if (!name) {
    throw errors.INVALID_INPUT('name required', 'Name is required.')
  }
  if (!email || !email.includes('@')) {
    throw errors.INVALID_INPUT(
      'valid email required',
      'A valid email is required.',
    )
  }
  if (input.smsConsent && !phone) {
    throw errors.INVALID_INPUT(
      'phone required for sms consent',
      'Phone is required if you want launch updates by text.',
    )
  }
  if (!input.emailConsent) {
    throw errors.INVALID_INPUT(
      'email consent required',
      'Please agree to get launch updates by email.',
    )
  }

  return {
    name,
    email,
    phone,
    tiktokHandle: rawTiktokHandle
      ? rawTiktokHandle.startsWith('@')
        ? rawTiktokHandle
        : `@${rawTiktokHandle}`
      : '',
    teamRepName,
    setupPain: setupPain || undefined,
    smsConsent: input.smsConsent,
    emailConsent: true,
  }
}

export function buildPrelaunchWaitlistInsert(
  input: PrelaunchWaitlistInput,
): PrelaunchWaitlistInsert {
  const validated = validatePrelaunchWaitlistInput(input)

  return {
    name: validated.name,
    email: validated.email,
    phone: validated.phone || null,
    tiktok_handle: validated.tiktokHandle || null,
    team_rep_name: validated.teamRepName || null,
    setup_pain: validated.setupPain ?? null,
    sms_consent: validated.smsConsent,
    email_consent: validated.emailConsent,
    source: 'prelaunch_site',
  }
}
