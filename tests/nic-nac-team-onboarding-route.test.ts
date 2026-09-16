import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ServiceError, errors } from '@/lib/services/errors'

const getPaidNicNacContextMock = vi.fn()
const getTeamOnboardingAccessMock = vi.fn()
const getTeamOnboardingTeamNameMock = vi.fn()
const listTeamOnboardingParticipantsMock = vi.fn()
const createTeamOnboardingParticipantMock = vi.fn()
const refreshTeamOnboardingParticipantAccessMock = vi.fn()
const archiveTeamOnboardingParticipantMock = vi.fn()
const sendTeamOnboardingMessageMock = vi.fn()
const adminClient = { marker: 'admin-supabase' }

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => adminClient,
}))

vi.mock('@/lib/nic-nac/auth', () => ({
  AuthError: class AuthError extends Error {},
  getPaidNicNacContext: (...args: unknown[]) =>
    getPaidNicNacContextMock(...args),
}))

vi.mock('@/lib/services/team-onboarding', () => ({
  getTeamOnboardingAccess: (...args: unknown[]) =>
    getTeamOnboardingAccessMock(...args),
  getTeamOnboardingTeamName: (...args: unknown[]) =>
    getTeamOnboardingTeamNameMock(...args),
  listTeamOnboardingParticipants: (...args: unknown[]) =>
    listTeamOnboardingParticipantsMock(...args),
  createTeamOnboardingParticipant: (...args: unknown[]) =>
    createTeamOnboardingParticipantMock(...args),
  refreshTeamOnboardingParticipantAccess: (...args: unknown[]) =>
    refreshTeamOnboardingParticipantAccessMock(...args),
  archiveTeamOnboardingParticipant: (...args: unknown[]) =>
    archiveTeamOnboardingParticipantMock(...args),
  sendTeamOnboardingMessage: (...args: unknown[]) =>
    sendTeamOnboardingMessageMock(...args),
}))

import { AuthError } from '@/lib/nic-nac/auth'
import {
  GET as GET_PARTICIPANTS,
  POST as POST_PARTICIPANTS,
} from '@/app/api/nic-nac/team-onboarding/participants/route'
import { PATCH as PATCH_PARTICIPANT } from '@/app/api/nic-nac/team-onboarding/participants/[participantId]/route'
import { POST as POST_MESSAGE } from '@/app/api/nic-nac/team-onboarding/participants/[participantId]/messages/route'

