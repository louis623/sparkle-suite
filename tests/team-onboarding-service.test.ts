import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  archiveTeamOnboardingParticipant,
  createTeamOnboardingParticipant,
  createTeamOnboardingUrlSlug,
  getTeamOnboardingParticipantByToken,
  getTeamOnboardingAccess,
  hashTeamOnboardingToken,
  listTeamOnboardingParticipants,
  refreshTeamOnboardingParticipantAccess,
  recordTeamOnboardingProgress,
  sendTeamOnboardingMessage,
} from '@/lib/services/team-onboarding'

function createQueryResult(data: unknown, error: unknown = null) {
  const query = {
    select: vi.fn(() => query),
    insert: vi.fn(() => query),
    upsert: vi.fn(() => query),
    update: vi.fn(() => query),
    eq: vi.fn(() => query),
    neq: vi.fn(() => query),
    in: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    single: vi.fn(async () => ({ data, error })),
    maybeSingle: vi.fn(async () => ({ data, error })),
    then: (resolve: (value: { data: unknown; error: unknown }) => unknown) =>
      Promise.resolve(resolve({ data, error })),
  }
  return query
}

describe('team onboarding service', () => {
  beforeEach(() => {
    process.env.TEAM_ONBOARDING_BASE_URL =
      'https://approved-lead-onboarding.chatgpt.site'
    process.env.TEAM_ONBOARDING_ALLOWED_ORIGINS =
      'https://approved-lead-onboarding.chatgpt.site,https://onboarding.yoursparklesuite.com'
    process.env.TEAM_ONBOARDING_CUSTOM_DOMAIN_ENABLED = 'true'
  })

  it('creates a URL-safe team name without exposing a person name', () => {
    expect(createTeamOnboardingUrlSlug('The Virtuous Fizzers')).toBe(
      'virtuous-fizzers',
    )
    expect(createTeamOnboardingUrlSlug('  Sparkle & Shine!  ')).toBe(
      'sparkle-shine',
    )
  })

  it('creates a private participant invite without storing the raw access token', async () => {
    const participantRow = {
      id: 'participant-1',
      owner_rep_id: 'rep-britt',
      display_name: 'Lindsey',
      contact_email: 'lindsey@example.com',
      status: 'invited',
      access_slug: 'lindsey-4f3a2b',
      access_token_hash: 'stored-hash',
      created_at: '2026-07-02T12:00:00.000Z',
      updated_at: '2026-07-02T12:00:00.000Z',
      last_activity_at: null,
      archived_at: null,
    }
    const query = createQueryResult(participantRow)
    const supabase = {
      from: vi.fn(() => query),
    } as never

    const result = await createTeamOnboardingParticipant(supabase, 'rep-britt', {
      displayName: ' Lindsey ',
      contactEmail: ' lindsey@example.com ',
      appOrigin: 'https://www.yoursparklesuite.com',
      leadDisplayName: 'Brittany James',
      teamName: 'The Virtuous Fizzers',
      tokenFactory: () => 'visible-token-for-lindsey',
    })

    expect(supabase.from).toHaveBeenCalledWith('team_onboarding_participants')
    expect(query.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        owner_rep_id: 'rep-britt',
        display_name: 'Lindsey',
        contact_email: 'lindsey@example.com',
        access_slug: expect.stringMatching(/^lindsey-/),
        access_token_hash: expect.any(String),
      }),
    )
    expect(JSON.stringify(query.insert.mock.calls[0][0])).not.toContain(
      'visible-token-for-lindsey',
    )
    expect(result.accessUrl).toBe(
      'https://www.yoursparklesuite.com/onboarding/lindsey-brittany-virtuous-fizzers?invite=visible-token-for-lindsey',
    )
    expect(result.participant.displayName).toBe('Lindsey')
  })

  it('links a new onboarding participant to an owned team member card', async () => {
    const memberQuery = createQueryResult({
      id: 'member-rayna',
      display_name: 'Rayna',
    })
    const participantQuery = createQueryResult({
      id: 'participant-rayna',
      owner_rep_id: 'rep-britt',
      join_team_member_id: 'member-rayna',
      display_name: 'Rayna',
      contact_email: null,
      status: 'invited',
      access_slug: 'rayna-123abc',
      access_token_hash: 'stored-hash',
      created_at: '2026-08-30T12:00:00.000Z',
      updated_at: '2026-08-30T12:00:00.000Z',
      last_activity_at: null,
      archived_at: null,
    })
    const queries = [memberQuery, participantQuery]
    const supabase = {
      from: vi.fn(() => queries.shift()),
    } as never

    const result = await createTeamOnboardingParticipant(supabase, 'rep-britt', {
      displayName: 'Ignored client name',
      joinTeamMemberId: 'member-rayna',
      leadDisplayName: 'Brittany James',
      teamName: 'The Virtuous Fizzers',
      tokenFactory: () => 'rayna-visible-token',
    })

    expect(memberQuery.eq).toHaveBeenCalledWith('id', 'member-rayna')
    expect(memberQuery.eq).toHaveBeenCalledWith('rep_id', 'rep-britt')
    expect(participantQuery.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        owner_rep_id: 'rep-britt',
        join_team_member_id: 'member-rayna',
        display_name: 'Rayna',
      }),
    )
    expect(result.participant.joinTeamMemberId).toBe('member-rayna')
  })

  it('creates a fresh link for the same participant without losing progress identity', async () => {
    const participantRow = {
      id: 'participant-rayna',
      owner_rep_id: 'rep-britt',
      join_team_member_id: 'member-rayna',
      display_name: 'Rayna',
      contact_email: null,
      status: 'started',
      access_slug: 'rayna-123abc',
      access_token_hash: 'new-hash',
      created_at: '2026-08-30T12:00:00.000Z',
      updated_at: '2026-08-30T13:00:00.000Z',
      last_activity_at: '2026-08-30T12:30:00.000Z',
      archived_at: null,
      workspace_conversation_id: 'conversation-rayna',
    }
    const participantLookupQuery = createQueryResult(participantRow)
    const participantUpdateQuery = createQueryResult(participantRow)
    const queries = [participantLookupQuery, participantUpdateQuery]
    const supabase = {
      from: vi.fn(() => queries.shift()),
    } as never

    const result = await refreshTeamOnboardingParticipantAccess(
      supabase,
      'rep-britt',
      'participant-rayna',
      {
        teamName: 'The Virtuous Fizzers',
        leadDisplayName: 'Brittany James',
        tokenFactory: () => 'fresh-visible-token',
      },
    )

    expect(participantUpdateQuery.update).toHaveBeenCalledWith(
      expect.objectContaining({ access_token_hash: expect.any(String) }),
    )
    expect(participantLookupQuery.eq).toHaveBeenCalledWith('owner_rep_id', 'rep-britt')
    expect(participantLookupQuery.eq).toHaveBeenCalledWith('id', 'participant-rayna')
    expect(participantUpdateQuery.neq).toHaveBeenCalledWith('status', 'archived')
    expect(result.participant.id).toBe('participant-rayna')
    expect(result.accessUrl).toContain('invite=fresh-visible-token')
    expect(result.accessUrl).toContain(
      '/onboarding/rayna-brittany-virtuous-fizzers?',
    )
    expect(
      (supabase as { from: ReturnType<typeof vi.fn> }).from.mock.calls,
    ).toEqual([
      ['team_onboarding_participants'],
      ['team_onboarding_participants'],
    ])
  })

  it('does not rotate a token when the participant identity cannot produce a safe URL', async () => {
    const participantLookupQuery = createQueryResult({
      id: 'participant-unsafe',
      owner_rep_id: 'rep-britt',
      display_name: 'unsafe@example.com',
      status: 'started',
    })
    const participantUpdateQuery = createQueryResult(null)
    const queries = [participantLookupQuery, participantUpdateQuery]
    const supabase = {
      from: vi.fn(() => queries.shift()),
    } as never

    await expect(
      refreshTeamOnboardingParticipantAccess(
        supabase,
        'rep-britt',
        'participant-unsafe',
        {
          leadDisplayName: 'Brittany James',
          tokenFactory: () => 'unused-fresh-token',
        },
      ),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' })

    expect(supabase.from).toHaveBeenCalledTimes(1)
    expect(participantUpdateQuery.update).not.toHaveBeenCalled()
  })

  it('lists participants with progress and unread message counts for the owning rep', async () => {
    const participantQuery = createQueryResult([
      {
        id: 'participant-1',
        owner_rep_id: 'rep-britt',
        display_name: 'Lindsey',
        contact_email: null,
        status: 'started',
        access_slug: 'lindsey-4f3a2b',
        created_at: '2026-07-02T12:00:00.000Z',
        updated_at: '2026-07-02T12:00:00.000Z',
        last_activity_at: '2026-07-02T12:20:00.000Z',
        archived_at: null,
      },
    ])
    const progressQuery = createQueryResult([
      {
        participant_id: 'participant-1',
        step_id: 'payquicker',
        status: 'done',
        completed_at: '2026-07-02T12:15:00.000Z',
        updated_at: '2026-07-02T12:15:00.000Z',
      },
      {
        participant_id: 'participant-1',
        step_id: 'shipping',
        status: 'needs_help',
        completed_at: null,
        updated_at: '2026-07-02T12:20:00.000Z',
      },
    ])
    const messageQuery = createQueryResult([
      { participant_id: 'participant-1', sender_type: 'participant', read_at: null },
      { participant_id: 'participant-1', sender_type: 'team_lead', read_at: null },
    ])
    const queries = [participantQuery, progressQuery, messageQuery]
    const supabase = {
      from: vi.fn(() => queries.shift()),
    } as never

    const result = await listTeamOnboardingParticipants(supabase, 'rep-britt')

    expect(result).toEqual([
      expect.objectContaining({
        id: 'participant-1',
        displayName: 'Lindsey',
        progress: { completed: 1, needsHelp: 1, total: 2 },
        unreadMessageCount: 1,
      }),
    ])
  })

  it('uses canonical participant unread counts after an onboarding thread is linked', async () => {
    const participantQuery = createQueryResult([
      {
        id: 'participant-1',
        owner_rep_id: 'rep-britt',
        display_name: 'Lindsey',
        contact_email: null,
        status: 'started',
        access_slug: 'lindsey-4f3a2b',
        created_at: '2026-07-02T12:00:00.000Z',
        updated_at: '2026-07-02T12:00:00.000Z',
        last_activity_at: '2026-07-02T12:20:00.000Z',
        archived_at: null,
        workspace_conversation_id: 'conversation-1',
      },
    ])
    const progressQuery = createQueryResult([])
    const canonicalUnreadQuery = createQueryResult([
      { conversation_id: 'conversation-1', unread_count: 3 },
    ])
    const queries = [participantQuery, progressQuery, canonicalUnreadQuery]
    const supabase = {
      from: vi.fn(() => queries.shift()),
    } as never

    const result = await listTeamOnboardingParticipants(supabase, 'rep-britt')

    expect(result[0].unreadMessageCount).toBe(3)
    expect(supabase.from).toHaveBeenCalledTimes(3)
    expect(supabase.from).toHaveBeenLastCalledWith(
      'workspace_conversation_participants',
    )
    expect(canonicalUnreadQuery.in).toHaveBeenCalledWith('conversation_id', [
      'conversation-1',
    ])
    expect(canonicalUnreadQuery.eq).toHaveBeenCalledWith('principal_type', 'rep')
    expect(canonicalUnreadQuery.eq).toHaveBeenCalledWith('rep_id', 'rep-britt')
  })

  it('summarizes a 30-rep onboarding roster without creating Sparkle Suite rep accounts', async () => {
    const participantRows = Array.from({ length: 30 }, (_, index) => ({
      id: `participant-${index + 1}`,
      owner_rep_id: 'rep-britt',
      display_name: `Rep ${index + 1}`,
      contact_email: null,
      status: 'started',
      access_slug: `rep-${index + 1}`,
      created_at: '2026-07-02T12:00:00.000Z',
      updated_at: '2026-07-02T12:00:00.000Z',
      last_activity_at: null,
      archived_at: null,
    }))
    const progressRows = participantRows.flatMap((participant, index) => [
      {
        participant_id: participant.id,
        step_id: 'payquicker',
        status: 'done',
        completed_at: '2026-07-02T12:10:00.000Z',
        updated_at: '2026-07-02T12:10:00.000Z',
      },
      ...(index % 3 === 0
        ? [
            {
              participant_id: participant.id,
              step_id: 'shipping',
              status: 'needs_help',
              completed_at: null,
              updated_at: '2026-07-02T12:20:00.000Z',
            },
          ]
        : []),
    ])
    const messageRows = participantRows
      .filter((_, index) => index % 4 === 0)
      .map((participant) => ({
        participant_id: participant.id,
        sender_type: 'participant',
        read_at: null,
      }))
    const queries = [
      createQueryResult(participantRows),
      createQueryResult(progressRows),
      createQueryResult(messageRows),
    ]
    const supabase = {
      from: vi.fn(() => queries.shift()),
    } as never

    const result = await listTeamOnboardingParticipants(supabase, 'rep-britt')

    expect(result).toHaveLength(30)
    expect(result[0]).toEqual(
      expect.objectContaining({
        id: 'participant-1',
        progress: { completed: 1, needsHelp: 1, total: 2 },
        unreadMessageCount: 1,
      }),
    )
    expect(result[1]).toEqual(
      expect.objectContaining({
        id: 'participant-2',
        progress: { completed: 1, needsHelp: 0, total: 1 },
        unreadMessageCount: 0,
      }),
    )
  })

  it('lets a participant update progress and message Brittany through a valid invite token', async () => {
    const participantQuery = createQueryResult({
      id: 'participant-1',
      owner_rep_id: 'rep-britt',
      display_name: 'Lindsey',
      status: 'started',
      access_token_hash: 'hash',
      access_slug: 'lindsey-4f3a2b',
      created_at: '2026-07-02T12:00:00.000Z',
      updated_at: '2026-07-02T12:00:00.000Z',
      last_activity_at: null,
      archived_at: null,
    })
    const progressQuery = createQueryResult({
      participant_id: 'participant-1',
      step_id: 'payquicker',
      status: 'done',
      completed_at: '2026-07-02T12:30:00.000Z',
      updated_at: '2026-07-02T12:30:00.000Z',
    })
    const activityQuery = createQueryResult({ id: 'participant-1' })
    const messageQuery = createQueryResult({
      id: 'message-1',
      participant_id: 'participant-1',
      sender_type: 'participant',
      body: 'I need help with PayQuicker.',
      read_at: null,
      created_at: '2026-07-02T12:31:00.000Z',
    })
    const queries = [
      participantQuery,
      progressQuery,
      activityQuery,
      participantQuery,
      messageQuery,
      activityQuery,
    ]
    const supabase = {
      from: vi.fn(() => queries.shift()),
    } as never

    await expect(
      recordTeamOnboardingProgress(supabase, 'visible-token', {
        stepId: 'payquicker',
        status: 'done',
        tokenVerifier: () => true,
      }),
    ).resolves.toEqual(
      expect.objectContaining({ stepId: 'payquicker', status: 'done' }),
    )
    await expect(
      sendTeamOnboardingMessage(supabase, 'visible-token', {
        body: ' I need help with PayQuicker. ',
        senderType: 'participant',
        tokenVerifier: () => true,
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        senderType: 'participant',
        body: 'I need help with PayQuicker.',
      }),
    )
  })

  it('includes Team Management for every Sparkle Suite workspace without an add-on lookup', async () => {
    const supabase = {
      from: vi.fn(),
    } as never

    await expect(getTeamOnboardingAccess(supabase, 'rep-britt')).resolves.toEqual({
      enabled: true,
      status: 'active',
      source: null,
    })
    expect((supabase as { from: ReturnType<typeof vi.fn> }).from).not.toHaveBeenCalled()
  })

  it('archives the participant thread and rejects the archived private token', async () => {
    const archiveQuery = createQueryResult({
      id: 'participant-archive',
      status: 'archived',
      workspace_conversation_id: 'conversation-archive',
    })
    const conversationQuery = createQueryResult({ id: 'conversation-archive' })
    const membershipQuery = createQueryResult({ id: 'membership-archive' })
    const archivedLookupQuery = createQueryResult({
      id: 'participant-archive',
      owner_rep_id: 'rep-kelly',
      display_name: 'Alex',
      status: 'archived',
      archived_at: '2026-09-16T15:00:00.000Z',
      access_token_hash: hashTeamOnboardingToken('archived-token'),
      access_slug: 'alex-123abc',
      created_at: '2026-09-16T14:00:00.000Z',
      updated_at: '2026-09-16T15:00:00.000Z',
      last_activity_at: null,
      workspace_conversation_id: 'conversation-archive',
    })
    const queries = [
      archiveQuery,
      conversationQuery,
      membershipQuery,
      archivedLookupQuery,
    ]
    const supabase = {
      from: vi.fn(() => queries.shift()),
    } as never

    await expect(
      archiveTeamOnboardingParticipant(
        supabase,
        'rep-kelly',
        'participant-archive',
      ),
    ).resolves.toEqual({
      participantId: 'participant-archive',
      status: 'archived',
    })
    expect(archiveQuery.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'archived' }),
    )
    expect(conversationQuery.update).toHaveBeenCalledWith(
      expect.objectContaining({ state: 'closed' }),
    )
    expect(membershipQuery.update).toHaveBeenCalledWith(
      expect.objectContaining({ membership_state: 'left' }),
    )

    await expect(
      getTeamOnboardingParticipantByToken(supabase, 'archived-token'),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
  })
})
