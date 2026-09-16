import { beforeEach, describe, expect, it, vi } from 'vitest'
import { errors } from '@/lib/services/errors'
import {
  getTeamOnboardingPublicRateLimitForTests,
  resetTeamOnboardingPublicRateLimitsForTests,
} from '@/lib/team-onboarding/public-rate-limit'

const getTeamOnboardingParticipantByTokenMock = vi.fn()
const recordTeamOnboardingProgressMock = vi.fn()
const sendTeamOnboardingMessageMock = vi.fn()
const createAdminClientMock = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: (...args: unknown[]) => createAdminClientMock(...args),
}))

vi.mock('@/lib/services/team-onboarding', () => ({
  getTeamOnboardingParticipantByToken: (...args: unknown[]) =>
    getTeamOnboardingParticipantByTokenMock(...args),
  recordTeamOnboardingProgress: (...args: unknown[]) =>
    recordTeamOnboardingProgressMock(...args),
  sendTeamOnboardingMessage: (...args: unknown[]) =>
    sendTeamOnboardingMessageMock(...args),
  toTeamOnboardingPublicProgressItem: (progress: Record<string, unknown>) => ({
    stepId: progress.stepId,
    status: progress.status,
    completedAt: progress.completedAt ?? null,
    updatedAt: progress.updatedAt ?? null,
  }),
  toTeamOnboardingPublicMessage: (message: Record<string, unknown>) => ({
    senderType: message.senderType,
    body: message.body,
    readAt: message.readAt ?? null,
    createdAt: message.createdAt ?? null,
  }),
}))

import { GET as GET_ACCESS, OPTIONS as OPTIONS_ACCESS } from '@/app/api/team-onboarding/access/[token]/route'
import { OPTIONS as OPTIONS_PROGRESS, POST as POST_PROGRESS } from '@/app/api/team-onboarding/access/[token]/progress/route'
import { OPTIONS as OPTIONS_MESSAGE, POST as POST_MESSAGE } from '@/app/api/team-onboarding/access/[token]/messages/route'
import { GET as GET_ACCESS_QUERY } from '@/app/api/team-onboarding/access/route'
import { POST as POST_PROGRESS_QUERY } from '@/app/api/team-onboarding/access/progress/route'
import { POST as POST_MESSAGE_QUERY } from '@/app/api/team-onboarding/access/messages/route'