describe('/api/nic-nac/team-onboarding/participants', () => {
  beforeEach(() => {
    delete process.env.TEAM_ONBOARDING_BASE_URL
    delete process.env.TEAM_ONBOARDING_ALLOWED_ORIGINS
    delete process.env.TEAM_ONBOARDING_CUSTOM_DOMAIN_ENABLED
    getPaidNicNacContextMock.mockReset()
    getTeamOnboardingAccessMock.mockReset()
    getTeamOnboardingTeamNameMock.mockReset()
    getTeamOnboardingTeamNameMock.mockResolvedValue('The Virtuous Fizzers')
    listTeamOnboardingParticipantsMock.mockReset()
    createTeamOnboardingParticipantMock.mockReset()
    refreshTeamOnboardingParticipantAccessMock.mockReset()
    archiveTeamOnboardingParticipantMock.mockReset()
    sendTeamOnboardingMessageMock.mockReset()
  })

  it('creates native links without any manually configured onboarding host', async () => {
    getPaidNicNacContextMock.mockResolvedValueOnce({
      repId: 'rep-kelly',
      rep: { display_name: 'Kelly James' },
      supabase: { marker: 'supabase' },
    })
    getTeamOnboardingAccessMock.mockResolvedValueOnce({ enabled: true })
    createTeamOnboardingParticipantMock.mockResolvedValueOnce({
      participant: { id: 'participant-1', displayName: 'Alex' },
      accessUrl:
        'https://www.yoursparklesuite.com/onboarding/alex-kelly?invite=token',
    })
    const response = await POST_PARTICIPANTS(
      new Request('http://localhost/api/nic-nac/team-onboarding/participants', {
        method: 'POST',
        body: JSON.stringify({ displayName: 'Alex' }),
      }),
    )

    expect(response.status).toBe(200)
    expect(createTeamOnboardingParticipantMock).toHaveBeenCalledWith(
      adminClient,
      'rep-kelly',
      expect.objectContaining({
        appOrigin: 'http://localhost',
        leadDisplayName: 'Kelly James',
      }),
    )
    expect(JSON.stringify(createTeamOnboardingParticipantMock.mock.calls)).not.toContain(
      'Brittany',
    )
  })

  it('lists participants only when the paid add-on entitlement is enabled', async () => {
    getPaidNicNacContextMock.mockResolvedValueOnce({
      repId: 'rep-britt',
      rep: { public_site_slug: 'brittwithbling' },
      supabase: { marker: 'supabase' },
    })
    getTeamOnboardingAccessMock.mockResolvedValueOnce({
      enabled: true,
      status: 'manual_beta',
      source: 'manual_beta',
    })
    listTeamOnboardingParticipantsMock.mockResolvedValueOnce([
      {
        id: 'participant-1',
        displayName: 'Lindsey',
        status: 'started',
        progress: { completed: 3, needsHelp: 1, total: 8 },
        unreadMessageCount: 1,
      },
    ])

    const response = await GET_PARTICIPANTS()

    expect(listTeamOnboardingParticipantsMock).toHaveBeenCalledWith(
      { marker: 'supabase' },
      'rep-britt',
    )
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      access: { enabled: true, status: 'manual_beta', source: 'manual_beta' },
      participants: [
        expect.objectContaining({
          displayName: 'Lindsey',
          unreadMessageCount: 1,
        }),
      ],
    })
  })

  it('returns a paid add-on prompt payload instead of exposing participant tools when locked', async () => {
    getPaidNicNacContextMock.mockResolvedValueOnce({
      repId: 'rep-other',
      supabase: { marker: 'supabase' },
    })
    getTeamOnboardingAccessMock.mockResolvedValueOnce({
      enabled: false,
      status: 'not_enabled',
      source: null,
    })

    const response = await GET_PARTICIPANTS()

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({
      code: 'TEAM_MANAGEMENT_ADDON_REQUIRED',
      error: 'Team Management is a paid add-on.',
      access: { enabled: false, status: 'not_enabled', source: null },
    })
    expect(listTeamOnboardingParticipantsMock).not.toHaveBeenCalled()
  })

  it('creates an onboarding invite from rep name and optional email without SMS sending', async () => {
    getPaidNicNacContextMock.mockResolvedValueOnce({
      repId: 'rep-britt',
      rep: { display_name: 'Brittany James' },
      supabase: { marker: 'supabase' },
    })
    getTeamOnboardingAccessMock.mockResolvedValueOnce({
      enabled: true,
      status: 'manual_beta',
      source: 'manual_beta',
    })
    createTeamOnboardingParticipantMock.mockResolvedValueOnce({
      participant: {
        id: 'participant-1',
        displayName: 'Lindsey',
        status: 'invited',
      },
      accessUrl:
        'https://www.yoursparklesuite.com/onboarding/lindsey-brittany-virtuous-fizzers?invite=visible-token',
    })

    const response = await POST_PARTICIPANTS(
      new Request('http://localhost/api/nic-nac/team-onboarding/participants', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          displayName: 'Lindsey',
          contactEmail: 'lindsey@example.com',
          joinTeamMemberId: 'member-lindsey',
          delivery: 'copy_link',
        }),
      }),
    )

    expect(createTeamOnboardingParticipantMock).toHaveBeenCalledWith(
      adminClient,
      'rep-britt',
      expect.objectContaining({
        displayName: 'Lindsey',
        contactEmail: 'lindsey@example.com',
        joinTeamMemberId: 'member-lindsey',
        appOrigin: 'http://localhost',
        leadDisplayName: 'Brittany James',
        teamName: 'The Virtuous Fizzers',
      }),
    )
    expect(JSON.stringify(createTeamOnboardingParticipantMock.mock.calls)).not.toContain(
      'sendSms',
    )
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      ok: true,
      participant: {
        id: 'participant-1',
        displayName: 'Lindsey',
        status: 'invited',
      },
      accessUrl:
        'https://www.yoursparklesuite.com/onboarding/lindsey-brittany-virtuous-fizzers?invite=visible-token',
      delivery: 'copy_link',
    })
  })

  it('ignores an attacker-controlled onboarding origin and uses the server-owned app origin', async () => {
    getPaidNicNacContextMock.mockResolvedValueOnce({
      repId: 'rep-britt',
      rep: { display_name: 'Brittany James' },
      supabase: { marker: 'supabase' },
    })
    getTeamOnboardingAccessMock.mockResolvedValueOnce({ enabled: true })
    createTeamOnboardingParticipantMock.mockResolvedValueOnce({
      participant: { id: 'participant-1', displayName: 'Alex' },
      accessUrl:
        'https://www.yoursparklesuite.com/onboarding/alex-brittany?invite=token',
    })

    const response = await POST_PARTICIPANTS(
      new Request('http://localhost/api/nic-nac/team-onboarding/participants', {
        method: 'POST',
        body: JSON.stringify({
          displayName: 'Alex',
          baseUrl: 'https://evil.example/collect',
        }),
      }),
    )

    expect(response.status).toBe(200)
    expect(createTeamOnboardingParticipantMock).toHaveBeenCalledWith(
      adminClient,
      'rep-britt',
      expect.objectContaining({ appOrigin: 'http://localhost' }),
    )
    expect(JSON.stringify(createTeamOnboardingParticipantMock.mock.calls)).not.toContain(
      'evil.example',
    )
  })

  it('creates a fresh card-linked onboarding URL without replacing the participant', async () => {
    getPaidNicNacContextMock.mockResolvedValueOnce({
      repId: 'rep-britt',
      rep: { display_name: 'Brittany James' },
      supabase: { marker: 'supabase' },
    })
    getTeamOnboardingAccessMock.mockResolvedValueOnce({ enabled: true })
    refreshTeamOnboardingParticipantAccessMock.mockResolvedValueOnce({
      participant: {
        id: 'participant-1',
        joinTeamMemberId: 'member-lindsey',
        displayName: 'Lindsey',
        status: 'started',
      },
      accessUrl:
        'https://www.yoursparklesuite.com/onboarding/lindsey-brittany-virtuous-fizzers?invite=fresh-token',
    })

    const response = await PATCH_PARTICIPANT(
      new Request(
        'http://localhost/api/nic-nac/team-onboarding/participants/participant-1',
        {
          method: 'PATCH',
          body: JSON.stringify({ action: 'refresh_access' }),
        },
      ),
      { params: Promise.resolve({ participantId: 'participant-1' }) },
    )

    expect(refreshTeamOnboardingParticipantAccessMock).toHaveBeenCalledWith(
      adminClient,
      'rep-britt',
      'participant-1',
      expect.objectContaining({
        appOrigin: 'http://localhost',
        leadDisplayName: 'Brittany James',
        teamName: 'The Virtuous Fizzers',
      }),
    )
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        ok: true,
        accessUrl:
          'https://www.yoursparklesuite.com/onboarding/lindsey-brittany-virtuous-fizzers?invite=fresh-token',
      }),
    )
  })

  it('archives participants and sends team-lead replies through participant routes', async () => {
    getPaidNicNacContextMock
      .mockResolvedValueOnce({
        repId: 'rep-britt',
        supabase: { marker: 'supabase' },
      })
      .mockResolvedValueOnce({
        repId: 'rep-britt',
        supabase: { marker: 'supabase' },
      })
    getTeamOnboardingAccessMock
      .mockResolvedValueOnce({ enabled: true })
      .mockResolvedValueOnce({ enabled: true })
    archiveTeamOnboardingParticipantMock.mockResolvedValueOnce({
      participantId: 'participant-1',
      status: 'archived',
    })
    sendTeamOnboardingMessageMock.mockResolvedValueOnce({
      id: 'message-2',
      participantId: 'participant-1',
      senderType: 'team_lead',
      body: 'Try the PayQuicker reset link.',
    })

    const patchResponse = await PATCH_PARTICIPANT(
      new Request('http://localhost/api/nic-nac/team-onboarding/participants/participant-1', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'archive' }),
      }),
      { params: Promise.resolve({ participantId: 'participant-1' }) },
    )
    const messageResponse = await POST_MESSAGE(
      new Request(
        'http://localhost/api/nic-nac/team-onboarding/participants/participant-1/messages',
        {
          method: 'POST',
          body: JSON.stringify({ body: 'Try the PayQuicker reset link.' }),
        },
      ),
      { params: Promise.resolve({ participantId: 'participant-1' }) },
    )

    expect(archiveTeamOnboardingParticipantMock).toHaveBeenCalledWith(
      adminClient,
      'rep-britt',
      'participant-1',
    )
    expect(sendTeamOnboardingMessageMock).toHaveBeenCalledWith(
      adminClient,
      'participant-1',
      expect.objectContaining({
        ownerRepId: 'rep-britt',
        senderType: 'team_lead',
      }),
    )
    expect(patchResponse.status).toBe(200)
    expect(messageResponse.status).toBe(200)
  })

  it('returns auth and service errors safely', async () => {
    getPaidNicNacContextMock.mockRejectedValueOnce(new AuthError('nope'))

    const authResponse = await GET_PARTICIPANTS()

    expect(authResponse.status).toBe(401)
    await expect(authResponse.json()).resolves.toEqual({
      error: 'unauthenticated',
    })

    getPaidNicNacContextMock.mockResolvedValueOnce({
      repId: 'rep-britt',
      rep: { display_name: 'Brittany James' },
      supabase: { marker: 'supabase' },
    })
    getTeamOnboardingAccessMock.mockResolvedValueOnce({ enabled: true })
    createTeamOnboardingParticipantMock.mockRejectedValueOnce(
      errors.INVALID_INPUT('displayName required', 'Enter the new rep name first.'),
    )

    const serviceResponse = await POST_PARTICIPANTS(
      new Request('http://localhost/api/nic-nac/team-onboarding/participants', {
        method: 'POST',
        body: JSON.stringify({ displayName: '' }),
      }),
    )

    expect(serviceResponse.status).toBe(400)
    await expect(serviceResponse.json()).resolves.toEqual({
      code: 'INVALID_INPUT',
      error: 'Enter the new rep name first.',
    })

    getPaidNicNacContextMock.mockResolvedValueOnce({
      repId: 'rep-britt',
      supabase: { marker: 'supabase' },
    })
    getTeamOnboardingAccessMock.mockRejectedValueOnce(
      new ServiceError({
        code: 'TEAM_ONBOARDING_LOOKUP_FAILED',
        message: 'db failed',
        userMessage: 'Unable to load Team Management right now.',
        statusCode: 503,
      }),
    )

    const lookupResponse = await GET_PARTICIPANTS()

    expect(lookupResponse.status).toBe(503)
    await expect(lookupResponse.json()).resolves.toEqual({
      code: 'TEAM_ONBOARDING_LOOKUP_FAILED',
      error: 'Unable to load Team Management right now.',
    })
  })
})
