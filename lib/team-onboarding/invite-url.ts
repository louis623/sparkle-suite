import { errors } from '@/lib/services/errors'

export const SPARKLE_SUITE_ONBOARDING_ORIGIN =
  'https://www.yoursparklesuite.com'
export const LEGACY_BRITTANY_ONBOARDING_ORIGIN =
  'https://brittwithbling-start-strong.louis526569.chatgpt.site'
const OPTIONAL_SUITE_ONBOARDING_ORIGIN =
  'https://onboarding.yoursparklesuite.com'

function normalizedText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function isLocalDevelopmentOrigin(url: URL) {
  return (
    process.env.NODE_ENV !== 'production' &&
    url.protocol === 'http:' &&
    (url.hostname === 'localhost' || url.hostname === '127.0.0.1')
  )
}

function parseAllowedOrigin(value: string) {
  try {
    const url = new URL(value.trim())
    if (
      url.username ||
      url.password ||
      (url.protocol !== 'https:' && !isLocalDevelopmentOrigin(url))
    ) {
      return null
    }
    return url.origin
  } catch {
    return null
  }
}

/**
 * CORS remains available only for the frozen Brittany site and explicitly
 * configured legacy clients. New links always open the native Sparkle Suite
 * route and do not depend on this allowlist.
 */
export function getTeamOnboardingAllowedOrigins() {
  const configured = (process.env.TEAM_ONBOARDING_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map(parseAllowedOrigin)
    .filter((value): value is string => Boolean(value))

  return new Set([
    SPARKLE_SUITE_ONBOARDING_ORIGIN,
    LEGACY_BRITTANY_ONBOARDING_ORIGIN,
    ...configured,
    ...(process.env.TEAM_ONBOARDING_CUSTOM_DOMAIN_ENABLED === 'true'
      ? [OPTIONAL_SUITE_ONBOARDING_ORIGIN]
      : []),
  ])
}

/**
 * Resolve the server-owned origin for a newly created native onboarding link.
 * Browser input is deliberately ignored. Localhost is accepted only outside
 * production so local and reviewer smoke tests can follow generated links.
 */
export function resolveTeamOnboardingAppOrigin(requestUrl?: unknown) {
  const requested = normalizedText(requestUrl)
  if (requested) {
    try {
      const url = new URL(requested)
      if (isLocalDevelopmentOrigin(url)) return url.origin
    } catch {
      // Fall through to the canonical production origin.
    }
  }
  return SPARKLE_SUITE_ONBOARDING_ORIGIN
}

export function createTeamOnboardingUrlSlug(value: unknown) {
  return normalizedText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/^the-/, '')
    .slice(0, 64)
}

function firstName(value: unknown) {
  return normalizedText(value).split(/\s+/u)[0] ?? ''
}

function looksLikeContactInformation(value: unknown) {
  const text = normalizedText(value)
  return /\S+@\S+/u.test(text) || (text.match(/\d/gu)?.length ?? 0) >= 7
}

export function createTeamOnboardingInviteSlug(input: {
  participantDisplayName: unknown
  leadDisplayName: unknown
  teamName?: unknown
}) {
  if (
    looksLikeContactInformation(input.participantDisplayName) ||
    looksLikeContactInformation(input.leadDisplayName)
  ) {
    throw errors.INVALID_INPUT(
      'contact information cannot appear in onboarding URL identity fields',
      'Use the new rep first name and team lead name, without an email address or phone number.',
    )
  }
  const participant = createTeamOnboardingUrlSlug(
    firstName(input.participantDisplayName),
  )
  const lead = createTeamOnboardingUrlSlug(firstName(input.leadDisplayName))
  if (!participant || !lead) {
    throw errors.INVALID_INPUT(
      'participant first name and team lead identity required',
      'Add the new rep first name and team lead name before creating this private link.',
    )
  }

  const team = looksLikeContactInformation(input.teamName)
    ? ''
    : createTeamOnboardingUrlSlug(input.teamName)
  const parts = [participant, lead]
  if (team && !parts.includes(team)) parts.push(team)
  return parts.join('-').slice(0, 120).replace(/-+$/g, '')
}

export function buildTeamOnboardingAccessUrl(input: {
  appOrigin?: unknown
  token: string
  participantDisplayName: unknown
  leadDisplayName: unknown
  teamName?: unknown
}) {
  const url = new URL(resolveTeamOnboardingAppOrigin(input.appOrigin))
  const inviteSlug = createTeamOnboardingInviteSlug(input)
  url.pathname = `/onboarding/${inviteSlug}`
  url.searchParams.set('invite', input.token)
  return url.toString()
}