describe('/api/team-onboarding/access/[token]', () => {
  beforeEach(() => {
    delete process.env.TEAM_ONBOARDING_BASE_URL
    delete process.env.TEAM_ONBOARDING_ALLOWED_ORIGINS
    process.env.TEAM_ONBOARDING_CUSTOM_DOMAIN_ENABLED = 'true'
    resetTeamOnboardingPublicRateLimitsForTests()
    getTeamOnboardingParticipantByTokenMock.mockReset()
    recordTeamOnboardingProgressMock.mockReset()
    sendTeamOnboardingMessageMock.mockReset()
    createAdminClientMock.mockReset()
    createAdminClientMock.mockReturnValue({ marker: 'admin' })
  })

  it('does not allow the pending custom domain while its release flag is off', () => {
    delete process.env.TEAM_ONBOARDING_CUSTOM_DOMAIN_ENABLED
    const request = new Request(
      'http://localhost/api/team-onboarding/access/token-123',
      { headers: { origin: 'https://onboarding.yoursparklesuite.com' } },
    )

    expect(OPTIONS_ACCESS(request).headers.get('access-control-allow-origin')).toBeNull()
  })

  it('returns the personalized onboarding state for a valid private link', async () => {
    getTeamOnboardingParticipantByTokenMock.mockResolvedValueOnce({
      participant: {
        displayName: 'Lindsey',
        status: 'started',
      },
      team: {
        displayName: 'Brittany',
        businessName: 'Britt With Bling',
        teamName: 'Diamond Peak Society',
      },
      progress: [{ stepId: 'payquicker', status: 'done' }],
      messages: [{ senderType: 'team_lead', body: 'Welcome!' }],
    })

    const response = await GET_ACCESS(
      new Request('http://localhost/api/team-onboarding/access/token-123'),
      { params: Promise.resolve({ token: 'token-123' }) },
    )

    expect(getTeamOnboardingParticipantByTokenMock).toHaveBeenCalledWith(
      { marker: 'admin' },
      'token-123',
    )
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      participant: {
        displayName: 'Lindsey',
        status: 'started',
      },
      team: {
        displayName: 'Brittany',
        businessName: 'Britt With Bling',
        teamName: 'Diamond Peak Society',
      },
      progress: [{ stepId: 'payquicker', status: 'done' }],
      messages: [{ senderType: 'team_lead', body: 'Welcome!' }],
    })
  })

  it('allows the published Start Strong Site to call private-token APIs without opening them to other origins', async () => {
    const allowedRequest = new Request('http://localhost/api/team-onboarding/access/token-123', {
      headers: { origin: 'https://brittwithbling-start-strong.louis526569.chatgpt.site' },
    })
    const allowed = OPTIONS_ACCESS(allowedRequest)
    const progress = OPTIONS_PROGRESS(allowedRequest)
    const message = OPTIONS_MESSAGE(allowedRequest)
    const rejected = OPTIONS_ACCESS(new Request('http://localhost/api/team-onboarding/access/token-123', {
      headers: { origin: 'https://untrusted.example' },
    }))

    expect(allowed.status).toBe(204)
    expect(allowed.headers.get('access-control-allow-origin')).toBe(
      'https://brittwithbling-start-strong.louis526569.chatgpt.site',
    )
    const brandedRequest = new Request(
      'http://localhost/api/team-onboarding/access/token-123',
      { headers: { origin: 'https://onboarding.yoursparklesuite.com' } },
    )
    expect(OPTIONS_ACCESS(brandedRequest).headers.get('access-control-allow-origin')).toBe(
      'https://onboarding.yoursparklesuite.com',
    )
    expect(progress.headers.get('access-control-allow-methods')).toContain('POST')
    expect(message.headers.get('access-control-allow-headers')).toBe('Content-Type')
    expect(rejected.headers.get('access-control-allow-origin')).toBeNull()
  })

  it('records progress and participant messages without creating Sparkle Suite rep accounts', async () => {
    recordTeamOnboardingProgressMock.mockResolvedValueOnce({
      stepId: 'shipping',
      status: 'needs_help',
    })
    sendTeamOnboardingMessageMock.mockResolvedValueOnce({
      id: 'message-2',
      participantId: 'participant-1',
      senderType: 'participant',
      body: 'Can Brittany check my shipping setup?',
    })

    const progressResponse = await POST_PROGRESS(
      new Request('http://localhost/api/team-onboarding/access/token-123/progress', {
        method: 'POST',
        body: JSON.stringify({ stepId: 'shipping', status: 'needs_help' }),
      }),
      { params: Promise.resolve({ token: 'token-123' }) },
    )
    const messageResponse = await POST_MESSAGE(
      new Request('http://localhost/api/team-onboarding/access/token-123/messages', {
        method: 'POST',
        body: JSON.stringify({ body: 'Can Brittany check my shipping setup?' }),
      }),
      { params: Promise.resolve({ token: 'token-123' }) },
    )

    expect(recordTeamOnboardingProgressMock).toHaveBeenCalledWith(
      { marker: 'admin' },
      'token-123',
      expect.objectContaining({ stepId: 'shipping', status: 'needs_help' }),
    )
    expect(sendTeamOnboardingMessageMock).toHaveBeenCalledWith(
      { marker: 'admin' },
      'token-123',
      expect.objectContaining({
        senderType: 'participant',
        body: 'Can Brittany check my shipping setup?',
      }),
    )
    expect(progressResponse.status).toBe(200)
    expect(messageResponse.status).toBe(200)
    expect(JSON.stringify(await progressResponse.json())).not.toContain('participantId')
    const publicMessage = await messageResponse.json()
    expect(JSON.stringify(publicMessage)).not.toContain('message-2')
    expect(JSON.stringify(publicMessage)).not.toContain('participant-1')
  })

  it('supports query-token endpoints without placing the bearer token in the path', async () => {
    getTeamOnboardingParticipantByTokenMock.mockResolvedValueOnce({
      participant: { displayName: 'Alex', status: 'invited' },
      team: {
        displayName: 'Brittany',
        businessName: 'Britt With Bling',
        teamName: 'The Virtuous Fizzers',
      },
      progress: [],
      messages: [],
    })
    recordTeamOnboardingProgressMock.mockResolvedValueOnce({
      stepId: 'welcome',
      status: 'done',
    })
    sendTeamOnboardingMessageMock.mockResolvedValueOnce({
      senderType: 'participant',
      body: 'Hello',
    })

    const access = await GET_ACCESS_QUERY(
      new Request('https://suite.test/api/team-onboarding/access?invite=query-token'),
    )
    const progress = await POST_PROGRESS_QUERY(
      new Request(
        'https://suite.test/api/team-onboarding/access/progress?invite=query-token',
        { method: 'POST', body: JSON.stringify({ stepId: 'welcome', status: 'done' }) },
      ),
    )
    const message = await POST_MESSAGE_QUERY(
      new Request(
        'https://suite.test/api/team-onboarding/access/messages?invite=query-token',
        { method: 'POST', body: JSON.stringify({ body: 'Hello' }) },
      ),
    )

    expect(access.status).toBe(200)
    expect(progress.status).toBe(200)
    expect(message.status).toBe(200)
    expect(getTeamOnboardingParticipantByTokenMock).toHaveBeenCalledWith(
      { marker: 'admin' },
      'query-token',
    )
  })

  it('returns 429 with Retry-After before calling the service past the access limit', async () => {
    getTeamOnboardingParticipantByTokenMock.mockResolvedValue({
      participant: { displayName: 'Alex', status: 'invited' },
      team: { displayName: 'Lead', businessName: 'Show', teamName: 'Team' },
      progress: [],
      messages: [],
    })
    const limit = getTeamOnboardingPublicRateLimitForTests('access')
    let response: Response | null = null
    for (let index = 0; index <= limit; index += 1) {
      response = await GET_ACCESS_QUERY(
        new Request(
          'https://suite.test/api/team-onboarding/access?invite=rate-token',
          { headers: { 'x-forwarded-for': '203.0.113.42' } },
        ),
      )
    }

    expect(response?.status).toBe(429)
    expect(response?.headers.get('retry-after')).toBeTruthy()
    expect(getTeamOnboardingParticipantByTokenMock).toHaveBeenCalledTimes(limit)
  })

  it('rate limits one client even when it rotates invalid invite tokens', async () => {
    getTeamOnboardingParticipantByTokenMock.mockRejectedValue(
      errors.UNAUTHORIZED('invalid invite token'),
    )
    const limit = getTeamOnboardingPublicRateLimitForTests('access')
    let response: Response | null = null
    for (let index = 0; index <= limit; index += 1) {
      response = await GET_ACCESS_QUERY(
        new Request(
          `https://suite.test/api/team-onboarding/access?invite=guess-${index}`,
          { headers: { 'x-forwarded-for': '203.0.113.43' } },
        ),
      )
    }

    expect(response?.status).toBe(429)
    expect(getTeamOnboardingParticipantByTokenMock).toHaveBeenCalledTimes(limit)
  })

  it('returns safe errors for invalid or archived invite links', async () => {
    getTeamOnboardingParticipantByTokenMock.mockRejectedValueOnce(
      errors.UNAUTHORIZED('invalid invite token'),
    )

    const response = await GET_ACCESS(
      new Request('http://localhost/api/team-onboarding/access/bad-token'),
      { params: Promise.resolve({ token: 'bad-token' }) },
    )

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({
      code: 'UNAUTHORIZED',
      error: 'This onboarding link is invalid or has been turned off. Ask your team leader for a fresh link.',
    })
  })
})
