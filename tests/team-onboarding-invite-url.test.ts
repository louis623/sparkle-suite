import { beforeEach, describe, expect, it } from 'vitest'

import { ServiceError } from '@/lib/services/errors'
import {
  buildTeamOnboardingAccessUrl,
  createTeamOnboardingInviteSlug,
  getTeamOnboardingAllowedOrigins,
  LEGACY_BRITTANY_ONBOARDING_ORIGIN,
  resolveTeamOnboardingAppOrigin,
  SPARKLE_SUITE_ONBOARDING_ORIGIN,
} from '@/lib/team-onboarding/invite-url'

describe('team onboarding invite URLs', () => {
  beforeEach(() => {
    delete process.env.TEAM_ONBOARDING_BASE_URL
    delete process.env.TEAM_ONBOARDING_ALLOWED_ORIGINS
    delete process.env.TEAM_ONBOARDING_CUSTOM_DOMAIN_ENABLED
  })

  it('builds a native Sparkle Suite route with personalized first names and an opaque query token', () => {
    const result = buildTeamOnboardingAccessUrl({
      token: 'opaque-token-value',
      participantDisplayName: 'Alex Rivera',
      leadDisplayName: 'Kelly James',
      teamName: 'Sparkly Butterflies',
    })

    expect(result).toBe(
      'https://www.yoursparklesuite.com/onboarding/alex-kelly-sparkly-butterflies?invite=opaque-token-value',
    )
    expect(result).not.toContain('rivera')
    expect(result).not.toContain('james')
    expect(result.toLowerCase()).not.toContain('brittany')
  })

  it('does not depend on or trust a caller-provided ChatGPT Sites address', () => {
    expect(resolveTeamOnboardingAppOrigin()).toBe(
      SPARKLE_SUITE_ONBOARDING_ORIGIN,
    )
    expect(
      resolveTeamOnboardingAppOrigin('https://evil.example/collect'),
    ).toBe(SPARKLE_SUITE_ONBOARDING_ORIGIN)
    expect(
      buildTeamOnboardingAccessUrl({
        appOrigin: 'https://evil.example/collect',
        token: 'opaque-token-value',
        participantDisplayName: 'Alex',
        leadDisplayName: 'Kelly',
      }),
    ).toMatch(/^https:\/\/www\.yoursparklesuite\.com\/onboarding\//)
  })

  it('keeps the frozen Brittany origin available only for legacy CORS compatibility', () => {
    const origins = getTeamOnboardingAllowedOrigins()
    expect(origins.has(LEGACY_BRITTANY_ONBOARDING_ORIGIN)).toBe(true)
    expect(origins.has(SPARKLE_SUITE_ONBOARDING_ORIGIN)).toBe(true)
  })

  it('rejects email or phone identities and omits contact-like optional team text', () => {
    const unsafeIdentities = [
      { participantDisplayName: 'alex@example.com', leadDisplayName: 'Kelly' },
      { participantDisplayName: 'Alex', leadDisplayName: '+1 (555) 123-4567' },
    ]

    for (const identity of unsafeIdentities) {
      expect(() => createTeamOnboardingInviteSlug(identity)).toThrowError(
        ServiceError,
      )
    }

    expect(
      createTeamOnboardingInviteSlug({
        participantDisplayName: 'Alex Rivera',
        leadDisplayName: 'Kelly James',
        teamName: 'Call 555-123-4567',
      }),
    ).toBe('alex-kelly')
  })
})
